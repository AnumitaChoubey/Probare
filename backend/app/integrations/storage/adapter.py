from abc import ABC, abstractmethod
from typing import BinaryIO, Optional, Dict, Any

class StorageAdapter(ABC):
    """
    Abstract base class for storage implementations (e.g. MinIO, S3).
    """

    @abstractmethod
    async def upload_file(self, file_obj: BinaryIO, object_name: str, content_type: str, metadata: Optional[Dict[str, str]] = None) -> str:
        """
        Uploads a file object to the storage backend.
        
        Args:
            file_obj: The file object (binary stream).
            object_name: The destination key/path in the bucket.
            content_type: The MIME type of the file.
            metadata: Optional metadata to attach to the object.
            
        Returns:
            The fully qualified URL or path to the object (implementation specific, generally the object name).
        """
        pass

    @abstractmethod
    async def delete_file(self, object_name: str) -> bool:
        """
        Deletes a file from the storage backend.
        
        Args:
            object_name: The key/path of the object to delete.
            
        Returns:
            True if deleted successfully.
        """
        pass

    @abstractmethod
    async def generate_presigned_url(self, object_name: str, expiration_seconds: int = 3600, response_content_disposition: Optional[str] = None) -> str:
        """
        Generates a pre-signed URL for downloading a file securely.
        
        Args:
            object_name: The key/path of the object.
            expiration_seconds: Time in seconds until the URL expires.
            response_content_disposition: Optional Content-Disposition header override (e.g., for forcing download with original filename).
            
        Returns:
            A pre-signed URL string.
        """
        pass
