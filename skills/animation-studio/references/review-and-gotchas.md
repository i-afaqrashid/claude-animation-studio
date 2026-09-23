# Review loop, verification, and gotchas

## Review loop
1. `node engine/render.js sheet 0 <DURATION> 30 6`, then read `out/sheet.png`. Is the story readable from the thumbnails alone?
2. `node engine/render.js stills <t…>` at every key moment (arrival, gimmick, setback, close-ups, freeze, payoff, climax, ending). Read each PNG at full size.
3. Critique checklist: faces visible? eyes readable? text overlapping anything? poses reading correctly (sit vs stand, elbows)? too dark/muddy (lighting multiply too strong)? cluttered (too many extras)? the hero colour pops? impact frames not covering faces?
4. After the full render, cut motion strips around fast moments:
   `ffmpeg -v error -ss <t> -t 1.2 -i out/<name>.mp4 -vf "fps=10,scale=480:-1,tile=4x3:padding=4:color=white" -frames:v 1 out/strip.png`
5. Note the contact sheet sorts filenames lexicographically; `stills` pads times (`t_009.75`) so order is preserved.

## Sync verification (do this on the final MP4)
Audio onset at the big hit (e.g. the drop after the silence):
```bash
ffmpeg -v error -y -ss <hit-0.6> -t 1.0 -i out/<name>.mp4 -map 0:a -ac 1 -ar 48000 -f f32le out/hit.raw
node -e "const b=require('fs').readFileSync('out/hit.raw');for(let i=0;i<b.length/4;i++){if(i/48000>0.3&&Math.abs(b.readFloatLE(i*4))>0.2){console.log((<hit-0.6>+i/48000).toFixed(3));break}}"
```
Brightest frame (flash) near the hit:
```bash
ffmpeg -v error -y -ss <hit-0.2> -t 0.4 -i out/<name>.mp4 -vf "scale=64:36,format=gray" -f rawvideo out/f.raw
node -e "const b=require('fs').readFileSync('out/f.raw'),n=64*36;for(let f=0;f*n<b.length;f++){let s=0;for(let i=0;i<n;i++)s+=b[f*n+i];console.log((<hit-0.2>+f/<FPS>).toFixed(3),(s/n).toFixed(1))}"
```
Both must equal the score's timestamp (the World Cup film: 32.500s for both).

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

## Etiquette on the user's machine
- Never kill processes the renderer did not start (another session may be rendering), and never touch the user's dev servers or ports (e.g. 3000).
- Ask before git commits, pushes, creating repos, publishing, or installing plugins/tools.
- Keep scratch work in the project's `out/` or a temp dir; don't modify unrelated files.
