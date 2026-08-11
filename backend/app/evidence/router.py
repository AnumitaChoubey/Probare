import os
import uuid
from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models.evidence_file import EvidenceFile
from app.db.models.evidence_access_log import EvidenceAccessLog
from app.evidence.storage import storage
from app.evidence.schemas import (
    EvidenceFileResponse,
    EvidenceListGrouped,
    MalwareScanWebhookRequest,
)

router = APIRouter(tags=["Evidence"])

ALLOWED_FILE_TYPES = {
    "image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif",
    "application/pdf", "text/plain", "text/csv",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}
MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB

@router.post("/errors/{error_id}/evidence", response_model=EvidenceFileResponse, status_code=201)
async def upload_evidence(
    error_id: str,
    stage: str = Form("ORIGINAL_LOGGING"),
    uploaded_by_user_id: str = Form("user-default-1"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    EVID-1: Upload evidence file attached to an error (or 'draft' for pre-error creation).
    Calculates SHA256, stores file, inserts DB row with status 'PENDING', triggers auto-clean mock scanner.
    """
    if stage not in ["ORIGINAL_LOGGING", "REBUTTAL", "DECISION"]:
        raise HTTPException(status_code=400, detail="Invalid stage. Must be ORIGINAL_LOGGING, REBUTTAL, or DECISION.")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail=f"File exceeds maximum allowed size of 25MB.")

    storage_uri, checksum, file_size = storage.save_file(file.filename, content)

    # For draft uploads before error creation, store error_id as None or 'draft'
    effective_error_id = None if error_id == "draft" else error_id

    evidence = EvidenceFile(
        id=str(uuid.uuid4()),
        error_id=effective_error_id,
        uploaded_by_user_id=uploaded_by_user_id,
        stage=stage,
        file_name=file.filename,
        file_type=file.content_type or "application/octet-stream",
        file_size_bytes=file_size,
        storage_uri=storage_uri,
        checksum_sha256=checksum,
        malware_scan_status="CLEAN",  # Mock scanner stub auto-marks CLEAN for instant dev feedback
        is_current_version=True,
        supersedes_evidence_id=None,
        uploaded_at=datetime.utcnow(),
    )

    db.add(evidence)
    db.commit()
    db.refresh(evidence)

    return evidence


@router.post("/evidence/upload-draft", response_model=EvidenceFileResponse, status_code=201)
async def upload_draft_evidence(
    stage: str = Form("ORIGINAL_LOGGING"),
    uploaded_by_user_id: str = Form("user-default-1"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Pre-error upload path allowing Person 1's New Error Form to attach files before error_id is issued.
    """
    return await upload_evidence(
        error_id="draft",
        stage=stage,
        uploaded_by_user_id=uploaded_by_user_id,
        file=file,
        db=db,
    )


@router.post("/internal/webhooks/malware-scan-result")
def malware_scan_webhook(payload: MalwareScanWebhookRequest, db: Session = Depends(get_db)):
    """
    EVID-2: Internal malware scanner result webhook callback.
    """
    if payload.status not in ["CLEAN", "INFECTED", "FAILED"]:
        raise HTTPException(status_code=400, detail="Invalid scan status")

    evidence = db.query(EvidenceFile).filter_by(id=payload.evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence file not found")

    evidence.malware_scan_status = payload.status
    db.commit()
    return {"message": "Malware scan status updated", "id": evidence.id, "status": evidence.malware_scan_status}


@router.get("/errors/{error_id}/evidence", response_model=EvidenceListGrouped)
def list_evidence_for_error(
    error_id: str,
    stage: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    EVID-3: Get evidence files for an error, grouped by stage.
    """
    query = db.query(EvidenceFile).filter(EvidenceFile.error_id == error_id)
    if stage:
        query = query.filter(EvidenceFile.stage == stage)

    files = query.order_by(EvidenceFile.uploaded_at.desc()).all()

    auditor_evidence = [f for f in files if f.stage == "ORIGINAL_LOGGING"]
    rebuttal_evidence = [f for f in files if f.stage == "REBUTTAL"]
    decision_evidence = [f for f in files if f.stage == "DECISION"]

    return EvidenceListGrouped(
        auditor_evidence=auditor_evidence,
        rebuttal_evidence=rebuttal_evidence,
        decision_evidence=decision_evidence,
    )


@router.get("/evidence/{evidence_id}/download")
def download_evidence(
    evidence_id: str,
    user_id: str = Query("user-default-1"),
    db: Session = Depends(get_db),
):
    """
    EVID-4: Download or stream evidence file.
    Hard blocks with 403 if malware_scan_status != 'CLEAN'. Logs access log.
    """
    evidence = db.query(EvidenceFile).filter_by(id=evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence file not found")

    if evidence.malware_scan_status != "CLEAN":
        raise HTTPException(
            status_code=403,
            detail=f"Download blocked: Malware scan status is '{evidence.malware_scan_status}' (must be 'CLEAN')."
        )

    # Log access to evidence_access_log
    log_entry = EvidenceAccessLog(
        evidence_id=evidence.id,
        accessed_by_user_id=user_id,
        action="DOWNLOAD",
        accessed_at=datetime.utcnow(),
    )
    db.add(log_entry)
    db.commit()

    filepath = storage.get_file_path(evidence.storage_uri)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File asset not found on storage disk")

    return FileResponse(
        path=filepath,
        filename=evidence.file_name,
        media_type=evidence.file_type,
    )


@router.post("/evidence/{evidence_id}/supersede", response_model=EvidenceFileResponse, status_code=201)
async def supersede_evidence(
    evidence_id: str,
    uploaded_by_user_id: str = Form("user-default-1"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    EVID-5: Supersede an existing evidence file with a corrected replacement.
    Never deletes the old row — flips old is_current_version=False and sets supersedes_evidence_id on new row.
    """
    old_evidence = db.query(EvidenceFile).filter_by(id=evidence_id).first()
    if not old_evidence:
        raise HTTPException(status_code=404, detail="Original evidence file not found")

    content = await file.read()
    storage_uri, checksum, file_size = storage.save_file(file.filename, content)

    # Flip old evidence version flag
    old_evidence.is_current_version = False

    new_evidence = EvidenceFile(
        id=str(uuid.uuid4()),
        error_id=old_evidence.error_id,
        uploaded_by_user_id=uploaded_by_user_id,
        stage=old_evidence.stage,
        file_name=file.filename,
        file_type=file.content_type or "application/octet-stream",
        file_size_bytes=file_size,
        storage_uri=storage_uri,
        checksum_sha256=checksum,
        malware_scan_status="CLEAN",
        is_current_version=True,
        supersedes_evidence_id=old_evidence.id,
        uploaded_at=datetime.utcnow(),
    )

    db.add(new_evidence)
    db.commit()
    db.refresh(new_evidence)

    return new_evidence
