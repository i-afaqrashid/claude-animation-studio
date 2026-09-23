# Engine API

All engine files are UMD-style IIFEs: `require()` in Node, globals in the browser (`U`, `MUSIC`, `G`, `Ch`, `Studio`). Load order in `index.html`: `engine/util.js`, `engine/music.js`, `score.js`, `engine/video/gfx.js`, `engine/video/chars.js`, `engine/video/boot.js`, then film files (template layout; the world-cup example boots itself and skips music.js and boot.js).

## util.js (`U`)
`mulberry32(seed)` → rng() · `hash(...xs)` → [0,1) stateless · `noise1(x, seed)` smooth −1…1 · `clamp lerp invLerp remap smooth` · `ease.{linear,inQuad,outQuad,inOutQuad,inCubic,outCubic,inOutCubic,outQuart,inQuart,outExpo,inExpo,outBack(t,s),inBack,outElastic,outBounce}` · `tween(t, t0, t1, a, b, ease)` · `keys(t, [[t, v, ease?], ...])` keyframes · `springKick(t, t0, freq, decay)` (starts at 0) · `pulse(t, t0, decay)` (1 at t0, decays).

## music.js (`MUSIC`)
`m('Bb3')` → 58 · `mtof(midi)` · `makeClock({bpm, offset, beatsPerBar})` → `{BEAT, BAR, OFFSET, T(bar, beat), beatPos(t), phase(t), eachStep(bar0, bar1, stepsPerBar, fn(t, bar, step))}` · `placeBar(clock, bar8ths, bar, transpose)` → `[{t, dur, midi}]` · `makeChords(clock, table, rows)` → `{chords:[{t0,t1,bar,name,notes,bass}], chordAt(t)}`.

## audio/dsp.js
`SR = 48000` · `new Bus(n)` with `.addMono(buf, t, gain, pan)`, `.addStereo(L, R, t, gain)`, `.mixInto(dst, gain)`, `.applyGain(fn(t))` · `rng(seed)` white −1…1 · `new Pink(seed).next()` · oscillators `new Saw()/Square(ph, pw)/Sine()` `.next(freq)` (PolyBLEP) · `new SVF()` `.lp/.hp/.bp(x, cutoff, q)` (bp = unity peak) · `new OnePole()` `.lp/.hp(x, hz)` · `adsr(t, dur, a, d, s, r)` · `expDecay(t, tau)` · `reverb(bus, {room, damp, predelay, hp, lp})` → wet Bus (Freeverb) · `pingpong(bus, time, fb, lpHz)` → wet Bus.

## audio/instruments.js (`I`)
Return a mono Float32Array unless noted.
- Drums: `kick({punch, tail, seed})`, `snare({tone, snap, decay})`, `clap({decay, spread})`, `hat(open, seed)`, `crash(seed)`, `tom(freq, decay)`, `shaker(accent)`, `bell(freq, decay, index, ratio)`
- Tonal: `bass(midi, dur, {bright, sub})`, `padNote(midi, dur, {cutoff, attack, release, detune})` → `{L,R}`, `pluck(midi, {decay, cutoff})`, `musicBox(midi, {decay})`, `marimba(midi, {decay, thock})`, `brassNote(midi, dur, {bright, stab, seed})` → `{L,R}`
- Voice: `voice(midi, dur, {syl: 'o'|'le'|'e'|'a'|'u', type: 'tenor'|'alto', seed, vib, glide, breath, shout})`
- FX: `noiseSweep(len, f0, f1, {q, shape(x), pink})`, `boing()`, `thud(freq, decay)`, `paperFwip(pitch)`, `tvClick()`, `whistle(len)`, `bwomp()`, `heartbeat()`, `woodTick(pitch)`, `thwack()`, `subBoom(len, f0, f1)`, `pop(pitch)`, `fireworkBurst(seed, size)`, `launchWhistle(len)`, `scribble(len)`

## audio/mix.js (`MIX`)
`sidechain(buses, kickTimes, {depth, release})` · `gate(bus, t0, t1)` hard silence · `fadeOut(bus, t0, t1)` · `highpass(bus, hz)` · `master(bus, drive=0.8, ceiling=0.93)` glue comp + 4ms lookahead limiter · `writeWav(file, bus)` 32-bit float · `mixdown(stems, gains, {stemDir})` → Bus.

