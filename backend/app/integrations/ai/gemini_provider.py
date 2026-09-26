from .provider import AIProvider, AIAnalysisRequest, AIAnalysisResult, AIUsageMetadata
from app.core.config import settings
import httpx
import time
from loguru import logger
import json

# ---------------------------------------------------------------------------
# Per-capability prompt templates (spec Section 11.5)
# Each prompt is deterministic: same input always produces the same SHA-256 hash.
# ---------------------------------------------------------------------------
PROMPT_TEMPLATES: dict = {
    "duplicate_check": (
        "You are a quality analyst. Review the following quality event description and "
        "identify any potential duplicate quality events based on similar descriptions, "
        "root causes, or affected processes.\n\n"
        "Event description: {description}\n\n"
        "Return JSON: {{\"duplicates\": [{{\"event_id\": \"...\", \"similarity_score\": 0.0, \"reason\": \"...\"}}], "
        "\"summary\": \"...\", \"confidence\": \"HIGH|MEDIUM|LOW\", \"rationale\": \"...\"}}"
    ),
    "quality_event_classification": (
        "You are a quality management expert. Classify the following quality event.\n\n"
        "Description: {description}\nProcess Area: {process_area}\n\n"
        "Return JSON: {{\"errorType\": \"...\", \"sopId\": \"...\", \"suggestedTitle\": \"...\", "
        "\"expectedOutcome\": \"...\", \"actualOutcome\": \"...\", \"suggestedSeverity\": \"CRITICAL|HIGH|MEDIUM|LOW\", "
        "\"confidence\": \"HIGH|MEDIUM|LOW\", \"rationale\": \"...\"}}"
    ),
    "rebuttal_summarization": (
        "You are a quality reviewer. Summarize the following employee rebuttal in neutral, "
        "professional language for the QA decision-maker.\n\n"
        "Rebuttal: {rebuttal_text}\n\n"
        "Return JSON: {{\"summary\": \"...\", \"key_points\": [\"...\"], "
        "\"tone\": \"cooperative|neutral|adversarial\", "
        "\"confidence\": \"HIGH|MEDIUM|LOW\", \"rationale\": \"...\"}}"
    ),
    "evidence_summarization": (
        "You are a document analyst. Describe the likely content and relevance of this "
        "evidence file in the context of a quality event.\n\n"
        "File: {file_name} ({mime_type})\n\n"
        "Return JSON: {{\"summary\": \"...\", \"likely_content\": \"...\", "
        "\"relevance_to_quality\": \"high|medium|low\", "
        "\"confidence\": \"HIGH|MEDIUM|LOW\", \"rationale\": \"...\"}}"
    ),
    "rca_extraction": (
        "You are a root cause analysis expert (5-Whys and Fishbone). Suggest the most "
        "probable root cause for this quality event.\n\n"
        "Event context: {event_context}\n\n"
        "Return JSON: {{\"primary_cause\": \"...\", "
        "\"category\": \"Process|People|Equipment|Material|Environment|Method\", "
        "\"five_whys\": [\"...\"], \"contributing_factors\": [\"...\"], "
        "\"confidence\": \"HIGH|MEDIUM|LOW\", \"rationale\": \"...\"}}"
    ),
    "impact_assessment": (
        "You are a business risk analyst. Predict the business impact of this quality event.\n\n"
        "Event context: {event_context}\n\n"
        "Return JSON: {{\"risk_level\": \"CRITICAL|HIGH|MEDIUM|LOW\", "
        "\"financial_impact_estimate\": \"...\", \"regulatory_risk\": \"...\", "
        "\"reputational_risk\": \"...\", \"recommended_escalation\": false, "
        "\"confidence\": \"HIGH|MEDIUM|LOW\", \"rationale\": \"...\"}}"
    ),
    "trend_analysis": (
        "You are a quality systems analyst. Analyse trends in quality events.\n\n"
        "Scope: {scope}\n\n"
        "Return JSON: {{\"trend_summary\": \"...\", "
        "\"hotspots\": [{{\"area\": \"...\", \"count\": 0, \"trend\": \"increasing|stable|decreasing\"}}], "
        "\"recommendations\": [\"...\"], "
        "\"confidence\": \"HIGH|MEDIUM|LOW\", \"rationale\": \"...\"}}"
    ),
    "ask_qems": (
        "You are QEMS Copilot, a quality management assistant. "
        "Answer the user's question using the provided context.\n\n"
        "Question: {query}\nContext: {context}\n\n"
        "Return JSON: {{\"answer\": \"...\", \"sources\": [\"...\"], "
        "\"confidence\": \"HIGH|MEDIUM|LOW\", \"rationale\": \"...\"}}"
    ),
    "executive_report": (
        "You are a senior quality director. Draft an executive summary report "
        "on quality performance for the given scope.\n\n"
        "Scope: {scope}\n\n"
        "Return JSON: {{\"headline\": \"...\", \"key_metrics\": {{}}, "
        "\"top_issues\": [\"...\"], \"recommended_actions\": [\"...\"], "
        "\"draft_narrative\": \"...\", "
        "\"confidence\": \"HIGH|MEDIUM|LOW\", \"rationale\": \"...\"}}"
    ),
}

