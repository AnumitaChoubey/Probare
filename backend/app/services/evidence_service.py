import uuid
import hashlib
import os
import magic
from fastapi import UploadFile
from typing import List, Optional
from loguru import logger
from fastapi.exceptions import HTTPException

from app.models.quality import Evidence
from app.repositories.evidence_repository import EvidenceRepository
from app.repositories.quality_event_repository import QualityEventRepository
from app.integrations.storage.adapter import StorageAdapter
from app.services.audit_service import AuditService
from app.services.timeline_service import TimelineService
from sqlalchemy.ext.asyncio import AsyncSession

# Constants
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
ALLOWED_EXTENSIONS = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".csv": "text/csv",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
}

class EvidenceService:
    def __init__(self, 
                 db: AsyncSession, 
                 storage_adapter: StorageAdapter,
                 evidence_repo: EvidenceRepository,
                 event_repo: QualityEventRepository,
                 audit_service: AuditService,
                 timeline_service: TimelineService):
        self.db = db
        self.storage = storage_adapter
        self.evidence_repo = evidence_repo
        self.event_repo = event_repo
        self.audit_service = audit_service
        self.timeline_service = timeline_service

    def _sanitize_filename(self, filename: str) -> str:
        # Prevent path traversal and null bytes
        if '\0' in filename:
            raise HTTPException(status_code=400, detail="Invalid filename")
        sanitized = os.path.basename(filename)
        return sanitized

    async def _validate_file(self, file: UploadFile) -> (str, int, str):
        # 1. Size Validation (Stream based validation could also be done at the router/middleware level)
        file.file.seek(0, os.SEEK_END)
        size = file.file.tell()
        file.file.seek(0)
        if size > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File exceeds maximum allowed size")
        if size == 0:
            raise HTTPException(status_code=400, detail="File is empty")

        # 2. Filename sanitization
        original_filename = file.filename or "unknown"
        if "\0" in original_filename:
            raise HTTPException(status_code=400, detail="Invalid filename")
            
        sanitized = self._sanitize_filename(original_filename)

        # 3. Extension allowlist
        ext = os.path.splitext(sanitized)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"File type {ext} is not allowed")

        # 4. Content / Signature / Magic-byte inspection
        header_chunk = file.file.read(2048)
        file.file.seek(0)
        
        try:
            detected_mime = magic.from_buffer(header_chunk, mime=True)
        except Exception as e:
            logger.error(f"Error reading magic bytes: {e}")
            raise HTTPException(status_code=400, detail="Could not determine file type securely")

        # 5. MIME consistency validation (Declared vs Extension vs Magic)
        expected_mime = ALLOWED_EXTENSIONS[ext]
        declared_mime = file.content_type
        
        # Check declared MIME vs Extension
        if declared_mime and declared_mime != expected_mime:
            if not (ext == ".csv" and declared_mime in ["text/plain", "text/csv"]):
                raise HTTPException(status_code=400, detail="Declared content type does not match file extension")

        # Check Magic MIME vs Extension
        if detected_mime != expected_mime:
            # Special case for text/plain being returned for csv sometimes by magic
            if ext == ".csv" and detected_mime in ["text/plain", "text/csv"]:
                pass
            else:
                raise HTTPException(status_code=400, detail="File content does not match its extension (magic byte mismatch)")

        # 6. SHA-256 Checksum Calculation
        sha256 = hashlib.sha256()
        while chunk := file.file.read(8192):
            sha256.update(chunk)
        file.file.seek(0)
        checksum = sha256.hexdigest()

        return sanitized, size, expected_mime, checksum

    async def upload_evidence(self, 
                              tenant_id: str, 
                              project_id: str, 
                              event_id: str, 
                              user_id: str, 
                              file: UploadFile,
                              title: str,
                              description: Optional[str] = None) -> Evidence:
        
        # Validate Project and Event Authorization
        event = await self.event_repo.get(self.db, event_id, project_id=project_id)
        if not event:
            raise HTTPException(status_code=404, detail="Quality Event not found")

        # Validate file
        sanitized_filename, size, mime_type, checksum = await self._validate_file(file)

        evidence_id = str(uuid.uuid4())
        # Never use the client filename to construct the object storage key
        object_key = f"tenant/{tenant_id}/project/{project_id}/event/{event_id}/evidence/{evidence_id}/blob"

        # Upload to Storage
        try:
            await self.storage.upload_file(file.file, object_key, mime_type, metadata={"checksum": checksum})
        except Exception as e:
            logger.error(f"Failed to upload file to storage: {e}")
            raise HTTPException(status_code=500, detail="Storage upload failed")

        # Persist DB Record
        try:
            evidence = Evidence(
                id=evidence_id,
                tenant_id=tenant_id,
                project_id=project_id,
                quality_event_id=event_id,
                title=title,
                file_name=sanitized_filename,
                file_size=str(size),
                mime_type=mime_type,
                storage_path=object_key,
                uploaded_by_id=user_id,
                description=description,
                checksum=checksum
            )
            self.db.add(evidence)
            
            # Flush is necessary to ensure it's in the session before audit log
            await self.db.flush()

            # Create Timeline and Audit Events
            await self.timeline_service.record_event(
                session=self.db,
                quality_event_id=event_id,
                project_id=project_id,
                tenant_id=tenant_id,
                event_type="EVIDENCE_UPLOADED",
                description=f"Uploaded evidence: {sanitized_filename}",
                actor_id=user_id
            )

            await self.audit_service.record_action(
                session=self.db,
                tenant_id=tenant_id,
                project_id=project_id,
                entity_type="Evidence",
                entity_id=evidence_id,
                action="CREATE",
                actor_id=user_id,
                new_value={
                    "file_name": sanitized_filename,
                    "mime_type": mime_type,
                    "size": size,
                    "checksum": checksum
                }
            )
            
            await self.db.commit()
            return evidence

        except Exception as db_err:
            logger.error(f"Failed to persist Evidence DB record: {db_err}")
            await self.db.rollback()
            # Object upload succeeded but DB failed. Attempt cleanup.
            try:
                await self.storage.delete_file(object_key)
            except Exception as cleanup_err:
                logger.error(f"Orphaned object in storage! Key: {object_key}. Error: {cleanup_err}")
                # Future: Could insert an OutboxEvent (with a new DB session) to guarantee cleanup later.
            raise HTTPException(status_code=500, detail="Failed to save evidence metadata")

    async def get_evidence_list(self, project_id: str, event_id: str) -> List[Evidence]:
        return await self.evidence_repo.get_all_by_event_and_project(self.db, event_id, project_id)
        
    async def get_evidence(self, project_id: str, event_id: str, evidence_id: str) -> Evidence:
        evidence = await self.evidence_repo.get_by_event_and_project(self.db, evidence_id, event_id, project_id)
        if not evidence:
            raise HTTPException(status_code=404, detail="Evidence not found")
        return evidence

    async def get_download_url(self, project_id: str, event_id: str, evidence_id: str) -> str:
        evidence = await self.get_evidence(project_id, event_id, evidence_id)
        content_disposition = f"attachment; filename=\"{evidence.file_name}\""
        url = await self.storage.generate_presigned_url(
            evidence.storage_path, 
            expiration_seconds=3600,
            response_content_disposition=content_disposition
        )
        return url

    async def delete_evidence(self, tenant_id: str, project_id: str, event_id: str, evidence_id: str, user_id: str):
        evidence = await self.get_evidence(project_id, event_id, evidence_id)
        
        # 1. Delete from DB first
        try:
            await self.evidence_repo.remove(self.db, id=evidence_id)
            
            await self.timeline_service.record_event(
                session=self.db,
                quality_event_id=event_id,
                project_id=project_id,
                tenant_id=tenant_id,
                event_type="EVIDENCE_DELETED",
                description=f"Deleted evidence: {evidence.file_name}",
                actor_id=user_id
            )

            await self.audit_service.record_action(
                session=self.db,
                tenant_id=tenant_id,
                project_id=project_id,
                entity_type="Evidence",
                entity_id=evidence_id,
                action="DELETE",
                actor_id=user_id,
                old_value={"file_name": evidence.file_name, "storage_path": evidence.storage_path}
            )
            
            await self.db.commit()
        except Exception as e:
            logger.error(f"Failed to delete Evidence metadata: {e}")
            await self.db.rollback()
            raise HTTPException(status_code=500, detail="Could not delete evidence")
            
        # 2. Delete from storage (If this fails, it's just orphaned, but data is safe/inaccessible)
        try:
            await self.storage.delete_file(evidence.storage_path)
        except Exception as e:
            logger.error(f"Failed to delete Evidence object from storage. Orphaned key: {evidence.storage_path}. Error: {e}")
