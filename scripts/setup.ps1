#requires -Version 5.1
<#
.SYNOPSIS
    One-shot local setup for the Sports Prediction Platform on Windows.

.DESCRIPTION
    - Verifies Node 20+, npm, and Docker
    - Creates .env (repo root) and apps/web/.env.local from .env.example
    - Generates a secure NEXTAUTH_SECRET if still the placeholder
    - Starts Postgres + Redis via docker compose
    - Installs npm dependencies
    - Runs `prisma generate` + `prisma db push`

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
#>

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

function Write-Step($msg) { Write-Host ""; Write-Host "==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "    [ok] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "    [warn] $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "    [err] $msg" -ForegroundColor Red }

function Test-Command($name) {
    $null = Get-Command $name -ErrorAction SilentlyContinue
    return $?
}

# ---- 1. Check prerequisites ------------------------------------------------
Write-Step "Checking prerequisites"

if (-not (Test-Command node)) {
    Write-Err "node is not installed. Install Node.js 20+ from https://nodejs.org"
    exit 1
}
$nodeVersion = (& node --version).TrimStart('v')
$nodeMajor = [int]($nodeVersion.Split('.')[0])
if ($nodeMajor -lt 20) {
    Write-Err "Node $nodeVersion found; this project requires Node >= 20."
    exit 1
}
Write-Ok "node $nodeVersion"

if (-not (Test-Command npm)) { Write-Err "npm not found"; exit 1 }
Write-Ok "npm $((& npm --version))"

if (-not (Test-Command docker)) {
    Write-Err "docker is not installed or not in PATH. Install Docker Desktop and ensure it is running."
    exit 1
}
try {
    $null = & docker info 2>&1
    if ($LASTEXITCODE -ne 0) { throw "docker info failed" }
} catch {
    Write-Err "Docker is installed but the daemon is not reachable. Start Docker Desktop and re-run."
    exit 1
}
Write-Ok "docker is running"

# ---- 2. .env files ---------------------------------------------------------
Write-Step "Preparing environment files"

$envExample = Join-Path $RepoRoot ".env.example"
$envRoot    = Join-Path $RepoRoot ".env"
$envWeb     = Join-Path $RepoRoot "apps\web\.env.local"

if (-not (Test-Path $envExample)) { Write-Err ".env.example missing at repo root"; exit 1 }

if (-not (Test-Path $envRoot)) {
    Copy-Item $envExample $envRoot
    Write-Ok "created .env from .env.example"
} else {
    Write-Warn ".env already exists - not overwriting"
}

if (-not (Test-Path $envWeb)) {
    Copy-Item $envExample $envWeb
    Write-Ok "created apps/web/.env.local from .env.example"
} else {
    Write-Warn "apps/web/.env.local already exists - not overwriting"
}

# Default DATABASE_URL/DIRECT_URL must match docker-compose credentials.
$composeUser = "sports"
$composePass = "sports_dev_password"
$composeDb   = "sports_platform"
$composeUrl  = "postgresql://${composeUser}:${composePass}@localhost:5432/${composeDb}"

function Update-EnvLine($path, $key, $value) {
    if (-not (Test-Path $path)) { return }
    $content = Get-Content $path -Raw
    $pattern = "(?m)^\s*$([regex]::Escape($key))\s*=.*$"
    $line    = "$key=`"$value`""
    if ($content -match $pattern) {
        $new = [regex]::Replace($content, $pattern, $line)
    } else {
        $new = $content.TrimEnd() + "`n$line`n"
    }
    Set-Content -Path $path -Value $new -NoNewline:$false
}

# Point DATABASE_URL/DIRECT_URL at the docker-compose Postgres
Update-EnvLine $envRoot "DATABASE_URL" $composeUrl
Update-EnvLine $envRoot "DIRECT_URL"   $composeUrl
Update-EnvLine $envWeb  "DATABASE_URL" $composeUrl
Update-EnvLine $envWeb  "DIRECT_URL"   $composeUrl
Write-Ok "DATABASE_URL/DIRECT_URL aligned with docker-compose"

# Generate NEXTAUTH_SECRET if still the placeholder
$rootContent = Get-Content $envRoot -Raw
if ($rootContent -match 'NEXTAUTH_SECRET="your-secret-here-generate-with-openssl-rand-base64-32"') {
    $bytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $secret = [Convert]::ToBase64String($bytes)
    Update-EnvLine $envRoot "NEXTAUTH_SECRET" $secret
    Update-EnvLine $envWeb  "NEXTAUTH_SECRET" $secret
    Write-Ok "generated NEXTAUTH_SECRET"
} else {
    Write-Warn "NEXTAUTH_SECRET already customised - leaving as is"
}

# ---- 3. Docker services ----------------------------------------------------
Write-Step "Starting Postgres + Redis (docker compose)"
& docker compose -f (Join-Path $RepoRoot "docker\docker-compose.yml") up -d
if ($LASTEXITCODE -ne 0) { Write-Err "docker compose failed"; exit 1 }

Write-Step "Waiting for Postgres to accept connections"
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    & docker exec sports_postgres pg_isready -U $composeUser -d $composeDb 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 2
}
if (-not $ready) { Write-Err "Postgres did not become ready within 60s"; exit 1 }
Write-Ok "Postgres is accepting connections"

# ---- 4. npm install --------------------------------------------------------
Write-Step "Installing npm dependencies (this can take a few minutes)"
& npm install
if ($LASTEXITCODE -ne 0) { Write-Err "npm install failed"; exit 1 }

# ---- 5. Prisma -------------------------------------------------------------
Write-Step "Generating Prisma client"
& npm run db:generate
if ($LASTEXITCODE -ne 0) { Write-Err "prisma generate failed"; exit 1 }

Write-Step "Pushing Prisma schema to Postgres"
& npm run db:push
if ($LASTEXITCODE -ne 0) { Write-Err "prisma db push failed"; exit 1 }

# ---- 6. Done ---------------------------------------------------------------
Write-Step "Setup complete"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Edit .env and apps\web\.env.local - fill in API keys you actually use:"
Write-Host "     - GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (NextAuth login)"
Write-Host "     - STRIPE_* (billing)"
Write-Host "     - THE_ODDS_API_KEY (real odds data)"
Write-Host "     - ANTHROPIC_API_KEY (content generation)"
Write-Host "  2. Start the dev server:    npm run dev"
Write-Host "  3. Open the app:            http://localhost:3000"
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Cyan
Write-Host "  npm run db:studio          - Prisma Studio (DB browser)"
Write-Host "  npm run test               - run tests"
Write-Host "  docker compose -f docker\docker-compose.yml down   - stop Postgres + Redis"
