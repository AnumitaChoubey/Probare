from .provider import AIProvider, AIAnalysisRequest, AIAnalysisResult, AIUsageMetadata
from app.core.config import settings
import httpx
import time
from loguru import logger
import json

class GeminiProvider(AIProvider):
    """
    Integration with Google Gemini via REST API.
    """
    def __init__(self):
        self.api_key = settings.AI_API_KEY
        if not self.api_key:
            logger.warning("Gemini API key is not configured.")
        
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models"

    async def analyze(self, request: AIAnalysisRequest) -> AIAnalysisResult:
        if not self.api_key:
            return AIAnalysisResult(
                structured_output={},
                provider="gemini",
                model="unknown",
                error_info="Gemini API key is missing. Analysis failed."
            )

        model = request.model_config_override.get('model', 'gemini-1.5-pro-latest') if request.model_config_override else 'gemini-1.5-pro-latest'
        url = f"{self.base_url}/{model}:generateContent?key={self.api_key}"

        # Construct prompt from structured_input
        prompt = f"Perform analysis of type: {request.analysis_type}\n\n"
        prompt += f"Context:\n{json.dumps(request.structured_input, indent=2)}\n\n"
        if request.constraints:
            prompt += f"Constraints:\n{json.dumps(request.constraints, indent=2)}\n\n"
        
        prompt += "Please provide a JSON response summarizing your findings, rationale, and confidence level (HIGH/MEDIUM/LOW)."

        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        }

        start_time = time.time()
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, timeout=30.0)
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"Gemini API returned status {e.response.status_code}: {e.response.text}")
            return AIAnalysisResult(
                structured_output={},
                provider="gemini",
                model=model,
                error_info=f"HTTPStatusError: {e.response.status_code}"
            )
        except Exception as e:
            logger.error(f"Failed to communicate with Gemini API: {e}")
            return AIAnalysisResult(
                structured_output={},
                provider="gemini",
                model=model,
                error_info=f"Exception: {str(e)}"
            )
            
        duration_ms = int((time.time() - start_time) * 1000)

        # Parse output
        try:
            candidates = data.get("candidates", [])
            if not candidates:
                raise ValueError("No candidates returned from Gemini")
            
            text_response = candidates[0]["content"]["parts"][0]["text"]
            structured_output = json.loads(text_response)
            
            usage_metadata = data.get("usageMetadata", {})
            input_tokens = usage_metadata.get("promptTokenCount", 0)
            output_tokens = usage_metadata.get("candidatesTokenCount", 0)
            
            confidence = structured_output.pop("confidence", "UNKNOWN")
            rationale = structured_output.pop("rationale", "No rationale provided by model.")

            return AIAnalysisResult(
                structured_output=structured_output,
                confidence=confidence,
                rationale=rationale,
                provider="gemini",
                model=model,
                usage=AIUsageMetadata(
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                    duration_ms=duration_ms,
                    estimated_cost="0.00" # Pricing logic can be added later
                )
            )

        except Exception as e:
            logger.error(f"Failed to parse Gemini API response: {e}")
            return AIAnalysisResult(
                structured_output={},
                provider="gemini",
                model=model,
                error_info=f"Parse Error: {str(e)}"
            )
