from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session
from db.database import get_db
from dependencies import get_current_user, require_admin, CurrentUser
from models.venue import Floor, Room, MentorAssignment, VolunteerAssignment
from routers.activity_logs import log_activity
from schemas.admin import (
    FloorCreate, FloorResponse, RoomCreate, RoomResponse,
    AssignmentCreate, AssignmentResponse,
    VolunteerAssignmentCreate, VolunteerAssignmentResponse,
    TeamLocationInfo, TeamReassignLocation, BulkTeamReassign,
)

router = APIRouter()


# ── Floors ─────────────────────────────────────────────────────────────────

@router.get("/floors", response_model=list[FloorResponse])
def list_floors(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    return db.query(Floor).order_by(Floor.floor_number).all()


@router.post("/floors", response_model=FloorResponse, status_code=201)
def create_floor(
    payload: FloorCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    require_admin(current_user)
    existing = db.query(Floor).filter(Floor.floor_number == payload.floor_number).first()
    if existing:
        raise HTTPException(status_code=409, detail="Floor number already exists")
    f = Floor(floor_number=payload.floor_number, description=payload.description)
    db.add(f)
    db.commit()
    db.refresh(f)
    log_activity(db, current_user.id, "create_floor", "venue", f.id, f"Created floor {f.floor_number}")
    return f


@router.delete("/floors/{floor_id}", status_code=204)
def delete_floor(
    floor_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    require_admin(current_user)
    f = db.query(Floor).filter(Floor.id == floor_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Floor not found")

    # Check if any team is assigned to any room on this floor
    teams = db.execute(
        text("SELECT id, name FROM teams WHERE floor_id = :fid"),
        {"fid": floor_id},
    ).fetchall()
    if teams:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Teams are assigned to this floor. Reassign them before deleting.",
                "teams": [{"team_id": t[0], "team_name": t[1]} for t in teams],
            },
        )

    # Cascade delete rooms, mentor/volunteer assignments on this floor
    db.execute(text("DELETE FROM mentor_assignments WHERE floor_id = :fid"), {"fid": floor_id})
    db.execute(text("DELETE FROM volunteer_assignments WHERE floor_id = :fid"), {"fid": floor_id})
    room_ids = [r.id for r in db.query(Room).filter(Room.floor_id == floor_id).all()]
    for rid in room_ids:
        db.execute(text("DELETE FROM mentor_assignments WHERE room_id = :rid"), {"rid": rid})
        db.execute(text("DELETE FROM volunteer_assignments WHERE room_id = :rid"), {"rid": rid})
    db.query(Room).filter(Room.floor_id == floor_id).delete()
    db.delete(f)
    db.commit()
    log_activity(db, current_user.id, "delete_floor", "venue", floor_id, f"Deleted floor #{floor_id}")


# ── Rooms ──────────────────────────────────────────────────────────────────

@router.get("/rooms", response_model=list[RoomResponse])
def list_rooms(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    return db.query(Room).order_by(Room.floor_id, Room.room_number).all()


@router.post("/rooms", response_model=RoomResponse, status_code=201)
def create_room(
    payload: RoomCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    require_admin(current_user)
    floor = db.query(Floor).filter(Floor.id == payload.floor_id).first()
    if not floor:
        raise HTTPException(status_code=404, detail="Floor not found")
    r = Room(**payload.model_dump())
    db.add(r)
    db.commit()
    db.refresh(r)
    log_activity(db, current_user.id, "create_room", "venue", r.id, f"Created room {r.room_number} on floor #{r.floor_id} (capacity {r.capacity})")
    return r


@router.delete("/rooms/{room_id}", status_code=204)
def delete_room(
    room_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    require_admin(current_user)
    r = db.query(Room).filter(Room.id == room_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Room not found")

    # Check if any team is assigned to this room
    teams = db.execute(
        text("SELECT id, name FROM teams WHERE room_id = :rid"),
        {"rid": room_id},
    ).fetchall()
    if teams:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Teams are assigned to this room. Reassign them before deleting.",
                "teams": [{"team_id": t[0], "team_name": t[1]} for t in teams],
            },
        )

    # Remove mentor/volunteer assignments for this room then delete
    db.execute(text("DELETE FROM mentor_assignments WHERE room_id = :rid"), {"rid": room_id})
    db.execute(text("DELETE FROM volunteer_assignments WHERE room_id = :rid"), {"rid": room_id})
    db.delete(r)
    db.commit()
    log_activity(db, current_user.id, "delete_room", "venue", room_id, f"Deleted room #{room_id}")


# ── Team location helpers ──────────────────────────────────────────────────

@router.get("/floors/{floor_id}/teams", response_model=list[TeamLocationInfo])
def teams_on_floor(
    floor_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Return all teams currently assigned to any room on this floor."""
    require_admin(current_user)
    rows = db.execute(
        text("SELECT id, name, floor_id, room_id FROM teams WHERE floor_id = :fid"),
        {"fid": floor_id},
    ).fetchall()
    return [TeamLocationInfo(team_id=r[0], team_name=r[1], floor_id=r[2], room_id=r[3]) for r in rows]


@router.get("/rooms/{room_id}/teams", response_model=list[TeamLocationInfo])
def teams_in_room(
    room_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Return all teams currently assigned to this room."""
    require_admin(current_user)
    rows = db.execute(
        text("SELECT id, name, floor_id, room_id FROM teams WHERE room_id = :rid"),
        {"rid": room_id},
    ).fetchall()
    return [TeamLocationInfo(team_id=r[0], team_name=r[1], floor_id=r[2], room_id=r[3]) for r in rows]


@router.post("/teams/reassign-location", status_code=200)
def bulk_reassign_team_locations(
    payload: BulkTeamReassign,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Reassign one or more teams to new floor/room locations."""
    require_admin(current_user)
    updated = 0
    for item in payload.reassignments:
        # Validate target floor and room exist
        floor = db.query(Floor).filter(Floor.id == item.new_floor_id).first()
        room = db.query(Room).filter(Room.id == item.new_room_id, Room.floor_id == item.new_floor_id).first()
        if not floor:
            raise HTTPException(status_code=404, detail=f"Floor {item.new_floor_id} not found")
        if not room:
            raise HTTPException(status_code=404, detail=f"Room {item.new_room_id} not found on floor {item.new_floor_id}")
        result = db.execute(
            text("UPDATE teams SET floor_id = :fid, room_id = :rid WHERE id = :tid"),
            {"fid": item.new_floor_id, "rid": item.new_room_id, "tid": item.team_id},
        )
        updated += result.rowcount
    db.commit()
    log_activity(db, current_user.id, "bulk_assign_teams", "team", None, f"Reassigned {updated} team venue locations")
    return {"updated": updated}


# ── Mentor assignments ─────────────────────────────────────────────────────

@router.get("/mentor-assignments", response_model=list[AssignmentResponse])
def list_mentor_assignments(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    require_admin(current_user)
    return db.query(MentorAssignment).all()


@router.post("/mentor-assignments", response_model=AssignmentResponse, status_code=201)
def assign_mentor(
    payload: AssignmentCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    require_admin(current_user)
    existing = db.query(MentorAssignment).filter(
        MentorAssignment.mentor_id == payload.mentor_id,
        MentorAssignment.floor_id == payload.floor_id,
        MentorAssignment.room_id == payload.room_id,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Assignment already exists")
    a = MentorAssignment(**payload.model_dump())
    db.add(a)
    db.commit()
    db.refresh(a)
    log_activity(db, current_user.id, "assign_mentor_room", "mentor", a.mentor_id, f"Assigned mentor #{a.mentor_id} to floor #{a.floor_id}, room #{a.room_id}")
    return a


@router.delete("/mentor-assignments/{assignment_id}", status_code=204)
def remove_mentor_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    require_admin(current_user)
    a = db.query(MentorAssignment).filter(MentorAssignment.id == assignment_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
    m_id, r_id = a.mentor_id, a.room_id
    db.delete(a)
    db.commit()
    log_activity(db, current_user.id, "remove_mentor_room", "mentor", m_id, f"Removed mentor #{m_id} from room #{r_id}")


# ── Volunteer assignments ──────────────────────────────────────────────────

@router.get("/volunteer-assignments/mine", response_model=list[VolunteerAssignmentResponse])
def my_volunteer_assignments(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if current_user.role != "volunteer":
        raise HTTPException(status_code=403, detail="Volunteer access required")
    assignments = db.query(VolunteerAssignment).filter(
        VolunteerAssignment.volunteer_id == current_user.user_id
    ).all()

    result = []
    for a in assignments:
        floor = db.query(Floor).filter(Floor.id == a.floor_id).first()
        room = db.query(Room).filter(Room.id == a.room_id).first()
        result.append(VolunteerAssignmentResponse(
            id=a.id,
            volunteer_id=a.volunteer_id,
            floor_id=a.floor_id,
            room_id=a.room_id,
            floor_number=floor.floor_number if floor else None,
            room_number=room.room_number if room else None,
            created_at=a.created_at,
        ))
    return result


@router.get("/volunteer-assignments", response_model=list[VolunteerAssignmentResponse])
def list_volunteer_assignments(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    require_admin(current_user)
    assignments = db.query(VolunteerAssignment).all()
    result = []
    for a in assignments:
        floor = db.query(Floor).filter(Floor.id == a.floor_id).first()
        room = db.query(Room).filter(Room.id == a.room_id).first()
        result.append(VolunteerAssignmentResponse(
            id=a.id,
            volunteer_id=a.volunteer_id,
            floor_id=a.floor_id,
            room_id=a.room_id,
            floor_number=floor.floor_number if floor else None,
            room_number=room.room_number if room else None,
            created_at=a.created_at,
        ))
    return result


@router.post("/volunteer-assignments", response_model=VolunteerAssignmentResponse, status_code=201)
def assign_volunteer(
    payload: VolunteerAssignmentCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    require_admin(current_user)
    existing = db.query(VolunteerAssignment).filter(
        VolunteerAssignment.volunteer_id == payload.volunteer_id,
        VolunteerAssignment.floor_id == payload.floor_id,
        VolunteerAssignment.room_id == payload.room_id,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Assignment already exists")
    a = VolunteerAssignment(**payload.model_dump())
    db.add(a)
    db.commit()
    db.refresh(a)
    floor = db.query(Floor).filter(Floor.id == a.floor_id).first()
    room = db.query(Room).filter(Room.id == a.room_id).first()
    log_activity(db, current_user.id, "assign_volunteer_room", "volunteer", a.volunteer_id, f"Assigned volunteer #{a.volunteer_id} to floor #{a.floor_id}, room #{a.room_id}")
    return VolunteerAssignmentResponse(
        id=a.id,
        volunteer_id=a.volunteer_id,
        floor_id=a.floor_id,
        room_id=a.room_id,
        floor_number=floor.floor_number if floor else None,
        room_number=room.room_number if room else None,
        created_at=a.created_at,
    )


@router.delete("/volunteer-assignments/{assignment_id}", status_code=204)
def remove_volunteer_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    require_admin(current_user)
    a = db.query(VolunteerAssignment).filter(VolunteerAssignment.id == assignment_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
    v_id, r_id = a.volunteer_id, a.room_id
    db.delete(a)
    db.commit()
    log_activity(db, current_user.id, "remove_volunteer_room", "volunteer", v_id, f"Removed volunteer #{v_id} from room #{r_id}")
