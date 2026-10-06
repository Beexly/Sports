#!/bin/bash
# fetch verified repo metadata + README for each repo in repos.txt
cd ~/workspace/skills/github
mkdir -p ~/workspace/gse-repo-intel/meta ~/workspace/gse-repo-intel/readmes
while read -r repo; do
  slug=$(echo "$repo" | tr '/' '-')
  echo "=== $repo"
  bin/github-api GET "/repos/$repo" 2>/dev/null | jq -r '{full_name, stars: .stargazers_count, forks: .forks_count, description, license: (.license.spdx_id // .license.key // "NONE"), pushed_at, created_at, language, archived, topics: (.topics[0:8])}' > ~/workspace/gse-repo-intel/meta/$slug.json
  cat ~/workspace/gse-repo-intel/meta/$slug.json
  # readme (may 404 -> JSON with message); extract download_url then fetch raw
  dl=$(bin/github-api GET "/repos/$repo/readme" 2>/dev/null | jq -r '.download_url // empty')
  if [ -n "$dl" ]; then
    curl -sL --max-time 30 "$dl" -o ~/workspace/gse-repo-intel/readmes/$slug.md
    echo "README bytes: $(wc -c < ~/workspace/gse-repo-intel/readmes/$slug.md)"
  else
    echo "README: none/404"
  fi
  sleep 2
done < ~/workspace/gse-repo-intel/repos.txt
echo DONE
