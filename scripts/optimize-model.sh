#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

SRC="${1:-source/logo4.glb}"
INSET="${2:-0.0014}"
OUT=src/assets/logo.glb
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

GT="npx --no-install gltf-transform"

$GT prune "$SRC"            "$TMP/prune.glb" --keep-attributes false
$GT weld  "$TMP/prune.glb"  "$TMP/weld.glb"
node scripts/thin-outline.mjs "$TMP/weld.glb" "$TMP/thin.glb" "$INSET"
$GT join  "$TMP/thin.glb"   "$TMP/join.glb"
$GT dedup "$TMP/join.glb"   "$TMP/dedup.glb"
$GT meshopt "$TMP/dedup.glb" "$OUT" --level medium

echo
echo "origem:     $(du -h "$SRC" | cut -f1)"
echo "otimizado:  $(du -h "$OUT" | cut -f1)"
