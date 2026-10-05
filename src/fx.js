// Партиклы (пул спрайтов), screen shake, slow-mo. Все текстуры генерируются на canvas.
import { Container, Sprite, Texture } from 'pixi.js';
import { rand } from './utils.js';
import { tween, Ease } from './tween.js';
import { W } from './config.js';

function makeTex(draw) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  draw(c.getContext('2d'));
  return Texture.from(c);
}

export const TEX = {};

export function initFxTextures() {
  TEX.dot = makeTex((g) => {
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(32, 32, 15, 0, 7);
    g.fill();
  });
  TEX.confetti = makeTex((g) => {
    g.fillStyle = '#fff';
    g.beginPath();
    g.roundRect(22, 16, 20, 30, 6);
    g.fill();
  });
  TEX.heart = makeTex((g) => {
    g.fillStyle = '#fff';
    g.beginPath();
    g.moveTo(32, 52);
    g.bezierCurveTo(6, 34, 10, 12, 32, 24);
    g.bezierCurveTo(54, 12, 58, 34, 32, 52);
    g.fill();
  });
  TEX.star = makeTex((g) => {
    g.fillStyle = '#fff';
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 26 : 11;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const x = 32 + Math.cos(a) * r;
      const y = 32 + Math.sin(a) * r;
      i === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.closePath();
    g.fill();
  });
}

export const CONFETTI_TINTS = [0xff7043, 0xffd54f, 0x4fc3f7, 0x81c784, 0xf06292, 0xba68c8];

const layer = new Container();
export const fxLayer = () => layer;

const parts = [];
const free = [];

function getSprite(tex) {
  let s = free.pop();
  if (!s) {
    s = new Sprite(tex);
    s.anchor.set(0.5);
    layer.addChild(s);
  }
  s.texture = tex;
  s.visible = true;
  s.alpha = 1;
  return s;
}

export function burst(tex, x, y, n, opts = {}) {
  for (let i = 0; i < n; i++) {
    const s = getSprite(tex);
    s.tint = opts.tints ? opts.tints[(Math.random() * opts.tints.length) | 0] : opts.tint ?? 0xffffff;
    s.position.set(x + rand(-10, 10), y + rand(-8, 8));
    s.rotation = rand(0, 6.28);
    s.scale.set(rand(opts.s0 ?? 0.6, opts.s1 ?? 1.1));
    parts.push({
      s,
      vx: rand(-1, 1) * (opts.spread ?? 6),
      vy: rand(opts.vy0 ?? -10, opts.vy1 ?? -4),
      g: opts.g ?? 0.35,
      spin: rand(-0.25, 0.25),
      life: rand(opts.l0 ?? 600, opts.l1 ?? 1100),
      t: 0,
      sway: opts.sway ?? 0,
    });
  }
}

let confettiRain = false;
export const setConfettiRain = (v) => (confettiRain = v);

function spawnConfettiTop() {
  const s = getSprite(TEX.confetti);
  s.tint = CONFETTI_TINTS[(Math.random() * CONFETTI_TINTS.length) | 0];
  s.position.set(rand(0, W), -30);
  s.rotation = rand(0, 6.28);
  s.scale.set(rand(0.7, 1.2));
  parts.push({
    s,
    vx: rand(-1, 1),
    vy: rand(2, 4),
    g: 0.04,
    spin: rand(-0.2, 0.2),
    life: rand(2800, 4200),
    t: 0,
    sway: 1.6,
  });
}

// --- screen shake ---
const shakeState = { t: 0, dur: 1, power: 0 };
export function shake(power, dur) {
  shakeState.power = power;
  shakeState.dur = dur;
  shakeState.t = dur;
}
export function shakeOffset() {
  if (shakeState.t <= 0) return { x: 0, y: 0 };
  const k = shakeState.t / shakeState.dur;
  return { x: rand(-1, 1) * shakeState.power * k, y: rand(-1, 1) * shakeState.power * k };
}

// --- slow-mo: физика/партиклы замедляются, твины и UI идут в реальном времени ---
export const clock = { scale: 1 };
export function slowMo() {
  clock.scale = 0.16;
  tween(clock, { scale: 1 }, { duration: 900, delay: 380, ease: Ease.quadOut });
}

export function updateFx(dt) {
  shakeState.t = Math.max(0, shakeState.t - dt);
  if (confettiRain && Math.random() < dt / 90) spawnConfettiTop();
  const k = dt / 16.666 * clock.scale;
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.t += dt;
    if (p.t >= p.life) {
      p.s.visible = false;
      free.push(p.s);
      parts.splice(i, 1);
      continue;
    }
    p.vy += p.g * k;
    p.s.x += p.vx * k + (p.sway ? Math.sin(p.t / 180) * p.sway * k * 0.6 : 0);
    p.s.y += p.vy * k;
    p.s.rotation += p.spin * k;
    p.s.alpha = Math.min(1, (p.life - p.t) / 260);
  }
}

export function popIn(node, from = 0.4, dur = 500) {
  node.scale.set(from, from);
  tween(node.scale, { x: 1, y: 1 }, { duration: dur, ease: Ease.backOut });
}
