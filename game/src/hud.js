// Solmar City — the HUD and the menus: wanted stars, cash, health, speed,
// the minimap, the mission objective, and the title / pause / game-over
// screens. Everything the player needs to read at a glance.

import { VIEW_W, VIEW_H, WORLD_W, WORLD_H, COLORS } from './config.js';
import { missionMarker, objectiveText } from './missions.js';

const MINI_W = 220;
const MINI_H = 165;

export function drawHUD(G) {
  const ctx = G.ctx;
  drawTopLeft(ctx, G);
  drawMinimap(ctx, G);
  drawObjective(ctx, G);
  drawHelp(ctx, G);
  drawMessage(ctx, G);
  if (G.hint) drawHint(ctx, G);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = COLORS.hudBg;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawTopLeft(ctx, G) {
  const p = G.player;
  panel(ctx, 12, 12, 250, 108);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  // Wanted stars.
  ctx.font = 'bold 22px sans-serif';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < G.wanted.stars ? '#ffd23c' : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', 24 + i * 26, 40);
  }
  // Cash.
  ctx.fillStyle = '#7fe07f';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('$' + p.cash, 24, 68);
  // Ammo.
  ctx.fillStyle = COLORS.hudText;
  ctx.font = '15px sans-serif';
  ctx.fillText('Ammo ' + p.ammo + (p.car ? '' : '  •  Pistol ready'), 100, 68);
  // Health bar.
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(24, 80, 200, 12);
  ctx.fillStyle = p.health > 50 ? '#5ec95e' : p.health > 25 ? '#e8b93c' : '#e84f3d';
  ctx.fillRect(24, 80, 200 * (p.health / 100), 12);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = '12px sans-serif';
  ctx.fillText('HEALTH ' + Math.round(p.health), 24, 108);
  // Speed, only when driving.
  if (p.car) {
    ctx.fillStyle = COLORS.accent;
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(Math.round(Math.abs(p.car.speed) * 0.18) + ' mph', 150, 108);
  }
}

