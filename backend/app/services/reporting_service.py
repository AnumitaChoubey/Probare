import uuid
import csv
import io
from datetime import datetime, timezone
from typing import Any, Dict, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import logging

from app.models.integration import ReportTemplate, ReportRun
from app.models.quality import QualityEvent

logger = logging.getLogger(__name__)

class ReportingService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_template(self, tenant_id: str, project_id: str, name: str, description: str, report_type: str, columns: List[str], filters: Dict[str, Any], group_by: str, cron_schedule: str, recipients: List[str], created_by: str) -> ReportTemplate:
        template = ReportTemplate(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            project_id=project_id,
            name=name,
            description=description,
            report_type=report_type,
            columns=columns,
            filters=filters,
            group_by=group_by,
            cron_schedule=cron_schedule,
            recipients=recipients,
            created_by=created_by
        )
        self.db.add(template)
        await self.db.commit()
        await self.db.refresh(template)
        return template

    async def get_templates(self, tenant_id: str, project_id: str) -> List[ReportTemplate]:
        stmt = select(ReportTemplate).filter_by(tenant_id=tenant_id, project_id=project_id)
        return list((await self.db.execute(stmt)).scalars().all())

    async def trigger_run(self, template_id: str, tenant_id: str, triggered_by: str, trigger_type: str = "manual", export_format: str = "csv") -> ReportRun:
        run_id = str(uuid.uuid4())
        
        # Verify template exists
        stmt = select(ReportTemplate).filter_by(id=template_id, tenant_id=tenant_id)
        template = (await self.db.execute(stmt)).scalars().first()
        if not template:
            raise ValueError("Report Template not found")

        run = ReportRun(
            id=run_id,
            tenant_id=tenant_id,
            template_id=template_id,
            triggered_by=triggered_by,
            trigger_type=trigger_type,
            status="pending",
            export_format=export_format
        )
        self.db.add(run)
        await self.db.commit()
        await self.db.refresh(run)
        return run

    async def process_report_run(self, run_id: str):
        """
        Background processing of a report run. Generates CSV data based on the template.
        In a production scenario, this would write to S3/Blob Storage. For now, we simulate success.
        """
        stmt = select(ReportRun).filter_by(id=run_id)
        run = (await self.db.execute(stmt)).scalars().first()
        if not run or run.status != "pending":
            return
            
        run.status = "running"
        run.started_at = datetime.now(timezone.utc)
        await self.db.commit()
        
        try:
            # Load template
            template_stmt = select(ReportTemplate).filter_by(id=run.template_id)
            template = (await self.db.execute(template_stmt)).scalars().first()
            
            # Fetch data based on filters
            event_stmt = select(QualityEvent).filter_by(tenant_id=run.tenant_id, project_id=template.project_id)
            
            if template.filters:
                if "status" in template.filters:
                    event_stmt = event_stmt.filter(QualityEvent.status.in_(template.filters["status"]))
                if "severity" in template.filters:
                    event_stmt = event_stmt.filter(QualityEvent.severity.in_(template.filters["severity"]))
                    
            events = (await self.db.execute(event_stmt)).scalars().all()
            run.row_count = len(events)
            
            # Generate export (in-memory for demo, normally written to storage)
            if run.export_format == "csv":
                output = io.StringIO()
                writer = csv.writer(output)
                writer.writerow(template.columns)
                for event in events:
                    row = []
                    for col in template.columns:
                        # Extract basic attributes dynamically. A real system needs a mapping.
                        row.append(str(getattr(event, col, "")))
                    writer.writerow(row)
                
                # In real app: save `output.getvalue()` to object storage and set `run.storage_key`
                run.storage_key = f"reports/{run.id}.csv"
            else:
                raise NotImplementedError(f"Format {run.export_format} not supported yet")
                
            run.status = "completed"
            
        except Exception as e:
            logger.error(f"Report run failed: {e}")
            run.status = "failed"
            run.error_detail = str(e)
        finally:
            run.completed_at = datetime.now(timezone.utc)
            await self.db.commit()
