"""Add 'expired' value to invitation_status enum

Revision ID: 006_add_expired_invitation_status
Revises: 005_add_draft_team_status
Create Date: 2026-09-03
"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade():
    # Add 'expired' to the invitation_status enum if it doesn't already exist.
    # PostgreSQL requires ALTER TYPE ... ADD VALUE to run outside a transaction.
    op.execute("COMMIT")
    op.execute("ALTER TYPE invitation_status ADD VALUE IF NOT EXISTS 'expired'")


def downgrade():
    # Enum values cannot be removed in PostgreSQL without recreating the type.
    # Removing is destructive and not typically done in downgrade paths.
    pass
