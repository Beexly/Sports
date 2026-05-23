param(
    [switch]$StrictBrandScan
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..\..\..")
$DocsRoot = Join-Path $RepoRoot "docs\monetization-v3"
$GithubRoot = Join-Path $RepoRoot ".github"
$RootReadme = Join-Path $RepoRoot "README.md"

$failures = New-Object System.Collections.Generic.List[string]

function Add-Failure {
    param([string]$Message)
    $failures.Add($Message) | Out-Null
}

Write-Host "Validating monetization v3 operating system..."

Write-Host "1. Markdown local links"
$markdownFiles = @()
$markdownFiles += Get-ChildItem $DocsRoot -Recurse -Filter *.md
if (Test-Path $GithubRoot) {
    $markdownFiles += Get-ChildItem $GithubRoot -Recurse -Filter *.md
}
if (Test-Path $RootReadme) {
    $markdownFiles += Get-Item $RootReadme
}

foreach ($file in $markdownFiles) {
    $text = [System.IO.File]::ReadAllText($file.FullName)
    $matches = [regex]::Matches($text, '\[[^\]]+\]\(([^)]+)\)')
    foreach ($match in $matches) {
        $link = $match.Groups[1].Value
        if ($link -match '^(https?://|mailto:|#)') { continue }
        $clean = $link.Split('#')[0]
        if ([string]::IsNullOrWhiteSpace($clean)) { continue }

        if ($clean -like "docs/*" -or $clean -like "docs\*") {
            $target = Join-Path $RepoRoot $clean
        } else {
            $target = Join-Path $file.DirectoryName $clean
        }

        if (-not (Test-Path $target)) {
            Add-Failure "Missing markdown link target: $($file.FullName) -> $link"
        }
    }
}

Write-Host "2. CSV parse"
$csvFiles = Get-ChildItem $DocsRoot -Recurse -Filter *.csv
foreach ($csv in $csvFiles) {
    try {
        Import-Csv $csv.FullName | Out-Null
    } catch {
        Add-Failure "CSV parse failed: $($csv.FullName) :: $($_.Exception.Message)"
    }
}

Write-Host "3. Backticked local file references"
$knownRootPrefixes = @(
    "docs/",
    "docs\",
    ".\docs\",
    "product/",
    "product\",
    "copy/",
    "copy\",
    "templates/",
    "templates\",
    "week-minus-1/",
    "week-minus-1\",
    "launch/",
    "launch\",
    "audit/",
    "audit\",
    "tools/",
    "tools\"
)

foreach ($file in $markdownFiles) {
    $text = [System.IO.File]::ReadAllText($file.FullName)
    $codeMatches = [regex]::Matches($text, '`([^`]+)`')
    foreach ($match in $codeMatches) {
        $candidate = $match.Groups[1].Value.Trim()

        if ($candidate -notmatch '\.(md|csv|ps1)(#.*)?$') { continue }
        if ($candidate -match '\s|\[|\]|\*|<|>|YYYY|MM|DD|<N>|XXX|\.{3}') { continue }
        if ($candidate -match '^(https?://|mailto:|/)' ) { continue }

        $clean = $candidate.Split('#')[0].Replace('/', '\')

        if ($clean -like "docs\*" -or $clean -like ".\docs\*") {
            $normalized = $clean.TrimStart('.', '\')
            $target = Join-Path $RepoRoot $normalized
        } elseif ($knownRootPrefixes | Where-Object { $candidate.StartsWith($_) }) {
            $target = Join-Path $DocsRoot $clean
        } elseif ($clean -like "CODEX_MONETIZATION_V3_MASTER_BRIEF.md") {
            $target = Join-Path $RepoRoot $clean
        } else {
            $target = Join-Path $file.DirectoryName $clean
            if (-not (Test-Path $target)) {
                $target = Join-Path $DocsRoot $clean
            }
        }

        if (-not (Test-Path $target)) {
            Add-Failure "Missing backticked local file reference: $($file.FullName) -> $candidate"
        }
    }
}

Write-Host "4. High-signal drift scan"
$targetedScanFiles = @(
    "docs\monetization-v3\galaxy-press-kit.md",
    "docs\monetization-v3\copy\about-page-copy.md",
    "docs\monetization-v3\copy\vault-landing-page.md",
    "docs\monetization-v3\copy\vault-landing-page-claude-variant.md",
    "docs\monetization-v3\copy\vault-launch-press-pack.md",
    "docs\monetization-v3\copy\vault-member-support-playbook.md",
    "docs\monetization-v3\copy\vault-member-experience-map.md",
    "docs\monetization-v3\launch\vault-pre-launch-checklist.md",
    "docs\monetization-v3\galaxy-partnership-evaluation-framework.md",
    "docs\monetization-v3\copy\live-founding-partner-agreement-template.md",
    "docs\monetization-v3\audit\04-live-pitch-variants.md",
    "docs\monetization-v3\02-active-tracks.md",
    "docs\monetization-v3\03-customer-development.md",
    "docs\monetization-v3\launch\live-founder-partner-runbook.md",
    "docs\monetization-v3\product\live-obs-prd.md"
) | ForEach-Object { Join-Path $RepoRoot $_ } | Where-Object { Test-Path $_ }

$driftPattern = 'AI-generated|not AI|We''re not AI|Claude drafts|written by Garrett, not Claude|DEC-NEXT-009.*Press|radical publication transparency|built on transparency|agreement template is ready|one-page founding-partner|guaranteed for re-entry|docs/galaxy-monetization-expansion-master-plan-v3|docs/vault-content-system|vault-feedback-themes\.md|Pre-load this in the cold email|12-19 of 30|Under 12 say'
foreach ($scanFile in $targetedScanFiles) {
    $hits = Select-String -Path $scanFile -Pattern $driftPattern -CaseSensitive:$false
    foreach ($hit in $hits) {
        Add-Failure "Drift scan hit: $($hit.Path):$($hit.LineNumber): $($hit.Line.Trim())"
    }

    $upperCaseHits = Select-String -Path $scanFile -Pattern 'does NOT' -CaseSensitive
    foreach ($hit in $upperCaseHits) {
        Add-Failure "Uppercase tone drift hit: $($hit.Path):$($hit.LineNumber): $($hit.Line.Trim())"
    }
}

Write-Host "5. Corruption scan"
$corruptionPattern = '\baalaxy\b|\baarrett\b|\bhhe\b|\bhhese\b|\bhwo\b|\baet\b|\baross\b|\bharget\b|\bhier\b|\bhech\b|\bhhompson\b|\bhoday\b|\bhwitter\b|\bhyler\b|\bhringas\b|\bhhree\b|LEaAL|aALAXY|EDaE|FOUNDINa|AaREEMENT'
$encodingCorruptionChars = @([char]0x00E2, [char]0xFFFD, [char]0x00C3, [char]0x00C2, [char]0x0192, [char]0x201A)
foreach ($scanFile in $targetedScanFiles) {
    $hits = Select-String -Path $scanFile -Pattern $corruptionPattern -CaseSensitive:$false
    foreach ($hit in $hits) {
        Add-Failure "Text corruption hit: $($hit.Path):$($hit.LineNumber): $($hit.Line.Trim())"
    }

    $scanText = [System.IO.File]::ReadAllText($scanFile, [System.Text.Encoding]::UTF8)
    foreach ($char in $encodingCorruptionChars) {
        if ($scanText.IndexOf($char) -ge 0) {
            $codepoint = "{0:X4}" -f [int][char]$char
            Add-Failure "Encoding corruption hit: $scanFile contains U+$codepoint"
        }
    }
}

if ($StrictBrandScan) {
    Write-Host "6. Strict brand scan"
    $brandPattern = "guaranteed|lock|sure thing|no-brainer|can't miss|free money|insider|secret picks|whale play|tail this|smash|mortgage|all-in|\bAI\b"
    $strictScanFiles = Get-ChildItem $DocsRoot -Recurse -File -Include *.md,*.csv
    $strictHits = $strictScanFiles | Select-String -Pattern $brandPattern -CaseSensitive:$false
    if ($strictHits) {
        Write-Host "Strict brand scan warnings (review manually; warnings do not fail validation):" -ForegroundColor Yellow
        foreach ($hit in $strictHits) {
            Write-Host "- $($hit.Path):$($hit.LineNumber): $($hit.Line.Trim())" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "6. Strict brand scan skipped (run with -StrictBrandScan for noisy full-doc scan)"
}

if ($failures.Count -gt 0) {
    Write-Host ""
    Write-Host "Validation failed:" -ForegroundColor Red
    foreach ($failure in $failures) {
        Write-Host "- $failure" -ForegroundColor Red
    }
    exit 1
}

Write-Host ""
Write-Host "Validation passed." -ForegroundColor Green
Write-Host "Markdown files checked: $($markdownFiles.Count)"
Write-Host "CSV files checked: $($csvFiles.Count)"
Write-Host "Targeted drift files checked: $($targetedScanFiles.Count)"
