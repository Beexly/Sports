[CmdletBinding()]
param(
    [Parameter()]
    [string]$RepoPath = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path,

    [Parameter()]
    [string]$RuntimePath = (Join-Path $RepoPath ".nova-runtime"),

    [Parameter()]
    [ValidateRange(1, 50)]
    [int]$MaxSources = 12,

    [Parameter()]
    [ValidateRange(1, 50)]
    [int]$RequestBudget = 12,

    [Parameter()]
    [ValidateRange(1048576, 104857600)]
    [long]$ByteBudget = 12582912
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Node = (Get-Command node -ErrorAction Stop).Source
$Cycle = Join-Path $RepoPath "scripts\nova\run-cycle.mjs"
$LogDirectory = Join-Path $RuntimePath "logs"
$LogPath = Join-Path $LogDirectory ("nova-cycle-{0}.log" -f (Get-Date -Format "yyyy-MM-dd"))

if (-not (Test-Path -LiteralPath $Cycle -PathType Leaf)) {
    throw "NOVA cycle script not found: $Cycle"
}

New-Item -ItemType Directory -Path $LogDirectory -Force | Out-Null
Set-Location -LiteralPath $RepoPath

$StartedAt = Get-Date
"[$($StartedAt.ToString('o'))] NOVA cycle starting. Repo=$RepoPath Runtime=$RuntimePath" | Add-Content -LiteralPath $LogPath

$Arguments = @(
    $Cycle,
    "--runtime-dir", $RuntimePath,
    "--max-sources", $MaxSources,
    "--request-budget", $RequestBudget,
    "--byte-budget", $ByteBudget
)

try {
    & $Node @Arguments 2>&1 | Tee-Object -FilePath $LogPath -Append
    $ExitCode = $LASTEXITCODE
}
catch {
    $_ | Out-String | Add-Content -LiteralPath $LogPath
    $ExitCode = 1
}

$CompletedAt = Get-Date
"[$($CompletedAt.ToString('o'))] NOVA cycle completed. ExitCode=$ExitCode DurationSeconds=$([math]::Round(($CompletedAt - $StartedAt).TotalSeconds, 2))" | Add-Content -LiteralPath $LogPath
exit $ExitCode
