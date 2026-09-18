from pydantic import BaseModel, ConfigDict, Field
from typing import Dict, Any, Optional
from abc import ABC, abstractmethod

class AIAnalysisRequest(BaseModel):
    analysis_type: str = Field(..., description="e.g., 'classification_suggestion', 'rca_extraction'")
    tenant_id: str
    project_id: str
    quality_event_id: str
    event_version: int
    structured_input: Dict[str, Any] = Field(default_factory=dict, description="Contextual data to feed to the LLM")
    model_config_override: Optional[Dict[str, Any]] = None
    constraints: Optional[Dict[str, Any]] = None

class AIUsageMetadata(BaseModel):
    input_tokens: int = 0
    output_tokens: int = 0
    duration_ms: int = 0
    estimated_cost: str = "0.00"

class AIAnalysisResult(BaseModel):
    structured_output: Dict[str, Any]
    confidence: Optional[str] = None
    rationale: Optional[str] = None
    provider: str
    model: str
    usage: AIUsageMetadata = Field(default_factory=AIUsageMetadata)
    error_info: Optional[str] = None

class AIProvider(ABC):
    """
    Abstract base class for all AI providers to ensure a consistent, provider-agnostic interface.
    """
    
    @abstractmethod
    async def analyze(self, request: AIAnalysisRequest) -> AIAnalysisResult:
        """
        Execute an AI analysis based on the strongly-typed request contract.
        
        Args:
            request: The context, type, and inputs for the analysis.
            
        Returns:
            The structured analysis result, including usage metrics.
        """
        pass
