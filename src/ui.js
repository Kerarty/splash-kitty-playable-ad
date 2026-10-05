// Весь интерфейс ad unit: HUD (уровень, чернила, рестарт), тизер, баннеры,
// end card с CTA и туториальная рука. Всё векторное, без ассетов.
import { Container, Graphics, Text } from 'pixi.js';
import { COL, W, H, CLICK_TAG } from './config.js';
import { tween, Ease, killTweensOf } from './tween.js';
import { burst, TEX, CONFETTI_TINTS, popIn } from './fx.js';
import { sfx } from './audio.js';

const FONT = 'Arial, Helvetica, sans-serif';

function label(text, size, opts = {}) {
  return new Text({
    text,
    style: {
      fontFamily: FONT,
      fontSize: size,
      fontWeight: opts.weight || '900',
      fill: opts.fill ?? COL.white,
      stroke: opts.stroke,
      letterSpacing: opts.ls ?? 1,
    },
  });
}

function makeLogo(scale = 1) {
  const c = new Container();
  const parts = [
    { text: 'SPLASH', y: -62, fill: COL.white, stroke: COL.accent, rot: -0.03 },
    { text: 'KITTY!', y: 62, fill: COL.white, stroke: COL.water, rot: 0.03 },
  ];
  for (const p of parts) {
    const shadow = label(p.text, 118, { fill: 0x0d2b45, stroke: { color: 0x0d2b45, width: 16, join: 'round' } });
    shadow.anchor.set(0.5);
    shadow.alpha = 0.18;
    shadow.position.set(7, p.y + 9);
    const t = label(p.text, 118, { fill: p.fill, stroke: { color: p.stroke, width: 16, join: 'round' } });
    t.anchor.set(0.5);
    t.position.set(0, p.y);
    t.rotation = p.rot;
    c.addChild(shadow, t);
  }
  c.scale.set(scale);
  return c;
}

export class UI {
  constructor(cb) {
    this.cb = cb;
    this.t = 0;
    this.root = new Container();
    this.buildHud();
    this.buildTeaser();
    this.buildBanner();
    this.buildEndcard();
    this.buildTutorial();
  }

  buildHud() {
    const hud = new Container();
    this.hud = hud;
    this.root.addChild(hud);

    // чип уровня
    this.chip = new Container();
    const chipBg = new Graphics();
    chipBg.roundRect(-92, -27, 184, 54, 27).fill({ color: COL.white, alpha: 0.85 });
    this.chipText = label('LEVEL 1/3', 30, { fill: COL.inkText });
    this.chipText.anchor.set(0.5);
    this.chip.addChild(chipBg, this.chipText);
    this.chip.position.set(W / 2, 64);
    hud.addChild(this.chip);

    // чернила
    const ink = new Container();
    const pencil = new Graphics();
    pencil.roundRect(-14, -7, 26, 14, 4).fill({ color: COL.catDark });
    pencil.moveTo(12, -7);
    pencil.lineTo(22, 0);
    pencil.lineTo(12, 7);
    pencil.closePath();
    pencil.fill({ color: COL.inkText });
    ink.addChild(pencil);
    const track = new Graphics();
    track.roundRect(28, -8, 210, 16, 8).fill({ color: COL.white, alpha: 0.75 });
    ink.addChild(track);
    this.inkFill = new Graphics();
    ink.addChild(this.inkFill);
    ink.position.set(34, 64);
    hud.addChild(ink);

    // рестарт
    this.restartBtn = new Container();
    const rBg = new Graphics();
    rBg.circle(0, 0, 32).fill({ color: COL.white, alpha: 0.9 });
    rBg.arc(0, 0, 15, 0.6, 5.2).stroke({ width: 7, color: COL.inkText, cap: 'round' });
    rBg.moveTo(10, -18);
    rBg.lineTo(20, -8);
    rBg.lineTo(6, -4);
    rBg.closePath();
    rBg.fill({ color: COL.inkText });
    this.restartBtn.addChild(rBg);
    this.restartBtn.position.set(W - 58, 64);
    this.restartBtn.eventMode = 'static';
    this.restartBtn.cursor = 'pointer';
    this.restartBtn.on('pointertap', (e) => {
      e.stopPropagation();
      sfx.pop();
      this.cb.onRestart();
    });
    hud.addChild(this.restartBtn);
  }

  setLevel(n, total) {
    this.chipText.text = `LEVEL ${n}/${total}`;
    popIn(this.chip, 0.6, 400);
  }

  setInk(ratio) {
    const r = Math.max(0, Math.min(1, ratio));
    this.inkFill.clear();
    if (r > 0.01) {
      this.inkFill
        .roundRect(28, -8, 210 * r, 16, 8)
        .fill({ color: r < 0.25 ? COL.danger : COL.accent });
    }
  }

