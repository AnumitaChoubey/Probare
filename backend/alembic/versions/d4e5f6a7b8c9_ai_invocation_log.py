"""ai_invocation_log_and_capability_flags

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-09-26 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Add per-capability flags and cost caps to ai_model_configurations
    op.add_column('ai_model_configurations',
        sa.Column('capability_flags', postgresql.JSONB(astext_type=sa.Text()), server_default='{}', nullable=False)
    )
    op.add_column('ai_model_configurations',
        sa.Column('capability_caps', postgresql.JSONB(astext_type=sa.Text()), server_default='{}', nullable=False)
    )

    # Create immutable AI invocation log table (spec Section 11.3)
    op.create_table('ai_invocation_logs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('tenant_id', sa.String(length=36), nullable=True),
        sa.Column('capability', sa.String(length=100), nullable=False),
        sa.Column('provider', sa.String(length=100), nullable=False),
        sa.Column('entity_type', sa.String(length=100), nullable=True),
        sa.Column('entity_id', sa.String(length=36), nullable=True),
        sa.Column('prompt_hash', sa.String(length=64), nullable=False),
        sa.Column('response_summary', sa.String(), nullable=False),
        sa.Column('accepted_by_user', sa.Boolean(), nullable=True),
        sa.Column('tokens_used', sa.Integer(), nullable=True),
        sa.Column('cost_estimate', sa.String(length=30), nullable=True),
        sa.Column('invoked_by', sa.String(length=36), nullable=True),
        sa.ForeignKeyConstraint(['invoked_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], name='fk_ai_invocation_logs_tenant_id', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_ai_invocation_logs_capability', 'ai_invocation_logs', ['capability'])
    op.create_index('ix_ai_invocation_logs_entity_id', 'ai_invocation_logs', ['entity_id'])

def downgrade() -> None:
    op.drop_table('ai_invocation_logs')
    op.drop_column('ai_model_configurations', 'capability_caps')
    op.drop_column('ai_model_configurations', 'capability_flags')