## video/gfx.js (`G`)
- Frame: `G.W = 1920`, `G.H = 1080`, `G.setTime(t)` (sets `G.t`, `G.boil`), `G.C` palette, `G.rnd(...)` hash
- Points: `rrPts(x, y, w, h, r, step)`, `ellPts(cx, cy, rx, ry)`, `polyPts(corners, step)`, `path(ctx, pts, closed)`, `wobble(pts, seed, amp)`
- Drawing: `shape(ctx, pts, {fill, stroke, lw, seed, amp, hatch:{color,gap,angle,lw}, closed, alpha, second})` · `rrect(ctx, x, y, w, h, r, o)` · `ellipse(ctx, cx, cy, rx, ry, o)` · `poly(ctx, corners, o)` · `line(ctx, pts, {color, lw, seed, amp, step, alpha})` · `limb(ctx, pts, {color, lw, outline})` outlined noodle · `hatch(ctx, bbox, o)`
- Paper: `tornPaper(ctx, x, y, w, h, {fill, seed, shadow, edge, tear})` · `tape(ctx, x, y, w, h, rot, seed)`
- Text: `text(ctx, str, x, y, {size, fam, weight, color, align, baseline, boil, alpha, stroke, strokeW})` · `measure(ctx, str, size, fam, weight)` · `caption(ctx, {t, end, text, x, y, rot, size, small}, t)` · `bubble(ctx, text, x, y, tailX, tailY, t, t0, t1, {size})`
- FX: `confetti(ctx, t, t0, {n, seed, spawn, fall, x0, x1})` · `firework(ctx, f, t, x, y, scale)` with `f = {t, launch, seed, size, color, color2}` · `rays(ctx, cx, cy, {n, r0, r1, color, lw, alpha, spin})` · `star(ctx, x, y, r, {fill, rot})` · `heart(ctx, x, y, s)`
- Textures: `initTextures()` (Studio calls it), `post(ctx, t, {paper, vignette, grain})`, `makeCanvas(w, h)`

## video/chars.js (`Ch`)
- `Ch.claude(ctx, {x, y (feet), s, sx, sy, rot, eyes: 'normal'|'happy'|'closed'|'wide'|'focus'|'worried', eyeScale, look, lookY, blink, armL, armR (radians, + = up), mouth: 'none'|'open'|'smile'|'o', blush, scarf, scarfWave, legKick, shadow})` (body 210×145 + legs 46 at s=1)
- `Ch.person(ctx, {x, y, pose: 'sit'|'stand', s, sx, sy, rot, headRot, headX, headY, eyes: 'normal'|'happy'|'closed'|'sleep'|'wide', look, lookY, blink, brows: 'neutral'|'worried'|'up'|'determined', mouth: 'flat'|'wavy'|'smile'|'grin'|'open'|'o'|'sleep', handL, handR ([x,y] targets), knee: [liftL, liftR], pillow (0..1), scarf, blanket, sweat, blush, legBend, style: {skin, skinDark, hair, shirt, trim, collar, shorts, name, number}})`. Sit origin = hips on the seat; stand origin = feet. Shoulders at y ≈ −156 (sit) / −306 (stand); arm reach ≈ 162.
- `Ch.player(ctx, {x, y, s, kit: 'home'|'away'|'gk', facing, pose: 'run'|'stand'|'kick'|'lunge'|'dive'|'celebrate', phase, kick (0..1), num, alpha, seed})` · `Ch.ball(ctx, x, y, r, spin, {shadowY})` · `Ch.scarf(ctx, x, y, w, wave, seed)` · `Ch.ik(S, P, a, b, bend)`

## video/boot.js (`Studio`)
`Studio.film({ draw(ctx, t), post: {paper, vignette, grain} | fn(t), fadeOut = 1.6, init(ctx), duration })`. It loads the fonts, builds the textures, defines `window.renderAt(t)` (setTime → clear → draw → post → fade → PNG) and sets `window.READY`.

## render.js (run from the project root)
`stills t1 t2 …` · `sheet t0 t1 n cols` · `video [workers]` · `mux [name]` · `check [name]`. Uses `CHROME_PATH` if set. It serves the project on an OS-assigned port, uses Chrome debug ports 9300–9700, and only kills the Chrome processes it launched.
