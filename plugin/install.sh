#!/bin/sh
# Устанавливает DDeck в профиль DeepSeek Harness.
#
# Никакого pnpm/npm install не требуется: плагин кладётся в профиль ссылкой, а его
# зависимости (QR) уже собраны в lib/. Повторный запуск обновляет ссылку и патчи.
#
#   ./install.sh                         # профиль по умолчанию ~/.dsh/profiles/desktop
#   ./install.sh /path/to/profile        # явный профиль
#   DSH_PROFILE=/path ./install.sh       # то же через переменную
set -eu
SOURCE="$(cd "$(dirname "$0")" && pwd)"
PROFILE="${1:-${DSH_PROFILE:-$HOME/.dsh/profiles/desktop}}"
# DSH выставляет DSH_PROFILE как имя профиля («desktop»), а не путь.
case "$PROFILE" in /*) ;; *) PROFILE="$HOME/.dsh/profiles/$PROFILE" ;; esac
[ -d "$PROFILE" ] || { echo "профиль DSH не найден: $PROFILE" >&2; exit 1; }
[ -f "$SOURCE/lib/index.js" ] || { echo "повреждён установщик: нет $SOURCE/lib/index.js" >&2; exit 1; }
command -v python3 >/dev/null 2>&1 || {
  echo "для установки нужен python3:" >&2
  echo "  macOS: xcode-select --install" >&2
  echo "  Debian/Ubuntu: sudo apt install python3" >&2
  echo "  Windows: используйте install.ps1 или install.cmd" >&2
  exit 1
}

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$PROFILE/.dsh-remote-backups/$STAMP"
mkdir -p "$BACKUP"
for file in package.json cordis.patch.yml; do
  [ -f "$PROFILE/$file" ] && cp "$PROFILE/$file" "$BACKUP/$file"
done
echo "бэкап профиля: $BACKUP"

python3 - "$PROFILE" "$SOURCE" "ddeck-remote" "dsh-remote" <<'PY'
import json, pathlib, re, sys
profile, source = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]).resolve()
package, legacy = sys.argv[3], sys.argv[4]
manifest = profile / 'package.json'
data = json.loads(manifest.read_text()) if manifest.exists() else {}
deps = data.setdefault('dependencies', {})
deps.pop(legacy, None)
deps[package] = f'link:{source}'
bundles = data.setdefault('dsh', {}).setdefault('profile', {}).setdefault('bundles', [])
for old in (package, legacy):
    while old in bundles:
        bundles.remove(old)
bundles.append(package)
manifest.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')

def ensure_patch_array(text):
    """DSH requires cordis.patch.yml to be a top-level YAML array."""
    if re.search(r'(?m)^\s*-\s', text) or re.search(r'(?m)^\s*\[\]\s*$', text):
        return text
    return text.rstrip() + "\n[]\n"

patch = profile / 'cordis.patch.yml'
if patch.exists():
    text = patch.read_text()
    # The package's own cordis.patch.yml inserts the plugin. A second insert in
    # the profile made the client module load twice; remove both the old and the
    # current duplicate, regardless of indentation/line endings.
    for name in (package, legacy):
        pattern = (r'(?ms)^\s*-\s*insert:\s*\r?\n\s*-\s*id:\s*' +
                   re.escape(name) + r'\s*\r?\n\s*name:\s*' + re.escape(name) + r'\s*\r?\n?')
        text = re.sub(pattern, '', text)
    # A profile whose only entry was that insert would otherwise become just
    # comments, which DSH rejects at boot.
    text = ensure_patch_array(text)
    patch.write_text(text)
PY

mkdir -p "$PROFILE/node_modules"
for OLD_NAME in ddeck-remote dsh-remote; do
  OLD_TARGET="$PROFILE/node_modules/$OLD_NAME"
  [ -e "$OLD_TARGET" ] || [ -L "$OLD_TARGET" ] || continue
  if [ "$OLD_NAME" = "dsh-remote" ] || [ ! -L "$OLD_TARGET" ] || [ "$(readlink "$OLD_TARGET")" != "$SOURCE" ]; then
    mv "$OLD_TARGET" "$BACKUP/node_modules-$OLD_NAME.old"
    echo "старая установка сохранена: $BACKUP/node_modules-$OLD_NAME.old"
  fi
done
TARGET="$PROFILE/node_modules/ddeck-remote"
ln -sfn "$SOURCE" "$TARGET"

# Проверка, что плагин вообще импортируется (зависимости уже в lib/).
if command -v node >/dev/null 2>&1; then
  node --input-type=module -e "import('file://$SOURCE/lib/index.js').then(()=>console.log('плагин импортируется: ok'))" || {
    echo "плагин не импортируется — установка прервана" >&2
    exit 1
  }
else
  echo "node в PATH нет: проверку импорта пропускаю (DSH использует свой runtime)"
fi

cat <<MSG

готово.
  1. Перезапустите DeepSeek Harness.
  2. Откройте панель DDeck в интерфейсе DSH.
  3. Убедитесь, что Tailscale запущен на компьютере и телефоне.
Обновление: повторите этот скрипт и перезапустите DSH.
MSG
