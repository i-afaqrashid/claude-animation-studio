// Genre packs: a whole backing track (drums, bass, chords) in one call, in a style.
//
//   const Genre = require('./engine/audio/genres');
//   Genre.play('lofi', { clock, from: 0, to: 8, chordAt: sc.chordAt, buses: { drums, bass, pad, keys } });
//
// Styles: lofi · chiptune · orchestral · edm · afrobeats · qawwali · desi (dholak pop) · boombap.
// Each one: a tempo range to pick from, swing, a 16-step drum grid per instrument ('X' accent, 'x' hit,
// 'o' ghost, '.' rest), a bass rhythm on the chord root ('R' root, '5' fifth, '8' octave), a chord style
// and the instruments that play them. The melody stays yours (lead it with the genre's `lead` instrument).
// Genre.fx(name, mix) applies the style's finishing touch to the mix (lo-fi tape, EDM sidechain…).

const I = require('./instruments');
const MIX = require('./mix');


const vel = { X: 1, x: 0.72, o: 0.35 };
const GENRES = {
  lofi: {
    bpm: [70, 90], swing: 0.58,
    kit: () => ({ K: I.kick({ tail: 0.22, punch: 0.5 }), S: I.snare({ tone: 0.5, snap: 0.4, decay: 0.14 }), H: I.hat(false, 5), R: I.rim(0.8, 3) }),
    grid: { K: 'X......x..x.....', S: '....X.......X...', H: 'x.o.x.o.x.o.x.ox', R: '..........o.....' },
    gain: { K: 0.7, S: 0.42, H: 0.1, R: 0.12 },
    bass: { pattern: 'R.....R...5.....', play: (midi, d) => I.bass(midi, d, { bright: 0.25, sub: 0.9 }), gain: 0.5 },
    chords: { style: 'stab', pattern: 'x.......x.....x.', play: (midi, d) => I.epiano(midi, d * 1.6, { index: 0.9 }), gain: 0.1, add7: true },
    lead: (midi, d) => I.epiano(midi, d, { index: 1.2 }),
    fx: (mix) => MIX.lofi(mix, { wow: 1, flutter: 0.8, lowpass: 5000 }), bed: (len) => I.vinyl(len),
  },
  chiptune: {
    bpm: [130, 160], swing: 0.5,
    kit: () => ({ K: I.chipNoise('kick'), S: I.chipNoise('snare'), H: I.chipNoise('hat', 2) }),
    grid: { K: 'X...x...X..x....', S: '....X.......X..o', H: 'x.x.x.x.x.x.x.x.' },
    gain: { K: 0.7, S: 0.5, H: 0.2 },
    bass: { pattern: 'R.R.8.R.R.R.5.8.', play: (midi, d) => I.triangle(midi, d * 0.9), gain: 0.55 },
    chords: { style: 'arp', rate: 32, play: (midi, d) => I.pulse(midi + 12, d, { duty: 0.125 }), gain: 0.22 },
    lead: (midi, d) => I.pulse(midi, d, { duty: 0.25, vib: 0.3 }),
  },
  orchestral: {
    bpm: [70, 110], swing: 0.5,
    kit: () => ({ T: 'timpani', S: I.snare({ tone: 0.3, snap: 0.6, decay: 0.1 }) }),
    grid: { T: 'X.......x.......', S: '' },
    gain: { T: 0.55, S: 0.2 },
    bass: { pattern: 'R...R...R...R...', play: (midi) => I.pizz(midi + 12), gain: 0.55 },
    chords: { style: 'pad', play: (midi, d) => I.strings(midi, d), gain: 0.2 },
    lead: (midi, d) => I.brassNote(midi, d, { bright: 0.5 }),
  },
  edm: {
    bpm: [120, 128], swing: 0.5,
    kit: () => ({ K: I.kick({ tail: 0.3, punch: 1.2 }), C: I.clap({ spread: 1.2 }), H: I.hat(false, 7), O: I.hat(true, 9) }),
    grid: { K: 'X...X...X...X...', C: '....X.......X...', H: 'x.x.x.x.x.x.x.x.', O: '..x...x...x...x.' },
    gain: { K: 0.85, C: 0.5, H: 0.12, O: 0.14 },
    bass: { pattern: '..R...R...R...R.', play: (midi, d) => I.bass808(midi - 12, d, { drive: 1.4, glide: 0 }), gain: 0.5 },
    chords: { style: 'stab', pattern: '..x...x...x...x.', play: (midi, d) => I.supersaw(midi + 12, d * 0.8), gain: 0.16 },
    lead: (midi, d) => I.supersaw(midi, d, { detune: 14 }),
    sidechain: true,
  },
  afrobeats: {
    bpm: [100, 115], swing: 0.54,
    kit: () => ({ K: I.kick({ tail: 0.2 }), R: I.rim(1, 4), C: I.clap({ spread: 0.8 }), S: I.shaker(1, 8) }),
    grid: { K: 'X..x..x.X..x..x.', R: '..x..x....x..x..', C: '....x.......x...', S: 'xoxoxoxoxoxoxoxo' },
    gain: { K: 0.7, R: 0.16, C: 0.3, S: 0.12 },
    bass: { pattern: 'R..R..5.R..8..5.', play: (midi) => I.logDrum(midi + 12, { decay: 0.28 }), gain: 0.42 },
    chords: { style: 'stab', pattern: '..x...x...x.x...', play: (midi, d) => I.guitar(midi + 12, d, { bright: 0.6, sustain: 0.99 }), gain: 0.2 },
    lead: (midi, d) => I.epiano(midi, d),
  },
  qawwali: {
    // harmonium drone + tabla theka (keherwa) + taali: claps on beats 1, 2 and 3, the 4th left open (khali)
    bpm: [80, 150], swing: 0.5,
    kit: () => ({ D: I.tabla('dha', { midi: 62 }), N: I.tabla('na', { midi: 62 }), G: I.tabla('ge', { midi: 62 }), T: I.tabla('tin', { midi: 62 }), C: I.clap({ spread: 1.6 }) }),
    grid: { D: 'X.......x.......', N: '....x.x.....x.x.', G: '..x.......x.....', T: '..............x.', C: 'X...X...X.......' },
    gain: { D: 0.55, N: 0.4, G: 0.4, T: 0.3, C: 0.45 },
    bass: { pattern: 'R.......R.......', play: (midi, d) => I.bass(midi, d, { bright: 0.3, sub: 1 }), gain: 0.4 },
    chords: { style: 'pad', play: (midi, d) => I.harmonium(midi, d, { attack: 0.1, bright: 0.9 }), gain: 0.07 },
    lead: (midi, d) => I.harmonium(midi, d, { attack: 0.02, bright: 1.2 }),
  },
  desi: {
    // the Sitey dholak groove + taali on 2 and 4
    bpm: [96, 112], swing: 0.5,
    kit: () => ({ G: I.dholak('ghe'), g: I.dholak('ghe', { pitch: 0.9, seed: 2 }), N: I.dholak('na'), n: I.dholak('na', { pitch: 1.06, seed: 3 }), K: I.dholak('ka'), T: I.dholak('tit'), C: I.clap({ spread: 1.3 }) }),
    grid: { G: 'X.......x.......', g: '......x....x....', N: '..x.......x...x.', n: '....x.......x...', K: '.......x.......x', T: '.............o..', C: '....x.......x...' },
    gain: { G: 0.75, g: 0.5, N: 0.42, n: 0.36, K: 0.3, T: 0.18, C: 0.34 },
    bass: { pattern: 'R..R5...R..R5...', play: (midi, d) => I.bass(midi, d), gain: 0.48 },
    chords: { style: 'pad', play: (midi, d) => I.harmonium(midi, d, { attack: 0.08, bright: 0.8 }), gain: 0.075 },
    lead: (midi, d) => I.guitar(midi, d, { bright: 0.7 }),
  },
  boombap: {
    bpm: [85, 95], swing: 0.6,
    kit: () => ({ K: I.kick({ tail: 0.28, punch: 1 }), S: I.snare({ tone: 0.7, snap: 0.8 }), H: I.hat(false, 6) }),
    grid: { K: 'X.....x...x.....', S: '....X.......X...', H: 'x.x.x.x.x.x.x.x.' },
    gain: { K: 0.85, S: 0.55, H: 0.13 },
    bass: { pattern: 'R.....R...R.....', play: (midi, d) => I.bass(midi, d, { bright: 0.5 }), gain: 0.55 },
    chords: { style: 'stab', pattern: 'x...............', play: (midi, d) => I.epiano(midi, d * 3), gain: 0.1, add7: true },
    lead: (midi, d) => I.pluck(midi),
  },
};

