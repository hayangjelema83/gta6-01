// Solmar City — the entry point and game loop. Builds the world, owns the
// shared game state, steps every system once per frame and draws the
// result. Nothing here is a system of its own; each system lives in its
// own file and main.js just conducts them.

import { VIEW_W, VIEW_H, WORLD_W, WORLD_H, mulberry32 } from './config.js';
import { buildWorld, VERTICAL_ROADS, HORIZONTAL_ROADS } from './world.js';
import { createInput, wasPressed, endFrame } from './input.js';
import { createAudio, ensureAudio, setEngine, updateMusic, setMuted, isMuted } from './audio.js';
import { createPlayer, updatePlayer } from './player.js';
import { driveCar, exitCar } from './vehicles.js';
import { populateStreets, updateTraffic, updatePedestrians, makeTrafficCar } from './traffic.js';
import { createWanted, updatePolice, addHeat } from './police.js';
import { createMissionState, updateMissions, objectiveText, loadProgress, saveProgress } from './missions.js';
import { tryShoot, updateBullets, checkRunOvers } from './combat.js';
import { createCamera, updateCamera, render } from './render.js';
import { drawHUD, drawTitle, drawPause, drawGameOver } from './hud.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || '7') || 7;
const shotName = params.get('shot') || '';

const G = {
  ctx,
  canvas,
  seed,
  rng: mulberry32(seed),
  world: buildWorld(seed),
  worldRoadsV: VERTICAL_ROADS,
  worldRoadsH: HORIZONTAL_ROADS,
  player: createPlayer(620, 700),
  cars: [],
  peds: [],
  bullets: [],
  effects: [],
  pickups: [],
  wanted: createWanted(),
  missions: createMissionState(),
  camera: createCamera(),
  audio: createAudio(),
  input: createInput(canvas),
  state: 'title', // title | playing | paused | gameover
  time: 0,
  shootCooldown: 0,
  recentShotTimer: 0,
  recentShotX: 0,
  recentShotY: 0,
  message: '',
  messageTimer: 0,
  hint: null,
  gameoverReason: '',
  save: loadProgress(),
  trafficTimer: 0,
};

// Restore a saved game, if one exists.
if (G.save) {
  G.player.cash = G.save.cash;
  if (G.save.done) {
    G.missions.done = true;
    G.missions.index = 4;
  } else {
    G.missions.index = G.save.missionIndex || 0;
  }
}

populateStreets(G, G.rng);
placePickups(G);

function placePickups(G) {
  const spots = [
    { x: 700, y: 700, kind: 'ammo' },
    { x: 1500, y: 1400, kind: 'ammo' },
    { x: 2300, y: 600, kind: 'ammo' },
    { x: 1000, y: 1800, kind: 'health' },
    { x: 2000, y: 1000, kind: 'health' },
    { x: 1700, y: 2000, kind: 'cash' },
  ];
  G.pickups = spots.map((s) => ({ ...s, taken: false, respawn: 0 }));
}

// A fixed scene for screenshots, or the normal title screen.
if (shotName) {
  applyShot(G, shotName);
  G.state = G.state === 'title' ? 'title' : 'playing';
  // Let the scene settle for a few frames before it is photographed.
  for (let i = 0; i < 12; i++) stepWorld(1 / 60);
}

