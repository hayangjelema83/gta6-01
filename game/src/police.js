// Solmar City — the wanted system and the Solmar police. Crime raises
// stars, cruisers spawn and chase, and staying out of sight lets the heat
// die down. Getting caught on foot with high wanted means busted.

import { createCar } from './vehicles.js';
import { clamp, dist, angleTo, angleDiff, mulberry32 } from './config.js';
import { nearestRoadPoint } from './world.js';
import { setSiren } from './audio.js';

export function createWanted() {
  return {
    stars: 0,
    heat: 0, // 0..100, fills toward the next star as crimes happen
    decayTimer: 0,
    seenTimer: 0, // time since any cop last saw the player
    bustedTimer: 0,
  };
}

// A crime adds heat; every 25 heat is another star, up to 5.
export function addHeat(G, amount, reason) {
  const w = G.wanted;
  w.heat = clamp(w.heat + amount, 0, 125);
  const newStars = Math.min(5, Math.floor(w.heat / 25));
  if (newStars > w.stars) {
    w.stars = newStars;
    G.message = reason + ' — wanted level ' + w.stars + (w.stars > 1 ? ' stars' : ' star');
    G.messageTimer = 3;
  }
  w.decayTimer = 0;
  w.seenTimer = 0;
}

export function policeCount(G) {
  return G.cars.filter((c) => c.kind === 'police').length;
}

export function spawnPolice(G, count) {
  let spawned = 0;
  let tries = 0;
  while (spawned < count && tries < 40) {
    tries++;
    const angle = Math.random() * Math.PI * 2;
    const r = 420 + Math.random() * 260;
    let x = G.player.x + Math.cos(angle) * r;
    let y = G.player.y + Math.sin(angle) * r;
    const rp = nearestRoadPoint(x, y);
    if (!rp) continue;
    x = rp.x;
    y = rp.y;
    if (dist(x, y, G.player.x, G.player.y) < 300) continue;
    const car = createCar(x, y, angleTo(x, y, G.player.x, G.player.y), '#1d1d1d', {
      driver: 'police',
      kind: 'police',
      targetSpeed: 300,
    });
    G.cars.push(car);
    spawned++;
  }
  return spawned;
}

// Police AI: chase the player's position, ram when close, and give up the
// chase (despawn) once the wanted level has fully decayed.
export function updatePolice(G, dt) {
  const w = G.wanted;
  const wantCount = w.stars >= 4 ? 3 : w.stars >= 2 ? 2 : w.stars >= 1 ? 1 : 0;
  const have = policeCount(G);
  if (have < wantCount && w.stars > 0) {
    spawnPolice(G, wantCount - have);
  }
  let anySees = false;
  for (const car of G.cars) {
    if (car.kind !== 'police') continue;
    const d = dist(car.x, car.y, G.player.x, G.player.y);
    if (d < 700) anySees = true;
    const target = G.player.car || G.player;
    const want = angleTo(car.x, car.y, target.x, target.y);
    const diff = angleDiff(car.angle, want);
    const steer = clamp(diff * 2.2, -1, 1);
    // Cruisers are fast but a little clumsy in corners — a good driver
    // can out-turn them.
    const targetSpeed = d > 500 ? 480 : d > 140 ? 430 : 300;
    car.speed = Math.min(targetSpeed, car.speed + 320 * dt);
    car.angle += steer * 2.4 * dt * (car.speed > 0 ? 1 : -1);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    // Ramming: a hard hit shoves the player's car and hurts the player.
    if (d < 58) {
      const push = angleTo(car.x, car.y, target.x, target.y);
      if (G.player.car) {
        G.player.car.x += Math.cos(push) * 46 * dt * 10;
        G.player.car.y += Math.sin(push) * 46 * dt * 10;
        G.player.car.speed *= 0.94;
      } else {
        G.player.x += Math.cos(push) * 90 * dt;
        G.player.y += Math.sin(push) * 90 * dt;
      }
      if (car.speed > 200 && !car.ramCooldown) {
        car.ramCooldown = 1;
        if (G.player.car) {
          G.effects.push({ type: 'crash', x: car.x, y: car.y, t: 0.4 });
        } else {
          hurtPlayer(G, 12);
        }
      }
    }
    if (car.ramCooldown) car.ramCooldown -= dt;
  }
  // Decay: only while no cruiser can see the player.
  if (w.stars > 0) {
    if (anySees) {
      w.seenTimer = 0;
      w.decayTimer = 0;
    } else {
      w.seenTimer += dt;
      if (w.seenTimer > 4) {
        w.decayTimer += dt;
        if (w.decayTimer > 2.2) {
          w.decayTimer = 0;
          w.heat = Math.max(0, w.heat - 25);
          w.stars = Math.floor(w.heat / 25);
          if (w.stars === 0) {
            G.message = 'You lost them. The heat is off.';
            G.messageTimer = 3;
            // Cruisers give up and drive away.
            G.cars = G.cars.filter((c) => c.kind !== 'police');
          }
        }
      }
    }
  }
  // Busted: a cruiser sits on top of the player on foot at 3+ stars.
  if (w.stars >= 3 && !G.player.car) {
    for (const car of G.cars) {
      if (car.kind === 'police' && dist(car.x, car.y, G.player.x, G.player.y) < 46) {
        w.bustedTimer += dt;
        if (w.bustedTimer > 1.2) {
          G.state = 'gameover';
          G.gameoverReason = 'BUSTED by the Solmar police';
          G.message = '';
        }
        break;
      }
    }
  } else {
    w.bustedTimer = 0;
  }
  if (G.audio) setSiren(G.audio, policeCount(G) > 0);
}

export function hurtPlayer(G, amount) {
  G.player.health = Math.max(0, G.player.health - amount);
  G.player.hurtTimer = 0.5;
  if (G.player.health <= 0) {
    G.state = 'gameover';
    G.gameoverReason = 'You were taken down in Solmar City';
  }
}

export { mulberry32 };
