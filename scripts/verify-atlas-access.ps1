# Verify full MongoDB Atlas terminal access after login
$atlas = 'C:\Program Files (x86)\MongoDB Atlas CLI\atlas.exe'
$ErrorActionPreference = 'Stop'

Write-Host "`n=== MongoDB Atlas Terminal Access Check ===`n" -ForegroundColor Cyan

$who = (& $atlas auth whoami 2>&1 | Out-String).Trim()
if ($LASTEXITCODE -ne 0) { throw "Not logged in. Run ATLAS_LOGIN.bat first." }
Write-Host "Account: $who" -ForegroundColor Green
if ($who -match 'eshalohiya45') { throw 'WRONG ACCOUNT — log out and use dreammantra1@gmail.com only.' }

Write-Host "`n--- Projects ---"
& $atlas projects list

Write-Host "`n--- Clusters (default project) ---"
$configPath = "$env:APPDATA\atlascli\config.toml"
$projectId = $null
if (Test-Path $configPath) {
  $cfg = Get-Content $configPath -Raw
  if ($cfg -match "project_id\s*=\s*'([^']+)'") { $projectId = $Matches[1] }
}
if (-not $projectId) {
  $json = & $atlas projects list --output json | ConvertFrom-Json
  $projectId = ($json.results | Select-Object -First 1).id
}
Write-Host "Project ID: $projectId"
& $atlas clusters list --projectId $projectId

Write-Host "`n--- Database Users ---"
& $atlas dbusers list --projectId $projectId

Write-Host "`n--- Network Access ---"
& $atlas accessLists list --projectId $projectId

Write-Host "`n--- Cluster0 Connection String ---"
& $atlas clusters connectionStrings describe Cluster0 --projectId $projectId --output json 2>$null
if ($LASTEXITCODE -ne 0) {
  & $atlas clusters connectionStrings describe cluster0 --projectId $projectId --output json 2>$null
}

Write-Host "`n=== Full Atlas terminal access confirmed ===`n" -ForegroundColor Green

# Save project id for CRM scripts
$envFile = Join-Path $PSScriptRoot '..\backend\.atlas-project'
Set-Content -Path $envFile -Value $projectId -NoNewline
Write-Host "Saved project ID to backend\.atlas-project"