# Gemini 1.5 Flash approximate pricing per 1K tokens
_INPUT_COST_PER_1K = 0.000075
_OUTPUT_COST_PER_1K = 0.0003


def _build_prompt(request: AIAnalysisRequest) -> str:
    """Builds a deterministic, per-capability prompt from the request."""
    template = PROMPT_TEMPLATES.get(request.analysis_type)
    if template:
        try:
            return template.format(**request.structured_input)
        except KeyError:
            pass  # Fall through to generic if template keys don't match input keys
    # Generic fallback
    prompt = f"Perform analysis of type: {request.analysis_type}\n\nContext:\n"
    prompt += json.dumps(request.structured_input, indent=2)
    if request.constraints:
        prompt += f"\n\nConstraints:\n{json.dumps(request.constraints, indent=2)}"
    prompt += "\n\nReturn a JSON object with your findings, confidence (HIGH/MEDIUM/LOW), and rationale."
    return prompt


def _estimate_cost(input_tokens: int, output_tokens: int) -> str:
    cost = (input_tokens / 1000) * _INPUT_COST_PER_1K + (output_tokens / 1000) * _OUTPUT_COST_PER_1K
    return f"{cost:.6f}"


class GeminiProvider(AIProvider):
    """
    Integration with Google Gemini via REST API.
    Uses per-capability structured prompts and maps network errors to
    the offline availability state (spec Section 11.2).
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
                error_info="Gemini API key is missing. Set AI_API_KEY in backend/.env"
            )

        if not self.api_key.startswith("AIza"):
            logger.warning(f"AI_API_KEY prefix looks invalid: {self.api_key[:6]}...")
            return AIAnalysisResult(
                structured_output={},
                provider="gemini",
                model="unknown",
                error_info="Invalid Gemini API key format. Key should start with 'AIza'. Get one from https://aistudio.google.com/apikey"
            )

        model = (
            request.model_config_override.get("model", "gemini-1.5-flash")
            if request.model_config_override
            else "gemini-1.5-flash"
        )
        url = f"{self.base_url}/{model}:generateContent?key={self.api_key}"

        # Build a per-capability deterministic prompt
        prompt = _build_prompt(request)

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"responseMimeType": "application/json"},
        }

        start_time = time.time()
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, timeout=30.0)
                response.raise_for_status()
                data = response.json()
        except httpx.ConnectError:
            # Network unreachable — maps to "offline" state (spec Section 11.2)
            logger.warning("Gemini API unreachable — device may be offline")
            return AIAnalysisResult(
                structured_output={},
                provider="gemini",
                model=model,
                error_info="OFFLINE: Cannot reach AI provider. Working offline."
            )
        except httpx.HTTPStatusError as e:
            logger.error(f"Gemini API returned status {e.response.status_code}: {e.response.text}")
            return AIAnalysisResult(
                structured_output={},
                provider="gemini",
                model=model,
                error_info=f"HTTPStatusError: {e.response.status_code}"
            )
        except Exception as e:
            logger.error(f"Unexpected error calling Gemini API: {e}")
            return AIAnalysisResult(
                structured_output={},
                provider="gemini",
                model=model,
                error_info=f"Exception: {str(e)}"
            )

        duration_ms = int((time.time() - start_time) * 1000)

        try:
            candidates = data.get("candidates", [])
            if not candidates:
                raise ValueError("No candidates returned from Gemini")

            text_response = candidates[0]["content"]["parts"][0]["text"]
            structured_output = json.loads(text_response)

            if not isinstance(structured_output, dict):
                raise ValueError(f"Expected dict from Gemini, got {type(structured_output)}")

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
                    estimated_cost=_estimate_cost(input_tokens, output_tokens),
                ),
            )

        except Exception as e:
            logger.error(f"Failed to parse Gemini API response: {e}. Raw response: {data}")
            return AIAnalysisResult(
                structured_output={},
                provider="gemini",
                model=model,
                error_info=f"Parse Error: {str(e)}"
            )
