#!/usr/bin/env node
// End-to-end smoke test for the engine. Builds a throwaway 7s film in a temp folder and checks:
//   1. music (true peak under -1 dBTP) + parallel render + mux + check succeed (frames, streams, duration verified)
//   2. named markers: bad times fail fast, board + clip (with sound) work, verify passes on the real film
//      and FAILS when a marker is 100 ms off
//   3. an ffmpeg that crashes mid-stream makes the render FAIL cleanly (no hang, no leftover Chrome)
//   4. a second render in the same project folder is refused while the first one still succeeds
//   5. formats: --format 9:16 renders 1080x1920 frames; the app-promo example (UI kit) scores and draws
//   6. preview (headless self-test), cast sheet, clip --gif, an exact LUFS target, the Math.random warning
//   7. v0.6 tools: draft stills, qa, plan, poster, srt, pacing, a forbidden brand claim, formats (9:16 draft)
// Usage: node <skill>/scripts/smoke-test.js        (takes ~2–4 minutes; needs Node 22+, ffmpeg, Chrome)
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync, execFileSync } = require('child_process');

const SKILL = path.join(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'anim-smoke-'));
const proj = path.join(tmp, 'smoke-film');
const results = [];
const pass = (name, ok, detail = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };

// Renderer Chrome processes use temp profiles named anim-chrome-*. A LEFTOVER is one whose parent died
// (re-parented to PID 1); Chrome belonging to another live render (e.g. another session) keeps a live parent.
function chromePids() {
  const r = spawnSync('pgrep', ['-f', 'anim-chrome-'], { encoding: 'utf8' });
  const pids = (r.stdout || '').split('\n').filter(Boolean).map(Number);
  return new Set(pids.filter((pid) => {
    const pp = spawnSync('ps', ['-o', 'ppid=', '-p', String(pid)], { encoding: 'utf8' }).stdout.trim();
    return pp === '1';
  }));
}
function run(args, { env = {}, timeout = 600000 } = {}) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, args, { cwd: proj, env: { ...process.env, ...env }, encoding: 'utf8', timeout });
  return { code: r.status, timedOut: r.error && r.error.code === 'ETIMEDOUT', out: (r.stdout || '') + (r.stderr || ''), secs: (Date.now() - t0) / 1000 };
}
const probe = (file) => JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type', '-of', 'json', file]).toString());

