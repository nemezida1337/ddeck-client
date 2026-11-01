#Requires -Version 5.1
<#
.SYNOPSIS
  Удаляет плагин DDeck из профиля DeepSeek Harness на Windows.
.DESCRIPTION
  Убирает link-зависимость, бандл, строку cordis.patch.yml и junction.
  Данные сопряжений в ~/.dsh/dsh-remote не трогает.
#>
[CmdletBinding()]
param([string]$Profile = $env:DSH_PROFILE)

$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($Profile)) {
  $Profile = Join-Path $HOME '.dsh\profiles\desktop'
} elseif (-not [System.IO.Path]::IsPathRooted($Profile)) {
  $Profile = Join-Path (Join-Path $HOME '.dsh\profiles') $Profile
}
if (-not (Test-Path $Profile)) { throw "профиль DSH не найден: $Profile" }
$Profile = (Resolve-Path $Profile).Path

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = Join-Path $Profile ".dsh-remote-backups\$stamp"
New-Item -ItemType Directory -Path $backup -Force | Out-Null
$manifestPath = Join-Path $Profile 'package.json'
if (Test-Path $manifestPath) {
  Copy-Item $manifestPath (Join-Path $backup 'package.json') -Force
  $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
  if ($manifest.PSObject.Properties['dependencies']) {
    $manifest.dependencies.PSObject.Properties.Remove('dsh-remote')
  }
  if ($manifest.PSObject.Properties['dsh'] -and $manifest.dsh.PSObject.Properties['profile'] -and $manifest.dsh.profile.PSObject.Properties['bundles']) {
    $manifest.dsh.profile.bundles = @($manifest.dsh.profile.bundles | Where-Object { $_ -ne 'dsh-remote' })
  }
  [System.IO.File]::WriteAllText($manifestPath, (($manifest | ConvertTo-Json -Depth 50) + [Environment]::NewLine), (New-Object System.Text.UTF8Encoding($false)))
}
$patchPath = Join-Path $Profile 'cordis.patch.yml'
if (Test-Path $patchPath) {
  Copy-Item $patchPath (Join-Path $backup 'cordis.patch.yml') -Force
  $patch = Get-Content $patchPath -Raw
  $patch = [regex]::Replace($patch, '(?ms)^\s*[-]\s*insert:\s*\r?\n\s*-\s*id:\s*dsh-remote\s*\r?\n\s*name:\s*dsh-remote\s*\r?\n?', '')
  [System.IO.File]::WriteAllText($patchPath, $patch, (New-Object System.Text.UTF8Encoding($false)))
}
$target = Join-Path (Join-Path $Profile 'node_modules') 'dsh-remote'
if (Test-Path $target) {
  $item = Get-Item $target -Force
  if ($item.LinkType -eq 'Junction') {
    (Get-Item $target).Delete()
  } else {
    Move-Item $target (Join-Path $backup 'node_modules-dsh-remote.old') -Force
  }
}
Write-Host "DDeck удалён. Бэкап: $backup`nПерезапустите DeepSeek Harness."
