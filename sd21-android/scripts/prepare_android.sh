#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 3 ]]; then
  echo "Uso: $0 <fonte-local-dream> <apk-filtrado> <pasta-deste-projeto>" >&2
  exit 2
fi

upstream_dir="$(cd "$1" && pwd)"
filtered_apk="$(cd "$(dirname "$2")" && pwd)/$(basename "$2")"
project_dir="$(cd "$3" && pwd)"

if [[ ! -f "$filtered_apk" ]]; then
  echo "APK filtrado não encontrado: $filtered_apk" >&2
  exit 1
fi

if [[ ! -f "$upstream_dir/app/build.gradle.kts" ]]; then
  echo "Fonte Local Dream inválido: $upstream_dir" >&2
  exit 1
fi

expected_sha="$(awk -F= '$1 == "FILTERED_APK_SHA256" {print $2}' "$project_dir/upstream.properties")"
actual_sha="$(sha256sum "$filtered_apk" | awk '{print $1}')"

if [[ -z "$expected_sha" || "$actual_sha" != "$expected_sha" ]]; then
  echo "Checksum inválido para o APK-base." >&2
  echo "Esperado: $expected_sha" >&2
  echo "Recebido: $actual_sha" >&2
  exit 1
fi

extract_dir="$(mktemp -d)"
trap 'rm -rf "$extract_dir"' EXIT

unzip -q "$filtered_apk" \
  'lib/arm64-v8a/libstable_diffusion_core.so' \
  'assets/qnnlibs/*' \
  'assets/safety_checker.mnn' \
  -d "$extract_dir"

mkdir -p "$upstream_dir/app/src/main/jniLibs/arm64-v8a"
mkdir -p "$upstream_dir/app/src/main/assets/qnnlibs"
mkdir -p "$upstream_dir/app/src/filter/assets"
mkdir -p "$upstream_dir/app/src/main/res/values-pt-rBR"

cp "$extract_dir/lib/arm64-v8a/libstable_diffusion_core.so" \
  "$upstream_dir/app/src/main/jniLibs/arm64-v8a/"
cp "$extract_dir"/assets/qnnlibs/* "$upstream_dir/app/src/main/assets/qnnlibs/"
cp "$extract_dir/assets/safety_checker.mnn" "$upstream_dir/app/src/filter/assets/"

cp "$project_dir/overrides/values-pt-rBR/strings.xml" \
  "$upstream_dir/app/src/main/res/values-pt-rBR/strings.xml"
cp "$project_dir/overrides/drawable/ic_launcher_foreground.xml" \
  "$upstream_dir/app/src/main/res/drawable/ic_launcher_foreground.xml"
cp "$project_dir/overrides/drawable/ic_launcher_monochrome.xml" \
  "$upstream_dir/app/src/main/res/drawable/ic_launcher_monochrome.xml"
cp "$project_dir/overrides/values/ic_launcher_background.xml" \
  "$upstream_dir/app/src/main/res/values/ic_launcher_background.xml"
cp "$project_dir/NOTICE.md" "$upstream_dir/NOTICE-NOVAFORGE.md"

sed -i 's/applicationId = "io.github.xororz.localdream"/applicationId = "com.daniel.novaforgeimagens"/' \
  "$upstream_dir/app/build.gradle.kts"
sed -i 's/versionCode = 47/versionCode = 1/' "$upstream_dir/app/build.gradle.kts"
sed -i 's/versionName = "2.0.0"/versionName = "1.0.0"/' "$upstream_dir/app/build.gradle.kts"
sed -i 's/LocalDream_armv8a_/NovaForge_Imagens_SD21_/' "$upstream_dir/app/build.gradle.kts"

# O app distribuído por este projeto só possui o sabor com filtro. Isso evita
# gerar acidentalmente um APK sem o safety checker.
python3 "$project_dir/scripts/restrict_to_filtered_build.py" "$upstream_dir"

sed -i 's#<string name="app_name">Local Dream</string>#<string name="app_name">NovaForge Imagens</string>#' \
  "$upstream_dir/app/src/main/res/values/strings.xml"

# No Galaxy S25 Ultra (SM8750), o modelo SD 2.1 aparece primeiro na lista.
sed -i 's/predefinedModels.add(createSD21Model())/predefinedModels.add(0, createSD21Model())/' \
  "$upstream_dir/app/src/main/java/io/github/xororz/localdream/data/Model.kt"

core_size="$(stat -c '%s' "$upstream_dir/app/src/main/jniLibs/arm64-v8a/libstable_diffusion_core.so")"
safety_size="$(stat -c '%s' "$upstream_dir/app/src/filter/assets/safety_checker.mnn")"
qnn_count="$(find "$upstream_dir/app/src/main/assets/qnnlibs" -maxdepth 1 -type f | wc -l)"

if (( core_size < 10000000 )); then
  echo "Biblioteca nativa incompleta: $core_size bytes" >&2
  exit 1
fi

if (( safety_size < 10000000 )); then
  echo "Safety checker incompleto: $safety_size bytes" >&2
  exit 1
fi

if (( qnn_count < 10 )); then
  echo "Bibliotecas QNN incompletas: $qnn_count arquivos" >&2
  exit 1
fi

grep -q 'create("filter")' "$upstream_dir/app/build.gradle.kts"
if grep -q 'create("basic")' "$upstream_dir/app/build.gradle.kts"; then
  echo "O sabor sem filtro ainda está habilitado." >&2
  exit 1
fi

echo "Projeto Android preparado com filtro obrigatório."
echo "Core: $core_size bytes | Safety checker: $safety_size bytes | QNN: $qnn_count arquivos"

