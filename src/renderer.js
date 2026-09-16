import {
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
 *
 * A cena e estatica em repouso, entao o loop so desenha quando ha motivo:
 * algum update registrado, a camera se movendo (arrasto, zoom, damping) ou um
 * `invalidate()` explicito. Parado, o custo de GPU por frame e zero.
 */
export function createStage(container) {
  const scene = new Scene();

  const renderer = new WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  // o tonemapping vem do tema (src/theme.js), que o troca junto com as cores
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

  let needsRender = true;
  /** Forca um desenho no proximo frame. */
  const invalidate = () => {
    needsRender = true;
  };
  controls.addEventListener('change', invalidate);

  function registerUpdate(fn) {
    updates.add(fn);
    return () => updates.delete(fn);
  }

  function registerResize(fn) {
    resizeHooks.add(fn);
    return () => resizeHooks.delete(fn);
  }

  function resize() {
    const { clientWidth: w, clientHeight: h } = container;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    invalidate();
  }

  // Reenquadra junto com o resize: o logo e muito largo e sairia da tela em
  // viewport estreita se so o aspect fosse atualizado. `framedObject` e quem
  // esta em foco agora - muda com a estacao - e fica nulo durante um voo, para
  // um resize no meio do trajeto nao teleportar a camera.
  let framedObject = null;
  let activeLimits = config.controls;
  // Quem precisa se remodelar quando a janela muda (a moldura da sala segue a
  // proporcao da tela) roda antes do reenquadramento, senao a camera enquadraria
  // a forma antiga.
  const resizeHooks = new Set();
  const resizeObserver = new ResizeObserver(() => {
    resize();
    for (const hook of resizeHooks) hook(container.clientWidth, container.clientHeight);
    if (framedObject) frameObject(framedObject, { preserveOrbit: true });
  });
  resizeObserver.observe(container);
  resize();

  renderer.setAnimationLoop((timestamp) => {
    timer.update(timestamp);
    // O clamp existe para a aba que volta do segundo plano nao entregar um
    // delta de varios segundos e teleportar as animacoes. O teto e generoso de
    // proposito: cortar em 0.1s significaria que abaixo de 10 fps o tempo passa
    // mais devagar que o relogio e o voo fica lento num aparelho fraco.
    const delta = Math.min(timer.getDelta(), 0.25);
    const elapsed = timer.getElapsed();

    for (const fn of updates) fn(delta, elapsed);

    // update() devolve true enquanto a camera ainda se move (inclui o damping)
    const cameraMoved = controls.update(delta);

    if (needsRender || cameraMoved || updates.size > 0) {
      renderer.render(scene, camera);
      needsRender = false;
    }
  });

  /**
   * Calcula - sem aplicar - a pose de camera que enquadra o objeto inteiro, a
   * partir da sua bounding box, sem numeros magicos que quebram se o modelo
   * mudar. Separado de `frameObject` porque a navegacao precisa do destino para
   * animar ate ele, e nao de um teleporte.
   *
   * `direction` sobrescreve a direcao de visada (cada estacao tem a sua);
   * `fitOffset` e a folga ao redor do objeto - a sala pede mais ar que o logo;
   * `preserveOrbit` mantem a direcao atual, usado no resize para nao jogar fora
   * a orbita que o usuario escolheu.
   */
  function computeFrame(
    object,
    { direction, preserveOrbit = false, fitOffset = config.camera.fitOffset } = {},
  ) {
    // Box3.setFromObject atualiza a matriz do objeto e dos filhos, mas nao a
    // dos pais. Num link direto para uma estacao o enquadramento acontece antes
    // do primeiro render, quando a cena inteira ainda esta com matriz
    // identidade - e a sala, que so existe deslocada em z pelo grupo pai, seria
    // medida na origem.
    object.updateWorldMatrix(true, true);

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
    const distance = fitOffset * Math.max(distanceForHeight, distanceForWidth) + size.z * 0.5;

    const source = direction ?? (preserveOrbit ? null : config.camera.direction);
    const dir = source
      ? new Vector3(source.x, source.y, source.z).normalize()
      : camera.position.clone().sub(controls.target).normalize();

    return {
      position: center.clone().addScaledVector(dir, distance),
      target: center,
      distance,
      size,
    };
  }

  /**
   * Coloca a camera e os controls numa pose vinda de `computeFrame`.
   *
   * Os limites de orbita vem da estacao ativa, nao da config global: no about a
   * peca e chapada e girar por tras dela nao faria sentido. Como ficam
   * guardados em `activeLimits`, o reenquadramento do resize os preserva.
   */
  function applyFrame({ position, target, distance }, limits = activeLimits) {
    camera.position.copy(position);
    camera.near = distance / 100;
    camera.far = distance * 100;
    camera.updateProjectionMatrix();

    controls.target.copy(target);
    controls.minPolarAngle = limits.minPolarAngle;
    controls.maxPolarAngle = limits.maxPolarAngle;
    controls.minAzimuthAngle = limits.minAzimuthAngle ?? -Infinity;
    controls.maxAzimuthAngle = limits.maxAzimuthAngle ?? Infinity;
    controls.minDistance = distance * limits.minDistanceFactor;
    controls.maxDistance = distance * limits.maxDistanceFactor;
    controls.update();
  }

  function frameObject(object, options) {
    const frame = computeFrame(object, options);
    applyFrame(frame);
    return frame;
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
    registerResize,
    invalidate,
    computeFrame,
    applyFrame,
    /** Quem o resize deve reenquadrar. `null` suspende o reenquadramento. */
    setFramedObject(object, limits) {
      framedObject = object;
      if (limits) activeLimits = limits;
    },
    /** Afrouxa os limites de orbita durante um voo, para nao cortarem a curva. */
    releaseControlLimits() {
      controls.minPolarAngle = 0;
      controls.maxPolarAngle = Math.PI;
      controls.minAzimuthAngle = -Infinity;
      controls.maxAzimuthAngle = Infinity;
      controls.minDistance = 0;
      controls.maxDistance = Infinity;
    },
    frameObject: (object, options) => {
      framedObject = object;
      return frameObject(object, options);
    },
    dispose,
  };
}
