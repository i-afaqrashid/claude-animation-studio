# Review loop, verification, and gotchas

## Review loop
1. `node engine/render.js sheet 0 <DURATION> 30 6`, then read `out/sheet.png`. Is the story readable from the thumbnails alone?
2. `node engine/render.js stills <t…>` at every key moment (arrival, gimmick, setback, close-ups, freeze, payoff, climax, ending). Read each PNG at full size.
3. Critique checklist: faces visible? eyes readable? text overlapping anything? poses reading correctly (sit vs stand, elbows)? too dark/muddy (lighting multiply too strong)? cluttered (too many extras)? the hero colour pops? impact frames not covering faces?
4. After the full render, cut motion strips around fast moments:
   `ffmpeg -v error -ss <t> -t 1.2 -i out/<name>.mp4 -vf "fps=10,scale=480:-1,tile=4x3:padding=4:color=white" -frames:v 1 out/strip.png`
5. Note the contact sheet sorts filenames lexicographically; `stills` pads times (`t_009.75`) so order is preserved.

## Sync verification (do this on the final MP4)
Give every hit a `sync` marker in `score.js`, then `node engine/render.js verify`:
```
marker        score      sound                 picture
snap          24.944s    24.944s +0ms ✓        24.967s +0f ✓
flash         27.167s    27.167s +0ms ✓        27.200s +1f ✓
✓ in sync
```
Reading it: sound ±20 ms and picture ±1 frame pass. The picture counts the pixels that change a lot from one frame to the next, so cuts, flashes, stamps and pops stand out while fades and grain don't. It can land one frame late after a white flash (the flash frame differs less from a bright scene than the frame after it does) or one frame early when motion accelerates INTO the hit (a lid slamming shut). ✗ = a real offset: move the event in `score.js` so both sides read the same time. `?` = no distinct hit near the marker (a small pop in a busy frame, a note buried in the mix): make the moment clearer, or give it `sync: 'a'` / `'v'` / no sync.

## Preview with sound (for the user)
`node engine/render.js preview` (run in the background) prints a localhost link; the user opens it in Chrome and clicks Play. The film draws live at the audio clock: heavy shots may drop frames in the preview (the fps readout says so) but the final render never does. After editing score.js or film.js the user reloads the page; after song.js, re-run `node song.js` first. Stop only the preview task you started.

## Performance
- About 300ms per frame per worker for heavy scenes. 7 workers on 8 cores: a 58s film in ~7–8 min. Always run `video` with `run_in_background: true` (it exceeds the 2-minute Bash timeout).
- Pre-render static heavy textures once (crowds, scanlines, grain tiles) in `Studio.film({ init })`.
- Final file with paper + film grain ≈ 1.4 MB/s at CRF 18. Use CRF 20–22 for smaller uploads.

