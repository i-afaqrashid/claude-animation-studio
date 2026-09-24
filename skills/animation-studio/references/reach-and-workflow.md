# Reach, quality and workflow tools

Everything here runs from the project folder: `node engine/render.js <command>`. None of it needs npm packages.

## The loop that never needs hand work

1. `brand-from https://site` → `brand.json` (colours, fonts from Google Fonts, logo, CTA). Check it, add `tone` and `claims`.
2. Write the score, then `plan` → `out/plan.md`: the bar map, every on-screen word as a checklist of claims, the cast. The user approves it.
3. Write song.js and film.js. Iterate with `preview` (live reload), `stills`, `board`, `cast`, and `--draft` renders.
4. `qa` (the text in sampled frames: safe area, size, overlap, contrast) and `pacing` (the hook and the cuts) on a draft or the final file.
5. `video` → `mux` → `verify` → `check`. Then `srt`, `poster` and `formats` for publishing.

## Captions and subtitles (`engine/subs.js`)
Most people watch muted and platforms read caption text for search, so give every film subtitles.
- score.js: `subtitles: [{ t, end, text, alt?, words?: [{ w, t }] }]`. `alt` is a second-language line (e.g. Urdu) drawn under the first. `words` holds word times (the voiceover writes its estimates); without it, the line's time is shared by word length.
- film.js, drawn last in `draw()`: `Subs.draw(ctx, t, SCORE.subtitles, { style })`.
  - `pop`: words appear as they are said, the current word yellow (TikTok style).
  - `karaoke`: the whole line, with a box on the current word.
  - `box`: a dark box behind the text.
  - `clean`: a soft shadow.
  - Options: `size`, `y`, `color`, `highlight`, `fam`. Placement defaults to the bottom of `G.SAFE`, and long lines wrap.
- `render.js srt` writes `out/<name>.srt` + `.vtt`, taken from out/voice.json, else `subtitles`, else `captions`. `render.js mux --subs` adds a soft subtitle track.

## Voiceover, singing and your own song
- **Voiceover:** `Voice.speak([...])` in song.js. It writes `out/voice.json` with the lines, word times and a mouth track, and the music ducks under the voice. `Subs.fromVoice(VO)` gives captions timed to each word (estimated), and `Subs.mouth(VO, t, who)` gives lip-sync. See music-cookbook.md.
- **Sung jingles:** `Sing.line('si-tey dot pee-kay', notes)` sings a brand name, and `Sing.happyBirthday(name)` a birthday song.
- **Your own song:** `render.js analyze song.mp3 [--lrc song.lrc]` writes `beats.js` (tempo, beats, bars, sections, lyrics). Build the clock on it with `makeClock({ beats })`, then use `MIX.loadAudio` for the soundtrack.

## Hook and pacing (`render.js pacing`)
Measured on the rendered file:
- first movement ≤ 1s,
- first sound ≤ 1s,
- ≥ 2 hits in the first 3s,
- on-screen text ≤ 3s (the text probe sees every word drawn in the frames it samples),
- no stretch longer than 12s without a cut or big change,
- an intro not more than 12 dB quieter than the film.

`out/pacing.svg` graphs the picture change, sound level, cuts and text. Fixes: move something on the first downbeat, add a caption early, and add a cut, flash or pop every 10–15s.

## Thumbnails (`render.js poster [@t …] [--title "…"] [--sub "…"]`)
- It makes three 1280×720 thumbnails (a gradient + title, a brand block, a huge outlined hook word) for YouTube's Test & Compare, plus `out/posters.png`. Tall films also get `out/cover.png`.
- Frames default to the sync markers (the hits). The title defaults to score.js `poster: { title, sub, frames, focus: { zoom, fx, fy } }`, then brand.json.
- Keep titles to ≤ 5 words. Thumbnails are judged at ~210 px wide on a phone.

## Every format from one score (`render.js formats 16:9,9:16,1:1,4:5 [--draft]`)
- Works when score.js uses `const FORMAT = U.pickFormat('16:9')` and film.js lays out from `G.W`/`G.H`/`G.SAFE`, as the template does.
- It renders `out/<name>-9x16.mp4` and the others. Any command takes `--format 9:16` to try one.

## Draft renders and caching
- `--draft` on `video`, `clip`, `stills` or `formats` renders at half resolution: 2–4× faster, with the same picture. Outputs are suffixed `-draft`.
- `Studio.cache('bg', drawBg)` draws a static layer once, in 3 boil variants. Use it as `ctx.drawImage(Studio.cache('bg', drawBg), 0, 0, G.W, G.H)`. drawBg must not depend on t.

