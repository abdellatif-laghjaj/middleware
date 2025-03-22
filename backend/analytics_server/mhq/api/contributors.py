from flask import Blueprint, jsonify
from github import GithubException
from voluptuous import Schema, Optional, Coerce, Range, All
from typing import List, Dict

from mhq.api.request_utils import queryschema
from mhq.service.external_integrations_service import get_external_integrations_service
from mhq.service.query_validator import get_query_validator
from mhq.store.models import UserIdentityProvider
from mhq.service.code.repository_service import get_repository_service
from mhq.exapi.models.github import GitHubContributor

app = Blueprint("contributors", __name__)


@app.route("/teams/<team_id>/contributors", methods=["GET"])
def get_team_contributors(team_id: str):
    """
    Get all contributors for a team's repositories.
    This endpoint fetches contributors directly from GitHub API for all repositories
    associated with the team, providing more accurate contributor data than just PR authors.
    """
    query_validator = get_query_validator()
    team = query_validator.team_validator(team_id)

    # Get all repositories for the team
    repository_service = get_repository_service()
    team_repos = repository_service.get_team_repos(team)

    try:
        external_integrations_service = get_external_integrations_service(
            str(team.org_id), UserIdentityProvider.GITHUB
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    # Dictionary to store all contributors with their data
    all_contributors: Dict[str, Dict] = {}

    # Fetch contributors for each repository
    for repo in team_repos:
        if repo.provider != UserIdentityProvider.GITHUB.value:
            continue

        try:
            contributors: List[GitHubContributor] = external_integrations_service.get_repo_contributors(
                repo.org_name, repo.name
            )

            # Aggregate contributor data across repositories
            for contributor in contributors:
                if contributor.login in all_contributors:
                    # Update existing contributor data
                    all_contributors[contributor.login]["contributions"] += contributor.contributions
                    all_contributors[contributor.login]["repositories"].append({
                        "name": repo.name,
                        "contributions": contributor.contributions
                    })
                else:
                    # Add new contributor
                    all_contributors[contributor.login] = {
                        "login": contributor.login,
                        "id": contributor.id,
                        "avatar_url": contributor.avatar_url,
                        "html_url": contributor.html_url,
                        "type": contributor.type,
                        "contributions": contributor.contributions,
                        "repositories": [{
                            "name": repo.name,
                            "contributions": contributor.contributions
                        }]
                    }
        except GithubException as e:
            # Log the error but continue with other repositories
            print(f"Error fetching contributors for {repo.name}: {str(e)}")
            continue

    # Convert dictionary to list and sort by total contributions
    contributors_list = list(all_contributors.values())
    contributors_list.sort(key=lambda x: x["contributions"], reverse=True)

    return jsonify({"contributors": contributors_list})