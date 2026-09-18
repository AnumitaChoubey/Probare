import pytest
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.sla_service import SLAService
from app.models.meta import SLAPolicy, Process, QualityCategory
from app.models.core import Tenant

@pytest.fixture
async def sla_base_entities(db_session: AsyncSession):
    tenant = Tenant(name="SLA Tenant")
    db_session.add(tenant)
    await db_session.flush()

    cat = QualityCategory(tenant_id=tenant.id, name="Test Category")
    db_session.add(cat)
    await db_session.flush()

    process = Process(tenant_id=tenant.id, quality_category_id=cat.id, name="Test Process")
    db_session.add(process)
    await db_session.flush()
    
    return {"tenant": tenant, "process": process}

@pytest.mark.asyncio
async def test_sla_due_date_fallback(db_session: AsyncSession, sla_base_entities):
    now = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    tenant = sla_base_entities["tenant"]
    process = sla_base_entities["process"]
    
    # No SLAPolicy created, should fallback to 4h for Critical
    due, is_fallback = await SLAService.calculate_due_date(db_session, now, tenant.id, process.id, "Critical")
    assert is_fallback is True
    assert due == now + timedelta(hours=4)

    due_low, is_fallback = await SLAService.calculate_due_date(db_session, now, tenant.id, process.id, "Low")
    assert is_fallback is True
    assert due_low == now + timedelta(hours=168)

@pytest.mark.asyncio
async def test_sla_due_date_with_configured_policy(db_session: AsyncSession, sla_base_entities):
    now = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    tenant = sla_base_entities["tenant"]
    process = sla_base_entities["process"]
    
    policy = SLAPolicy(
        tenant_id=tenant.id,
        process_id=process.id,
        name="Test Policy",
        severity="Medium",
        resolution_target_hours=10
    )
    db_session.add(policy)
    await db_session.flush()
    
    # Should use the policy's 10 hours instead of the fallback 72 hours
    due, is_fallback = await SLAService.calculate_due_date(db_session, now, tenant.id, process.id, "Medium")
    assert is_fallback is False
    assert due == now + timedelta(hours=10)

def test_sla_status_on_track():
    now = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    created_at = now - timedelta(hours=1)
    due_at = created_at + timedelta(hours=24)
    
    status = SLAService.calculate_status(created_at, due_at, None, current_time=now)
    assert status == "ON_TRACK"

def test_sla_status_due_soon():
    now = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    created_at = now - timedelta(hours=18.5)
    due_at = created_at + timedelta(hours=24) # 5.5 hours remaining
    status = SLAService.calculate_status(created_at, due_at, None, current_time=now)
    assert status == "DUE_SOON"

def test_sla_status_at_risk():
    now = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    created_at = now - timedelta(hours=20)
    due_at = created_at + timedelta(hours=24) # 4 hours remaining out of 24 (16.6% remaining, < 20% fallback)
    
    status = SLAService.calculate_status(created_at, due_at, None, current_time=now)
    assert status == "AT_RISK"

def test_sla_status_breached():
    now = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    created_at = now - timedelta(hours=25)
    due_at = created_at + timedelta(hours=24) # Past due
    
    status = SLAService.calculate_status(created_at, due_at, None, current_time=now)
    assert status == "BREACHED"

def test_sla_status_completed():
    now = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    created_at = now - timedelta(hours=10)
    due_at = created_at + timedelta(hours=24)
    closed_at = now - timedelta(hours=1)
    
    status = SLAService.calculate_status(created_at, due_at, closed_at, current_time=now)
    assert status == "COMPLETED"

def test_sla_status_breached_but_closed():
    now = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    created_at = now - timedelta(hours=30)
    due_at = created_at + timedelta(hours=24)
    closed_at = now - timedelta(hours=1) # Closed after due
    
    status = SLAService.calculate_status(created_at, due_at, closed_at, current_time=now)
    assert status == "BREACHED"

def test_sla_status_explicit_paused_cancelled():
    now = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    created_at = now - timedelta(hours=1)
    due_at = created_at + timedelta(hours=24)

    assert SLAService.calculate_status(created_at, due_at, None, current_time=now, explicit_state="PAUSED") == "PAUSED"
    assert SLAService.calculate_status(created_at, due_at, None, current_time=now, explicit_state="CANCELLED") == "CANCELLED"

def test_sla_status_custom_policy():
    now = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    created_at = now - timedelta(hours=1)
    due_at = created_at + timedelta(hours=10)
    
    policy = SLAPolicy(warning_threshold_percent=90) # warning when 10% remaining
    
    # 2 hours remaining out of 10 = 20%
    # With warning=10%, 20% remaining should be ON_TRACK.
    current_time_track = created_at + timedelta(hours=8)
    assert SLAService.calculate_status(created_at, due_at, None, current_time=current_time_track, policy=policy) == "ON_TRACK"
    
    # 0.8 hours remaining out of 10 = 8% (Between 5% and 10%) -> DUE_SOON
    current_time_warn = created_at + timedelta(hours=9.2)
    assert SLAService.calculate_status(created_at, due_at, None, current_time=current_time_warn, policy=policy) == "DUE_SOON"
