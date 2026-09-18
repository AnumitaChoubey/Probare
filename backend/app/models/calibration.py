from sqlalchemy import Column, String, Float, Boolean, ForeignKey, DateTime, UniqueConstraint, ForeignKeyConstraint
from sqlalchemy.orm import relationship
from .base import Base, UUIDMixin, TimestampMixin, ProjectMixin

class CalibrationSession(Base, UUIDMixin, TimestampMixin, ProjectMixin):
    __tablename__ = "calibration_sessions"
    title = Column(String(255), nullable=False)
    scheduled_date = Column(DateTime(timezone=True), nullable=False)
    process_id = Column(String(36), nullable=False, index=True)
    status = Column(String(50), nullable=False, index=True)
    
    __table_args__ = (
        UniqueConstraint('project_id', 'id', name='uq_calibration_sessions_project_id'),
    )

class CalibrationCase(Base, UUIDMixin, TimestampMixin, ProjectMixin):
    __tablename__ = "calibration_cases"
    session_id = Column(String(36), nullable=False, index=True)
    quality_event_id = Column(String(36), nullable=False)
    
    __table_args__ = (
        UniqueConstraint('project_id', 'id', name='uq_calibration_cases_project_id'),
        ForeignKeyConstraint(
            ['project_id', 'session_id'],
            ['calibration_sessions.project_id', 'calibration_sessions.id'],
            ondelete='CASCADE'
        ),
    )

class CalibrationParticipant(Base, UUIDMixin, TimestampMixin, ProjectMixin):
    __tablename__ = "calibration_participants"
    session_id = Column(String(36), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)
    
    __table_args__ = (
        UniqueConstraint('project_id', 'id', name='uq_calibration_participants_project_id'),
        ForeignKeyConstraint(
            ['project_id', 'session_id'],
            ['calibration_sessions.project_id', 'calibration_sessions.id'],
            ondelete='CASCADE'
        ),
    )

class CalibrationEvaluation(Base, UUIDMixin, TimestampMixin, ProjectMixin):
    __tablename__ = "calibration_evaluations"
    participant_id = Column(String(36), nullable=False, index=True)
    case_id = Column(String(36), nullable=False)
    score = Column(Float, nullable=True)
    notes = Column(String, nullable=True)
    submitted = Column(Boolean, nullable=False, default=False)
    
    __table_args__ = (
        ForeignKeyConstraint(
            ['project_id', 'participant_id'],
            ['calibration_participants.project_id', 'calibration_participants.id'],
            ondelete='CASCADE'
        ),
        ForeignKeyConstraint(
            ['project_id', 'case_id'],
            ['calibration_cases.project_id', 'calibration_cases.id'],
            ondelete='CASCADE'
        ),
    )

class CalibrationVariance(Base, UUIDMixin, TimestampMixin, ProjectMixin):
    __tablename__ = "calibration_variances"
    case_id = Column(String(36), nullable=False, unique=True)
    score_variance = Column(Float, nullable=True)
    final_calibrated_score = Column(Float, nullable=True)
    decision_rationale = Column(String, nullable=True)

    __table_args__ = (
        ForeignKeyConstraint(
            ['project_id', 'case_id'],
            ['calibration_cases.project_id', 'calibration_cases.id'],
            ondelete='CASCADE'
        ),
    )