function drawMinimap(ctx, G) {
  const x0 = VIEW_W - MINI_W - 12;
  const y0 = 12;
  panel(ctx, x0, y0, MINI_W, MINI_H);
  const sx = MINI_W / WORLD_W;
  const sy = MINI_H / WORLD_H;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0 + 4, y0 + 4, MINI_W - 8, MINI_H - 8);
  ctx.clip();
  // Water and sand on the east edge.
  ctx.fillStyle = '#2f7fb8';
  ctx.fillRect(x0 + 4 + 2960 * sx, y0 + 4, MINI_W, MINI_H);
  ctx.fillStyle = '#e8d39a';
  ctx.fillRect(x0 + 4 + 2820 * sx, y0 + 4, (2960 - 2820) * sx, MINI_H);
  // Roads.
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (const rx of G.worldRoadsV) ctx.fillRect(x0 + 4 + (rx - 4) * sx, y0 + 4, 8 * sx, MINI_H - 8);
  for (const ry of G.worldRoadsH) ctx.fillRect(x0 + 4, y0 + 4 + (ry - 4) * sy, MINI_W - 8, 8 * sy);
  // Mission marker, pulsing.
  const m = missionMarker(G);
  if (m) {
    const pulse = 4 + Math.sin(G.time * 5) * 1.5;
    ctx.fillStyle = COLORS.marker;
    ctx.beginPath();
    ctx.arc(x0 + 4 + m.x * sx, y0 + 4 + m.y * sy, pulse + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', x0 + 4 + m.x * sx, y0 + 4 + m.y * sy + 3);
  }
  // Cars as small dots, police in blue.
  for (const car of G.cars) {
    ctx.fillStyle = car.kind === 'police' ? '#4d8dff' : '#ffffff';
    ctx.beginPath();
    ctx.arc(x0 + 4 + car.x * sx, y0 + 4 + car.y * sy, car.kind === 'police' ? 3.5 : 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Player arrow.
  const px = x0 + 4 + G.player.x * sx;
  const py = y0 + 4 + G.player.y * sy;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(G.player.car ? G.player.car.angle : G.player.angle);
  ctx.fillStyle = '#ffd23c';
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-6, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Viewport rectangle.
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x0 + 4 + G.camera.x * sx, y0 + 4 + G.camera.y * sy, VIEW_W * sx, VIEW_H * sy);
  ctx.restore();
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('SOLMAR CITY', x0 + 8, y0 + MINI_H - 8);
}

function drawObjective(ctx, G) {
  const text = objectiveText(G);
  if (!text) return;
  ctx.font = 'bold 15px sans-serif';
  const w = Math.min(560, ctx.measureText(text).width + 28);
  panel(ctx, 12, VIEW_H - 86, w, 34);
  ctx.fillStyle = COLORS.accent;
  ctx.textAlign = 'left';
  ctx.fillText('◆ ' + text, 24, VIEW_H - 63);
}

function drawHelp(ctx, G) {
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  const line = G.player.car
    ? 'WASD drive  •  Space brake  •  E exit car  •  P pause'
    : 'WASD move  •  Shift run  •  Mouse aim  •  Click shoot  •  E enter car  •  P pause';
  ctx.fillText(line, 14, VIEW_H - 14);
}

function drawMessage(ctx, G) {
  if (!G.message || G.messageTimer <= 0) return;
  ctx.font = 'bold 18px sans-serif';
  const w = Math.min(760, ctx.measureText(G.message).width + 36);
  panel(ctx, (VIEW_W - w) / 2, 190, w, 40);
  ctx.fillStyle = COLORS.hudText;
  ctx.textAlign = 'center';
  ctx.fillText(G.message, VIEW_W / 2, 217);
}

function drawHint(ctx, G) {
  ctx.font = 'bold 16px sans-serif';
  const w = ctx.measureText(G.hint).width + 30;
  panel(ctx, (VIEW_W - w) / 2, VIEW_H - 140, w, 34);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(G.hint, VIEW_W / 2, VIEW_H - 117);
}

export function drawTitle(ctx, G) {
  // The city itself as a backdrop, dimmed, with the title on top.
  ctx.fillStyle = 'rgba(10, 14, 26, 0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23c';
  ctx.font = 'bold 84px Georgia, serif';
  ctx.fillText('SOLMAR CITY', VIEW_W / 2, 190);
  ctx.fillStyle = '#f5f1e6';
  ctx.font = 'italic 24px Georgia, serif';
  ctx.fillText('An open-world crime story on the Solmar coast', VIEW_W / 2, 232);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = 'rgba(245,241,230,0.9)';
  const story = [
    'You are Nico Reyes, a wheelman new to Solmar City.',
    'Mara Voss, a fixer at La Brisa diner, has four jobs for you —',
    'deliveries, a getaway, a tail to lose, and one big pickup.',
    'Steal cars, dodge the Solmar police, and earn your place in the city.',
  ];
  story.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, 300 + i * 26));
  panel(ctx, VIEW_W / 2 - 320, 430, 640, 150);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('HOW TO PLAY', VIEW_W / 2, 456);
  ctx.font = '14px sans-serif';
  const controls = [
    'WASD / Arrows — walk or drive     •     Shift — run',
    'Mouse — aim     •     Click — shoot     •     E — enter / exit a car',
    'Space — brake     •     P — pause     •     Progress saves automatically',
  ];
  controls.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, 486 + i * 24));
  if (G.save) {
    ctx.fillStyle = '#7fe07f';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('Saved game found: $' + G.save.cash + ' — press Enter to continue your story', VIEW_W / 2, 606);
  }
  ctx.fillStyle = '#ffd23c';
  ctx.font = 'bold 22px sans-serif';
  const blink = Math.floor(G.time * 2) % 2 === 0;
  if (blink) ctx.fillText('PRESS ENTER TO START', VIEW_W / 2, 650);
}

export function drawPause(ctx, G) {
  ctx.fillStyle = 'rgba(10, 14, 26, 0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5f1e6';
  ctx.font = 'bold 48px Georgia, serif';
  ctx.fillText('PAUSED', VIEW_W / 2, 300);
  ctx.font = '16px sans-serif';
  ctx.fillText('P — resume     •     R — restart from the beginning', VIEW_W / 2, 350);
  ctx.fillText('Cash $' + G.player.cash + '   •   Mission ' + (G.missions.done ? 'complete' : (G.missions.index + 1) + ' of 4'), VIEW_W / 2, 384);
}

export function drawGameOver(ctx, G) {
  ctx.fillStyle = 'rgba(20, 4, 4, 0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff6b5e';
  ctx.font = 'bold 56px Georgia, serif';
  ctx.fillText(G.gameoverReason || 'WASTED', VIEW_W / 2, 300);
  ctx.fillStyle = '#f5f1e6';
  ctx.font = '18px sans-serif';
  ctx.fillText('Cash earned: $' + G.player.cash + '   •   Missions finished: ' + G.missions.index + ' of 4', VIEW_W / 2, 350);
  ctx.fillStyle = '#ffd23c';
  ctx.font = 'bold 22px sans-serif';
  if (Math.floor(G.time * 2) % 2 === 0) ctx.fillText('PRESS ENTER TO TRY AGAIN', VIEW_W / 2, 420);
}
