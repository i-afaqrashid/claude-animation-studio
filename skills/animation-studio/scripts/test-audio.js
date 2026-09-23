#!/usr/bin/env node
// Fast audio regression test (no Chrome, a few seconds): every instrument renders, stays in range,
// and the tuned ones are in tune. Run after touching engine/audio.  node <skill>/scripts/test-audio.js
const path = require('path');
const E = path.join(__dirname, '..', 'engine');
const I = require(path.join(E, 'audio', 'instruments'));
const { SR } = require(path.join(E, 'audio', 'dsp'));
const MIX = require(path.join(E, 'audio', 'mix'));
const { m, mtof } = require(path.join(E, 'music'));
let fails = 0;
const ok = (name, cond, detail = '') => { if (!cond) fails++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
const peak = (x) => { let p = 0; for (let i = 0; i < x.length; i++) p = Math.max(p, Math.abs(x[i])); return p; };
const finite = (x) => { for (let i = 0; i < x.length; i++) if (!Number.isFinite(x[i])) return false; return true; };
function acPitch(x, a, L, want) { // search one tritone either side of the expected pitch (avoids octave errors)
  const fmin = want / 1.4, fmax = want * 1.4;
  const s = Math.floor(a * SR); let best = -1, bl = 0;
  for (let lag = Math.floor(SR / fmax); lag <= Math.ceil(SR / fmin); lag++) { let c = 0, e1 = 0, e2 = 0; for (let i = s; i < s + L; i++) { c += x[i] * x[i + lag]; e1 += x[i] * x[i]; e2 += x[i + lag] * x[i + lag]; } const r = c / Math.sqrt(e1 * e2 + 1e-12); if (r > best) { best = r; bl = lag; } }
  const ac = (lag) => { let c = 0; for (let i = s; i < s + L; i++) c += x[i] * x[i + lag]; return c; };
  const y0 = ac(bl - 1), y1 = ac(bl), y2 = ac(bl + 1);
  return SR / (bl + 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2));
}
const cents = (f, want) => 1200 * Math.log2(f / want);

// every instrument renders finite audio at a sane level
const mono = {
  kick: () => I.kick(), snare: () => I.snare(), clap: () => I.clap(), hat: () => I.hat(false, 1), crash: () => I.crash(1), tom: () => I.tom(120, 0.3), shaker: () => I.shaker(1),
  bell: () => I.bell(880, 0.5, 2, 1.4), bass: () => I.bass(m('A2'), 0.5), pluck: () => I.pluck(m('A4')), guitar: () => I.guitar(m('A3'), 0.6), epiano: () => I.epiano(m('A4'), 0.5),
  musicBox: () => I.musicBox(m('A5')), marimba: () => I.marimba(m('A4')), dholak: () => I.dholak('ghe'), tabla: () => I.tabla('dha'), ting: () => I.ting(m('E6')),
  pulse: () => I.pulse(m('A4'), 0.3), triangle: () => I.triangle(m('A3'), 0.3), chipNoise: () => I.chipNoise('snare'), bass808: () => I.bass808(m('A1'), 0.6),
  pizz: () => I.pizz(m('A4')), timpani: () => I.timpani(m('A2')), logDrum: () => I.logDrum(m('A2')), rim: () => I.rim(),
};
for (const [name, f] of Object.entries(mono)) { const x = f(); ok(`${name} renders`, x.length > 100 && finite(x) && peak(x) > 0.05 && peak(x) < 2.5, `peak ${peak(x).toFixed(2)}`); }
for (const [name, f] of Object.entries({ padNote: () => I.padNote(m('A3'), 0.6), brassNote: () => I.brassNote(m('A3'), 0.5), harmonium: () => I.harmonium(m('A3'), 0.6) })) { const x = f(); ok(`${name} renders (stereo)`, finite(x.L) && finite(x.R) && peak(x.L) > 0.05 && peak(x.L) < 2.5, `peak ${peak(x.L).toFixed(2)}`); }
for (const [name, f] of Object.entries({ supersaw: () => I.supersaw(m('A3'), 0.5), strings: () => I.strings(m('A3'), 0.8) })) { const x = f(); ok(`${name} renders (stereo)`, finite(x.L) && finite(x.R) && peak(x.L) > 0.05 && peak(x.L) < 2.5, `peak ${peak(x.L).toFixed(2)}`); }
{ const x = I.vinyl(1); ok('vinyl bed renders', finite(x) && peak(x) > 0.005 && peak(x) < 1, `peak ${peak(x).toFixed(3)}`); }

