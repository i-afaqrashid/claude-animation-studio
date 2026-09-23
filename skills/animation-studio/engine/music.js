// Musical time + pitch helpers shared by the score, the synth and the visuals.
// Works in Node (require) and in the browser (globalThis.MUSIC).
(function () {
  const NOTE_IDX = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };

  // 'C4' -> 60, 'Bb3' -> 58
  function m(name) {
    const mm = /^([A-G](?:#|b)?)(-?\d)$/.exec(name);
    if (!mm) throw new Error(`bad note name: ${name}`);
    return NOTE_IDX[mm[1]] + (parseInt(mm[2], 10) + 1) * 12;
  }
  const mtof = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

  // The clock: every timestamp in a film is T(bar, beat).
  // offset = seconds of lead-in before bar 0 (e.g. a black frame + a click).
  // tempo (optional) = [[bar, bpm], …]: the tempo ramps linearly between points (an accelerando, like a
  // qawwali speeding up), constant after the last. BEAT/BAR are then the starting values; use beatAt(t).
  function makeClock({ bpm = 120, offset = 0.5, beatsPerBar = 4, tempo = null } = {}) {
    const BEAT = 60 / bpm;
    const BAR = BEAT * beatsPerBar;
    if (!tempo || !tempo.length) {
      const T = (bar, beat = 0) => offset + bar * BAR + beat * BEAT;
      const beatPos = (t) => (t - offset) / BEAT;
      const phase = (t) => ((beatPos(t) % 1) + 1) % 1; // 0 exactly on every beat
      // call fn(t, bar, step) on every grid step (e.g. stepsPerBar = 16 for 16ths)
      const eachStep = (bar0, bar1, stepsPerBar, fn) => {
        for (let b = bar0; b < bar1; b++) for (let s = 0; s < stepsPerBar; s++) fn(T(b) + (s * BAR) / stepsPerBar, b, s);
      };
      return { bpm, BEAT, BAR, OFFSET: offset, beatsPerBar, T, beatPos, phase, eachStep, beatAt: () => BEAT, bpmAt: () => bpm };
    }
    // tempo map: segments in beats with linear bpm, integrated exactly (60 / bpm is the seconds per beat)
    const pts = tempo.map(([b, v]) => [b * beatsPerBar, v]).sort((a, c) => a[0] - c[0]);
    if (pts[0][0] > 0) pts.unshift([0, bpm]);
    const segs = pts.map(([p, v], i) => ({ p, v, k: i + 1 < pts.length ? (pts[i + 1][1] - v) / (pts[i + 1][0] - p) : 0, s: 0 }));
    const secs = (g, dp) => (Math.abs(g.k) < 1e-9 ? (60 * dp) / g.v : (60 / g.k) * Math.log((g.v + g.k * dp) / g.v));
    for (let i = 1; i < segs.length; i++) segs[i].s = segs[i - 1].s + secs(segs[i - 1], segs[i].p - segs[i - 1].p);
    const segAtBeat = (p) => { let g = segs[0]; for (const x of segs) if (p >= x.p) g = x; return g; };
    const timeOfBeat = (p) => { if (p < 0) return (60 * p) / segs[0].v; const g = segAtBeat(p); return g.s + secs(g, p - g.p); };
    const T = (bar, beat = 0) => offset + timeOfBeat(bar * beatsPerBar + beat);
    const beatPos = (t) => {
      const s = t - offset;
      if (s < 0) return (s * segs[0].v) / 60;
      let g = segs[0]; for (const x of segs) if (s >= x.s) g = x;
      const ds = s - g.s;
      return g.p + (Math.abs(g.k) < 1e-9 ? (ds * g.v) / 60 : (g.v / g.k) * (Math.exp((g.k * ds) / 60) - 1));
    };
    const bpmAt = (t) => { const p = Math.max(0, beatPos(t)), g = segAtBeat(p); return g.v + g.k * (p - g.p); };
    const phase = (t) => ((beatPos(t) % 1) + 1) % 1;
    const eachStep = (bar0, bar1, stepsPerBar, fn) => {
      for (let b = bar0; b < bar1; b++) for (let s = 0; s < stepsPerBar; s++) fn(T(b, (s * beatsPerBar) / stepsPerBar), b, s);
    };
    return { bpm, BEAT, BAR, OFFSET: offset, beatsPerBar, T, beatPos, phase, eachStep, beatAt: (t) => 60 / bpmAt(t), bpmAt, tempo: pts };
  }

  // A melody bar written in 8th notes: [[note, start8th, dur8ths], ...] -> [{t, dur, midi}]
  function placeBar(clock, bar8ths, bar, transpose = 0) {
    if (!clock.tempo) {
      const e = clock.BEAT / 2;
      return bar8ths.map(([n, s, d]) => ({ t: clock.T(bar) + s * e, dur: d * e, midi: m(n) + transpose }));
    }
    return bar8ths.map(([n, s, d]) => ({ t: clock.T(bar, s / 2), dur: clock.T(bar, (s + d) / 2) - clock.T(bar, s / 2), midi: m(n) + transpose }));
  }

  // progression rows [bar, beatStart, beats, name] + chord table {name: {notes:[..], bass:'F2'}}
  function makeChords(clock, table, rows) {
    const chords = rows.map(([bar, beat, beats, name]) => ({
      t0: clock.T(bar, beat), t1: clock.T(bar, beat + beats), bar, name,
      notes: table[name].notes.map(m), bass: m(table[name].bass),
    }));
    const chordAt = (t) => chords.find((c) => t >= c.t0 && t < c.t1) || null;
    return { chords, chordAt };
  }

  const MUSIC = { m, mtof, makeClock, placeBar, makeChords };
  if (typeof module !== 'undefined') module.exports = MUSIC; else globalThis.MUSIC = MUSIC;
})();
