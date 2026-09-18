import aioboto3
from botocore.config import Config
from typing import BinaryIO, Optional, Dict
from loguru import logger
from .adapter import StorageAdapter
from app.core.config import settings

class MinIOStorageAdapter(StorageAdapter):
    def __init__(self):
        self.endpoint_url = settings.STORAGE_ENDPOINT
        self.access_key = settings.STORAGE_ACCESS_KEY
        self.secret_key = settings.STORAGE_SECRET_KEY
        self.bucket = settings.STORAGE_BUCKET
        
        # Determine if we should use SSL based on endpoint URL (http vs https)
        # Boto3 expects endpoint_url with scheme.
        self.session = aioboto3.Session(
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
        )

    async def _ensure_bucket_exists(self, client):
        try:
            await client.head_bucket(Bucket=self.bucket)
        except client.exceptions.ClientError as e:
            error_code = int(e.response['Error']['Code'])
            if error_code == 404:
                logger.info(f"Bucket {self.bucket} not found. Creating...")
                await client.create_bucket(Bucket=self.bucket)
            else:
                raise

    def _get_client(self):
        return self.session.client(
            's3',
            endpoint_url=self.endpoint_url,
            region_name='us-east-1', # Dummy region for MinIO
            # Required for MinIO
            config=Config(signature_version='s3v4') 
        )

    async def upload_file(self, file_obj: BinaryIO, object_name: str, content_type: str, metadata: Optional[Dict[str, str]] = None) -> str:
        async with self._get_client() as s3:
            await self._ensure_bucket_exists(s3)
            
            extra_args = {'ContentType': content_type}
            if metadata:
                extra_args['Metadata'] = metadata
                
            logger.debug(f"Uploading object {object_name} to bucket {self.bucket}")
            await s3.upload_fileobj(
                Fileobj=file_obj,
                Bucket=self.bucket,
                Key=object_name,
                ExtraArgs=extra_args
            )
            return object_name

    async def delete_file(self, object_name: str) -> bool:
        async with self._get_client() as s3:
            logger.debug(f"Deleting object {object_name} from bucket {self.bucket}")
            await s3.delete_object(
                Bucket=self.bucket,
                Key=object_name
            )
            return True

    async def generate_presigned_url(self, object_name: str, expiration_seconds: int = 3600, response_content_disposition: Optional[str] = None) -> str:
        async with self._get_client() as s3:
            params = {
                'Bucket': self.bucket,
                'Key': object_name
            }
            if response_content_disposition:
                params['ResponseContentDisposition'] = response_content_disposition
                
            url = await s3.generate_presigned_url(
                'get_object',
                Params=params,
                ExpiresIn=expiration_seconds
            )
            return url
