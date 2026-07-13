# Waits for Atlas CLI login, then auto-configures CRM for Cluster0
$atlas = 'C:\Program Files (x86)\MongoDB Atlas CLI\atlas.exe'
$root = 'e:\Cream Mantra CRM'
$finish = Join-Path $root 'scripts\finish-atlas-setup.ps1'

Write-Host 'Starting Atlas login window — use dreammantra1@gmail.com in browser...'
Start-Process cmd.exe -ArgumentList @(
  '/k',
  'cd /d "' + $root + '" && echo Use dreammantra1@gmail.com ONLY && "' + $atlas + '" auth login'
)

$deadline = (Get-Date).AddMinutes(3)
while ((Get-Date) -lt $deadline) {
  Start-Sleep -Seconds 4
  $who = & $atlas auth whoami 2>&1 | Out-String
  if ($LASTEXITCODE -eq 0 -and $who -notmatch 'not logged in') {
    Write-Host "Logged in: $($who.Trim())"
    if ($who -match 'eshalohiya45') { throw 'Wrong account — use dreammantra1@gmail.com' }
    Set-Location $root
    & powershell -NoProfile -ExecutionPolicy Bypass -File $finish
    if ($LASTEXITCODE -ne 0) { exit 1 }
    Set-Location (Join-Path $root 'backend')
    npm run migrate:mongo
    exit $LASTEXITCODE
  }
  Write-Host 'Waiting for Atlas login...'
}

Write-Host 'Timeout — complete login in the CMD window, then run FINISH_ATLAS.bat'
exit 1
