// Сборка мини-стенда воды: node tools/watertest.mjs
import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync } from 'fs';

await esbuild.build({
  entryPoints: ['tools/watertest-entry.js'],
  bundle: true,
  minify: false,
  format: 'iife',
  target: 'es2020',
  outfile: 'dist/watertest-bundle.js',
  logLevel: 'silent',
});
const js = readFileSync('dist/watertest-bundle.js', 'utf8');
const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#e3f4ff}#stage{width:100%;height:100dvh;display:flex;align-items:center;justify-content:center}</style></head><body><div id="stage"></div><script>${js}</script></body></html>`;
writeFileSync('dist/watertest.html', html);
console.log('dist/watertest.html ready');
