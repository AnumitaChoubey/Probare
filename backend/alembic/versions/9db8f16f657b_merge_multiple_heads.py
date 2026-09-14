"""Merge multiple heads

Revision ID: 9db8f16f657b
Revises: 3f8383824e1d, 9627c947f968
Create Date: 2026-09-14 16:28:20.569741

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9db8f16f657b'
down_revision: Union[str, Sequence[str], None] = ('3f8383824e1d', '9627c947f968')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
