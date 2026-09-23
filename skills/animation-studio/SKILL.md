---
name: animation-studio
description: This skill should be used when the user asks to "make an animated video about X with music", "make a cartoon / animated short", "animate this story", "make a video like the Opus animations", "make an explainer animation", "make a promo video for my app / brand", or "make an animated Reel / TikTok / Short" — a new hand-drawn 2D film where every frame is drawn in code and the soundtrack is synthesized in code, synced from one score, delivered as a 1080p MP4 in 16:9, 9:16, 1:1 or 4:5. Not for CSS/web/UI animation, Lottie/SVG/GIF assets, editing or adding music to an existing video, or Remotion/Manim projects.
version: 0.5.0
---

# Animation Studio

Make short films (typically 15–60s at 30fps, in 16:9, 9:16, 1:1 or 4:5) where **every frame is drawn on a canvas and every sound is synthesized in JavaScript**. There are no samples, no stock footage and no npm dependencies. The signature trick is one `score.js` timeline that both the music and the animation read, so they cannot drift apart. Each ball touch plays a note, each letter stamps on an 8th note, and each firework bursts on the clap.

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
- whether the Claude mascot belongs (yes for Opus-style or Claude films; otherwise optional),
- where it will be posted: 16:9 for YouTube/X/presentations, **9:16 for Reels, TikTok and Shorts**, 1:1 or 4:5 for feeds. Ask if a brand/product/social brief doesn't say.

Characters are never fixed. Use a preset (`Ch.STYLES.afaq`, `Ch.STYLES.afaqFan`), customize `Ch.person` (hair, facial hair, glasses, outfit, build, colours), or build new characters (pets, robots, products) from `G.*` primitives. The cat in `examples/characters/cat.js` is the worked example. When the user shares a photo of someone to feature, translate it into `style` options and never store the photo. Real images the user provides can appear as taped prints via `G.photo`. See `references/custom-characters.md`.

### 1. Choose a story shape, then storyboard it as music

Pick the shape that fits the brief instead of defaulting to one. Every shape keeps the core idea (the picture makes the music), but the pacing, tempo and instruments change:

| shape | fits | pacing and music |
|---|---|---|
| **Big payoff** | sports, surprises, launches: any real "will it happen?" | quiet intro → tension → build → a beat of silence → loud drop → soft outro |
| **Comic escalation** | birthdays, pets, mishaps | the same gag three times, each bigger; bouncy 130–150 BPM, staccato plucks, cartoon SFX; a record-scratch stop before the punchline |
| **Tender memory** | anniversaries, thank-yous, farewells | 70–90 BPM, music box, pads, soft keys, no drums (or brushes); no drop; slow push-ins, warm light; ends on a held chord |
| **Montage** | trips, a year in review, celebrations | a steady groove, one shot per bar, energy rising every 4 bars; no silence |
| **Musical explainer** | products, ideas, how-tos | 100–110 BPM, one idea per bar, each with its own sound; ends on a sign-off |

The silence-and-drop is a tool, not a signature: use it only when the story has a real moment of suspense. Think in bars, not seconds (at 120 BPM, 1 beat = 0.5s and 1 bar = 2s), and put scene cuts on bar lines. Pick 3–5 **sync gimmicks** where the picture visibly makes the music, such as a ball that plays the melody, stars that are notes, or windows that light on 16ths. See `references/storytelling.md` for a bar map per shape and the gimmick catalogue.

Keep facts honest. If the film references real events whose details are unknown (a match result, a date), keep them fictional or generic.

### 2. Scaffold the project

```bash
node <skill-dir>/scripts/new-project.js <target-dir>
```

`<skill-dir>` is the absolute path shown as "Base directory for this skill" when this skill loaded (the folder containing this SKILL.md). Create `<target-dir>` as a new, descriptive kebab-case folder in the user's current working directory unless they name a location. The folder name becomes the output file name (`out/<folder-name>.mp4`). Never scaffold inside `<skill-dir>`. **Run every later command from inside `<target-dir>`**, prefixing each with `cd <target-dir> &&` because the shell's working directory may not persist.

If any preflight line shows ✗, stop. Tell the user what is missing and how to get it (e.g. `brew install ffmpeg`, Node 22+, or `CHROME_PATH=...` for a non-standard browser), and ask before installing anything.