## Brand kit (`brand.json`)
```json
{ "name": "Sitey", "tagline": "A website your customers can actually order from.",
  "colors": { "primary": "#c9a227", "secondary": "#e3c86a", "ink": "#a2938a", "bg": "#0b0709", "onPrimary": "#111111" },
  "fonts": { "display": { "family": "Cormorant Garamond", "file": "assets/fonts/CormorantGaramond-700.ttf", "weight": 700 },
             "body": { "family": "Inter", "file": "assets/fonts/Inter-400.ttf" } },
  "logo": "assets/logo.png", "cta": { "text": "Talk on WhatsApp", "phone": "0334 1415240", "url": "https://sitey.pk" },
  "languages": ["en", "ur"], "tone": "plain, candid, no hype",
  "claims": { "allowed": ["Rs 5,000 + Rs 2,500/month"], "forbidden": ["#1 on Google", "guaranteed"] } }
```
- Loaded automatically. Its colours become `UI.theme` defaults (a film's own `UI.setTheme` wins), its fonts load, and its logo is `Studio.brand.logoImg`.
- `render.js brand` checks it (contrast, missing files) and draws `out/brand.png`.
- Every render warns when a film file says a forbidden claim.

## The plan (`render.js plan` → `out/plan.md`)
A one-page treatment generated from the score:
- format, length and tempo,
- a bar map (sections × events with their words),
- named moments,
- every on-screen string (numbers flagged 🔢, forbidden claims ⛔) as a checklist,
- the cast and the brand rules.

Give it to the user before the full render, and re-run it after changes.

## Visual QA (`render.js qa [t …] [--every 1]`)
The text probe (`window.probeAt`) records every `fillText` of a frame: text, box, size, colour, and contrast against the frame drawn without text. QA flags:
- text outside `G.SAFE`,
- text under ~16 px on a 1080 frame,
- overlapping text,
- contrast under 3:1 (outlined text is exempt).

`out/qa.png` marks each problem (red safe area, orange too small, purple overlap, blue contrast). Wrap deliberate tiny or decorative text in `G.decor(() => …)`.

## Live preview (`render.js preview`)
- Sound, a timeline (sections, bars, waveform, event ticks per score list, markers), and draft/HQ drawing.
- Live reload: saving score.js/film.js reloads at the same moment, and saving song.js/score.js re-renders the music first.
- "⤓ clip" renders the loop or the section as an MP4.
- Start it with `run_in_background`, give the user the link, and stop only that task when done.

## Shots, transitions, camera (`engine/video/shots.js`)
```js
Studio.film({ draw: Shots.film([
  { at: 0, draw: intro, cam: Shots.push(1, 1.06) },
  { at: T(4), draw: verse, in: { type: 'wipe', dir: 'left' } },
  { at: T(8), draw: drop, in: 'flash', cam: Shots.shake(16, T(8)) },
  { at: T(12), draw: outro, in: { type: 'iris', color: '#F2B84B', at: [960, 540] } },
]) });
```
- Transitions: `cut`, `fade`, `dip`, `iris`, `irisIn` (close + hard cut: the cleanest hit for `verify`), `wipe` and `push` (dir left/right/up/down), `whip`, `zoom`, `flash`, `paper` (a torn sheet, optional `text`).
- Each shot's `draw(ctx, t, s)` gets `s.u` (0..1 through the shot), `s.dt` and `s.cam`.
- Parallax: `Shots.layers(ctx, s.cam, [{ depth: 0.3, draw: far }, { depth: 1, draw: near }])`.

## Real screenshots (`render.js snap <url> [--desktop] [--full] [--hide ".cookie"] [--dark]`)
- It captures a phone (390×844 at 2x) or a desktop (1440×900) screenshot of a live site into `assets/`. `--full` takes the whole page (after scrolling it, so lazy images load).
- Show it with `UI.phone(ctx, x, y, h, UI.imageScreen(img, { scroll: (t) => U.keys(t, [[T(2), 0], [T(4), 0.5]]) }), t)`, or pan across it with `G.kenBurns`.
- Only use sites the user owns or may show.

## Style packs (`--style chalk` on any command, or score.js `STYLE`)
Choose from `paper`, `flat`, `pixel`, `chalk`, `neon` and `watercolor`. See visual-style.md. Output names carry the style, e.g. `out/video-neon.mp4`.

## Text in any script
- `G.text`, `G.measure`, `UI.text` and `UI.measure` split a string into runs by script.
- Urdu → Noto Nastaliq Urdu, Arabic → Noto Naskh Arabic, Hindi → Noto Sans Devanagari (all bundled).
- Right-to-left runs and mixed lines ("Order on WhatsApp · آرڈر کریں") come out in reading order. Force a script with `{ lang: 'ur' | 'ar' }`.
- Inter (400/700/800) is bundled for captions and clean UI text.
