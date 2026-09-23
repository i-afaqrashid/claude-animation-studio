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
  function makeClock({ bpm = 120, offset = 0.5, beatsPerBar = 4 } = {}) {
    const BEAT = 60 / bpm;
    const BAR = BEAT * beatsPerBar;
    const T = (bar, beat = 0) => offset + bar * BAR + beat * BEAT;
    const beatPos = (t) => (t - offset) / BEAT;
    const phase = (t) => ((beatPos(t) % 1) + 1) % 1; // 0 exactly on every beat
    // call fn(t, bar, step) on every grid step (e.g. stepsPerBar = 16 for 16ths)
    const eachStep = (bar0, bar1, stepsPerBar, fn) => {
      for (let b = bar0; b < bar1; b++) for (let s = 0; s < stepsPerBar; s++) fn(T(b) + (s * BAR) / stepsPerBar, b, s);
    };
    return { bpm, BEAT, BAR, OFFSET: offset, T, beatPos, phase, eachStep };
  }

  // A melody bar written in 8th notes: [[note, start8th, dur8ths], ...] -> [{t, dur, midi}]
  function placeBar(clock, bar8ths, bar, transpose = 0) {
    const e = clock.BEAT / 2;
    return bar8ths.map(([n, s, d]) => ({ t: clock.T(bar) + s * e, dur: d * e, midi: m(n) + transpose }));
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
