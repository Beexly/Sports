[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = "High")]
param(
    [Parameter()]
    [string]$RepoPath = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path,

    [Parameter()]
    [string]$TaskName = "GSE-NOVA-Opportunity-Intelligence",

    [Parameter()]
    [ValidateRange(0, 23)]
    [int]$StartHour = 7,

    [Parameter()]
    [ValidateRange(0, 59)]
    [int]$StartMinute = 17,

    [Parameter()]
    [ValidateSet(4, 6, 8, 12, 24)]
    [int]$RepeatEveryHours = 6,

    [Parameter()]
    [switch]$Install
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Wrapper = Join-Path $RepoPath "scripts\nova\run-cycle.ps1"
if (-not (Test-Path -LiteralPath $Wrapper -PathType Leaf)) {
    throw "NOVA Windows wrapper not found: $Wrapper"
}

$PowerShell = (Get-Command powershell.exe -ErrorAction Stop).Source
$CurrentIdentity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$StartAt = (Get-Date).Date.AddHours($StartHour).AddMinutes($StartMinute)
if ($StartAt -le (Get-Date)) {
    $StartAt = $StartAt.AddDays(1)
}

$QuotedWrapper = '"{0}"' -f $Wrapper
$QuotedRepo = '"{0}"' -f $RepoPath
$ActionArguments = "-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $QuotedWrapper -RepoPath $QuotedRepo"

$Action = New-ScheduledTaskAction -Execute $PowerShell -Argument $ActionArguments -WorkingDirectory $RepoPath
$Trigger = New-ScheduledTaskTrigger -Once -At $StartAt `
    -RepetitionInterval (New-TimeSpan -Hours $RepeatEveryHours) `
    -RepetitionDuration (New-TimeSpan -Days 3650)
$Principal = New-ScheduledTaskPrincipal -UserId $CurrentIdentity -LogonType Interactive -RunLevel Limited
$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -MultipleInstances IgnoreNew `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

$Definition = New-ScheduledTask -Action $Action -Trigger $Trigger -Principal $Principal -Settings $Settings `
    -Description "Read-only, zero-cash NOVA AI ecosystem monitoring. Writes local receipts only; no install, deploy, publish, spend, application, or outreach authority."

$Preview = [pscustomobject]@{
    TaskName = $TaskName
    User = $CurrentIdentity
    FirstRun = $StartAt
    RepeatEveryHours = $RepeatEveryHours
    PowerShell = $PowerShell
    Wrapper = $Wrapper
    RepoPath = $RepoPath
    RunLevel = "Limited"
    NetworkBehavior = "Allowlisted HTTPS GET only"
    LocalWrites = (Join-Path $RepoPath ".nova-runtime")
}

$Preview | Format-List

if (-not $Install) {
    Write-Host "Preview only. Re-run with -Install and approve the confirmation prompt to register the task."
    exit 0
}

if ($PSCmdlet.ShouldProcess($TaskName, "Register or replace the NOVA scheduled task")) {
    Register-ScheduledTask -TaskName $TaskName -InputObject $Definition -Force | Out-Null
    $Registered = Get-ScheduledTask -TaskName $TaskName
    Write-Host "Registered $TaskName in state $($Registered.State)."
    Write-Host "The task will first run at $StartAt and repeat every $RepeatEveryHours hours while the user session is available."
}