// Lay down a genre's backing for bars [from, to).
// o: { clock, from, to, chordAt(t) → {notes, bass}, buses: { drums, bass, pad, keys }, gain = 1, drums = true,
//      bassline = true, chords = true, fill: bar numbers that end with a fill, kicks: [] (collects kick times) }
function play(name, o) {
  const G = GENRES[name];
  if (!G) throw new Error(`unknown genre "${name}" (${Object.keys(GENRES).join(', ')})`);
  const { clock, from = 0, to, chordAt, buses, gain = 1 } = o;
  const kit = G.kit();
  const kicks = o.kicks || [];
  const stepT = (b, s) => { const t = clock.T(b, (s * 4) / 16); const sw = s % 2 === 1 ? (G.swing - 0.5) * 2 * (clock.T(b, ((s + 1) * 4) / 16) - clock.T(b, ((s - 1) * 4) / 16)) / 2 : 0; return t + sw; };
  for (let b = from; b < to; b++) {
    for (let s = 0; s < 16; s++) {
      const t = stepT(b, s);
      if (o.drums !== false && buses.drums) {
        for (const [k, grid] of Object.entries(G.grid)) {
          const v = vel[grid[s]];
          if (!v) continue;
          let smp = kit[k];
          if (smp === 'timpani') { const c = chordAt && chordAt(t); smp = I.timpani((c ? c.bass : 43) + 12); }
          buses.drums.addMono(smp, t, (G.gain[k] || 0.5) * v * gain, ['H', 'O', 'R', 'S'].includes(k) ? 0.25 : ['N', 'n'].includes(k) ? 0.15 : 0);
          if (k === 'K' || (name === 'qawwali' && k === 'D')) kicks.push(t);
        }
      }
      const c = chordAt && chordAt(t);
      if (!c) continue;
      // bass: the chord root (R), fifth (5) or octave (8), held until the next note
      if (o.bassline !== false && buses.bass && G.bass.pattern[s] && G.bass.pattern[s] !== '.') {
        let n = s + 1; while (n < 16 && G.bass.pattern[n] === '.') n++;
        const d = stepT(b, n) - t;
        const midi = c.bass + 12 + (G.bass.pattern[s] === '5' ? 7 : G.bass.pattern[s] === '8' ? 12 : 0);
        buses.bass.addMono(G.bass.play(midi, d * 0.92), t, G.bass.gain * gain);
      }
      // chords
      if (o.chords !== false) {
        const notes = G.chords.add7 ? [...c.notes, c.notes[0] + 10] : c.notes;
        if (G.chords.style === 'pad' && s === 0) {
          const d = clock.T(b + 1) - clock.T(b);
          for (const nn of notes) { const x = G.chords.play(nn, d); if (x.L) (buses.pad || buses.keys).addStereo(x.L, x.R, t, G.chords.gain * gain); else (buses.pad || buses.keys).addMono(x, t, G.chords.gain * gain); }
        } else if (G.chords.style === 'stab' && G.chords.pattern[s] === 'x') {
          const d = stepT(b, Math.min(16, s + 2)) - t;
          for (const nn of notes) { const x = G.chords.play(nn, d); if (x.L) buses.keys.addStereo(x.L, x.R, t, G.chords.gain * gain); else buses.keys.addMono(x, t, G.chords.gain * gain, (nn % 3 - 1) * 0.2); }
        } else if (G.chords.style === 'arp' && buses.keys) {
          // a fast arpeggio through the chord (the chip-music way to play chords on one voice)
          const per = G.chords.rate / 16;
          for (let k = 0; k < per; k++) {
            const tt = t + (k * (stepT(b, s + 1) - t)) / per;
            const nn = notes[(s * per + k) % notes.length];
            buses.keys.addMono(G.chords.play(nn, (stepT(b, s + 1) - t) / per), tt, G.chords.gain * gain);
          }
        }
      }
    }
    // a fill on request: a snare/tabla roll over the last beat
    if (o.fill && o.fill.includes(b) && buses.drums) {
      const smp = kit.S || kit.N || kit.n || kit.C;
      if (smp && typeof smp !== 'string') for (let i = 0; i < 8; i++) buses.drums.addMono(smp, clock.T(b, 3 + i / 8), 0.2 + i * 0.04, (i % 2 ? 0.2 : -0.2));
    }
  }
  return { kicks };
}

// the style's finishing touch on the finished mix (before master): lo-fi tape, EDM pump, vinyl bed…
function fx(name, mix, { kicks = [], buses = [] } = {}) {
  const G = GENRES[name];
  if (!G) return mix;
  if (G.bed) { const bed = G.bed(mix.n / 48000); for (let i = 0; i < mix.n; i++) { mix.L[i] += bed[i] * 0.5; mix.R[i] += bed[(i + 811) % mix.n] * 0.5; } }
  if (G.sidechain && kicks.length && buses.length) MIX.sidechain(buses, kicks, { depth: 0.5 });
  if (G.fx) G.fx(mix);
  return mix;
}
// a tempo inside the genre's range, picked from a seed (or the middle)
const tempo = (name, pick = 0.5) => { const [a, b] = GENRES[name].bpm; return Math.round(a + (b - a) * pick); };
const lead = (name) => GENRES[name].lead;

module.exports = { GENRES, play, fx, tempo, lead, names: Object.keys(GENRES) };

