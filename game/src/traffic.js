// Solmar City — the living city: traffic cars looping the road grid and
// pedestrians strolling the sidewalks, fleeing when shots ring out.

import { VERTICAL_ROADS, HORIZONTAL_ROADS } from './world.js';
import { ROAD_W } from './config.js';
import { createCar, driveCar } from './vehicles.js';
import { CAR_COLORS } from './vehicles.js';
import { mulberry32, pick, clamp, dist, angleTo, angleDiff } from './config.js';
import { resolveCircle } from './world.js';

const PED_COLORS = ['#e86a6a', '#6a9fe8', '#e8d06a', '#8fe86a', '#c96ae8', '#e8a06a', '#6adfd4'];

export function createPedestrian(x, y, rng) {
  return {
    x, y,
    angle: rng() * Math.PI * 2,
    speed: 34 + rng() * 30,
    color: pick(rng, PED_COLORS),
    state: 'walk', // walk | flee | down
    stateTimer: 0,
    targetX: x,
    targetY: y,
    walkTimer: 0,
  };
}

// Spawn traffic on the roads and pedestrians on the sidewalks near the
// player, so the streets always feel busy wherever the camera is.
export function populateStreets(G, rng) {
  G.cars = G.cars.filter((c) => c.driver === 'player' || c.kind === 'police');
  G.peds = [];
  // Parked cars along the roads.
  for (let i = 0; i < 14; i++) {
    const vertical = rng() < 0.5;
    const road = vertical
      ? pick(rng, VERTICAL_ROADS)
      : pick(rng, HORIZONTAL_ROADS);
    const along = 120 + rng() * 2000;
    const offset = (rng() < 0.5 ? -1 : 1) * (ROAD_W / 2 - 16);
    const x = vertical ? road + offset : along;
    const y = vertical ? along : road + offset;
    const angle = vertical ? (offset > 0 ? Math.PI / 2 : -Math.PI / 2) : (offset > 0 ? 0 : Math.PI);
    const car = createCar(x, y, angle, pick(rng, CAR_COLORS), { driver: 'parked' });
    G.cars.push(car);
  }
  // Moving traffic with a rectangular loop route around a few blocks.
  for (let i = 0; i < 10; i++) {
    const car = makeTrafficCar(G, rng);
    if (car) G.cars.push(car);
  }
  // Pedestrians near the player's start, spread over the sidewalks.
  for (let i = 0; i < 16; i++) {
    const px = clamp(G.player.x + (rng() - 0.5) * 1400, 80, 2700);
    const py = clamp(G.player.y + (rng() - 0.5) * 1200, 80, 2300);
    G.peds.push(createPedestrian(px, py, rng));
  }
}

export function makeTrafficCar(G, rng) {
  const vertical = rng() < 0.5;
  const roads = vertical ? VERTICAL_ROADS : HORIZONTAL_ROADS;
  const road = pick(rng, roads);
  const lane = (rng() < 0.5 ? -1 : 1) * 22;
  const along = 150 + rng() * 1900;
  const x = vertical ? road + lane : along;
  const y = vertical ? along : road + lane;
  const angle = vertical ? (lane > 0 ? Math.PI / 2 : -Math.PI / 2) : (lane > 0 ? 0 : Math.PI);
  // Loop: go down this road, turn at the next cross street, come back.
  const cross = pick(rng, vertical ? HORIZONTAL_ROADS : VERTICAL_ROADS);
  const route = vertical
    ? [{ x: road + lane, y: cross }, { x: road - lane, y: cross }, { x: road - lane, y: along }]
    : [{ x: cross, y: road + lane }, { x: cross, y: road - lane }, { x: along, y: road - lane }];
  return createCar(x, y, angle, pick(rng, CAR_COLORS), {
    driver: 'traffic',
    route,
    targetSpeed: 130 + rng() * 70,
  });
}

