"""seed default data

Revision ID: 002
Revises: 001
Create Date: 2026-04-08
"""
from alembic import op
from sqlalchemy.sql import table, column
import sqlalchemy as sa
from datetime import datetime

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── system_settings ────────────────────────────────────────────────────
    settings = table(
        "system_settings",
        column("setting_key", sa.String),
        column("setting_value", sa.Text),
        column("setting_type", sa.String),
        column("description", sa.Text),
        column("is_public", sa.Integer),
    )
    op.bulk_insert(settings, [
        {"setting_key": "hackathon_name",        "setting_value": "HackMate",                    "setting_type": "string",  "description": "Name of the hackathon event",                                          "is_public": 1},
        {"setting_key": "hackathon_description", "setting_value": "Hackathon Management System", "setting_type": "string",  "description": "Description of the hackathon",                                        "is_public": 1},
        {"setting_key": "max_team_size",         "setting_value": "4",                           "setting_type": "integer", "description": "Maximum number of members per team",                                   "is_public": 1},
        {"setting_key": "min_team_size",         "setting_value": "1",                           "setting_type": "integer", "description": "Minimum number of members per team",                                   "is_public": 1},
        {"setting_key": "registration_open",     "setting_value": "1",                           "setting_type": "boolean", "description": "Whether registration is currently open",                               "is_public": 1},
        {"setting_key": "hackathon_start_date",  "setting_value": "2025-09-27T08:00",            "setting_type": "string",  "description": "Hackathon start date and time",                                        "is_public": 1},
        {"setting_key": "hackathon_end_date",    "setting_value": "2025-09-30T02:30",            "setting_type": "string",  "description": "Hackathon end date and time",                                          "is_public": 1},
        {"setting_key": "contact_email",         "setting_value": "admin@hackmate.com",          "setting_type": "string",  "description": "Contact email for support",                                            "is_public": 1},
        {"setting_key": "timezone",              "setting_value": "Asia/Kolkata",                "setting_type": "string",  "description": "System timezone",                                                      "is_public": 0},
        {"setting_key": "maintenance_mode",      "setting_value": "0",                           "setting_type": "boolean", "description": "Enable maintenance mode",                                               "is_public": 0},
        {"setting_key": "rankings_visible",      "setting_value": "0",                           "setting_type": "boolean", "description": "Whether team rankings are visible to participants",                    "is_public": 1},
        {"setting_key": "show_mentoring_scores_to_participants", "setting_value": "0", "setting_type": "boolean", "description": "Whether participants can see actual mentoring scores", "is_public": 0},
    ])

    # ── themes ─────────────────────────────────────────────────────────────
    themes = table(
        "themes",
        column("name", sa.String),
        column("description", sa.Text),
        column("color_code", sa.String),
        column("is_active", sa.Integer),
    )
    op.bulk_insert(themes, [
        {"name": "Education",          "description": "Educational technology solutions, e-learning platforms, and academic tools",    "color_code": "#10B981", "is_active": 1},
        {"name": "Fintech",            "description": "Financial technology, payment solutions, and banking innovations",               "color_code": "#F59E0B", "is_active": 1},
        {"name": "Blockchain",         "description": "Cryptocurrency, smart contracts, and decentralized applications",               "color_code": "#8B5CF6", "is_active": 1},
        {"name": "Healthcare",         "description": "Medical technology, health monitoring, and wellness applications",               "color_code": "#EF4444", "is_active": 1},
        {"name": "Environment",        "description": "Sustainability, climate change solutions, and green technology",                 "color_code": "#22C55E", "is_active": 1},
        {"name": "Social Impact",      "description": "Community solutions, social good, and humanitarian technology",                  "color_code": "#EC4899", "is_active": 1},
        {"name": "Gaming",             "description": "Game development, interactive entertainment, and virtual reality",               "color_code": "#F97316", "is_active": 1},
        {"name": "IoT & Hardware",     "description": "Internet of Things, embedded systems, and hardware innovations",                 "color_code": "#06B6D4", "is_active": 1},
        {"name": "AI & Machine Learning", "description": "Artificial intelligence, data science, and automation solutions",            "color_code": "#6366F1", "is_active": 1},
        {"name": "Open Innovation",    "description": "Creative solutions that don't fit into specific categories",                     "color_code": "#64748B", "is_active": 1},
    ])

    # ── skills ─────────────────────────────────────────────────────────────
    skills = table(
        "skills",
        column("name", sa.String),
        column("category", sa.String),
    )
    op.bulk_insert(skills, [
        {"name": "JavaScript",       "category": "programming"},
        {"name": "Python",           "category": "programming"},
        {"name": "Java",             "category": "programming"},
        {"name": "C++",              "category": "programming"},
        {"name": "C#",               "category": "programming"},
        {"name": "PHP",              "category": "programming"},
        {"name": "TypeScript",       "category": "programming"},
        {"name": "Go",               "category": "programming"},
        {"name": "Rust",             "category": "programming"},
        {"name": "Swift",            "category": "programming"},
        {"name": "Kotlin",           "category": "programming"},
        {"name": "React",            "category": "frontend"},
        {"name": "Vue.js",           "category": "frontend"},
        {"name": "Angular",          "category": "frontend"},
        {"name": "HTML",             "category": "frontend"},
        {"name": "CSS",              "category": "frontend"},
        {"name": "Tailwind CSS",     "category": "frontend"},
        {"name": "Node.js",          "category": "backend"},
        {"name": "Django",           "category": "backend"},
        {"name": "Flask",            "category": "backend"},
        {"name": "FastAPI",          "category": "backend"},
        {"name": "Spring Boot",      "category": "backend"},
        {"name": "MySQL",            "category": "database"},
        {"name": "PostgreSQL",       "category": "database"},
        {"name": "MongoDB",          "category": "database"},
        {"name": "Redis",            "category": "database"},
        {"name": "Firebase",         "category": "database"},
        {"name": "AWS",              "category": "cloud"},
        {"name": "Azure",            "category": "cloud"},
        {"name": "Google Cloud",     "category": "cloud"},
        {"name": "Docker",           "category": "devops"},
        {"name": "Kubernetes",       "category": "devops"},
        {"name": "Git",              "category": "devops"},
        {"name": "React Native",     "category": "mobile"},
        {"name": "Flutter",          "category": "mobile"},
        {"name": "Machine Learning", "category": "ai"},
        {"name": "TensorFlow",       "category": "ai"},
        {"name": "PyTorch",          "category": "ai"},
        {"name": "Scikit-learn",     "category": "ai"},
        {"name": "GraphQL",          "category": "api"},
        {"name": "REST API",         "category": "api"},
        {"name": "Microservices",    "category": "architecture"},
        {"name": "Blockchain",       "category": "emerging"},
        {"name": "IoT",              "category": "emerging"},
        {"name": "Cybersecurity",    "category": "security"},
        {"name": "UI/UX Design",     "category": "design"},
    ])

    # ── floors & rooms ─────────────────────────────────────────────────────
    floors = table(
        "floors",
        column("floor_number", sa.String),
        column("description", sa.Text),
    )
    op.bulk_insert(floors, [
        {"floor_number": "F1", "description": "First Floor - Main Event Area"},
        {"floor_number": "F2", "description": "Second Floor - Development Zones"},
    ])

    rooms = table(
        "rooms",
        column("floor_id", sa.Integer),
        column("room_number", sa.String),
        column("capacity", sa.Integer),
        column("description", sa.Text),
    )
    op.bulk_insert(rooms, [
        {"floor_id": 1, "room_number": "R101", "capacity": 6, "description": "Main Auditorium"},
        {"floor_id": 1, "room_number": "R103", "capacity": 4, "description": "Team Room B"},
        {"floor_id": 2, "room_number": "R201", "capacity": 4, "description": "Development Room A"},
        {"floor_id": 2, "room_number": "R203", "capacity": 4, "description": "Development Room C"},
    ])

    # ── default admin user ─────────────────────────────────────────────────
    # Password: "password" — CHANGE THIS immediately after first login
    # Hash generated with bcrypt (passlib): passlib.hash.bcrypt.hash("password")
    users = table(
        "users",
        column("name", sa.String),
        column("email", sa.String),
        column("password", sa.String),
        column("role", sa.String),
    )
    op.bulk_insert(users, [
        {
            "name": "System Administrator",
            "email": "admin@hackmate.com",
            "password": "$2b$12$JAZeYHHDUJ6rqJgHNryg2..DXF7ZX5RyzIo/inx3oGWvMUc82RP.i",
            "role": "admin",
        }
    ])

    # ── mentoring rounds ───────────────────────────────────────────────────
    rounds = table(
        "mentoring_rounds",
        column("round_name", sa.String),
        column("start_time", sa.DateTime),
        column("end_time", sa.DateTime),
        column("max_score", sa.Integer),
        column("description", sa.Text),
        column("is_active", sa.Integer),
    )
    op.bulk_insert(rounds, [
        {"round_name": "Team Formation & Ideation",  "start_time": datetime(2024, 3, 15, 9, 0),  "end_time": datetime(2024, 3, 15, 12, 0), "max_score": 50,  "description": "Initial team formation and project ideation phase", "is_active": 1},
        {"round_name": "Mid-Progress Review",        "start_time": datetime(2024, 3, 15, 14, 0), "end_time": datetime(2024, 3, 15, 17, 0), "max_score": 75,  "description": "Mid-hackathon progress review and guidance",        "is_active": 1},
        {"round_name": "Technical Implementation",   "start_time": datetime(2024, 3, 16, 9, 0),  "end_time": datetime(2024, 3, 16, 12, 0), "max_score": 100, "description": "Technical implementation and development review",    "is_active": 1},
        {"round_name": "Final Presentation",         "start_time": datetime(2025, 11, 14, 14, 0),"end_time": datetime(2025, 11, 15, 18, 0), "max_score": 150, "description": "Final project presentation and judging",            "is_active": 1},
    ])

    # ── submission settings ────────────────────────────────────────────────
    sub_settings = table(
        "submission_settings",
        column("start_time", sa.DateTime),
        column("end_time", sa.DateTime),
        column("is_active", sa.Integer),
        column("max_file_size", sa.Integer),
        column("allowed_extensions", sa.String),
    )
    op.bulk_insert(sub_settings, [
        {
            "start_time": datetime(2025, 11, 14, 8, 0),
            "end_time": datetime(2025, 11, 15, 22, 0),
            "is_active": 1,
            "max_file_size": 52428800,
            "allowed_extensions": "pdf,doc,docx,zip,rar,tar.gz,ppt,pptx",
        }
    ])


def downgrade() -> None:
    op.execute("DELETE FROM submission_settings")
    op.execute("DELETE FROM mentoring_rounds")
    op.execute("DELETE FROM users WHERE email = 'admin@hackmate.com'")
    op.execute("DELETE FROM rooms")
    op.execute("DELETE FROM floors")
    op.execute("DELETE FROM skills")
    op.execute("DELETE FROM themes")
    op.execute("DELETE FROM system_settings")
