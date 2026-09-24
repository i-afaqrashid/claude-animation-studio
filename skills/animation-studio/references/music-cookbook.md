# Music cookbook

Everything is rendered offline at 48 kHz into `Bus` objects (stereo Float32Arrays). An instrument renders one note/hit to a mono (or `{L,R}`) buffer; place it with `bus.addMono(buf, t, gain, pan)` / `bus.addStereo(L, R, t, gain)`.

## Harmony and hook

- Key F major works well: I–V–vi–IV (F C Dm Bb) for anthems; Dm / Bbmaj7 / Gm7 for tension and comfort; a C pedal (Csus → C → C7) for builds; Gm7 → C → F for a final cadence; Fmaj9 to end.
- Write the hook as 8th-note bars: `[['C5',0,2],['A4',2,1],['C5',3,1],['F5',4,2],['E5',6,1],['D5',7,1]]` (note, start 8th, length in 8ths). Reuse the same hook everywhere in different costumes: music box (intro, +12 semitones), marimba (the gimmick), brass (the payoff), choir (the crowd), music box again (outro).
- Sequence the hook bar over each chord (bar 3 repeats bar 1's shape a step higher). End phrases on chord tones.

## Instruments (engine/audio/instruments.js)

| sound | call | notes |
|---|---|---|
| kick | `I.kick({punch, tail})` | 0.95 gain per hit; `punch:1.3, tail:0.4` for big hits |
| snare / clap | `I.snare()`, `I.clap()` | clap on beats 2 & 4, plus a send to reverb |
| hats | `I.hat(false)`, `I.hat(true)` (open), `I.crash()` | closed 16ths 0.13/0.22 alternating, open on the "and" |
| shaker / agogô | `I.shaker()`, `I.bell(freq, decay, index)` | samba flavour: 2-bar bell pattern |
| toms / surdo | `I.tom(freq, decay)` | fills tumble from 220 → 95 Hz in 16ths |
| bass | `I.bass(midi, dur, {bright, sub})` | cumbia root-root-5th-octave in grooves; octave 8ths in the drop |
| pad | `I.padNote(midi, dur, {cutoff, attack, release})` → `{L,R}` | dark (650–1000 Hz) for tension, 2600 for the drop |
| pluck | `I.pluck(midi)` | offbeat "skank" chords, festive |
| music box | `I.musicBox(midi)` | play +12; heavy reverb; intros and outros |
| marimba | `I.marimba(midi, {thock})` | `thock` adds a leathery kick sound: perfect for "ball touches" |
| brass | `I.brassNote(midi, dur, {bright, stab})` → `{L,R}` | layer an octave-down copy at about half gain; `stab:true` for hits |
| voice | `I.voice(midi, dur, {syl, type, glide, vib, breath, shout})` | formant singer: `syl` o / le / e / a / u, `type` tenor / alto |
| fx | `boing, thud, paperFwip, tvClick, whistle, bwomp, heartbeat, woodTick, thwack, subBoom, pop, fireworkBurst, launchWhistle, scribble, noiseSweep` | each tied to a score event |

### Desi / South Asian (dholak, tabla, harmonium, taali)
The Sitey promo recipe (104 BPM, D major pentatonic):
- **Dholak groove** in 16 steps: `ghe` on 0 and 8 (0.7), `gheLo` (pitch 0.9) on 6 and 11 (0.5), `na` on 2, 10, 14 (0.4), `na2` (pitch 1.06) on 4, 12, `ka` on 7 and 15 (0.3), a ghost `tit` on 13. Pan the `na` strokes a little right.
- **Taali** (hand claps) on beats 2 and 4: `I.clap({ spread: 1.3 })`, plus a touch of reverb. A light kick on 1 and 3 only in the payoff.
- **Harmonium** plays the chords (gain ≈ 0.08 per note, attack 0.08, `bright` 0.8) and doubles the hook an octave down (attack 0.02, `bright` 1.2). That doubling is what makes it sound desi.
- **Tabla**: `tin` on every beat for a soft section; a `na`/`tin` roll of 8 notes in 32nds into a big moment, then `dha` on the downbeat.
- **Notifications**: `I.ting(midi)` pitched up the pentatonic scale, faster and faster, makes a comic "flood" of messages.
Checked by measurement: the tabla `na` lands within 2 Hz of its note, the harmonium within ±5 cents, and the dholak `ghe` falls from ~130 to ~70 Hz.

### Crowd and choir (formant synthesis)
- **Chant ("o-lé")**: for each hook note, 12 tenors (an octave down) + 7 altos (at pitch), each with a random detune of ±0.17 semitones, 0–35ms lag, random pan, and syllables alternating `o` / `le`. Gain about 0.05 each, plus its own large reverb.
- **Crowd babble**: Poisson-spawn shouts (0.35–1.35s, random vowel, pitch 47–60 or +12 for altos, glide ±, breath 0.18, shout 1.3). Use about 7/s during a match, a rising 4 → 26/s during a build, and a burst of about 55 long rising "yeaaah" voices on the goal.
- **"Ooooh"**: 14 voices on `u`, glide -4 semitones.
- Add a pink-noise bed (6 modulated band-passes) under the voices for air. Low-pass it (about 1100 Hz) when the crowd is heard "through a TV".

## Genre packs (engine/audio/genres.js)
A whole backing track (drums, bass and chords) in one call, in a style. The melody stays yours.
```js
const Genre = require('./engine/audio/genres');
const clock = makeClock({ bpm: Genre.tempo('lofi') });          // a tempo inside the style's range
const { kicks } = Genre.play('lofi', { clock, from: 0, to: 8, chordAt, buses: { drums, bass, pad, keys }, fill: [7] });
const lead = Genre.lead('lofi');                                // the style's lead instrument, for your hook
// … mixdown …
Genre.fx('lofi', mix, { kicks, buses: [pad, keys] });           // the finishing touch: tape wobble, vinyl, EDM pump
```
| style | BPM | sound |
|---|---|---|
| `lofi` | 70–90 | swung dusty kit, rim, FM e-piano 7th chords, sub bass, vinyl crackle, tape wow (`MIX.lofi`) |
| `chiptune` | 130–160 | NES noise drums, pulse-wave arpeggios, triangle bass, `I.pulse` lead |
| `orchestral` | 80–100 | timpani on the root, sustained `I.strings`, `I.pizz` bass, brass lead |
| `edm` | 120–128 | four-on-the-floor, `I.supersaw` stabs, offbeat bass, sidechain pump |
| `afrobeats` | 100–115 | syncopated kick, rim/shaker, `I.logDrum`, guitar skank |
| `qawwali` | 100–130 | dholak + tabla, taali claps, harmonium chords and lead |
| `desi` | 95–110 | dholak pop groove, harmonium, ting accents |
| `boombap` | 85–95 | swung hip-hop kit, 808-ish bass, e-piano stabs |

`Genre.play` options: `gain`, `drums/bassline/chords: false` to drop a part (e.g. no drums in the intro), `fill: [bars]` for a roll into the next bar. Pick a style from the brief: warm/cozy → lofi; retro/gaming → chiptune; epic/cinematic → orchestral; hype/launch → edm; Pakistani/devotional → qawwali; Pakistani/pop → desi. All eight land at -14 LUFS with the master's `lufs` option and pass `scripts/test-audio.js`.

New instruments used by the packs: `I.pulse(midi, dur, {duty, decay, vib, slide})`, `I.triangle(midi, dur)`, `I.chipNoise('kick'|'snare'|'hat', seed)`, `I.supersaw(midi, dur, {detune, cutoff, attack, release})` → `{L,R}`, `I.bass808(midi, dur, {drive, glide, decay})`, `I.strings(midi, dur, {attack, release, bright})` → `{L,R}`, `I.pizz(midi)`, `I.timpani(midi, {decay})`, `I.logDrum(midi, {decay, bend, drive})`, `I.rim(pitch, seed)`, `I.vinyl(seconds, {crackle, hiss})`.

## Singing words (engine/audio/sing.js)
A formant singer for jingles, a name in "Happy Birthday" or a chant. Spell by sound, split words with `-`:
```js
const Sing = require('./engine/audio/sing');
const notes = MU.placeBar(clock, [['D5', 0, 1], ['B4', 1, 1], ['A4', 2, 2], ['D5', 4, 1], ['F#5', 5, 3]], 8);
const x = Sing.line('si-tey dot pee-kay', notes, { type: 'alto' });   // one syllable per note
vox.addMono(x, notes[0].t - x.lead, 0.5);                           // x.lead: its consonants start early
const hb = Sing.happyBirthday('Ayesha', { bpm: 100, key: 'F' });    // { notes, lyric, audio }
```
- Voices: `soprano`, `alto`, `tenor`, `bass`. Options: `vib` (semitones), `breath`, `glide` (s), `bright`.
- Vowels: `a/aa` (father), `e` (bed), `i/ee` (see), `o`, `u/oo` (too), `ae` (cat), `uh` (the), diphthongs `ay/ey` (day), `ai/eye` (my), `ow` (now), `oy` (boy). Consonants: stops p b t d k g, hisses s z sh f v th h kh, ch j, hums m n ng, l r w y.
- `~` holds the previous syllable over another note (a melisma). Consonants start *before* the note, so the vowel lands on the beat.
- It is a synth voice: clear on short hooks (2–6 syllables), not a pop vocal. Double it with a lead instrument playing the same notes, and put the words on screen.

## Voiceover (engine/audio/voice.js)
Offline text-to-speech, placed on the timeline, with word times and a mouth track.
```js
const Voice = require('./engine/audio/voice');
const vo = Voice.speak([
  { at: T(1), text: 'Meet Pantrio.' },
  { at: T(3), text: 'Order karo, WhatsApp pe.', voice: 'Rishi', who: 'dad' },
], { out: path.join(__dirname, 'out'), length: DURATION });
MIX.duck([musicBus], vo.bus, { depth: 0.6 });   // the music dips about 8 dB only while someone talks
const mix = MIX.mixdown({ music: musicBus, voice: vo.bus }, { voice: 1 });
```
- Engines (auto-detected in this order; force one with `engine` or env `ANIM_TTS`): **kokoro** (python `kokoro`), **piper** (env `PIPER_MODEL`), **say** (macOS: Samantha, Daniel, Karen, Moira, Tessa; `Rishi`/`Aman` for Indian-English, `Lekha` Hindi, `Majed` Arabic), **espeak-ng**, else **none**: a silent placeholder with estimated word times, so the film still builds.
- Options per line: `voice`, `rate` (words per minute for `say`), `gain`, `pan`, `alt` (a second-language subtitle line), `who` (which character speaks, for lip-sync).
- It writes `out/voice.json`: lines with estimated word times, and a 30 fps mouth track (`open`, `wide`). How the times are estimated: with `say`, every word is also spoken on its own, separated by pauses, so its length can be measured. Those lengths are fitted to the real line and each boundary is moved to the nearest quiet moment. Other engines share the line's time by syllables. Expect small errors on fast speech; check the captions in `stills` or `preview`. Every line is cached in `out/.vo-cache`, so re-running song.js costs nothing.
- In film.js: `const VO = Studio.loadJSON('out/voice.json')` at boot, then `Subs.draw(ctx, t, Subs.fromVoice(VO), { style: 'pop' })` and `mouth: Subs.mouth(VO, t, 'dad')` on the speaking character. `render.js srt` exports the same words.
- Leave room: about 2.5 words per second, with ≥ 0.4 s between lines. Put hits between sentences, not on top of words.

## Cutting to your own song (`render.js analyze`)
```bash
node engine/render.js analyze assets/song.mp3 [--lrc assets/song.lrc] [--bpm 128] [--meter 3]
```
- It writes `out/analysis.json`, `beats.js` and `out/analysis.svg` (look at it). Contents: tempo, every beat, the bars, sections (intro/verse/chorus/break/outro with A/B letters), energy per bar, strong hits, and the LRC lyrics (with word times from enhanced `<mm:ss.xx>` tags).
- In index.html, add `<script src="beats.js"></script>` before score.js. In score.js:
  `const A = typeof module !== 'undefined' ? require('./beats.js') : globalThis.ANALYSIS;`
  `const clock = MUSIC.makeClock({ beats: A.beats, downbeat: A.downbeat, beatsPerBar: A.meter });`
  From then on `T(bar, beat)` sits on the song's real beats, even when a live band drifts.
- In song.js, the soundtrack is the song itself: `const mix = MIX.loadAudio('assets/song.mp3', { length: DURATION });`, optionally with your own hits on top, then `master` and `writeWav('out/music.wav')`.
- Lyric videos: `Subs.draw(ctx, t, A.lyrics, { style: 'karaoke' })`, and big type on `A.hits`.
- Accuracy: on the engine's own songs (known tempo), every beat was within 25 ms of the grid and the bar phase was always right. Pass `--bpm` if a song has a half- or double-time feel and the tempo comes out wrong.
- Use only music the user owns or has the rights to.

## Tempo changes (accelerando, ritardando)
`makeClock({ bpm: 100, tempo: [[0, 100], [8, 100], [16, 140]] })`: `[bar, bpm]` points, with linear ramps between them, integrated exactly. `T`, `beatPos`, `placeBar`, `eachStep` and `Genre.play` all follow it. A qawwali that speeds up to its climax is the classic use.

## Arrangement per section

- **Intro**: music box + soft pad (+ TV murmur). No drums.
- **Groove**: kick 1 & 3 (or four-on-the-floor), clap 2 & 4, shaker 8ths/16ths, hats on the "and", bass, offbeat plucks.
- **Setback**: stop the drums dead on the event; low `bwomp` + crowd "ooh".
- **Tension**: drone bass + dark pad, heartbeat on beats (lub-dub, 0.19s apart), sparse bells, clock ticks.
- **Build**: riser (`noiseSweep` 200 → 9000 Hz with a squared envelope), snare roll 4ths → 8ths → 16ths → 32nds, bass pulsing 8ths with rising brightness, swelling 3rds climbing each bar, orchestral hits (brass stab + tom + kick) on the cut-aways.
- **Silence**: `MIX.gate(mix, t0, t1)` on the master after reverbs, for half a beat to a full beat.
- **Drop**: crash + subBoom + kick, title letters as brass stabs, then the full anthem (brass hook + octave, four-on-the-floor, 16th hats, claps + snare, bass octaves, bright pad) with sidechain `MIX.sidechain([pad, bass, crowd], kickTimes)`.
- **Fill**: 8 toms in 16ths into the climax; the climax hit = kick + crash + big clap + subBoom + final chord.
- **Outro**: music box reprise, soft pad, soft sub root notes, resolve to maj9; `MIX.fadeOut` over the last 1.6s.

## Mix targets (measured with engine/tools/levels.js)

Section RMS of the final `music.wav` (after master, DRIVE 0.8):
| section | target RMS dB |
|---|---|
| intro | -19 to -17 |
| groove / match | -15 to -13 |
| tension | -16 to -14 |
| build | -15 → -13 rising |
| silence | -inf |
| drop / party | -12 to -11 |
| outro | -17 to -15 |

Stem balance in the loudest section (RMS dB, after GAIN): drums ≈ -13, brass (lead) ≈ -15, bass ≈ -15, crowd ≈ -25 (roar peaks ≈ -18 on the hit), choir ≈ -22, pad ≈ -24, keys texture ≈ -38. Integrated loudness: -14 to -11 LUFS (`ffmpeg -i out/music.wav -af ebur128 -f null -`). Useful starting GAIN table: `{ drums: 0.4, bass: 0.7, pad: 2.6, keys: 0.85, brass: 2.0, choir: 3.5, choirVerb: 3.0, crowd: 1.8, fx: 0.75 }`.

If the whole mix reads as one flat loudness (LRA < 3), the intro is too loud or the master is over-driven. Lower the intro instruments, not the drop.

Target loudness: `LUFS=-14 node song.js` (or `MIX.master(mix, 0.8, undefined, { lufs: -14 })`) solves the drive so the master lands on target (±0.2 LU, measured by `MIX.lufs`, which matches ffmpeg). Targets: -14 LUFS for YouTube/Spotify and other normalised platforms (louder masters just get turned down), -12 to -11 for X and social feeds that don't normalise, -16 for tender films that should stay soft. `levels.js` prints the integrated loudness under its table.

True peak: `MIX.master` limits the 4x-oversampled true peak to -1.5 dBTP by default, which survives AAC and platform resampling (-1.2 dBTP measured after AAC 256k). It costs about 0.1 LU of loudness. `check` must show Peak ≤ -1.0 dBFS on the final MP4.

Acoustic colour: `I.guitar(midi, dur, { bright: 0.3–0.8, sustain: 0.99–0.998 })` is a Karplus-Strong string whose loop delay is tuned with an allpass (±0.2 cents from E2 to C#6), with two body resonances (330 Hz, 1.9 kHz). It suits a warm lead, arpeggios and "every card is a note" gimmicks (lead GAIN ≈ 3–4, it is quieter than a synth). `I.epiano(midi, dur)` is an FM electric piano with a bell tine; pair it with the guitar for call-and-response (chat bubbles: the traveler on guitar panned right, the reply on e-piano panned left).

## Checking without ears

1. `levels.js` per stem per section (the table above).
2. Spectrograms: `ffmpeg -i out/music.wav -lavfi showspectrumpic=s=1800x500:legend=1:scale=log:fscale=log:stop=12000 spec.png`, then read the image. Look for sections, drum transients, the silence gap, and melodies as stepped horizontal lines.
3. Zoom into a stem (`-ss 40 -t 4`, `fscale=lin`, `stop=5000`). A choir should show clean harmonics shaped by formant bands.
4. Render takes ~20–60s; iterate freely.
