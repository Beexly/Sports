param(
  [ValidateSet("vault-launch", "production-smoke", "temporary-scaffold", "optional")]
  [string]$RequiredFor = "vault-launch",
  [string]$EnvFile
)

$ErrorActionPreference = "Stop"
$contractPath = Join-Path $PSScriptRoot "..\apps\web\lib\env-contract.json"
$contract = Get-Content -LiteralPath $contractPath -Raw | ConvertFrom-Json
$requirements = $contract | Where-Object { $_.requiredFor -eq $RequiredFor }
$missing = @()
$fileValues = @{}

if (-not [string]::IsNullOrWhiteSpace($EnvFile)) {
  $resolvedEnvFile = Resolve-Path -LiteralPath $EnvFile
  foreach ($line in Get-Content -LiteralPath $resolvedEnvFile) {
    $trimmed = $line.Trim()
    if ([string]::IsNullOrWhiteSpace($trimmed) -or $trimmed.StartsWith("#")) {
      continue
    }

    $parts = $trimmed.Split("=", 2)
    if ($parts.Count -ne 2) {
      continue
    }

    $name = $parts[0].Trim()
    $value = $parts[1].Trim().Trim('"').Trim("'")
    if (-not [string]::IsNullOrWhiteSpace($name)) {
      $fileValues[$name] = $value
    }
  }
}

foreach ($requirement in $requirements) {
  $value = if ($fileValues.ContainsKey($requirement.name)) {
    [string]$fileValues[$requirement.name]
  } else {
    [Environment]::GetEnvironmentVariable($requirement.name)
  }
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

if (-not [string]::IsNullOrWhiteSpace($EnvFile)) {
  Write-Host "Environment contract passed for $RequiredFor using $EnvFile." -ForegroundColor Green
} else {
  Write-Host "Environment contract passed for $RequiredFor." -ForegroundColor Green
}
