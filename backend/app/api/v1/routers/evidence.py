from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps.auth import get_current_user
from app.schemas.auth import AuthContext
from app.core.database import get_db
from app.services.evidence_service import EvidenceService
from app.repositories.evidence_repository import EvidenceRepository
from app.repositories.quality_event_repository import QualityEventRepository
from app.integrations.storage.minio_adapter import MinIOStorageAdapter
from app.services.audit_service import AuditService
from app.services.timeline_service import TimelineService
from app.schemas.quality import EvidenceResponse

router = APIRouter(prefix="/projects/{project_id}/quality-events/{event_id}/evidence", tags=["Evidence"])

def get_evidence_service(db: AsyncSession = Depends(get_db)):
    storage = MinIOStorageAdapter()
    evidence_repo = EvidenceRepository()
    event_repo = QualityEventRepository()
    audit_service = AuditService()
    timeline_service = TimelineService()
    return EvidenceService(db, storage, evidence_repo, event_repo, audit_service, timeline_service)

@router.post("", response_model=EvidenceResponse, status_code=201)
async def upload_evidence(
    project_id: str,
    event_id: str,
    file: UploadFile = File(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    auth: AuthContext = Depends(get_current_user),
    service: EvidenceService = Depends(get_evidence_service)
):
    if project_id not in auth.accessible_projects:
        raise HTTPException(status_code=403, detail="Project access denied")
    if "EDIT_QUALITY_EVENT" not in auth.permissions:
        raise HTTPException(status_code=403, detail="Permission denied")

    evidence = await service.upload_evidence(
        tenant_id=auth.qems_tenant_id,
        project_id=project_id,
        event_id=event_id,
        user_id=auth.qems_user_id,
        file=file,
        title=title,
        description=description
    )
    return evidence

@router.get("", response_model=List[EvidenceResponse])
async def list_evidence(
    project_id: str,
    event_id: str,
    auth: AuthContext = Depends(get_current_user),
    service: EvidenceService = Depends(get_evidence_service)
):
    if project_id not in auth.accessible_projects:
        raise HTTPException(status_code=403, detail="Project access denied")
    if "VIEW_QUALITY_EVENT" not in auth.permissions:
        raise HTTPException(status_code=403, detail="Permission denied")
    return await service.get_evidence_list(project_id, event_id)

@router.get("/{evidence_id}/download")
async def download_evidence(
    project_id: str,
    event_id: str,
    evidence_id: str,
    auth: AuthContext = Depends(get_current_user),
    service: EvidenceService = Depends(get_evidence_service)
):
    if project_id not in auth.accessible_projects:
        raise HTTPException(status_code=403, detail="Project access denied")
    if "VIEW_QUALITY_EVENT" not in auth.permissions:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    url = await service.get_download_url(project_id, event_id, evidence_id)
    return {"download_url": url}

@router.delete("/{evidence_id}", status_code=204)
async def delete_evidence(
    project_id: str,
    event_id: str,
    evidence_id: str,
    auth: AuthContext = Depends(get_current_user),
    service: EvidenceService = Depends(get_evidence_service)
):
    if project_id not in auth.accessible_projects:
        raise HTTPException(status_code=403, detail="Project access denied")
    if "EDIT_QUALITY_EVENT" not in auth.permissions:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    await service.delete_evidence(
        tenant_id=auth.qems_tenant_id,
        project_id=project_id,
        event_id=event_id,
        evidence_id=evidence_id,
        user_id=auth.qems_user_id
    )
