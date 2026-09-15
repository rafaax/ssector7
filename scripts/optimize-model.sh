#!/usr/bin/env bash
# Comprime o GLB de origem para src/assets/logo.glb, de onde o Vite o publica
# com hash no nome (cache imutavel).
# Uso: scripts/optimize-model.sh [arquivo.glb]  (padrao: source/logo2.glb)
#   prune  - remove as UVs nao usadas (o modelo nao tem nenhuma textura)
#   weld   - funde vertices duplicados
#   join   - junta as primitives em 1 por material (2 draw calls)
#   dedup  - remove accessors repetidos
#   meshopt- quantiza + EXT_meshopt_compression
set -euo pipefail

cd "$(dirname "$0")/.."

SRC="${1:-source/logo2.glb}"
OUT=src/assets/logo.glb
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
