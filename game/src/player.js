// Solmar City — the player on foot: walking, running, aiming, health and
// the cash they carry. Driving lives in vehicles.js; this file is the
// person, not the car.

import { PLAYER, clamp, angleTo } from './config.js';
import { resolveCircle, isWater } from './world.js';
import { nearestStealableCar, enterCar, exitCar } from './vehicles.js';

export function createPlayer(x, y) {
  return {
    x, y,
    angle: -Math.PI / 2,
    aimAngle: -Math.PI / 2,
    health: PLAYER.maxHealth,
    cash: PLAYER.startCash,
    ammo: PLAYER.startAmmo,
    car: null,
    moving: false,
    stepTimer: 0,
    hurtTimer: 0,
  };
}

// On-foot update: WASD/arrows move, Shift runs, mouse aims, E steals or
// exits a car. Returns a short hint string for the HUD when an action is
// available, or null.
export function updatePlayer(G, input, dt) {
  const p = G.player;
  if (p.car) return null; // driving is handled by vehicles.js

  let mx = 0;
  let my = 0;
  if (input.keys['w'] || input.keys['arrowup']) my -= 1;
  if (input.keys['s'] || input.keys['arrowdown']) my += 1;
  if (input.keys['a'] || input.keys['arrowleft']) mx -= 1;
  if (input.keys['d'] || input.keys['arrowright']) mx += 1;
  const len = Math.hypot(mx, my);
  p.moving = len > 0;
  const running = input.keys['shift'];
  const speed = running ? PLAYER.runSpeed : PLAYER.walkSpeed;
  if (len > 0) {
    mx /= len;
    my /= len;
    const nx = p.x + mx * speed * dt;
    const ny = p.y + my * speed * dt;
    p.x = nx;
    p.y = ny;
    p.angle = Math.atan2(my, mx);
    p.stepTimer -= dt;
    if (p.stepTimer <= 0) {
      p.stepTimer = running ? 0.22 : 0.32;
      G.effects.push({ type: 'step', x: p.x, y: p.y, t: 0.3 });
    }
    resolveCircle(G.world, p, PLAYER.radius);
    if (isWater(p.x, p.y)) {
      // The sea pushes the player back onto the sand.
      p.x = Math.min(p.x, 2946);
    }
  }

  // Aim at the mouse (screen -> world via the camera).
  const wx = G.camera.x + input.mouseX;
  const wy = G.camera.y + input.mouseY;
  p.aimAngle = angleTo(p.x, p.y, wx, wy);

  if (p.hurtTimer > 0) p.hurtTimer -= dt;

  const nearCar = nearestStealableCar(G, 70);
  if (input.pressed && input.pressed['e'] && nearCar) {
    enterCar(G, nearCar);
    return null;
  }
  return nearCar ? 'Press E to get in the car' : null;
}

export function drawPlayer(ctx, p, time) {
  if (p.car) return;
  ctx.save();
  ctx.translate(p.x, p.y);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 5, 13, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(p.angle);
  // Legs animate while walking.
  const swing = p.moving ? Math.sin(time * 14) * 5 : 0;
  ctx.fillStyle = '#2b3a55';
  ctx.fillRect(-6, -8 + swing * 0.4, 12, 6);
  ctx.fillRect(-6, 2 - swing * 0.4, 12, 6);
  // Jacket.
  ctx.fillStyle = p.hurtTimer > 0 && Math.floor(time * 12) % 2 === 0 ? '#ff6b5e' : '#e8a13c';
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  // Head and cap.
  ctx.fillStyle = '#f0c8a0';
  ctx.beginPath();
  ctx.arc(4, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#274b73';
  ctx.fillRect(2, -7, 8, 14);
  // Pistol in the aiming hand.
  ctx.save();
  ctx.rotate(0);
  ctx.fillStyle = '#222';
  ctx.fillRect(8, -2, 12, 4);
  ctx.restore();
  ctx.restore();
}

export function healPlayer(G, amount) {
  G.player.health = clamp(G.player.health + amount, 0, PLAYER.maxHealth);
}

export { PLAYER };
