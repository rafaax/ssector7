#!/usr/bin/env bash
# Comprime source/logo.glb (9.6 MB) para public/models/logo.glb.
#   prune  - remove as UVs nao usadas (o modelo nao tem nenhuma textura)
#   weld   - funde vertices duplicados
#   join   - 32 primitives -> 1 por material (2 draw calls)
#   dedup  - remove accessors repetidos
#   meshopt- quantiza + EXT_meshopt_compression
set -euo pipefail

cd "$(dirname "$0")/.."

SRC=source/logo.glb
OUT=public/models/logo.glb
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

GT="npx --no-install gltf-transform"

$GT prune "$SRC"            "$TMP/prune.glb" --keep-attributes false
$GT weld  "$TMP/prune.glb"  "$TMP/weld.glb"
$GT join  "$TMP/weld.glb"   "$TMP/join.glb"
$GT dedup "$TMP/join.glb"   "$TMP/dedup.glb"
$GT meshopt "$TMP/dedup.glb" "$OUT" --level medium

echo
echo "origem:     $(du -h "$SRC" | cut -f1)"
echo "otimizado:  $(du -h "$OUT" | cut -f1)"
