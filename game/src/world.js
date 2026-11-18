// Solmar City — the city itself: road grid, building blocks, parks and the
// beach. Generation is seeded, so the same seed always builds the same city.

import { WORLD_W, WORLD_H, ROAD_W, COLORS, mulberry32, pick } from './config.js';

export const BEACH_X = 2820; // sand starts here, water at the east edge
export const WATER_X = 2960;

const ROAD_COLORS = ['#c96f4a', '#5b7fa6', '#8a6fb0', '#d9a441', '#4a9e7f', '#b0526e'];

// Vertical and horizontal road centre lines across the city.
export const VERTICAL_ROADS = [260, 620, 980, 1340, 1700, 2060, 2420];
export const HORIZONTAL_ROADS = [240, 580, 920, 1260, 1600, 1940, 2180];

export function buildWorld(seed) {
  const rng = mulberry32(seed);
  const buildings = [];
  const parks = [];
  const trees = [];
  const lamps = [];

  // One block sits between neighbouring roads. Fill most blocks with a
  // building, turn some into parks, leave a few as empty lots.
  for (let i = 0; i < VERTICAL_ROADS.length - 1; i++) {
    for (let j = 0; j < HORIZONTAL_ROADS.length - 1; j++) {
      const x0 = VERTICAL_ROADS[i] + ROAD_W / 2 + 14;
      const x1 = VERTICAL_ROADS[i + 1] - ROAD_W / 2 - 14;
      const y0 = HORIZONTAL_ROADS[j] + ROAD_W / 2 + 14;
      const y1 = HORIZONTAL_ROADS[j + 1] - ROAD_W / 2 - 14;
      if (x1 - x0 < 90 || y1 - y0 < 90) continue;
      const roll = rng();
      if (roll < 0.16) {
        // A park: green block with a path and trees.
        parks.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
        const n = 3 + Math.floor(rng() * 4);
        for (let t = 0; t < n; t++) {
          trees.push({ x: x0 + 20 + rng() * (x1 - x0 - 40), y: y0 + 20 + rng() * (y1 - y0 - 40), r: 12 + rng() * 8 });
        }
        continue;
      }
      if (roll < 0.24) continue; // empty lot
      const bw = (x1 - x0) * (0.55 + rng() * 0.35);
      const bh = (y1 - y0) * (0.55 + rng() * 0.35);
      const bx = x0 + (x1 - x0 - bw) / 2;
      const by = y0 + (y1 - y0 - bh) / 2;
      buildings.push({
        x: bx, y: by, w: bw, h: bh,
        color: pick(rng, ROAD_COLORS),
        roof: rng() < 0.5,
        label: pick(rng, ['', '', '', 'HOTEL', 'MART', 'CAFE', 'GARAGE', 'BANK', 'CLUB']),
      });
      if (rng() < 0.5) {
        trees.push({ x: bx - 14, y: by + bh / 2, r: 10 + rng() * 5 });
      }
    }
  }

  // Street lamps along the roads.
  for (const rx of VERTICAL_ROADS) {
    for (const ry of HORIZONTAL_ROADS) {
      lamps.push({ x: rx + ROAD_W / 2 + 8, y: ry + ROAD_W / 2 + 8 });
    }
  }
  // Palm trees along the beach, jittered so the line never looks stamped.
  for (let y = 60; y < WORLD_H - 40; y += 130) {
    trees.push({ x: BEACH_X - 40 + rng() * 26, y: y + rng() * 20, r: 13, palm: true });
  }

  return {
    seed, buildings, parks, trees, lamps,
    // Named places the story and missions use.
    places: {
      hideout: { x: 620, y: 580, label: 'Hideout — Casa Luna' },
      diner: { x: 1340, y: 920, label: 'Diner — La Brisa' },
      warehouse: { x: 2420, y: 1600, label: 'Warehouse 9' },
      marina: { x: 2420, y: 240, label: 'Marina' },
      bank: { x: 980, y: 1260, label: 'Solmar Bank' },
      beach: { x: 2900, y: 1260, label: 'Playa Solmar' },
    },
  };
}

export function isRoad(x, y) {
  for (const rx of VERTICAL_ROADS) if (Math.abs(x - rx) <= ROAD_W / 2) return true;
  for (const ry of HORIZONTAL_ROADS) if (Math.abs(y - ry) <= ROAD_W / 2) return true;
  return false;
}

export function isWater(x, y) {
  return x >= WATER_X && y >= 0 && y <= WORLD_H;
}

export function isSand(x, y) {
  return x >= BEACH_X && x < WATER_X;
}

// True when a circle at (x, y) with radius r overlaps a building or the
// water. Roads, sidewalks, parks and sand are walkable / drivable.
export function hitsSolid(world, x, y, r) {
  if (x < r || y < r || x > WORLD_W - r || y > WORLD_H - r) return true;
  if (isWater(x, y)) return true;
  for (const b of world.buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return true;
  }
  return false;
}

// Push a circle out of any solid it overlaps. Returns true if it moved.
export function resolveCircle(world, ent, r) {
  let moved = false;
  for (const b of world.buildings) {
    const cx = Math.max(b.x, Math.min(ent.x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(ent.y, b.y + b.h));
    const dx = ent.x - cx;
    const dy = ent.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        ent.x = cx + (dx / d) * r;
        ent.y = cy + (dy / d) * r;
      } else {
        ent.y = b.y - r;
      }
      moved = true;
    }
  }
  if (ent.x >= WATER_X - r) { ent.x = WATER_X - r; moved = true; }
  ent.x = Math.max(r, Math.min(WORLD_W - r, ent.x));
  ent.y = Math.max(r, Math.min(WORLD_H - r, ent.y));
  return moved;
}

// Nearest point on a road centre line — used to place traffic and parked cars.
export function nearestRoadPoint(x, y) {
  let best = null;
  let bestD = Infinity;
  for (const rx of VERTICAL_ROADS) {
    const d = Math.abs(x - rx);
    if (d < bestD) { bestD = d; best = { x: rx, y, vertical: true }; }
  }
  for (const ry of HORIZONTAL_ROADS) {
    const d = Math.abs(y - ry);
    if (d < bestD) { bestD = d; best = { x, y: ry, vertical: false }; }
  }
  return best;
}

export { COLORS };
