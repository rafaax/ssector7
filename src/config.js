export const config = {
  theme: 'auto',

  autoTheme: {
    lightFrom: 6,
    lightTo: 18,
  },

  toneMappingExposure: 1.0,

  camera: {
    fov: 35,
    near: 0.01,
    far: 100,
    fitOffset: 1.12,
    direction: { x: 0, y: 0.28, z: 1 },
  },

  controls: {
    dampingFactor: 0.06,
    minPolarAngle: 0.35,
    maxPolarAngle: 2.45,
    minDistanceFactor: 0.45,
    maxDistanceFactor: 2.5,
  },

  intro: {
    duration: 1.6,
    fromScale: 0.82,
    fromSpin: -0.9,
  },

  button: {
    size: 0.072,
    depth: 0.0236,
    tracking: 0.24,
    hover: { scale: 1.08, duration: 0.18 },
  },

  room: {
    distance: 5,
    height: 0.95,
    aspect: { min: 0.62, max: 1.6 },
    corner: 0.16,
    back: { label: 'back', size: 0.026, inset: 0.075 },
    fitOffset: { narrow: 1.06, wide: 1.32 },
  },

  flight: {
    duration: 1.8,
    arc: { x: 0, y: 0.9, z: 0 },
    fovPunch: 6,
  },

  loader: {
    density: 'regular',
    period: 10,
    samples: 140,
    fps: 30,
  },

  particles: {
    count: 2800,
    size: 0.021,
    spread: { x: 2.8, y: 1.8, zNear: 2.5, zFar: -8.5 },
    fade: 0.8,
  },

  lights: {
    key: { color: 0xffffff, intensity: 1.6, position: { x: 2, y: 3, z: 2.5 } },
    rim: { color: 0xffffff, intensity: 1.2, position: { x: -2.5, y: 1.2, z: -2 } },
    fill: { color: 0xffffff, intensity: 0.2 },
  },

  themes: {
    dark: {
      background: 0x07090c,
      fallbackImage: 'logo.png',
      environment: false,
      toneMapping: 'none',
      outline: {
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 1.0,
        metalness: 0.0,
        roughness: 0.4,
        envMapIntensity: 0.3,
      },
      body: {
        color: 0x0b0d10,
        emissive: 0x000000,
        emissiveIntensity: 0.0,
        metalness: 0.0,
        roughness: 0.95,
        envMapIntensity: 0.08,
      },
      ui: {
        line: 0xffffff,
        dim: 0x8b99a6,
        particle: 0xffffff,
        particleOpacity: 0.8,
      },
    },

    light: {
      background: 0xf7f7f8,
      fallbackImage: 'logo_light.png',
      environment: true,
      toneMapping: 'aces',
      outline: {
        color: 0x000000,
        emissive: 0x000000,
        emissiveIntensity: 0.0,
        metalness: 0.0,
        roughness: 0.5,
        envMapIntensity: 0.1,
      },
      body: {
        color: 0xf2f3f5,
        emissive: 0x000000,
        emissiveIntensity: 0.0,
        metalness: 0.0,
        roughness: 0.9,
        envMapIntensity: 0.35,
      },
      ui: {
        line: 0x000000,
        dim: 0x6b7480,
        particle: 0x2b3038,
        particleOpacity: 0.4,
      },
    },
  },
};
