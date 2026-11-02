#Requires -Version 5.1
<#
.SYNOPSIS
  Устанавливает плагин DDeck в профиль DeepSeek Harness на Windows.

.DESCRIPTION
  Делает те же три записи, что install.sh на macOS/Linux: link-зависимость,
  бандл в dsh.profile.bundles и строку cordis.patch.yml. Каталог плагина
  подключается junction-ссылкой, поэтому pnpm/npm install не нужны.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\plugin\install.ps1
  powershell -ExecutionPolicy Bypass -File .\plugin\install.ps1 -Profile C:\Users\me\.dsh\profiles\desktop
#>
[CmdletBinding()]
param(
  [string]$Profile = $env:DSH_PROFILE
)

$ErrorActionPreference = 'Stop'
$PackageName = 'ddeck-remote'
$LegacyName = 'dsh-remote'
$Source = (Resolve-Path $PSScriptRoot).Path
if (-not (Test-Path (Join-Path $Source 'lib\index.js'))) {
  throw "повреждён установщик: нет $Source\lib\index.js"
}

if ([string]::IsNullOrWhiteSpace($Profile)) {
  $Profile = Join-Path $HOME '.dsh\profiles\desktop'
} elseif (-not [System.IO.Path]::IsPathRooted($Profile)) {
  $Profile = Join-Path (Join-Path $HOME '.dsh\profiles') $Profile
}
if (-not (Test-Path $Profile)) {
  throw "профиль DSH не найден: $Profile`nУкажите его через -Profile или DSH_PROFILE."
}
$Profile = (Resolve-Path $Profile).Path

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = Join-Path $Profile ".dsh-remote-backups\$stamp"
New-Item -ItemType Directory -Path $backup -Force | Out-Null
foreach ($name in @('package.json', 'cordis.patch.yml')) {
  $path = Join-Path $Profile $name
  if (Test-Path $path) { Copy-Item $path (Join-Path $backup $name) -Force }
}
Write-Host "бэкап профиля: $backup"

$manifestPath = Join-Path $Profile 'package.json'
if (Test-Path $manifestPath) {
  $manifest = [System.IO.File]::ReadAllText($manifestPath, (New-Object System.Text.UTF8Encoding($false))) | ConvertFrom-Json
} else {
  $manifest = [pscustomobject]@{}
}
if (-not $manifest.PSObject.Properties['dependencies']) {
  $manifest | Add-Member -NotePropertyName dependencies -NotePropertyValue ([pscustomobject]@{}) -Force
}
if ($manifest.dependencies.PSObject.Properties['dsh-remote']) {
  $manifest.dependencies.PSObject.Properties.Remove('dsh-remote')
}
$manifest.dependencies | Add-Member -NotePropertyName $PackageName -NotePropertyValue "link:$Source" -Force

if (-not $manifest.PSObject.Properties['dsh']) {
  $manifest | Add-Member -NotePropertyName dsh -NotePropertyValue ([pscustomobject]@{}) -Force
}
if (-not $manifest.dsh.PSObject.Properties['profile']) {
  $manifest.dsh | Add-Member -NotePropertyName profile -NotePropertyValue ([pscustomobject]@{}) -Force
}
if (-not $manifest.dsh.profile.PSObject.Properties['bundles']) {
  $manifest.dsh.profile | Add-Member -NotePropertyName bundles -NotePropertyValue @() -Force
}
$bundles = @($manifest.dsh.profile.bundles | Where-Object { $_ -ne $PackageName -and $_ -ne $LegacyName })
$manifest.dsh.profile.bundles = @($bundles + $PackageName)
$json = $manifest | ConvertTo-Json -Depth 50
[System.IO.File]::WriteAllText($manifestPath, $json + [Environment]::NewLine, (New-Object System.Text.UTF8Encoding($false)))

$patchPath = Join-Path $Profile 'cordis.patch.yml'
if (Test-Path $patchPath) {
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

$nodeModules = Join-Path $Profile 'node_modules'
New-Item -ItemType Directory -Path $nodeModules -Force | Out-Null
foreach ($name in @($PackageName, $LegacyName)) {
  $candidate = Join-Path $nodeModules $name
  if (-not (Test-Path $candidate)) { continue }
  $item = Get-Item $candidate -Force
  $same = $name -eq $PackageName -and $item.LinkType -eq 'Junction' -and (($item.Target | Select-Object -First 1) -eq $Source)
  if (-not $same) {
    $old = Join-Path $backup "node_modules-$name.old"
    Move-Item $candidate $old -Force
    Write-Host "старая установка сохранена: $old"
  }
}
$target = Join-Path $nodeModules $PackageName
if (-not (Test-Path $target)) {
  New-Item -ItemType Junction -Path $target -Target $Source | Out-Null
}

$node = Get-Command node -ErrorAction SilentlyContinue
if ($null -ne $node) {
  $entry = (New-Object System.Uri((Join-Path $Source 'lib\index.js'))).AbsoluteUri
  & node --input-type=module -e "import('$entry').then(()=>console.log('плагин импортируется: ok'))"
  if ($LASTEXITCODE -ne 0) { throw 'плагин не импортируется — установка прервана' }
} else {
  Write-Host 'node не найден в PATH: проверку импорта пропускаю (DSH использует свой runtime)'
}

Write-Host @"

готово.
  1. Полностью перезапустите DeepSeek Harness.
  2. Откройте панель DDeck в интерфейсе DSH.
  3. Нажмите «Новый код» и отсканируйте QR телефоном.
Обновление: повторите этот скрипт и перезапустите DSH.
"@
