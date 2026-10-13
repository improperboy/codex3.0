"""
HackMate Database Reset Module
Deletes all application data from the Supabase database while keeping admin account(s).
Can be run as a standalone script or imported into the Admin Service.
"""

import os
import sys
from pathlib import Path


# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

# Lookup/config tables from initial seed (floors, rooms, skills, themes, settings)
# Set to True if you also want to delete these lookup tables.
DELETE_LOOKUP_TABLES = False


# ─────────────────────────────────────────────────────────────────────────────
# 1. LOAD .ENV CREDENTIALS
# ─────────────────────────────────────────────────────────────────────────────

def find_and_load_env():
    """Finds .env in current or parent directory and loads environment variables."""
    possible_paths = [
        Path.cwd() / ".env",
        Path(__file__).resolve().parent / ".env",
        Path.cwd() / "hackmate-backend" / ".env",
        Path(__file__).resolve().parent.parent / "hackmate-backend" / ".env",
        Path(__file__).resolve().parent.parent / ".env",
    ]

    env_file = None
    for p in possible_paths:
        if p.is_file():
            env_file = p
            break

    if env_file:
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip().strip("'\"")
                if key not in os.environ:
                    os.environ[key] = val


# ─────────────────────────────────────────────────────────────────────────────
# 2. DATABASE DRIVER ADAPTER (Supports psycopg2, psycopg, or sqlalchemy)
# ─────────────────────────────────────────────────────────────────────────────

class DBClient:
    def __init__(self, database_url: str):
        self.url = database_url
        self.driver = None
        self.conn = None
        self._connect()

    def _connect(self):
        # 1. Try psycopg2
        try:
            import psycopg2
            self.conn = psycopg2.connect(self.url)
            self.driver = "psycopg2"
            return
        except ImportError:
            pass

        # 2. Try psycopg (psycopg3)
        try:
            import psycopg
            self.conn = psycopg.connect(self.url)
            self.driver = "psycopg"
            return
        except ImportError:
            pass

        # 3. Try sqlalchemy
        try:
            from sqlalchemy import create_engine
            db_url = self.url
            if db_url.startswith("postgresql://") and not db_url.startswith("postgresql+"):
                db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)
            try:
                engine = create_engine(db_url)
                self.conn = engine.connect()
                self.driver = "sqlalchemy"
                return
            except Exception:
                engine = create_engine(self.url)
                self.conn = engine.connect()
                self.driver = "sqlalchemy"
                return
        except ImportError:
            pass

        raise RuntimeError(
            "No PostgreSQL driver found! Please install psycopg2-binary, psycopg, or sqlalchemy."
        )

    def execute(self, sql: str, params=None):
        """Executes a query and returns (rowcount, fetchall_results)."""
        if self.driver in ("psycopg2", "psycopg"):
            cur = self.conn.cursor()
            cur.execute(sql, params or ())
            try:
                rows = cur.fetchall()
            except Exception:
                rows = None
            rowcount = cur.rowcount
            cur.close()
            return rowcount, rows
        elif self.driver == "sqlalchemy":
            from sqlalchemy import text
            res = self.conn.execute(text(sql), params or {})
            try:
                rows = res.fetchall()
            except Exception:
                rows = None
            rowcount = res.rowcount
            return rowcount, rows

    def commit(self):
        if self.driver in ("psycopg2", "psycopg"):
            self.conn.commit()
        elif self.driver == "sqlalchemy":
            self.conn.commit()

    def close(self):
        if self.conn:
            try:
                self.conn.close()
            except Exception:
                pass

    def table_exists(self, table_name: str) -> bool:
        _, rows = self.execute(
            """
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' AND LOWER(table_name) = LOWER(%s)
            )
            """ if self.driver != "sqlalchemy" else
            """
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' AND LOWER(table_name) = LOWER(:t)
            )
            """,
            (table_name,) if self.driver != "sqlalchemy" else {"t": table_name}
        )
        return bool(rows and rows[0][0])


# ─────────────────────────────────────────────────────────────────────────────
# 3. MAIN DELETION ROUTINE
# ─────────────────────────────────────────────────────────────────────────────

