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
$PackageName = 'ddeck-remote'
$LegacyName = 'dsh-remote'
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
  $manifest = [System.IO.File]::ReadAllText($manifestPath, (New-Object System.Text.UTF8Encoding($false))) | ConvertFrom-Json
  if ($manifest.PSObject.Properties['dependencies']) {
    foreach ($name in @($PackageName, $LegacyName)) {
      $manifest.dependencies.PSObject.Properties.Remove($name)
    }
  }
  if ($manifest.PSObject.Properties['dsh'] -and $manifest.dsh.PSObject.Properties['profile'] -and $manifest.dsh.profile.PSObject.Properties['bundles']) {
    $manifest.dsh.profile.bundles = @($manifest.dsh.profile.bundles | Where-Object { $_ -ne $PackageName -and $_ -ne $LegacyName })
  }
  [System.IO.File]::WriteAllText($manifestPath, (($manifest | ConvertTo-Json -Depth 50) + [Environment]::NewLine), (New-Object System.Text.UTF8Encoding($false)))
}
$patchPath = Join-Path $Profile 'cordis.patch.yml'
if (Test-Path $patchPath) {
  Copy-Item $patchPath (Join-Path $backup 'cordis.patch.yml') -Force
  $patch = [System.IO.File]::ReadAllText($patchPath, (New-Object System.Text.UTF8Encoding($false)))
  foreach ($name in @($PackageName, $LegacyName)) {
    $pattern = '(?ms)^\s*[-]\s*insert:\s*\r?\n\s*-\s*id:\s*' + [regex]::Escape($name) + '\s*\r?\n\s*name:\s*' + [regex]::Escape($name) + '\s*\r?\n?'
    $patch = [regex]::Replace($patch, $pattern, '')
  }
  if ($patch -notmatch '(?m)^\s*-\s' -and $patch -notmatch '(?m)^\s*\[\]\s*$') {
    $patch = $patch.TrimEnd() + "`n[]`n"
  }
  [System.IO.File]::WriteAllText($patchPath, $patch, (New-Object System.Text.UTF8Encoding($false)))
}
foreach ($name in @($PackageName, $LegacyName)) {
  $target = Join-Path (Join-Path $Profile 'node_modules') $name
  if (-not (Test-Path $target)) { continue }
  $item = Get-Item $target -Force
  if ($item.LinkType -eq 'Junction') {
    $item.Delete()
  } else {
    Move-Item $target (Join-Path $backup "node_modules-$name.old") -Force
  }
}
Write-Host "DDeck удалён. Бэкап: $backup`nПерезапустите DeepSeek Harness."
