param(
  [Parameter(Mandatory=$true)][string]$ArchivePath,
  [string]$Destination = "$PSScriptRoot/../local-client/7.00-CL-4629139"
)
$ErrorActionPreference='Stop'
$dest=[IO.Path]::GetFullPath($Destination)
New-Item -ItemType Directory -Force -Path $dest | Out-Null
$ext=[IO.Path]::GetExtension($ArchivePath).ToLowerInvariant()
if($ext -eq '.zip') { Expand-Archive -LiteralPath $ArchivePath -DestinationPath $dest -Force }
elseif($ext -eq '.rar') {
  $seven=Get-Command 7z -ErrorAction SilentlyContinue
  if(-not $seven){ throw 'RAR extraction requires 7-Zip (7z.exe) on PATH.' }
  & $seven.Source x $ArchivePath "-o$dest" -y
  if($LASTEXITCODE -ne 0){ throw "7-Zip failed with exit code $LASTEXITCODE" }
} else { throw 'Expected .rar or .zip Season 7 archive.' }
$client=Get-ChildItem $dest -Recurse -Filter 'FortniteClient-Win64-Shipping.exe' | Select-Object -First 1
if(-not $client){ throw 'FortniteClient-Win64-Shipping.exe was not found after extraction.' }
$hash=(Get-FileHash $client.FullName -Algorithm SHA256).Hash
@{
 build='7.00-CL-4629139';
 client=$client.FullName;
 sha256=$hash;
 importedUtc=(Get-Date).ToUniversalTime().ToString('o')
} | ConvertTo-Json | Set-Content (Join-Path $dest 'project-zero-client.json')
Write-Host "Imported Season 7 client: $($client.FullName)"
Write-Host "SHA256: $hash"
Write-Host 'Client files remain local and are excluded from Git.'
