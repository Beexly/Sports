# gse-truth.ps1 - deterministic ground-truth snapshot for Galaxy Sports Edge.
# No agent judgement. Same inputs => same output. Run it yourself; trust the output, not a chat message.
# Usage:  pwsh -File gse-truth.ps1        (from anywhere; assumes repo at $env:USERPROFILE\Sports)

$ErrorActionPreference = 'Continue'
$repo = "$env:USERPROFILE\Sports"
$site = 'https://www.galaxysportsedge.com'
$gh   = 'BeeXly/Sports'
Set-Location $repo

function Section($t) { "`n=== $t ===" }

Section "SNAPSHOT"
"utc            : $((Get-Date).ToUniversalTime().ToString('u'))"
"repo           : $repo"

Section "DEPLOY IDENTITY"
$health = $null
try { $health = Invoke-RestMethod "$site/api/health" -TimeoutSec 45 } catch { "health fetch FAILED: $($_.Exception.Message)" }
$mainSha = (git ls-remote origin refs/heads/main).Split()[0]
"origin/main    : $($mainSha.Substring(0,8))"
if ($health) {
  "deployed sha   : $($health.deployment.sha.Substring(0,8))"
  $drift = if ($health.deployment.sha -eq $mainSha) { 'IN SYNC' } else { 'DRIFT - prod is not main' }
  "drift          : $drift"
}
"local branch   : $(git rev-parse --abbrev-ref HEAD)"
"local dirty    : $((git status --porcelain | Measure-Object).Count) file(s)"

Section "HEALTH CAPABILITY GRAPH"
if ($health) {
  "ok=$($health.ok)  status=$($health.status)"
  foreach ($c in $health.capabilityGraph) {
    '{0,-13} {1}' -f $c.status, $c.capabilityId
  }
  if ($health.checks.ingestion.lastSuccessAt) {
    $age = [math]::Round($health.checks.ingestion.ageMinutes / 60, 1)
    "ingestion last success: $($health.checks.ingestion.lastSuccessAt)  ($age h ago)"
  }
}

Section "CRONS DECLARED vs ROUTES PRESENT"
$vj    = git show origin/main:vercel.json | ConvertFrom-Json
$declared = @($vj.crons | ForEach-Object { $_.path })
$present  = @(git ls-tree -r --name-only origin/main |
              Select-String -Pattern 'apps/web/app/api/cron/([^/]+)/route\.ts' |
              ForEach-Object { '/api/cron/' + $_.Matches[0].Groups[1].Value })
"declared in vercel.json : $($declared.Count)"
"route files on main     : $($present.Count)"
foreach ($d in $declared) { if ($present -notcontains $d) { "  DECLARED BUT NO ROUTE : $d" } }
foreach ($p in $present)  { if ($declared -notcontains $p) { "  ROUTE BUT UNSCHEDULED : $p" } }

Section "PUBLIC ROUTES (from live sitemap)"
try {
  [xml]$sm = (Invoke-WebRequest "$site/sitemap.xml" -TimeoutSec 45 -UseBasicParsing).Content
  foreach ($u in $sm.urlset.url) {
    $code = try { (Invoke-WebRequest $u.loc -TimeoutSec 25 -UseBasicParsing -MaximumRedirection 5).StatusCode } catch { $_.Exception.Response.StatusCode.value__ }
    $flag = if ($code -ne 200) { '  <-- NOT 200' } else { '' }
    '{0}  {1}{2}' -f $code, $u.loc, $flag
  }
} catch { "sitemap fetch FAILED: $($_.Exception.Message)" }

Section "PRODUCTION ENV INVENTORY"
"NOTE: Vercel returns EMPTY for vars marked Sensitive. empty here = unreadable, NOT unset."
$tmp = "$env:TEMP\gse-truth-env.local"
vercel env pull $tmp --environment=production --yes 2>&1 | Out-Null
if (Test-Path $tmp) {
  $set = 0; $blank = @()
  foreach ($line in (Get-Content $tmp)) {
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$') {
      $n = $Matches[1]; $v = $Matches[2].Trim().Trim('"')
      if ($v.Length -gt 0) { $set++ } else { $blank += $n }
    }
  }
  "readable values : $set"
  "empty/sensitive : $($blank.Count)"
  $blank | Sort-Object | ForEach-Object { "  $_" }
  Remove-Item $tmp -Force
}

Section "MODEL IDS IN CONFIG vs KNOWN RETIREMENTS"
$dead = @{
  'llama-3.3-70b-versatile'                   = '2026-08-16 -> openai/gpt-oss-120b'
  'llama-3.1-8b-instant'                      = '2026-08-16 -> openai/gpt-oss-20b'
  'qwen/qwen3-32b'                            = '2026-07-17 ALREADY DEAD'
  'meta-llama/llama-4-scout-17b-16e-instruct' = '2026-07-17 ALREADY DEAD'
  'embedding-2-preview'                       = '2026-08-10 -> gemini-embedding-2'
  'gemini-2.5-flash'                          = '2026-10-16 -> gemini-3.6-flash'
  'gemini-2.5-pro'                            = '2026-10-16 -> gemini-3.1-pro-preview'
}
$hits = 0
foreach ($id in $dead.Keys) {
  $found = git grep -l -F -- $id origin/main 2>$null
  if ($found) { $hits++; "  $id  [$($dead[$id])]"; $found | ForEach-Object { "      $_" } }
}
if ($hits -eq 0) { "  none of the known-retired IDs appear on main" }

Section "OPEN PRS"
gh pr list --repo $gh --limit 30 --json number,title,headRefName --template '{{range .}}#{{.number}}  {{.headRefName}}  {{.title}}{{"\n"}}{{end}}' 2>&1

Section "CI ON MAIN (last 5)"
gh run list --repo $gh --branch main --limit 5 2>&1

Section "END - this output is the source of truth. Paste it to any agent instead of describing the repo."
