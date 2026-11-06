#!/bin/sh
# Удаляет DDeck из профиля DSH, не трогая данные сопряжений (~/.dsh/dsh-remote).
set -eu
PROFILE="${1:-${DSH_PROFILE:-$HOME/.dsh/profiles/desktop}}"
# DSH выставляет DSH_PROFILE как имя профиля («desktop»), а не путь.
case "$PROFILE" in /*) ;; *) PROFILE="$HOME/.dsh/profiles/$PROFILE" ;; esac
[ -d "$PROFILE" ] || { echo "профиль DSH не найден: $PROFILE" >&2; exit 1; }
python3 - "$PROFILE" <<'PY'
import json, pathlib, re, sys
profile = pathlib.Path(sys.argv[1])
manifest = profile / 'package.json'
if manifest.exists():
    data = json.loads(manifest.read_text())
    for name in ('ddeck-remote', 'dsh-remote'):
        data.get('dependencies', {}).pop(name, None)
    bundles = data.get('dsh', {}).get('profile', {}).get('bundles', [])
    for name in ('ddeck-remote', 'dsh-remote'):
        while name in bundles:
            bundles.remove(name)
    manifest.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
patch = profile / 'cordis.patch.yml'
if patch.exists():
    text = patch.read_text()
    for name in ('ddeck-remote', 'dsh-remote'):
        pattern = (r'(?ms)^\s*-\s*insert:\s*\r?\n\s*-\s*id:\s*' +
                   re.escape(name) + r'\s*\r?\n\s*name:\s*' + re.escape(name) + r'\s*\r?\n?')
        text = re.sub(pattern, '', text)
    # Leave a valid empty top-level array if we removed the last entry.
    if not re.search(r'(?m)^\s*-\s', text) and not re.search(r'(?m)^\s*\[\]\s*$', text):
        text = text.rstrip() + "\n[]\n"
    patch.write_text(text)
PY
rm -f "$PROFILE/node_modules/ddeck-remote" "$PROFILE/node_modules/dsh-remote"
echo "DDeck удалён из профиля. Данные сопряжений остались в ~/.dsh/dsh-remote."
echo "Перезапустите DeepSeek Harness."
