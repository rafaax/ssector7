import { Box3, Group, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

export async function loadLogo(url, onProgress) {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);

  const gltf = await loader.loadAsync(url, (event) => {
    if (!onProgress) return;
    onProgress(event.total > 0 ? event.loaded / event.total : 0);
  });

  const model = gltf.scene;

  const box = new Box3().setFromObject(model);
  const center = box.getCenter(new Vector3());
  model.position.sub(center);

  const group = new Group();
  group.name = 'logo';
  group.add(model);
  return group;
}

const ROLE_BY_MATERIAL_NAME = {
  chrome_face: 'outline',
  steel_edge: 'body',
};

export function applyMaterials(root, preset) {
  root.traverse((object) => {
    if (!object.isMesh) return;

    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      const role = ROLE_BY_MATERIAL_NAME[material.name];
      const values = role && preset[role];
      if (!values) continue;

      material.color.setHex(values.color);
      material.emissive.setHex(values.emissive);
      material.emissiveIntensity = values.emissiveIntensity;
      material.metalness = values.metalness;
      material.roughness = values.roughness;
      material.envMapIntensity = values.envMapIntensity;
      material.needsUpdate = true;
    }
  });
}
