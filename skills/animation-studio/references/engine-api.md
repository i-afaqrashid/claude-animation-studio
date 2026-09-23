# Engine API

All engine files are UMD-style IIFEs: `require()` in Node, globals in the browser (`U`, `MUSIC`, `G`, `Ch`, `Studio`). Load order in `index.html`: `engine/util.js`, `engine/music.js`, `score.js`, `engine/video/gfx.js`, `engine/video/chars.js`, `engine/video/ui.js`, `engine/video/shots.js`, `engine/subs.js`, `engine/video/boot.js`, then film files (template layout; the world-cup example boots itself and skips music.js and boot.js).

## util.js (`U`)
`mulberry32(seed)` → rng() · `hash(...xs)` → [0,1) stateless · `noise1(x, seed)` smooth −1…1 · `clamp lerp invLerp remap smooth` · `ease.{linear,inQuad,outQuad,inOutQuad,inCubic,outCubic,inOutCubic,outQuart,inQuart,outExpo,inExpo,outBack(t,s),inBack,outElastic,outBounce}` · `tween(t, t0, t1, a, b, ease)` · `keys(t, [[t, v, ease?], ...])` keyframes · `springKick(t, t0, freq, decay)` (starts at 0) · `pulse(t, t0, decay)` (1 at t0, decays) · `FORMATS` (`'16:9'` 1920×1080, `'9:16'` 1080×1920, `'1:1'` 1080×1080, `'4:5'` 1080×1350) · `formatSize(format | [w, h])` → `[w, h]` (even sizes) · `safeArea(w, h)` → `{x, y, w, h}` (9:16: top 11.5%, bottom 22%, right 140px reserved for platform UI; else a 5% margin) · `pickFormat(default)` → the `--format` override if a render asked for one, else the default.

## music.js (`MUSIC`)
`m('Bb3')` → 58 · `mtof(midi)` · `makeClock({bpm, offset, beatsPerBar})` → `{BEAT, BAR, OFFSET, T(bar, beat), beatPos(t), phase(t), eachStep(bar0, bar1, stepsPerBar, fn(t, bar, step))}` · `placeBar(clock, bar8ths, bar, transpose)` → `[{t, dur, midi}]` · `makeChords(clock, table, rows)` → `{chords:[{t0,t1,bar,name,notes,bass}], chordAt(t)}`.

## audio/dsp.js
`SR = 48000` · `new Bus(n)` with `.addMono(buf, t, gain, pan)`, `.addStereo(L, R, t, gain)`, `.mixInto(dst, gain)`, `.applyGain(fn(t))` · `rng(seed)` white −1…1 · `new Pink(seed).next()` · oscillators `new Saw()/Square(ph, pw)/Sine()` `.next(freq)` (PolyBLEP) · `new SVF()` `.lp/.hp/.bp(x, cutoff, q)` (bp = unity peak) · `new OnePole()` `.lp/.hp(x, hz)` · `adsr(t, dur, a, d, s, r)` · `expDecay(t, tau)` · `reverb(bus, {room, damp, predelay, hp, lp})` → wet Bus (Freeverb) · `pingpong(bus, time, fb, lpHz)` → wet Bus.

## audio/instruments.js (`I`)
Return a mono Float32Array unless noted.
- Drums: `kick({punch, tail, seed})`, `snare({tone, snap, decay})`, `clap({decay, spread})`, `hat(open, seed)`, `crash(seed)`, `tom(freq, decay)`, `shaker(accent)`, `bell(freq, decay, index, ratio)`
- Tonal: `bass(midi, dur, {bright, sub})`, `padNote(midi, dur, {cutoff, attack, release, detune})` → `{L,R}`, `pluck(midi, {decay, cutoff})` (synth skank), `guitar(midi, dur, {bright, sustain, seed})` (Karplus-Strong plucked string, tuned by an allpass, two body resonances), `epiano(midi, dur, {index, decay})` (FM electric piano), `musicBox(midi, {decay})`, `marimba(midi, {decay, thock})`, `brassNote(midi, dur, {bright, stab, seed})` → `{L,R}`
- South Asian: `dholak(stroke: 'ghe'|'ka'|'na'|'tit', {pitch, seed})` (two-headed barrel drum; `ghe` bass with a falling pitch), `tabla(stroke: 'na'|'tin'|'ge'|'ka'|'dha', {midi, seed})` (tuned dayan, gliding bayan), `harmonium(midi, dur, {attack, release, detune, bright, seed})` → `{L,R}` (two beating reeds + bellows tremolo), `ting(midi, {gap})` (a generic two-tone message chime)
- Voice: `voice(midi, dur, {syl: 'o'|'le'|'e'|'a'|'u', type: 'tenor'|'alto', seed, vib, glide, breath, shout})`
- FX: `noiseSweep(len, f0, f1, {q, shape(x), pink})`, `boing()`, `thud(freq, decay)`, `paperFwip(pitch)`, `tvClick()`, `whistle(len)`, `bwomp()`, `heartbeat()`, `woodTick(pitch)`, `thwack()`, `subBoom(len, f0, f1)`, `pop(pitch)`, `fireworkBurst(seed, size)`, `launchWhistle(len)`, `scribble(len)`

