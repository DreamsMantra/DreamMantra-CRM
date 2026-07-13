# Device-code Atlas login with auto-retry, then connect CRM
$ErrorActionPreference = 'Stop'
$atlas = 'C:\Program Files (x86)\MongoDB Atlas CLI\atlas.exe'
$root = 'e:\Cream Mantra CRM'
$finish = Join-Path $root 'scripts\finish-atlas-setup.ps1'

& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root 'scripts\fix-atlas-storage.ps1') | Out-Null

function Test-AtlasLoggedIn {
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'SilentlyContinue'
  $w = (& $atlas auth whoami 2>&1 | Out-String).Trim()
  $ErrorActionPreference = $prev
  return ($LASTEXITCODE -eq 0 -and $w -notmatch 'not logged in')
}

function Start-AtlasDeviceLogin {
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $atlas
  $psi.Arguments = 'auth login --force --noBrowser'
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.RedirectStandardInput = $true
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true

  $p = [System.Diagnostics.Process]::Start($psi)
  $opened = $false
  $deadline = (Get-Date).AddMinutes(3)

  while (-not $p.HasExited -and (Get-Date) -lt $deadline) {
    while ($p.StandardOutput.Peek() -ge 0) {
      $line = $p.StandardOutput.ReadLine()
      if ($line) { Write-Host $line }
      if (-not $opened -and $line -match '([A-Z0-9]{4}-[A-Z0-9]{4})') {
        $code = $Matches[1]
        Write-Host "Opening browser for code $code ..." -ForegroundColor Green
        Start-Process "https://account.mongodb.com/account/connect?user_code=$code"
        $opened = $true
      }
      if ($line -match 'expired') {
        try { $p.StandardInput.WriteLine('Y') } catch { }
      }
    }
    while ($p.StandardError.Peek() -ge 0) {
      $line = $p.StandardError.ReadLine()
      if ($line) { Write-Host $line -ForegroundColor DarkYellow }
      if ($line -match 'expired') {
        try { $p.StandardInput.WriteLine('Y') } catch { }
      }
    }
    if (Test-AtlasLoggedIn) {
      try { if (-not $p.HasExited) { $p.Kill() } } catch { }
      return $true
    }
    Start-Sleep -Milliseconds 500
  }

  if (-not $p.HasExited) {
    try { $p.Kill() } catch { }
    $p.WaitForExit(5000)
  }
  return (Test-AtlasLoggedIn)
}

Write-Host ''
Write-Host 'Atlas auto-login - approve in browser as dreammantra1@gmail.com' -ForegroundColor Cyan
Write-Host ''

$maxAttempts = 8
for ($i = 1; $i -le $maxAttempts; $i++) {
  if (Test-AtlasLoggedIn) { break }
  Write-Host "Login attempt $i of $maxAttempts ..." -ForegroundColor Yellow
  if (Start-AtlasDeviceLogin) { break }
  Start-Sleep -Seconds 2
}

if (-not (Test-AtlasLoggedIn)) {
  throw 'Atlas login failed after all attempts. Approve browser auth within 3 minutes per attempt.'
}

$who = (& $atlas auth whoami 2>&1 | Out-String).Trim()
Write-Host "Logged in: $who" -ForegroundColor Green
if ($who -match 'eshalohiya45|lohiyasuppliers') { throw 'Wrong Atlas account' }

& powershell -NoProfile -ExecutionPolicy Bypass -File $finish
Set-Location (Join-Path $root 'backend')
npm run migrate:mongo
Write-Host 'Atlas connected.' -ForegroundColor Green
