// Solmar City — the story: four jobs for Mara Voss, a fixer who runs the
// Solmar underworld from the back of La Brisa diner. Each mission is a
// chain of steps with a map marker, a HUD objective and a cash reward.

import { dist, SAVE_KEY } from './config.js';
import { addHeat } from './police.js';
import { playCash, playPickup } from './audio.js';

export const MISSIONS = [
  {
    id: 1,
    title: 'Job 1 — First Delivery',
    intro: 'Mara needs a driver she can trust. Pick up the package at La Brisa diner and deliver it to the marina. Keep it quiet.',
    reward: 300,
    steps: [
      { type: 'goto', x: 1340, y: 920, radius: 70, text: 'Go to La Brisa diner and pick up the package (E)' },
      { type: 'deliver', x: 2420, y: 240, radius: 80, text: 'Deliver the package to the marina' },
    ],
  },
  {
    id: 2,
    title: 'Job 2 — The Getaway',
    intro: 'The marina job went loud. The cops are onto you. Grab a car and get to Warehouse 9 — fast, before the net closes.',
    reward: 500,
    steps: [
      { type: 'getaway', x: 2420, y: 1600, radius: 90, text: 'Reach Warehouse 9 in a car — the police are coming' },
    ],
  },
  {
    id: 3,
    title: 'Job 3 — Lose the Tail',
    intro: 'Warehouse 9 is safe, but the cruisers are circling. Lay low until the heat dies down. Stay out of sight.',
    reward: 400,
    steps: [
      { type: 'escape', x: 0, y: 0, radius: 0, text: 'Lose the police — stay out of sight until your wanted level clears' },
    ],
  },
  {
    id: 4,
    title: 'Job 4 — The Big Pickup',
    intro: 'One last job. The Solmar Bank vault money is sitting in a duffel at the warehouse. Grab it on foot and bring it home to Casa Luna.',
    reward: 1000,
    steps: [
      { type: 'goto', x: 2420, y: 1600, radius: 70, text: 'Go to Warehouse 9 on foot and grab the duffel (E)' },
      { type: 'deliver', x: 620, y: 580, radius: 80, text: 'Bring the money home to Casa Luna' },
    ],
  },
];

export function createMissionState() {
  return {
    index: 0, // which mission
    step: 0, // which step inside it
    done: false,
    carrying: false,
    timer: 0,
    started: false,
  };
}

export function currentMission(G) {
  return G.missions.done ? null : MISSIONS[G.missions.index];
}

export function currentStep(G) {
  const m = currentMission(G);
  return m ? m.steps[G.missions.step] : null;
}

export function objectiveText(G) {
  if (G.missions.done) return 'Story complete — Solmar City is yours. Free roam!';
  const m = currentMission(G);
  const s = currentStep(G);
  if (!m || !s) return '';
  return m.title + ': ' + s.text;
}

export function missionMarker(G) {
  const s = currentStep(G);
  if (!s || s.type === 'escape') return null;
  return { x: s.x, y: s.y };
}

// Call when a mission starts so its intro shows and any setup (like the
// getaway's wanted level) is applied.
export function startMission(G) {
  const m = currentMission(G);
  if (!m) return;
  G.missions.started = true;
  G.missions.timer = 0;
  G.message = m.title + ' — ' + m.intro;
  G.messageTimer = 6;
  if (m.id === 2) {
    addHeat(G, 50, 'The marina job went loud');
  }
}

function completeStep(G) {
  const m = currentMission(G);
  const s = currentStep(G);
  if (!s) return;
  G.missions.step++;
  G.audio && playPickup(G.audio);
  if (G.missions.step >= m.steps.length) {
    completeMission(G);
  } else {
    G.message = 'Step done — ' + currentStep(G).text;
    G.messageTimer = 3;
  }
}

function completeMission(G) {
  const m = currentMission(G);
  G.player.cash += m.reward;
  G.audio && playCash(G.audio);
  G.message = m.title + ' complete! +$' + m.reward;
  G.messageTimer = 4;
  G.missions.index++;
  G.missions.step = 0;
  G.missions.carrying = false;
  if (G.missions.index >= MISSIONS.length) {
    G.missions.done = true;
    G.message = 'STORY COMPLETE — You pulled off every job. Solmar City is yours!';
    G.messageTimer = 6;
  } else {
    startMission(G);
  }
  saveProgress(G);
}

export function updateMissions(G, input, dt) {
  const m = currentMission(G);
  if (!m) return;
  if (!G.missions.started) startMission(G);
  const s = currentStep(G);
  if (!s) return;
  G.missions.timer += dt;
  const p = G.player;
  const px = p.car ? p.car.x : p.x;
  const py = p.car ? p.car.y : p.y;

  if (s.type === 'goto') {
    const d = dist(px, py, s.x, s.y);
    if (d < s.radius) {
      if (p.car) {
        G.hint = 'Get out of the car (E) to pick it up';
      } else if (input.pressed && input.pressed['e']) {
        G.missions.carrying = true;
        completeStep(G);
      } else {
        G.hint = 'Press E to pick up';
      }
    }
  } else if (s.type === 'deliver') {
    if (dist(px, py, s.x, s.y) < s.radius) {
      if (m.id === 4 && p.car) {
        G.hint = 'Get out of the car (E) to finish the job';
      } else {
        completeStep(G);
      }
    }
  } else if (s.type === 'getaway') {
    if (!p.car) {
      G.hint = 'You need a car — press E near one to steal it';
    } else if (dist(px, py, s.x, s.y) < s.radius) {
      completeStep(G);
    }
  } else if (s.type === 'escape') {
    if (G.wanted.stars === 0) {
      completeStep(G);
    }
  }
}

export function saveProgress(G) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: G.player.cash,
      missionIndex: Math.min(G.missions.index, MISSIONS.length - 1),
      done: G.missions.done,
    }));
  } catch (err) {
    // Private mode or no storage — the game still plays.
  }
}

export function loadProgress() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}
