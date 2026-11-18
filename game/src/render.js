// Solmar City — rendering: the camera, the city, every entity, effects
// and the warm late-afternoon light that makes Solmar feel sun-soaked.

import { WORLD_W, WORLD_H, ROAD_W, VIEW_W, VIEW_H, COLORS } from './config.js';
import { BEACH_X, WATER_X } from './world.js';
import { VERTICAL_ROADS, HORIZONTAL_ROADS } from './world.js';
import { clamp, lerp } from './config.js';
import { drawCar } from './vehicles.js';
import { drawPlayer } from './player.js';
import { drawPedestrian } from './traffic.js';
import { drawBullets } from './combat.js';
import { missionMarker } from './missions.js';

export function createCamera() {
  return { x: 0, y: 0, shake: 0 };
}

export function updateCamera(G, dt) {
  const p = G.player;
  const tx = clamp(p.x - VIEW_W / 2, 0, WORLD_W - VIEW_W);
  const ty = clamp(p.y - VIEW_H / 2, 0, WORLD_H - VIEW_H);
  G.camera.x = lerp(G.camera.x, tx, 1 - Math.pow(0.001, dt));
  G.camera.y = lerp(G.camera.y, ty, 1 - Math.pow(0.001, dt));
  if (G.camera.shake > 0) G.camera.shake -= dt;
}

function shakeOffset(G) {
  if (G.camera.shake <= 0) return { x: 0, y: 0 };
  const s = G.camera.shake * 8;
  return { x: (Math.random() - 0.5) * s, y: (Math.random() - 0.5) * s };
}

export function render(G) {
  const ctx = G.ctx;
  const cam = G.camera;
  const sh = shakeOffset(G);
  ctx.save();
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  ctx.translate(-Math.round(cam.x + sh.x), -Math.round(cam.y + sh.y));
  drawGround(ctx, G);
  drawParks(ctx, G);
  drawRoads(ctx, G);
  drawBeach(ctx, G);
  drawBuildings(ctx, G);
  drawTrees(ctx, G);
  drawMarker(ctx, G);
  drawPickups(ctx, G);
  for (const car of G.cars) drawCar(ctx, car, G.time);
  for (const ped of G.peds) drawPedestrian(ctx, ped, G.time);
  drawPlayer(ctx, G.player, G.time);
  drawBullets(ctx, G);
  drawEffects(ctx, G);
  ctx.restore();
  drawSunlight(ctx, G);
}

function drawGround(ctx, G) {
  // Base grass, with a subtle checker of mowing tones.
  ctx.fillStyle = COLORS.grass;
  ctx.fillRect(G.camera.x - 20, G.camera.y - 20, VIEW_W + 40, VIEW_H + 40);
  ctx.fillStyle = COLORS.grassDark;
  const tile = 160;
  const x0 = Math.floor((G.camera.x - 20) / tile) * tile;
  const y0 = Math.floor((G.camera.y - 20) / tile) * tile;
  for (let x = x0; x < G.camera.x + VIEW_W + 20; x += tile) {
    for (let y = y0; y < G.camera.y + VIEW_H + 20; y += tile) {
      if (((x / tile) + (y / tile)) % 2 === 0) ctx.fillRect(x, y, tile, tile);
    }
  }
}

function drawParks(ctx, G) {
  for (const park of G.world.parks) {
    if (!onScreen(G, park.x, park.y, park.w, park.h)) continue;
    ctx.fillStyle = COLORS.park;
    ctx.fillRect(park.x, park.y, park.w, park.h);
    ctx.fillStyle = COLORS.parkPath;
    ctx.fillRect(park.x + park.w / 2 - 8, park.y, 16, park.h);
    ctx.fillRect(park.x, park.y + park.h / 2 - 8, park.w, 16);
  }
}

function drawRoads(ctx, G) {
  ctx.fillStyle = COLORS.road;
  for (const rx of VERTICAL_ROADS) {
    ctx.fillRect(rx - ROAD_W / 2, 0, ROAD_W, WORLD_H);
  }
  for (const ry of HORIZONTAL_ROADS) {
    ctx.fillRect(0, ry - ROAD_W / 2, WORLD_W, ROAD_W);
  }
  // Sidewalks as lighter strips along each road edge.
  ctx.fillStyle = COLORS.sidewalk;
  for (const rx of VERTICAL_ROADS) {
    ctx.fillRect(rx - ROAD_W / 2 - 10, 0, 10, WORLD_H);
    ctx.fillRect(rx + ROAD_W / 2, 0, 10, WORLD_H);
  }
  for (const ry of HORIZONTAL_ROADS) {
    ctx.fillRect(0, ry - ROAD_W / 2 - 10, WORLD_W, 10);
    ctx.fillRect(0, ry + ROAD_W / 2, WORLD_W, 10);
  }
  // Dashed centre lines.
  ctx.fillStyle = COLORS.roadLine;
  for (const rx of VERTICAL_ROADS) {
    for (let y = 20; y < WORLD_H; y += 64) ctx.fillRect(rx - 2, y, 4, 30);
  }
  for (const ry of HORIZONTAL_ROADS) {
    for (let x = 20; x < WORLD_W; x += 64) ctx.fillRect(x, ry - 2, 30, 4);
  }
}

