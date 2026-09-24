// node engine/render.js formats 16:9,9:16[,1:1,4:5] [workers] [--draft | --res 1440]
//   -> out/<name>-16x9.mp4, out/<name>-9x16.mp4 … : one score, every format, each verified and muxed.
// Works for films that lay themselves out (score.js uses `const FORMAT = U.pickFormat('…')` and film.js draws
// from G.W / G.H / G.SAFE). The music is shared: run node song.js once before.
module.exports = async function formats(C, _mode, args) {
  const { fs, path, ROOT, OUT, spawn } = C;
  const list = (args.find((a) => /\d+:\d+/.test(a)) || '16:9,9:16').split(',').map((s) => s.trim()).filter(Boolean);
  const workers = args.find((a) => /^\d+$/.test(a));
  const score = fs.readFileSync(path.join(ROOT, 'score.js'), 'utf8');
  if (!/U\.pickFormat\(/.test(score)) throw new Error('this film has a fixed layout: its score.js does not use U.pickFormat(…), so other formats would be cropped wrong. Lay it out from G.W/G.H/G.SAFE first (the template shows how).');
  if (!fs.existsSync(path.join(OUT, 'music.wav'))) throw new Error('run node song.js first (the formats share one soundtrack)');
  const run = (argv) => new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [path.join(ROOT, 'engine', 'render.js'), ...argv], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let log = '';
    p.stdout.on('data', (d) => { log += d; const l = String(d).trim().split('\n').pop(); if (/frames|wrote|done/.test(l)) console.log(`  ${l}`); });
    p.stderr.on('data', (d) => { log += d; });
    p.on('close', (code) => (code === 0 ? resolve(log) : reject(new Error(`render.js ${argv.join(' ')} failed:\n${log.slice(-600)}`))));
  });
  const made = [];
  for (const f of list) {
    const extra = C.DRAFT ? ['--draft'] : C.RES ? ['--res', String(C.RES)] : [];
    console.log(`▶ ${f}`);
    await run(['video', ...(workers ? [workers] : []), '--format', f, ...extra]);
    await run(['mux', '--format', f, ...extra]);
    made.push(path.join(OUT, `${path.basename(ROOT)}-${f.replace(':', 'x')}${C.RES && !C.DRAFT ? `-${C.RES}p` : ''}${C.DRAFT ? '-draft' : ''}.mp4`));
  }
  console.log(`done: ${made.map((m) => 'out/' + path.basename(m)).join(', ')}`);
};
