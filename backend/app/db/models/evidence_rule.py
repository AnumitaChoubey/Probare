from sqlalchemy import Column, Integer, JSON
from app.db.base_class import Base

class EvidenceRule(Base):
    __tablename__ = "evidence_rules"

    # Single row configuration pattern
    id = Column(Integer, primary_key=True, default=1)
    
    max_file_size_bytes = Column(Integer, nullable=False, default=26214400) # 25MB
    max_file_count_per_error = Column(Integer, nullable=False, default=10)
    allowed_file_types = Column(JSON, nullable=False, default=lambda: [
        "image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif",
        "application/pdf", "text/plain", "text/csv",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ])