function drawBeach(ctx, G) {
  ctx.fillStyle = COLORS.sand;
  ctx.fillRect(BEACH_X, 0, WATER_X - BEACH_X, WORLD_H);
  ctx.fillStyle = COLORS.water;
  ctx.fillRect(WATER_X, 0, WORLD_W - WATER_X, WORLD_H);
  ctx.fillStyle = COLORS.waterDeep;
  const t = G.time;
  for (let y = 0; y < WORLD_H; y += 90) {
    const wob = Math.sin(t * 0.8 + y * 0.05) * 14;
    ctx.fillRect(WATER_X + 30 + wob, y + 20, 60, 5);
  }
  // Foam where the waves meet the sand.
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  const foam = Math.sin(t * 1.2) * 6;
  ctx.fillRect(WATER_X - 6 + foam, 0, 8, WORLD_H);
}

function drawBuildings(ctx, G) {
  for (const b of G.world.buildings) {
    if (!onScreen(G, b.x, b.y, b.w, b.h)) continue;
    // Long afternoon shadow to the north-east.
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(b.x + 14, b.y + 12, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 3;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    // Roof detail: a lighter inner panel and AC boxes.
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(b.x + 10, b.y + 10, b.w - 20, b.h - 20);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(b.x + b.w * 0.2, b.y + b.h * 0.25, 14, 10);
    ctx.fillRect(b.x + b.w * 0.65, b.y + b.h * 0.6, 14, 10);
    if (b.label) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 5);
    }
  }
}

function drawTrees(ctx, G) {
  for (const tree of G.world.trees) {
    if (!onScreen(G, tree.x - 20, tree.y - 20, 40, 40)) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(tree.x + 5, tree.y + 6, tree.r, tree.r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    if (tree.palm) {
      ctx.strokeStyle = '#8a6b3f';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(tree.x, tree.y + 8);
      ctx.lineTo(tree.x, tree.y - 8);
      ctx.stroke();
      ctx.fillStyle = '#3f9e4d';
    } else {
      ctx.fillStyle = '#3f8f3a';
    }
    ctx.beginPath();
    ctx.arc(tree.x, tree.y, tree.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.arc(tree.x - tree.r * 0.3, tree.y - tree.r * 0.3, tree.r * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMarker(ctx, G) {
  const m = missionMarker(G);
  if (!m) return;
  const pulse = 1 + Math.sin(G.time * 4) * 0.12;
  ctx.save();
  ctx.translate(m.x, m.y);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = 'rgba(255, 210, 60, 0.25)';
  ctx.beginPath();
  ctx.arc(0, 0, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.marker;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 34, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = COLORS.marker;
  ctx.beginPath();
  ctx.moveTo(0, -52);
  ctx.lineTo(12, -26);
  ctx.lineTo(-12, -26);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('!', 0, -32);
  ctx.restore();
}

function drawPickups(ctx, G) {
  for (const pk of G.pickups) {
    if (!onScreen(G, pk.x - 20, pk.y - 20, 40, 40)) continue;
    const bob = Math.sin(G.time * 3 + pk.x) * 3;
    ctx.save();
    ctx.translate(pk.x, pk.y + bob);
    if (pk.kind === 'ammo') {
      ctx.fillStyle = '#2fae4e';
      ctx.fillRect(-11, -8, 22, 16);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('AMMO', 0, 4);
    } else if (pk.kind === 'health') {
      ctx.fillStyle = '#e8e8e8';
      ctx.fillRect(-10, -10, 20, 20);
      ctx.fillStyle = '#d93b3b';
      ctx.fillRect(-3, -8, 6, 16);
      ctx.fillRect(-8, -3, 16, 6);
    } else if (pk.kind === 'cash') {
      ctx.fillStyle = '#2fae4e';
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$', 0, 4);
    }
    ctx.restore();
  }
}

function drawEffects(ctx, G) {
  for (const fx of G.effects) {
    if (fx.type === 'crash') {
      ctx.fillStyle = 'rgba(255, 180, 60, ' + (fx.t * 2) + ')';
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, 26 * (1 - fx.t) + 8, 0, Math.PI * 2);
      ctx.fill();
    } else if (fx.type === 'spark') {
      ctx.fillStyle = 'rgba(255, 230, 120, ' + (fx.t * 3) + ')';
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, 8, 0, Math.PI * 2);
      ctx.fill();
    } else if (fx.type === 'blood') {
      ctx.fillStyle = 'rgba(160, 20, 20, ' + (fx.t * 1.4) + ')';
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, 12, 0, Math.PI * 2);
      ctx.fill();
    } else if (fx.type === 'muzzle') {
      ctx.save();
      ctx.translate(fx.x, fx.y);
      ctx.rotate(fx.angle);
      ctx.fillStyle = 'rgba(255, 220, 100, 0.9)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(18, -4);
      ctx.lineTo(18, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (fx.type === 'step') {
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath();
      ctx.ellipse(fx.x, fx.y, 7, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// Warm late-afternoon light: a soft golden wash, brighter near the sun.
function drawSunlight(ctx, G) {
  const grad = ctx.createLinearGradient(0, 0, VIEW_W, VIEW_H);
  grad.addColorStop(0, 'rgba(255, 196, 110, 0.10)');
  grad.addColorStop(0.6, 'rgba(255, 196, 110, 0.04)');
  grad.addColorStop(1, 'rgba(40, 80, 160, 0.07)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Vignette to pull the eye to the middle of the screen.
  const vg = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.45, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.95);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function onScreen(G, x, y, w, h) {
  return x + w >= G.camera.x - 40 && x <= G.camera.x + VIEW_W + 40 &&
    y + h >= G.camera.y - 40 && y <= G.camera.y + VIEW_H + 40;
}

export { COLORS };