Add `--format 9:16` (or `1:1`, `4:5`) for vertical or square films: the template lays itself out for any format. For a product, app or brand promo, start from `--from app-promo` instead: a 9:16 musical explainer built with the UI kit (phone mockup, app screens, chat, stats, end card) for a fictional app. Keep its structure, replace the brand, screens and story.

**Always start new stories from the template (or app-promo).** Both use the documented engine API (`MUSIC`, `MIX`, `Studio.film`, `UI`). `examples/world-cup-2026/` is a 58s reference film that predates that API: it has its own `T()`/`m()`, its own mixer and its own `window.renderAt`, and its `index.html` loads neither `engine/music.js` nor `engine/video/boot.js`. Read it for drawing and staging patterns (living-room set, TV match, crowd, lighting, paper wipes, close-ups, freeze frame, impact frames, handwritten ending) and port them into the template structure. Never mix the two styles in one project. Scaffold it with `--from world-cup-2026` only to re-render or remix that exact film.

### 3. Write `score.js`

Use `MUSIC.makeClock({ bpm, offset })` for `T(bar, beat)`, `placeBar` for 8th-note melody bars, and `makeChords` for harmony. Export `FPS`, `FORMAT` (`'16:9'` default, `'9:16'`, `'1:1'`, `'4:5'`), `DURATION`, `S` (named sections, used by the level meter and the storyboard labels) and every event list. Any randomness (popcorn kernels, fireworks, crowd voices) is generated here with a seeded `U.mulberry32`, so the audio and the video see identical events. Keep the template's UMD wrapper and its last line (`if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;`): `song.js` and `render.js` `require()` score.js, while `index.html` loads it as a script.

Name the key moments in a `markers` object and export it: `markers: { land: { t: ev.land, sync: 'av' }, drop: { t: ev.drop, sync: 'av' }, outro: ev.end }`. Every render command then accepts `@land`, `@drop-2` or `@drop+0.5` (and `8:2` for bar 8, beat 2) instead of raw seconds. Give `sync: 'av'` to the hits (landings, cuts, stamps, drops, flashes) so `render.js verify` measures them; `'a'` is sound only, `'v'` picture only. Moments without a hit (a slow fade, a silence) stay plain times.

### 4. Write `song.js` and measure it

Render parts into buses (`drums, bass, pad, keys, brass, choir, crowd, fx`), add reverb/delay sends, sidechain pads and bass to the kick in energetic sections, then run `MIX.mixdown → highpass → gate (only if the shape uses a silence; applied after reverbs) → fadeOut → master → writeWav`. Instruments live in `engine/audio/instruments.js`. Recipes and mix targets are in `references/music-cookbook.md`.

For acoustic colour there are `I.guitar(midi, dur, {bright, sustain})` (a plucked string, in tune to a fraction of a cent) and `I.epiano(midi, dur)` (a warm FM electric piano); call-and-response between them suits chats and conversations.

**The model cannot hear the result, so measure it.** Run `STEMS=1 node song.js && node engine/tools/levels.js out/music.wav out/stem-*.wav` for RMS/peak per stem per section. Then compare against the targets in the cookbook: for a big-payoff film, a quiet intro around -19 dB RMS, the drop around -11, and any silence truly `-inf`; tender films stay gentler throughout. Check the integrated loudness (-14 to -11 LUFS): `levels.js` prints it. To hit an exact loudness, run `LUFS=-14 node song.js`, which makes `MIX.master` solve for it (use -14 for YouTube/Spotify-normalised platforms, -12 to -11 for X and feeds). `MIX.master` also limits the true peak to -1.5 dBTP, so the file will not clip when platforms re-encode it. Render spectrograms (`showspectrumpic`) and read them to confirm structure: notes, silences, and drums entering where planned. Fix balance with the `GAIN` table, not by guessing.

### 5. Write `film.js`

Call `Studio.film({ draw(ctx, t) {...}, post, init })`. Every visual is a **pure function of t**, so any frame can render in any order on any worker. Build characters with `Ch.claude(ctx, {...})` (the orange block mascot: eyes, arms, squash/stretch, scarf, mouth) and `Ch.person(ctx, {..., style: {...}})` (see `references/custom-characters.md`). Pose people by hand targets, since arms use 2-bone IK. Draw everything with `G.*` so lines boil at 12fps and fills get pencil hatching; the key calls are `G.rrect/ellipse/poly/line/limb`, `G.caption`, `G.bubble`, `G.confetti`, `G.firework`, `G.star` and `G.rays`. Drive motion from the clock: `hop()` lands on beats, squash on the downbeat, cuts on bar lines. If the film grows beyond film.js, add each new file as a `<script>` after `engine/video/boot.js` in index.html. See `references/visual-style.md` and `references/engine-api.md`.