function stepWorld(dt) {
  G.time += dt;
  const input = G.input;
  const p = G.player;

  if (G.state === 'title') {
    updateCamera(G, dt);
    return;
  }
  if (G.state === 'paused' || G.state === 'gameover') return;

  const wasInCar = !!p.car;

  // On foot: walk, aim, enter a car. Driving: throttle and steering.
  if (p.car) {
    const car = p.car;
    const throttle = (input.keys['w'] || input.keys['arrowup'] ? 1 : 0) +
      (input.keys['s'] || input.keys['arrowdown'] ? -1 : 0);
    const steer = (input.keys['a'] || input.keys['arrowleft'] ? -1 : 0) +
      (input.keys['d'] || input.keys['arrowright'] ? 1 : 0);
    const braking = input.keys[' '];
    driveCar(G, car, braking ? (car.speed > 0 ? -1 : throttle) : throttle, steer, dt);
    if (wasPressed(input, 'e')) exitCar(G);
    if (p.car) {
      p.x = p.car.x;
      p.y = p.car.y;
      p.angle = p.car.angle;
      p.aimAngle = p.car.angle;
    }
  } else {
    const hint = updatePlayer(G, input, dt);
    if (hint) G.hint = hint;
    // Stealing a parked or traffic car is a crime.
    if (p.car && !wasInCar && p.car.kind !== 'police') {
      addHeat(G, 25, 'You stole a car');
      G.camera.shake = 0.3;
    }
  }

  if (input.mouseClicked && !p.car) tryShoot(G, input);

  updateTraffic(G, dt);
  updatePedestrians(G, dt);
  updatePolice(G, dt);
  updateMissions(G, input, dt);
  updateBullets(G, dt);
  checkRunOvers(G);
  updatePickups(G, dt);
  updateCamera(G, dt);

  // Keep the streets busy: replace traffic that wandered far away.
  G.trafficTimer -= dt;
  if (G.trafficTimer <= 0) {
    G.trafficTimer = 5;
    const traffic = G.cars.filter((c) => c.driver === 'traffic');
    if (traffic.length < 8) {
      const car = makeTrafficCar(G, Math.random);
      if (car) G.cars.push(car);
    }
  }

  // Effects fade out.
  for (const fx of G.effects) fx.t -= dt;
  G.effects = G.effects.filter((fx) => fx.t > 0);

  if (G.messageTimer > 0) G.messageTimer -= dt;
  if (G.messageTimer <= 0) G.message = '';

  // Health slowly recovers when the player is safe and unwatched.
  if (G.wanted.stars === 0 && p.health > 0 && p.health < 100) {
    p.health = Math.min(100, p.health + 1.5 * dt);
  }

  const driving = !!p.car;
  const speed01 = driving ? Math.abs(p.car.speed) / 520 : 0;
  setEngine(G.audio, speed01, driving);
  updateMusic(G.audio, dt, driving);
}

function updatePickups(G, dt) {
  const p = G.player;
  for (const pk of G.pickups) {
    if (pk.taken) {
      pk.respawn -= dt;
      if (pk.respawn <= 0) pk.taken = false;
      continue;
    }
    const px = p.car ? p.car.x : p.x;
    const py = p.car ? p.car.y : p.y;
    const d = Math.hypot(px - pk.x, py - pk.y);
    if (d < 40) {
      pk.taken = true;
      pk.respawn = 30;
      if (pk.kind === 'ammo') {
        p.ammo += 24;
        G.message = 'Picked up ammo (+24)';
      } else if (pk.kind === 'health') {
        p.health = Math.min(100, p.health + 40);
        G.message = 'First aid kit (+40 health)';
      } else {
        p.cash += 50;
        G.message = 'Found $50 on the street';
      }
      G.messageTimer = 2.5;
      saveProgress(G);
    }
  }
}

function handleMenus(input) {
  if (G.state === 'title') {
    if (wasPressed(input, 'enter')) {
      ensureAudio(G.audio);
      G.state = 'playing';
      G.message = 'Welcome to Solmar City, Nico.';
      G.messageTimer = 3;
    }
    return;
  }
  if (G.state === 'playing') {
    if (wasPressed(input, 'p') || wasPressed(input, 'escape')) {
      G.state = 'paused';
      saveProgress(G);
    }
    if (wasPressed(input, 'm')) {
      ensureAudio(G.audio);
      setMuted(G.audio, !isMuted(G.audio));
      G.message = isMuted(G.audio) ? 'Sound off' : 'Sound on';
      G.messageTimer = 1.5;
    }
    return;
  }
  if (G.state === 'paused') {
    if (wasPressed(input, 'p') || wasPressed(input, 'escape') || wasPressed(input, 'enter')) {
      ensureAudio(G.audio);
      G.state = 'playing';
    } else if (wasPressed(input, 'r')) {
      restartGame();
    }
    return;
  }
  if (G.state === 'gameover') {
    if (wasPressed(input, 'enter')) restartGame();
  }
}

function restartGame() {
  const cash = G.player.cash;
  G.player = createPlayer(620, 700);
  G.player.cash = Math.max(120, Math.floor(cash / 2)); // keep half your cash
  G.cars = [];
  G.bullets = [];
  G.effects = [];
  G.wanted = createWanted();
  G.missions = createMissionState();
  G.camera = createCamera();
  populateStreets(G, G.rng);
  placePickups(G);
  G.state = 'playing';
  G.message = 'Back on the streets. Mara is waiting.';
  G.messageTimer = 3;
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  G.hint = null;
  handleMenus(G.input);
  stepWorld(dt);
  render(G);
  if (G.state === 'playing' || G.state === 'paused') drawHUD(G);
  if (G.state === 'title') drawTitle(G.ctx, G);
  if (G.state === 'paused') drawPause(G.ctx, G);
  if (G.state === 'gameover') drawGameOver(G.ctx, G);
  endFrame(G.input);
  requestAnimationFrame(frame);
}

// Exposed for headless play-testing: window.__solmar gives the live state.
window.__solmar = G;
window.__solmarObjective = () => objectiveText(G);

requestAnimationFrame(frame);
