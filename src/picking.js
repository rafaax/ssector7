import { Raycaster, Vector2 } from 'three';
import { config } from './config.js';
import { createTween } from './tween.js';

export function createPicker({ stage, interactives, onActivate }) {
  const canvas = stage.renderer.domElement;
  const raycaster = new Raycaster();
  const pointer = new Vector2();

  const CLICK_SLOP = 6;
  const CLICK_TIME = 500;

  let hovered = null;
  let focused = null;
  let pressed = null;
  let queued = false;
  let enabled = true;

  const { scale: hoverScale, duration } = config.button.hover;
  const highlights = new Map(
    interactives.map((item) => [
      item,
      createTween({
        stage,
        duration,
        onUpdate: (value) => {
          item.setHighlight(value);
          item.object.scale.setScalar(1 + (hoverScale - 1) * value);
        },
      }),
    ]),
  );

  function setTarget(item, target) {
    highlights.get(item)?.to(target);
  }

  function pick(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, stage.camera);

    const targets = interactives.filter((item) => isVisible(item.object)).map((item) => item.target);
    const hit = raycaster.intersectObjects(targets, false)[0];
    return hit ? interactives.find((item) => item.target === hit.object) ?? null : null;
  }

  function setHovered(item) {
    if (item === hovered) return;
    if (hovered && hovered !== focused) setTarget(hovered, 0);
    hovered = item;
    if (hovered) setTarget(hovered, 1);
    canvas.style.cursor = hovered ? 'pointer' : '';
  }

  function onPointerMove(event) {
    if (event.pointerType === 'touch' || !enabled) return;
    if (queued) return;

    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      setHovered(pick(event));
    });
  }

  function onPointerDown(event) {
    if (!enabled) return;
    const item = pick(event);
    pressed = item ? { item, x: event.clientX, y: event.clientY, at: performance.now() } : null;
  }

  function onPointerUp(event) {
    if (!enabled || !pressed) return;

    const moved = Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y);
    const elapsed = performance.now() - pressed.at;
    const item = pressed.item;
    pressed = null;

    if (moved > CLICK_SLOP || elapsed > CLICK_TIME) return;
    if (pick(event) !== item) return;

    onActivate(item);
  }

  function onPointerLeave() {
    pressed = null;
    setHovered(null);
  }

  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointerleave', onPointerLeave);
  canvas.addEventListener('pointercancel', onPointerLeave);

  return {
    setFocus(item, on) {
      focused = on ? item : null;
      setTarget(item, on || item === hovered ? 1 : 0);
    },

    setEnabled(value) {
      enabled = value;
      if (!enabled) {
        pressed = null;
        setHovered(null);
      }
    },

    dispose() {
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('pointercancel', onPointerLeave);
      for (const tween of highlights.values()) tween.dispose();
      canvas.style.cursor = '';
    },
  };
}

function isVisible(object) {
  for (let node = object; node; node = node.parent) {
    if (!node.visible) return false;
  }
  return true;
}
