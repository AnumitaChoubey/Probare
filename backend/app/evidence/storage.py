import os
import hashlib
import uuid
from typing import Tuple

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

class LocalStorage:
    def __init__(self, base_dir: str = UPLOAD_DIR):
        self.base_dir = base_dir
        os.makedirs(self.base_dir, exist_ok=True)

    def save_file(self, filename: str, content: bytes) -> Tuple[str, str, int]:
        """
        Saves file bytes to disk.
        Returns (storage_uri, checksum_sha256, file_size_bytes)
        """
        sha256_hash = hashlib.sha256(content).hexdigest()
        ext = os.path.splitext(filename)[1]
        unique_filename = f"{uuid.uuid4()}{ext}"
        filepath = os.path.join(self.base_dir, unique_filename)
        
        with open(filepath, "wb") as f:
            f.write(content)

        storage_uri = f"file://{filepath}"
        return storage_uri, sha256_hash, len(content)

    def get_file_path(self, storage_uri: str) -> str:
        if storage_uri.startswith("file://"):
            return storage_uri.replace("file://", "")
        return storage_uri

storage = LocalStorage()
