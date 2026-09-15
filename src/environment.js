import { DirectionalLight, AmbientLight, PMREMGenerator } from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { config } from './config.js';

/**
 * As luzes da cena. Entram uma vez; o que muda entre temas sao os materiais,
 * o environment e o tonemapping.
 *
 * scene.background fica nulo de proposito: o canvas e transparente e o fundo
 * e o gradiente CSS, que acompanha o tema.
 *
 * @returns {() => void} dispose
 */
export function setupLights(scene) {
  const { key, rim, fill } = config.lights;

  const keyLight = new DirectionalLight(key.color, key.intensity);
  keyLight.position.set(key.position.x, key.position.y, key.position.z);

  const rimLight = new DirectionalLight(rim.color, rim.intensity);
  rimLight.position.set(rim.position.x, rim.position.y, rim.position.z);

  const fillLight = new AmbientLight(fill.color, fill.intensity);

  scene.add(keyLight, rimLight, fillLight);

  return () => {
    scene.remove(keyLight, rimLight, fillLight);
    keyLight.dispose();
    rimLight.dispose();
  };
}

let currentEnvMap = null;

/**
 * Liga ou desliga o environment map conforme o tema pede, gerando-o em runtime
 * (RoomEnvironment) - sem baixar nenhum HDRI. Chamavel a cada troca de tema:
 * descarta o anterior antes de criar o novo.
 */
export function applyEnvironment(renderer, scene, preset) {
  if (currentEnvMap) {
    currentEnvMap.dispose();
    currentEnvMap = null;
  }
  scene.environment = null;

  if (!preset.environment) return;

  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  currentEnvMap = pmrem.fromScene(room, 0.04).texture;
  scene.environment = currentEnvMap;

  room.dispose();
  pmrem.dispose();
}
