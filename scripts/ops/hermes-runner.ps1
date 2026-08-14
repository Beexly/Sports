# Hermes continuous runner — relaunches the agent every time it is cut off.
#
# WHY THIS EXISTS
# A coding agent cannot run for 48 hours in one session: its context fills and the
# harness cuts it. That is survivable here because handoff/LEDGER.md holds the state —
# every task is CLAIMED before work starts and DONE/BLOCKED before the next begins, so
# a fresh session resumes losslessly. What was missing was something to restart it.
#
# USAGE
#   cd C:\Users\Garrett\Sports
#   powershell -ExecutionPolicy Bypass -File scripts\ops\hermes-runner.ps1
#
# STOP IT
#   Create the file  handoff\.stop   (or press Ctrl+C)
#
# WATCH IT
#   Get-Content handoff\RUNNER.log -Wait -Tail 40

$ErrorActionPreference = "Continue"

$RepoRoot   = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$StopFile   = Join-Path $RepoRoot "handoff\.stop"
$LogFile    = Join-Path $RepoRoot "handoff\RUNNER.log"
$PromptFile = "docs/ops/hermes/RESUME.md"

# A run shorter than this means the agent died on startup, not on context.
$FastFailSeconds  = 60
$MaxFastFails     = 5
$CooldownSeconds  = 10

Set-Location $RepoRoot
New-Item -ItemType Directory -Force -Path (Join-Path $RepoRoot "handoff") | Out-Null

function Write-Log([string]$Message) {
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
  Write-Host $line
  Add-Content -Path $LogFile -Value $line
}

if (Test-Path $StopFile) {
  Remove-Item $StopFile -Force
  Write-Log "cleared a stale handoff\.stop from a previous session"
}

Write-Log "=== RUNNER START · repo=$RepoRoot · prompt=$PromptFile ==="
Write-Log "stop with: New-Item handoff\.stop"

$run       = 0
$fastFails = 0

while ($true) {
  if (Test-Path $StopFile) {
    Write-Log "handoff\.stop present — exiting cleanly after $run run(s)"
    break
  }

  $run++
  Write-Log "--- RUN $run START ---"
  $started = Get-Date

  try {
    # Hermes auto-discovers AGENTS.md at the repo root, so the laws load every run.
    # RESUME.md only has to say "recover from the ledger and keep going".
    & hermes --prompt-file $PromptFile 2>&1 | Tee-Object -FilePath $LogFile -Append
  } catch {
    Write-Log "RUN $run threw: $($_.Exception.Message)"
  }

  $elapsed = [int]((Get-Date) - $started).TotalSeconds
  Write-Log "--- RUN $run END · ${elapsed}s ---"

  # A healthy run is cut off by context after many minutes of real work. A run that
  # dies in seconds is a broken launch — bad flag, missing binary, wrong cwd — and
  # relaunching it forever would spin without ever doing anything.
  if ($elapsed -lt $FastFailSeconds) {
    $fastFails++
    Write-Log "fast exit ($elapsed s < $FastFailSeconds s) — strike $fastFails/$MaxFastFails"
    if ($fastFails -ge $MaxFastFails) {
      Write-Log "STOPPING: $MaxFastFails consecutive fast exits. The launch is broken,"
      Write-Log "not the work. Check: is 'hermes' on PATH, is the cwd correct, does"
      Write-Log "$PromptFile exist? Read the errors above this line."
      break
    }
  } else {
    if ($fastFails -gt 0) { Write-Log "healthy run — fast-fail counter reset" }
    $fastFails = 0
  }

  if (Test-Path $StopFile) {
    Write-Log "handoff\.stop appeared — exiting cleanly after $run run(s)"
    break
  }

  Write-Log "cooldown ${CooldownSeconds}s, then relaunching"
  Start-Sleep -Seconds $CooldownSeconds
}

Write-Log "=== RUNNER STOPPED after $run run(s) ==="