(async () => {
  console.log(`smoke test in ${tmp}`);
  const scaffold = spawnSync(process.execPath, [path.join(SKILL, 'scripts', 'new-project.js'), proj], { encoding: 'utf8' });
  pass('scaffold from template', scaffold.status === 0, scaffold.status === 0 ? '' : scaffold.stdout + scaffold.stderr);
  // shorten the film: 7s keeps the test quick; the @land sync marker (4.5s) sits before the 1.6s fade-out
  const scorePath = path.join(proj, 'score.js');
  fs.writeFileSync(scorePath, fs.readFileSync(scorePath, 'utf8').replace(/const DURATION = [^;]+;/, 'const DURATION = T(2) + 2.5; // smoke test'));
  const { DURATION, FPS } = require(scorePath);
  const frames = Math.round(DURATION * FPS);

  // 1. happy path
  const song = run(['song.js']);
  pass('song.js writes out/music.wav', song.code === 0 && fs.existsSync(path.join(proj, 'out', 'music.wav')), song.code ? song.out.slice(-300) : '');
  const tp = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', path.join(proj, 'out', 'music.wav'), '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
  const peak = parseFloat((/Peak:\s+(-?[\d.]+|-inf)/.exec(tp.stderr.slice(tp.stderr.lastIndexOf('Summary:'))) || [])[1]);
  pass('master limiter keeps the true peak under -1 dBTP', peak <= -1.0, `${peak} dBTP`);
  const before = chromePids();
  const vid = run(['engine/render.js', 'video', '2']);
  pass('render video (2 workers)', vid.code === 0 && vid.out.includes(`(${frames} frames verified)`), vid.code ? vid.out.slice(-400) : `${vid.secs.toFixed(0)}s`);
  const mux = run(['engine/render.js', 'mux']);
  const final = path.join(proj, 'out', 'smoke-film.mp4');
  let muxOk = mux.code === 0 && fs.existsSync(final);
  if (muxOk) { const p = probe(final); const types = p.streams.map((x) => x.codec_type); muxOk = types.includes('video') && types.includes('audio') && Math.abs(parseFloat(p.format.duration) - DURATION) < 2 / FPS; }
  pass('mux → final MP4 has video + audio at the right duration', muxOk, mux.code ? mux.out.slice(-300) : '');
  const check = run(['engine/render.js', 'check']);
  pass('check → contact sheet + loudness', check.code === 0 && /I:\s+-?\d/.test(check.out) && fs.existsSync(path.join(proj, 'out', 'check-sheet.png')));
  const leftover1 = [...chromePids()].filter((p) => !before.has(p));
  pass('no Chrome processes left after a successful render', leftover1.length === 0, leftover1.length ? `leftover pids ${leftover1.join(',')}` : '');

  // 2. named markers, board, clip, verify
  const badT = run(['engine/render.js', 'stills', '@nope'], { timeout: 30000 });
  pass('an unknown @marker fails fast with a clear message', badT.code !== 0 && /unknown marker @nope/.test(badT.out) && badT.secs < 10, `exit ${badT.code} in ${badT.secs.toFixed(1)}s`);
  const board = run(['engine/render.js', 'board']);
  pass('board → labelled storyboard of the markers', board.code === 0 && fs.existsSync(path.join(proj, 'out', 'board.png')), board.code ? board.out.slice(-300) : '');
  const clip = run(['engine/render.js', 'clip', '@land-0.5', '@land+0.5', '2', '--gif']);
  const clipFile = path.join(proj, 'out', 'clip_4.00-5.00.mp4');
  let clipOk = clip.code === 0 && fs.existsSync(clipFile) && fs.existsSync(clipFile.replace(/\.mp4$/, '.gif'));
  if (clipOk) { const p = probe(clipFile); clipOk = p.streams.some((x) => x.codec_type === 'audio') && Math.abs(parseFloat(p.format.duration) - 1) < 2 / FPS; }
  pass('clip @land-0.5 @land+0.5 --gif → 1s preview with sound + a GIF', clipOk, clip.code ? clip.out.slice(-300) : '');
  const ver = run(['engine/render.js', 'verify']);
  pass('verify: sound and picture hit @land', ver.code === 0 && /land .*✓.*✓/.test(ver.out) && /✓ in sync/.test(ver.out), ver.out.split('\n').filter((l) => /land|sync/.test(l)).join(' | '));
  // two equally strong clicks 100 ms apart around @land: verify must call it unclear (a fail), not pick one
  const clicks = spawnSync(process.execPath, ['-e', `const {Bus,SR}=require('./engine/audio/dsp');const MIX=require('./engine/audio/mix');const b=new Bus(Math.ceil(${DURATION}*SR));for(const t of [4.4,4.5])for(let i=0;i<480;i++){const v=0.8*Math.exp(-i/120)*(i%2?1:-1);b.L[Math.round(t*SR)+i]+=v;b.R[Math.round(t*SR)+i]+=v;}MIX.writeWav('out/clicks.wav',b)`], { cwd: proj, encoding: 'utf8' });
  const amb = path.join(proj, 'out', 'ambiguous.mp4');
  spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', final, '-i', path.join(proj, 'out', 'clicks.wav'), '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', amb]);
  const va = run(['engine/render.js', 'verify', 'ambiguous']);
  const vb = run(['engine/render.js', 'verify', 'ambiguous', '--allow-unclear']);
  pass('verify calls two equal onsets unclear (fails, passes only with --allow-unclear)', clicks.status === 0 && va.code === 1 && /two onsets are almost equally steep/.test(va.out) && vb.code === 0, `exit ${va.code} / ${vb.code}`);
  const goodScore = fs.readFileSync(scorePath, 'utf8');
  fs.writeFileSync(scorePath, goodScore.replace("land: { t: ev.claudeLand, sync: 'av' }", "land: { t: ev.claudeLand + 0.1, sync: 'av' }"));
  const ver2 = run(['engine/render.js', 'verify']);
  fs.writeFileSync(scorePath, goodScore);
  pass('verify FAILS when a marker is 100 ms off', ver2.code === 1 && /✗/.test(ver2.out), `exit ${ver2.code}`);

  // 3. ffmpeg crashes mid-stream (after ~300 KB of PNG data): must fail fast, not hang
  const fake = path.join(tmp, 'crashing-ffmpeg.sh');
  fs.writeFileSync(fake, '#!/bin/sh\nhead -c 300000 > /dev/null\nexit 3\n', { mode: 0o755 });
  const before2 = chromePids();
  const crash = run(['engine/render.js', 'video', '2'], { env: { FFMPEG_PATH: fake }, timeout: 120000 });
  pass('crashing ffmpeg → render fails (no hang)', !crash.timedOut && crash.code !== 0 && /ffmpeg failed/.test(crash.out), crash.timedOut ? 'TIMED OUT (hang)' : `exit ${crash.code} in ${crash.secs.toFixed(1)}s`);
  await new Promise((r) => setTimeout(r, 1000));
  const leftover2 = [...chromePids()].filter((p) => !before2.has(p));
  pass('no Chrome processes left after a failed render', leftover2.length === 0, leftover2.length ? `leftover pids ${leftover2.join(',')}` : '');
  pass('failed render did not replace the good out/video.mp4', probe(path.join(proj, 'out', 'video.mp4')).streams.length === 1);

  // 4. two renders in the same folder: the second is refused, the first still succeeds
  const first = spawn(process.execPath, ['engine/render.js', 'video', '2'], { cwd: proj });
  let firstOut = '';
  first.stdout.on('data', (d) => (firstOut += d));
  first.stderr.on('data', (d) => (firstOut += d));
  const lock = path.join(proj, 'out', '.render.lock');
  for (let i = 0; i < 100 && !fs.existsSync(lock); i++) await new Promise((r) => setTimeout(r, 100));
  const second = run(['engine/render.js', 'video', '2'], { timeout: 60000 });
  pass('second render in the same folder is refused', second.code !== 0 && /already running in this project folder/.test(second.out), `exit ${second.code}`);
  const firstCode = await new Promise((r) => first.on('close', r));
  pass('first render still completes', firstCode === 0 && firstOut.includes(`(${frames} frames verified)`), firstCode ? firstOut.slice(-300) : '');
  pass('lock file removed afterwards', !fs.existsSync(lock));

  // 5. formats + the UI kit example
  const pngSize = (f) => { const b = fs.readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
  const vert = path.join(tmp, 'vertical-film');
  const sv = spawnSync(process.execPath, [path.join(SKILL, 'scripts', 'new-project.js'), vert, '--format', '9:16'], { encoding: 'utf8' });
  const st = sv.status === 0 && spawnSync(process.execPath, ['engine/render.js', 'stills', '@land'], { cwd: vert, encoding: 'utf8' });
  const vf = path.join(vert, 'out', 'stills', 't_004.50.png');
  const vsize = fs.existsSync(vf) ? pngSize(vf) : [];
  pass('--format 9:16 → 1080x1920 frames', vsize[0] === 1080 && vsize[1] === 1920 && !/EXCEPTION/.test((st && st.stdout + st.stderr) || ''), vsize.join('x') || (st ? st.stdout + st.stderr : sv.stdout + sv.stderr).slice(-300));
  const promo = path.join(tmp, 'promo-film');
  const sp = spawnSync(process.execPath, [path.join(SKILL, 'scripts', 'new-project.js'), promo, '--from', 'app-promo'], { encoding: 'utf8' });
  const ps = sp.status === 0 && spawnSync(process.execPath, ['song.js'], { cwd: promo, encoding: 'utf8' });
  const pb = ps && ps.status === 0 && spawnSync(process.execPath, ['engine/render.js', 'board'], { cwd: promo, encoding: 'utf8' });
  const pbOut = pb ? pb.stdout + pb.stderr : '';
  pass('app-promo example: music + storyboard of every marker (UI kit, 9:16)', !!pb && pb.status === 0 && /board written: out\/board\.png \(9 frames\)/.test(pbOut) && !/EXCEPTION/.test(pbOut), pbOut.slice(-300) || (ps ? ps.stdout + ps.stderr : sp.stdout + sp.stderr).slice(-300));

  // 6. preview, cast, LUFS target, determinism warning (on the first smoke film)
  const pv = run(['engine/render.js', 'preview', '@land', '--check'], { timeout: 120000 });
  const pvState = /preview OK: (\{.*\})/.exec(pv.out);
  const pvj = pvState ? JSON.parse(pvState[1]) : {};
  pass('preview --check: the player decodes the music and draws the film', pv.code === 0 && pvj.film === true && Math.abs(pvj.audio - DURATION) < 0.05 && fs.existsSync(path.join(proj, 'out', 'preview.png')), pv.code ? pv.out.slice(-300) : JSON.stringify(pvj));
  const cast = run(['engine/render.js', 'cast']);
  pass('cast → audition sheet of the characters', cast.code === 0 && fs.existsSync(path.join(proj, 'out', 'cast.png')), cast.code ? cast.out.slice(-300) : '');
  const loud = run(['song.js'], { env: { LUFS: '-14' } });
  const lm = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', path.join(proj, 'out', 'music.wav'), '-af', 'ebur128', '-f', 'null', '-'], { encoding: 'utf8' });
  const li = parseFloat((/I:\s+(-?[\d.]+) LUFS/.exec(lm.stderr.slice(lm.stderr.lastIndexOf('Summary:'))) || [])[1]);
  pass('LUFS=-14 node song.js lands at -14 LUFS (measured by ffmpeg)', loud.code === 0 && Math.abs(li + 14) <= 0.3, `${li} LUFS`);
  const filmPath = path.join(proj, 'film.js'), goodFilm = fs.readFileSync(filmPath, 'utf8');
  fs.writeFileSync(filmPath, goodFilm.replace('draw(ctx, t) {', 'draw(ctx, t) {\n      const jitter = Math.random();'));
  const lint = run(['engine/render.js', 'stills', '1']);
  fs.writeFileSync(filmPath, goodFilm);
  pass('a film using Math.random() gets a determinism warning', /frames must be a pure function of t/.test(lint.out) && /film\.js:\d+/.test(lint.out), lint.out.slice(0, 200));

  // 7. v0.6 tools (on the first smoke film)
  const dr = run(['engine/render.js', 'stills', '2', '--draft']);
  const dsz = fs.existsSync(path.join(proj, 'out', 'stills', 't_002.00.png')) ? pngSize(path.join(proj, 'out', 'stills', 't_002.00.png')) : [];
  pass('--draft stills render at half size (960x540)', dr.code === 0 && dsz[0] === 960 && dsz[1] === 540, dsz.join('x'));
  const q = run(['engine/render.js', 'qa', '@land', '2']);
  pass('qa probes the text in the sampled frames', q.code === 0 && /visual QA: 2 frames/.test(q.out), q.out.split('\n')[0]);
  const pl = run(['engine/render.js', 'plan']);
  const planMd = path.join(proj, 'out', 'plan.md');
  pass('plan → out/plan.md with a bar map and a claims checklist', pl.code === 0 && fs.existsSync(planMd) && /## Bar map/.test(fs.readFileSync(planMd, 'utf8')) && /- \[ \] "a tiny film, made of code\."/.test(fs.readFileSync(planMd, 'utf8')), pl.out.split('\n')[0]);
  const po = run(['engine/render.js', 'poster', '--title', 'Every star is a note']);
  const p1 = path.join(proj, 'out', 'poster-1.png');
  const psz = fs.existsSync(p1) ? pngSize(p1) : [];
  pass('poster → three 1280x720 thumbnails', po.code === 0 && psz[0] === 1280 && psz[1] === 720 && fs.existsSync(path.join(proj, 'out', 'poster-3.png')), psz.join('x') || po.out.slice(-200));
  const sr = run(['engine/render.js', 'srt']);
  const srtF = path.join(proj, 'out', 'smoke-film.srt');
  pass('srt → subtitle file from the captions', sr.code === 0 && fs.existsSync(srtF) && /-->/.test(fs.readFileSync(srtF, 'utf8')), sr.out.split('\n')[0]);
  const pc = run(['engine/render.js', 'pacing']);
  pass('pacing measures the hook and the cuts', pc.code === 0 && /first movement/.test(pc.out) && fs.existsSync(path.join(proj, 'out', 'pacing.svg')), pc.out.split('\n')[0]);
  fs.writeFileSync(path.join(proj, 'brand.json'), JSON.stringify({ name: 'Smoke', colors: { primary: '#E0703E' }, claims: { forbidden: ['tiny film'] } }));
  const bl = run(['engine/render.js', 'stills', '1']);
  fs.rmSync(path.join(proj, 'brand.json'));
  pass('a film saying a forbidden brand claim gets a warning', /brand\.json forbids/.test(bl.out) && /tiny film/.test(bl.out), bl.out.slice(0, 160));
  const fm = run(['engine/render.js', 'formats', '9:16', '2', '--draft']);
  const fmF = path.join(proj, 'out', 'smoke-film-9x16-draft.mp4');
  let fmOk = fm.code === 0 && fs.existsSync(fmF);
  if (fmOk) { const pr = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height', '-of', 'json', fmF]).toString()); fmOk = pr.streams[0].width === 540 && pr.streams[0].height === 960; }
  pass('formats 9:16 --draft → a vertical 540x960 film from the same score', fmOk, fm.code ? fm.out.slice(-300) : '');

  // 8. v0.7: song analysis, voiceover (the silent engine works everywhere; `say` when on a Mac)
  run(['song.js']);
  const an = run(['engine/render.js', 'analyze', 'out/music.wav']);
  let anOk = an.code === 0 && fs.existsSync(path.join(proj, 'beats.js')) && fs.existsSync(path.join(proj, 'out', 'analysis.svg'));
  let anDetail = an.code ? an.out.slice(-300) : '';
  if (anOk) {
    const A = JSON.parse(fs.readFileSync(path.join(proj, 'out', 'analysis.json'), 'utf8'));
    const off = A.beats.map((t) => Math.abs(((t - 0.5 + 0.25) % 0.5) - 0.25) * 1000);
    anOk = Math.abs(A.bpm - 120) < 1 && off.every((e) => e < 30) && A.bars.every((t) => Math.abs(((t - 0.5 + 1) % 2) - 1) < 0.03);
    anDetail = `${A.bpm} BPM, ${A.beats.length} beats, worst ${Math.max(...off).toFixed(1)} ms off the grid`;
  }
  pass('analyze out/music.wav finds 120 BPM, its beats and its bars', anOk, anDetail);
  const E = path.join(proj, 'engine');
  const vo = spawnSync(process.execPath, ['-e', `const V=require(${JSON.stringify(path.join(E, 'audio', 'voice'))});const v=V.speak([{at:0.5,text:'Hello there, film.'},{at:2,text:'Second line!'}],{out:'out',engine:'none'});console.log(JSON.stringify({n:v.lines.length,w:v.lines[0].words.length,m:v.mouth.open.length}))`], { cwd: proj, encoding: 'utf8' });
  const voj = vo.status === 0 ? JSON.parse(vo.stdout.trim().split('\n').pop()) : {};
  pass('voiceover (silent engine) writes out/voice.json with word times', vo.status === 0 && voj.n === 2 && voj.w === 3 && voj.m > 0, vo.status ? vo.stderr.slice(-300) : JSON.stringify(voj));
  const sr2 = run(['engine/render.js', 'srt']);
  pass('srt prefers the voiceover words', sr2.code === 0 && /from out\/voice\.json/.test(sr2.out), sr2.out.split('\n')[0]);
  fs.rmSync(path.join(proj, 'out', 'voice.json'));
  const st1 = run(['engine/render.js', 'stills', '5', '--style', 'pixel']);
  const px = path.join(proj, 'out', 'stills', 't_005.00.png');
  const pxBuf = fs.existsSync(px) ? fs.readFileSync(px) : null;
  run(['engine/render.js', 'stills', '5']);
  pass('--style pixel renders a different look of the same frame', st1.code === 0 && !/EXCEPTION/.test(st1.out) && pxBuf && !pxBuf.equals(fs.readFileSync(px)), st1.code ? st1.out.slice(-300) : '');
  // a frame using the v0.7 drawing APIs: map + pins + counter + charts + acting characters + animals
  const kit = path.join(tmp, 'kit-film');
  spawnSync(process.execPath, [path.join(SKILL, 'scripts', 'new-project.js'), kit, '--format', '9:16'], { encoding: 'utf8' });
  fs.writeFileSync(path.join(kit, 'film.js'), `(function () {
  const G = globalThis.G, Ch = globalThis.Ch, Data = globalThis.Data, Studio = globalThis.Studio;
  Studio.film({ draw(ctx, t) {
    G.bg(ctx, '#F4EDE0');
    const map = Data.map({ region: 'Pakistan', x: 40, y: 200, w: 1000, h: 900 });
    Data.drawMap(ctx, map, { highlight: { Pakistan: '#3FA89B' } });
    ['Karachi', 'Lahore', 'Islamabad'].forEach((c, i) => Data.pin(ctx, ...map.city(c), { t, at: 0.2 * i, label: c }));
    Data.route(ctx, map.city('Karachi'), map.city('Lahore'), { t, t0: 0, t1: 1, icon: 'plane' });
    Data.counter(ctx, { x: 540, y: 1200, from: 0, to: 1250000, t, t0: 0, t1: 1, prefix: 'Rs ', lakh: true });
    Data.bars(ctx, { x: 100, y: 1250, w: 400, h: 200, data: [{ label: 'A', value: 3 }, { label: 'B', value: 5 }], t, t0: 0 });
    Data.donut(ctx, { x: 800, y: 1350, r: 110, data: [{ value: 2 }, { value: 1 }], t, t0: 0 });
    Ch.person(ctx, { x: 300, y: 1700, s: 0.5, ...Ch.walk(t, { x0: 300 }), gesture: 'wave', mouth: { open: 0.6, wide: 0.5, talking: true }, style: { outfit: 'sari', hairStyle: 'bun' } });
    Ch.person(ctx, { x: 600, y: 1700, s: 0.5, pose: 'stand', gesture: 'bat', style: { outfit: 'thobe', headwear: 'ghutra' } });
    Ch.dog(ctx, { x: 850, y: 1700, s: 0.6, t }); Ch.cat(ctx, { x: 950, y: 1700, s: 0.5, t }); Ch.bird(ctx, { x: 900, y: 1500, t });
    const seat = Ch.horse(ctx, { x: 250, y: 1150, s: 0.5, walk: t % 1 }).seat;
    Ch.person(ctx, { x: seat[0], y: seat[1], s: 0.4, pose: 'sit', style: { outfit: 'sherwani', headwear: 'pagri', sehra: true, garland: 'flowers', glasses: 'bold', build: 'heavy' } });
    Ch.person(ctx, { x: 600, y: 1150, s: 0.5, pose: 'stand', gesture: 'bhangra', style: { outfit: 'lehenga', headwear: 'dupatta', jewelry: true, bangles: '#D81E3A', mehndi: true, garland: 'roses' } });
    Ch.person(ctx, { x: 850, y: 1150, s: 0.5, pose: 'stand', gesture: 'dhol', style: { outfit: 'kameez', garland: 'notes' } });
  } });
})();`);
  const kr = spawnSync(process.execPath, ['engine/render.js', 'stills', '1.5'], { cwd: kit, encoding: 'utf8' });
  const kOut = kr.stdout + kr.stderr;
  pass('maps, pins, routes, counters, charts, gestures, outfits (incl. wedding), a horse and animals draw without errors', kr.status === 0 && !/EXCEPTION|Error/.test(kOut) && fs.existsSync(path.join(kit, 'out', 'stills', 't_001.50.png')), kOut.slice(-300));

  // 9. every starter scaffolds and draws its storyboard (no music needed for that)
  for (const ex of ['qawwali-night', 'gully-cricket', 'birthday-card', 'wedding-invite', 'lyric-video', 'product-launch']) {
    const dir = path.join(tmp, `ex-${ex}`);
    const sx = spawnSync(process.execPath, [path.join(SKILL, 'scripts', 'new-project.js'), dir, '--from', ex], { encoding: 'utf8' });
    const bx = sx.status === 0 && spawnSync(process.execPath, ['engine/render.js', 'board'], { cwd: dir, encoding: 'utf8', timeout: 300000 });
    const out = bx ? bx.stdout + bx.stderr : sx.stdout + sx.stderr;
    pass(`example ${ex}: scaffold + storyboard`, !!bx && bx.status === 0 && /board written/.test(out) && !/EXCEPTION|Error:/.test(out), out.split('\n').filter(Boolean).pop());
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed${failed ? '' : ' — engine OK'}`);
  if (!failed) fs.rmSync(tmp, { recursive: true, force: true }); else console.log(`(kept ${tmp} for inspection)`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
