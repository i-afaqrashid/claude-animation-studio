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
};
for (const [name, f] of Object.entries(mono)) { const x = f(); ok(`${name} renders`, x.length > 100 && finite(x) && peak(x) > 0.05 && peak(x) < 2.5, `peak ${peak(x).toFixed(2)}`); }
for (const [name, f] of Object.entries({ padNote: () => I.padNote(m('A3'), 0.6), brassNote: () => I.brassNote(m('A3'), 0.5), harmonium: () => I.harmonium(m('A3'), 0.6) })) { const x = f(); ok(`${name} renders (stereo)`, finite(x.L) && finite(x.R) && peak(x.L) > 0.05 && peak(x.L) < 2.5, `peak ${peak(x.L).toFixed(2)}`); }

// tuning
for (const n of ['E2', 'A3', 'E5']) { const f = acPitch(I.guitar(m(n), 1), 0.2, 6000, mtof(m(n))); ok(`guitar ${n} in tune`, Math.abs(cents(f, mtof(m(n)))) < 3, `${cents(f, mtof(m(n))).toFixed(2)} cents`); }
for (const n of ['D3', 'A4']) { const h = I.harmonium(m(n), 1); const f = acPitch(h.L, 0.3, 6000, mtof(m(n))); ok(`harmonium ${n} in tune`, Math.abs(cents(f, mtof(m(n)))) < 8, `${cents(f, mtof(m(n))).toFixed(1)} cents`); }
{ const f = acPitch(I.tabla('na', { midi: m('D5') }), 0.05, 6000, mtof(m('D5'))); ok('tabla na in tune', Math.abs(cents(f, mtof(m('D5')))) < 15, `${cents(f, mtof(m('D5'))).toFixed(1)} cents`); }

// loudness meter + true-peak master
{
  const { Bus } = require(path.join(E, 'audio', 'dsp'));
  const b = new Bus(SR * 4);
  for (let i = 0; i < b.n; i++) { const v = 0.1 * Math.sin(2 * Math.PI * 997 * i / SR); b.L[i] = v; b.R[i] = v; }
  ok('lufs(): 997 Hz at -20 dBFS reads -20.0 LUFS', Math.abs(MIX.lufs(b) + 20) < 0.1, MIX.lufs(b).toFixed(2));
}
console.log(`\n${fails ? fails + ' FAILED' : 'all audio checks passed'}`);
process.exit(fails ? 1 : 0);
