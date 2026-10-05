// Metaball-вода: капли — мягкие круги цвета воды, затем BlurFilter + ColorMatrixFilter
// с жёстким порогом по альфе — круги сливаются в жидкость. Классический приём, ноль кастомного GLSL.
import { Container, Sprite, Texture, BlurFilter, ColorMatrixFilter } from 'pixi.js';
import { COL } from './config.js';

// Текстура сразу синяя: цвет не зависит от tint/фильтров
function makeDropTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  const hex = '#' + COL.water.toString(16).padStart(6, '0');
  const grad = g.createRadialGradient(64, 64, 26, 64, 64, 62);
  grad.addColorStop(0, hex);
  grad.addColorStop(0.72, hex);
  grad.addColorStop(1, 'rgba(63,169,245,0)');
  g.fillStyle = grad;
  g.beginPath();
  g.arc(64, 64, 62, 0, 7);
  g.fill();
  return Texture.from(c);
}

// Порог альфы: a' = 12a - 11 → отсекается всё прозрачнее ~0.92, а на a=1 ровно 1
// (важно: если наклон даёт a' > 1, шейдер Pixi умножает rgb на незажатую альфу → белые пятна).
// RGB-строки = константы цвета воды: на выходе всегда чистый цвет, независимо от блюра.
const r = ((COL.water >> 16) & 255) / 255;
const g = ((COL.water >> 8) & 255) / 255;
const b = (COL.water & 255) / 255;
const THRESHOLD_MATRIX = [0, 0, 0, 0, r, 0, 0, 0, 0, g, 0, 0, 0, 0, b, 0, 0, 0, 12, -11];

export class WaterLayer extends Container {
  constructor() {
    super();
    this.tex = makeDropTexture();
    this.inner = new Container();
    this.addChild(this.inner);

    this.blur = new BlurFilter({ strength: 8, quality: 2 });
    this.cm = new ColorMatrixFilter();
    // мутируем внутренний массив матрицы — надёжнее, чем присваивание нового
    const m = this.cm.matrix;
    if (m && typeof m.set === 'function') m.set(THRESHOLD_MATRIX);
    else for (let i = 0; i < 20; i++) this.cm.matrix[i] = THRESHOLD_MATRIX[i];
    this.inner.filters = [this.blur, this.cm];

    this.pool = [];
    this.SPRITE_SCALE = 0.3;
  }

  // bodies — тела matter.js; hideRect — зона стакана: там капли не рисуем,
  // уровень воды показывает сам кот-стакан
  sync(bodies, hideRect) {
    while (this.pool.length < bodies.length) {
      const s = new Sprite(this.tex);
      s.anchor.set(0.5);
      this.inner.addChild(s);
      this.pool.push(s);
    }
    for (let i = 0; i < this.pool.length; i++) {
      const s = this.pool[i];
      if (i < bodies.length) {
        const p = bodies[i].position;
        const hidden =
          hideRect && p.x > hideRect.x1 && p.x < hideRect.x2 && p.y > hideRect.y1 && p.y < hideRect.y2;
        s.visible = !hidden;
        s.position.set(p.x, p.y);
      } else {
        s.visible = false;
      }
    }
  }
}
