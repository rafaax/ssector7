// Todos os numeros ajustaveis da cena ficam aqui.

export const config = {
  // O canvas e transparente: o fundo vem do gradiente CSS em style.css.
  // Este valor so alimenta o clear color quando o gradiente nao aparece.
  background: 0x07090c,

  toneMappingExposure: 1.15,

  camera: {
    fov: 35,
    near: 0.01,
    far: 100,
    // multiplicador do raio da bounding box ao enquadrar o modelo
    fitOffset: 1.12,
    // direcao de onde a camera olha o modelo (normalizada no uso)
    direction: { x: 0, y: 0.28, z: 1 },
  },

  controls: {
    dampingFactor: 0.06,
    minPolarAngle: 0.35,
    maxPolarAngle: 2.45,
    minDistanceFactor: 0.45, // x distancia de enquadramento
    maxDistanceFactor: 2.5,
  },

  // rotacao automatica do logo, em radianos por segundo
  autoRotate: {
    speed: 0.22,
    // amplitude da oscilacao vertical (radianos) e periodo (segundos)
    tiltAmplitude: 0.07,
    tiltPeriod: 9,
    // tempo (s) parado apos o usuario interagir antes de voltar a girar
    resumeDelay: 1.6,
  },

  intro: {
    duration: 1.6,
    fromScale: 0.82,
    fromSpin: -0.9, // radianos a mais no inicio da animacao de entrada
  },

  lights: {
    key: { color: 0xffffff, intensity: 3.0, position: { x: 2, y: 3, z: 2.5 } },
    rim: { color: 0x9fc4ff, intensity: 2.6, position: { x: -2.5, y: 1.2, z: -2 } },
    fill: { color: 0x2a3644, intensity: 1.2 },
  },

  // sobrescreve o que veio do exportador: metallic 0.32 nao le como cromo
  materials: {
    chrome_face: {
      color: 0xe8eff5,
      metalness: 0.95,
      roughness: 0.12,
      envMapIntensity: 2.4,
    },
    steel_edge: {
      color: 0x3c4753,
      metalness: 0.85,
      roughness: 0.34,
      envMapIntensity: 1.6,
    },
  },
};