  buildTeaser() {
    const t = new Container();
    this.teaser = t;
    const dim = new Graphics();
    dim.rect(0, 0, W, H).fill({ color: 0x0d2b45, alpha: 0.16 });
    t.addChild(dim);
    this.logo = makeLogo(1);
    this.logo.position.set(W / 2, 430);
    t.addChild(this.logo);
    this.tapText = label('TAP TO PLAY', 48, { stroke: { color: COL.inkText, width: 10, join: 'round' } });
    this.tapText.anchor.set(0.5);
    this.tapText.position.set(W / 2, 800);
    t.addChild(this.tapText);
    const note = label('playable ad · demo', 26, { weight: '600', fill: 0x37474f });
    note.anchor.set(0.5);
    note.alpha = 0.55;
    note.position.set(W / 2, 1272);
    t.addChild(note);
    this.root.addChild(t);
  }

  hideTeaser() {
    killTweensOf(this.teaser);
    tween(this.teaser, { alpha: 0 }, { duration: 250, onDone: () => (this.teaser.visible = false) });
  }

  buildBanner() {
    this.banner = new Container();
    this.bannerBig = label('PURRFECT!', 96, { stroke: { color: COL.white, width: 12, join: 'round' } });
    this.bannerBig.anchor.set(0.5);
    this.bannerSub = label('', 36, { weight: '700', stroke: { color: COL.inkText, width: 8, join: 'round' } });
    this.bannerSub.anchor.set(0.5);
    this.bannerSub.position.set(0, 84);
    this.banner.addChild(this.bannerBig, this.bannerSub);
    this.banner.position.set(W / 2, 560);
    this.banner.visible = false;
    this.banner.alpha = 0;
    this.root.addChild(this.banner);
  }

  showBanner(big, sub, fill, stroke) {
    this.bannerBig.text = big;
    this.bannerBig.style.fill = fill;
    this.bannerBig.style.stroke = { color: stroke, width: 12, join: 'round' };
    this.bannerSub.text = sub;
    this.banner.visible = true;
    this.banner.alpha = 1;
    this.banner.scale.set(0.2);
    tween(this.banner.scale, { x: 1, y: 1 }, { duration: 480, ease: Ease.backOut });
  }

  hideBanner() {
    if (!this.banner.visible) return;
    tween(this.banner, { alpha: 0 }, { duration: 200, onDone: () => (this.banner.visible = false) });
  }

  buildEndcard() {
    const e = new Container();
    this.endcard = e;
    const dim = new Graphics();
    dim.rect(0, 0, W, H).fill({ color: 0x102a43, alpha: 0.8 });
    e.addChild(dim);

    const logo = makeLogo(0.72);
    logo.position.set(W / 2, 250);
    e.addChild(logo);

    this.stars = [];
    for (let i = 0; i < 5; i++) {
      const s = new Graphics();
      s.circle(0, 0, 0).fill({ color: 0xffffff });
      e.addChild(s);
      this.stars.push(s);
    }
    // звёзды рисуем текстурой-спрайтом для простоты: используем Graphics-путь
    e.removeChild(...this.stars);
    this.stars = [];
    for (let i = 0; i < 5; i++) {
      const g = new Graphics();
      const pts = [];
      for (let k = 0; k < 10; k++) {
        const r = k % 2 === 0 ? 26 : 11;
        const a = -Math.PI / 2 + (k * Math.PI) / 5;
        pts.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
      g.moveTo(pts[0][0], pts[0][1]);
      for (let k = 1; k < 10; k++) g.lineTo(pts[k][0], pts[k][1]);
      g.closePath();
      g.fill({ color: COL.star }).stroke({ width: 5, color: 0xf9a825, join: 'round' });
      g.position.set(W / 2 - 165 + i * 82, 400);
      g.rotation = (Math.random() - 0.5) * 0.15;
      e.addChild(g);
      this.stars.push(g);
    }

    const rating = label('4.8  ·  10M+ players', 34, { weight: '700' });
    rating.anchor.set(0.5);
    rating.position.set(W / 2, 470);
    e.addChild(rating);

    this.ctaBtn = new Container();
    const ctaShadow = new Graphics();
    ctaShadow.roundRect(-230, -52, 460, 120, 60).fill({ color: 0x000000, alpha: 0.3 });
    ctaShadow.position.set(0, 8);
    const ctaBg = new Graphics();
    ctaBg.roundRect(-230, -60, 460, 120, 60)
      .fill({ color: COL.accent })
      .stroke({ width: 6, color: COL.white, alpha: 0.9 });
    const ctaText = label('INSTALL NOW', 52);
    ctaText.anchor.set(0.5);
    this.ctaBtn.addChild(ctaShadow, ctaBg, ctaText);
    this.ctaBtn.position.set(W / 2, 660);
    this.ctaBtn.eventMode = 'static';
    this.ctaBtn.cursor = 'pointer';
    this.ctaBtn.on('pointertap', (e) => {
      e.stopPropagation();
      sfx.tap();
      tween(this.ctaBtn.scale, { x: 0.92, y: 0.92 }, { duration: 90, onDone: () => {
        tween(this.ctaBtn.scale, { x: 1, y: 1 }, { duration: 240, ease: Ease.backOut });
      }});
      burst(TEX.confetti, W / 2, 640, 22, { tints: CONFETTI_TINTS, spread: 10, vy0: -14, vy1: -6, g: 0.32, l0: 800, l1: 1400 });
      this.cb.onCTA();
    });
    e.addChild(this.ctaBtn);

    const freeLine = label('FREE  ·  No wifi needed', 27, { weight: '700', fill: 0xb0c4d4 });
    freeLine.anchor.set(0.5);
    freeLine.position.set(W / 2, 760);
    e.addChild(freeLine);

    // мини-CTA во время геймплея — как в реальных playable unit
    this.miniCta = new Container();
    const mBg = new Graphics();
    mBg.roundRect(-64, -22, 128, 44, 22).fill({ color: COL.accent, alpha: 0.95 });
    const mText = label('Install', 24, { weight: '800' });
    mText.anchor.set(0.5);
    this.miniCta.addChild(mBg, mText);
    this.miniCta.position.set(W - 84, 1288);
    this.miniCta.eventMode = 'static';
    this.miniCta.cursor = 'pointer';
    this.miniCta.on('pointertap', (e) => {
      e.stopPropagation();
      sfx.tap();
      this.cb.onCTA();
    });
    this.hud.addChild(this.miniCta);

    // реплей для демо
    const replay = new Container();
    const rBg = new Graphics();
    rBg.circle(0, 0, 34).fill({ color: COL.white, alpha: 0.22 });
    rBg.arc(0, 0, 15, 0.6, 5.2).stroke({ width: 6, color: COL.white, cap: 'round' });
    rBg.moveTo(10, -18);
    rBg.lineTo(20, -8);
    rBg.lineTo(6, -4);
    rBg.closePath();
    rBg.fill({ color: COL.white });
    replay.addChild(rBg);
    replay.position.set(70, 1240);
    replay.eventMode = 'static';
    replay.cursor = 'pointer';
    replay.alpha = 0.75;
    replay.on('pointertap', (ev) => {
      ev.stopPropagation();
      sfx.pop();
      this.cb.onReplay();
    });
    e.addChild(replay);

    e.visible = false;
    this.root.addChild(e);
  }

  showEnd() {
    this.endcard.visible = true;
    this.endcard.alpha = 0;
    tween(this.endcard, { alpha: 1 }, { duration: 350 });
    this.ctaBtn.scale.set(0.3);
    tween(this.ctaBtn.scale, { x: 1, y: 1 }, { duration: 620, delay: 250, ease: Ease.backOut });
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      s.scale.set(0);
      tween(s.scale, { x: 1, y: 1 }, { duration: 420, delay: 420 + i * 90, ease: Ease.backOut });
    }
  }

