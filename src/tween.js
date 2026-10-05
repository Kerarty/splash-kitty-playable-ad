// Мини-твинер: числа, задержка, eases, killTweensOf. Твины идут в реальном времени
// (не замедляются slow-mo) — физика и партиклы замедляются, интерфейс нет.
const tweens = new Set();

export const Ease = {
  linear: (t) => t,
  quadIn: (t) => t * t,
  quadOut: (t) => 1 - (1 - t) * (1 - t),
  cubicOut: (t) => 1 - Math.pow(1 - t, 3),
  sineInOut: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  backOut: (t) => {
    const c = 2.0, u = t - 1;
    return 1 + (c + 1) * u * u * u + c * u * u;
  },
  elasticOut: (t) =>
    t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
};

export function tween(obj, to, opts = {}) {
  const { duration = 300, delay = 0, ease = Ease.quadOut, onDone, onUpdate } = opts;
  const tw = { obj, to, duration, delay, ease, onDone, onUpdate, elapsed: 0, from: null, dead: false };
  tweens.add(tw);
  return tw;
}

export function killTweensOf(obj) {
  for (const tw of tweens) if (tw.obj === obj) tweens.delete(tw);
}

export function updateTweens(dt) {
  for (const tw of [...tweens]) {
    tw.elapsed += dt;
    const t = tw.elapsed - tw.delay;
    if (t < 0) continue;
    if (!tw.from) {
      tw.from = {};
      for (const k in tw.to) tw.from[k] = tw.obj[k];
    }
    const p = Math.min(1, t / tw.duration);
    const e = tw.ease(p);
    for (const k in tw.to) tw.obj[k] = tw.from[k] + (tw.to[k] - tw.from[k]) * e;
    if (tw.onUpdate) tw.onUpdate(e);
    if (p >= 1) {
      tweens.delete(tw);
      if (tw.onDone) tw.onDone();
    }
  }
}
