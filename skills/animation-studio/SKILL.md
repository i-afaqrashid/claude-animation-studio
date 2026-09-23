---
name: animation-studio
description: This skill should be used when the user asks to "make an animated video about X with music", "make a cartoon / animated short", "animate this story", "make a video like the Opus animations", or "make an explainer animation" — a new hand-drawn 2D film where every frame is drawn in code and the soundtrack is synthesized in code, synced from one score, delivered as a 1080p MP4. Not for CSS/web/UI animation, Lottie/SVG/GIF assets, editing or adding music to an existing video, or Remotion/Manim projects.
version: 0.1.0
---

# Animation Studio

Make short films (typically 20–60s, 1920×1080, 30fps) where **every frame is drawn on a canvas and every sound is synthesized in JavaScript**. There are no samples, no stock footage and no npm dependencies. The signature trick is one `score.js` timeline that both the music and the animation read, so they cannot drift apart. Each ball touch plays a note, each letter stamps on an 8th note, and each firework bursts on the clap.

Requirements: Node 22+ (built-in WebSocket), ffmpeg, Google Chrome/Chromium (headless). No `npm install`. Supported on macOS and Linux.

## How a film is built

```
my-film/
├── score.js    the timeline: tempo, chords, melody, and EVERY event (single source of truth)
├── song.js     synthesizes the soundtrack from score.js    -> out/music.wav
├── film.js     draws frame t from score.js                  (pure function of t)
├── index.html  loads engine + score + film in headless Chrome
└── engine/     vendored toolkit (synth, drawing, renderer) — copied in, never edited per film
```

The renderer serves the project over a local HTTP server on an OS-assigned port. It drives parallel headless Chrome workers over the DevTools protocol, calls `window.renderAt(t)` for every frame, and pipes PNGs to ffmpeg.

## Workflow

### 0. Pin down the brief

From the request, or with at most one round of questions, settle:
- the subject and the emotional arc,
- the length (default 20–40s),
- who appears, including exact name spellings for jerseys and signatures,
- whether the Claude mascot belongs (yes for Opus-style or Claude films; otherwise optional).

For subjects with no built-in character (pets, vehicles, products, places), build them in `film.js` from `G.ellipse/rrect/poly/limb` so they boil and hatch like everything else.

### 1. Write the storyboard as music first

Think in bars, not seconds. At 120 BPM, 1 beat = 0.5s and 1 bar = 2s. Map story beats to song sections before writing code: intro (quiet, 2–4 bars), rising action, tension (strip the drums, use a heartbeat), build (riser + accelerating snare roll), **a beat of total silence**, the drop/payoff (loudest, fullest), and a soft outro that reprises the hook. Put every scene cut on a bar line. Pick 3–5 **sync gimmicks** where the picture visibly makes the music, such as a ball that plays the melody, stars that are notes, or windows that light on 16ths. See `references/storytelling.md` for arcs, bar maps and a gimmick catalogue.

Keep facts honest. If the film references real events whose details are unknown (a match result, a date), keep them fictional or generic.

### 2. Scaffold the project

```bash
node <skill-dir>/scripts/new-project.js <target-dir>
```

`<skill-dir>` is the absolute path shown as "Base directory for this skill" when this skill loaded (the folder containing this SKILL.md). Create `<target-dir>` as a new, descriptive kebab-case folder in the user's current working directory unless they name a location. The folder name becomes the output file name (`out/<folder-name>.mp4`). Never scaffold inside `<skill-dir>`. **Run every later command from inside `<target-dir>`**, prefixing each with `cd <target-dir> &&` because the shell's working directory may not persist.

If any preflight line shows ✗, stop. Tell the user what is missing and how to get it (e.g. `brew install ffmpeg`, Node 22+, or `CHROME_PATH=...` for a non-standard browser), and ask before installing anything.

**Always start new stories from the template.** It uses the documented engine API (`MUSIC`, `MIX`, `Studio.film`). `examples/world-cup-2026/` is a 58s reference film that predates that API: it has its own `T()`/`m()`, its own mixer and its own `window.renderAt`, and its `index.html` loads neither `engine/music.js` nor `engine/video/boot.js`. Read it for drawing and staging patterns (living-room set, TV match, crowd, lighting, paper wipes, close-ups, freeze frame, impact frames, handwritten ending) and port them into the template structure. Never mix the two styles in one project. Scaffold it with `--from world-cup-2026` only to re-render or remix that exact film.

### 3. Write `score.js`

Use `MUSIC.makeClock({ bpm, offset })` for `T(bar, beat)`, `placeBar` for 8th-note melody bars, and `makeChords` for harmony. Export `FPS`, `DURATION`, `S` (named sections, used by the level meter) and every event list. Any randomness (popcorn kernels, fireworks, crowd voices) is generated here with a seeded `U.mulberry32`, so the audio and the video see identical events. Keep the template's UMD wrapper and its last line (`if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;`): `song.js` and `render.js` `require()` score.js, while `index.html` loads it as a script.

### 4. Write `song.js` and measure it

Render parts into buses (`drums, bass, pad, keys, brass, choir, crowd, fx`), add reverb/delay sends, sidechain pads and bass to the kick in energetic sections, then run `MIX.mixdown → highpass → gate (silence before the drop, applied after reverbs) → fadeOut → master → writeWav`. Instruments live in `engine/audio/instruments.js`. Recipes and mix targets are in `references/music-cookbook.md`.

