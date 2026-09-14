"""p2_0001_add_aad_object_id

Revision ID: 462b8014b0cc
Revises: 9db8f16f657b
Create Date: 2026-09-14 16:29:18.387483

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '462b8014b0cc'
down_revision: Union[str, Sequence[str], None] = '9db8f16f657b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('aad_object_id', sa.Uuid(), nullable=True))
    op.create_unique_constraint('uq_users_aad_object_id', 'users', ['aad_object_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('uq_users_aad_object_id', 'users', type_='unique')
    op.drop_column('users', 'aad_object_id')
