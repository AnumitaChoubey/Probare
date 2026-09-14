import os
import hashlib
import uuid
from typing import Tuple
from datetime import datetime, timedelta, timezone

from app.core.config import settings

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

class StorageService:
    def __init__(self, base_dir: str = UPLOAD_DIR):
        self.base_dir = base_dir
        os.makedirs(self.base_dir, exist_ok=True)
        self.use_azure = bool(settings.AZURE_STORAGE_CONNECTION_STRING)
        
        if self.use_azure:
            try:
                from azure.storage.blob import BlobServiceClient
                self.blob_service_client = BlobServiceClient.from_connection_string(settings.AZURE_STORAGE_CONNECTION_STRING)
                self.container_name = settings.AZURE_STORAGE_CONTAINER_NAME
                
                # Ensure container exists
                container_client = self.blob_service_client.get_container_client(self.container_name)
                if not container_client.exists():
                    container_client.create_container()
            except ImportError:
                print("azure-storage-blob not installed, falling back to local storage")
                self.use_azure = False
            except Exception as e:
                print(f"Failed to initialize Azure Blob Storage: {e}")
                self.use_azure = False

    def save_file(self, filename: str, content: bytes) -> Tuple[str, str, int]:
        """
        Saves file bytes to Azure Blob Storage (if online) or disk (if offline/local).
        Returns (storage_uri, checksum_sha256, file_size_bytes)
        """
        sha256_hash = hashlib.sha256(content).hexdigest()
        ext = os.path.splitext(filename)[1]
        unique_filename = f"{uuid.uuid4()}{ext}"
        
        if self.use_azure and not settings.SQLITE_DB_PATH:
            # We are online and Azure is configured
            blob_client = self.blob_service_client.get_blob_client(container=self.container_name, blob=unique_filename)
            blob_client.upload_blob(content, overwrite=True)
            # Store the URI format as azure://container/blob for our own reference
            storage_uri = f"azure://{self.container_name}/{unique_filename}"
        else:
            # Local fallback (or we are the offline sidecar)
            filepath = os.path.join(self.base_dir, unique_filename)
            with open(filepath, "wb") as f:
                f.write(content)
            storage_uri = f"file://{filepath}"
            
        return storage_uri, sha256_hash, len(content)

    def get_download_url(self, storage_uri: str) -> str:
        """
        Returns a SAS URL for Azure blobs, or a local file path.
        """
        if storage_uri.startswith("azure://") and self.use_azure:
            from azure.storage.blob import generate_blob_sas, BlobSasPermissions
            parts = storage_uri.replace("azure://", "").split("/")
            container = parts[0]
            blob = parts[1]
            
            # Generate a 1-hour SAS token
            sas_token = generate_blob_sas(
                account_name=self.blob_service_client.account_name,
                container_name=container,
                blob_name=blob,
                account_key=self.blob_service_client.credential.account_key,
                permission=BlobSasPermissions(read=True),
                expiry=datetime.now(timezone.utc) + timedelta(hours=1)
            )
            return f"https://{self.blob_service_client.account_name}.blob.core.windows.net/{container}/{blob}?{sas_token}"
            
        elif storage_uri.startswith("file://"):
            return storage_uri.replace("file://", "")
        return storage_uri

storage = StorageService()
