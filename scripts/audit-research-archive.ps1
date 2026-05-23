param(
  [Parameter(Mandatory = $true)]
  [string]$ZipPath,

  [string]$OutputPath
)

$ErrorActionPreference = "Stop"
$resolvedZip = Resolve-Path -LiteralPath $ZipPath
$hash = Get-FileHash -LiteralPath $resolvedZip.Path -Algorithm SHA256
$workDir = Join-Path $env:TEMP ("galaxy-archive-audit-" + [Guid]::NewGuid().ToString("N"))
$textExtensions = @(
  ".c", ".cpp", ".cs", ".css", ".csv", ".dart", ".go", ".html", ".java",
  ".js", ".json", ".kt", ".lua", ".md", ".php", ".py", ".rb", ".rs",
  ".scss", ".sh", ".swift", ".ts", ".tsx", ".txt", ".xml", ".yml", ".yaml"
)

try {
  New-Item -ItemType Directory -Path $workDir | Out-Null
  Expand-Archive -LiteralPath $resolvedZip.Path -DestinationPath $workDir -Force
  $files = Get-ChildItem -Path $workDir -Recurse -File
  $records = foreach ($file in $files) {
    $relative = $file.FullName.Substring($workDir.Length + 1)
    $extension = $file.Extension.ToLowerInvariant()
    $isText = $textExtensions -contains $extension -or $file.Name -eq ".gitkeep"
    $lineCount = $null

    if ($isText) {
      try {
        $lineCount = (Get-Content -LiteralPath $file.FullName -ErrorAction Stop | Measure-Object -Line).Lines
      } catch {
        $isText = $false
      }
    }

    [pscustomobject]@{
      path = $relative
      bytes = $file.Length
      extension = if ($extension) { $extension } else { "[noext]" }
      text = $isText
      lines = $lineCount
    }
  }

  $summary = [pscustomobject]@{
    zipPath = $resolvedZip.Path
    sha256 = $hash.Hash
    auditedAt = (Get-Date).ToUniversalTime().ToString("o")
    fileCount = @($records).Count
    textFileCount = @($records | Where-Object { $_.text }).Count
    totalTextLines = (($records | Where-Object { $_.text } | Measure-Object -Property lines -Sum).Sum)
    totalBytes = (($records | Measure-Object -Property bytes -Sum).Sum)
    files = $records
  }

  $json = $summary | ConvertTo-Json -Depth 5

  if ($OutputPath) {
    $outputFullPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputPath)
    $parent = Split-Path -Parent $outputFullPath
    if ($parent -and -not (Test-Path -LiteralPath $parent)) {
      New-Item -ItemType Directory -Path $parent | Out-Null
    }
    Set-Content -LiteralPath $outputFullPath -Value $json -Encoding UTF8
    Write-Host "Archive audit written to $outputFullPath"
  } else {
    $json
  }
} finally {
  if (Test-Path -LiteralPath $workDir) {
    Remove-Item -LiteralPath $workDir -Recurse -Force
  }
}
