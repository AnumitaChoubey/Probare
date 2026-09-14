"""p3_0001_add_ai_tables

Revision ID: a2788a377809
Revises: eeb3631d27df
Create Date: 2026-09-14 22:16:56.945246

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a2788a377809'
down_revision: Union[str, Sequence[str], None] = 'eeb3631d27df'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector;")

    # 2. Create error_embeddings table
    op.create_table(
        'error_embeddings',
        sa.Column('error_id', sa.Uuid(), nullable=False),
        sa.Column('embedding', sa.TEXT(), nullable=False), # Wait, alembic raw SQL type for vector might be tricky. Let's use sa.String for downgrade/upgrade? No, let's use op.execute
        sa.Column('computed_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['error_id'], ['errors.id'], ),
        sa.PrimaryKeyConstraint('error_id')
    )
    # Convert embedding column to vector(1536) explicitly
    op.execute("ALTER TABLE error_embeddings ALTER COLUMN embedding TYPE vector(1536) USING embedding::vector")

    # 3. Create ai_suggestions_log table
    op.create_table(
        'ai_suggestions_log',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('error_id', sa.Uuid(), nullable=True),
        sa.Column('suggestion_type', sa.String(length=50), nullable=False),
        sa.Column('suggested_value', sa.JSON(), nullable=False),
        sa.Column('was_accepted', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['error_id'], ['errors.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

def downgrade() -> None:
    op.drop_table('ai_suggestions_log')
    op.drop_table('error_embeddings')
    op.execute("DROP EXTENSION IF EXISTS vector;")
