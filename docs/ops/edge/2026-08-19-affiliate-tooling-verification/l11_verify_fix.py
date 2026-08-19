#!/usr/bin/env python3
"""L-11: Verify specific affiliate-tooling repos with correct GitHub URLs."""
import json, urllib.request, time, re

GITHUB_API = 'https://api.github.com'
HEADERS = {"User-Agent": "Hermes-L11-Verify/1.0", "Accept": "application/vnd.github+json"}

# Known/correct repo URLs to check directly (not via search)
KNOWN_REPOS = {
    "Google Meridian": "googleadsai/google-meridian",
    "PubliFlow": None,  # unknown
    "Cashier SaaS Metrics": None,
    "Revenue Metrics Dashboard": None,
    "prathammahajan/affiliate-management-system": "prathammahajan/affiliate-management-system",
    "cpanova/cpa-network": "cpanova/cpa-network",
    # Fix previously wrong results
    "Dub": "dubdotsh/dub",
    "OpenPartner": None,
    "xAmplify PRM": None,
    "Refferq": None,  # search found Refferq/Refferq but unclear
    "MCP SuperAssistant Automation": None,
}

def github_repo(owner, repo):
    url = f"{GITHUB_API}/repos/{owner}/{repo}"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        resp = urllib.request.urlopen(req, timeout=15)
        return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        return {"error": f"HTTP {e.code}"}
    except Exception as e:
        return {"error": str(e)}

def github_search(query, limit=5):
    url = f"{GITHUB_API}/search/repositories?q={urllib.parse.quote(query)}&per_page={limit}"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        resp = urllib.request.urlopen(req, timeout=15)
        return json.loads(resp.read()).get('items', [])
    except Exception as e:
        return {"error": str(e)}

def get_last_commit(owner, repo):
    url = f"{GITHUB_API}/repos/{owner}/{repo}/commits?per_page=1"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        resp = urllib.request.urlopen(req, timeout=15)
        data = json.loads(resp.read())
        return data[0]['commit']['committer']['date'] if data else None
    except:
        return None

def get_lang(owner, repo):
    url = f"{GITHUB_API}/repos/{owner}/{repo}/languages"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        data = json.loads(resp.read())
        if data:
            return max(data.items(), key=lambda x: x[1])[0]
        return None
    except:
        return None

# Verify known repos
print("=== Direct repo checks ===")
for name, repo_path in KNOWN_REPOS.items():
    if repo_path is None:
        print(f"\n--- {name}: searching ---")
        results = github_search(name.replace(' ', ' ').lower(), limit=3)
        if isinstance(results, list) and results:
            top = results[0]
            print(f"  Search: {top['full_name']} ({top['stargazers_count']} stars)")
            print(f"  URL: {top['html_url']}")
        else:
            print(f"  No search results or error")
    else:
        owner, repo = repo_path.split('/', 1)
        detail = github_repo(owner, repo)
        if detail and "error" not in detail:
            commit = get_last_commit(owner, repo)
            lang = get_lang(owner, repo)
            lic = detail.get('license', {}).get('spdx_id', 'NO LICENSE') if detail.get('license') else 'NO LICENSE'
            print(f"\n--- {name}: {owner}/{repo} ---")
            print(f"  Found: {detail['full_name']} ({detail['stargazers_count']} stars)")
            print(f"  URL: {detail['html_url']}")
            print(f"  Created: {detail['created_at']}")
            print(f"  Last commit: {commit}")
            print(f"  License: {lic}")
            print(f"  Language: {lang}")
        else:
            print(f"\n--- {name}: {owner}/{repo} ---")
            print(f"  NOT FOUND (404)")
    time.sleep(1)

# Now check the repos that were found via search but might be wrong
# and verify specific orgs
print("\n=== Org checks ===")
for org_name in ["refferq", "dubdotsh", "openpartner", "xamplify"]:
    url = f"{GITHUB_API}/orgs/{org_name}"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        data = json.loads(resp.read())
        print(f"\n{org_name}: EXISTS as org")
        print(f"  Login: {data.get('login')}")
        print(f"  Name: {data.get('name', 'N/A')}")
        print(f"  Public repos: {data.get('public_repos', 'N/A')}")
        # List repos
        repos_url = f"{GITHUB_API}/orgs/{org_name}/repos?per_page=10&sort=updated"
        req2 = urllib.request.Request(repos_url, headers=HEADERS)
        try:
            resp2 = urllib.request.urlopen(req2, timeout=10)
            repos = json.loads(resp2.read())
            for r in repos:
                print(f"    - {r['full_name']} ({r['stargazers_count']} stars, {r.get('language','N/A')})")
        except:
            pass
    except urllib.error.HTTPError as e:
        if e.code == 404:
            print(f"\n{org_name}: NOT FOUND")
    except Exception as e:
        print(f"\n{org_name}: error - {e}")
    time.sleep(1)
