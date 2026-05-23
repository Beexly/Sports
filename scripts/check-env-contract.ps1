param(
  [ValidateSet("vault-launch", "production-smoke", "temporary-scaffold", "optional")]
  [string]$RequiredFor = "vault-launch"
)

$ErrorActionPreference = "Stop"
$contractPath = Join-Path $PSScriptRoot "..\apps\web\lib\env-contract.json"
$contract = Get-Content -LiteralPath $contractPath -Raw | ConvertFrom-Json
$requirements = $contract | Where-Object { $_.requiredFor -eq $RequiredFor }
$missing = @()

foreach ($requirement in $requirements) {
  $value = [Environment]::GetEnvironmentVariable($requirement.name)
  if ([string]::IsNullOrWhiteSpace($value)) {
    $missing += $requirement
  }
}

if ($missing.Count -gt 0) {
  Write-Host "Missing environment variables for ${RequiredFor}:" -ForegroundColor Red
  foreach ($item in $missing) {
    Write-Host ("- {0} ({1}) - {2}" -f $item.name, $item.category, $item.purpose)
  }
  exit 1
}

Write-Host "Environment contract passed for $RequiredFor." -ForegroundColor Green