  hideEnd() {
    this.endcard.visible = false;
  }

  buildTutorial() {
    this.tutorial = new Container();
    this.tutorial.visible = false;
    this.guideG = new Graphics();
    this.tutorial.addChild(this.guideG);
    const hand = new Container();
    const hg = new Graphics();
    hg.circle(0, 0, 20).fill({ color: COL.white, alpha: 0.92 }).stroke({ width: 5, color: COL.outline });
    hg.roundRect(-8, -40, 16, 34, 8).fill({ color: COL.white }).stroke({ width: 5, color: COL.outline });
    hand.addChild(hg);
    hand.rotation = 0.45;
    this.hand = hand;
    this.tutorial.addChild(hand);
    this.root.addChild(this.tutorial);
    this.tutPts = null;
    this.tutT = 0;
  }

  showTutorial(pts) {
    this.tutPts = pts;
    this.tutT = 0;
    const g = this.guideG;
    g.clear();
    for (let i = 0; i < pts.length - 1; i += 2) {
      g.moveTo(pts[i].x, pts[i].y);
      g.lineTo(pts[i + 1].x, pts[i + 1].y);
    }
    g.stroke({ width: 9, color: COL.white, alpha: 0.95, cap: 'round' });
    this.tutorial.visible = true;
    this.tutorial.alpha = 1;
  }

  hideTutorial() {
    if (!this.tutorial.visible) return;
    this.tutPts = null;
    tween(this.tutorial, { alpha: 0 }, { duration: 200, onDone: () => (this.tutorial.visible = false) });
    this.guideG.clear();
  }

  update(dt) {
    this.t += dt;
    const time = this.t;
    if (this.teaser.visible) {
      this.logo.scale.y = 1 + Math.sin(time / 300) * 0.035;
      this.tapText.alpha = 0.65 + Math.sin(time / 260) * 0.35;
      this.tapText.scale.set(1 + Math.sin(time / 260) * 0.04);
    }
    if (this.endcard.visible) {
      const k = 1 + Math.sin(time / 300) * 0.045;
      this.ctaBtn.scale.set(this.ctaBtn.scale.x > 0.95 ? k : this.ctaBtn.scale.x);
    }
    if (this.tutorial.visible && this.tutPts) {
      this.tutT += dt;
      const n = this.tutPts.length;
      const period = n * 16;
      const p = this.tutT % (period * 2);
      const i = p < period ? Math.floor(p / 16) : Math.floor((period * 2 - p) / 16);
      const pt = this.tutPts[Math.max(0, Math.min(n - 1, i))];
      this.hand.position.set(pt.x, pt.y - 6);
    }
  }
}
