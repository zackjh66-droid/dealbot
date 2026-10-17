$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$required = @(
 'xbox/ProjectZero.sln',
 'xbox/ProjectZero.Xbox/ProjectZero.Xbox.csproj',
 'xbox/ProjectZero.Xbox/Package.appxmanifest',
 'web/package.json',
 'backend/supabase/schema.sql',
 'clientbridge/tools/ImportAudit.ps1'
)
$missing = @()
foreach ($p in $required) { if (-not (Test-Path (Join-Path $root $p))) { $missing += $p } }
if ($missing.Count) { Write-Error ('Missing project files: ' + ($missing -join ', ')) }
Write-Host 'Project Zero repository structure OK.'
