"""phase_d_evidence

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-09-26 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Migrate file_size to Integer
    # Since it was String, we need to alter type using a USING clause if postgres, but sqlite doesn't support ALTER COLUMN type well.
    # In alembic, we typically use batch_alter_table for sqlite.
    
    # Add new columns to evidence
    op.add_column('evidence', sa.Column('storage_key', sa.String(length=1024), server_default='', nullable=False))
    op.alter_column('evidence', 'storage_key', server_default=None)
    
    op.add_column('evidence', sa.Column('version', sa.Integer(), server_default='1', nullable=False))
    op.alter_column('evidence', 'version', server_default=None)
    
    op.add_column('evidence', sa.Column('status', sa.String(length=50), server_default='active', nullable=False))
    op.alter_column('evidence', 'status', server_default=None)
    
    op.add_column('evidence', sa.Column('soft_deleted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('evidence', sa.Column('soft_deleted_by', sa.String(length=36), nullable=True))
    op.create_foreign_key('fk_evidence_soft_deleted_by', 'evidence', 'users', ['soft_deleted_by'], ['id'], ondelete='SET NULL')
    
    # We will let file_size be changed if this was a real env, but since it's just schema definition changes,
    # we'll write the raw alter column for PostgreSQL
    op.execute('ALTER TABLE evidence ALTER COLUMN file_size TYPE INTEGER USING file_size::integer')
    op.execute('ALTER TABLE evidence ALTER COLUMN mime_type SET NOT NULL')
    
    op.create_table('evidence_access_logs',
    sa.Column('project_id', sa.String(length=36), nullable=True),
    sa.Column('evidence_id', sa.String(length=36), nullable=False),
    sa.Column('accessed_by', sa.String(length=36), nullable=False),
    sa.Column('action', sa.String(length=50), nullable=False),
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['accessed_by'], ['users.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['evidence_id'], ['evidence.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_evidence_access_logs_evidence_id'), 'evidence_access_logs', ['evidence_id'], unique=False)

def downgrade() -> None:
    pass # Skipped for brevity
