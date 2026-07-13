Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public class NativeCred {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  public struct CREDENTIAL {
    public int Flags; public int Type; public string TargetName; public string Comment;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten; public int CredentialBlobSize;
    public IntPtr CredentialBlob; public int Persist; public int AttributeCount; public IntPtr Attributes;
    public string TargetAlias; public string UserName;
  }
  [DllImport("advapi32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
  public static extern bool CredRead(string target, int type, int reserved, out IntPtr credential);
  [DllImport("advapi32.dll")] public static extern void CredFree(IntPtr cred);
  public static byte[] ReadBytes(string target) {
    IntPtr n;
    if (!CredRead(target, 1, 0, out n)) return null;
    var c = (CREDENTIAL)Marshal.PtrToStructure(n, typeof(CREDENTIAL));
    var bytes = new byte[c.CredentialBlobSize];
    if (c.CredentialBlobSize > 0) Marshal.Copy(c.CredentialBlob, bytes, 0, c.CredentialBlobSize);
    CredFree(n);
    return bytes;
  }
}
'@

function Decode-Blob($bytes) {
  if (-not $bytes -or $bytes.Length -eq 0) { return $null }
  $unicode = [Text.Encoding]::Unicode.GetString($bytes).Trim([char]0)
  if ($unicode) { return $unicode }
  return [Text.Encoding]::UTF8.GetString($bytes).Trim([char]0)
}

$pub = Decode-Blob ([NativeCred]::ReadBytes('LegacyGeneric:target=atlascli_default:public_api_key'))
$priv = Decode-Blob ([NativeCred]::ReadBytes('LegacyGeneric:target=atlascli_default:private_api_key'))
$access = Decode-Blob ([NativeCred]::ReadBytes('LegacyGeneric:target=atlascli_default:access_token'))

if (-not $pub -and -not $access) { Write-Error 'No Atlas credentials in vault'; exit 1 }

if ($pub) { $env:MONGODB_ATLAS_PUBLIC_API_KEY = $pub }
if ($priv) { $env:MONGODB_ATLAS_PRIVATE_API_KEY = $priv }
if ($access) { $env:MONGODB_ATLAS_ACCESS_TOKEN = $access }

Write-Host "Atlas creds loaded (public=$([bool]$pub) private=$([bool]$priv) token=$([bool]$access))"

$atlas = 'C:\Program Files (x86)\MongoDB Atlas CLI\atlas.exe'
& $atlas auth whoami 2>&1 | Out-String | Write-Host

if ($LASTEXITCODE -ne 0 -and $pub -and $priv) {
  $env:MONGODB_ATLAS_ORG_ID = '6a3bb94aad4ee8ca653e0ca3'
}

& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'finish-atlas-setup.ps1')
