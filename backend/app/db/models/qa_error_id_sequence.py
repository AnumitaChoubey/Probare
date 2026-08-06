from sqlalchemy import Column, String, Integer, BigInteger
from app.db.base_class import Base

class QaErrorIdSequence(Base):
    __tablename__ = "qa_error_id_sequences"
    
    # We will use string PK like "BILL-2026"
    lob_year_key = Column(String, primary_key=True)
    current_value = Column(BigInteger, default=0, nullable=False)
