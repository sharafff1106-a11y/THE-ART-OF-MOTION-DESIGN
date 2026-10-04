// Inlines dist-single/ into one self-contained HTML file: motion-and-sound.html
import fs from 'node:fs';
import path from 'node:path';

const dir = 'dist-single';
const out = process.argv[2] ?? 'motion-and-sound.html';
let html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const assets = fs.readdirSync(path.join(dir, 'assets'));
const js = assets.filter((f) => f.endsWith('.js'));
const css = assets.filter((f) => f.endsWith('.css'));
html = html.replace(/<script type="module" crossorigin src="[^"]+"><\/script>\s*/g, '');
html = html.replace(/<link rel="stylesheet" crossorigin href="[^"]+">/g, '');
const styles = css.map((f) => `<style>${fs.readFileSync(path.join(dir, 'assets', f), 'utf8')}</style>`).join('');
const scripts = js
  .map((f) => `<script type="module">${fs.readFileSync(path.join(dir, 'assets', f), 'utf8').replace(/<\/script/g, '<\\/script')}</script>`)
  .join('');
// function replacers: the bundle contains `$&`-style sequences that string replacements would expand
html = html.replace('</head>', () => `${styles}</head>`).replace('</body>', () => `${scripts}</body>`);
fs.writeFileSync(out, html);
console.log(`wrote ${out} (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
