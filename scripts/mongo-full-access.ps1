# Full MongoDB terminal access (local + Atlas when CLI logged in)
$ErrorActionPreference = 'Continue'
$atlas = 'C:\Program Files (x86)\MongoDB Atlas CLI\atlas.exe'
$root = 'e:\Cream Mantra CRM'

Write-Host ''
Write-Host '========== MongoDB Terminal Access ==========' -ForegroundColor Cyan
Write-Host ''

# 1. Local MongoDB
Write-Host '[Local MongoDB]' -ForegroundColor Yellow
$svc = Get-Service MongoDB -ErrorAction SilentlyContinue
if ($svc) { Write-Host "  Service: $($svc.Status)" -ForegroundColor Green }
try {
  $h = Invoke-RestMethod 'http://localhost:5001/api/health' -TimeoutSec 3
  Write-Host "  CRM API: storage=$($h.storage) mongo=$($h.mongo)" -ForegroundColor Green
} catch { Write-Host '  CRM API: not running' -ForegroundColor Red }

# 2. Atlas CLI
Write-Host ''
Write-Host '[Atlas CLI]' -ForegroundColor Yellow
$who = & $atlas auth whoami 2>&1 | Out-String
if ($LASTEXITCODE -eq 0 -and $who -notmatch 'not logged in') {
  Write-Host "  $($who.Trim())" -ForegroundColor Green
  & $atlas projects list
  $verify = Join-Path $root 'scripts\verify-atlas-access.ps1'
  if (Test-Path $verify) { & powershell -NoProfile -ExecutionPolicy Bypass -File $verify }
  $finish = Join-Path $root 'scripts\finish-atlas-setup.ps1'
  if (Test-Path $finish) {
    Write-Host ''
    Write-Host 'Connecting CRM to Atlas...' -ForegroundColor Cyan
    & powershell -NoProfile -ExecutionPolicy Bypass -File $finish
    Set-Location (Join-Path $root 'backend')
    npm run migrate:mongo
  }
} else {
  Write-Host '  Not logged in to Atlas CLI' -ForegroundColor Red
  Write-Host '  Run ATLAS_LOGIN.bat and wait for Logged in as' -ForegroundColor Gray
}

# 3. Atlas URI file (no CLI)
$uriFile = Join-Path $root 'backend\atlas-uri.txt'
if (Test-Path $uriFile) {
  $uri = (Get-Content $uriFile -Raw).Trim()
  if ($uri -match '^mongodb') {
    Write-Host ''
    Write-Host '[Atlas URI file]' -ForegroundColor Yellow
    $envPath = Join-Path $root 'backend\.env'
    $c = Get-Content $envPath -Raw
    $c = $c -replace '(?m)^MONGODB_URI=.*$', "MONGODB_URI=$uri"
    Set-Content $envPath $c -NoNewline
    Set-Location (Join-Path $root 'backend')
    npm run migrate:mongo
    Write-Host '  Connected via atlas-uri.txt' -ForegroundColor Green
  }
}

Write-Host ''
Write-Host '============================================'
Write-Host ''
