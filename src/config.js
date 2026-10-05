// Дизайн-разрешение 9:16 — все координаты в этих единицах, canvas масштабируется CSS-ом
export const W = 750;
export const H = 1334;

export const FLOOR_TOP = 1250;
export const CLOUD_Y = 210;
export const CUP_W = 210;
export const CUP_H = 240;
export const CUP_Y = 1130; // центр кота-стакана

export const DROP_R = 7;
export const SPAWN_MS = 18;   // интервал появления капли
export const POUR_MS = 2600;  // длительность ливня
export const TARGET_DROPS = 42; // сколько капель нужно в стакане (щадящий баланс для рекламы)

export const DEBUG = new URLSearchParams(location.search).has('debug');

export const CLICK_TAG =
  (typeof window !== 'undefined' && window.clickTag) ||
  'https://play.google.com/store/apps';

export const COL = {
  bgTop: 0xe3f4ff,
  bgBottom: 0xfdffff,
  outline: 0x455a64,
  inkText: 0x37474f,
  water: 0x3fa9f5,
  waterDeep: 0x2e8fd8,
  cat: 0xffb74d,
  catDark: 0xf59b31,
  innerEar: 0xffd9a0,
  blush: 0xf48fb1,
  white: 0xffffff,
  accent: 0xff7043,
  accentDark: 0xe8582b,
  block: 0xaed6f7,
  ground: 0xdcebf7,
  groundLip: 0xc5ddf0,
  star: 0xffc94d,
  danger: 0xef5350,
};

export const LEVELS = [
  {
    name: 'LEVEL 1',
    cloudX: 240,
    cupX: 430,
    ink: 900,
    tutorial: true,
    obstacles: [],
  },
  {
    name: 'LEVEL 2',
    cloudX: 170,
    cupX: 560,
    ink: 1000,
    tutorial: false,
    obstacles: [{ x: 370, y: 600, w: 240, h: 70, r: 20 }],
  },
  {
    name: 'LEVEL 3',
    cloudX: 170,
    cupX: 560,
    ink: 950,
    tutorial: false,
    obstacles: [{ x: 375, y: 1075, w: 64, h: 350, r: 10 }],
  },
];

// Пунктирная кривая для руки-подсказки: старт слева от струи, чтобы капли
// попадали на «грань» линии, а не на её торец — тогда ручей стекает по линии
export function guideCurve(level) {
  return quadPoints(
    { x: level.cloudX - 50, y: 320 },
    { x: level.cloudX + 60, y: 540 },
    { x: level.cupX, y: 950 },
    34
  );
}

import { quadPoints } from './utils.js';
