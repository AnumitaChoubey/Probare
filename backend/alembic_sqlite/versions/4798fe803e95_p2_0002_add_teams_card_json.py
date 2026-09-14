"""p2_0002_add_teams_card_json

Revision ID: 4798fe803e95
Revises: 0cb8796d92e2
Create Date: 2026-09-14 20:26:05.630259

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4798fe803e95'
down_revision: Union[str, Sequence[str], None] = '0cb8796d92e2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('notification_templates') as batch_op:
        batch_op.add_column(sa.Column('teams_card_json', sa.JSON(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('notification_templates') as batch_op:
        batch_op.drop_column('teams_card_json')
