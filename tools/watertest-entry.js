// Изолированный тест рендера воды: 4 квадранта — raw / blur / blur+matrix / blur+matrix(alpha=1)
import { Application, Container, Sprite, Texture, Text, BlurFilter, ColorMatrixFilter } from 'pixi.js';

const app = new Application();
app.init({ width: 800, height: 600, background: 0xe3f4ff, antialias: true }).then(() => {
document.getElementById('stage').appendChild(app.canvas);

function dropTex() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 26, 64, 64, 62);
  grad.addColorStop(0, '#3fa9f5');
  grad.addColorStop(0.72, '#3fa9f5');
  grad.addColorStop(1, 'rgba(63,169,245,0)');
  g.fillStyle = grad;
  g.beginPath();
  g.arc(64, 64, 62, 0, 7);
  g.fill();
  return Texture.from(c);
}
const tex = dropTex();

function makeDrops(container, ox, oy) {
  for (let i = 0; i < 14; i++) {
    const s = new Sprite(tex);
    s.anchor.set(0.5);
    s.position.set(ox + 60 + Math.random() * 140, oy + 120 + Math.random() * 160);
    s.scale.set(0.6);
    container.addChild(s);
  }
}

const THRESHOLD = [0, 0, 0, 0, 0.247, 0, 0, 0, 0, 0.663, 0, 0, 0, 0, 0.961, 0, 0, 0, 12, -11];

function label(text, x, y) {
  const t = new Text({ text, style: { fontFamily: 'monospace', fontSize: 18, fill: 0x333333 } });
  t.position.set(x, y);
  app.stage.addChild(t);
}

const q1 = new Container(); makeDrops(q1, 20, 30); app.stage.addChild(q1);
label('1 raw', 20, 20);

const q2 = new Container(); makeDrops(q2, 420, 30);
q2.filters = [new BlurFilter({ strength: 8, quality: 2 })];
app.stage.addChild(q2);
label('2 blur', 420, 20);

const q3 = new Container(); makeDrops(q3, 20, 330);
const cm3 = new ColorMatrixFilter();
cm3.matrix = THRESHOLD.slice();
q3.filters = [new BlurFilter({ strength: 8, quality: 2 }), cm3];
app.stage.addChild(q3);
label('3 blur+cm (setter)', 20, 320);

const q4 = new Container(); makeDrops(q4, 420, 330);
const cm4 = new ColorMatrixFilter();
cm4.matrix = THRESHOLD.slice();
cm4.alpha = 1;
q4.filters = [new BlurFilter({ strength: 8, quality: 2 }), cm4];
app.stage.addChild(q4);
label('4 blur+cm alpha=1', 420, 320);

window.__wt = { app };
});
