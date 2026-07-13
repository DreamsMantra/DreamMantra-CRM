Add-Type @'
using System; using System.Runtime.InteropServices; using System.Text;
public class C {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  public struct CRED { public int Flags,Type; public string TargetName,Comment; public System.Runtime.InteropServices.ComTypes.FILETIME LW; public int BlobSize; public IntPtr Blob; public int Persist,AttrCount; public IntPtr Attr; public string Alias,User; }
  [DllImport("advapi32.dll", CharSet=CharSet.Unicode)] public static extern bool CredRead(string t,int y,int z,out IntPtr p);
  [DllImport("advapi32.dll")] public static extern void CredFree(IntPtr p);
}
'@
@(
  'LegacyGeneric:target=atlascli_default:public_api_key',
  'LegacyGeneric:target=atlascli_default:private_api_key',
  'LegacyGeneric:target=atlascli_default:access_token',
  'LegacyGeneric:target=atlascli_default:refresh_token',
  'LegacyGeneric:target=atlascli_default:client_id',
  'LegacyGeneric:target=atlascli_default:client_secret'
) | ForEach-Object {
  $p = [IntPtr]::Zero
  if ([C]::CredRead($_, 1, 0, [ref]$p)) {
    $c = [Runtime.InteropServices.Marshal]::PtrToStructure($p, [type][C+CRED])
    $preview = ''
    if ($c.BlobSize -gt 0) {
      $b = New-Object byte[] $c.BlobSize
      [Runtime.InteropServices.Marshal]::Copy($c.Blob, $b, 0, $c.BlobSize)
      $preview = [Text.Encoding]::Unicode.GetString($b).Substring(0, [Math]::Min(20, $c.BlobSize))
    }
    Write-Host "$_ => size=$($c.BlobSize) preview=$preview"
    [C]::CredFree($p)
  } else {
    Write-Host "$_ => READ FAILED"
  }
}
