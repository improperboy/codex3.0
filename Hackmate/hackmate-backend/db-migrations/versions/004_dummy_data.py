"""dummy data for development

Revision ID: 004
Revises: 003
Create Date: 2026-04-13
"""
from alembic import op
from sqlalchemy.sql import table, column
import sqlalchemy as sa
from datetime import datetime

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── extra users (participants, mentors, volunteers) ────────────────────
    # All passwords are "password" (bcrypt hash)
    HASH = "$2b$12$JAZeYHHDUJ6rqJgHNryg2..DXF7ZX5RyzIo/inx3oGWvMUc82RP.i"

    users = table(
        "users",
        column("name", sa.String),
        column("email", sa.String),
        column("password", sa.String),
        column("role", sa.String),
        column("tech_stack", sa.Text),
        column("floor", sa.String),
        column("room", sa.String),
    )
    op.bulk_insert(users, [
        # mentors (id 2-4)
        {"name": "Priya Sharma",    "email": "priya@hackmate.com",    "password": HASH, "role": "mentor",      "tech_stack": "Python,FastAPI,PostgreSQL", "floor": "F1", "room": "R101"},
        {"name": "Rahul Verma",     "email": "rahul@hackmate.com",    "password": HASH, "role": "mentor",      "tech_stack": "React,Node.js,MongoDB",     "floor": "F1", "room": "R103"},
        {"name": "Anita Nair",      "email": "anita@hackmate.com",    "password": HASH, "role": "mentor",      "tech_stack": "ML,TensorFlow,Python",      "floor": "F2", "room": "R201"},
        # volunteers (id 5-6)
        {"name": "Karan Mehta",     "email": "karan@hackmate.com",    "password": HASH, "role": "volunteer",   "tech_stack": "Docker,Kubernetes",         "floor": "F1", "room": "R101"},
        {"name": "Sneha Patel",     "email": "sneha@hackmate.com",    "password": HASH, "role": "volunteer",   "tech_stack": "Git,Linux",                 "floor": "F2", "room": "R203"},
        # participants (id 7-18)
        {"name": "Arjun Singh",     "email": "arjun@hackmate.com",    "password": HASH, "role": "participant", "tech_stack": "React,TypeScript",          "floor": "F1", "room": "R101"},
        {"name": "Meera Iyer",      "email": "meera@hackmate.com",    "password": HASH, "role": "participant", "tech_stack": "Python,Django",             "floor": "F1", "room": "R101"},
        {"name": "Dev Kapoor",      "email": "dev@hackmate.com",      "password": HASH, "role": "participant", "tech_stack": "Flutter,Dart",              "floor": "F1", "room": "R103"},
        {"name": "Riya Joshi",      "email": "riya@hackmate.com",     "password": HASH, "role": "participant", "tech_stack": "Vue.js,Node.js",            "floor": "F1", "room": "R103"},
        {"name": "Aditya Kumar",    "email": "aditya@hackmate.com",   "password": HASH, "role": "participant", "tech_stack": "Java,Spring Boot",          "floor": "F2", "room": "R201"},
        {"name": "Pooja Reddy",     "email": "pooja@hackmate.com",    "password": HASH, "role": "participant", "tech_stack": "ML,Scikit-learn,Python",    "floor": "F2", "room": "R201"},
        {"name": "Vikram Das",      "email": "vikram@hackmate.com",   "password": HASH, "role": "participant", "tech_stack": "Go,Docker",                 "floor": "F2", "room": "R203"},
        {"name": "Nisha Gupta",     "email": "nisha@hackmate.com",    "password": HASH, "role": "participant", "tech_stack": "React Native,Firebase",     "floor": "F2", "room": "R203"},
        {"name": "Rohan Tiwari",    "email": "rohan@hackmate.com",    "password": HASH, "role": "participant", "tech_stack": "Blockchain,Solidity",       "floor": "F1", "room": "R101"},
        {"name": "Kavya Menon",     "email": "kavya@hackmate.com",    "password": HASH, "role": "participant", "tech_stack": "AWS,Terraform",             "floor": "F1", "room": "R103"},
        {"name": "Siddharth Rao",   "email": "sid@hackmate.com",      "password": HASH, "role": "participant", "tech_stack": "Angular,TypeScript",        "floor": "F2", "room": "R201"},
        {"name": "Tanvi Shah",      "email": "tanvi@hackmate.com",    "password": HASH, "role": "participant", "tech_stack": "IoT,C++,Arduino",           "floor": "F2", "room": "R203"},
    ])

    # ── teams ──────────────────────────────────────────────────────────────
    # theme_ids from seed: AI=9, Fintech=2, Healthcare=4, Blockchain=3, IoT=8
    # leader_ids: Arjun=7, Dev=9, Aditya=11, Rohan=15, Vikram=13
    # floor/room ids from seed: F1=1,F2=2 | R101=1,R103=2,R201=3,R203=4
    teams = table(
        "teams",
        column("name", sa.String),
        column("idea", sa.Text),
        column("problem_statement", sa.Text),
        column("tech_skills", sa.Text),
        column("theme_id", sa.Integer),
        column("leader_id", sa.Integer),
        column("floor_id", sa.Integer),
        column("room_id", sa.Integer),
        column("status", sa.String),
    )
    op.bulk_insert(teams, [
        {"name": "NeuralNinjas",   "idea": "AI-powered study assistant",          "problem_statement": "Students struggle to find personalized learning resources",    "tech_skills": "Python,ML,React",          "theme_id": 9, "leader_id": 7,  "floor_id": 1, "room_id": 1, "status": "approved"},
        {"name": "FinFlow",        "idea": "Micro-investment platform for Gen Z",  "problem_statement": "Young adults lack accessible investment tools",               "tech_skills": "React,Node.js,PostgreSQL", "theme_id": 2, "leader_id": 9,  "floor_id": 1, "room_id": 2, "status": "approved"},
        {"name": "MediTrack",      "idea": "Patient health monitoring dashboard",  "problem_statement": "Doctors lack real-time patient data between visits",          "tech_skills": "Flutter,Firebase,Python",  "theme_id": 4, "leader_id": 11, "floor_id": 2, "room_id": 3, "status": "approved"},
        {"name": "ChainVote",      "idea": "Decentralized voting system",          "problem_statement": "Traditional voting systems are opaque and tamper-prone",      "tech_skills": "Solidity,React,Web3.js",   "theme_id": 3, "leader_id": 15, "floor_id": 1, "room_id": 1, "status": "approved"},
        {"name": "SmartFarm",      "idea": "IoT crop monitoring for small farms",  "problem_statement": "Small farmers lack affordable precision agriculture tools",   "tech_skills": "IoT,C++,AWS,React",        "theme_id": 8, "leader_id": 13, "floor_id": 2, "room_id": 4, "status": "approved"},
    ])

    # ── team_members ───────────────────────────────────────────────────────
    # team 1: Arjun(7)+Meera(8), team 2: Dev(9)+Riya(10), team 3: Aditya(11)+Pooja(12)
    # team 4: Rohan(15)+Kavya(16), team 5: Vikram(13)+Nisha(14)+Sid(17)+Tanvi(18)
    members = table(
        "team_members",
        column("user_id", sa.Integer),
        column("team_id", sa.Integer),
        column("status", sa.String),
    )
    op.bulk_insert(members, [
        {"user_id": 7,  "team_id": 1, "status": "approved"},
        {"user_id": 8,  "team_id": 1, "status": "approved"},
        {"user_id": 9,  "team_id": 2, "status": "approved"},
        {"user_id": 10, "team_id": 2, "status": "approved"},
        {"user_id": 11, "team_id": 3, "status": "approved"},
        {"user_id": 12, "team_id": 3, "status": "approved"},
        {"user_id": 15, "team_id": 4, "status": "approved"},
        {"user_id": 16, "team_id": 4, "status": "approved"},
        {"user_id": 13, "team_id": 5, "status": "approved"},
        {"user_id": 14, "team_id": 5, "status": "approved"},
        {"user_id": 17, "team_id": 5, "status": "approved"},
        {"user_id": 18, "team_id": 5, "status": "approved"},
    ])

    # ── scores (mentor_id: Priya=2, Rahul=3, Anita=4) ─────────────────────
    # round_ids from seed: 1,2,3,4
    scores = table(
        "scores",
        column("mentor_id", sa.Integer),
        column("team_id", sa.Integer),
        column("round_id", sa.Integer),
        column("score", sa.Integer),
        column("comment", sa.Text),
    )
    op.bulk_insert(scores, [
        # Round 1
        {"mentor_id": 2, "team_id": 1, "round_id": 1, "score": 42, "comment": "Strong idea, good ML approach. Needs better UX planning."},
        {"mentor_id": 3, "team_id": 2, "round_id": 1, "score": 38, "comment": "Solid fintech concept. Market research could be deeper."},
        {"mentor_id": 4, "team_id": 3, "round_id": 1, "score": 45, "comment": "Excellent problem statement. Flutter implementation looks promising."},
        {"mentor_id": 2, "team_id": 4, "round_id": 1, "score": 40, "comment": "Blockchain use case is well justified."},
        {"mentor_id": 3, "team_id": 5, "round_id": 1, "score": 35, "comment": "IoT scope is ambitious. Focus on MVP."},
        # Round 2
        {"mentor_id": 2, "team_id": 1, "round_id": 2, "score": 58, "comment": "Good progress on the ML model. Demo was impressive."},
        {"mentor_id": 3, "team_id": 2, "round_id": 2, "score": 62, "comment": "Payment integration working well. Clean UI."},
        {"mentor_id": 4, "team_id": 3, "round_id": 2, "score": 70, "comment": "Real-time data sync is solid. Great teamwork."},
        {"mentor_id": 2, "team_id": 4, "round_id": 2, "score": 55, "comment": "Smart contract logic needs more testing."},
        {"mentor_id": 3, "team_id": 5, "round_id": 2, "score": 60, "comment": "Sensor integration working. Dashboard looks clean."},
        # Round 3
        {"mentor_id": 4, "team_id": 1, "round_id": 3, "score": 82, "comment": "Model accuracy improved significantly. Well done."},
        {"mentor_id": 2, "team_id": 2, "round_id": 3, "score": 78, "comment": "Feature complete. Performance is good."},
        {"mentor_id": 3, "team_id": 3, "round_id": 3, "score": 88, "comment": "Best technical implementation seen today."},
        {"mentor_id": 4, "team_id": 4, "round_id": 3, "score": 75, "comment": "Voting logic is secure. UI needs polish."},
        {"mentor_id": 2, "team_id": 5, "round_id": 3, "score": 80, "comment": "Impressive IoT pipeline. Scalability concerns addressed."},
    ])

    # ── submissions ────────────────────────────────────────────────────────
    submissions = table(
        "submissions",
        column("team_id", sa.Integer),
        column("github_link", sa.String),
        column("live_link", sa.String),
        column("tech_stack", sa.Text),
        column("description", sa.Text),
    )
    op.bulk_insert(submissions, [
        {"team_id": 1, "github_link": "https://github.com/neuralninjas/study-ai",    "live_link": "https://studyai.demo.com",   "tech_stack": "Python,FastAPI,React,TensorFlow", "description": "AI study assistant that personalizes learning paths using NLP and student performance data."},
        {"team_id": 2, "github_link": "https://github.com/finflow/micro-invest",     "live_link": "https://finflow.demo.com",   "tech_stack": "React,Node.js,PostgreSQL,Stripe", "description": "Micro-investment platform allowing Gen Z to invest spare change automatically."},
        {"team_id": 3, "github_link": "https://github.com/meditrack/health-dash",    "live_link": "https://meditrack.demo.com", "tech_stack": "Flutter,Firebase,Python,FastAPI", "description": "Real-time patient health monitoring with doctor alerts and trend analysis."},
        {"team_id": 4, "github_link": "https://github.com/chainvote/dvoting",        "live_link": None,                         "tech_stack": "Solidity,React,Web3.js,IPFS",     "description": "Transparent decentralized voting system on Ethereum with audit trail."},
        {"team_id": 5, "github_link": "https://github.com/smartfarm/crop-monitor",   "live_link": "https://smartfarm.demo.com", "tech_stack": "C++,AWS IoT,React,PostgreSQL",    "description": "Affordable IoT crop monitoring system with soil, humidity and weather sensors."},
    ])

    # ── support messages ───────────────────────────────────────────────────
    support = table(
        "support_messages",
        column("from_id", sa.Integer),
        column("from_role", sa.String),
        column("to_role", sa.String),
        column("subject", sa.String),
        column("message", sa.Text),
        column("priority", sa.String),
        column("floor_id", sa.Integer),
        column("room_id", sa.Integer),
        column("status", sa.String),
    )
    op.bulk_insert(support, [
        {"from_id": 7,  "from_role": "participant", "to_role": "volunteer", "subject": "Need extra monitor",         "message": "Our team needs an extra monitor for development. Can you help?",          "priority": "medium", "floor_id": 1, "room_id": 1, "status": "resolved"},
        {"from_id": 11, "from_role": "participant", "to_role": "mentor",    "subject": "Firebase auth issue",        "message": "Getting 403 errors on Firebase auth. Can a mentor help us debug?",        "priority": "high",   "floor_id": 2, "room_id": 3, "status": "resolved"},
        {"from_id": 13, "from_role": "participant", "to_role": "volunteer", "subject": "WiFi connectivity problem",  "message": "IoT devices can't connect to the hackathon WiFi. Need network help.",     "priority": "urgent", "floor_id": 2, "room_id": 4, "status": "in_progress"},
        {"from_id": 15, "from_role": "participant", "to_role": "mentor",    "subject": "Smart contract gas fees",    "message": "Our contract deployment is failing due to gas estimation errors.",         "priority": "high",   "floor_id": 1, "room_id": 1, "status": "open"},
        {"from_id": 9,  "from_role": "participant", "to_role": "volunteer", "subject": "Power strip needed",         "message": "We need a power strip, only one outlet available at our table.",          "priority": "low",    "floor_id": 1, "room_id": 2, "status": "resolved"},
    ])

    # ── posts (announcements) ──────────────────────────────────────────────
    posts = table(
        "posts",
        column("title", sa.String),
        column("content", sa.Text),
        column("author_id", sa.Integer),
        column("is_pinned", sa.Integer),
        column("target_roles", sa.Text),
    )
    op.bulk_insert(posts, [
        {"title": "Welcome to HackMate 2025!",          "content": "Welcome everyone! Check-in is complete. Hacking starts now. Good luck to all teams!",                                          "author_id": 1, "is_pinned": 1, "target_roles": None},
        {"title": "Lunch break — 1:00 PM to 2:00 PM",  "content": "Lunch is served in the main hall. Please take a break and recharge. Hacking resumes at 2 PM sharp.",                          "author_id": 1, "is_pinned": 0, "target_roles": None},
        {"title": "Round 1 scoring begins at 3 PM",     "content": "Mentors will start visiting teams for Round 1 evaluation at 3:00 PM. Make sure your demo is ready.",                          "author_id": 1, "is_pinned": 1, "target_roles": None},
        {"title": "Mentor office hours available",      "content": "Mentors are available for 1-on-1 sessions in Room R101. Book a slot via the support system.",                                  "author_id": 1, "is_pinned": 0, "target_roles": '["participant"]'},
        {"title": "Final submissions due at 10 PM",     "content": "All teams must submit their GitHub links and project descriptions before 10 PM tonight. No extensions will be granted.",       "author_id": 1, "is_pinned": 1, "target_roles": '["participant"]'},
        {"title": "Volunteer briefing at 8 AM tomorrow","content": "All volunteers please assemble at the main entrance at 8 AM for the final day briefing.",                                      "author_id": 1, "is_pinned": 0, "target_roles": '["volunteer"]'},
    ])

    # ── join requests ──────────────────────────────────────────────────────
    join_requests = table(
        "join_requests",
        column("user_id", sa.Integer),
        column("team_id", sa.Integer),
        column("status", sa.String),
        column("message", sa.Text),
    )
    op.bulk_insert(join_requests, [
        {"user_id": 16, "team_id": 1, "status": "rejected", "message": "I have strong React skills and would love to join NeuralNinjas!"},
        {"user_id": 17, "team_id": 2, "status": "rejected", "message": "I can help with the Angular frontend for FinFlow."},
        {"user_id": 18, "team_id": 3, "status": "rejected", "message": "I have IoT experience that could help MediTrack with device integration."},
    ])


def downgrade() -> None:
    op.execute("DELETE FROM join_requests WHERE user_id IN (16,17,18)")
    op.execute("DELETE FROM posts WHERE author_id = 1 AND title LIKE '%HackMate%'")
    op.execute("DELETE FROM support_messages WHERE from_id IN (7,9,11,13,15)")
    op.execute("DELETE FROM submissions WHERE team_id IN (1,2,3,4,5)")
    op.execute("DELETE FROM scores WHERE mentor_id IN (2,3,4)")
    op.execute("DELETE FROM team_members WHERE team_id IN (1,2,3,4,5)")
    op.execute("DELETE FROM teams WHERE name IN ('NeuralNinjas','FinFlow','MediTrack','ChainVote','SmartFarm')")
    op.execute("DELETE FROM users WHERE email LIKE '%@hackmate.com' AND email != 'admin@hackmate.com'")
