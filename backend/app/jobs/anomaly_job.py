import asyncio
from datetime import datetime, timedelta, date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.session import async_session_factory
from app.db.models.error import Error
from app.db.models.ai import AISuggestionLog
from app.core.config import settings

import numpy as np

async def run_anomaly_detection_job():
    """
    Nightly job to compute error counts per (LOB, Category, day) for the trailing 30 days,
    and flag any day where a segment's count exceeds mean + 2 standard deviations.
    """
    if settings.SQLITE_DB_PATH:
        # Do not run on local desktop instances
        return
        
    print(f"[{datetime.utcnow().isoformat()}] Starting Anomaly Detection Job...")
    
    async with async_session_factory() as db:
        try:
            today = datetime.utcnow().date()
            thirty_days_ago = today - timedelta(days=30)
            
            # Query counts per lob_id, category_id, date
            stmt = (
                select(
                    Error.lob_id,
                    Error.category_id,
                    func.date(Error.created_at).label('err_date'),
                    func.count(Error.id).label('err_count')
                )
                .where(Error.created_at >= thirty_days_ago)
                .where(Error.is_draft == False)
                .group_by(Error.lob_id, Error.category_id, func.date(Error.created_at))
            )
            
            result = await db.execute(stmt)
            rows = result.all()
            
            # Group by segment (lob_id, category_id)
            segments = {}
            for lob_id, category_id, err_date, err_count in rows:
                key = (lob_id, category_id)
                if key not in segments:
                    segments[key] = []
                segments[key].append({"date": str(err_date), "count": err_count})
                
            anomalies = []
            
            for (lob_id, category_id), data_points in segments.items():
                if len(data_points) < 5:
                    # Not enough baseline data to compute meaningful stats
                    continue
                    
                counts = [dp["count"] for dp in data_points]
                mean = np.mean(counts)
                std = np.std(counts)
                
                threshold = mean + (2 * std)
                
                for dp in data_points:
                    # Check if the count exceeds the statistical threshold
                    if dp["count"] > threshold and dp["count"] > 2: # At least 3 to be considered an anomaly
                        # Check if we already logged this anomaly recently
                        anomaly_val = {
                            "lob_id": str(lob_id),
                            "category_id": str(category_id),
                            "date": dp["date"],
                            "count": dp["count"],
                            "mean": float(mean),
                            "std": float(std)
                        }
                        anomalies.append(anomaly_val)
            
            if anomalies:
                # Store them in ai_suggestions_log
                for anomaly in anomalies:
                    # Prevent duplicates for the same day
                    existing = await db.execute(
                        select(AISuggestionLog).where(
                            AISuggestionLog.suggestion_type == "ANOMALY",
                            AISuggestionLog.suggested_value["date"].astext == anomaly["date"],
                            AISuggestionLog.suggested_value["lob_id"].astext == anomaly["lob_id"],
                            AISuggestionLog.suggested_value["category_id"].astext == anomaly["category_id"]
                        )
                    )
                    if not existing.scalars().first():
                        log_entry = AISuggestionLog(
                            suggestion_type="ANOMALY",
                            suggested_value=anomaly,
                            was_accepted=None
                        )
                        db.add(log_entry)
                        
                await db.commit()
                
            print(f"[{datetime.utcnow().isoformat()}] Anomaly Detection Job completed. Found {len(anomalies)} anomalies.")
        except Exception as e:
            print(f"Error in anomaly detection job: {e}")

if __name__ == "__main__":
    asyncio.run(run_anomaly_detection_job())
