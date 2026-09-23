# Storytelling for code films

## Think in bars

At 120 BPM: 1 beat = 0.5s, 1 bar = 2s, 8th = 0.25s, 16th = 0.125s. A 30fps frame is 33ms, so 8ths land on frames exactly enough that nobody can tell. Pick a tempo first, then write the story as a bar map. Every cut goes on a bar line (or a strong beat for rapid-fire cuts). Keep a `OFFSET` of about 0.5s of black before bar 0 for a cold-open sound (TV click, a boing, a match strike).

## Story shapes

Choose by the brief, not by habit. The silence-and-drop belongs to the big-payoff shape only.

### Big payoff: 58s emotional short (the World Cup film)
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

### Big payoff, 20–30s micro (the template)
intro 2 bars → groove 3.75 bars (gimmick builds up) → half-beat silence → drop 3 bars → outro 1–2 bars.

### Comic escalation (20–40s, 130–150 BPM)
| bars | picture | music |
|---|---|---|
| 0–1 | set up the character and the goal (the cat wants the cake) | bouncy pluck + light kick on 1 and 3 |
| 2–3 | attempt 1: small, fails politely | melody phrase A; a "boing" or "bonk" on the fail |
| 4–5 | attempt 2: bigger, fails bigger | phrase A a step higher, more drums; a bigger fail sound |
| 6–7 | attempt 3: absurdly big | full band; everything speeds up (16th shakers) |
| 7.5 | record-scratch stop; the character looks at camera | a stop plus a vinyl-scratch noise sweep |
| 8–10 | the punchline, then a tiny happy ending | the hook resolves; a kazoo- or whistle-like lead; a "ta-da" button |
Gimmicks: each attempt's crash lands on the downbeat; every bounce is a pluck note climbing the scale.

### Tender memory (30–60s, 70–90 BPM)
| section | picture | music |
|---|---|---|
| opening (2 bars) | one object, close up (a photo, a mug, a scarf) | a music box alone |
| memories (3–4 short scenes, 2 bars each) | soft dissolves, warm lamp light, slow push-ins | pads enter; the melody passes between music box and soft keys |
| the heart (2–4 bars) | the two characters together, a small gesture (a shared umbrella, a hand on a shoulder) | a key change up a step, or strings swelling; no drums, or brushes only |
| ending (2 bars + tail) | a handwritten line, word by word, on notes | held maj9 chord, long reverb, fade |
No silence gap, no drop, no screen shake. Use `G.photo` for real photos the user shares.

### Montage (30–60s, 110–124 BPM)
One shot per bar, cut on the downbeat; every 4 bars add an instrument (drums → bass → lead → choir). Each shot has one tiny action landing on beat 3 (a wave, a jump, confetti). End on a group shot and the hook's final note. No silence.

### Musical explainer (30–45s, 100–110 BPM)
Problem (minor key, sparse, 2 bars) → "what if" (a riser into the major key) → reveal (brand-colour sunburst) → 3–4 features, one per bar, each with its own sound and a caption stamped on beat 1 → a logo or handwritten sign-off on the tonic. A silence before the reveal is optional; skip it for calm brands.

A worked app promo (108 BPM, 18 bars, 42s; the user journey IS the story, and each step has its own gimmick):
| bars | picture | sync gimmick |
|---|---|---|
| 0–1 | the hero on a bench, a thought bubble ("where to next?") | music box plays the hook; a doodle pops on every 3rd note |
| 2–4 | the phone rises and fills the frame: the real app feed | each hook note = a UI event (card slides in, tag pops, title stamps) on a plucked guitar |
| 5 | saving favourites | one heart flies to the collection per note |
| 6–7 | a request is written line by line, folds into a paper plane, 3 replies come back | a writing tick per line; a bell ping per reply, rising |
| 8–9 | chat on the phone, the two people beside it | call and response: one bubble per beat (guitar vs e-piano) |
| 10 | booking: packing items tossed into a suitcase | items on 8ths as a rising scale; half a beat of silence; the lid SNAPS on the downbeat with a stamp ("BOOKED ✓") |
| 11 | a map, the route drawn stop by stop | a tom hit per stop |
| 12 | the payoff scene, "We're going." | flash cut, full band, brass on the hook |
| 13–15 | a calmer beat for a sensitive topic, a community moment, numbers stamped | drums drop out; then a brass stab per stat, rising |
| 16–17 | logo, tagline word by word, the call to action | bells + a held maj9 chord; hold the end card ≥ 2 s at full brightness before the fade |
`examples/app-promo/` is the compact 9:16 version of this (112 BPM, 8 bars, 20s): fridge → snap → recipes → cook → share → held breath → the plate lands → stats → logo.
Short-form (Reels/TikTok/Shorts): 15–25s, motion on the very first downbeat, one idea per bar, captions as big numbered steps at the top of the safe area, and an end card that holds ≥ 2s.
Brand films: use the brand's own colours and font in the UI (a clean system font inside the phone), keep the hand-drawn world around it, only use numbers the client confirms, and keep sacred or sensitive subjects respectful (no comedy, no depictions they would not approve).

### Performance (a band, a qawwali, a dance): `examples/qawwali-night/`
The music leads and the picture plays it. Everyone's hands are driven by the score's events: claps on the taali, drum hands on the strokes, the keyboard hand on the note's pitch. Every mouth sings its own part.
| bars | music | picture |
|---|---|---|
| 0–1 | a free alaap: drone + a long sung melisma, no rhythm | lights come up slowly, the title, the lead with eyes closed |
| 2–9 | the rhythm enters; the lead sings a line, the chorus answers it (call and response) | the chorus claps on the taali, the tabla hands strike; a slow push-in |
| 10–13 | the refrain, faster (a tempo map climbing), a harmonium run between lines | bulbs chase in 8ths, "واہ!" bubbles from the crowd |
| 13.75 | an 8th of silence (the held breath) | everyone's hands up |
| 14–17 | the peak: everyone on the refrain, drum rolls | vail (notes thrown), petals, sweeping beams, the crowd's hands up |
| 18 | the final hit, then silence and applause | a white flash, arms up, the end card over the scene |

### Comic escalation with dialogue: `examples/gully-cricket/`
The last ball (the set-up, a voiceover sets the stakes) → the hit (an impact frame) → it goes up… and up (drums out, a riser) → SIX! (the drop, a chant) → CRASH (glass + record scratch → silence, a freeze, a snap zoom) → the consequence (aunty, in her own voice) → blame (everyone points) → escape (the groove returns) → the end card. The silence after the crash is what makes it land.

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
