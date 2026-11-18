// Solmar City — all sound is synthesized with WebAudio. No audio files,
// no network: oscillators and noise buffers built at runtime.

export function createAudio() {
  const audio = {
    ctx: null,
    master: null,
    engineOsc: null,
    engineGain: null,
    sirenOsc: null,
    sirenGain: null,
    sirenLfo: null,
    musicTimer: 0,
    enabled: true,
  };
  return audio;
}

export function ensureAudio(audio) {
  if (audio.ctx) {
    if (audio.ctx.state === 'suspended') audio.ctx.resume();
    return;
  }
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audio.ctx = new Ctx();
    audio.master = audio.ctx.createGain();
    audio.master.gain.value = 0.35;
    audio.master.connect(audio.ctx.destination);
    // Engine hum: a low sawtooth whose pitch follows the car's speed.
    audio.engineOsc = audio.ctx.createOscillator();
    audio.engineOsc.type = 'sawtooth';
    audio.engineOsc.frequency.value = 55;
    audio.engineGain = audio.ctx.createGain();
    audio.engineGain.gain.value = 0;
    const engineFilter = audio.ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 420;
    audio.engineOsc.connect(engineFilter);
    engineFilter.connect(audio.engineGain);
    audio.engineGain.connect(audio.master);
    audio.engineOsc.start();
    // Police siren: a triangle wave wobbling between two notes.
    audio.sirenOsc = audio.ctx.createOscillator();
    audio.sirenOsc.type = 'triangle';
    audio.sirenOsc.frequency.value = 720;
    audio.sirenGain = audio.ctx.createGain();
    audio.sirenGain.gain.value = 0;
    audio.sirenLfo = audio.ctx.createOscillator();
    audio.sirenLfo.type = 'square';
    audio.sirenLfo.frequency.value = 0.9;
    const lfoGain = audio.ctx.createGain();
    lfoGain.gain.value = 220;
    audio.sirenLfo.connect(lfoGain);
    lfoGain.connect(audio.sirenOsc.frequency);
    audio.sirenOsc.connect(audio.sirenGain);
    audio.sirenGain.connect(audio.master);
    audio.sirenOsc.start();
    audio.sirenLfo.start();
  } catch (err) {
    audio.ctx = null;
  }
}

export function setMuted(audio, muted) {
  audio.enabled = !muted;
  if (audio.master) audio.master.gain.value = muted ? 0 : 0.35;
  if (audio.engineGain) audio.engineGain.gain.value = 0;
  if (audio.sirenGain) audio.sirenGain.gain.value = 0;
}

export function isMuted(audio) {
  return !audio.enabled;
}

export function setEngine(audio, speed01, driving) {
  if (!audio.ctx || !audio.engineOsc) return;
  const target = driving ? 0.05 + speed01 * 0.09 : 0;
  audio.engineGain.gain.setTargetAtTime(target, audio.ctx.currentTime, 0.1);
  audio.engineOsc.frequency.setTargetAtTime(55 + speed01 * 130, audio.ctx.currentTime, 0.1);
}

export function setSiren(audio, on) {
  if (!audio.ctx || !audio.sirenGain) return;
  audio.sirenGain.gain.setTargetAtTime(on ? 0.045 : 0, audio.ctx.currentTime, 0.2);
}

function blip(audio, freq, dur, type, vol, slideTo) {
  if (!audio.ctx || !audio.master) return;
  const t = audio.ctx.currentTime;
  const osc = audio.ctx.createOscillator();
  const gain = audio.ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  gain.gain.setValueAtTime(vol || 0.2, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain);
  gain.connect(audio.master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noiseBurst(audio, dur, vol, lowpass) {
  if (!audio.ctx || !audio.master) return;
  const t = audio.ctx.currentTime;
  const len = Math.floor(audio.ctx.sampleRate * dur);
  const buffer = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = audio.ctx.createBufferSource();
  src.buffer = buffer;
  const filter = audio.ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass || 1200;
  const gain = audio.ctx.createGain();
  gain.gain.setValueAtTime(vol || 0.3, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(audio.master);
  src.start(t);
}

export function playShot(audio) {
  noiseBurst(audio, 0.12, 0.4, 2400);
  blip(audio, 180, 0.08, 'square', 0.12, 60);
}

export function playPickup(audio) {
  blip(audio, 660, 0.1, 'sine', 0.22);
  setTimeout(() => blip(audio, 990, 0.16, 'sine', 0.22), 90);
}

export function playCash(audio) {
  blip(audio, 880, 0.09, 'triangle', 0.2);
  setTimeout(() => blip(audio, 1174, 0.09, 'triangle', 0.2), 80);
  setTimeout(() => blip(audio, 1568, 0.18, 'triangle', 0.2), 160);
}

export function playCrash(audio) {
  noiseBurst(audio, 0.25, 0.45, 500);
}

export function playHorn(audio) {
  blip(audio, 340, 0.18, 'square', 0.1, 340);
  blip(audio, 428, 0.18, 'square', 0.08, 428);
}

export function playBusted(audio) {
  blip(audio, 392, 0.25, 'sawtooth', 0.16, 370);
  setTimeout(() => blip(audio, 311, 0.25, 'sawtooth', 0.16, 294), 220);
  setTimeout(() => blip(audio, 233, 0.5, 'sawtooth', 0.16, 220), 440);
}

// A lazy synthwave-ish bass line that drifts along while driving, built from
// a tiny step pattern so the city never feels silent.
const BASS_LINE = [55, 0, 55, 65.4, 0, 55, 49, 0, 55, 0, 82.4, 73.4, 65.4, 0, 49, 0];

export function updateMusic(audio, dt, driving) {
  if (!audio.ctx || !driving) return;
  audio.musicTimer -= dt;
  if (audio.musicTimer > 0) return;
  audio.musicTimer = 0.24;
  const step = Math.floor(audio.ctx.currentTime / 0.24) % BASS_LINE.length;
  const freq = BASS_LINE[step];
  if (freq > 0) blip(audio, freq, 0.22, 'triangle', 0.07);
}