## audio/mix.js (`MIX`)
`sidechain(buses, kickTimes, {depth, release})` · `gate(bus, t0, t1)` hard silence · `fadeOut(bus, t0, t1)` · `highpass(bus, hz)` · `master(bus, drive=0.8, ceiling=0.84, {truePeak=true, lufs=null})` glue comp + 4ms lookahead limiter on the TRUE peak (4x-oversampled estimate; 0.84 ≈ -1.5 dBTP, so AAC and platform resampling never clip; `{truePeak:false}` with 0.93 = the v0.2 sample-peak limiter); with `lufs: -14` it solves the drive so the master lands at that integrated loudness (±0.2 LU) and returns `{drive, lufs}` · `lufs(bus)` → integrated loudness (BS.1770 K-weighting + gating, matches ffmpeg ebur128) · `writeWav(file, bus)` 32-bit float · `mixdown(stems, gains, {stemDir})` → Bus.

## video/gfx.js (`G`)
- Frame: `G.W`, `G.H` (from `SCORE.FORMAT`, 1920×1080 by default; score.js loads before gfx.js), `G.SAFE` (`U.safeArea`), `G.setTime(t)` (sets `G.t`, `G.boil`), `G.C` palette, `G.rnd(...)` hash
- Points: `rrPts(x, y, w, h, r, step)`, `ellPts(cx, cy, rx, ry)`, `polyPts(corners, step)`, `path(ctx, pts, closed)`, `wobble(pts, seed, amp)`
- Drawing: `shape(ctx, pts, {fill, stroke, lw, seed, amp, hatch:{color,gap,angle,lw}, closed, alpha, second})` · `rrect(ctx, x, y, w, h, r, o)` · `ellipse(ctx, cx, cy, rx, ry, o)` · `poly(ctx, corners, o)` · `line(ctx, pts, {color, lw, seed, amp, step, alpha})` · `limb(ctx, pts, {color, lw, outline})` outlined noodle · `hatch(ctx, bbox, o)`
- Paper: `tornPaper(ctx, x, y, w, h, {fill, seed, shadow, edge, tear})` · `tape(ctx, x, y, w, h, rot, seed)`
- Text: `text(ctx, str, x, y, {size, fam, weight, color, align, baseline, boil, alpha, stroke, strokeW, lang})` · `measure(ctx, str, size, fam, weight, lang)`: any script (Urdu/Arabic/Hindi runs get their fonts, RTL runs are laid out in reading order; `fam` may be a CSS stack) · `layoutText(ctx, str, opts)` → `{runs, total, rtlBase}` · `drawRuns(ctx, lay, x, y, opts)` · `runs(str)` · `isRTL(str)` · `decor(fn)` (text drawn inside is ignored by the visual QA) · `caption(ctx, {t, end, text, x, y, rot, size, small}, t)` · `bubble(ctx, text, x, y, tailX, tailY, t, t0, t1, {size})`
- Images: `photo(ctx, img, x, y, w, h, {rot, caption, border, tape, seed})` taped paper print of a user image
- FX: `confetti(ctx, t, t0, {n, seed, spawn, fall, x0, x1})` · `firework(ctx, f, t, x, y, scale)` with `f = {t, launch, seed, size, color, color2}` · `rays(ctx, cx, cy, {n, r0, r1, color, lw, alpha, spin})` · `star(ctx, x, y, r, {fill, rot})` · `heart(ctx, x, y, s)`
- Textures: `initTextures()` (Studio calls it), `post(ctx, t, {paper, vignette, grain})`, `makeCanvas(w, h)`

