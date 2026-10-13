import re
import httpx
from config import settings


GITHUB_URL_PATTERN = re.compile(
    r"^https?://github\.com/(?P<owner>[^/]+)/(?P<repo>[^/]+?)(?:\.git)?/?$"
)


def parse_github_url(url: str) -> tuple[str, str] | None:
    """Extract (owner, repo) from a GitHub URL. Returns None if invalid."""
    match = GITHUB_URL_PATTERN.match(url.strip())
    if not match:
        return None
    return match.group("owner"), match.group("repo")


async def validate_github_repo(url: str) -> dict:
    """
    Validates a GitHub repo URL by calling the GitHub API.
    Returns a dict with valid, owner, repo, stars, language, description, error.
    """
    parsed = parse_github_url(url)
    if not parsed:
        return {"valid": False, "error": "Invalid GitHub URL format"}

    owner, repo = parsed
    api_url = f"https://api.github.com/repos/{owner}/{repo}"

    headers = {"Accept": "application/vnd.github+json"}
    if settings.github_api_token:
        headers["Authorization"] = f"Bearer {settings.github_api_token}"

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(api_url, headers=headers)

        if resp.status_code == 404:
            return {"valid": False, "owner": owner, "repo": repo, "error": "Repository not found or is private"}

        if resp.status_code == 403:
            # Rate limited — allow submission to proceed, URL format is valid
            return {"valid": True, "owner": owner, "repo": repo, "stars": 0,
                    "language": None, "description": None, "error": None}

        if resp.status_code != 200:
            return {"valid": False, "error": f"GitHub API error: {resp.status_code}"}

        data = resp.json()
        return {
            "valid": True,
            "owner": data.get("owner", {}).get("login"),
            "repo": data.get("name"),
            "stars": data.get("stargazers_count", 0),
            "language": data.get("language"),
            "description": data.get("description"),
            "error": None,
        }

    except httpx.TimeoutException:
        # Don't block submission on GitHub API timeout — URL format is valid
        return {"valid": True, "owner": owner, "repo": repo, "stars": 0,
                "language": None, "description": None, "error": None}
    except Exception as e:
        return {"valid": False, "error": str(e)}
