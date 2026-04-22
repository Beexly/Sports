#!/usr/bin/env bash
# One-shot local setup for the Sports Prediction Platform on Linux/macOS/WSL.
#
# Usage:  bash scripts/setup.sh
#
# - Verifies Node 20+, npm, Docker
# - Creates .env (repo root) and apps/web/.env.local from .env.example
# - Generates NEXTAUTH_SECRET if still the placeholder
# - Starts Postgres + Redis via docker compose
# - Installs npm deps and runs `prisma generate` + `prisma db push`

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

cyan()   { printf "\033[36m%s\033[0m\n" "$*"; }
green()  { printf "\033[32m%s\033[0m\n" "$*"; }
yellow() { printf "\033[33m%s\033[0m\n" "$*"; }
red()    { printf "\033[31m%s\033[0m\n" "$*" >&2; }

step() { echo; cyan "==> $*"; }
ok()   { green   "    [ok] $*"; }
warn() { yellow  "    [warn] $*"; }
err()  { red     "    [err] $*"; }

require_cmd() {
    if ! command -v "$1" >/dev/null 2>&1; then
        err "$1 is not installed or not in PATH"
        return 1
    fi
}

# ---- 1. Prerequisites ------------------------------------------------------
step "Checking prerequisites"

require_cmd node || exit 1
node_major="$(node --version | sed 's/^v//' | cut -d. -f1)"
if [ "$node_major" -lt 20 ]; then
    err "Node $(node --version) found; this project requires Node >= 20"
    exit 1
fi
ok "node $(node --version)"

require_cmd npm || exit 1
ok "npm $(npm --version)"

require_cmd docker || exit 1
if ! docker info >/dev/null 2>&1; then
    err "Docker is installed but the daemon is not reachable. Start Docker and re-run."
    exit 1
fi
ok "docker is running"

# ---- 2. .env files ---------------------------------------------------------
step "Preparing environment files"

ENV_EXAMPLE="$REPO_ROOT/.env.example"
ENV_ROOT="$REPO_ROOT/.env"
ENV_WEB="$REPO_ROOT/apps/web/.env.local"

[ -f "$ENV_EXAMPLE" ] || { err ".env.example missing at repo root"; exit 1; }

if [ ! -f "$ENV_ROOT" ]; then
    cp "$ENV_EXAMPLE" "$ENV_ROOT"
    ok "created .env from .env.example"
else
    warn ".env already exists - not overwriting"
fi

mkdir -p "$(dirname "$ENV_WEB")"
if [ ! -f "$ENV_WEB" ]; then
    cp "$ENV_EXAMPLE" "$ENV_WEB"
    ok "created apps/web/.env.local from .env.example"
else
    warn "apps/web/.env.local already exists - not overwriting"
fi

COMPOSE_URL='postgresql://sports:sports_dev_password@localhost:5432/sports_platform'

# Portable in-place sed (BSD vs GNU)
sed_inplace() {
    if sed --version >/dev/null 2>&1; then
        sed -i "$@"
    else
        sed -i '' "$@"
    fi
}

set_env_line() {
    local file="$1" key="$2" value="$3"
    [ -f "$file" ] || return 0
    local line="${key}=\"${value}\""
    if grep -Eq "^[[:space:]]*${key}[[:space:]]*=" "$file"; then
        # Escape sed delimiters in value
        local esc
        esc="$(printf '%s' "$line" | sed 's/[\&|]/\\&/g')"
        sed_inplace -E "s|^[[:space:]]*${key}[[:space:]]*=.*$|${esc}|" "$file"
    else
        printf '\n%s\n' "$line" >> "$file"
    fi
}

set_env_line "$ENV_ROOT" "DATABASE_URL" "$COMPOSE_URL"
set_env_line "$ENV_ROOT" "DIRECT_URL"   "$COMPOSE_URL"
set_env_line "$ENV_WEB"  "DATABASE_URL" "$COMPOSE_URL"
set_env_line "$ENV_WEB"  "DIRECT_URL"   "$COMPOSE_URL"
ok "DATABASE_URL/DIRECT_URL aligned with docker-compose"

if grep -q 'NEXTAUTH_SECRET="your-secret-here-generate-with-openssl-rand-base64-32"' "$ENV_ROOT"; then
    if command -v openssl >/dev/null 2>&1; then
        SECRET="$(openssl rand -base64 32)"
    else
        SECRET="$(node -e 'console.log(require("crypto").randomBytes(32).toString("base64"))')"
    fi
    set_env_line "$ENV_ROOT" "NEXTAUTH_SECRET" "$SECRET"
    set_env_line "$ENV_WEB"  "NEXTAUTH_SECRET" "$SECRET"
    ok "generated NEXTAUTH_SECRET"
else
    warn "NEXTAUTH_SECRET already customised - leaving as is"
fi

# ---- 3. Docker services ----------------------------------------------------
step "Starting Postgres + Redis (docker compose)"
docker compose -f "$REPO_ROOT/docker/docker-compose.yml" up -d

step "Waiting for Postgres to accept connections"
for i in $(seq 1 30); do
    if docker exec sports_postgres pg_isready -U sports -d sports_platform >/dev/null 2>&1; then
        ok "Postgres is accepting connections"
        break
    fi
    sleep 2
    if [ "$i" -eq 30 ]; then
        err "Postgres did not become ready within 60s"
        exit 1
    fi
done

# ---- 4. npm install --------------------------------------------------------
step "Installing npm dependencies (this can take a few minutes)"
npm install

# ---- 5. Prisma -------------------------------------------------------------
step "Generating Prisma client"
npm run db:generate

step "Pushing Prisma schema to Postgres"
npm run db:push

# ---- 6. Done ---------------------------------------------------------------
step "Setup complete"
echo
cyan "Next steps:"
echo "  1. Edit .env and apps/web/.env.local - fill in API keys you actually use:"
echo "     - GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (NextAuth login)"
echo "     - STRIPE_* (billing)"
echo "     - THE_ODDS_API_KEY (real odds data)"
echo "     - ANTHROPIC_API_KEY (content generation)"
echo "  2. Start the dev server:    npm run dev"
echo "  3. Open the app:            http://localhost:3000"
echo
cyan "Useful commands:"
echo "  npm run db:studio          - Prisma Studio (DB browser)"
echo "  npm run test               - run tests"
echo "  docker compose -f docker/docker-compose.yml down   - stop Postgres + Redis"
