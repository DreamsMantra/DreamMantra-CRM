# Finish Atlas setup using Atlas CLI (must be logged in as dreammantra1@gmail.com)
$ErrorActionPreference = 'Stop'
$atlas = 'C:\Program Files (x86)\MongoDB Atlas CLI\atlas.exe'
$root = Split-Path $PSScriptRoot -Parent
$envPath = Join-Path $root 'backend\.env'
$dbUser = 'dreammantra_crm'
$dbName = 'dreammantra_crm'
$clusterName = 'Cluster0'

function Invoke-AtlasJson($atlasArgs) {
  $out = & $atlas --output json @atlasArgs 2>&1
  if ($LASTEXITCODE -ne 0) { throw ($out | Out-String) }
  if ($out -is [array]) { $out = $out -join "`n" }
  return $out | ConvertFrom-Json
}

$whoami = & $atlas auth whoami 2>&1 | Out-String
if ($LASTEXITCODE -ne 0) { throw "Atlas CLI not logged in. Run LOGIN_ATLAS.bat first." }
Write-Host "Atlas account: $($whoami.Trim())"
if ($whoami -match 'eshalohiya45') { throw 'Wrong account! Log out and use dreammantra1@gmail.com only.' }

$projects = Invoke-AtlasJson @('projects', 'list')
$projectList = @($projects.results)
if (-not $projectList.Count) { throw 'No Atlas projects found.' }
$project = $projectList | Where-Object { $_.name -match 'Project 0|Dream Mantra' } | Select-Object -First 1
if (-not $project) { $project = $projectList[0] }
$projectId = $project.id
Write-Host "Project: $($project.name) ($projectId)"

$clusters = Invoke-AtlasJson @('clusters', 'list', '--projectId', $projectId)
$clusterList = @($clusters.results)
$cluster = $clusterList | Where-Object { $_.name -eq $clusterName } | Select-Object -First 1
if (-not $cluster) { $cluster = $clusterList[0]; $clusterName = $cluster.name }
Write-Host "Cluster: $clusterName ($($cluster.stateName))"

# Network access
try {
  $access = Invoke-AtlasJson @('accessLists', 'list', '--projectId', $projectId)
  $hasOpen = @($access.results) | Where-Object { $_.cidrBlock -eq '0.0.0.0/0' }
  if (-not $hasOpen) {
    & $atlas accessLists create '0.0.0.0/0' --type cidrBlock --comment 'Dream Mantra CRM' --projectId $projectId | Out-Null
    Write-Host 'Network access: added 0.0.0.0/0'
  } else {
    Write-Host 'Network access: 0.0.0.0/0 already allowed'
  }
} catch {
  Write-Host "Network access warning: $_"
}

# DB user password
$password = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 24 | ForEach-Object { [char]$_ })
$passFile = Join-Path $root 'backend\.atlas-db-password.txt'
Set-Content -Path $passFile -Value $password -NoNewline
Write-Host "Generated DB password saved to backend\.atlas-db-password.txt"

try {
  & $atlas dbusers delete $dbUser --projectId $projectId --force 2>$null | Out-Null
} catch { }

& $atlas dbusers create readWriteAnyDatabase `
  --username $dbUser `
  --password $password `
  --projectId $projectId | Out-Null
Write-Host "Database user: $dbUser"

$conn = Invoke-AtlasJson @('clusters', 'connectionStrings', 'describe', $clusterName, '--projectId', $projectId)
$srv = $conn.standardSrv
if (-not $srv) { throw 'Could not get cluster SRV connection string.' }
$hostPart = ($srv -replace '^mongodb\+srv://', '' -replace '/.*$', '').Trim()
$encodedPass = [uri]::EscapeDataString($password)
$uri = "mongodb+srv://${dbUser}:${encodedPass}@${hostPart}/${dbName}?retryWrites=true&w=majority"

$content = Get-Content $envPath -Raw
if ($content -match '(?m)^MONGODB_URI=.*$') {
  $content = $content -replace '(?m)^MONGODB_URI=.*$', "MONGODB_URI=$uri"
} else {
  $content = $content.TrimEnd() + "`nMONGODB_URI=$uri`n"
}
Set-Content -Path $envPath -Value $content -NoNewline
Write-Host "Updated backend/.env with Atlas MONGODB_URI"
Write-Host 'Done.'
