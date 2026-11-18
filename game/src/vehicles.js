// Solmar City — cars: creation, driving physics, collisions and drawing.
// A car is a plain object; the player, traffic and police all drive the
// same kind of car, which keeps the chase fair.

import { CAR, COLORS, clamp, angleDiff, dist } from './config.js';
import { hitsSolid, resolveCircle } from './world.js';
import { playCrash, playHorn, playBusted } from './audio.js';

export const CAR_COLORS = ['#d94f3d', '#3d7bd9', '#e8b93c', '#7fc24f', '#c9c9c9', '#8a5fd9', '#e87fb0', '#3db8a6'];

let nextCarId = 1;

export function createCar(x, y, angle, color, opts) {
  const o = opts || {};
  return {
    id: nextCarId++,
    x, y, angle,
    speed: 0,
    color: color || CAR_COLORS[0],
    kind: o.kind || 'civilian', // civilian | police | player
    driver: o.driver || 'parked', // parked | player | traffic | police
    route: o.route || null, // traffic route: array of waypoints
    routeIndex: 0,
    targetSpeed: o.targetSpeed || 0,
    honkTimer: 0,
    crashed: 0,
    smoke: 0,
  };
}

export function resetCarIds() {
  nextCarId = 1;
}

// Arcade driving: accelerate, brake/reverse, steer harder at low speed,
// drag, and a hard stop (with a scrape) against buildings.
export function driveCar(G, car, throttle, steer, dt) {
  const wasSpeed = car.speed;
  if (throttle > 0) car.speed += CAR.accel * throttle * dt;
  else if (throttle < 0) {
    if (car.speed > 5) car.speed -= CAR.brake * dt;
    else car.speed += CAR.accel * 0.45 * throttle * dt; // reverse
  }
  car.speed -= car.speed * 0.55 * dt; // rolling drag
  car.speed = clamp(car.speed, -CAR.maxReverse, CAR.maxSpeed);
  const steerPower = clamp(Math.abs(car.speed) / 120, 0.25, 1);
  car.angle += steer * CAR.turnRate * steerPower * dt * (car.speed >= 0 ? 1 : -1);

  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  if (!hitsSolid(G.world, nx, ny, CAR.width * 0.62)) {
    car.x = nx;
    car.y = ny;
  } else {
    // Try sliding along one axis so corners do not glue the car in place.
    if (!hitsSolid(G.world, nx, car.y, CAR.width * 0.62)) car.x = nx;
    else if (!hitsSolid(G.world, car.x, ny, CAR.width * 0.62)) car.y = ny;
    else if (Math.abs(car.speed) > 120) {
      car.speed *= -0.25;
      car.crashed = 0.4;
      if (car.driver === 'player') {
        G.effects.push({ type: 'crash', x: car.x, y: car.y, t: 0.4 });
        if (G.audio) playCrash(G.audio);
        damagePlayer(G, 3);
      }
    } else {
      car.speed *= 0.4;
    }
  }
  if (car.crashed > 0) car.crashed -= dt;
  // Bump into other cars: soft push-apart so traffic does not overlap.
  for (const other of G.cars) {
    if (other === car) continue;
    const d = dist(car.x, car.y, other.x, other.y);
    if (d < CAR.length * 0.8 && d > 0.01) {
      const push = (CAR.length * 0.8 - d) / 2;
      const ux = (car.x - other.x) / d;
      const uy = (car.y - other.y) / d;
      car.x += ux * push;
      car.y += uy * push;
      if (Math.abs(car.speed) > 200 && car.driver === 'player' && other.driver !== 'player') {
        if (G.audio) playCrash(G.audio);
      }
      car.speed *= 0.995;
    }
  }
  resolveCircle(G.world, car, CAR.width * 0.6);
  return wasSpeed;
}

export function damagePlayer(G, amount) {
  if (G.state !== 'playing') return;
  G.player.health = Math.max(0, G.player.health - amount);
  if (G.player.health <= 0) {
    G.state = 'gameover';
    if (G.audio) playBusted(G.audio);
  }
}

// Nearest car the player could steal, within reach on foot.
export function nearestStealableCar(G, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of G.cars) {
    if (car.driver === 'player') continue;
    const d = dist(G.player.x, G.player.y, car.x, car.y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

export function enterCar(G, car) {
  G.player.car = car;
  car.driver = 'player';
  car.kind = car.kind === 'police' ? 'police' : 'player';
  G.player.x = car.x;
  G.player.y = car.y;
  if (G.audio) playHorn(G.audio);
}

export function exitCar(G) {
  const car = G.player.car;
  if (!car) return;
  car.driver = 'parked';
  car.speed = 0;
  // Step out to the driver's side, clear of the car.
  const side = car.angle + Math.PI / 2;
  G.player.x = car.x + Math.cos(side) * 34;
  G.player.y = car.y + Math.sin(side) * 34;
  resolveCircle(G.world, G.player, 14);
  G.player.car = null;
  G.player.angle = car.angle;
}

export function drawCar(ctx, car, time) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  // Soft shadow under the car.
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(2, 4, CAR.length / 2 + 2, CAR.width / 2 + 3, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body.
  ctx.fillStyle = car.color;
  roundRect(ctx, -CAR.length / 2, -CAR.width / 2, CAR.length, CAR.width, 8);
  ctx.fill();
  // Cabin and windows.
  ctx.fillStyle = 'rgba(20, 28, 38, 0.85)';
  roundRect(ctx, -CAR.length / 2 + 12, -CAR.width / 2 + 5, CAR.length - 26, CAR.width - 10, 5);
  ctx.fill();
  ctx.fillStyle = 'rgba(160, 210, 235, 0.55)';
  roundRect(ctx, -CAR.length / 2 + 16, -CAR.width / 2 + 7, 10, CAR.width - 14, 3);
  ctx.fill();
  // Headlights and tail lights.
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(CAR.length / 2 - 3, -CAR.width / 2 + 3, 3, 5);
  ctx.fillRect(CAR.length / 2 - 3, CAR.width / 2 - 8, 3, 5);
  ctx.fillStyle = '#ff4d4d';
  ctx.fillRect(-CAR.length / 2, -CAR.width / 2 + 3, 3, 5);
  ctx.fillRect(-CAR.length / 2, CAR.width / 2 - 8, 3, 5);
  if (car.kind === 'police') {
    // Black-and-white cruiser with a flashing light bar.
    ctx.fillStyle = '#f2f2f2';
    roundRect(ctx, -CAR.length / 2 + 4, -CAR.width / 2 + 2, CAR.length - 8, CAR.width - 4, 7);
    ctx.fill();
    ctx.fillStyle = '#1d1d1d';
    roundRect(ctx, -CAR.length / 2 + 4, -CAR.width / 2 + 2, 16, CAR.width - 4, 7);
    ctx.fill();
    const flash = Math.floor(time * 6) % 2 === 0;
    ctx.fillStyle = flash ? '#ff3b30' : '#2b5fd9';
    ctx.fillRect(-4, -CAR.width / 2 - 1, 8, 5);
    ctx.fillStyle = flash ? '#2b5fd9' : '#ff3b30';
    ctx.fillRect(-4, CAR.width / 2 - 4, 8, 5);
    ctx.fillStyle = '#111';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('POLICE', 8, 3);
  }
  ctx.restore();
  if (car.smoke > 0) {
    ctx.fillStyle = 'rgba(120,120,120,0.5)';
    ctx.beginPath();
    ctx.arc(car.x - Math.cos(car.angle) * 20, car.y - Math.sin(car.angle) * 20, 6 + Math.random() * 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export { COLORS, angleDiff };
