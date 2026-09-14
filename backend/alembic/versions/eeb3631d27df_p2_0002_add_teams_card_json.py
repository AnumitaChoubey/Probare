"""p2_0002_add_teams_card_json

Revision ID: eeb3631d27df
Revises: 462b8014b0cc
Create Date: 2026-09-14 20:25:11.321914

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'eeb3631d27df'
down_revision: Union[str, Sequence[str], None] = '462b8014b0cc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('notification_templates', sa.Column('teams_card_json', sa.JSON(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('notification_templates', 'teams_card_json')
