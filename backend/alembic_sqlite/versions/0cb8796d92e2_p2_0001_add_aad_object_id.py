"""p2_0001_add_aad_object_id

Revision ID: 0cb8796d92e2
Revises: 12d214e3548e
Create Date: 2026-09-14 16:34:03.886088

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0cb8796d92e2'
down_revision: Union[str, Sequence[str], None] = '12d214e3548e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('users') as batch_op:
        batch_op.add_column(sa.Column('aad_object_id', sa.Uuid(), nullable=True))
        batch_op.create_unique_constraint('uq_users_aad_object_id', ['aad_object_id'])


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_constraint('uq_users_aad_object_id', type_='unique')
        batch_op.drop_column('aad_object_id')
