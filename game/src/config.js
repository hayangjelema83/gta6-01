// Solmar City — shared constants, palette and small math helpers.
// Every number here tunes the feel of the whole game: world size, speeds,
// wanted rules and the sun-soaked coastal palette of the city.

export const WORLD_W = 3200;
export const WORLD_H = 2400;
export const ROAD_W = 96;
export const VIEW_W = 1280;
export const VIEW_H = 720;

export const COLORS = {
  grass: '#7fae5a',
  grassDark: '#6f9c4e',
  sand: '#e8d39a',
  water: '#2f7fb8',
  waterDeep: '#256b9e',
  road: '#3a3d42',
  roadLine: '#e8d44d',
  sidewalk: '#b9b3a4',
  buildingRoof: '#c96f4a',
  buildingRoof2: '#5b7fa6',
  buildingRoof3: '#8a6fb0',
  park: '#5da24a',
  parkPath: '#d9c9a3',
  hudBg: 'rgba(12, 16, 24, 0.72)',
  hudText: '#f5f1e6',
  accent: '#ffc93c',
  police: '#2b5fd9',
  policeLight: '#ff3b30',
  marker: '#ffd23c',
};

export const SAVE_KEY = 'solmar-save-v1';

export const PLAYER = {
  radius: 14,
  walkSpeed: 210,
  runSpeed: 300,
  maxHealth: 100,
  startCash: 120,
  startAmmo: 48,
};

export const CAR = {
  length: 54,
  width: 26,
  maxSpeed: 520,
  maxReverse: 160,
  accel: 420,
  brake: 700,
  turnRate: 2.6,
};

// mulberry32 — a tiny deterministic RNG so ?shot= scenes and the city
// layout are identical for the same seed.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function dist(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

export function angleTo(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

export function angleDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}
