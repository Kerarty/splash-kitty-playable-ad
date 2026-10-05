// Кот-стакан — маскот игры. Стеклянный стакан с кошачьими ушами, лапами и хвостом.
// Настроения: idle / worried / happy / sad. Внутри — вода с волнами.
import { Container, Graphics } from 'pixi.js';
import { COL, CUP_W, CUP_H } from './config.js';
import { rand, clamp } from './utils.js';
import { tween, killTweensOf, Ease } from './tween.js';

const EYE_Y = -30;

export class CatCup extends Container {
  constructor() {
    super();
    this.mood = 'idle';
    this.fill = 0;
    this.energy = 0; // всплеск воды
    this.t = rand(0, 5000);
    this.blinkT = rand(1500, 3500);
    this.blinkAnim = 0;
    this.earWiggleT = 0;
    this.lookX = 0;
    this.lookY = 0;
    this.baseY = 0;

    this.buildTail();
    this.buildEars();
    this.buildBody();
    this.buildWater();
    this.buildFace();
    this.buildPaws();
  }

  buildTail() {
    const g = new Graphics();
    g.moveTo(96, 92);
    g.bezierCurveTo(162, 112, 176, 42, 136, 20);
    g.stroke({ width: 20, color: COL.catDark, cap: 'round' });
    g.circle(136, 20, 11).fill({ color: COL.cat });
    g.pivot.set(96, 92);
    g.position.set(96, 92);
    this.tail = g;
    this.addChild(g);
  }

  buildEars() {
    const mk = (s) => {
      const g = new Graphics();
      g.moveTo(s * 32, -104);
      g.quadraticCurveTo(s * 42, -184, s * 86, -168);
      g.quadraticCurveTo(s * 92, -165, s * 84, -100);
      g.closePath();
      g.fill({ color: COL.cat });
      g.stroke({ width: 8, color: COL.outline, join: 'round' });
      g.moveTo(s * 44, -120);
      g.quadraticCurveTo(s * 50, -166, s * 74, -156);
      g.quadraticCurveTo(s * 77, -154, s * 73, -116);
      g.closePath();
      g.fill({ color: COL.innerEar });
      g.pivot.set(s * 40, -104);
      g.position.set(s * 40, -104);
      this.addChild(g);
      return g;
    };
    this.earL = mk(-1);
    this.earR = mk(1);
  }

  buildBody() {
    const g = new Graphics();
    g.roundRect(-CUP_W / 2, -CUP_H / 2, CUP_W, CUP_H, 30)
      .fill({ color: COL.white, alpha: 0.96 })
      .stroke({ width: 9, color: COL.outline });
    // блик стекла
    g.roundRect(-88, -96, 16, 130, 8).fill({ color: 0xbbdefb, alpha: 0.55 });
    this.addChild(g);
  }

  buildWater() {
    this.maskG = new Graphics();
    this.maskG.roundRect(-92, -108, 184, 220, 22).fill({ color: 0xffffff });
    this.addChild(this.maskG);

    this.waterG = new Graphics();
    this.waterG.mask = this.maskG;
    this.addChild(this.waterG);
  }

  buildFace() {
    this.eyesG = new Graphics();
    this.mouthG = new Graphics();
    this.tearG = new Graphics();
    const deco = new Graphics();
    deco.circle(-64, 8, 13).fill({ color: COL.blush, alpha: 0.4 });
    deco.circle(64, 8, 13).fill({ color: COL.blush, alpha: 0.4 });
    // нос
    deco.moveTo(-5, -8);
    deco.lineTo(5, -8);
    deco.lineTo(0, -1);
    deco.closePath();
    deco.fill({ color: COL.blush });
    // усы
    for (const s of [-1, 1]) {
      deco.moveTo(s * 58, -14);
      deco.lineTo(s * 100, -22);
      deco.moveTo(s * 60, -4);
      deco.lineTo(s * 104, -4);
      deco.moveTo(s * 58, 6);
      deco.lineTo(s * 100, 14);
    }
    deco.stroke({ width: 4, color: COL.outline, alpha: 0.45, cap: 'round' });
    this.addChild(deco, this.tearG, this.eyesG, this.mouthG);
    this.redrawMouth();
  }

  buildPaws() {
    this.paws = [];
    for (const s of [-1, 1]) {
      const g = new Graphics();
      g.roundRect(-22, -13, 44, 26, 13)
        .fill({ color: COL.cat })
        .stroke({ width: 6, color: COL.outline });
      g.position.set(s * 96, 64);
      g.rotation = s * 0.22;
      this.addChild(g);
      this.paws.push(g);
    }
  }

