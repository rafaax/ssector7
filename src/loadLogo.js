import { Box3, Group, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { config } from './config.js';

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
 * O exportador gravou metallic 0.32 / roughness 0.2, que nao le como cromo.
 * Os valores reais da cena ficam em config.materials, por nome de material.
 */
function applyMaterials(root) {
  root.traverse((object) => {
    if (!object.isMesh) return;

    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      const preset = config.materials[material.name];
      if (!preset) continue;

      material.color.setHex(preset.color);
      material.metalness = preset.metalness;
      material.roughness = preset.roughness;
      material.envMapIntensity = preset.envMapIntensity;
      material.needsUpdate = true;
    }
  });
}
