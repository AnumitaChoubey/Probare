from fastapi import Header, HTTPException
from typing import Optional

def get_idempotency_key(
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key")
) -> Optional[str]:
    """
    Extracts the Idempotency-Key from headers.
    It is Optional to allow endpoints to decide if it's strictly required or not.
    """
    if idempotency_key is not None and not isinstance(idempotency_key, str):
        raise HTTPException(status_code=400, detail="Invalid Idempotency-Key format")
    return idempotency_key