**The model cannot hear the result, so measure it.** Run `STEMS=1 node song.js && node engine/tools/levels.js out/music.wav out/stem-*.wav` for RMS/peak per stem per section. Then compare against the targets in the cookbook: quiet intro around -19 dB RMS, drop around -11, and silence truly `-inf`. Check the integrated loudness (-14 to -11 LUFS) with ffmpeg `ebur128`. Render spectrograms (`showspectrumpic`) and read them to confirm structure: notes, silences, and drums entering where planned. Fix balance with the `GAIN` table, not by guessing.

### 5. Write `film.js`

Call `Studio.film({ draw(ctx, t) {...}, post, init })`. Every visual is a **pure function of t**, so any frame can render in any order on any worker. Build characters with `Ch.claude(ctx, {...})` (the orange block mascot: eyes, arms, squash/stretch, scarf, mouth) and `Ch.person(ctx, {..., style: { name, number, skin, shirt, ... }})`. Pose people by hand targets, since arms use 2-bone IK. Draw everything with `G.*` so lines boil at 12fps and fills get pencil hatching; the key calls are `G.rrect/ellipse/poly/line/limb`, `G.caption`, `G.bubble`, `G.confetti`, `G.firework`, `G.star` and `G.rays`. Drive motion from the clock: `hop()` lands on beats, squash on the downbeat, cuts on bar lines. If the film grows beyond film.js, add each new file as a `<script>` after `engine/video/boot.js` in index.html. See `references/visual-style.md` and `references/engine-api.md`.

### 6. Review like a director (loop until it's good)

```bash
cd <target-dir> && node engine/render.js stills <t1> <t2> ...     # key moments from score.js ev -> out/stills/
cd <target-dir> && node engine/render.js sheet 0 <DURATION> 30 6  # 30 frames across the whole film -> out/sheet.png
```

Read the PNGs and critique every shot: legibility, faces hidden by props, colours too dark or muddy, overlapping text, poses that read wrong (seated vs standing), elbows bending inward, clutter. Fix, then re-render the same times.

### 7. Render, mux, verify

```bash
cd <target-dir> && node song.js
cd <target-dir> && node engine/render.js video      # parallel workers -> out/video.mp4
cd <target-dir> && node engine/render.js mux        # -> out/<folder-name>.mp4 (H.264 CRF18 + AAC 256k)
cd <target-dir> && node engine/render.js check      # -> out/check-sheet.png + loudness / LRA / peak
```

`render.js video` runs for minutes (about 7 min for 58s on 8 cores), longer than the Bash tool's default 2-minute timeout. Launch it with `run_in_background: true`, check its `frames … eta` output, and wait for `out/video.mp4 done` before running `mux`. After the final file exists, cut 10fps strips around fast moments: `ffmpeg -ss <t> -t 1.2 -i out/<name>.mp4 -vf "fps=10,scale=480:-1,tile=4x3" -frames:v 1 out/strip.png`. Verify sync numerically at the biggest hit: the audio onset and the brightest frame in the final MP4 must both land on the score's timestamp (commands in `references/review-and-gotchas.md`).

### 8. Deliver

Report the output path, duration, resolution and size. Explain the sync gimmicks in one or two sentences. State plainly that the audio was verified by measurement rather than listening, and invite feedback on the sound. Offer variations: team/brand colours, names, a different length or tempo. Do not offer 9:16, because the engine is fixed at 1920×1080.

## Rules that prevent the usual failures

- **Single source of truth.** Never time a sound or an animation by hand in two places. Add the event to `score.js` and read it from both sides.
- **Determinism.** Use `U.hash(...)` / seeded `mulberry32` only, never `Math.random()`. Parallel workers must draw identical frames.
- **Hand-drawn feel.** `Studio` calls `G.setTime(t)`, so lines re-jitter 12 times per second. Keep the paper-grain post pass on. Rotate captions slightly and tape them on.
- **Impact frames.** Put sunbursts *behind* characters by drawing them earlier in `draw()` (the example's film/room.js passes a `beforeChars` callback for this). Never draw thick black rays over faces.
- **Silence before the payoff.** A half-beat of true silence (gate the master after the reverbs) plus a drained freeze frame makes the drop land twice as hard.
- **Draw order.** Draw captions before full-screen wipes. After clipping to hatch, rebuild the path before stroking (the toolkit already does this).
- **Safety on the user's machine.** The renderer binds an OS-assigned port and Chrome debug ports 9300–9700, and only kills the Chrome processes it launched. Never kill anything else. Never touch the user's dev servers or ports. Ask before git commits, pushes, publishing, or installing anything.

## Additional Resources

### Reference files
- **`references/storytelling.md`**: story arcs mapped to bars, sync-gimmick catalogue, caption voice, endings
- **`references/music-cookbook.md`**: instrument recipes, arrangement per section, mix/loudness targets, crowd and choir synthesis
- **`references/visual-style.md`**: palette, boil, hatching, lighting with multiply gradients, camera, transitions, character acting
- **`references/engine-api.md`**: every function in the engine with parameters
- **`references/review-and-gotchas.md`**: review commands, sync verification, known pitfalls and fixes

### Starting points
- **`template/`** (start here): a 23s starter. Claude drops onto a paper stage and bounces on every beat. Each melody note pops a star, so the melody draws a constellation. Then a held breath, a sunburst drop and a handwritten ending.
- **`examples/world-cup-2026/`** (patterns only, older API): the 58s film "Claude × Afaq, World Cup 2026". It covers a living room, a TV match where the ball plays the hook, tension with a heartbeat, strike and close-ups, a freeze, GOOOOOAL letters on 8ths, a party, a street chant, a high-five and an outro.

### Scripts
- **`scripts/new-project.js`**: scaffold a project (engine + template) with a preflight check
- **`engine/render.js`**: `stills | sheet | video | mux | check`
- **`engine/tools/levels.js`**: per-section RMS/peak meter for the mix and stems