## video/chars.js (`Ch`)
- `Ch.claude(ctx, {x, y (feet), s, sx, sy, rot, eyes: 'normal'|'happy'|'closed'|'wide'|'focus'|'worried', eyeScale, look, lookY, blink, armL, armR (radians, + = up), mouth: 'none'|'open'|'smile'|'o', blush, scarf, scarfWave, legKick, shadow})` (body 210×145 + legs 46 at s=1)
- `Ch.person(ctx, {x, y, pose: 'sit'|'stand', s, sx, sy, rot, headRot, headX, headY, eyes: 'normal'|'happy'|'closed'|'sleep'|'wide', look, lookY, blink, brows: 'neutral'|'worried'|'up'|'determined', mouth: 'flat'|'wavy'|'smile'|'smirk'|'grin'|'open'|'o'|'sleep', handL, handR ([x,y] targets), crossArms, knee: [liftL, liftR], pillow (0..1), scarf, blanket, sweat, blush, legBend, style})`. The full `style` table (hairStyle, facialHair, glasses, outfit, bottoms, build, …) is in `references/custom-characters.md`. Presets: `Ch.STYLES.afaq`, `Ch.STYLES.afaqFan`. Swatches: `Ch.SKIN_TONES`, `Ch.HAIR_COLORS`. Helper: `Ch.shade(hex, factor)`. Sit origin = hips on the seat; stand origin = feet. Shoulders at y ≈ −156 (sit) / −306 (stand); arm reach ≈ 162.
- `Ch.player(ctx, {x, y, s, kit: 'home'|'away'|'gk', facing, pose: 'run'|'stand'|'kick'|'lunge'|'dive'|'celebrate', phase, kick (0..1), num, alpha, seed})` · `Ch.ball(ctx, x, y, r, spin, {shadowY})` · `Ch.scarf(ctx, x, y, w, wave, seed)` · `Ch.ik(S, P, a, b, bend)`

## video/ui.js (`UI`): product and brand UI
Crisp app UI (system font) for promos; every call is a pure function of its arguments and `t`.
- Theme: `UI.theme` `{accent, accent2, ok, ink, muted, onAccent, app, card, line, shadow, font}` · `UI.setTheme({...})` once at the top of film.js (never per frame).
- Timing: `UI.pop(t, t0, dur=0.28, s=2.2)` (0 → overshoot → 1) · `UI.fadeIn(t, t0, d)`
- Text: `UI.text(ctx, str, x, y, {size, weight, color, align, italic, spacing, alpha, base, font, maxW})` (`maxW` shrinks to fit) · `UI.measure(ctx, str, size, weight, spacing)` · `UI.fit(ctx, str, maxW, size, weight)`
- Surfaces: `UI.card(ctx, x, y, w, h, r, {fill, stroke, shadow})` · `UI.pill(ctx, x, y, text, {bg, fg, size, h, weight})` → width · `UI.skeleton(ctx, x, y, w, h, t)` loading bar
- Interaction: `UI.tap(ctx, x, y, t, t0, {color, size})` ripple · `UI.button(ctx, cx, cy, w, h, label, t, {tTap, done, bg, doneBg})` · `UI.check(ctx, x, y, r, p)` tick drawn as p goes 0→1 · `UI.ring(ctx, cx, cy, r, u, {color, track, lw})`
- Phone: `UI.phone(ctx, cx, cy, h, screen(ctx, w, h, t), t, {rot, time, bezel, shadow, sketch, dark})`: the screen is 412 points wide (`UI.PHONE_W`), status bar drawn on top (`dark` for dark screens) · `UI.navBar(ctx, w, h, items, active)` · `UI.header(ctx, w, title, {kicker, y})`
- Chat: `UI.chat(ctx, w, [{t, who: 'me'|'them', text}], t, {y0, typing, size})` bubbles pop at their `t`, typing dots before 'them' → y below the last bubble
- Numbers: `UI.stat(ctx, cx, cy, w, h, big, small, t, t0, {color, rot})`
- Transitions: `UI.iris(ctx, t, tc, {cx, cy, dur, color})` circle wipe (closed at `tc`) · `UI.logo(ctx, img, cx, cy, size, t, t0)`

## video/boot.js (`Studio`)
`Studio.film({ draw(ctx, t), post: {paper, vignette, grain} | fn(t), fadeOut = 1.6, init(ctx), duration })` · `Studio.loadImage('assets/x.png')` → Promise<Image> · `Studio.loadJSON('out/voice.json')` → object or null · `Studio.loadFont(family, src, weight)` · `Studio.cache(key, drawFn, {variants = 3})` → a canvas of a static layer (draw it with `ctx.drawImage(c, 0, 0, G.W, G.H)`) · `Studio.brand` (brand.json, with `logoImg`) · `Studio.brandTheme(brand)` · `window.renderAt(t, fmt, scale)` · `window.probeAt(t, scale)` → every drawn text with box, size, colour, contrast (await them in `init` where async). It sizes the canvas to the score's format, loads the fonts, builds the textures, defines `window.renderAt(t)` (setTime → clear → draw → post → fade → PNG) and sets `window.READY`.

