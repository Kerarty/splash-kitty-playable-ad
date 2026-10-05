// matter.js: стены/пол/препятствия/стакан — статик; капли — динамик;
// нарисованная линия превращается в цепочку повёрнутых прямоугольников.
import Matter from 'matter-js';
import { DROP_R, FLOOR_TOP, H, W, CUP_W, CUP_H, CUP_Y } from './config.js';
import { resample, rand } from './utils.js';

const { Engine, Composite, Bodies, Body, Events, Sleeping } = Matter;

export class PhysWorld {
  constructor() {
    this.engine = Engine.create({ enableSleeping: true });
    this.engine.gravity.y = 1.35;
    this.drops = [];
    this.strokeBodies = [];
    this.staticBodies = [];
    this.onDropHit = null;

    Events.on(this.engine, 'collisionStart', (e) => {
      if (!this.onDropHit) return;
      for (const pair of e.pairs) {
        const a = pair.bodyA, b = pair.bodyB;
        if (a.label === 'drop' || b.label === 'drop') {
          const drop = a.label === 'drop' ? a : b;
          const other = drop === a ? b : a;
          const p = (pair.collision.supports && pair.collision.supports[0]) || drop.position;
          this.onDropHit(drop, other, p);
        }
      }
    });
  }

  addStatics(shapes) {
    for (const s of shapes) {
      const b = Bodies.rectangle(s.x, s.y, s.w, s.h, {
        isStatic: true,
        friction: 0.05,
        restitution: 0,
        label: s.label || 'wall',
      });
      Composite.add(this.engine.world, b);
      this.staticBodies.push(b);
    }
  }

  clearStatics() {
    for (const b of this.staticBodies) Composite.remove(this.engine.world, b);
    this.staticBodies = [];
  }

  addStroke(points) {
    const th = 20;
    const pts = resample(points, 16);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      if (len < 2) continue;
      const body = Bodies.rectangle((a.x + b.x) / 2, (a.y + b.y) / 2, len + th, th, {
        isStatic: true,
        angle: Math.atan2(dy, dx),
        friction: 0.02,
        restitution: 0,
        label: 'stroke',
      });
      Composite.add(this.engine.world, body);
      this.strokeBodies.push(body);
    }
  }

  clearStroke() {
    for (const b of this.strokeBodies) Composite.remove(this.engine.world, b);
    this.strokeBodies = [];
  }

  spawnDrop(x, y) {
    const b = Bodies.circle(x, y, DROP_R, {
      restitution: 0,
      friction: 0.008,
      frictionStatic: 0.008,
      frictionAir: 0.002,
      density: 0.0015,
      slop: 0.03,
      label: 'drop',
    });
    Body.setVelocity(b, { x: rand(-0.5, 0.5), y: 2 });
    Composite.add(this.engine.world, b);
    this.drops.push(b);
    return b;
  }

  clearDrops() {
    for (const b of this.drops) Composite.remove(this.engine.world, b);
    this.drops = [];
  }

  step(ms) {
    Engine.update(this.engine, ms);
  }

  avgSpeed() {
    if (!this.drops.length) return 0;
    let s = 0;
    for (const d of this.drops) s += Math.hypot(d.velocity.x, d.velocity.y);
    return s / this.drops.length;
  }

  countInside(r) {
    let n = 0;
    for (const d of this.drops) {
      if (d.position.x > r.x1 && d.position.x < r.x2 && d.position.y > r.y1 && d.position.y < r.y2) n++;
    }
    return n;
  }
}

// Геометрия уровня: стены по бокам, пол снизу, стакан, препятствия
export function staticShapes(level) {
  const shapes = [
    { x: -30, y: 600, w: 60, h: 2200, label: 'wall' },
    { x: W + 30, y: 600, w: 60, h: 2200, label: 'wall' },
    { x: W / 2, y: FLOOR_TOP + (H + 300 - FLOOR_TOP) / 2, w: W + 200, h: H + 300 - FLOOR_TOP, label: 'floor' },
    // стакан: две стенки + дно
    { x: level.cupX - CUP_W / 2 + 7, y: CUP_Y, w: 14, h: CUP_H, label: 'cup' },
    { x: level.cupX + CUP_W / 2 - 7, y: CUP_Y, w: 14, h: CUP_H, label: 'cup' },
    { x: level.cupX, y: CUP_Y + CUP_H / 2 - 7, w: CUP_W, h: 14, label: 'cup' },
  ];
  for (const o of level.obstacles) {
    shapes.push({ x: o.x, y: o.y, w: o.w, h: o.h, label: 'block' });
  }
  return shapes;
}

// Внутренняя зона стакана — считаем капли здесь
export function cupRect(level) {
  return {
    x1: level.cupX - CUP_W / 2 + 22,
    x2: level.cupX + CUP_W / 2 - 22,
    y1: CUP_Y - CUP_H / 2 + 30,
    y2: CUP_Y + CUP_H / 2 - 12,
  };
}
