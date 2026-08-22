from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.db.session import get_db
from app.auth.deps import get_current_user
from app.db.models.user import User
from app.db.models.error import Error
from app.errors.router import update_status
from app.errors.schemas import ErrorStatusUpdate

router = APIRouter(prefix="/errors", tags=["rebuttal"])


@router.post("/{error_id}/acknowledge")
async def acknowledge_error(
    error_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        Error.__table__.select().where(Error.id == error_id)
    )
    error = result.fetchone()

    if not error:
        raise HTTPException(status_code=404, detail="Error not found")

    if current_user.id != error.owner_user_id:
        raise HTTPException(
            status_code=403,
            detail="Only the resolved owner can acknowledge this error"
        )

    if error.status != "OPEN_PENDING_ACK":
        return {"message": "Error already acknowledged", "status": error.status}

    updated_error = await update_status(
        error_id=error_id,
        payload=ErrorStatusUpdate(to_status="OPEN_PENDING_RESPONSE"),
        db=db,
        current_user=current_user,
    )

    return {"message": "Error acknowledged successfully", "new_status": "OPEN_PENDING_RESPONSE"}