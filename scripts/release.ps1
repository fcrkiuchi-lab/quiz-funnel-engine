[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [Parameter(Mandatory = $true)]
  [ValidateNotNullOrEmpty()]
  [string]$CommitMessage,

  [Parameter(Mandatory = $true)]
  [ValidateNotNullOrEmpty()]
  [string[]]$AllowedPath,

  [switch]$Publish,

  [ValidatePattern('^https://')]
  [string]$PagesBaseUrl = 'https://fcrkiuchi-lab.github.io/quiz-funnel-engine/',

  [ValidateRange(1, 30)]
  [int]$MaxPublishAttempts = 12,

  [ValidateRange(1, 60)]
  [int]$PublishRetryDelaySeconds = 10
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Assert-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name was not found."
  }
}

function Get-ChangedPath {
  $paths = @(
    git diff --name-only
    git ls-files --others --exclude-standard
  ) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
  if ($LASTEXITCODE -ne 0) {
    throw 'Changed paths could not be determined.'
  }
  return @($paths | Sort-Object -Unique)
}

$repositoryRoot = Split-Path -Parent $PSScriptRoot
Push-Location $repositoryRoot

try {
  Assert-Command 'git'
  Assert-Command 'node'
  Assert-Command 'npx.cmd'
  $AllowedPath = @($AllowedPath | ForEach-Object { $_ -split ',' } | ForEach-Object { $_.Trim() } | Where-Object { $_ })
  if ($AllowedPath.Count -eq 0) {
    throw 'At least one allowed path is required.'
  }
  $protectedPaths = @(
    'diagnosis-template/config.js',
    'diagnosis-template/engine.js',
    'diagnosis-template/app.js'
  )

  & node 'tests/calculator.test.js'
  if ($LASTEXITCODE -ne 0) { throw 'Calculator tests failed.' }
  & node 'tests/diagnosis-template.test.js'
  if ($LASTEXITCODE -ne 0) { throw 'Diagnosis template tests failed.' }

  $javaScriptFiles = @(git ls-files --cached --others --exclude-standard -- '*.js')
  if ($LASTEXITCODE -ne 0) { throw 'JavaScript files could not be listed.' }
  foreach ($javaScriptFile in $javaScriptFiles) {
    & node --check $javaScriptFile
    if ($LASTEXITCODE -ne 0) {
      throw "JavaScript syntax check failed: $javaScriptFile"
    }
  }

  & git diff --cached --quiet
  if ($LASTEXITCODE -ne 0) {
    throw 'The index must be empty before release.ps1 stages the approved paths.'
  }

  $approvedPaths = @($AllowedPath + 'release-marker.json' | Sort-Object -Unique)
  $changedPaths = Get-ChangedPath
  $protectedChanges = @($changedPaths | Where-Object { $_ -in $protectedPaths })
  if ($protectedChanges.Count -gt 0) {
    throw "Protected files cannot be released: $($protectedChanges -join ', ')"
  }
  $outsideScope = @($changedPaths | Where-Object { $_ -notin $approvedPaths })
  if ($outsideScope.Count -gt 0) {
    throw "Changes outside the approved paths were found: $($outsideScope -join ', ')"
  }

  if ($WhatIfPreference) {
    & git diff --check -- $approvedPaths
    if ($LASTEXITCODE -ne 0) { throw 'git diff --check failed.' }
    $untrackedApprovedPaths = @(git ls-files --others --exclude-standard -- $approvedPaths)
    if ($LASTEXITCODE -ne 0) { throw 'Untracked approved paths could not be listed.' }
    foreach ($untrackedApprovedPath in $untrackedApprovedPaths) {
      & git diff --no-index --check -- /dev/null $untrackedApprovedPath
      if ($LASTEXITCODE -gt 1) { throw "git diff --check failed: $untrackedApprovedPath" }
    }
    [pscustomobject]@{
      mode = 'whatif'
      nodeTests = 'passed'
      javaScriptSyntax = 'passed'
      approvedPaths = $approvedPaths
      publish = $false
    } | ConvertTo-Json -Compress
    return
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

  & git diff --check -- $approvedPaths
  if ($LASTEXITCODE -ne 0) { throw 'git diff --check failed.' }
  & git add -- $approvedPaths
  if ($LASTEXITCODE -ne 0) { throw 'git add failed.' }
  & git diff --cached --check
  if ($LASTEXITCODE -ne 0) { throw 'The staged diff check failed.' }
  & git commit -m $CommitMessage
  if ($LASTEXITCODE -ne 0) { throw 'git commit failed.' }

  $commit = (git rev-parse HEAD).Trim()
  if (-not $Publish) {
    [pscustomobject]@{ mode = 'commit-only'; commit = $commit; publish = $false } | ConvertTo-Json -Compress
    return
  }

  & git push origin "HEAD:$branch"
  if ($LASTEXITCODE -ne 0) { throw 'git push failed.' }
  & "$PSScriptRoot\verify-public.ps1" -PagesBaseUrl $PagesBaseUrl -MaxAttempts $MaxPublishAttempts -RetryDelaySeconds $PublishRetryDelaySeconds
  if ($LASTEXITCODE -ne 0) { throw 'Public verification failed.' }
} finally {
  Pop-Location
}
