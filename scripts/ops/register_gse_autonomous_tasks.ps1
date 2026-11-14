<#
.SYNOPSIS
Registers idempotent Windows Scheduled Tasks for the GSE Site-Wide Autonomous
Workflow Fabric and the disjoint Shard A (sha256[0] in 4..7) extractor worker,
plus optional GCP Cloud Scheduler Always-Free (<= 3 jobs) configuration.

.PARAMETER ModelLane
Inference lane: free | deepseek_1017 | gcp_credit | jules | hybrid_auto.

.PARAMETER ConfigureGcpScheduler
When passed, provisions up to 3 Cloud Scheduler Always-Free jobs in project `galaxysportsedge`.
#>
[CmdletBinding()]
param(
  [ValidateSet("free", "deepseek_1017", "gcp_credit", "jules", "hybrid_auto")]
  [string]$ModelLane = "hybrid_auto",

  [string]$RepoRoot = "C:\Users\Garrett\Sports_prepack_audit_wt",

  [switch]$ConfigureGcpScheduler
)

$ErrorActionPreference = "Stop"

$PythonExe = if (Get-Command python -ErrorAction SilentlyContinue) { (Get-Command python).Source } else { "python" }
$FabricScript = Join-Path $RepoRoot "intelligence\ops\gse_autonomous_platform_fabric.py"
$ExtractorScript = Join-Path $RepoRoot "intelligence\foundry_bridge\multi_lane_sovereign_extractor.py"
$LogDir = Join-Path $RepoRoot "reports\autonomous-logs"
if (-not (Test-Path $LogDir)) {
  New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

function Register-GseTask {
  param(
    [string]$TaskName,
    [string]$Arguments,
    [TimeSpan]$RepeatInterval,
    [string]$Description
  )
  $Action = New-ScheduledTaskAction -Execute $PythonExe -Argument $Arguments -WorkingDirectory $RepoRoot
  $Trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(2) -RepetitionInterval $RepeatInterval -RepetitionDuration ([TimeSpan]::FromDays(3650))
  $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew
  Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description $Description -Force | Out-Null
  Write-Host "[GSE-Scheduler] Registered Windows Scheduled Task: $TaskName (every $($RepeatInterval.TotalMinutes)m)"
}

Register-GseTask `
  -TaskName "GSE-SiteWide-Autonomous-Fabric" `
  -Arguments "`"$FabricScript`" --model-lane $ModelLane --suite all --week auto --jules-audit" `
  -RepeatInterval ([TimeSpan]::FromHours(2)) `
  -Description "Runs all 23 council seats, 21 subagents, 10 DESTROY seats, 8 war-room watchers, 14 workflows, and Jules audit."

Register-GseTask `
  -TaskName "GSE-Foundry-ShardA-4to7-Worker" `
  -Arguments "`"$ExtractorScript`" --partition 4-7 --lane $ModelLane --max-books 10" `
  -RepeatInterval ([TimeSpan]::FromMinutes(45)) `
  -Description "Zero-collision Tier-A Shard A (sha256[0] in 4..7) Sovereign Extractor (never collides with hermes-inline 0..3)."

if ($ConfigureGcpScheduler) {
  Write-Host "[GSE-Scheduler] Configuring GCP Cloud Scheduler Always-Free tier (max 3 jobs in galaxysportsedge)..."
  $TargetBase = if ($env:CRON_TARGET_URL) { $env:CRON_TARGET_URL.TrimEnd("/") } else { "https://www.galaxysportsedge.com" }
  if (-not $env:CRON_SECRET) {
    Write-Warning "CRON_SECRET not set in environment; skipping live gcloud scheduler HTTP job creation to avoid storing empty bearer tokens."
    return
  }

  $Jobs = @(
    @{ Name = "gse-site-wide-fabric-utc"; Schedule = "12 0,3,6,13,16,19,22 * * *"; Uri = "$TargetBase/api/cron/site-wide-workflows?lane=$ModelLane&dryRun=0&execute=1" },
    @{ Name = "gse-corpus-calibration-watch"; Schedule = "30 15 * * *"; Uri = "$TargetBase/api/cron/site-wide-workflows?lane=$ModelLane&workflows=calibration,source-intelligence" }
  )

  foreach ($Job in $Jobs) {
    $Existing = gcloud scheduler jobs list --project=galaxysportsedge --location=us-central1 --format="value(name)" 2>$null
    $Verb = if ($Existing -and ($Existing -split "`n" | Where-Object { $_ -like "*$($Job.Name)" })) { "update" } else { "create" }
    gcloud scheduler jobs $Verb http $Job.Name `
      --project=galaxysportsedge `
      --location=us-central1 `
      --schedule="$($Job.Schedule)" `
      --time-zone="UTC" `
      --uri="$($Job.Uri)" `
      --http-method=GET `
      --headers="Authorization=Bearer $($env:CRON_SECRET)"
    Write-Host "[GSE-Scheduler] Cloud Scheduler $($Job.Name) ($Verb) synced."
  }
}
