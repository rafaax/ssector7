import { Box3, Group, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { theme } from './config.js';

/**
 * Carrega o GLB otimizado (EXT_meshopt_compression + KHR_mesh_quantization),
 * recentraliza o modelo na origem e aplica os ajustes de material.
 *
 * O recentro importa: a malha exportada esta apoiada em Y=0, entao girar o
 * objeto cru faria ele orbitar fora do proprio eixo.
 *
 * @param {string} url
 * @param {(progress: number) => void} [onProgress] 0..1
 * @returns {Promise<Group>}
 */
export async function loadLogo(url, onProgress) {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);

  const gltf = await loader.loadAsync(url, (event) => {
    if (!onProgress) return;
    // event.total e 0 quando o servidor nao manda Content-Length
    onProgress(event.total > 0 ? event.loaded / event.total : 0);
  });

  const model = gltf.scene;
  applyMaterials(model);

  const box = new Box3().setFromObject(model);
  const center = box.getCenter(new Vector3());
  model.position.sub(center);

  const group = new Group();
  group.name = 'logo';
  group.add(model);
  return group;
}

/**
 * Traduz os nomes de material do GLB para os papeis do tema.
 * Os nomes vieram do exportador e nao descrevem mais a aparencia; o que
 * importa e a geometria, confirmada pelas normais da malha:
 *   chrome_face -> |normal.z| medio 0.997, sao as tampas da extrusao
 *   steel_edge  -> |normal.z| medio 0.523, sao as paredes laterais
 */
const ROLE_BY_MATERIAL_NAME = {
  chrome_face: 'outline',
  steel_edge: 'body',
};

/** Aplica o preset do tema ativo por cima do que veio do exportador. */
function applyMaterials(root) {
  root.traverse((object) => {
    if (!object.isMesh) return;

    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      const role = ROLE_BY_MATERIAL_NAME[material.name];
      const preset = role && theme[role];
      if (!preset) continue;

      material.color.setHex(preset.color);
      material.emissive.setHex(preset.emissive);
      material.emissiveIntensity = preset.emissiveIntensity;
      material.metalness = preset.metalness;
      material.roughness = preset.roughness;
      material.envMapIntensity = preset.envMapIntensity;
      material.needsUpdate = true;
    }
  });
}
