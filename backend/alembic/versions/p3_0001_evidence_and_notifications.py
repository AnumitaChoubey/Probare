"""p3_0001_evidence_and_notifications

Revision ID: p3_0001
Revises: 
Create Date: 2026-08-07

"""
from alembic import op
import sqlalchemy as sa

revision = 'p3_0001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'evidence_files',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('error_id', sa.String(length=36), nullable=True),
        sa.Column('uploaded_by_user_id', sa.String(length=36), nullable=False),
        sa.Column('stage', sa.String(length=50), nullable=False),
        sa.Column('file_name', sa.String(length=255), nullable=False),
        sa.Column('file_type', sa.String(length=100), nullable=False),
        sa.Column('file_size_bytes', sa.BigInteger(), nullable=False),
        sa.Column('storage_uri', sa.String(length=500), nullable=False),
        sa.Column('checksum_sha256', sa.String(length=64), nullable=False),
        sa.Column('malware_scan_status', sa.String(length=20), nullable=False, server_default='PENDING'),
        sa.Column('is_current_version', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('supersedes_evidence_id', sa.String(length=36), nullable=True),
        sa.Column('uploaded_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['supersedes_evidence_id'], ['evidence_files.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint("stage IN ('ORIGINAL_LOGGING', 'REBUTTAL', 'DECISION')", name='chk_evidence_stage'),
        sa.CheckConstraint("malware_scan_status IN ('PENDING', 'CLEAN', 'INFECTED', 'FAILED')", name='chk_malware_status')
    )
    op.create_index(op.f('ix_evidence_files_error_id'), 'evidence_files', ['error_id'], unique=False)

    op.create_table(
        'evidence_access_log',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('evidence_id', sa.String(length=36), nullable=False),
        sa.Column('accessed_by_user_id', sa.String(length=36), nullable=False),
        sa.Column('action', sa.String(length=20), nullable=False),
        sa.Column('accessed_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['evidence_id'], ['evidence_files.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint("action IN ('VIEW', 'DOWNLOAD')", name='chk_access_action')
    )

    op.create_table(
        'notification_templates',
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('subject_template', sa.String(length=255), nullable=False),
        sa.Column('body_template', sa.Text(), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.PrimaryKeyConstraint('code')
    )

    op.create_table(
        'notifications_log',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('error_id', sa.String(length=36), nullable=True),
        sa.Column('template_code', sa.String(length=50), nullable=False),
        sa.Column('channel', sa.String(length=50), nullable=False, server_default='EMAIL'),
        sa.Column('recipient_user_id', sa.String(length=36), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='QUEUED'),
        sa.Column('failure_reason', sa.Text(), nullable=True),
        sa.Column('dispatched_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['template_code'], ['notification_templates.code'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint("status IN ('QUEUED', 'SENT', 'DELIVERED', 'BOUNCED', 'FAILED')", name='chk_notif_status')
    )

    op.create_table(
        'in_app_notifications',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('error_id', sa.String(length=36), nullable=True),
        sa.Column('template_code', sa.String(length=50), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_in_app_notifications_user_id'), 'in_app_notifications', ['user_id'], unique=False)

def downgrade():
    op.drop_index(op.f('ix_in_app_notifications_user_id'), table_name='in_app_notifications')
    op.drop_table('in_app_notifications')
    op.drop_table('notifications_log')
    op.drop_table('notification_templates')
    op.drop_table('evidence_access_log')
    op.drop_index(op.f('ix_evidence_files_error_id'), table_name='evidence_files')
    op.drop_table('evidence_files')
