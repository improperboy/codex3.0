"""Add ppt_link column to submissions

Revision ID: 007
Revises: 006
Create Date: 2026-10-13
"""
from alembic import op
import sqlalchemy as sa

revision = '007'
down_revision = '006'
branch_labels = None
depends_on = None


def upgrade():
    op.execute(sa.text("ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ppt_link VARCHAR(500)"))


def downgrade():
    op.execute(sa.text("ALTER TABLE submissions DROP COLUMN IF EXISTS ppt_link"))
