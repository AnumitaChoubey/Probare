from sqlalchemy import Column, String, Integer, Uuid, Boolean, Float, Text, Date, DateTime, BigInteger, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector
import uuid
from datetime import datetime

from app.db.base_class import Base, utc_now

class ErrorEmbedding(Base):
    __tablename__ = "error_embeddings"

    error_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("errors.id"), primary_key=True)
    # Using 1536 dimensions for standard Azure OpenAI text-embedding-3-small or text-embedding-ada-002
    embedding = mapped_column(Vector(1536), nullable=False)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class AISuggestionLog(Base):
    __tablename__ = "ai_suggestions_log"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    error_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("errors.id"), nullable=True)
    suggestion_type: Mapped[str] = mapped_column(String(50), nullable=False) # CLASSIFICATION / DUPLICATE / ANOMALY
    suggested_value: Mapped[dict] = mapped_column(JSON, nullable=False)
    was_accepted: Mapped[bool] = mapped_column(Boolean, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
