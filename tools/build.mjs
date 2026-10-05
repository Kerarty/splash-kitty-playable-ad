// Сборка: esbuild бандлит src/main.js и инлайнит в один index.html.
// Отчёт: размер raw и gzip (лимит Google Ads — 5 МБ).
import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { gzipSync } from 'zlib';

mkdirSync('dist', { recursive: true });

await esbuild.build({
  entryPoints: ['src/main.js'],
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2020',
  outfile: 'dist/bundle.js',
  logLevel: 'info',
});

const js = readFileSync('dist/bundle.js', 'utf8').replace(/<\/script/gi, '<\\/script');
const html = readFileSync('tools/template.html', 'utf8').replace('<!--BUNDLE-->', () => js);
writeFileSync('dist/index.html', html);

const demo = readFileSync('tools/demo.template.html', 'utf8');
writeFileSync('dist/demo.html', demo);

const gz = gzipSync(Buffer.from(html)).length;
console.log(`dist/index.html: ${(html.length / 1024).toFixed(0)} KB raw · ${(gz / 1024).toFixed(0)} KB gzip`);
