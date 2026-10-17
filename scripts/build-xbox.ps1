param([string]$Configuration='Release')
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
& (Join-Path $PSScriptRoot 'verify-project.ps1')
$sln=Join-Path $root 'xbox/ProjectZero.sln'
$msbuild=(Get-Command msbuild.exe -ErrorAction SilentlyContinue)
if(-not $msbuild){ throw 'MSBuild was not found. Run this from a Visual Studio Developer PowerShell with the UWP workload installed.' }
& $msbuild.Source $sln /restore /m /p:Configuration=$Configuration /p:Platform=x64
if($LASTEXITCODE -ne 0){ throw "Xbox build failed with exit code $LASTEXITCODE" }
Write-Host 'Project Zero x64 UWP build completed.'
