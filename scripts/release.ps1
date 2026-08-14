[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateNotNullOrEmpty()]
  [string]$CommitMessage,

  [switch]$Publish,

  [ValidatePattern('^https://')]
  [string]$PagesBaseUrl = 'https://fcrkiuchi-lab.github.io/quiz-funnel-engine/',

  [ValidateRange(30, 600)]
  [int]$TimeoutSeconds = 180
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repositoryRoot = Split-Path -Parent $PSScriptRoot
Push-Location $repositoryRoot

try {
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw 'Git was not found.'
  }
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Node.js was not found.'
  }
  $npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if (-not $npmCommand) {
    $npmCommand = Get-Command npm -ErrorAction SilentlyContinue
  }
  if (-not $npmCommand) {
    throw 'npm was not found.'
  }

  $branch = (git branch --show-current).Trim()
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($branch)) {
    throw 'The current Git branch could not be determined.'
  }

  $marker = [ordered]@{
    schemaVersion = 1
    generatedAt = (Get-Date).ToUniversalTime().ToString('o')
    branch = $branch
  } | ConvertTo-Json
  Set-Content -LiteralPath 'release-marker.json' -Value $marker -Encoding utf8

  $changes = @(git status --short)
  if ($LASTEXITCODE -ne 0 -or $changes.Count -eq 0) {
    throw 'There are no changes to commit.'
  }
  Write-Host 'Changes to include:'
  $changes | ForEach-Object { Write-Host $_ }

  & node 'tests/calculator.test.js'
  if ($LASTEXITCODE -ne 0) { throw 'Calculator tests failed.' }
  & node 'tests/diagnosis-template.test.js'
  if ($LASTEXITCODE -ne 0) { throw 'Diagnosis template tests failed.' }
  & $npmCommand.Source run test:e2e
  if ($LASTEXITCODE -ne 0) { throw 'Browser E2E tests failed.' }

  $javaScriptFiles = @(Get-ChildItem -Path . -Recurse -File -Filter '*.js' |
    Where-Object { $_.FullName -notmatch '[\\/](\.git|node_modules|playwright-report|test-results)[\\/]' })
  foreach ($javaScriptFile in $javaScriptFiles) {
    & node --check $javaScriptFile.FullName
    if ($LASTEXITCODE -ne 0) {
      throw "JavaScript syntax check failed: $($javaScriptFile.FullName)"
    }
  }

  & git diff --check
  if ($LASTEXITCODE -ne 0) { throw 'git diff --check failed.' }

  & git add --all
  if ($LASTEXITCODE -ne 0) { throw 'git add failed.' }
  & git diff --cached --check
  if ($LASTEXITCODE -ne 0) { throw 'The staged diff check failed.' }
  & git commit -m $CommitMessage
  if ($LASTEXITCODE -ne 0) { throw 'git commit failed.' }

  $commit = (git rev-parse HEAD).Trim()
  Write-Host "Commit complete: $commit"

  if (-not $Publish) {
    Write-Host 'Publishing skipped. Push and Pages verification require -Publish.'
    return
  }

  & git push origin "HEAD:$branch"
  if ($LASTEXITCODE -ne 0) { throw 'git push failed.' }

  $remoteLine = (git ls-remote origin "refs/heads/$branch").Trim()
  if (-not $remoteLine.StartsWith($commit)) {
    throw 'The remote branch commit does not match the local commit.'
  }

  $localHash = (Get-FileHash -LiteralPath 'release-marker.json' -Algorithm SHA256).Hash
  $markerUrl = $PagesBaseUrl.TrimEnd('/') + '/release-marker.json'
  $httpClient = [System.Net.Http.HttpClient]::new()
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  $published = $false

  try {
    while ((Get-Date) -lt $deadline) {
      try {
        $cacheBuster = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
        $remoteBytes = $httpClient.GetByteArrayAsync("$markerUrl`?v=$cacheBuster").GetAwaiter().GetResult()
        $sha256 = [System.Security.Cryptography.SHA256]::Create()
        try {
          $remoteHash = [BitConverter]::ToString($sha256.ComputeHash($remoteBytes)).Replace('-', '')
        } finally {
          $sha256.Dispose()
        }
        if ($remoteHash -eq $localHash) {
          $published = $true
          break
        }
      } catch {
        Write-Verbose $_.Exception.Message
      }
      Start-Sleep -Seconds 10
    }
  } finally {
    $httpClient.Dispose()
  }

  if (-not $published) {
    throw "GitHub Pages was not verified within $TimeoutSeconds seconds."
  }
  Write-Host "GitHub Pages verified: $markerUrl"
} finally {
  Pop-Location
}
