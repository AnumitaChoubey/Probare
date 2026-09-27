"""phase_g_indexes

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-09-27 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f6a7b8c9d0e1'
down_revision: Union[str, None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Scale/perf pass: add compound indexes for common queries
    
    # 1. Cursor pagination and general list fetching
    op.create_index(
        'ix_quality_events_tenant_project_created_at',
        'quality_events',
        ['tenant_id', 'project_id', 'created_at']
    )
    
    # 2. Workspace queries (assigned_to_me + awaiting_review)
    op.create_index(
        'ix_quality_events_owner_status',
        'quality_events',
        ['owner_id', 'status']
    )
    
    # 3. Data Scope filtering support (frequent joins)
    op.create_index(
        'ix_quality_events_tenant_department',
        'quality_events',
        ['tenant_id', 'process_id']
    )

def downgrade() -> None:
    op.drop_index('ix_quality_events_tenant_department', table_name='quality_events')
    op.drop_index('ix_quality_events_owner_status', table_name='quality_events')
    op.drop_index('ix_quality_events_tenant_project_created_at', table_name='quality_events')
