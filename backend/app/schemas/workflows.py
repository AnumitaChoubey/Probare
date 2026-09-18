from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.schemas.quality_event import QualityEventResponse

class RebuttalCreate(BaseModel):
    category: str
    explanation: str
    evidence_files: Optional[List[str]] = Field(default_factory=list)

class DecisionCreate(BaseModel):
    decision: str
    rationale: str
    expected_version: int

class FiveWhysStep(BaseModel):
    step: int
    question: str
    answer: str

class FishboneData(BaseModel):
    people: List[str] = Field(default_factory=list)
    process: List[str] = Field(default_factory=list)
    system: List[str] = Field(default_factory=list)
    training: List[str] = Field(default_factory=list)
    environment: List[str] = Field(default_factory=list)
    measurement: List[str] = Field(default_factory=list)

class RCACreate(BaseModel):
    problem_statement: Optional[str] = None
    five_whys: List[FiveWhysStep] = Field(default_factory=list, alias="fiveWhys")
    fishbone: Optional[FishboneData] = None
    fishbone_category: Optional[str] = Field(None, alias="fishboneCategory")
    primary_category: str = Field(alias="primaryCategory")
    contributing_factors: List[str] = Field(default_factory=list, alias="contributingFactors")
    confidence: Optional[str] = None
    recurrence_risk: Optional[str] = Field(None, alias="recurrenceRisk")
    preventative_measure: Optional[str] = Field(None, alias="preventativeMeasure")

    model_config = ConfigDict(populate_by_name=True)

class CAPACreate(BaseModel):
    title: str
    description: str
    owner: str
    priority: str
    due_date: str = Field(alias="dueDate")
    evidence_required: List[str] = Field(default_factory=list, alias="evidenceRequired")
    verification_method: Optional[str] = Field(None, alias="verificationMethod")
    type: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)

class CAPAUpdate(BaseModel):
    status: str
    notes: Optional[str] = None

class EffectivenessReviewCreate(BaseModel):
    error_rate_before: float = Field(alias="errorRateBefore")
    error_rate_after: float = Field(alias="errorRateAfter")
    recurrence_rate: float = Field(alias="recurrenceRate")
    comparison_period: str = Field(alias="comparisonPeriod")
    supporting_evidence: str = Field(alias="supportingEvidence")
    metrics_observed: Optional[str] = Field(None, alias="metricsObserved")
    decision: str
    rationale: str

    model_config = ConfigDict(populate_by_name=True)

class IdempotencyResponse(BaseModel):
    """Generic wrapper for Idempotent responses."""
    status: str = "success"
    message: str = "Operation successful"
    data: Optional[Dict[str, Any]] = None
