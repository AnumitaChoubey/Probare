from .provider import AIProvider, AIAnalysisRequest, AIAnalysisResult, AIUsageMetadata
import time

class MockAIProvider(AIProvider):
    """
    Deterministic fake AI provider for safe local development and testing.
    Never attempts external network requests.
    """
    def __init__(self, should_fail: bool = False, delay_ms: int = 100):
        self.should_fail = should_fail
        self.delay_ms = delay_ms

    async def analyze(self, request: AIAnalysisRequest) -> AIAnalysisResult:
        # Simulate network/processing delay
        if self.delay_ms > 0:
            import asyncio
            await asyncio.sleep(self.delay_ms / 1000.0)

        if self.should_fail:
            return AIAnalysisResult(
                structured_output={},
                provider="mock",
                model="mock-deterministic",
                error_info="Mock provider simulated failure",
                usage=AIUsageMetadata(duration_ms=self.delay_ms)
            )

        # Deterministic dummy responses based on analysis type
        output = {"status": "analyzed", "type": request.analysis_type}
        rationale = "This is a deterministic mock rationale."
        confidence = "HIGH"

        if request.analysis_type == "classification":
            output["suggested_severity"] = "Medium"
            output["suggested_category"] = "Documentation"
            rationale = "Based on keywords, this appears to be a documentation issue."
        
        return AIAnalysisResult(
            structured_output=output,
            confidence=confidence,
            rationale=rationale,
            provider="mock",
            model="mock-deterministic",
            usage=AIUsageMetadata(
                input_tokens=150,
                output_tokens=50,
                duration_ms=self.delay_ms,
                estimated_cost="0.0001"
            )
        )
