param(
  [string]$BaseUrl = $env:PROD_BASE_URL
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($BaseUrl)) {
  Write-Host "PROD_BASE_URL is required, for example https://galaxysportsedge.com"
  exit 2
}

$base = $BaseUrl.TrimEnd("/")
$paths = @(
  "/",
  "/vault",
  "/vault?cancel=true",
  "/vault?source=smoke-prod",
  "/methodology",
  "/loss-room",
  "/passes",
  "/ledger",
  "/api/vault/seat-count",
  "/api/proof/freshness"
)

$jsonChecks = @(
  @{
    Path = "/api/health"
    Required = @('"ok":true', '"service":"galaxy-sports-edge-web"')
  },
  @{
    Path = "/api/vault/seat-count"
    Required = @('"cap":1000', '"remaining"')
  },
  @{
    Path = "/api/proof/freshness"
    Required = @('"surfaces"', '"methodology"')
  }
)

$failures = @()

foreach ($path in $paths) {
  $url = "$base$path"

  try {
    $response = Invoke-WebRequest -Uri $url -Method Get -MaximumRedirection 5 -TimeoutSec 20 -UseBasicParsing
    $status = [int]$response.StatusCode

    if ($status -lt 200 -or $status -ge 400) {
      $failures += "$url returned HTTP $status"
      Write-Host "FAIL $status $url"
    } else {
      Write-Host "PASS $status $url"
    }
  } catch {
    $failures += "$url failed: $($_.Exception.Message)"
    Write-Host "FAIL $url"
  }
}

foreach ($check in $jsonChecks) {
  $url = "$base$($check.Path)"

  try {
    $response = Invoke-WebRequest -Uri $url -Method Get -MaximumRedirection 5 -TimeoutSec 20 -UseBasicParsing
    $status = [int]$response.StatusCode
    $body = [string]$response.Content

    if ($status -lt 200 -or $status -ge 400) {
      $failures += "$url returned HTTP $status"
      Write-Host "FAIL $status $url"
      continue
    }

    $missing = @()
    foreach ($required in $check.Required) {
      if (-not $body.Contains($required)) {
        $missing += $required
      }
    }

    if ($missing.Count -gt 0) {
      $failures += "$url response missing required marker(s): $($missing -join ', ')"
      Write-Host "FAIL JSON $url"
    } else {
      Write-Host "PASS JSON $url"
    }
  } catch {
    $failures += "$url failed: $($_.Exception.Message)"
    Write-Host "FAIL $url"
  }
}

if ($failures.Count -gt 0) {
  Write-Host ""
  Write-Host "Production smoke failures:"
  $failures | ForEach-Object { Write-Host "- $_" }
  exit 1
}

Write-Host ""
Write-Host "Production smoke passed."
