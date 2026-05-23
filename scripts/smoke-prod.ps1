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
  "/ledger"
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

if ($failures.Count -gt 0) {
  Write-Host ""
  Write-Host "Production smoke failures:"
  $failures | ForEach-Object { Write-Host "- $_" }
  exit 1
}

Write-Host ""
Write-Host "Production smoke passed."