def delete_database_data(db_url: str = None) -> dict:
    """
    Deletes all application data from the database excluding admin account(s).
    Returns a dictionary summarizing the actions taken.
    """
    if not db_url:
        try:
            from config import settings
            db_url = getattr(settings, "database_url", None)
        except Exception:
            pass

    if not db_url:
        find_and_load_env()
        db_url = os.environ.get("DATABASE_URL")

    if not db_url:
        raise ValueError("DATABASE_URL not found in settings or environment variables.")

    db = DBClient(db_url)

    try:
        if not db.table_exists("users"):
            raise RuntimeError("'users' table not found in the database. Schema might not be initialized.")

        # 1. Identify Admin Accounts
        _, admin_rows = db.execute(
            "SELECT id, name, email, role FROM users WHERE role = 'admin' OR email = 'admin@hackmate.com'"
        )

        if not admin_rows:
            raise RuntimeError("No admin accounts found in the database! Aborting to prevent full lockout.")

        admin_ids = [row[0] for row in admin_rows]
        admin_ids_str = ", ".join(str(i) for i in admin_ids)

        # 2. Tables to clear (in reverse foreign-key order)
        tables_to_clear = [
            "submissions",
            "scores",
            "mentor_recommendations",
            "support_messages",
            "chatbot_logs",
            "activity_logs",
            "team_skill_requirements",
            "team_invitations",
            "join_requests",
            "team_members",
            "teams",
            "github_repositories",
            "user_notifications",
            "notifications",
            "notification_logs",
            "push_subscriptions",
            "mentor_assignments",
            "volunteer_assignments",
            "posts",
        ]

        if DELETE_LOOKUP_TABLES:
            tables_to_clear.extend([
                "submission_settings",
                "mentoring_rounds",
                "rooms",
                "floors",
                "skills",
                "themes",
                "system_settings",
            ])

        deleted_counts = {}

        for table in tables_to_clear:
            if db.table_exists(table):
                count, _ = db.execute(f"DELETE FROM {table}")
                deleted_counts[table] = max(0, count)
            else:
                deleted_counts[table] = 0

        # 3. Clear non-admin user associations
        if db.table_exists("user_skills"):
            count, _ = db.execute(
                f"DELETE FROM user_skills WHERE user_id NOT IN ({admin_ids_str})"
            )
            deleted_counts["user_skills"] = max(0, count)

        if db.table_exists("notification_preferences"):
            count, _ = db.execute(
                f"DELETE FROM notification_preferences WHERE user_id NOT IN ({admin_ids_str})"
            )
            deleted_counts["notification_preferences"] = max(0, count)

        # 4. Delete all non-admin users
        count, _ = db.execute(
            f"DELETE FROM users WHERE id NOT IN ({admin_ids_str})"
        )
        deleted_counts["users (non-admin)"] = max(0, count)

        # Commit changes
        db.commit()

        preserved_admins = [
            {"id": row[0], "name": row[1], "email": row[2], "role": row[3]}
            for row in admin_rows
        ]

        total_rows = sum(deleted_counts.values())

        return {
            "success": True,
            "message": f"Successfully deleted {total_rows} records. {len(preserved_admins)} admin account(s) preserved.",
            "admins_preserved": preserved_admins,
            "deleted_counts": deleted_counts,
            "total_deleted": total_rows,
        }

    finally:
        db.close()


if __name__ == "__main__":
    try:
        print("[+] Starting database deletion script...")
        res = delete_database_data()
        print("\n" + "=" * 55)
        print(f"[SUCCESS] {res['message']}")
        print(f"Preserved admin account(s): {len(res['admins_preserved'])}")
        for a in res["admins_preserved"]:
            print(f"  - ID: {a['id']} | {a['name']} ({a['email']})")
        print("\nDeleted record summary:")
        for table, count in res["deleted_counts"].items():
            if count > 0:
                print(f"  - {table}: {count}")
        print("=" * 55)
    except Exception as e:
        print(f"\n[ERROR] {e}")
        sys.exit(1)