## Gotchas (all hit in practice, all fixed in the engine)
| symptom | cause | fix |
|---|---|---|
| `NetworkError` loading fonts, `READY` never set | Chrome blocks `file://` font loads | render.js serves over HTTP (already does) |
| One font (Caveat) fails | the variable-weight TTF is rejected | ship the static `Caveat-Bold.ttf` |
| Giant black diagonal lines everywhere | stroking after `clip()` + hatch reuses the hatch path | rebuild the shape path before stroking (fixed in `G.shape`) |
| Elbows bend inward ("chicken wings") | IK bend sign | `Ch.ik` bend: left arm +1 when the hand is below the shoulder, −1 above (fixed in `Ch.person`) |
| Captions visible on top of a paper wipe | draw order | draw captions, then the wipe |
| Worried brows look angry | inner brow ends must go **up** for worry | fixed in `Ch.person` |
| Accessory covers an eye | scarf tail over the face | tail hangs at the body's outer edge |
| Log output truncated when piped | `process.exit` before stdout flushes | exit inside `process.stdout.write('', cb)` (done) |
| `npm install` of native canvas takes forever / fails | slow registry + large binaries | the engine needs **no** npm packages: Chrome + CDP + built-in WebSocket |
| Chrome not found | non-standard install | `CHROME_PATH=/path/to/chrome node engine/render.js …` |
| Crowd sounds like wind/rain | a filtered-noise bed alone | add formant-voice babble (music-cookbook) |
| Mix is loud but flat (LRA < 3) | intro too loud / master overdriven | pull intro levels down, DRIVE ≈ 0.8 |
| Chrome helper processes linger after a render | killing only the browser process | each Chrome gets its own process group; the whole group is killed (done) |
| A render "finishes" with missing frames | an ffmpeg child failed silently | exit codes are checked and `video.mp4` frame count is verified against the score (done) |
| A file next to the project could be served (`../film-evil/x`) | prefix check `startsWith(ROOT)` | path is resolved + realpath'd and must be inside `ROOT/` (done) |
| Another render is already running | several Claude sessions can render at once | ports are OS-assigned so they never collide; never kill processes you didn't launch |
| Render hangs forever | ffmpeg died while the renderer waited for its pipe to drain | the wait races against ffmpeg's exit and fails fast (done; covered by `scripts/smoke-test.js`) |
| Two renders in one project trample `out/` | shared temp folders | per-run temp dirs + `out/.render.lock`; the second render is refused (done) |
| Audio clips after upload although `check` said Peak -0.4 dBFS | inter-sample peaks: the waveform between samples overshoots, and AAC/resamplers reconstruct it | `MIX.master` limits the 4x-oversampled TRUE peak to -1.5 dBTP (done in v0.3) |
| A circle wipe draws a giant wedge instead of a hole | `rect()` then `arc()` in one path: the arc is joined to the rect by a straight line | `ctx.moveTo(cx + r, cy)` before `ctx.arc(…)`, then `fill('evenodd')` |
| Two captions overlap into gibberish at a hand-off | caption A's end is after caption B's start | end A before B starts (the fade-out takes 0.25 s) |
| An object that "exits" still peeks in at the frame edge | moved off by less than half its size | move its CENTRE past `H + height/2` (or `W + width/2`) |
| A new prop fades in on top of an object that is leaving | draw order | draw the leaving object last until it is gone |
| An opening lid/door covers a character | pivot on the side facing the character | hinge it on the side facing empty space |
| A flying prop crosses the caption | arc peak inside the caption's box | start props below the caption line or from a character's hand |
| A 9:16 film has text under the platform's buttons/caption | laid out for the full frame | keep text, faces and logos inside `G.SAFE`; put ground/tables in the bottom 22% |
| `verify` says a logo is 2 frames early after a circle wipe | the wipe's last frames change more pixels than a small logo popping in | close the wipe AT the marker and hard-cut to the end card there (`app-promo` does this) |
| The status bar vanishes on a dark app screen | dark text on dark | `UI.phone(…, { dark: true })` for camera/dark screens |
| Workers render different frames for the same t (flicker, jumping confetti) | `Math.random()` / `Date.now()` in a film file | seeded `U.mulberry32` in score.js, `U.hash(i, t)` in film.js; render commands now warn about these |
| `verify` says a sound is -150 ms (at the edge of its window) | a drum roll or pickup rises *into* the marker, so the steepest rise is before it | end the roll an 8th early and leave a held breath (`MIX.gate`), then hit on the marker (qawwali-night) |
| `verify` shows `?` for a moment that "obviously" happens | a slow whoosh or a fade has no sharp edge | a real transient on the marker (a pop, a thud) + a flash or cut in the picture (birthday-card's blow) |
| Seated qawwals/audiences look like they sit on chairs | `pose: 'sit'` is a chair sit | `pose: 'floor'` (cross-legged) and put instruments in front of the legs |
| Caption words touch each other when one pops | the popped word scaled from its centre into the gap | fixed in `Subs.draw`: a word pops from its left edge, the gap is ≥ 0.3 em |
| Beats of a swung song (lo-fi) land 140 ms early now and then | the tracker locked onto a swung 8th | fixed: tighter tempo tracking + outlier beats moved back onto their neighbours' line; check `out/analysis.svg` |
| Map borders draw a line across the whole world | a country that crosses the date line (Russia, Fiji) | fixed in `Data.drawMap` (rings are unwrapped past 180°) |
| Emotions don't read on a character | sunglasses/hair over the eyes, or all expressions look alike | `render.js cast`: 6 expressions side by side; take the glasses off for emotional beats |

## Etiquette on the user's machine
- Never kill processes the renderer did not start (another session may be rendering), and never touch the user's dev servers or ports (e.g. 3000).
- Ask before git commits, pushes, creating repos, publishing, or installing plugins/tools.
- Keep scratch work in the project's `out/` or a temp dir; don't modify unrelated files.