// Traffic cars steer toward their next waypoint and slow for corners.
export function updateTraffic(G, dt) {
  for (const car of G.cars) {
    if (car.driver !== 'traffic') continue;
    if (!car.route || car.route.length === 0) continue;
    const wp = car.route[car.routeIndex];
    const d = dist(car.x, car.y, wp.x, wp.y);
    if (d < 40) {
      car.routeIndex = (car.routeIndex + 1) % car.route.length;
      continue;
    }
    const want = angleTo(car.x, car.y, wp.x, wp.y);
    const diff = angleDiff(car.angle, want);
    const steer = clamp(diff * 1.6, -1, 1);
    const throttle = Math.abs(diff) > 1.2 ? 0.2 : 0.85;
    // Ease off when another car is right ahead.
    let blocked = false;
    for (const other of G.cars) {
      if (other === car) continue;
      const ahead = Math.cos(car.angle) * (other.x - car.x) + Math.sin(car.angle) * (other.y - car.y);
      const side = Math.abs(-Math.sin(car.angle) * (other.x - car.x) + Math.cos(car.angle) * (other.y - car.y));
      if (ahead > 0 && ahead < 90 && side < 30) { blocked = true; break; }
    }
    if (blocked) {
      car.speed = Math.max(0, car.speed - 300 * dt);
    } else {
      car.speed = Math.min(car.targetSpeed, car.speed + 200 * dt);
      car.angle += steer * 1.9 * dt;
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
    }
  }
}

// Pedestrians pick a nearby sidewalk point, walk to it, pick another.
// A gunshot or a car barrelling at them makes them run away.
export function updatePedestrians(G, dt) {
  const px = G.player.x;
  const py = G.player.y;
  const playerCar = G.player.car;
  for (const ped of G.peds) {
    if (ped.state === 'down') continue;
    if (ped.stateTimer > 0) ped.stateTimer -= dt;
    let fleeing = ped.state === 'flee';
    if (G.recentShotTimer > 0 && dist(ped.x, ped.y, G.recentShotX, G.recentShotY) < 320) {
      ped.state = 'flee';
      ped.stateTimer = 2.5;
      fleeing = true;
    }
    if (playerCar && dist(ped.x, ped.y, playerCar.x, playerCar.y) < 90 && Math.abs(playerCar.speed) > 150) {
      ped.state = 'flee';
      ped.stateTimer = 2;
      fleeing = true;
    }
    if (fleeing) {
      const away = angleTo(px, py, ped.x, ped.y);
      ped.angle = away;
      const sp = 190;
      ped.x += Math.cos(away) * sp * dt;
      ped.y += Math.sin(away) * sp * dt;
      resolveCircle(G.world, ped, 10);
      if (ped.stateTimer <= 0) ped.state = 'walk';
      continue;
    }
    ped.walkTimer -= dt;
    if (ped.walkTimer <= 0 || dist(ped.x, ped.y, ped.targetX, ped.targetY) < 12) {
      ped.targetX = clamp(ped.x + (Math.random() - 0.5) * 320, 60, 2760);
      ped.targetY = clamp(ped.y + (Math.random() - 0.5) * 320, 60, 2320);
      ped.walkTimer = 3 + Math.random() * 4;
    }
    const a = angleTo(ped.x, ped.y, ped.targetX, ped.targetY);
    ped.angle = a;
    ped.x += Math.cos(a) * ped.speed * dt;
    ped.y += Math.sin(a) * ped.speed * dt;
    resolveCircle(G.world, ped, 10);
  }
}

export function drawPedestrian(ctx, ped, time) {
  if (ped.state === 'down') {
    ctx.save();
    ctx.translate(ped.x, ped.y);
    ctx.rotate(ped.angle);
    ctx.fillStyle = ped.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 13, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.translate(ped.x, ped.y);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 4, 10, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(ped.angle);
  const swing = Math.sin(time * 10 + ped.x) * 4;
  ctx.fillStyle = '#222';
  ctx.fillRect(-5, -7 + swing * 0.3, 10, 5);
  ctx.fillRect(-5, 2 - swing * 0.3, 10, 5);
  ctx.fillStyle = ped.color;
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f0c8a0';
  ctx.beginPath();
  ctx.arc(3, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export { mulberry32, driveCar };
