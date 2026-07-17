import os
import shlex
from pathlib import Path

import httpx
from dotenv import load_dotenv

load_dotenv()


class ApiError(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(f"{status_code}: {detail}")


class ApiClient:
    def __init__(self) -> None:
        base_url = os.environ["API_BASE_URL"].rstrip("/")
        token = os.environ["ADMIN_API_TOKEN"]
        self._client = httpx.AsyncClient(
            base_url=base_url,
            headers={"Authorization": f"Bearer {token}"},
            timeout=15,
        )

    async def aclose(self) -> None:
        await self._client.aclose()

    async def _request(self, method: str, path: str, **kwargs):
        response = await self._client.request(method, path, **kwargs)
        if response.status_code >= 400:
            detail = response.text
            try:
                detail = response.json().get("detail", detail)
            except ValueError:
                pass
            raise ApiError(response.status_code, str(detail))
        if response.status_code == 204 or not response.content:
            return None
        return response.json()

    # --- reads ---
    async def get_projects(self) -> list[dict]:
        return await self._request("GET", "/projects")

    async def get_page(self, key: str) -> dict:
        """key is the URL form: 'about' or 'ai-workflow'."""
        return await self._request("GET", f"/pages/{key}")

    # --- writes (admin, token-gated) ---
    async def create_project(self, payload: dict) -> dict:
        return await self._request("POST", "/admin/projects", json=payload)

    async def update_project(self, project_id: int, payload: dict) -> dict:
        return await self._request("PUT", f"/admin/projects/{project_id}", json=payload)

    async def delete_project(self, project_id: int) -> None:
        await self._request("DELETE", f"/admin/projects/{project_id}")

    async def reorder_projects(self, ordered_ids: list[int]) -> list[dict]:
        return await self._request(
            "PUT", "/admin/projects/reorder", json={"orderedIds": ordered_ids}
        )

    async def refresh_github(self, project_id: int) -> dict:
        return await self._request("POST", f"/admin/projects/{project_id}/refresh-github")

    async def update_page(self, key: str, payload: dict) -> dict:
        """key is the URL form: 'about' or 'ai-workflow'."""
        return await self._request("PUT", f"/admin/pages/{key}", json=payload)

    async def upload_media(self, file_path: str) -> str:
        # Dragging a file into the terminal pastes a shell-quoted path
        # (backslash-escaped spaces, or wrapped in quotes) — not a raw
        # path. Parse it the same way a shell would before treating it
        # as one, or paths with spaces silently fail to resolve.
        tokens = shlex.split(file_path)
        raw_path = tokens[0] if tokens else file_path
        path = Path(raw_path).expanduser()
        if not path.is_file():
            raise ApiError(400, f"File not found: {path}")
        with path.open("rb") as f:
            result = await self._request("POST", "/admin/upload", files={"file": (path.name, f)})
        return result["url"]
