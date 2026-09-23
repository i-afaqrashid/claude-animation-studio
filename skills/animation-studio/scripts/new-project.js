#!/usr/bin/env node
// Scaffold a new film project: copies the engine + a starting point into <target>.
//   node <skill>/scripts/new-project.js <target-dir>                       -> starter template (23s demo film)
//   node <skill>/scripts/new-project.js <target-dir> --format 9:16          -> the template, laid out vertically (also 1:1, 4:5)
//   node <skill>/scripts/new-project.js <target-dir> --from app-promo      -> a 9:16 app promo built with the UI kit
//   node <skill>/scripts/new-project.js <target-dir> --from world-cup-2026 -> re-render/remix the 58s reference film (older API)
// The engine is vendored (copied) so each film keeps working even if the skill is updated later.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const SKILL = path.join(__dirname, '..');
const args = process.argv.slice(2);
const valueOf = (flag) => (args.indexOf(flag) >= 0 ? args[args.indexOf(flag) + 1] : null);
const target = args.find((a, i) => !a.startsWith('--') && !['--from', '--format'].includes(args[i - 1]));
const from = valueOf('--from');
const format = valueOf('--format');
const FORMATS = ['16:9', '9:16', '1:1', '4:5'];

if (!target) {
  console.log('usage: node new-project.js <target-dir> [--format 16:9|9:16|1:1|4:5] [--from app-promo|world-cup-2026]');
  process.exit(1);
}
if (format && !FORMATS.includes(format)) {
  console.error(`unknown format ${format}: use ${FORMATS.join(', ')}`);
  process.exit(1);
}
const dest = path.resolve(target);
if (fs.existsSync(dest) && fs.readdirSync(dest).length > 0) {
  console.error(`refusing to overwrite non-empty directory: ${dest}`);
  process.exit(1);
}
const src = from ? path.join(SKILL, 'examples', from) : path.join(SKILL, 'template');
if (!fs.existsSync(src)) {
  console.error(`unknown starting point: ${from}. available: ${fs.readdirSync(path.join(SKILL, 'examples')).join(', ')}`);
  process.exit(1);
}

fs.mkdirSync(dest, { recursive: true });
fs.cpSync(src, dest, { recursive: true });
fs.cpSync(path.join(SKILL, 'engine'), path.join(dest, 'engine'), { recursive: true });
fs.writeFileSync(path.join(dest, '.gitignore'), 'out/\n');
if (format) {
  const sp = path.join(dest, 'score.js');
  const score = fs.readFileSync(sp, 'utf8');
  if (!/const FORMAT = '[^']*';/.test(score)) console.log(`note: this starting point has a fixed layout; --format ${format} was not applied`);
  else fs.writeFileSync(sp, score.replace(/const FORMAT = '[^']*';/, `const FORMAT = '${format}';`));
}

// preflight: tell the user what is missing instead of failing later
const checks = [];
const has = (bin, argv = ['-version']) => { try { execFileSync(bin, argv, { stdio: 'ignore' }); return true; } catch (e) { return false; } };
const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
checks.push([nodeMajor >= 22, `Node ${process.versions.node} (need 22+ for the built-in WebSocket)`]);
checks.push([has('ffmpeg'), 'ffmpeg on PATH']);
const chromes = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'];
const chrome = process.env.CHROME_PATH || chromes.find((p) => fs.existsSync(p)) || ['google-chrome', 'chromium', 'chromium-browser'].find((b) => has('which', [b]));
checks.push([!!chrome, `Chrome/Chromium (${chrome || 'not found — set CHROME_PATH'})`]);

console.log(`created ${dest}${from ? ` from example "${from}"` : ' from the starter template'}${format ? ` (${format})` : ''}`);
for (const [ok, label] of checks) console.log(`  ${ok ? '✓' : '✗'} ${label}`);
if (checks.some(([ok]) => !ok)) process.exitCode = 2; // scaffolded, but something needed for rendering is missing
console.log(`
next:
  cd ${path.relative(process.cwd(), dest) || '.'}
  node song.js                       # music  -> out/music.wav
  node engine/render.js board        # labelled storyboard of the named moments -> out/board.png
  node engine/render.js video        # all frames -> out/video.mp4
  node engine/render.js mux          # final film with sound -> out/<folder-name>.mp4
  node engine/render.js check        # review sheet + loudness of the final file
  node engine/render.js verify       # sound + picture measured at every sync marker`);
