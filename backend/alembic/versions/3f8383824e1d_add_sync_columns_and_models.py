"""Add sync columns and models

Revision ID: 3f8383824e1d
Revises: 059450b37306_p1_0002_create_core_error_tables
Create Date: 2026-09-13 23:30:44.821102

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3f8383824e1d'
down_revision: Union[str, None] = '059450b37306'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create new Sync Tables
    op.create_table('projects',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('code', sa.String(length=20), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code')
    )
    op.create_table('devices',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('device_name', sa.String(), nullable=False),
        sa.Column('registered_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_seen_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('app_version', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table('sync_cursor',
        sa.Column('device_id', sa.Uuid(), nullable=False),
        sa.Column('last_pulled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_pushed_seq', sa.BigInteger(), nullable=False),
        sa.ForeignKeyConstraint(['device_id'], ['devices.id'], ),
        sa.PrimaryKeyConstraint('device_id')
    )
    op.create_table('sync_queue',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('entity_type', sa.String(), nullable=False),
        sa.Column('local_id', sa.Uuid(), nullable=False),
        sa.Column('operation', sa.String(), nullable=False),
        sa.Column('payload_json', sa.Text(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    
    # 2. Add columns to Existing Syncable Tables
    tables_full_sync = ['errors', 'rebuttals', 'decisions', 'evidence_files', 'in_app_notifications']
    for t in tables_full_sync:
        op.add_column(t, sa.Column('local_id', sa.Uuid(), nullable=True))
        op.add_column(t, sa.Column('sync_status', sa.String(length=20), nullable=False, server_default='SYNCED'))
        op.add_column(t, sa.Column('updated_by_device_id', sa.Uuid(), nullable=True))
        op.add_column(t, sa.Column('version', sa.Integer(), nullable=False, server_default='1'))
        op.create_index(op.f(f'ix_{t}_local_id'), t, ['local_id'], unique=True)
        
    # Append-only tables
    tables_append_only = ['error_status_history']
    for t in tables_append_only:
        op.add_column(t, sa.Column('local_id', sa.Uuid(), nullable=True))
        op.create_index(op.f(f'ix_{t}_local_id'), t, ['local_id'], unique=True)


def downgrade() -> None:
    tables_append_only = ['error_status_history']
    for t in tables_append_only:
        op.drop_index(op.f(f'ix_{t}_local_id'), table_name=t)
        op.drop_column(t, 'local_id')

    tables_full_sync = ['errors', 'rebuttals', 'decisions', 'evidence_files', 'in_app_notifications']
    for t in tables_full_sync:
        op.drop_index(op.f(f'ix_{t}_local_id'), table_name=t)
        op.drop_column(t, 'version')
        op.drop_column(t, 'updated_by_device_id')
        op.drop_column(t, 'sync_status')
        op.drop_column(t, 'local_id')

    op.drop_table('sync_queue')
    op.drop_table('sync_cursor')
    op.drop_table('devices')
    op.drop_table('projects')
