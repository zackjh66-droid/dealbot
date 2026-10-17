param([Parameter(Mandatory=$true)][string]$ClientExe)
$ErrorActionPreference='Stop'
if(!(Test-Path $ClientExe)){ throw "Client executable not found: $ClientExe" }
Write-Host "Project Zero - static client import audit"
Write-Host "Target: $ClientExe"
$dumpbin=(Get-Command dumpbin.exe -ErrorAction SilentlyContinue)
if(!$dumpbin){ throw 'dumpbin.exe not found. Run from a Visual Studio Developer PowerShell.' }
$out=& $dumpbin.Source /imports $ClientExe 2>&1
$out | Set-Content -Encoding utf8 client-imports.txt
$knownDesktop=@('USER32.dll','GDI32.dll','SHELL32.dll','ADVAPI32.dll','WINMM.dll','WS2_32.dll')
foreach($dll in $knownDesktop){ if($out -match [regex]::Escape($dll)){ Write-Warning "Review dependency: $dll" } }
Write-Host 'Saved client-imports.txt. This audit does not execute or modify the client.'
