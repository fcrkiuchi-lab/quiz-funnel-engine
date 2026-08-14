[CmdletBinding()]
param(
  [ValidatePattern('^https://')]
  [string]$PagesBaseUrl = 'https://fcrkiuchi-lab.github.io/quiz-funnel-engine/',

  [ValidateRange(1, 30)]
  [int]$MaxAttempts = 12,

  [ValidateRange(1, 60)]
  [int]$RetryDelaySeconds = 10
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$previousBaseUrl = $env:BASE_URL
Push-Location $repositoryRoot

try {
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw 'Git was not found.'
  }
  if (-not (Get-Command npx.cmd -ErrorAction SilentlyContinue)) {
    throw 'npx.cmd was not found.'
  }

  $localMarker = Get-Content -LiteralPath 'release-marker.json' -Raw -Encoding utf8 | ConvertFrom-Json
  $markerUrl = $PagesBaseUrl.TrimEnd('/') + '/release-marker.json'
  $matchedAttempt = $null
  $publicMarker = $null

  for ($attempt = 1; $attempt -le $MaxAttempts; $attempt += 1) {
    try {
      $cacheBuster = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
      $publicMarker = (Invoke-WebRequest -UseBasicParsing "$markerUrl`?v=$cacheBuster" -TimeoutSec 20).Content | ConvertFrom-Json
      $matches = ($localMarker.schemaVersion -eq $publicMarker.schemaVersion) -and
        ($localMarker.generatedAt -eq $publicMarker.generatedAt) -and
        ($localMarker.branch -eq $publicMarker.branch)
      if ($matches) {
        $matchedAttempt = $attempt
        break
      }
    } catch {
      Write-Verbose $_.Exception.Message
    }
    if ($attempt -lt $MaxAttempts) {
      Start-Sleep -Seconds $RetryDelaySeconds
    }
  }

  if ($null -eq $matchedAttempt) {
    throw "GitHub Pages marker did not match within $MaxAttempts attempts."
  }

  $env:BASE_URL = $PagesBaseUrl
  & npx.cmd playwright test
  if ($LASTEXITCODE -ne 0) { throw 'Public Microsoft Edge E2E failed.' }

  $gitStatus = git status --short 2>&1
  if ($LASTEXITCODE -ne 0) { throw 'git status failed.' }
  if (-not [string]::IsNullOrWhiteSpace(($gitStatus -join "`n"))) {
    throw "Repository is not clean: $($gitStatus -join '; ')"
  }

  [pscustomobject]@{
    marker = [ordered]@{
      schemaVersion = $publicMarker.schemaVersion
      generatedAt = $publicMarker.generatedAt
      branch = $publicMarker.branch
    }
    markerAttempts = $matchedAttempt
    edgeE2E = 'passed'
    gitClean = $true
  } | ConvertTo-Json -Compress
} finally {
  if ($null -eq $previousBaseUrl) {
    Remove-Item Env:BASE_URL -ErrorAction SilentlyContinue
  } else {
    $env:BASE_URL = $previousBaseUrl
  }
  Pop-Location
}
