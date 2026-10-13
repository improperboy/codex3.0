from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import text
from sqlalchemy.orm import Session
from db.database import get_db
from dependencies import get_current_user, require_admin, CurrentUser
from models.venue import MentorRecommendation, MentorAssignment, Floor, Room
from routers.activity_logs import log_activity
from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
import json
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class RecommendationResponse(BaseModel):
    id: int
    participant_id: int
    mentor_id: int
    match_score: str
    skill_match_details: Optional[str] = None
    created_at: Optional[datetime] = None

    # Populated helper fields
    mentor_name: Optional[str] = None
    mentor_email: Optional[str] = None
    mentor_skills: Optional[List[str]] = []
    room_id: Optional[int] = None
    room_number: Optional[str] = None
    floor_id: Optional[int] = None
    floor_number: Optional[str] = None
    team_count: Optional[int] = 0
    team_names: Optional[List[str]] = []
    top_room_technologies: Optional[List[Dict[str, Any]]] = []
    matched_skills: Optional[List[Dict[str, Any]]] = []
    recommendation_reason: Optional[str] = None
    status: Optional[str] = "pending"

    model_config = ConfigDict(from_attributes=True)


class AssignRecommendationPayload(BaseModel):
    recommendation_id: Optional[int] = None
    mentor_id: int
    floor_id: int
    room_id: int


class StatusUpdatePayload(BaseModel):
    status: str  # "approved", "rejected", "pending", "assigned"


def _normalize_skill(skill: str) -> str:
    return skill.strip().lower()


# ── List recommendations ───────────────────────────────────────────────────

