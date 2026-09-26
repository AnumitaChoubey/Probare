"""
AI Capability Service — Phase E

Provider-independent implementation of all 9 AI capabilities (spec Section 11).
Every capability:
  1. Checks the feature flag for the tenant before executing.
  2. Checks the daily cost/call cap and degrades to "unavailable" if exceeded.
  3. Writes an immutable AIInvocationLog row after every call (hash of prompt, never raw text).
  4. Returns a typed suggestion — never auto-applies anything.

The 3-state availability contract (spec Section 11.2) is enforced at the endpoint layer
using the AICapabilityGate helper below, keeping each capability method clean.
"""
import hashlib
import json
import uuid
from datetime import datetime, date, timezone
from typing import Any, Dict, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.models.integration import (
    AIModelConfiguration,
    AIInvocationLog,
    AIAnalysisRun,
    AIInsight,
    AIUsageRecord,
)
from app.integrations.ai.provider import AIAnalysisRequest, AIAnalysisResult


# ---------------------------------------------------------------------------
# Availability states (spec Section 11.2)
# ---------------------------------------------------------------------------

class AIUnavailableError(Exception):
    """Raised when a capability is disabled via flag or cap exceeded."""
    def __init__(self, capability: str, reason: str):
        self.capability = capability
        self.reason = reason
        super().__init__(f"AI capability '{capability}' unavailable: {reason}")


# ---------------------------------------------------------------------------
# Gate helper — checks flags and caps before allowing a call through
# ---------------------------------------------------------------------------

async def check_capability_gate(
    session: AsyncSession,
    tenant_id: str,
    capability: str
) -> AIModelConfiguration:
    """
    Loads the active AIModelConfiguration for the tenant and verifies:
      - capability_flags[capability] is True (or unset → allowed by default)
      - daily call cap not exceeded
    Returns the config so the caller can use the provider/model name.
    Raises AIUnavailableError if blocked.
    """
    stmt = select(AIModelConfiguration).filter_by(tenant_id=tenant_id, is_active=True)
    config = (await session.execute(stmt)).scalars().first()

    if not config:
        raise AIUnavailableError(capability, "No active AI provider configured for this tenant")

    # Feature flag check — default True if not explicitly set
    flags: Dict[str, bool] = config.capability_flags or {}
    if flags.get(capability, True) is False:
        raise AIUnavailableError(capability, f"Capability '{capability}' is disabled by administrator")

    # Daily call cap check
    caps: Dict[str, Any] = config.capability_caps or {}
    cap_config = caps.get(capability, {})
    daily_call_cap = cap_config.get("daily_call_cap")
    if daily_call_cap is not None:
        today_start = datetime.combine(date.today(), datetime.min.time()).replace(tzinfo=timezone.utc)
        count_stmt = (
            select(func.count(AIInvocationLog.id))
            .filter(
                AIInvocationLog.tenant_id == tenant_id,
                AIInvocationLog.capability == capability,
                AIInvocationLog.created_at >= today_start,
            )
        )
        today_count = (await session.execute(count_stmt)).scalar() or 0
        if today_count >= daily_call_cap:
            raise AIUnavailableError(
                capability,
                f"Daily call cap of {daily_call_cap} reached for '{capability}'"
            )

    return config


# ---------------------------------------------------------------------------
# Invocation logger — writes immutable row after each AI call
# ---------------------------------------------------------------------------

async def log_invocation(
    session: AsyncSession,
    tenant_id: str,
    capability: str,
    provider: str,
    entity_type: Optional[str],
    entity_id: Optional[str],
    prompt_data: Dict[str, Any],
    response_summary: str,
    tokens_used: Optional[int],
    cost_estimate: Optional[str],
    invoked_by: Optional[str],
) -> AIInvocationLog:
    """
    Writes one immutable AIInvocationLog row.
    Prompt is hashed (SHA-256) — never stored raw.
    """
    prompt_bytes = json.dumps(prompt_data, sort_keys=True, default=str).encode()
    prompt_hash = hashlib.sha256(prompt_bytes).hexdigest()

    log = AIInvocationLog(
        id=str(uuid.uuid4()),
        tenant_id=tenant_id,
        capability=capability,
        provider=provider,
        entity_type=entity_type,
        entity_id=entity_id,
        prompt_hash=prompt_hash,
        response_summary=response_summary,
        accepted_by_user=None,   # set later via PATCH /ai/invocations/{id}/feedback
        tokens_used=tokens_used,
        cost_estimate=cost_estimate,
        invoked_by=invoked_by,
    )
    session.add(log)
    # Flush so the row is visible to the caller without committing the outer transaction
    await session.flush()
    return log


