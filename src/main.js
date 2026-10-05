// Splash Kitty! — playable ad
// Bootstrap, state machine (TEASER → LEVEL_IN → DRAW → POUR → SETTLE → RESULT → END), game loop.
import { Application, Container, Graphics, Text, Rectangle } from 'pixi.js';
import {
  W, H, COL, LEVELS, SPAWN_MS, POUR_MS, TARGET_DROPS, DEBUG, CLICK_TAG, guideCurve,
} from './config.js';
import { PhysWorld, staticShapes, cupRect } from './physics.js';
import { WaterLayer } from './water.js';
import { buildScene } from './levels.js';
import { UI } from './ui.js';
import {
  initFxTextures, fxLayer, updateFx, shake, shakeOffset, slowMo, clock,
  burst, TEX, CONFETTI_TINTS, setConfettiRain,
} from './fx.js';
import { initAudio, sfx } from './audio.js';
import { updateTweens, tween, killTweensOf, Ease } from './tween.js';
import { chaikin } from './utils.js';

initFxTextures();

(async () => {
const app = new Application();
await app.init({
  width: W,
  height: H,
  background: COL.bgTop,
  antialias: true,
  resolution: Math.min(window.devicePixelRatio || 1, 2),
  autoDensity: false,
  powerPreference: 'high-performance',
});
document.getElementById('stage').appendChild(app.canvas);

function fitCanvas() {
  const s = Math.min(window.innerWidth / W, window.innerHeight / H);
  app.canvas.style.width = Math.floor(W * s) + 'px';
  app.canvas.style.height = Math.floor(H * s) + 'px';
}
fitCanvas();
window.addEventListener('resize', fitCanvas);
window.addEventListener('orientationchange', fitCanvas);

// ---------- слои ----------
const world = new Container(); // трясётся, UI — нет
app.stage.addChild(world);
const sceneL = new Container();
const waterL = new WaterLayer();
const strokeG = new Graphics();
world.addChild(sceneL, waterL, strokeG, fxLayer());

const phys = new PhysWorld();

// ---------- state machine ----------
let state = 'TEASER';
let currentLevel = 0;
let level = LEVELS[0];
let scene = null;
let drawing = false;
let strokePts = [];
let inkUsed = 0;
let pourT = 0, spawnAcc = 0, settleT = 0;
let physAcc = 0;

const timers = [];
const schedule = (fn, ms) => timers.push({ t: ms, fn });
function clearTimers() {
  timers.length = 0;
}

const ui = new UI({
  onRestart: () => {
    if (state !== 'TEASER' && state !== 'END') startLevel(currentLevel, true);
  },
  onCTA: () => openStore(),
  onReplay: () => {
    ui.hideEnd();
    setConfettiRain(false);
    startLevel(0, true);
  },
});
app.stage.addChild(ui.root);
ui.hud.visible = false;

// Живая сцена за тизером — первый экран уже красивый
scene = buildScene(LEVELS[0], sceneL);

// ---------- ввод ----------
let stat = { taps: 0, t0: performance.now() };

app.stage.eventMode = 'static';
app.stage.hitArea = new Rectangle(0, 0, W, H);

app.stage.on('pointerdown', (e) => {
  initAudio();
  stat.taps++;
  const p = e.global;
  if (state === 'TEASER') {
    sfx.tap();
    ui.hideTeaser();
    ui.hud.visible = true;
    startLevel(0, false);
  } else if (state === 'DRAW' && !drawing) {
    beginStroke(p);
  }
});
app.stage.on('pointermove', (e) => {
  if (state === 'DRAW' && drawing) addPoint(e.global);
});
const endPointer = () => {
  if (state === 'DRAW' && drawing) endStroke();
};
app.stage.on('pointerup', endPointer);
app.stage.on('pointerupoutside', endPointer);

function openStore() {
  try {
    if (window.mraid && typeof window.mraid.open === 'function') window.mraid.open(CLICK_TAG);
    else window.open(CLICK_TAG, '_blank');
  } catch (err) {
    /* в превью переходы могут блокироваться — это норма для демо */
  }
}

// ---------- state machine: переходы ----------

function startLevel(i, fast) {
  clearTimers();
  state = 'LEVEL_IN';
  currentLevel = i;
  level = LEVELS[i];
  drawing = false;
  strokePts = [];
  inkUsed = 0;
  pourT = 0;
  settleT = 0;
  physAcc = 0;
  phys.clearDrops();
  phys.clearStroke();
  phys.clearStatics();
  waterL.sync([]);
  strokeG.clear();
  setConfettiRain(false);
  scene = buildScene(level, sceneL);
  phys.addStatics(staticShapes(level));
  ui.hideBanner();
  ui.hideTutorial();
  ui.setLevel(i + 1, LEVELS.length);
  ui.setInk(1);
  scene.catcup.scale.set(0.2);
  tween(scene.catcup.scale, { x: 1, y: 1 }, { duration: fast ? 320 : 540, ease: Ease.backOut });
  scene.cloud.introY = -420;
  tween(scene.cloud, { introY: 0 }, { duration: fast ? 320 : 560, ease: Ease.backOut });
  schedule(() => {
    state = 'DRAW';
    if (level.tutorial) ui.showTutorial(guideCurve(level));
  }, fast ? 340 : 580);
}

function beginStroke(p) {
  ui.hideTutorial();
  drawing = true;
  strokePts = [{ x: p.x, y: p.y }];
  inkUsed = 0;
  sfx.drawStart();
}

function addPoint(p) {
  const last = strokePts[strokePts.length - 1];
  const d = Math.hypot(p.x - last.x, p.y - last.y);
  if (d < 7) return;
  strokePts.push({ x: p.x, y: p.y });
  inkUsed += d;
  ui.setInk(1 - inkUsed / level.ink);
  drawStrokePreview();
  if (inkUsed >= level.ink) endStroke();
}

function endStroke() {
  if (!drawing) return;
  drawing = false;
  sfx.drawStop();
  if (strokePts.length < 3) {
    strokePts = [];
    drawStrokePreview();
    return; // случайный тап — даём нарисовать заново
  }
  strokePts = chaikin(chaikin(strokePts));
  drawStrokePreview();
  phys.addStroke(strokePts);
  schedule(startPour, 280);
}

function drawStrokePreview() {
  const g = strokeG;
  g.clear();
  if (strokePts.length < 2) return;
  for (const [width, color, alpha] of [
    [28, COL.outline, 0.18],
    [20, 0xffffff, 0.96],
  ]) {
    g.moveTo(strokePts[0].x, strokePts[0].y);
    for (let i = 1; i < strokePts.length; i++) g.lineTo(strokePts[i].x, strokePts[i].y);
    g.stroke({ width, color, alpha, cap: 'round', join: 'round' });
  }
}

function startPour() {
  if (state !== 'DRAW') return;
  state = 'POUR';
  pourT = 0;
  spawnAcc = 0;
  scene.cloud.excite = 1e9;
  sfx.pourStart();
}

function updatePour(dt) {
  pourT += dt;
  spawnAcc += dt;
  while (spawnAcc >= SPAWN_MS && pourT < POUR_MS) {
    spawnAcc -= SPAWN_MS;
    phys.spawnDrop(level.cloudX + Math.random() * 4 - 2, 300 + Math.random() * 14);
    spawnedCount++;
  }
  if (pourT >= POUR_MS) {
    state = 'SETTLE';
    settleT = 0;
    scene.cloud.excite = 0;
    sfx.pourStop();
  }
}

function updateSettle(dt) {
  settleT += dt;
  // досрочная победа: как только капель достаточно — празднуем, без ожидания оседания
  if (phys.countInside(cupRect(level)) >= TARGET_DROPS) {
    evaluate();
    return;
  }
  const calm = phys.avgSpeed() < 1.3;
  if ((calm && settleT > 600) || settleT > 3800) evaluate();
}

let lastResult = null;

function evaluate() {
  state = 'RESULT';
  const inside = phys.countInside(cupRect(level));
  lastResult = { inside, target: TARGET_DROPS, win: inside >= TARGET_DROPS };
  if (inside >= TARGET_DROPS) win();
  else fail();
}

const WIN_SUBS = ['Котик доволен!', 'Отличная работа!', 'Брызги восторга!'];

function win() {
  sfx.win();
  slowMo();
  scene.catcup.setMood('happy');
  scene.catcup.happyBounce();
  burst(TEX.confetti, level.cupX, 990, 26, { tints: CONFETTI_TINTS, spread: 9, vy0: -13, vy1: -5, g: 0.3, l0: 900, l1: 1500 });
  burst(TEX.star, level.cupX, 960, 8, { tint: COL.star, spread: 7, vy0: -11, vy1: -5, g: 0.25, l0: 800, l1: 1300 });
  burst(TEX.heart, level.cupX, 1050, 6, { tint: 0xf06292, spread: 4, vy0: -6, vy1: -3, g: -0.01, l0: 900, l1: 1300, sway: 1.2 });
  shake(5, 260);
  if (currentLevel + 1 >= LEVELS.length) {
    ui.showBanner('ПУРФЕКТ!', 'У тебя получилось!', COL.star, COL.accentDark);
    schedule(showEnd, 1600);
  } else {
    ui.showBanner('ПУРФЕКТ!', WIN_SUBS[currentLevel], COL.star, COL.accentDark);
    schedule(() => startLevel(currentLevel + 1, false), 1600);
  }
}

function fail() {
  sfx.fail();
  scene.catcup.setMood('sad');
  shake(6, 300);
  ui.showBanner('ПОЧТИ!', 'Попробуй ещё!', COL.white, COL.danger);
  schedule(() => startLevel(currentLevel, true), 1600);
}

function showEnd() {
  state = 'END';
  ui.hideBanner();
  ui.hud.visible = false;
  ui.showEnd();
  setConfettiRain(true);
  sfx.win();
}

// капля ударилась о что-то
let plinkCd = 0;
phys.onDropHit = (drop, other, point) => {
  if (plinkCd <= 0 && other.label !== 'drop') {
    sfx.plink();
    plinkCd = 90;
  }
  if (other.label.startsWith('cup')) {
    scene && scene.catcup.splash();
    if (Math.abs(drop.velocity.y) > 2.5) {
      burst(TEX.dot, point.x, point.y, 3, {
        tint: COL.water, spread: 3.5, vy0: -5, vy1: -2, g: 0.4, s0: 0.3, s1: 0.55, l0: 260, l1: 420,
      });
    }
  }
};

// ---------- главный цикл ----------
let fpsEma = 60;
let insideTimer = 0;

app.ticker.add((ticker) => {
  const dt = Math.min(50, ticker.deltaMS);
  lastDt = dt;
  fpsEma = fpsEma * 0.95 + (1000 / Math.max(1, ticker.deltaMS)) * 0.05;
  plinkCd -= dt;

  updateTweens(dt);
  updateFx(dt);
  ui.update(dt);
  if (scene) {
    scene.cloud.update(dt);
    scene.catcup.update(dt);
  }
  const off = shakeOffset();
  world.position.set(off.x, off.y);

  for (let i = timers.length - 1; i >= 0; i--) {
    timers[i].t -= dt;
    if (timers[i].t <= 0) {
      const fn = timers[i].fn;
      timers.splice(i, 1);
      fn();
    }
  }

  if (state === 'POUR' || state === 'SETTLE' || state === 'RESULT') {
    physAcc += dt * clock.scale;
    let steps = 0;
    while (physAcc >= 16.666 && steps < 4) {
      phys.step(16.666);
      physAcc -= 16.666;
      steps++;
    }
    waterL.sync(phys.drops, cupRect(level));
  }

  if (state === 'POUR') updatePour(dt);
  else if (state === 'SETTLE') updateSettle(dt);

  insideTimer -= dt;
  if (insideTimer <= 0 && scene && (state === 'POUR' || state === 'SETTLE')) {
    insideTimer = 120;
    const inside = phys.countInside(cupRect(level));
    scene.catcup.setFill(inside / TARGET_DROPS);
    scene.catcup.setMood(inside < 8 ? 'worried' : 'idle');
  }

  if (DEBUG) {
    debugText.text = `${fpsEma.toFixed(0)} fps · drops ${phys.drops.length} · ${state} · taps ${stat.taps}`;
  }
});

let debugText = null;
if (DEBUG) {
  debugText = new Text({
    text: '',
    style: { fontFamily: 'monospace', fontSize: 22, fill: 0x37474f },
  });
  debugText.position.set(12, 110);
  app.stage.addChild(debugText);
}

// метрики сессии — удобно для README/проверки
let lastDt = 0;
let spawnedCount = 0;
window.__splashKitty = {
  get stats() {
    return { taps: stat.taps, seconds: ((performance.now() - stat.t0) / 1000).toFixed(1) };
  },
  get debug() {
    return { level: currentLevel + 1, state, drops: phys.drops.length, spawned: spawnedCount, pourT: Math.round(pourT), drawing, pts: strokePts.length, ink: Math.round(inkUsed), result: lastResult, dt: lastDt.toFixed(1), fps: fpsEma.toFixed(0) };
  },
  // Ручная прокрутка кадров — для автотестов: тикер на время останавливается,
  // чтобы живой rAF не вмешивался в шаг времени
  pump(n = 1, step = 16.666) {
    app.ticker.stop();
    let t = performance.now();
    for (let i = 0; i < n; i++) {
      t += step;
      app.ticker.update(t);
    }
    app.ticker.start();
    return `pumped ${n} frames (${(n * step / 1000).toFixed(2)}s game time)`;
  },
};
})();