@router.get("", response_model=list[RecommendationResponse])
@router.get("/", response_model=list[RecommendationResponse])
def list_recommendations(
    participant_id: int | None = Query(None),
    mentor_id: int | None = Query(None),
    room_id: int | None = Query(None),
    floor_id: int | None = Query(None),
    min_score: float | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    require_admin(current_user)

    q = db.query(MentorRecommendation)
    if participant_id:
        q = q.filter(MentorRecommendation.participant_id == participant_id)
    if mentor_id:
        q = q.filter(MentorRecommendation.mentor_id == mentor_id)

    raw_items = q.order_by(MentorRecommendation.match_score.desc()).all()

    # Pre-fetch users (for mentor names & emails) and current mentor assignments
    user_map = {}
    assignments_set = set()
    try:
        users = db.execute(text("SELECT id, name, email, tech_stack FROM users")).fetchall()
        user_map = {u[0]: {"name": u[1], "email": u[2], "tech_stack": u[3]} for u in users}
        assignments = db.execute(text("SELECT mentor_id, floor_id, room_id FROM mentor_assignments")).fetchall()
        assignments_set = {(a[0], a[1], a[2]) for a in assignments}
    except Exception as e:
        logger.warning(f"Error fetching helper data for recommendations: {e}")

    results = []
    for rec in raw_items:
        score_val = 0.0
        try:
            score_val = float(rec.match_score)
        except (ValueError, TypeError):
            pass

        if min_score is not None and score_val < min_score:
            continue

        details = {}
        if rec.skill_match_details:
            try:
                details = json.loads(rec.skill_match_details)
            except Exception:
                details = {}

        r_room_id = details.get("room_id")
        r_floor_id = details.get("floor_id")

        if room_id is not None and r_room_id != room_id:
            continue
        if floor_id is not None and r_floor_id != floor_id:
            continue

        # Check if currently assigned in mentor_assignments
        is_assigned = (rec.mentor_id, r_floor_id, r_room_id) in assignments_set
        rec_status = "assigned" if is_assigned else details.get("status", "pending")

        if status_filter and status_filter.lower() != "all" and rec_status.lower() != status_filter.lower():
            continue

        mentor_info = user_map.get(rec.mentor_id, {})
        raw_m_skills = mentor_info.get("tech_stack") or ""
        m_skills = [s.strip() for s in raw_m_skills.split(",") if s.strip()]

        res = RecommendationResponse(
            id=rec.id,
            participant_id=rec.participant_id,
            mentor_id=rec.mentor_id,
            match_score=str(rec.match_score),
            skill_match_details=rec.skill_match_details,
            created_at=rec.created_at,
            mentor_name=mentor_info.get("name"),
            mentor_email=mentor_info.get("email"),
            mentor_skills=m_skills,
            room_id=r_room_id,
            room_number=details.get("room_number"),
            floor_id=r_floor_id,
            floor_number=details.get("floor_number"),
            team_count=details.get("team_count", 0),
            team_names=details.get("team_names", []),
            top_room_technologies=details.get("top_room_technologies", []),
            matched_skills=details.get("matched_skills", []),
            recommendation_reason=details.get("recommendation_reason"),
            status=rec_status,
        )
        results.append(res)

    return results


# ── Generate recommendations ───────────────────────────────────────────────

@router.post("/generate", status_code=status.HTTP_201_CREATED)
def generate_recommendations(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Intelligent Room-Tech & Skill Based Recommendation Matching:
    1. Aggregates all teams assigned into rooms (e.g. Floor 1, Room 2 with 5 teams).
    2. Identifies which technologies are mostly used by teams in that room (frequency & coverage).
    3. Matches mentors whose skillsets cover the dominant technologies of the room.
    4. Also provides fallback recommendations for unassigned teams if rooms have not been assigned yet.
    """
    require_admin(current_user)

    # 1. Fetch all mentors and their skills
    mentor_rows = db.execute(text(
        "SELECT id, name, email, tech_stack FROM users WHERE role='mentor'"
    )).fetchall()

    if not mentor_rows:
        return {"message": "No mentors found in system to match", "count": 0}

    # Also fetch user_skills if available
    user_skills_map: Dict[int, set] = {}
    try:
        us_rows = db.execute(text(
            "SELECT us.user_id, s.name FROM user_skills us JOIN skills s ON s.id = us.skill_id"
        )).fetchall()
        for uid, sname in us_rows:
            user_skills_map.setdefault(uid, set()).add(_normalize_skill(sname))
    except Exception:
        pass

    mentors = []
    for m in mentor_rows:
        m_id, m_name, m_email, m_tech = m[0], m[1], m[2], m[3]
        skills_set = set()
        if m_tech:
            for s in m_tech.split(","):
                if s.strip():
                    skills_set.add(_normalize_skill(s))
        if m_id in user_skills_map:
            skills_set.update(user_skills_map[m_id])

        if skills_set:
            mentors.append({
                "id": m_id,
                "name": m_name,
                "email": m_email,
                "skills": skills_set,
                "raw_skills": [s.strip() for s in (m_tech or "").split(",") if s.strip()],
            })

    if not mentors:
        return {"message": "No mentors have tech skills listed yet", "count": 0}

    # 2. Fetch all teams
    team_rows = db.execute(text("""
        SELECT t.id, t.name, t.tech_skills, t.floor_id, t.room_id, t.leader_id,
               f.floor_number, r.room_number
        FROM teams t
        LEFT JOIN floors f ON f.id = t.floor_id
        LEFT JOIN rooms r ON r.id = t.room_id
        WHERE t.tech_skills IS NOT NULL AND t.tech_skills != ''
    """)).fetchall()

    if not team_rows:
        return {"message": "No teams with tech skills found", "count": 0}

    # Group teams by room
    rooms_map: Dict[tuple, Dict[str, Any]] = {}
    unassigned_teams = []

    for t in team_rows:
        tid, tname, tskills_str, fid, rid, leader_id, fnum, rnum = t[0], t[1], t[2], t[3], t[4], t[5], t[6], t[7]
        team_skills = [_normalize_skill(s) for s in (tskills_str or "").split(",") if s.strip()]

        team_obj = {
            "id": tid,
            "name": tname,
            "skills": team_skills,
            "leader_id": leader_id or 1,
        }

        if fid and rid:
            key = (fid, rid)
            if key not in rooms_map:
                rooms_map[key] = {
                    "floor_id": fid,
                    "room_id": rid,
                    "floor_number": str(fnum or fid),
                    "room_number": str(rnum or rid),
                    "teams": [],
                }
            rooms_map[key]["teams"].append(team_obj)
        else:
            unassigned_teams.append(team_obj)

    # Pre-fetch existing mentor assignments to mark already-assigned mentors
    existing_assignments = set()
    try:
        assign_rows = db.execute(text("SELECT mentor_id, floor_id, room_id FROM mentor_assignments")).fetchall()
        existing_assignments = {(a[0], a[1], a[2]) for a in assign_rows}
    except Exception:
        pass

    # Clear old recommendations before saving fresh ones
    db.execute(text("DELETE FROM mentor_recommendations"))
    db.commit()

    created_count = 0

    # 3. Match mentors to ROOMS (dominant tech frequency matching)
    for (fid, rid), room_info in rooms_map.items():
        teams_in_room = room_info["teams"]
        team_count = len(teams_in_room)
        if team_count == 0:
            continue

        # Count tech frequencies across all teams in this room
        tech_freq: Dict[str, int] = {}
        tech_display: Dict[str, str] = {}
        for tm in teams_in_room:
            for s in tm["skills"]:
                tech_freq[s] = tech_freq.get(s, 0) + 1
                if s not in tech_display:
                    # Keep a clean capitalized version for display
                    tech_display[s] = s.title() if len(s) > 3 else s.upper()

        total_skill_occurrences = sum(tech_freq.values()) or 1

        # Sorted dominant technologies in the room
        sorted_techs = sorted(tech_freq.items(), key=lambda x: x[1], reverse=True)
        top_room_technologies = [
            {
                "tech": tech_display.get(t, t.title()),
                "count": count,
                "percentage": round((count / team_count) * 100),
            }
            for t, count in sorted_techs
        ]

        # Representative participant_id for foreign key integrity
        rep_participant_id = teams_in_room[0]["leader_id"]

        # Calculate score for each mentor
        mentor_matches = []
        for mentor in mentors:
            m_skills = mentor["skills"]
            matched_skills_list = []
            matched_skill_weight = 0
            teams_benefited = set()

            for tech, count in sorted_techs:
                # Check exact or partial match (e.g., 'react' in 'reactjs')
                is_match = False
                if tech in m_skills:
                    is_match = True
                else:
                    for ms in m_skills:
                        if ms == tech or (len(ms) >= 3 and (ms in tech or tech in ms)):
                            is_match = True
                            break

                if is_match:
                    matched_skill_weight += count
                    matched_skills_list.append({
                        "skill": tech_display.get(tech, tech.title()),
                        "teams_count": count,
                        "percentage": round((count / team_count) * 100),
                    })
                    # Mark which teams benefit
                    for tm in teams_in_room:
                        if tech in tm["skills"]:
                            teams_benefited.add(tm["id"])

            if not matched_skills_list:
                continue

            # Composite Score:
            # - Tech frequency coverage (60% weight): how much of the room's total skill usage the mentor covers
            # - Team reach (40% weight): percentage of teams in the room that have at least one skill matched
            tech_coverage_ratio = matched_skill_weight / total_skill_occurrences
            team_reach_ratio = len(teams_benefited) / team_count
            score = round((0.6 * tech_coverage_ratio + 0.4 * team_reach_ratio) * 100, 1)

            # Cap at 99.9%
            score = min(score, 99.9)

            if score >= 10.0:  # Include meaningful matches
                is_assigned = (mentor["id"], fid, rid) in existing_assignments
                status_str = "assigned" if is_assigned else "pending"

                top_3_tech_names = [t["tech"] for t in top_room_technologies[:3]]
                matched_names = [s["skill"] for s in matched_skills_list[:3]]
                reason = (
                    f"Floor {room_info['floor_number']}, Room {room_info['room_number']} has {team_count} team(s). "
                    f"Top tech used: {', '.join(top_3_tech_names)}. "
                    f"Mentor covers {', '.join(matched_names)}, assisting {len(teams_benefited)} of {team_count} team(s)."
                )

                details_payload = {
                    "room_id": rid,
                    "room_number": room_info["room_number"],
                    "floor_id": fid,
                    "floor_number": room_info["floor_number"],
                    "team_count": team_count,
                    "team_names": [tm["name"] for tm in teams_in_room],
                    "top_room_technologies": top_room_technologies,
                    "matched_skills": matched_skills_list,
                    "recommendation_reason": reason,
                    "status": status_str,
                }

                mentor_matches.append((mentor["id"], score, details_payload))

        # Sort top mentors for this room and keep top 5
        mentor_matches.sort(key=lambda x: x[1], reverse=True)
        for mentor_id, score, details_payload in mentor_matches[:5]:
            rec = MentorRecommendation(
                participant_id=rep_participant_id,
                mentor_id=mentor_id,
                match_score=f"{score:.1f}",
                skill_match_details=json.dumps(details_payload),
            )
            db.add(rec)
            created_count += 1

    # 4. Fallback for unassigned teams if no rooms were matched
    if created_count == 0 and unassigned_teams:
        for tm in unassigned_teams:
            tm_skills = set(tm["skills"])
            rep_participant_id = tm["leader_id"]
            best_matches = []
            for mentor in mentors:
                shared = tm_skills & mentor["skills"]
                total = tm_skills | mentor["skills"]
                if shared:
                    score = round((len(shared) / len(total)) * 100, 1)
                    reason = f"Team '{tm['name']}' uses {', '.join(tm['skills'])}. Mentor matches on {', '.join(shared)}."
                    details = {
                        "room_id": None,
                        "room_number": "Unassigned",
                        "floor_id": None,
                        "floor_number": "Unassigned",
                        "team_count": 1,
                        "team_names": [tm["name"]],
                        "top_room_technologies": [{"tech": s.title(), "count": 1, "percentage": 100} for s in tm_skills],
                        "matched_skills": [{"skill": s.title(), "teams_count": 1, "percentage": 100} for s in shared],
                        "recommendation_reason": reason,
                        "status": "pending",
                    }
                    best_matches.append((mentor["id"], score, details))

            best_matches.sort(key=lambda x: x[1], reverse=True)
            for mentor_id, score, details in best_matches[:3]:
                rec = MentorRecommendation(
                    participant_id=rep_participant_id,
                    mentor_id=mentor_id,
                    match_score=f"{score:.1f}",
                    skill_match_details=json.dumps(details),
                )
                db.add(rec)
                created_count += 1

    db.commit()

    log_activity(
        db,
        current_user.id,
        "generate_recommendations",
        "recommendation",
        None,
        f"Generated {created_count} room-tech mentor recommendations",
    )

    return {
        "message": f"Generated {created_count} AI mentor recommendations based on room technology usage",
        "count": created_count,
    }


# ── Assign mentor to room from recommendation ─────────────────────────────

@router.post("/assign", status_code=status.HTTP_200_OK)
def assign_mentor_from_recommendation(
    payload: AssignRecommendationPayload,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Directly assigns the mentor to the recommended floor & room,
    creates mentor_assignments record, updates recommendation status to 'assigned',
    and logs the activity.
    """
    require_admin(current_user)

    # Check target floor & room
    floor = db.query(Floor).filter(Floor.id == payload.floor_id).first()
    room = db.query(Room).filter(Room.id == payload.room_id).first()
    if not floor or not room:
        raise HTTPException(status_code=404, detail="Target floor or room not found")

    # Create assignment if not already exists
    existing = db.query(MentorAssignment).filter(
        MentorAssignment.mentor_id == payload.mentor_id,
        MentorAssignment.floor_id == payload.floor_id,
        MentorAssignment.room_id == payload.room_id,
    ).first()

    if not existing:
        assignment = MentorAssignment(
            mentor_id=payload.mentor_id,
            floor_id=payload.floor_id,
            room_id=payload.room_id,
        )
        db.add(assignment)

    # Update recommendation status if recommendation_id provided
    if payload.recommendation_id:
        rec = db.query(MentorRecommendation).filter(MentorRecommendation.id == payload.recommendation_id).first()
        if rec and rec.skill_match_details:
            try:
                data = json.loads(rec.skill_match_details)
                data["status"] = "assigned"
                rec.skill_match_details = json.dumps(data)
            except Exception:
                pass

    db.commit()

    log_activity(
        db,
        current_user.id,
        "assign_mentor_room",
        "mentor",
        payload.mentor_id,
        f"Assigned mentor #{payload.mentor_id} to floor #{payload.floor_id}, room #{payload.room_id} from AI recommendation",
    )

    return {"message": "Mentor assigned successfully to venue room", "status": "assigned"}


# ── Update recommendation status (approve/reject) ──────────────────────────

@router.put("/{rec_id}/status", status_code=status.HTTP_200_OK)
def update_recommendation_status(
    rec_id: int,
    payload: StatusUpdatePayload,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    require_admin(current_user)
    rec = db.query(MentorRecommendation).filter(MentorRecommendation.id == rec_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    details = {}
    if rec.skill_match_details:
        try:
            details = json.loads(rec.skill_match_details)
        except Exception:
            details = {}

    details["status"] = payload.status
    rec.skill_match_details = json.dumps(details)
    db.commit()

    log_activity(
        db,
        current_user.id,
        f"recommendation_{payload.status}",
        "recommendation",
        rec_id,
        f"Marked mentor recommendation #{rec_id} as {payload.status}",
    )

    return {"message": f"Recommendation marked as {payload.status}", "status": payload.status}


# ── Delete a recommendation ────────────────────────────────────────────────

@router.delete("/{rec_id}", status_code=204)
def delete_recommendation(
    rec_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    require_admin(current_user)
    rec = db.query(MentorRecommendation).filter(MentorRecommendation.id == rec_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    db.delete(rec)
    db.commit()
