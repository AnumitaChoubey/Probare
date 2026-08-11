"""Merge P3 and P4 heads

Revision ID: b84266bcd803
Revises: c19cfc2e888a, p3_0001
Create Date: 2026-08-08 11:02:19.623416

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b84266bcd803'
down_revision: Union[str, Sequence[str], None] = ('c19cfc2e888a', 'p3_0001')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
