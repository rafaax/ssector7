import { DirectionalLight, AmbientLight, PMREMGenerator } from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { config } from './config.js';

/**
 * Environment map gerado em runtime (RoomEnvironment) - da reflexo ao material
 * cromado sem baixar nenhum HDRI. Mais as luzes que marcam as bordas extrudadas.
 *
 * @returns {() => void} dispose
 */
export function setupEnvironment(renderer, scene) {
  // scene.background fica nulo de proposito: o canvas e transparente e o fundo
  // e o gradiente CSS, mais suave do que uma cor chapada atras do cromado.
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const envMap = pmrem.fromScene(room, 0.04).texture;
  scene.environment = envMap;

  room.dispose();
  pmrem.dispose();

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
    envMap.dispose();
    scene.environment = null;
  };
}
