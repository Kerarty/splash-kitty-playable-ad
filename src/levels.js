// Сборка визуальной сцены уровня: фон, декор, препятствия, туча, кот-стакан.
import { Container, Graphics, Sprite } from 'pixi.js';
import { COL, W, H, FLOOR_TOP, CLOUD_Y } from './config.js';
import { rand } from './utils.js';
import { makeGradientTexture } from './utils.js';
import { CatCup } from './catcup.js';

let bgTex = null;

export class Cloud extends Container {
  constructor(baseX) {
    super();
    this.baseX = baseX;
    this.excite = 0;
    this.introY = 0; // въезд сверху на старте уровня
    this.t = rand(0, 3000);
    this.position.set(baseX, CLOUD_Y);

    const g = new Graphics();
    // мягкая тень снизу
    g.circle(-58, 12, 32).circle(0, 0, 46).circle(60, 12, 30).circle(18, 20, 28);
    g.fill({ color: 0xd6ecfa });
    g.circle(-58, 6, 32).circle(0, -8, 46).circle(60, 6, 30).circle(18, 14, 28);
    g.fill({ color: COL.white });
    // носик
    g.roundRect(-13, 34, 26, 24, 7).fill({ color: 0xb0bec5 });
    this.addChild(g);

    // лицо тучи: довольные закрытые глаза
    const f = new Graphics();
    f.arc(-20, -8, 9, Math.PI, 0).stroke({ width: 5, color: COL.outline, cap: 'round' });
    f.arc(20, -8, 9, Math.PI, 0).stroke({ width: 5, color: COL.outline, cap: 'round' });
    f.arc(0, 2, 7, 0.2, Math.PI - 0.2).stroke({ width: 5, color: COL.outline, cap: 'round' });
    f.circle(-44, 12, 9).fill({ color: COL.blush, alpha: 0.4 });
    f.circle(44, 12, 9).fill({ color: COL.blush, alpha: 0.4 });
    this.addChild(f);
  }

  update(dt) {
    this.t += dt;
    this.y = CLOUD_Y + Math.sin(this.t / 620) * 9 + this.introY;
    this.excite = Math.max(0, this.excite - dt);
    this.x = this.baseX + (this.excite > 0 ? Math.sin(this.t / 30) * 4 : 0);
  }
}

function decoCloud(x, y, s, alpha) {
  const g = new Graphics();
  g.circle(-34, 0, 22).circle(0, -8, 30).circle(36, 2, 20);
  g.fill({ color: COL.white, alpha });
  g.position.set(x, y);
  g.scale.set(s);
  return g;
}

export function buildScene(level, container) {
  // сначала снимаем детей, потом уничтожаем — иначе v8 может рендерить разрушенные объекты
  const removed = container.removeChildren();
  for (const c of removed) c.destroy({ children: true });
  container.removeChildren();

  if (!bgTex) bgTex = makeGradientTexture(COL.bgTop, COL.bgBottom);
  const bg = new Sprite(bgTex);
  bg.width = W;
  bg.height = H;
  container.addChild(bg);

  container.addChild(decoCloud(110, 130, 0.7, 0.75));
  container.addChild(decoCloud(640, 190, 0.55, 0.6));
  container.addChild(decoCloud(400, 90, 0.4, 0.5));

  // земля
  const ground = new Graphics();
  ground.rect(-40, FLOOR_TOP, W + 80, H - FLOOR_TOP + 40).fill({ color: COL.ground });
  ground.roundRect(-40, FLOOR_TOP - 12, W + 80, 26, 13).fill({ color: COL.groundLip });
  container.addChild(ground);

  // препятствия
  for (const o of level.obstacles) {
    const g = new Graphics();
    g.roundRect(-o.w / 2, -o.h / 2, o.w, o.h, o.r)
      .fill({ color: COL.block })
      .stroke({ width: 8, color: COL.outline, alpha: 0.85 });
    g.position.set(o.x, o.y);
    container.addChild(g);
  }

  const cloud = new Cloud(level.cloudX);
  container.addChild(cloud);

  const catcup = new CatCup();
  catcup.position.set(level.cupX, 1130);
  catcup.baseY = 1130;
  container.addChild(catcup);

  return { cloud, catcup };
}
