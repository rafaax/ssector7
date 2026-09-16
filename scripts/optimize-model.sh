#!/usr/bin/env bash
# Comprime o GLB de origem para src/assets/logo.glb, de onde o Vite o publica
# com hash no nome (cache imutavel).
# Uso: scripts/optimize-model.sh [arquivo.glb] [recuo]  (padrao: source/logo4.glb 0.0014)
#   prune  - remove as UVs nao usadas (o modelo nao tem nenhuma textura)
#   weld   - funde vertices duplicados
#   thin   - afina o traco branco recuando as bordas da tampa (ver o script);
#            precisa vir depois do weld, que e quem cria a topologia de borda
#   join   - junta as primitives em 1 por material (2 draw calls)
#   dedup  - remove accessors repetidos
#   meshopt- quantiza + EXT_meshopt_compression
set -euo pipefail

cd "$(dirname "$0")/.."

SRC="${1:-source/logo4.glb}"
# Quanto cada borda da tampa recua, em unidades de mundo (o logo tem 1.87 de
# largura). 0.0014 leva o traco de 6.31 para 4.74 por mil da largura do logo -
# a mesma proporcao do desenho de referencia em public/logo.png. 0 desliga.
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
