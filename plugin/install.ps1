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
  $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
} else {
  $manifest = [pscustomobject]@{}
}
if (-not $manifest.PSObject.Properties['dependencies']) {
  $manifest | Add-Member -NotePropertyName dependencies -NotePropertyValue ([pscustomobject]@{}) -Force
}
$manifest.dependencies | Add-Member -NotePropertyName 'dsh-remote' -NotePropertyValue "link:$Source" -Force

if (-not $manifest.PSObject.Properties['dsh']) {
  $manifest | Add-Member -NotePropertyName dsh -NotePropertyValue ([pscustomobject]@{}) -Force
}
if (-not $manifest.dsh.PSObject.Properties['profile']) {
  $manifest.dsh | Add-Member -NotePropertyName profile -NotePropertyValue ([pscustomobject]@{}) -Force
}
if (-not $manifest.dsh.profile.PSObject.Properties['bundles']) {
  $manifest.dsh.profile | Add-Member -NotePropertyName bundles -NotePropertyValue @() -Force
}
$bundles = @($manifest.dsh.profile.bundles)
if ($bundles -notcontains 'dsh-remote') {
  $manifest.dsh.profile.bundles = @($bundles + 'dsh-remote')
}
$json = $manifest | ConvertTo-Json -Depth 50
[System.IO.File]::WriteAllText($manifestPath, $json + [Environment]::NewLine, (New-Object System.Text.UTF8Encoding($false)))

$patchPath = Join-Path $Profile 'cordis.patch.yml'
$patch = if (Test-Path $patchPath) { Get-Content $patchPath -Raw } else { '' }
if ($patch -notmatch '(?m)^\s*-\s*id:\s*dsh-remote\s*$') {
  $entry = "- insert:`n    - id: dsh-remote`n      name: dsh-remote"
  # Профиль DSH часто содержит комментарии и пустой массив [].
  # Дописывать элемент после [] нельзя: получится невалидный YAML.
  if ($patch -match '(?m)^\s*\[\]\s*$') {
    $patch = [regex]::Replace($patch, '(?m)^\s*\[\]\s*$', $entry, 1)
  } else {
    $patch = $patch.TrimEnd() + "`n`n" + $entry + "`n"
  }
  [System.IO.File]::WriteAllText($patchPath, $patch, (New-Object System.Text.UTF8Encoding($false)))
}

$nodeModules = Join-Path $Profile 'node_modules'
New-Item -ItemType Directory -Path $nodeModules -Force | Out-Null
$target = Join-Path $nodeModules 'dsh-remote'
if (Test-Path $target) {
  $item = Get-Item $target -Force
  $same = $item.LinkType -eq 'Junction' -and (($item.Target | Select-Object -First 1) -eq $Source)
  if (-not $same) {
    $old = Join-Path $backup 'node_modules-dsh-remote.old'
    Move-Item $target $old -Force
    Write-Host "старая установка сохранена: $old"
  }
}
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