# ---------------------------------------------------------------------------
# Per-capability service methods
# All methods:
#   - Accept a session + auth context fields
#   - Call check_capability_gate first
#   - Call the AI provider via the generic AIAnalysisRequest interface
#   - Log the invocation
#   - Return a suggestion dict — never auto-apply
# ---------------------------------------------------------------------------

class AICapabilityService:

    @staticmethod
    async def duplicate_check(
        session: AsyncSession,
        tenant_id: str,
        project_id: str,
        event_id: str,
        event_description: str,
        invoked_by: str,
        provider_instance,
    ) -> Dict[str, Any]:
        """
        Capability 1: Duplicate detection (spec 11.1).
        Returns suggestions ONLY — never auto-merges or auto-blocks.
        """
        config = await check_capability_gate(session, tenant_id, "duplicate_check")

        request = AIAnalysisRequest(
            analysis_type="duplicate_check",
            tenant_id=tenant_id,
            project_id=project_id,
            quality_event_id=event_id,
            event_version=0,
            structured_input={"description": event_description},
        )
        result: AIAnalysisResult = await provider_instance.analyze(request)

        await log_invocation(
            session, tenant_id, "duplicate_check", config.provider,
            "quality_error", event_id,
            {"description": event_description[:200]},
            result.structured_output.get("summary", "Duplicate check completed"),
            result.usage.input_tokens + result.usage.output_tokens,
            result.usage.estimated_cost, invoked_by,
        )
        return {
            "suggestions": result.structured_output.get("duplicates", []),
            "note": "These are suggestions only. A human must confirm any duplicate relationship."
        }

    @staticmethod
    async def categorize(
        session: AsyncSession,
        tenant_id: str,
        project_id: str,
        event_id: str,
        description: str,
        process_area: Optional[str],
        invoked_by: str,
        provider_instance,
    ) -> Dict[str, Any]:
        """Capability 2: Auto-categorization suggestion."""
        config = await check_capability_gate(session, tenant_id, "categorize")

        request = AIAnalysisRequest(
            analysis_type="quality_event_classification",
            tenant_id=tenant_id, project_id=project_id,
            quality_event_id=event_id, event_version=0,
            structured_input={"description": description, "process_area": process_area},
        )
        result = await provider_instance.analyze(request)

        await log_invocation(
            session, tenant_id, "categorize", config.provider,
            "quality_error", event_id,
            {"description": description[:200]},
            str(result.structured_output.get("errorType", "")),
            result.usage.input_tokens + result.usage.output_tokens,
            result.usage.estimated_cost, invoked_by,
        )
        return result.structured_output

    @staticmethod
    async def summarize_rebuttal(
        session: AsyncSession,
        tenant_id: str,
        project_id: str,
        event_id: str,
        rebuttal_text: str,
        invoked_by: str,
        provider_instance,
    ) -> Dict[str, Any]:
        """Capability 3: Rebuttal summarization."""
        config = await check_capability_gate(session, tenant_id, "summarize_rebuttal")

        request = AIAnalysisRequest(
            analysis_type="rebuttal_summarization",
            tenant_id=tenant_id, project_id=project_id,
            quality_event_id=event_id, event_version=0,
            structured_input={"rebuttal_text": rebuttal_text},
        )
        result = await provider_instance.analyze(request)

        await log_invocation(
            session, tenant_id, "summarize_rebuttal", config.provider,
            "quality_error", event_id,
            {"rebuttal_preview": rebuttal_text[:200]},
            result.structured_output.get("summary", ""),
            result.usage.input_tokens + result.usage.output_tokens,
            result.usage.estimated_cost, invoked_by,
        )
        return {"summary": result.structured_output.get("summary", "")}

    @staticmethod
    async def summarize_evidence(
        session: AsyncSession,
        tenant_id: str,
        project_id: str,
        evidence_id: str,
        file_name: str,
        mime_type: str,
        invoked_by: str,
        provider_instance,
    ) -> Dict[str, Any]:
        """Capability 4: Evidence summarization."""
        config = await check_capability_gate(session, tenant_id, "summarize_evidence")

        request = AIAnalysisRequest(
            analysis_type="evidence_summarization",
            tenant_id=tenant_id, project_id=project_id,
            quality_event_id=evidence_id, event_version=0,
            structured_input={"file_name": file_name, "mime_type": mime_type},
        )
        result = await provider_instance.analyze(request)

        await log_invocation(
            session, tenant_id, "summarize_evidence", config.provider,
            "evidence", evidence_id,
            {"file_name": file_name},
            result.structured_output.get("summary", ""),
            result.usage.input_tokens + result.usage.output_tokens,
            result.usage.estimated_cost, invoked_by,
        )
        return {"summary": result.structured_output.get("summary", "")}

    @staticmethod
    async def suggest_root_cause(
        session: AsyncSession,
        tenant_id: str,
        project_id: str,
        event_id: str,
        event_context: Dict[str, Any],
        invoked_by: str,
        provider_instance,
    ) -> Dict[str, Any]:
        """Capability 5: Root cause suggestion."""
        config = await check_capability_gate(session, tenant_id, "suggest_root_cause")

        request = AIAnalysisRequest(
            analysis_type="rca_extraction",
            tenant_id=tenant_id, project_id=project_id,
            quality_event_id=event_id, event_version=0,
            structured_input=event_context,
        )
        result = await provider_instance.analyze(request)

        await log_invocation(
            session, tenant_id, "suggest_root_cause", config.provider,
            "quality_error", event_id,
            {"event_id": event_id},
            str(result.structured_output.get("primary_cause", "")),
            result.usage.input_tokens + result.usage.output_tokens,
            result.usage.estimated_cost, invoked_by,
        )
        return result.structured_output

    @staticmethod
    async def predict_impact(
        session: AsyncSession,
        tenant_id: str,
        project_id: str,
        event_id: str,
        event_context: Dict[str, Any],
        invoked_by: str,
        provider_instance,
    ) -> Dict[str, Any]:
        """Capability 6: Business impact prediction."""
        config = await check_capability_gate(session, tenant_id, "predict_impact")

        request = AIAnalysisRequest(
            analysis_type="impact_assessment",
            tenant_id=tenant_id, project_id=project_id,
            quality_event_id=event_id, event_version=0,
            structured_input=event_context,
        )
        result = await provider_instance.analyze(request)

        await log_invocation(
            session, tenant_id, "predict_impact", config.provider,
            "quality_error", event_id,
            {"event_id": event_id},
            str(result.structured_output.get("risk_level", "")),
            result.usage.input_tokens + result.usage.output_tokens,
            result.usage.estimated_cost, invoked_by,
        )
        return result.structured_output

    @staticmethod
    async def analyze_trends(
        session: AsyncSession,
        tenant_id: str,
        project_id: str,
        scope: Dict[str, Any],
        invoked_by: str,
        provider_instance,
    ) -> Dict[str, Any]:
        """Capability 7: Trend analysis across events in scope."""
        config = await check_capability_gate(session, tenant_id, "analyze_trends")

        request = AIAnalysisRequest(
            analysis_type="trend_analysis",
            tenant_id=tenant_id, project_id=project_id,
            quality_event_id="scope", event_version=0,
            structured_input=scope,
        )
        result = await provider_instance.analyze(request)

        await log_invocation(
            session, tenant_id, "analyze_trends", config.provider,
            "project", project_id,
            scope,
            str(result.structured_output.get("trend_summary", ""))[:500],
            result.usage.input_tokens + result.usage.output_tokens,
            result.usage.estimated_cost, invoked_by,
        )
        return result.structured_output

    @staticmethod
    async def ask(
        session: AsyncSession,
        tenant_id: str,
        project_id: str,
        query: str,
        context: Dict[str, Any],
        invoked_by: str,
        provider_instance,
    ) -> Dict[str, Any]:
        """Capability 8: Ask QEMS — natural language Q&A."""
        config = await check_capability_gate(session, tenant_id, "ask")

        request = AIAnalysisRequest(
            analysis_type="ask_qems",
            tenant_id=tenant_id, project_id=project_id,
            quality_event_id="ask", event_version=0,
            structured_input={"query": query, "context": context},
        )
        result = await provider_instance.analyze(request)

        await log_invocation(
            session, tenant_id, "ask", config.provider,
            None, None,
            {"query": query[:200]},
            str(result.structured_output.get("answer", ""))[:500],
            result.usage.input_tokens + result.usage.output_tokens,
            result.usage.estimated_cost, invoked_by,
        )
        return {"answer": result.structured_output.get("answer", ""), "sources": result.structured_output.get("sources", [])}

    @staticmethod
    async def executive_report(
        session: AsyncSession,
        tenant_id: str,
        project_id: str,
        scope: Dict[str, Any],
        invoked_by: str,
        provider_instance,
    ) -> Dict[str, Any]:
        """Capability 9: AI-generated executive report draft."""
        config = await check_capability_gate(session, tenant_id, "executive_report")

        request = AIAnalysisRequest(
            analysis_type="executive_report",
            tenant_id=tenant_id, project_id=project_id,
            quality_event_id="report", event_version=0,
            structured_input=scope,
        )
        result = await provider_instance.analyze(request)

        await log_invocation(
            session, tenant_id, "executive_report", config.provider,
            "project", project_id,
            scope,
            "Executive report draft generated",
            result.usage.input_tokens + result.usage.output_tokens,
            result.usage.estimated_cost, invoked_by,
        )
        return result.structured_output
