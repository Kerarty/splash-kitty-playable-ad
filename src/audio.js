// Все звуки синтезируются на лету — ноль аудиофайлов, ноль запросов.
// AudioContext создаётся по первому тапу (политика автоплея).

let ctx = null;
let master = null;
let noiseGain = null;

export function initAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.4;
    master.connect(ctx.destination);

    // Зацикленный белый шум через bandpass — скрип карандаша при рисовании / шум ливня
    const len = ctx.sampleRate * 0.5;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2200;
    bp.Q.value = 0.8;
    noiseGain = ctx.createGain();
    noiseGain.gain.value = 0;
    src.connect(bp).connect(noiseGain).connect(master);
    src.start();
  } catch (e) {
    ctx = null;
  }
}

function blip(freq, dur = 0.08, type = 'sine', vol = 0.2, slideTo = 0, when = 0) {
  if (!ctx) return;
  const t0 = ctx.currentTime + when;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function noiseTo(level, ramp = 0.06) {
  if (noiseGain && ctx) noiseGain.gain.linearRampToValueAtTime(level, ctx.currentTime + ramp);
}

export const sfx = {
  tap: () => blip(650, 0.07, 'triangle', 0.25),
  pop: () => blip(880, 0.05, 'square', 0.12, 1300),
  plink: () => blip(500 + Math.random() * 600, 0.06, 'sine', 0.09, 300),
  drawStart: () => noiseTo(0.045),
  drawStop: () => noiseTo(0, 0.09),
  pourStart: () => noiseTo(0.028, 0.3),
  pourStop: () => noiseTo(0, 0.3),
  win: () => {
    [523, 659, 784, 1047].forEach((f, i) => blip(f, 0.16, 'triangle', 0.22, 0, i * 0.09));
    blip(1568, 0.45, 'sine', 0.1, 0, 0.4);
  },
  fail: () => {
    blip(330, 0.18, 'sawtooth', 0.1, 240);
    blip(240, 0.28, 'sawtooth', 0.09, 150, 0.16);
  },
};
