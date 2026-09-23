// node engine/render.js srt   -> out/<name>.srt and out/<name>.vtt for uploading to YouTube / TikTok / Instagram.
// Source, in order: the voiceover's word timings (out/voice.json), score.js `subtitles`, score.js `captions`.
module.exports = async function srt(C) {
  const { fs, path, OUT, ROOT, SCORE } = C;
  const Subs = require('../subs');
  let subs = null, from = '';
  const vo = path.join(OUT, 'voice.json');
  if (fs.existsSync(vo)) { const v = JSON.parse(fs.readFileSync(vo, 'utf8')); if (v.lines && v.lines.length) { subs = v.lines.map((l) => ({ t: l.t, end: l.end, text: l.text, alt: l.alt, words: l.words })); from = 'out/voice.json'; } }
  if (!subs && SCORE.subtitles && SCORE.subtitles.length) { subs = SCORE.subtitles; from = 'score.js subtitles'; }
  if (!subs && SCORE.captions) { subs = Subs.fromCaptions(SCORE.captions); from = 'score.js captions'; }
  if (!subs || !subs.length) { console.log('nothing to export: add `subtitles: [{ t, end, text }]` to score.js (or a voiceover)'); return; }
  const base = path.join(OUT, path.basename(ROOT));
  fs.writeFileSync(base + '.srt', Subs.toSRT(subs));
  fs.writeFileSync(base + '.vtt', Subs.toVTT(subs));
  console.log(`wrote out/${path.basename(base)}.srt + .vtt (${subs.length} lines, from ${from})`);
};
