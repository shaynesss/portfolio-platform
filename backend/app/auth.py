import os
import secrets

from dotenv import load_dotenv
from fastapi import Header, HTTPException

load_dotenv()


def require_admin(authorization: str | None = Header(default=None)) -> None:
    scheme, _, token = (authorization or "").partition(" ")
    expected = os.environ["ADMIN_API_TOKEN"]
    if scheme.lower() != "bearer" or not secrets.compare_digest(token, expected):
        raise HTTPException(status_code=401, detail="Invalid or missing admin token")
