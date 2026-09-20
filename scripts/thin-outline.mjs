import { NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';

const [input, output, amount = '0.0014'] = process.argv.slice(2);
const INSET = Number(amount);

const CAP_NORMAL_Z = 0.9;
const KEY = 1e6;

const io = new NodeIO()
  .registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

const doc = await io.read(input);

const primitives = [];
for (const mesh of doc.getRoot().listMeshes()) primitives.push(...mesh.listPrimitives());

const outward = new Map();
const key = (x, y) => `${Math.round(x * KEY)},${Math.round(y * KEY)}`;

let bordas = 0;

for (const prim of primitives) {
  if (!isCap(prim)) continue;

  const position = prim.getAttribute('POSITION');
  const indices = prim.getIndices();
  const count = indices ? indices.getCount() : position.getCount();
  const at = (i) => (indices ? indices.getScalar(i) : i);

  const edges = new Map();
  for (let t = 0; t < count / 3; t += 1) {
    const tri = [at(t * 3), at(t * 3 + 1), at(t * 3 + 2)];
    for (let e = 0; e < 3; e += 1) {
      const a = tri[e];
      const b = tri[(e + 1) % 3];
      const opposite = tri[(e + 2) % 3];
      const id = a < b ? `${a}_${b}` : `${b}_${a}`;
      const seen = edges.get(id);
      if (seen) seen.count += 1;
      else edges.set(id, { count: 1, a, b, opposite });
    }
  }

  const va = [0, 0, 0];
  const vb = [0, 0, 0];
  const vo = [0, 0, 0];

  for (const edge of edges.values()) {
    if (edge.count !== 1) continue;
    bordas += 1;

    position.getElement(edge.a, va);
    position.getElement(edge.b, vb);
    position.getElement(edge.opposite, vo);

    let nx = -(vb[1] - va[1]);
    let ny = vb[0] - va[0];
    const len = Math.hypot(nx, ny);
    if (len < 1e-12) continue;
    nx /= len;
    ny /= len;

    const mx = (va[0] + vb[0]) * 0.5;
    const my = (va[1] + vb[1]) * 0.5;
    if (nx * (vo[0] - mx) + ny * (vo[1] - my) > 0) {
      nx = -nx;
      ny = -ny;
    }

    for (const [x, y] of [[va[0], va[1]], [vb[0], vb[1]]]) {
      const id = key(x, y);
      const acc = outward.get(id);
      if (acc) {
        acc[0] += nx;
        acc[1] += ny;
      } else {
        outward.set(id, [nx, ny]);
      }
    }
  }
}

const done = new Set();
let movidos = 0;

for (const prim of primitives) {
  const position = prim.getAttribute('POSITION');
  if (done.has(position)) continue;
  done.add(position);

  const v = [0, 0, 0];
  for (let i = 0; i < position.getCount(); i += 1) {
    position.getElement(i, v);
    const acc = outward.get(key(v[0], v[1]));
    if (!acc) continue;

    const len = Math.hypot(acc[0], acc[1]);
    if (len < 1e-12) continue;

    v[0] -= (acc[0] / len) * INSET;
    v[1] -= (acc[1] / len) * INSET;
    position.setElement(i, v);
    movidos += 1;
  }
}

await io.write(output, doc);

console.log(`recuo de ${INSET} nas bordas da tampa`);
console.log(`  ${bordas} arestas de borda, ${outward.size} posicoes, ${movidos} vertices movidos`);

function isCap(prim) {
  const normal = prim.getAttribute('NORMAL');
  const indices = prim.getIndices();
  const v = [0, 0, 0];
  let sum = 0;
  let n = 0;

  const total = indices ? Math.min(indices.getCount(), 3000) : Math.min(normal.getCount(), 3000);
  for (let i = 0; i < total; i += 1) {
    normal.getElement(indices ? indices.getScalar(i) : i, v);
    sum += Math.abs(v[2]);
    n += 1;
  }
  return n > 0 && sum / n > CAP_NORMAL_Z;
}
