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

# --in DIR sets the agent's working directory. Without it hermes inherits
# whatever cwd it feels like (observed: C:\Users\Garrett) and every npm/git
# command it runs fails exactly the way a shell in the wrong folder does.
#
# --cli is non-interactive, --yolo stops it blocking on tool approval. An
# unattended run needs both, or it sits at a prompt until morning. What bounds
# that risk is AGENTS.md carrying the nine laws into every session plus the
# standing ban on git push - nothing reaches GitHub without review.
#
# If a flag is wrong for your build, this is the ONE line to change.
$HermesArgs = @("--cli", "--yolo", "--in", $RepoRoot)

# WHICH QUEUE THIS RUNNER DRIVES.
#
# This used to be hardcoded to RESUME.md + handoff/LEDGER.md, which silently
# sent the agent to the OLD workflow no matter which queue you meant to run.
# Launching it during the 2026-08-21 overnight run would have abandoned that
# queue's remaining tasks and worked something else entirely, with --yolo set
# so nothing would have stopped to ask. Point it at the queue you mean.
#
# Set $QueueDoc to the queue this run should work. Both files it names must
# exist or preflight refuses to launch (see $RequiredFiles below).
$QueueDoc = "docs/ops/hermes/OVERNIGHT-2026-08-21-QUEUE.md"

# ABSOLUTE paths in the prompt, deliberately.
#
# Relative paths failed in practice on 2026-08-21: preflight's Test-Path found
# all three files from $RepoRoot and hermes still reported "does not exist" for
# two of them, having read a third from the same directory. Whatever --in does,
# it is not reliably the root that the agent's file reads resolve against, and
# an agent that cannot read its own queue burns a run per cooldown looking
# healthy. Absolute paths remove the question entirely.
$QueueAbs  = (Join-Path $RepoRoot ($QueueDoc -replace '/', '\'))
$AgentsAbs = (Join-Path $RepoRoot "AGENTS.md")
$ClaudeAbs = (Join-Path $RepoRoot "CLAUDE.md")

# ONE LINE, deliberately. A multi-line string does not survive PowerShell's
# handoff to a native .exe - the argument arrives mangled or empty, hermes
# treats it as no prompt at all, and drops into its interactive TUI where it
# waits forever for a human. The full instructions live in the queue doc; this
# line only has to point the agent at them. Keep it ASCII-only.
$Prompt = "Your working directory is $RepoRoot. Read the file at $QueueAbs in full and follow its THE LOOP section exactly, one task per cycle. Then read $AgentsAbs and $ClaudeAbs for your laws. The queue's NON-NEGOTIABLE section overrides anything you think would be better. Recover any CLAIMED task per that file's interrupted-CLAIMED rule. Use absolute paths under $RepoRoot for every file you read or write. Report only what a command's real exit code proves; if you cannot verify something, write BLOCKED with the actual error text. Work the loop continuously without stopping and without asking questions."

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
Write-Log ("cwd-flag=" + $RepoRoot)
Write-Log ("args=" + ($HermesArgs -join " "))
Write-Log "stop with: New-Item handoff\.stop"

# PREFLIGHT.
#
# RUN 3 on 2026-08-13 is why this block exists. Hermes launched cleanly, found
# neither docs\ops\hermes\RESUME.md nor handoff\LEDGER.md - they were on a branch
# this checkout was not sitting on - concluded there was no backlog to work,
# went looking for work elsewhere on the disk, and spent 17 minutes auditing an
# unrelated project. It ran 999 seconds, so the fast-fail guard below never
# fired. A broken launch that LOOKS healthy is worse than one that crashes: the
# loop relaunches it every 10 seconds, all night, doing nothing that was asked
# for. Catch it here, before the burn.

# Preflight refuses to launch if any of these is missing. The queue doc is in
# the list because launching without it is the failure this runner exists to
# prevent: the agent starts, finds no instructions, and burns a run looking
# healthy while doing nothing useful.
$RequiredFiles = @(
    "AGENTS.md",
    "CLAUDE.md",
    ($QueueDoc -replace '/', '\')
)

$branch = (& git rev-parse --abbrev-ref HEAD 2>$null)
if ($branch) { Write-Log ("branch=" + $branch) }

$missing = @()
foreach ($rel in $RequiredFiles) {
    if (-not (Test-Path (Join-Path $RepoRoot $rel))) { $missing += $rel }
}

if ($missing.Count -gt 0) {
    Write-Log "PREFLIGHT FAILED - not launching."
    foreach ($rel in $missing) { Write-Log ("  missing: " + $rel) }
    Write-Log "These files ARE the agent's instructions and backlog. Without them"
    Write-Log "it has nothing to work from and will invent its own task list."
    Write-Log "They live on branch claude/fable-5-ultracode-plan-ptru4e. MERGE it,"
    Write-Log "do not check it out - this branch may hold commits that branch does"
    Write-Log "not, and switching hides them. From this repo root:"
    Write-Log "  git add -A"
    Write-Log "  git commit -m 'wip: uncommitted work from a cut-off run'"
    Write-Log "  git fetch origin claude/fable-5-ultracode-plan-ptru4e"
    Write-Log "  git merge origin/claude/fable-5-ultracode-plan-ptru4e --no-edit"
    Write-Log "(--no-edit matters: without it git opens vim and waits forever.)"
    Write-Log "Then start this runner again."
    exit 1
}

# A previous run can patch files and be cut off by context before it commits.
# That work is real, it is live in the tree right now, and the next thing that
# runs git reset or git checkout destroys it. Say so at launch, every time.
$dirty = (& git status --porcelain 2>$null)
if ($dirty) {
    $dirtyCount = ($dirty | Measure-Object).Count
    Write-Log ("WARNING: working tree has " + $dirtyCount + " uncommitted change(s).")
    Write-Log "If a previous run patched files and did not commit, that is this."
    Write-Log "Commit or stash it before it is lost. Listing:"
    foreach ($line in $dirty) { Write-Log ("  " + $line) }
}

Write-Log "preflight OK"

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
        # ForEach-Object, not Tee-Object. Tee buffers a native executable's
        # output and only flushes when the process exits, so a working agent
        # looks identical to a hung one for the whole session - which is exactly
        # the ambiguity this loop exists to remove. ForEach-Object handles each
        # line as it arrives, so the console shows progress live.
        & hermes @HermesArgs -z $Prompt 2>&1 | ForEach-Object {
            $text = [string]$_
            Write-Host $text
            Add-Content -Path $LogFile -Value $text
        }
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
