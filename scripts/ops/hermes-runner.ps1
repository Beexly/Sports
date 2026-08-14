# Hermes continuous runner - relaunches the agent every time it is cut off.
#
# WHY THIS EXISTS
# A coding agent cannot run for 48 hours in one session: its context fills and the
# harness cuts it. That is survivable here because handoff/LEDGER.md holds the state.
# Every task is CLAIMED before work starts and DONE/BLOCKED before the next begins,
# so a fresh session resumes losslessly. What was missing was something to restart it.
#
# ASCII ONLY. Windows PowerShell 5.1 reads a .ps1 with no BOM as ANSI, so any
# non-ASCII character (em dash, curly quote, arrow) is mangled into bytes that break
# the parser. Do not add one to this file.
#
# USAGE
#   cd C:\Users\Garrett\Sports
#   powershell -ExecutionPolicy Bypass -File scripts\ops\hermes-runner.ps1
#
# STOP IT
#   New-Item handoff\.stop        (or press Ctrl+C)
#
# WATCH IT
#   Get-Content handoff\RUNNER.log -Wait -Tail 40

$ErrorActionPreference = "Continue"

$RepoRoot   = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$StopFile   = Join-Path $RepoRoot "handoff\.stop"
$LogFile    = Join-Path $RepoRoot "handoff\RUNNER.log"
$PromptPath = Join-Path $RepoRoot "docs\ops\hermes\RESUME.md"

# Hermes takes the prompt as TEXT via -z, not as a file path. `hermes --help`
# lists: -z PROMPT, --cli (non-interactive), --yolo (do not stop for tool
# approval). Unattended runs need --yolo or the agent blocks on the first tool
# call and the run stalls until morning. The laws in AGENTS.md plus the ban on
# git push are what bound the risk of running that way.
#
# If a flag below is wrong for your build, this is the ONE line to change.
$HermesArgs = @("--cli", "--yolo")

# A run shorter than this means the agent died on startup, not on context.
$FastFailSeconds = 60
$MaxFastFails    = 5
$CooldownSeconds = 10

Set-Location $RepoRoot
New-Item -ItemType Directory -Force -Path (Join-Path $RepoRoot "handoff") | Out-Null

function Write-Log([string]$Message) {
    $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line  = "[" + $stamp + "] " + $Message
    Write-Host $line
    Add-Content -Path $LogFile -Value $line
}

if (Test-Path $StopFile) {
    Remove-Item $StopFile -Force
    Write-Log "cleared a stale handoff\.stop from a previous session"
}

Write-Log "=== RUNNER START ==="
Write-Log ("repo=" + $RepoRoot)
Write-Log ("prompt=" + $PromptPath)
Write-Log ("args=" + ($HermesArgs -join " "))
Write-Log "stop with: New-Item handoff\.stop"

$run       = 0
$fastFails = 0

while ($true) {

    if (Test-Path $StopFile) {
        Write-Log ("stop file present - exiting cleanly after " + $run + " run(s)")
        break
    }

    $run = $run + 1
    Write-Log ("--- RUN " + $run + " START ---")
    $started = Get-Date

    try {
        # Hermes auto-discovers AGENTS.md at the repo root, so the laws load every
        # run. RESUME.md only has to say "recover from the ledger and keep going",
        # and it is read fresh each iteration so edits take effect on the next run
        # without restarting this loop.
        $PromptText = Get-Content -Path $PromptPath -Raw
        & hermes @HermesArgs -z $PromptText 2>&1 | Tee-Object -FilePath $LogFile -Append
    }
    catch {
        Write-Log ("RUN " + $run + " threw: " + $_.Exception.Message)
    }

    $elapsed = [int]((Get-Date) - $started).TotalSeconds
    Write-Log ("--- RUN " + $run + " END after " + $elapsed + "s ---")

    # A healthy run is cut off by context after many minutes of real work. A run that
    # dies in seconds is a broken launch - binary not on PATH, wrong cwd, bad flag -
    # and relaunching that forever would spin all night doing nothing.
    if ($elapsed -lt $FastFailSeconds) {
        $fastFails = $fastFails + 1
        Write-Log ("fast exit: " + $elapsed + "s under " + $FastFailSeconds + "s threshold - strike " + $fastFails + " of " + $MaxFastFails)
        if ($fastFails -ge $MaxFastFails) {
            Write-Log ("STOPPING: " + $MaxFastFails + " consecutive fast exits.")
            Write-Log "The launch is broken, not the work. Check: is 'hermes' on PATH,"
            Write-Log "is the working directory correct, does the prompt file exist?"
            Write-Log "Read the errors above this line."
            break
        }
    }
    else {
        if ($fastFails -gt 0) {
            Write-Log "healthy run - fast-fail counter reset"
        }
        $fastFails = 0
    }

    if (Test-Path $StopFile) {
        Write-Log ("stop file appeared - exiting cleanly after " + $run + " run(s)")
        break
    }

    Write-Log ("cooldown " + $CooldownSeconds + "s, then relaunching")
    Start-Sleep -Seconds $CooldownSeconds
}

Write-Log ("=== RUNNER STOPPED after " + $run + " run(s) ===")