// tuning
for (const n of ['E2', 'A3', 'E5']) { const f = acPitch(I.guitar(m(n), 1), 0.2, 6000, mtof(m(n))); ok(`guitar ${n} in tune`, Math.abs(cents(f, mtof(m(n)))) < 3, `${cents(f, mtof(m(n))).toFixed(2)} cents`); }
for (const n of ['D3', 'A4']) { const h = I.harmonium(m(n), 1); const f = acPitch(h.L, 0.3, 6000, mtof(m(n))); ok(`harmonium ${n} in tune`, Math.abs(cents(f, mtof(m(n)))) < 8, `${cents(f, mtof(m(n))).toFixed(1)} cents`); }
{ const f = acPitch(I.tabla('na', { midi: m('D5') }), 0.05, 6000, mtof(m('D5'))); ok('tabla na in tune', Math.abs(cents(f, mtof(m('D5')))) < 15, `${cents(f, mtof(m('D5'))).toFixed(1)} cents`); }

for (const n of ['A2', 'A4']) { const f = acPitch(I.pulse(m(n), 1, { vib: 0 }), 0.1, 6000, mtof(m(n))); ok(`pulse ${n} in tune`, Math.abs(cents(f, mtof(m(n)))) < 5, `${cents(f, mtof(m(n))).toFixed(1)} cents`); }
{ const f = acPitch(I.bass808(m('A1'), 1, { glide: 0 }), 0.15, 8000, mtof(m('A1'))); ok('808 A1 in tune (after its pitch drop)', Math.abs(cents(f, mtof(m('A1')))) < 15, `${cents(f, mtof(m('A1'))).toFixed(1)} cents`); }

// genre packs: every style lays down two bars of drums, bass and chords
{
  const Genre = require(path.join(E, 'audio', 'genres'));
  const MU = require(path.join(E, 'music'));
  const { Bus } = require(path.join(E, 'audio', 'dsp'));
  for (const name of Genre.names) {
    const clock = MU.makeClock({ bpm: Genre.tempo(name), offset: 0.1 });
    const { chordAt } = MU.makeChords(clock, { C: { notes: ['E3', 'G3', 'C4'], bass: 'C2' }, G: { notes: ['D3', 'G3', 'B3'], bass: 'G1' } }, [[0, 0, 4, 'C'], [1, 0, 4, 'G']]);
    const N = Math.ceil((clock.T(2) + 1) * SR);
    const buses = { drums: new Bus(N), bass: new Bus(N), pad: new Bus(N), keys: new Bus(N) };
    const { kicks } = Genre.play(name, { clock, from: 0, to: 2, chordAt, buses });
    const mix = MIX.mixdown(buses, {});
    Genre.fx(name, mix, { kicks, buses: [] });
    const L = MIX.lufs(mix);
    ok(`genre ${name} plays`, finite(mix.L) && finite(mix.R) && Number.isFinite(L) && L > -40 && peak(mix.L) < 4 && peak(buses.drums.L) > 0.01, `${Genre.tempo(name)} BPM, ${L.toFixed(1)} LUFS raw, ${kicks.length} kicks`);
  }
}

// singing: syllables parse, a sung note is in tune, Happy Birthday fits any name
{
  const Sing = require(path.join(E, 'audio', 'sing'));
  const p = Sing.parse('tey');
  ok('sing: "tey" parses to t + e→i', p.onset.join() === 't' && p.vowel.join() === 'e,i', JSON.stringify(p));
  ok('sing: names split by vowels', Sing.split('Ayesha').join('-') === 'a-ye-sha' && Sing.split('Hassan').join('-') === 'has-san', Sing.split('Ayesha').join('-'));
  const x = Sing.line('laa', [{ t: 0, dur: 1, midi: m('A3') }], { type: 'tenor', vib: 0 });
  const f = acPitch(x, x.lead + 0.4, 6000, mtof(m('A3')));
  ok('sing: a held "laa" on A3 is in tune', finite(x) && Math.abs(cents(f, mtof(m('A3')))) < 10, `${cents(f, mtof(m('A3'))).toFixed(1)} cents`);
  const hb = Sing.happyBirthday('Muhammad', { bpm: 120 });
  ok('sing: Happy Birthday dear Mu-ham-mad', hb.lyric.includes('dear mu ham mad') && finite(hb.audio) && peak(hb.audio) > 0.05 && peak(hb.audio) < 2, `${hb.notes.length} notes, peak ${peak(hb.audio).toFixed(2)}`);
}

// loudness meter + true-peak master
{
  const { Bus } = require(path.join(E, 'audio', 'dsp'));
  const b = new Bus(SR * 4);
  for (let i = 0; i < b.n; i++) { const v = 0.1 * Math.sin(2 * Math.PI * 997 * i / SR); b.L[i] = v; b.R[i] = v; }
  ok('lufs(): 997 Hz at -20 dBFS reads -20.0 LUFS', Math.abs(MIX.lufs(b) + 20) < 0.1, MIX.lufs(b).toFixed(2));
}
console.log(`\n${fails ? fails + ' FAILED' : 'all audio checks passed'}`);
process.exit(fails ? 1 : 0);
