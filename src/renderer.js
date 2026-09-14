import {
  ACESFilmicToneMapping,
  Box3,
  MathUtils,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Timer,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { config } from './config.js';

/**
 * Renderer + camera + controls + render loop.
 *
 * O loop expoe `registerUpdate(fn)`: cada fn recebe (delta, elapsed) por frame.
 * E esse o ponto de extensao para animacoes futuras - nada mais precisa mudar
 * aqui para adicionar comportamento novo.
 */
export function createStage(container) {
  const scene = new Scene();

  const renderer = new WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = config.toneMappingExposure;
  renderer.outputColorSpace = SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const camera = new PerspectiveCamera(
    config.camera.fov,
    1,
    config.camera.near,
    config.camera.far,
  );
  camera.position.set(0, 0, 3);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = config.controls.dampingFactor;
  controls.enablePan = false;
  controls.minPolarAngle = config.controls.minPolarAngle;
  controls.maxPolarAngle = config.controls.maxPolarAngle;

  const updates = new Set();
  const timer = new Timer();

  function registerUpdate(fn) {
    updates.add(fn);
    return () => updates.delete(fn);
  }

  function resize() {
    const { clientWidth: w, clientHeight: h } = container;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  // Reenquadra junto com o resize: o logo e muito largo e sairia da tela em
  // viewport estreita se so o aspect fosse atualizado.
  let framedObject = null;
  const resizeObserver = new ResizeObserver(() => {
    resize();
    if (framedObject) frameObject(framedObject, { preserveOrbit: true });
  });
  resizeObserver.observe(container);
  resize();

  renderer.setAnimationLoop((timestamp) => {
    timer.update(timestamp);
    const delta = Math.min(timer.getDelta(), 0.1); // clamp apos aba em background
    const elapsed = timer.getElapsed();
    for (const fn of updates) fn(delta, elapsed);
    controls.update();
    renderer.render(scene, camera);
  });

  /**
   * Posiciona a camera para enquadrar o objeto inteiro, a partir da sua
   * bounding box - sem numeros magicos que quebram se o modelo mudar.
   *
   * Com `preserveOrbit` mantem a direcao de visada atual (usado no resize,
   * para nao jogar fora a orbita que o usuario escolheu).
   */
  function frameObject(object, { preserveOrbit = false } = {}) {
    const box = new Box3().setFromObject(object);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());

    // Enquadra pela largura e altura reais (o logo e largo e baixo; uma esfera
    // envolvente desperdicaria metade da tela) e soma a profundidade, ja que a
    // peca gira em Y e a espessura entra no enquadramento.
    const halfFovY = MathUtils.degToRad(camera.fov) * 0.5;
    const halfFovX = Math.atan(Math.tan(halfFovY) * camera.aspect);

    const distanceForHeight = size.y * 0.5 / Math.tan(halfFovY);
    const distanceForWidth = size.x * 0.5 / Math.tan(halfFovX);
    const distance =
      config.camera.fitOffset * Math.max(distanceForHeight, distanceForWidth) + size.z * 0.5;

    const dir = preserveOrbit
      ? camera.position.clone().sub(controls.target).normalize()
      : new Vector3(
          config.camera.direction.x,
          config.camera.direction.y,
          config.camera.direction.z,
        ).normalize();

    camera.position.copy(center).addScaledVector(dir, distance);
    camera.near = distance / 100;
    camera.far = distance * 100;
    camera.updateProjectionMatrix();

    controls.target.copy(center);
    controls.minDistance = distance * config.controls.minDistanceFactor;
    controls.maxDistance = distance * config.controls.maxDistanceFactor;
    controls.update();

    return { center, size, distance };
  }

  function dispose() {
    renderer.setAnimationLoop(null);
    resizeObserver.disconnect();
    controls.dispose();
    renderer.dispose();
    renderer.domElement.remove();
    updates.clear();
  }

  return {
    scene,
    camera,
    renderer,
    controls,
    registerUpdate,
    frameObject: (object, options) => {
      framedObject = object;
      return frameObject(object, options);
    },
    dispose,
  };
}
