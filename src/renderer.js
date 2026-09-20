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

export function createStage(container) {
  const scene = new Scene();

  const renderer = new WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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

  let framedObject = null;
  let activeLimits = config.controls;
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
    const delta = Math.min(timer.getDelta(), 0.25);
    const elapsed = timer.getElapsed();

    for (const fn of updates) fn(delta, elapsed);

    const cameraMoved = controls.update(delta);

    if (needsRender || cameraMoved || updates.size > 0) {
      renderer.render(scene, camera);
      needsRender = false;
    }
  });

  function computeFrame(
    object,
    { direction, preserveOrbit = false, fitOffset = config.camera.fitOffset } = {},
  ) {
    object.updateWorldMatrix(true, true);

    const box = new Box3().setFromObject(object);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());

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
    setFramedObject(object, limits) {
      framedObject = object;
      if (limits) activeLimits = limits;
    },
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
