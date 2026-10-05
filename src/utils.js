import { Texture } from 'pixi.js';

export const rand = (a, b) => a + Math.random() * (b - a);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function quadPoints(p0, c, p1, n = 30) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    pts.push({
      x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x,
      y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y,
    });
  }
  return pts;
}

// Пересэмплирование полилинии с шагом step — чтобы сегменты физических тел были ровными
export function resample(points, step) {
  if (points.length < 2) return points.slice();
  const out = [points[0]];
  let acc = 0;
  for (let i = 1; i < points.length; i++) {
    let a = points[i - 1], b = points[i];
    let d = Math.hypot(b.x - a.x, b.y - a.y);
    while (acc + d >= step) {
      const t = (step - acc) / d;
      const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      out.push(p);
      a = p;
      d = Math.hypot(b.x - a.x, b.y - a.y);
      acc = 0;
    }
    acc += d;
  }
  const last = points[points.length - 1];
  const tail = out[out.length - 1];
  if (Math.hypot(last.x - tail.x, last.y - tail.y) > 4) out.push({ x: last.x, y: last.y });
  return out;
}

// Один шаг Chaikin — сглаживает углы нарисованной линии
export function chaikin(points) {
  if (points.length < 3) return points;
  const out = [points[0]];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    out.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 });
    out.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
  }
  out.push(points[points.length - 1]);
  return out;
}

// Градиент фона как текстура — дешевле и без пересборок Graphics
export function makeGradientTexture(colorTop, colorBottom) {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#' + colorTop.toString(16).padStart(6, '0'));
  grad.addColorStop(1, '#' + colorBottom.toString(16).padStart(6, '0'));
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 512);
  return Texture.from(c);
}
