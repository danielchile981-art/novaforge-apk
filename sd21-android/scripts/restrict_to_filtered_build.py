#!/usr/bin/env python3
"""Remove o flavor sem filtro do projeto Android fixado em Local Dream v2.0.0."""

from __future__ import annotations

import re
import sys
from pathlib import Path


def main() -> int:
    if len(sys.argv) != 2:
        print("Uso: restrict_to_filtered_build.py <fonte-local-dream>", file=sys.stderr)
        return 2

    root = Path(sys.argv[1]).resolve()
    gradle_file = root / "app" / "build.gradle.kts"
    content = gradle_file.read_text(encoding="utf-8")

    basic_block = re.compile(
        r'\n\s*create\("basic"\)\s*\{\s*'
        r'dimension\s*=\s*"version"\s*'
        r'versionNameSuffix\s*=\s*""\s*'
        r"\}\s*",
        flags=re.MULTILINE,
    )
    patched, replacements = basic_block.subn("\n", content, count=1)

    if replacements != 1:
        print("Não foi possível remover exatamente um flavor basic.", file=sys.stderr)
        return 1

    if 'create("filter")' not in patched:
        print("O flavor com filtro não foi encontrado.", file=sys.stderr)
        return 1

    gradle_file.write_text(patched, encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

