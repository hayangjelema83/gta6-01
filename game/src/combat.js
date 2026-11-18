// Solmar City — combat on foot: the pistol, bullets, and what they hit.
// Shooting a pedestrian is a crime the police notice; shooting a cruiser
// slows it down but never pays.

import { dist } from './config.js';
import { addHeat } from './police.js';
import { playShot } from './audio.js';

export function createBullet(x, y, angle, speed) {
  return { x, y, angle, speed: speed || 900, life: 0.9, dead: false };
}

export function tryShoot(G, input) {
  const p = G.player;
  if (p.car) return; // no drive-by shooting — keep it fair
  if (p.ammo <= 0) {
    G.hint = 'Out of ammo — find the green ammo crates around the city';
    return;
  }
  if (G.shootCooldown > 0) return;
  G.shootCooldown = 0.22;
  p.ammo--;
  const a = p.aimAngle;
  const bx = p.x + Math.cos(a) * 22;
  const by = p.y + Math.sin(a) * 22;
  G.bullets.push(createBullet(bx, by, a));
  G.recentShotX = bx;
  G.recentShotY = by;
  G.recentShotTimer = 1.5;
  G.audio && playShot(G.audio);
  G.effects.push({ type: 'muzzle', x: bx, y: by, t: 0.08, angle: a });
  // Firing in the open is a crime if anyone is watching.
  addHeat(G, 8, 'Shots fired');
}

export function updateBullets(G, dt) {
  if (G.shootCooldown > 0) G.shootCooldown -= dt;
  if (G.recentShotTimer > 0) G.recentShotTimer -= dt;
  for (const b of G.bullets) {
    if (b.dead) continue;
    b.x += Math.cos(b.angle) * b.speed * dt;
    b.y += Math.sin(b.angle) * b.speed * dt;
    b.life -= dt;
    if (b.life <= 0) { b.dead = true; continue; }
    // Buildings stop bullets.
    if (G.world.buildings.some((bd) => b.x > bd.x && b.x < bd.x + bd.w && b.y > bd.y && b.y < bd.y + bd.h)) {
      G.effects.push({ type: 'spark', x: b.x, y: b.y, t: 0.2 });
      b.dead = true;
      continue;
    }
    // Pedestrians.
    for (const ped of G.peds) {
      if (ped.state === 'down') continue;
      if (dist(b.x, b.y, ped.x, ped.y) < 14) {
        ped.state = 'down';
        b.dead = true;
        G.effects.push({ type: 'blood', x: ped.x, y: ped.y, t: 0.5 });
        addHeat(G, 25, 'Pedestrian down');
        break;
      }
    }
    if (b.dead) continue;
    // Police cars: a hit slows the cruiser and enrages the force.
    for (const car of G.cars) {
      if (car.kind !== 'police') continue;
      if (dist(b.x, b.y, car.x, car.y) < 30) {
        car.speed *= 0.4;
        car.smoke = 1.2;
        b.dead = true;
        G.effects.push({ type: 'spark', x: b.x, y: b.y, t: 0.25 });
        addHeat(G, 12, 'You shot at the police');
        break;
      }
    }
    if (b.dead) continue;
    // Civilian cars: a hit makes the driver panic and flee on foot.
    for (const car of G.cars) {
      if (car.driver !== 'traffic' && car.driver !== 'parked') continue;
      if (dist(b.x, b.y, car.x, car.y) < 30) {
        b.dead = true;
        G.effects.push({ type: 'spark', x: b.x, y: b.y, t: 0.25 });
        if (car.driver === 'traffic') {
          car.driver = 'parked';
          car.speed = 0;
        }
        addHeat(G, 10, 'You shot a car');
        break;
      }
    }
  }
  G.bullets = G.bullets.filter((b) => !b.dead);
}

// Running a pedestrian over in a car is a crime, and it hurts.
export function checkRunOvers(G) {
  const car = G.player.car;
  if (!car || Math.abs(car.speed) < 60) return;
  for (const ped of G.peds) {
    if (ped.state === 'down') continue;
    if (dist(car.x, car.y, ped.x, ped.y) < 30) {
      ped.state = 'down';
      G.effects.push({ type: 'blood', x: ped.x, y: ped.y, t: 0.5 });
      addHeat(G, 25, 'Pedestrian hit by your car');
      car.speed *= 0.85;
    }
  }
}

export function drawBullets(ctx, G) {
  ctx.save();
  ctx.strokeStyle = '#ffe9a8';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (const b of G.bullets) {
    ctx.beginPath();
    ctx.moveTo(b.x - Math.cos(b.angle) * 12, b.y - Math.sin(b.angle) * 12);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
}
