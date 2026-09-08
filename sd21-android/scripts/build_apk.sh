#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_dir="$(cd "$script_dir/.." && pwd)"
repo_root="$(cd "$project_dir/.." && pwd)"

# shellcheck disable=SC1091
source "$project_dir/upstream.properties"

build_dir="$(mktemp -d)"
trap 'rm -rf "$build_dir"' EXIT

source_dir="$build_dir/local-dream"
base_apk="$build_dir/local-dream-filter.apk"
dist_dir="$repo_root/dist-sd21"

git clone --branch "$UPSTREAM_TAG" --depth 1 "$UPSTREAM_REPOSITORY" "$source_dir"
curl --fail --location --retry 3 --output "$base_apk" "$FILTERED_APK_URL"
echo "$FILTERED_APK_SHA256  $base_apk" | sha256sum --check --status

bash "$project_dir/scripts/prepare_android.sh" "$source_dir" "$base_apk" "$project_dir"

if [[ "${SKIP_GRADLE:-0}" == "1" ]]; then
  echo "SKIP_GRADLE=1: preparação concluída sem compilar."
  exit 0
fi

chmod +x "$source_dir/gradlew"
(
  cd "$source_dir"
  ./gradlew --no-daemon --stacktrace :app:assembleFilterDebug
)

apk_path="$(find "$source_dir/app/build/outputs/apk/filter/debug" -maxdepth 1 -type f -name '*.apk' -print -quit)"
if [[ -z "$apk_path" || ! -f "$apk_path" ]]; then
  echo "O Gradle terminou, mas o APK não foi encontrado." >&2
  exit 1
fi

mkdir -p "$dist_dir"
cp "$apk_path" "$dist_dir/NovaForge-Imagens-SD21.apk"
(
  cd "$dist_dir"
  sha256sum NovaForge-Imagens-SD21.apk > NovaForge-Imagens-SD21.apk.sha256
)

echo "APK pronto: $dist_dir/NovaForge-Imagens-SD21.apk"