  redrawMouth() {
    const g = this.mouthG;
    g.clear();
    if (this.mood === 'happy') {
      g.arc(0, 8, 18, 0, Math.PI).fill({ color: 0xd84a3a });
      g.arc(0, 16, 9, Math.PI, 0).fill({ color: COL.blush });
    } else if (this.mood === 'sad') {
      g.arc(0, 26, 14, Math.PI * 1.15, Math.PI * 1.85).stroke({
        width: 6,
        color: COL.outline,
        cap: 'round',
      });
    } else {
      g.arc(-9, 0, 9, 0.15, Math.PI - 0.15).stroke({ width: 5, color: COL.outline, alpha: 0.85, cap: 'round' });
      g.moveTo(0, 0);
      g.arc(9, 0, 9, 0.15, Math.PI - 0.15).stroke({ width: 5, color: COL.outline, alpha: 0.85, cap: 'round' });
    }
  }

  setMood(m) {
    if (this.mood === m) return;
    this.mood = m;
    this.redrawMouth();
  }

  setFill(r) {
    this.fill = clamp(r, 0, 1);
  }

  splash() {
    this.energy = 1;
    this.earWiggleT = 280;
  }

  happyBounce() {
    killTweensOf(this.scale);
    killTweensOf(this.position);
    this.baseY = this.position.y;
    this.scale.set(1.12, 0.86);
    tween(this.scale, { x: 1, y: 1 }, { duration: 560, ease: Ease.elasticOut });
    tween(this.position, { y: this.baseY - 46 }, { duration: 190, ease: Ease.quadOut, onDone: () => {
      tween(this.position, { y: this.baseY }, { duration: 420, ease: Ease.backOut });
    }});
  }

  update(dt) {
    this.t += dt;
    const time = this.t;

    // хвост
    this.tail.rotation = Math.sin(time / 320) * 0.14;

    // мигание
    this.blinkT -= dt;
    if (this.blinkT < 0) {
      this.blinkT = rand(1600, 3600);
      this.blinkAnim = 160;
    }
    const blinking = this.blinkAnim > 0;
    if (blinking) this.blinkAnim -= dt;

    // усы-уши анимация
    if (this.earWiggleT > 0) {
      this.earWiggleT -= dt;
      const k = Math.sin(this.earWiggleT / 45) * 0.3;
      this.earL.rotation = k;
      this.earR.rotation = -k;
    } else if (this.mood === 'sad') {
      this.earL.rotation = 0.5;
      this.earR.rotation = -0.5;
    } else {
      this.earL.rotation = 0;
      this.earR.rotation = 0;
    }

    // глаза
    const g = this.eyesG;
    g.clear();
    for (const s of [-1, 1]) {
      const ex = s * 38;
      if (this.mood === 'happy') {
        g.arc(ex, EYE_Y + 6, 13, Math.PI, 0).stroke({ width: 7, color: COL.outline, cap: 'round' });
      } else if (this.mood === 'sad') {
        g.moveTo(ex - 10, EYE_Y - 8);
        g.lineTo(ex + 10, EYE_Y + 2);
        g.stroke({ width: 7, color: COL.outline, cap: 'round' });
      } else if (blinking) {
        g.moveTo(ex - 11, EYE_Y + 2);
        g.lineTo(ex + 11, EYE_Y + 2);
        g.stroke({ width: 6, color: COL.outline, cap: 'round' });
      } else {
        g.circle(ex + this.lookX * 5, EYE_Y + this.lookY * 4, 11).fill({ color: COL.outline });
        g.circle(ex + this.lookX * 5 - 3, EYE_Y + this.lookY * 4 - 4, 3.6).fill({ color: COL.white });
      }
    }

    // слеза при грусти
    this.tearG.clear();
    if (this.mood === 'sad') {
      const p = (time % 1000) / 1000;
      this.tearG.circle(50, -14 + p * 70, 7 - p * 3).fill({ color: COL.water, alpha: 1 - p });
    }

    // вода внутри с волнами
    this.energy = Math.max(0, this.energy - dt * 0.0035);
    const wg = this.waterG;
    wg.clear();
    const h = this.fill * 208;
    if (h > 5) {
      const top = 112 - h;
      const amp = 2.5 + this.energy * 9;
      wg.moveTo(-92, 112);
      wg.lineTo(-92, top);
      for (let x = -92; x < 92; x += 23) {
        wg.quadraticCurveTo(x + 11.5, top + Math.sin(time / 110 + x * 0.5) * amp, x + 23, top);
      }
      wg.lineTo(92, 112);
      wg.closePath();
      wg.fill({ color: COL.water, alpha: 0.94 });
      wg.ellipse(0, top + 4, 40, 6).fill({ color: COL.white, alpha: 0.35 });
    }

    // лапы слегка дышат
    for (let i = 0; i < 2; i++) {
      this.paws[i].y = 64 + Math.sin(time / 420 + i * 2.1) * 2.5;
    }
  }
}
