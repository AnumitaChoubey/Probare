import csv
import io
import uuid
from typing import Optional, Dict, Any, List
from datetime import datetime

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.db.session import get_db
from app.auth.deps import get_current_user
from app.db.models.error import Error
from app.search.router import SearchFilters

router = APIRouter(prefix="/reports", tags=["reports"])

class ExportRequest(BaseModel):
    dashboard: str
    filters: SearchFilters
    format: str = "csv"

@router.post("/export")
async def export_report(
    payload: ExportRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Only supporting CSV for now
    if payload.format.lower() != "csv":
        return {"error": "Unsupported format"}

    # Fetch all data based on filters (unpaginated for export)
    query_filters = []
    
    if payload.filters.date_start:
        query_filters.append(Error.created_at >= payload.filters.date_start)
    if payload.filters.date_end:
        query_filters.append(Error.created_at <= payload.filters.date_end)
    if payload.filters.lob_ids:
        query_filters.append(Error.lob_id.in_(payload.filters.lob_ids))
    if payload.filters.category_id:
        query_filters.append(Error.category_id == payload.filters.category_id)
    if payload.filters.severity:
        query_filters.append(Error.severity == payload.filters.severity)
    if payload.filters.has_client_impact is not None:
        query_filters.append(Error.has_client_impact == payload.filters.has_client_impact)
        
    query = select(Error).options(
        joinedload(Error.lob),
        joinedload(Error.category),
        joinedload(Error.sub_category),
        joinedload(Error.logged_by_user),
        joinedload(Error.owner_user)
    )
    if query_filters:
        query = query.filter(and_(*query_filters))
        
    query = query.order_by(Error.created_at.desc())
    result = await db.execute(query)
    errors = result.scalars().unique().all()

    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    headers = [
        "QA Error ID", "Created At", "Status", "Severity", 
        "LOB", "Category", "Sub-Category", "Logged By", 
        "Owner", "Client Impact"
    ]
    writer.writerow(headers)
    
    for error in errors:
        writer.writerow([
            error.qa_error_id,
            error.created_at.isoformat(),
            error.status,
            error.severity,
            error.lob.name if error.lob else "N/A",
            error.category.name if error.category else "N/A",
            error.sub_category.name if error.sub_category else "N/A",
            f"{error.logged_by_user.first_name} {error.logged_by_user.last_name}" if error.logged_by_user else "N/A",
            f"{error.owner_user.first_name} {error.owner_user.last_name}" if error.owner_user else "N/A",
            "Yes" if error.has_client_impact else "No"
        ])
        
    output.seek(0)
    
    response = StreamingResponse(iter([output.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=export.csv"
    return response
