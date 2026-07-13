# Fix Atlas CLI credential storage when Windows Credential Manager has empty blobs
$targets = @(
  'LegacyGeneric:target=atlascli_default:public_api_key',
  'LegacyGeneric:target=atlascli_default:private_api_key',
  'LegacyGeneric:target=atlascli_default:access_token',
  'LegacyGeneric:target=atlascli_default:refresh_token',
  'LegacyGeneric:target=atlascli_default:client_id',
  'LegacyGeneric:target=atlascli_default:client_secret'
)

Write-Host 'Clearing broken Atlas CLI credential entries...' -ForegroundColor Yellow
foreach ($t in $targets) {
  cmdkey /delete:$t 2>$null | Out-Null
  Write-Host "  removed $t"
}

$config = Join-Path $env:APPDATA 'atlascli\config.toml'
if (Test-Path $config) {
  $raw = Get-Content $config -Raw
  if ($raw -notmatch 'version\s*=') {
    Set-Content $config 'version = 2' -NoNewline
  }
}

Write-Host 'Done. Run ATLAS_LOGIN.bat in a normal CMD window (not Cursor terminal).' -ForegroundColor Green
