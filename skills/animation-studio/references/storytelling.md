# Storytelling for code films

## Think in bars

At 120 BPM: 1 beat = 0.5s, 1 bar = 2s, 8th = 0.25s, 16th = 0.125s. A 30fps frame is 33ms, so 8ths land on frames exactly enough that nobody can tell. Pick a tempo first, then write the story as a bar map. Every cut goes on a bar line (or a strong beat for rapid-fire cuts). Keep a `OFFSET` of about 0.5s of black before bar 0 for a cold-open sound (TV click, a boing, a match strike).

## Proven arcs

### 58s emotional short (the World Cup film)
| bars | section | picture | music |
|---|---|---|---|
| 0–3 | intro | cold open, the hero alone, captions set the stakes | music box plays the hook softly, crowd murmur |
| 4–5 | arrival | the companion appears (boing), both bob on beats | drums + bass enter on the landing downbeat |
| 6–9 | first act | the "gimmick" sequence (ball plays the melody) | hook on marimba, full groove |
| 9.75 | setback | interception, "!!" | groove stops dead, low "bwomp", crowd "ooh" |
| 10–12 | tension | dark lighting, pillow, comfort ("breathe. i've got you.") | drone, heartbeat, soft bells, clock ticks |
| 13–15 | build | the final attempt, slow-motion flight, cut-aways on each beat | riser, accelerating snare roll, orchestral hits on the cuts |
| 15.75 | held breath | freeze frame, drained of colour | **total silence** |
| 16 | payoff | GOOOOOAL: one letter per 8th | crash + sub boom + brass stabs climbing the scale |
| 17–23 | celebration | jump, popcorn, fireworks, the whole street | full anthem, hook on brass, choir chant, sidechain pump |
| 24 | climax | high-five impact frame | final chord, big clap |
| 25–28 | outro | calm aftermath, handwritten message, signature, heart | music box reprise, resolves to the tonic |

### 20–30s micro (the template)
intro 2 bars → groove 3.75 bars (gimmick builds up) → half-beat silence → drop 3 bars → outro 1–2 bars.

### Explainer / product (30–45s)
problem (minor key, sparse) → "what if" (riser) → reveal on the drop (brand colour sunburst) → 3 features, one per bar, each with its own sound → logo/handwritten sign-off on the tonic.

## Sync gimmicks (the jaw-droppers)

Each one ties visible objects to audible events, both generated from the same score list:

- **The ball plays the melody.** Every pass is a note, and player height on the pitch = note pitch, so the contour is visible. Pop a drawn ♪ at each touch.
- **Stars are notes.** Each note spawns a star (x = time, y = pitch). On the drop, connect them so the melody becomes a constellation.
- **Letters on 8ths.** A title word stamps in one letter per 8th note, each with a brass stab climbing the scale.
- **Windows on 16ths.** A building's windows light up one per hi-hat.
- **Popcorn / confetti / sparks = clicks.** Each particle's birth time is also a tiny pop sound, panned to its x.
- **Fireworks on the clap.** A launch whistle 0.5–0.7s before, the burst on beats 2 & 4, panned to screen position, with a warm light flash on the scene.
- **Heartbeat = kick.** In tension, the "drum" is a lub-dub that also pulses the vignette and camera zoom.
- **Nervous leg = shaker.** 8ths, then 16ths when the character panics ("(not calm)").
- **Clock ticks = woodblock.** A scoreboard clock flips digits on each beat.
- **Handwriting = pencil scribble.** Each word is revealed with a scribble noise on a music-box note.
- **Bounce on beats.** Characters land (squash) exactly on the beat: `y = -amp·sin(π·phase)`.

Use 3–5 per film. More becomes noise.

## Captions (voice)

Short, lowercase, dry, funny, on taped torn paper, rotated ±0.05 rad. Use one idea per caption, and make it appear on a beat with a paper "fwip". Examples that worked: "Afaq: totally calm." → "(not calm)", "then Claude showed up." → "with a scarf.", "popcorn: everywhere.", "the whole street heard us.", "every star is a note." End with one handwritten line of heart ("you'll never watch alone.") and a small signature line.

## Characters

- Claude = the orange block mascot (body, pill eyes, side nubs, 4 legs). Acting comes from eyes (normal/happy/wide/closed/focus/worried), look direction, squash/stretch, arms, blush, open mouth.
- People = `Ch.person` with a jersey name/number, which is a nice way to personalize for the viewer. Give them brows (worried/determined/up), mouths (wavy/smile/grin/open/o) and props (pillow).
- Personalize with the viewer's name on jerseys, ad boards, flags and the signature. Ask for the spelling if unsure.

## Endings

Slow down: reprise the hook on the music box, resolve to the tonic (maj9 pad), handwrite the last line word by word on notes, pop a small heart on the last note, fade to black over about 1.6s with the audio.