## score.js `markers` (optional, recommended)
`markers: { name: t | { t, sync: 'av' | 'a' | 'v' } }` exported on `SCORE`. Every render.js time argument accepts seconds (`12.5`), `bar:beat` from the score clock (`8:2` = `T(8, 2)`, needs `SCORE.T`) or `@name` with an optional offset in seconds (`@drop`, `@drop-2`, `@drop+0.5`). A bad time fails before Chrome starts.

## scripts/new-project.js
`node new-project.js <dir> [--format 16:9|9:16|1:1|4:5] [--from app-promo|world-cup-2026]`. `--format` rewrites `const FORMAT` in the new score.js (the template and app-promo lay themselves out from it).

## subs.js (`Subs`, Node + browser)
`Subs.draw(ctx, t, subtitles, {style: 'pop'|'karaoke'|'box'|'clean', size, y, x, color, highlight, fam, maxW})` · `Subs.words(line)` → word timings · `Subs.toSRT(subs)` · `Subs.toVTT(subs)` · `Subs.fromCaptions(captions)`.

## video/shots.js (`Shots`)
`Shots.film([{ at, draw(ctx, t, s), in: 'cut'|'fade'|'dip'|'iris'|'irisIn'|'wipe'|'push'|'whip'|'zoom'|'flash'|'paper' or {type, dur, dir, color, at: [x, y], text}, cam: fn(s) | {x, y, zoom, rot} }], {end})` → draw function (`s = {t0, t1, u, dt, cam}`) · cameras `Shots.push(z0, z1)`, `pan(x0, x1, y0, y1)`, `shake(amp, from, decay)`, `handheld(amp)`, `combine(...)` · `Shots.cam(ctx, cam)` · `Shots.layers(ctx, cam, [{depth, draw}])` parallax.

## render.js (run from the project root)
`stills t1 t2 …` · `sheet t0 t1 n cols` · `board [t …]` · `clip from to [workers]` · `video [workers]` · `mux [name]` · `check [name]` · `verify [name]`.
- `board`: labelled storyboard (`out/board.png`); with no arguments it shows every marker (drawn one frame after the marker so hits are visible), else the middle of every section, else 12 frames. Labels: marker, time, `bar b:beat`, section.
- `clip`: renders `[from, to)` with parallel workers (JPEG frames, fast x264) and muxes the matching slice of `out/music.wav` → `out/clip_<from>-<to>.mp4`, a sound-on preview of one section.
- `preview [t] [--check]`: serves the film + `engine/video/player.js` at `/__preview` on an OS-assigned localhost port and keeps serving until stopped. The player plays `out/music.wav` with WebAudio and draws `renderAt(frame)` at the audio clock, with a timeline of sections, markers, bar lines and the waveform. Keys: space, ←/→ beat, shift bar, [ ] marker, L loop section, Home; `#t=12.5` in the URL opens there. `--check` loads it headless, verifies the audio decodes and the film draws, and screenshots `out/preview.png`.
- `cast`: `out/cast.png`, every character in `globalThis.CAST` (`{ name: style }`, set by film.js; default `Ch.STYLES` + the Claude mascot), 6 cells: neutral, happy, surprised, worried, cheering, sitting + waving.
- `clip … --gif`: also writes `out/clip_*.gif` (12 fps, 480 px short side, one palette, no sound).
- Every Chrome mode first warns about `Math.random` / `Date.now` / `performance.now` / `new Date` in score.js, song.js and the film's own scripts.
- `verify`: decodes the final `out/<name>.mp4` (or `out/video.mp4` + `out/music.wav` before muxing) and checks each `sync` marker: sound = steepest 5 ms level rise within ±150 ms must be within ±20 ms; picture = the frame within ±250 ms where the most pixels change by more than ~8% (96-pixel-long grey thumbnails; fades and grain change pixels only a little per frame, so they don't count) must be the first frame at/after the marker ±1; a peak that doesn't stand out (< 1.8× the window's median) is reported `?`. Prints a table (✓ / ✗ / `?` = no distinct hit), exits 1 on any ✗. Uses `CHROME_PATH` if set. The file server and Chrome debug ports are OS-assigned (Chrome `--remote-debugging-port=0`, read back from `DevToolsActivePort`); only files inside the project are served (symlink- and prefix-safe); each Chrome runs in its own process group and only those groups are killed. `video` checks every ffmpeg exit code and the encoded frame count (a crash while ffmpeg is busy fails fast instead of hanging) and only a verified file becomes `out/video.mp4`; `mux` checks streams and duration. `video`/`mux` take a per-project lock (`out/.render.lock`), so a second render in the same folder is refused with a clear message; temp files are private per run. `FFMPEG_PATH` / `FFPROBE_PATH` override the binaries.
