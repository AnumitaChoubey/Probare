from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.deps.auth import get_current_user
from app.schemas.auth import AuthContext
from app.core.database import get_db
from app.services.reporting_service import ReportingService
from app.models.integration import ReportTemplate, ReportRun

router = APIRouter(prefix="/projects/{project_id}/reports", tags=["Reporting"])

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ReportTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    report_type: str
    columns: List[str]
    filters: Dict[str, Any] = {}
    group_by: Optional[str] = None
    cron_schedule: Optional[str] = None
    recipients: Optional[List[str]] = []

class ReportTemplateResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    report_type: str
    columns: List[str]
    filters: Dict[str, Any]
    cron_schedule: Optional[str]

    class Config:
        from_attributes = True

class ReportRunTrigger(BaseModel):
    export_format: str = "csv"

class ReportRunResponse(BaseModel):
    id: str
    template_id: str
    status: str
    export_format: str
    storage_key: Optional[str]
    error_detail: Optional[str]

    class Config:
        from_attributes = True

# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------

def get_reporting_service(db: AsyncSession = Depends(get_db)) -> ReportingService:
    return ReportingService(db)

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/templates", response_model=ReportTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_report_template(
    project_id: str,
    req: ReportTemplateCreate,
    auth: AuthContext = Depends(get_current_user),
    service: ReportingService = Depends(get_reporting_service)
):
    """Creates a new report template."""
    if project_id not in auth.accessible_projects:
        raise HTTPException(status_code=403, detail="Project access denied")
        
    return await service.create_template(
        tenant_id=auth.qems_tenant_id,
        project_id=project_id,
        name=req.name,
        description=req.description,
        report_type=req.report_type,
        columns=req.columns,
        filters=req.filters,
        group_by=req.group_by,
        cron_schedule=req.cron_schedule,
        recipients=req.recipients,
        created_by=auth.qems_user_id
    )

@router.get("/templates", response_model=List[ReportTemplateResponse])
async def get_report_templates(
    project_id: str,
    auth: AuthContext = Depends(get_current_user),
    service: ReportingService = Depends(get_reporting_service)
):
    """Lists all templates for the project."""
    if project_id not in auth.accessible_projects:
        raise HTTPException(status_code=403, detail="Project access denied")
        
    return await service.get_templates(tenant_id=auth.qems_tenant_id, project_id=project_id)

@router.post("/templates/{template_id}/run", response_model=ReportRunResponse, status_code=status.HTTP_202_ACCEPTED)
async def trigger_report_run(
    project_id: str,
    template_id: str,
    req: ReportRunTrigger,
    background_tasks: BackgroundTasks,
    auth: AuthContext = Depends(get_current_user),
    service: ReportingService = Depends(get_reporting_service)
):
    """Triggers an on-demand report run."""
    if project_id not in auth.accessible_projects:
        raise HTTPException(status_code=403, detail="Project access denied")
        
    try:
        run = await service.trigger_run(
            template_id=template_id,
            tenant_id=auth.qems_tenant_id,
            triggered_by=auth.qems_user_id,
            export_format=req.export_format
        )
        # Process in background
        background_tasks.add_task(service.process_report_run, run.id)
        return run
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/runs/{run_id}", response_model=ReportRunResponse)
async def get_report_run(
    project_id: str,
    run_id: str,
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Checks the status of a report run."""
    if project_id not in auth.accessible_projects:
        raise HTTPException(status_code=403, detail="Project access denied")

    stmt = select(ReportRun).filter_by(id=run_id, tenant_id=auth.qems_tenant_id)
    run = (await db.execute(stmt)).scalars().first()
    if not run:
        raise HTTPException(status_code=404, detail="Report run not found")
        
    return run
