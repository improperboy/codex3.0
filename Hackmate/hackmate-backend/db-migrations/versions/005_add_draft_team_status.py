"""Add 'draft' to team_status enum and update default

Revision ID: 005
Revises: 004
Create Date: 2026-09-02
"""
from alembic import op
import sqlalchemy as sa

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # PostgreSQL requires ALTER TYPE ... ADD VALUE to run outside any open transaction,
    # because the new enum value cannot be used until after its defining transaction commits.
    # We access the raw DBAPI connection and set autocommit to run the DDL standalone,
    # then restore autocommit to False so the rest of the migration runs normally.
    bind = op.get_bind()
    dbapi_conn = bind.connection.dbapi_connection

    # Commit any pending transaction on the raw connection first.
    dbapi_conn.commit()
    old_autocommit = dbapi_conn.autocommit
    dbapi_conn.autocommit = True
    try:
        cursor = dbapi_conn.cursor()
        cursor.execute("ALTER TYPE team_status ADD VALUE IF NOT EXISTS 'draft' BEFORE 'pending'")
        cursor.close()
    finally:
        dbapi_conn.autocommit = old_autocommit

    # Change the column default so newly created teams start as 'draft'.
    # At this point the enum value is committed and safe to reference.
    op.execute("ALTER TABLE teams ALTER COLUMN status SET DEFAULT 'draft'")

    # Move all existing 'pending' teams (not yet approved/rejected by admin) back to 'draft'
    # so they go through the new explicit approval-request flow.
    op.execute("UPDATE teams SET status = 'draft' WHERE status = 'pending'")


def downgrade() -> None:
    # Revert the column default
    op.execute("ALTER TABLE teams ALTER COLUMN status SET DEFAULT 'pending'")

    # Move any draft teams back to pending before removing the enum value
    op.execute("UPDATE teams SET status = 'pending' WHERE status = 'draft'")

    # PostgreSQL does not support DROP VALUE from an enum natively.
    # We recreate the type without 'draft'.
    op.execute("""
        ALTER TABLE teams
            ALTER COLUMN status TYPE varchar(20)
    """)
    op.execute("DROP TYPE IF EXISTS team_status")
    op.execute("""
        CREATE TYPE team_status AS ENUM ('pending', 'approved', 'rejected')
    """)
    op.execute("""
        ALTER TABLE teams
            ALTER COLUMN status TYPE team_status USING status::team_status
    """)
    op.execute("ALTER TABLE teams ALTER COLUMN status SET DEFAULT 'pending'")
