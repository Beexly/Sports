param(
  [switch]$CheckEnv,
  [switch]$SmokeProd
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$failures = @()

function Invoke-ReadinessStep {
  param(
    [string]$Name,
    [scriptblock]$Script
  )

  Write-Host ""
  Write-Host "== $Name ==" -ForegroundColor Cyan

  try {
    & $Script
    if ($LASTEXITCODE -ne 0) {
      throw "Exit code $LASTEXITCODE"
    }
    Write-Host "PASS: $Name" -ForegroundColor Green
  } catch {
    Write-Host "FAIL: $Name" -ForegroundColor Red
    Write-Host $_
    $script:failures += $Name
  }
}

Set-Location $repoRoot

function Clear-WebBuildArtifact {
  $nextPath = Join-Path $repoRoot "apps\web\.next"
  if (-not (Test-Path -LiteralPath $nextPath)) {
    return
  }

  $resolvedNextPath = (Resolve-Path -LiteralPath $nextPath).Path
  if (-not $resolvedNextPath.StartsWith($repoRoot.Path, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to remove build artifact outside repo: $resolvedNextPath"
  }

  Remove-Item -LiteralPath $resolvedNextPath -Recurse -Force
}

Invoke-ReadinessStep "monetization docs validator" {
  powershell -ExecutionPolicy Bypass -File .\docs\monetization-v3\tools\validate-monetization-v3.ps1
}

Invoke-ReadinessStep "exact brand-safety scan" {
  $terms = @(
    ("AI-powered " + "prediction"),
    ("lock of " + "the day"),
    ("guaranteed " + "win"),
    ("insider " + "information")
  )
  $pattern = ($terms | ForEach-Object { [regex]::Escape($_) }) -join "|"
  $matches = rg -n -i $pattern docs/monetization-v3 docs/codex-overnight-brief-2026-05-23.md apps/web scripts package.json .env.example 2>$null
  if ($LASTEXITCODE -eq 0) {
    $matches
    throw "Banned exact phrases found."
  }
  if ($LASTEXITCODE -gt 1) {
    throw "rg failed with exit code $LASTEXITCODE"
  }
  $global:LASTEXITCODE = 0
}

Invoke-ReadinessStep "DEC-NEXT definition uniqueness" {
  $decisionLogPath = Join-Path $repoRoot "docs\monetization-v3\templates\decision-log.md"
  $hits = Select-String -LiteralPath $decisionLogPath -Pattern '^###\s+DEC-NEXT-\d+\b' | ForEach-Object {
    $id = [regex]::Match($_.Line, 'DEC-NEXT-\d+').Value
    [pscustomobject]@{
      Id = $id
      File = "docs\monetization-v3\templates\decision-log.md"
      Line = $_.LineNumber
    }
  }
  $duplicates = $hits | Group-Object Id | Where-Object { $_.Count -gt 1 }
  if ($duplicates) {
    $duplicates | Format-Table -AutoSize
    throw "Duplicate DEC-NEXT definitions found."
  }
  Write-Host ("Unique DEC-NEXT definitions: {0}" -f @($hits).Count)
  $global:LASTEXITCODE = 0
}

Invoke-ReadinessStep "web tests" {
  npm.cmd run test:web
}

Invoke-ReadinessStep "web typecheck" {
  npm.cmd run typecheck:web
}

Invoke-ReadinessStep "web build" {
  Clear-WebBuildArtifact
  npm.cmd run build:web
}

Invoke-ReadinessStep "npm audit" {
  npm.cmd audit
}

if ($CheckEnv) {
  Invoke-ReadinessStep "launch environment contract" {
    powershell -ExecutionPolicy Bypass -File .\scripts\check-env-contract.ps1 -RequiredFor vault-launch
  }
} else {
  Write-Host ""
  Write-Host "SKIP: launch environment contract (pass -CheckEnv to require it)" -ForegroundColor Yellow
}

if ($SmokeProd) {
  Invoke-ReadinessStep "production smoke" {
    powershell -ExecutionPolicy Bypass -File .\scripts\smoke-prod.ps1
  }
} else {
  Write-Host "SKIP: production smoke (pass -SmokeProd after PROD_BASE_URL is confirmed)" -ForegroundColor Yellow
}

if ($failures.Count -gt 0) {
  Write-Host ""
  Write-Host "Launch readiness failed:" -ForegroundColor Red
  $failures | ForEach-Object { Write-Host "- $_" }
  exit 1
}

Write-Host ""
Write-Host "Launch readiness audit passed." -ForegroundColor Green
