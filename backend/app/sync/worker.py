import asyncio
import httpx
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.db.session import async_session_maker
from app.db.models.sync import SyncQueue, Device
from app.core.config import settings

class SyncWorker:
    def __init__(self):
        self.is_running = False
        
    async def process_queue(self):
        """Processes the local sync_queue by pushing to central server."""
        if self.is_running:
            return
            
        self.is_running = True
        try:
            async with async_session_maker() as session:
                # Get pending items
                stmt = select(SyncQueue).where(SyncQueue.status.in_(["PENDING", "FAILED"])).limit(50)
                result = await session.execute(stmt)
                items = result.scalars().all()
                
                if not items:
                    return
                
                # Mark as syncing
                for item in items:
                    item.status = "SYNCING"
                await session.commit()
                
                # Get local device config (mocked for now)
                stmt = select(Device).limit(1)
                device = (await session.execute(stmt)).scalar_one_or_none()
                if not device:
                    return # Not registered yet
                
                # Build push request
                payload = {
                    "device_id": str(device.id),
                    "items": [
                        {
                            "entity_type": item.entity_type,
                            "local_id": str(item.local_id),
                            "operation": item.operation,
                            "payload": item.payload_json
                        } for item in items
                    ]
                }
                
                # Push to central
                async with httpx.AsyncClient() as client:
                    try:
                        # Assuming central server URL is stored in config
                        central_url = getattr(settings, "CENTRAL_SERVER_URL", "http://localhost:8000")
                        # For Phase 1 we just pretend it succeeds or call local if testing
                        # In production this points to the real central /sync/push
                        response = await client.post(f"{central_url}/sync/push", json=payload)
                        response.raise_for_status()
                        
                        # Process response and mark synced
                        for item in items:
                            item.status = "SYNCED"
                        await session.commit()
                        
                    except Exception as e:
                        print(f"Sync push failed: {e}")
                        for item in items:
                            item.status = "FAILED"
                        await session.commit()
                        
        finally:
            self.is_running = False

# Global instance
sync_worker = SyncWorker()

async def run_sync_worker():
    await sync_worker.process_queue()