Lay everything out from `G.W` / `G.H` (the score's format), never from hard-coded 1920×1080 numbers, and keep text, faces and logos inside `G.SAFE`. On 9:16 the platforms cover the top ~11%, the bottom ~22% and the right edge with their own UI. For products and brands, draw the app with the UI kit (`UI.phone`, `UI.card`, `UI.pill`, `UI.button`, `UI.chat`, `UI.stat`, `UI.check`, `UI.ring`, `UI.iris`) after `UI.setTheme({ accent, … })` with the brand's colours. Real-app UI goes in the clean system font inside the phone; the world around it stays hand-drawn. Use only facts and numbers the client confirms, and put a real logo in with `Studio.loadImage` + `UI.logo`.

### 6. Review like a director (loop until it's good)

```bash
cd <target-dir> && node engine/render.js stills @drop 8:2 12.5    # key moments -> out/stills/
cd <target-dir> && node engine/render.js sheet 0 <DURATION> 30 6  # 30 frames across the whole film -> out/sheet.png
cd <target-dir> && node engine/render.js clip @drop-2 @drop+3     # that section WITH sound -> out/clip_*.mp4
```

Read the PNGs and critique every shot: legibility, faces hidden by props, colours too dark or muddy, overlapping text, poses that read wrong (seated vs standing), elbows bending inward, clutter. Also check transitions and hand-offs (a frame just before and after each cut), because that is where overlaps and half-drawn wipes hide. Fix, then re-render the same times. Use `clip` to judge timing and motion on one section in seconds instead of re-rendering the whole film. Before animating people, run `node engine/render.js cast` and read `out/cast.png`: every character from `globalThis.CAST` (set it in film.js: `{ name: style }`), each in 6 expressions and poses. Hidden eyes, clashing colours and poses that don't read show up here first. Render commands also warn if a film file uses `Math.random`, `Date.now` or `performance.now`; fix those, because frames must be a pure function of t.

**Let the user watch and listen before the full render.** Run `node engine/render.js preview` with `run_in_background: true` and give the user the printed `http://127.0.0.1:<port>/__preview` link. It plays the music and draws the film live, with a timeline of sections and markers (space play, ←/→ beat, [ ] marker, L loop section). You can't watch it yourself (`preview --check` only tests that it loads). The port is OS-assigned, never a fixed one like 3000. When they're done, stop that background task, and only that one.

Before the full render, run `node engine/render.js board` (every marker as one labelled storyboard, `out/board.png`), give the user its path, the preview link and the music measurements, and let them approve or redirect. The full render costs minutes; a change of mind after it costs a second render.

### 7. Render, mux, verify

```bash
cd <target-dir> && node song.js
cd <target-dir> && node engine/render.js video      # parallel workers -> out/video.mp4
cd <target-dir> && node engine/render.js mux        # -> out/<folder-name>.mp4 (H.264 CRF18 + AAC 256k)
cd <target-dir> && node engine/render.js check      # -> out/check-sheet.png + loudness / LRA / peak
cd <target-dir> && node engine/render.js verify     # sound + picture measured at every sync marker (exit 1 if off)
```

`video` verifies the encoded frame count and `mux` verifies the final file has picture + sound at the right duration; any ffmpeg failure stops the run with an error. `render.js video` runs for minutes (about 7 min for 58s on 8 cores), longer than the Bash tool's default 2-minute timeout. Launch it with `run_in_background: true`, check its `frames … eta` output, and wait for `out/video.mp4 done` before running `mux`. For sharing, `clip @drop-2 @drop+2 --gif` also writes a GIF (480px on the short side, 12fps). After the final file exists, cut 10fps strips around fast moments: `ffmpeg -ss <t> -t 1.2 -i out/<name>.mp4 -vf "fps=10,scale=480:-1,tile=4x3" -frames:v 1 out/strip.png`. `verify` decodes the final MP4 and, for each `sync` marker, finds the steepest rise in the sound (must be within ±20 ms) and the biggest change in the picture (must be the first frame at or after the marker, ±1 frame). A ✗ means one side is late: fix it in `score.js`, never by nudging one side by hand. A `?` means nothing distinct happens there; make the moment a clear hit or drop its `sync` flag.

### 8. Deliver

Report the output path, duration, resolution and size. Explain the sync gimmicks in one or two sentences. State plainly that the audio was verified by measurement rather than listening, and invite feedback on the sound. Offer variations: team/brand colours, names, a different length or tempo, or another format (a 9:16 cut for Reels/TikTok/Shorts means re-laying out the shots, not cropping).

## Rules that prevent the usual failures

- **Single source of truth.** Never time a sound or an animation by hand in two places. Add the event to `score.js` and read it from both sides.
- **Determinism.** Use `U.hash(...)` / seeded `mulberry32` only, never `Math.random()`. Parallel workers must draw identical frames.
- **Hand-drawn feel.** `Studio` calls `G.setTime(t)`, so lines re-jitter 12 times per second. Keep the paper-grain post pass on. Rotate captions slightly and tape them on.
- **Impact frames.** Put sunbursts *behind* characters by drawing them earlier in `draw()` (the example's film/room.js passes a `beforeChars` callback for this). Never draw thick black rays over faces.
- **Silence is a tool.** In a big-payoff film, a half-beat of true silence (gate the master after the reverbs) plus a drained freeze frame makes the drop land twice as hard. Other shapes rarely need it.
- **Draw order.** Draw captions before full-screen wipes. After clipping to hatch, rebuild the path before stroking (the toolkit already does this).
- **Safety on the user's machine.** The renderer's file server and every Chrome debug port are OS-assigned (no fixed ports), it serves only files inside the project folder, and it only ever kills the Chrome process groups it launched itself. Never kill anything else; other Claude sessions may be rendering at the same time. Never touch the user's dev servers or ports. Ask before git commits, pushes, publishing, or installing anything.

## Additional Resources

### Reference files
- **`references/storytelling.md`**: story arcs mapped to bars, sync-gimmick catalogue, caption voice, endings
- **`references/music-cookbook.md`**: instrument recipes, arrangement per section, mix/loudness targets, crowd and choir synthesis
- **`references/visual-style.md`**: palette, boil, hatching, lighting with multiply gradients, camera, transitions, character acting
- **`references/custom-characters.md`**: presets, every `Ch.person` style option, building new characters, using real images
- **`references/engine-api.md`**: every function in the engine with parameters
- **`references/review-and-gotchas.md`**: review commands, sync verification, known pitfalls and fixes

### Starting points
- **`template/`** (start here, any format): a 23s starter. Claude drops onto a paper stage and bounces on every beat. Each melody note pops a star, so the melody draws a constellation. Then a held breath, a sunburst drop and a handwritten ending.
- **`examples/app-promo/`** (brand and app promos): a 20s 9:16 promo for "Pantrio", a fictional recipe app. A fridge opens on the downbeat, then four app steps, one bar each, each with its own gimmick: ingredients recognised on 8ths, recipe cards on beats, steps ticked off per beat, chat call-and-response on guitar vs e-piano. Then a held breath, the plate landing on the drop, stats, and a logo end card.
- **`examples/characters/cat.js`**: a complete custom character (`Ch.cat`) built from primitives
- **`examples/world-cup-2026/`** (patterns only, older API): the 58s film "Claude × Afaq, World Cup 2026". It covers a living room, a TV match where the ball plays the hook, tension with a heartbeat, strike and close-ups, a freeze, GOOOOOAL letters on 8ths, a party, a street chant, a high-five and an outro.

### Scripts
- **`scripts/new-project.js`**: scaffold a project (engine + template or example; `--format 9:16|1:1|4:5`, `--from app-promo`) with a preflight check
- **`scripts/smoke-test.js`**: end-to-end engine check (true-peak limiter, render, mux, markers, board, clip, verify, a crashing ffmpeg, two renders in one folder); run it after changing the engine
- **`engine/render.js`**: `stills | sheet | board | clip [--gif] | preview | cast | video | mux | check | verify`; times as seconds, `bar:beat` or `@marker±sec`
- **`engine/tools/levels.js`**: per-section RMS/peak meter for the mix and stems
