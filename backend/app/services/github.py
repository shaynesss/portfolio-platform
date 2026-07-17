import os
import re

import httpx

GITHUB_URL_RE = re.compile(r"github\.com/(?P<owner>[^/]+)/(?P<repo>[^/]+?)/?$")


class GithubFetchError(Exception):
    pass


def parse_owner_repo(github_url: str) -> tuple[str, str]:
    match = GITHUB_URL_RE.search(github_url)
    if not match:
        raise GithubFetchError(f"Not a recognizable GitHub repo URL: {github_url}")
    return match.group("owner"), match.group("repo")


async def fetch_repo_stats(github_url: str) -> dict:
    owner, repo = parse_owner_repo(github_url)
    token = os.environ.get("GITHUB_TOKEN")
    headers = {"Accept": "application/vnd.github+json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}", headers=headers
        )

    if response.status_code != 200:
        raise GithubFetchError(
            f"GitHub API returned {response.status_code} for {owner}/{repo}"
        )

    data = response.json()
    return {"stars": data.get("stargazers_count", 0), "language": data.get("language")}
