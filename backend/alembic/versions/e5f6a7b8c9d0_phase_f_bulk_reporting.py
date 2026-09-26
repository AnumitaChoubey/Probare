"""phase_f_bulk_and_reporting

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-09-27 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # ----------------------------------------------------------------
    # Bulk Operation Jobs
    # ----------------------------------------------------------------
    op.create_table(
        'bulk_operation_jobs',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('tenant_id', sa.String(36), nullable=True),
        sa.Column('project_id', sa.String(36), nullable=True),
        sa.Column('operation_type', sa.String(50), nullable=False),
        sa.Column('submitted_by', sa.String(36), nullable=False),
        sa.Column('filter_criteria', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('operation_payload', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('total_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('processed_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('success_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('failure_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('status', sa.String(50), server_default='pending', nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('export_storage_key', sa.String(1024), nullable=True),
        sa.ForeignKeyConstraint(['submitted_by'], ['users.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_bulk_operation_jobs_operation_type', 'bulk_operation_jobs', ['operation_type'])
    op.create_index('ix_bulk_operation_jobs_project_id', 'bulk_operation_jobs', ['project_id'])

    # ----------------------------------------------------------------
    # Bulk Operation Items (per-entity result rows)
    # ----------------------------------------------------------------
    op.create_table(
        'bulk_operation_items',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('tenant_id', sa.String(36), nullable=True),
        sa.Column('job_id', sa.String(36), nullable=False),
        sa.Column('entity_id', sa.String(36), nullable=False),
        sa.Column('entity_type', sa.String(50), server_default='quality_error', nullable=False),
        sa.Column('success', sa.Boolean(), nullable=False),
        sa.Column('error_detail', sa.String(), nullable=True),
        sa.Column('old_value', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('new_value', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(['job_id'], ['bulk_operation_jobs.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_bulk_operation_items_job_id', 'bulk_operation_items', ['job_id'])
    op.create_index('ix_bulk_operation_items_entity_id', 'bulk_operation_items', ['entity_id'])

    # ----------------------------------------------------------------
    # Report Templates
    # ----------------------------------------------------------------
    op.create_table(
        'report_templates',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('tenant_id', sa.String(36), nullable=True),
        sa.Column('project_id', sa.String(36), nullable=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('report_type', sa.String(100), nullable=False),
        sa.Column('columns', postgresql.ARRAY(sa.String()), nullable=False),
        sa.Column('filters', postgresql.JSONB(astext_type=sa.Text()), server_default='{}', nullable=False),
        sa.Column('group_by', sa.String(50), nullable=True),
        sa.Column('cron_schedule', sa.String(50), nullable=True),
        sa.Column('recipients', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('created_by', sa.String(36), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_report_templates_project_id', 'report_templates', ['project_id'])

    # ----------------------------------------------------------------
    # Report Runs
    # ----------------------------------------------------------------
    op.create_table(
        'report_runs',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('tenant_id', sa.String(36), nullable=True),
        sa.Column('template_id', sa.String(36), nullable=False),
        sa.Column('triggered_by', sa.String(36), nullable=True),
        sa.Column('trigger_type', sa.String(50), server_default='manual', nullable=False),
        sa.Column('status', sa.String(50), server_default='pending', nullable=False),
        sa.Column('date_range_from', sa.DateTime(timezone=True), nullable=True),
        sa.Column('date_range_to', sa.DateTime(timezone=True), nullable=True),
        sa.Column('row_count', sa.Integer(), nullable=True),
        sa.Column('export_format', sa.String(20), server_default='csv', nullable=False),
        sa.Column('storage_key', sa.String(1024), nullable=True),
        sa.Column('error_detail', sa.String(), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['template_id'], ['report_templates.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['triggered_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_report_runs_template_id', 'report_runs', ['template_id'])

def downgrade() -> None:
    op.drop_table('report_runs')
    op.drop_table('report_templates')
    op.drop_table('bulk_operation_items')
    op.drop_table('bulk_operation_jobs')
