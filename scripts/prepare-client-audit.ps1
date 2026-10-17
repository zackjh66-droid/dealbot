param([Parameter(Mandatory=$true)][string]$ClientRoot)
$ErrorActionPreference='Stop'
if(-not (Test-Path $ClientRoot -PathType Container)){ throw 'ClientRoot does not exist.' }
$exe=Get-ChildItem -Path $ClientRoot -Filter 'FortniteClient-Win64-Shipping.exe' -Recurse -File | Select-Object -First 1
if(-not $exe){ throw 'FortniteClient-Win64-Shipping.exe was not found in the supplied local client folder.' }
Write-Host ('Found client: ' + $exe.FullName)
Write-Host ('SHA256: ' + (Get-FileHash $exe.FullName -Algorithm SHA256).Hash)
$audit=Join-Path (Split-Path -Parent $PSScriptRoot) 'clientbridge/tools/ImportAudit.ps1'
if(Test-Path $audit){ & $audit -Executable $exe.FullName } else { throw 'Import audit tool is missing.' }
