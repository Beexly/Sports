# run-local.ps1 — bring up Galaxy Sports Edge for local development.
# Usage (from the repo root):  .\run-local.ps1
# Windows PowerShell 5.1 safe. Uses npm.cmd; relies on the local docker Postgres.

Set-Location -Path $PSScriptRoot
$composeFile = 'docker/docker-compose.yml'

Write-Host '==> Starting local Postgres...' -ForegroundColor Cyan
docker compose -f $composeFile up -d postgres
if (-not $?) {
    Write-Host '    (falling back to legacy docker-compose)' -ForegroundColor DarkGray
    docker-compose -f $composeFile up -d postgres
    if (-not $?) { throw 'Could not start Postgres. Is Docker Desktop running?' }
}

Write-Host '==> Installing dependencies...' -ForegroundColor Cyan
npm.cmd install
if (-not $?) { throw 'npm install failed.' }

Write-Host '==> Generating Prisma client...' -ForegroundColor Cyan
npm.cmd run db:generate
if (-not $?) { throw 'db:generate failed.' }

Write-Host '==> Pushing schema to local DB...' -ForegroundColor Cyan
npm.cmd run db:push
if (-not $?) { throw 'db:push failed.' }

Write-Host '==> Starting dev server at http://localhost:3000 (Ctrl+C to stop)...' -ForegroundColor Green
npm.cmd run dev
