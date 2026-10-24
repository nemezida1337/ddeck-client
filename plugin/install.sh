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
PROFILE="${DSH_PROFILE:-${1:-$HOME/.dsh/profiles/desktop}}"
# DSH выставляет DSH_PROFILE как имя профиля («desktop»), а не путь.
case "$PROFILE" in /*) ;; *) PROFILE="$HOME/.dsh/profiles/$PROFILE" ;; esac
[ -d "$PROFILE" ] || { echo "профиль DSH не найден: $PROFILE" >&2; exit 1; }
[ -f "$SOURCE/lib/index.js" ] || { echo "повреждён установщик: нет $SOURCE/lib/index.js" >&2; exit 1; }
command -v python3 >/dev/null 2>&1 || {
  echo "для установки нужен python3 (входит в macOS Command Line Tools):" >&2
  echo "  xcode-select --install" >&2
  exit 1
}

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$PROFILE/.dsh-remote-backups/$STAMP"
mkdir -p "$BACKUP"
for file in package.json cordis.patch.yml; do
  [ -f "$PROFILE/$file" ] && cp "$PROFILE/$file" "$BACKUP/$file"
done
echo "бэкап профиля: $BACKUP"

python3 - "$PROFILE" "$SOURCE" <<'PY'
import json, pathlib, sys
profile, source = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]).resolve()
manifest = profile / 'package.json'
data = json.loads(manifest.read_text()) if manifest.exists() else {}
deps = data.setdefault('dependencies', {})
deps['dsh-remote'] = f'link:{source}'
bundles = data.setdefault('dsh', {}).setdefault('profile', {}).setdefault('bundles', [])
if 'dsh-remote' not in bundles:
    bundles.append('dsh-remote')
manifest.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')

patch = profile / 'cordis.patch.yml'
text = patch.read_text() if patch.exists() else ''
if 'dsh-remote' not in text:
    text = text.rstrip() + "\n\n- insert:\n    - id: dsh-remote\n      name: dsh-remote\n"
    patch.write_text(text)
PY

mkdir -p "$PROFILE/node_modules"
TARGET="$PROFILE/node_modules/dsh-remote"
if [ -e "$TARGET" ] || [ -L "$TARGET" ]; then
  if [ ! -L "$TARGET" ] || [ "$(readlink "$TARGET")" != "$SOURCE" ]; then
    mv "$TARGET" "$BACKUP/node_modules-dsh-remote.old"
    echo "старая установка сохранена: $BACKUP/node_modules-dsh-remote.old"
  fi
fi
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
