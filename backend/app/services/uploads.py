from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

ALLOWED_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg",  # image
    ".mp4", ".webm", ".mov",  # video
}
MAX_UPLOAD_BYTES = 50 * 1024 * 1024
CHUNK_SIZE = 1024 * 1024


class UploadRejected(Exception):
    pass


async def save_upload(file: UploadFile, upload_dir: Path) -> str:
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise UploadRejected(f"Unsupported file type: {ext or '(none)'}")

    upload_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid4().hex}{ext}"
    dest = upload_dir / filename

    size = 0
    with dest.open("wb") as out:
        while chunk := await file.read(CHUNK_SIZE):
            size += len(chunk)
            if size > MAX_UPLOAD_BYTES:
                out.close()
                dest.unlink(missing_ok=True)
                raise UploadRejected("File too large (max 50MB)")
            out.write(chunk)

    return filename
