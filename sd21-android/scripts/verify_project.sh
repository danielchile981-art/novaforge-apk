#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_dir="$(cd "$script_dir/.." && pwd)"
repo_root="$(cd "$project_dir/.." && pwd)"
workflow="$repo_root/.github/workflows/build-sd21-apk.yml"

test -f "$workflow"
test -f "$project_dir/reference/stable_diffusion_cli.py"
test -f "$project_dir/overrides/values-pt-rBR/strings.xml"
grep -q ':app:assembleFilterDebug' "$project_dir/scripts/build_apk.sh"
grep -q 'FILTERED_APK_SHA256=50e86bcf' "$project_dir/upstream.properties"
grep -q 'branches: \[stable-diffusion-apk\]' "$workflow"

python3 -m py_compile \
  "$project_dir/scripts/restrict_to_filtered_build.py" \
  "$project_dir/reference/stable_diffusion_cli.py"

python3 - <<'PY' "$project_dir/overrides/values-pt-rBR/strings.xml"
import sys
import xml.etree.ElementTree as ET

root = ET.parse(sys.argv[1]).getroot()
names = [item.attrib.get("name") for item in root if item.tag == "string"]
if len(names) != len(set(names)):
    raise SystemExit("Existem chaves duplicadas na tradução.")
if "app_name" not in names or "must_read" not in names:
    raise SystemExit("Tradução obrigatória incompleta.")
print(f"Tradução XML válida: {len(names)} textos.")
PY

echo "Estrutura e política de filtro verificadas."

