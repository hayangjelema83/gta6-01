// Solmar City — deterministic screenshot scenes for ?shot=<name>&seed=<n>.
// Each scene sets the world, the player and the wanted level to fixed
// values so a screenshot is the same every time it is taken.

import { createCar } from './vehicles.js';
import { spawnPolice } from './police.js';
import { startMission } from './missions.js';

export const SHOT_NAMES = ['start', 'drive', 'chase', 'mission'];

// Put the player in a car on a main road with traffic around them.
function setupDrive(G) {
  G.state = 'playing';
  const car = createCar(980, 920, 0, '#d94f3d', { driver: 'player', kind: 'player' });
  car.speed = 300; // already rolling down the avenue when photographed
  G.cars.push(car);
  G.player.car = car;
  G.player.x = car.x;
  G.player.y = car.y;
  G.player.cash = 450;
  G.missions.index = 0;
  G.missions.step = 1;
  G.missions.started = true;
  G.message = '';
  G.messageTimer = 0;
  centerCamera(G);
}

// A police chase: 4 stars, three cruisers closing in, the player speeding
// down the coast road with the mission objective on the HUD.
function setupChase(G) {
  G.state = 'playing';
  const car = createCar(1340, 1260, Math.PI / 2, '#3d7bd9', { driver: 'player', kind: 'player' });
  car.speed = 430;
  G.cars.push(car);
  G.player.car = car;
  G.player.x = car.x;
  G.player.y = car.y;
  G.player.cash = 850;
  G.player.health = 82;
  G.wanted.stars = 4;
  G.wanted.heat = 100;
  G.missions.index = 1;
  G.missions.step = 0;
  G.missions.started = true;
  G.message = 'The police are onto you — lose them!';
  G.messageTimer = 30;
  // Three cruisers right behind and beside the player.
  const spots = [
    { x: 1340, y: 1020, a: Math.PI / 2 },
    { x: 1290, y: 1180, a: Math.PI / 2 },
    { x: 1430, y: 1100, a: Math.PI / 2 },
  ];
  for (const s of spots) {
    const cop = createCar(s.x, s.y, s.a, '#1d1d1d', { driver: 'police', kind: 'police', targetSpeed: 420 });
    cop.speed = 380;
    G.cars.push(cop);
  }
  void spawnPolice;
  centerCamera(G);
}

// On foot at Warehouse 9, the final mission's pickup point, with the
// objective marker glowing and pedestrians nearby.
function setupMission(G) {
  G.state = 'playing';
  G.player.car = null;
  G.player.x = 2340;
  G.player.y = 1520;
  G.player.angle = 0;
  G.player.aimAngle = 0;
  G.player.cash = 1250;
  G.player.ammo = 36;
  G.missions.index = 3;
  G.missions.step = 0;
  G.missions.started = true;
  G.message = '';
  G.messageTimer = 0;
  centerCamera(G);
}

function centerCamera(G) {
  G.camera.x = Math.max(0, Math.min(3200 - 1280, G.player.x - 640));
  G.camera.y = Math.max(0, Math.min(2400 - 720, G.player.y - 360));
}

export function applyShot(G, name) {
  if (name === 'start') {
    G.state = 'title';
    return true;
  }
  if (name === 'drive') { setupDrive(G); return true; }
  if (name === 'chase') { setupChase(G); return true; }
  if (name === 'mission') { setupMission(G); return true; }
  return false;
}

export { startMission };
