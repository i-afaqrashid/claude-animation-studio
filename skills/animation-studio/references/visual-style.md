# Visual style

The look: warm hand-drawn paper cut-outs with pencil hatching and boiling ink lines, like a picture book that moves. The references this came from used sketchy orange block creatures, torn-paper collage, and ink linocut.

## Palette (`G.C`)
ink `#2A2320` · paper `#F4EDE0` · cream `#F6F0E2` · claude `#D97757` · kit orange `#E0703E` · teal `#3D7A74` · navy `#27305C` · gold `#F2B84B` · pink `#E8718D`. Night skies `#11163A → #2E2A5C`. Confetti uses kit/gold/cream/teal/pink/lilac. Keep 1 hero colour (orange) and 1 complement (teal) per shot.

## Line and texture
- Every shape goes through `G.shape`: jittered points (re-seeded 12×/s = "boil"), smooth quadratic path, fill, optional hatching (`hatch: { color, gap, angle }`), then a thick ink stroke + a faint second pencil pass.
- Hatch colour = the fill darkened, alpha 0.2–0.35, gap 6–9px.
- Post (`G.post`) multiplies a paper-grain texture (0.35 on TV screens, 0.55 elsewhere), a vignette (0.32) and overlay film grain (0.06).

## Lighting (the cheap, great trick)
Draw the scene fully lit, then multiply a full-screen radial gradient whose centre is where the light comes from:
- TV glow at night: core white → `#C3C8EE` → edges `#4E5080` (+ a subtle blue screen-mode spill).
- Tension: `#C4D0FA → #6A72B0 → #1E2046`; pulse it darker on each heartbeat.
- Party: nearly white → warm edges `#D9A8A0`, plus a flash on each firework (screen, warm, alpha 0.14).
- Lamp: add a screen-mode warm radial at the lamp.
Flicker a TV turning on: 1.3 → 0.25 → 1.0 → 0.55 → steady, within 0.2s.

## Camera
`R.withCam(ctx, {x, y, zoom, rot, shx, shy}, draw)`. Slow push-ins in tense moments (1.12 → 1.32 over 3 bars); pull-backs to reveal. Trauma shake `R.shake(t, [[t0, amp, decay]])` on landings (9px), goals (30px), each letter stamp (10px). Zoom-pulse 1% on beats in the party.

## Acting and animation
- **Squash & stretch**: stretch (sx 0.88, sy 1.2) in flight, squash (sx 1.2, sy 0.76) on landing with a decaying cosine spring (`sq(t, t0, f=2.2, d=6)`).
- **Anticipation**: crouch before every jump; lean in before the big moment; wind the arm back before a high-five.
- **Beats**: `hop = amp·sin(π·phase)` lands on the beat; head-bob `dip = amp·e^(-6·phase)`.
- **Eyes carry the emotion**: look toward whatever just happened (`look` −1…1), wide on surprise, happy arcs on joy, closed arcs asleep, blink at scattered times.
- **Arms**: pose by hand targets. `Ch.ik` bends elbows outward, away from the body. Keep props (pillows) below the eyes, because the eyes must stay visible.
- **Sitting reads as sitting** only with foreshortened thighs + knee caps + short shins; otherwise the person looks like they are standing in front of the couch.
- **Crowds**: fade out extras ~1.6s after their moment so the frame never clutters.

## Shots that land
- **Close-ups on the beat before the payoff**: the hero's eyes (huge, wide, sweat drop), the companion's eyes with the ball reflected (dotted arc + ball clipped inside each eye). Light close-ups with a soft custom gradient, not the heavy scene light (it muddies orange).
- **Freeze frame**: render the frame at the freeze time into an offscreen canvas, draw it with `filter = 'grayscale(1) contrast(1.35)'`, slow-zoom 1 → 1.05, and circle the key object in red pencil.
- **Impact frame**: a rotating sunburst of gold/cream wedges drawn *behind* the characters, thin ink rays only in the outer ring (r0 ≥ 560), a star at the contact point, a 0.85 white flash decaying at e^(−14t), and a freeze until the next beat.
- **Title stamps**: each letter on a torn paper card (different colour per letter, Bungee 190px), scale 2.6 → 1 with outBack over 0.13s, random rotation ±0.15.

## Formats and safe areas
Set `FORMAT` in score.js: `'16:9'` (1920×1080, default), `'9:16'` (1080×1920: Reels, TikTok, Shorts), `'1:1'` (1080×1080), `'4:5'` (1080×1350: the Instagram feed). `G.W`/`G.H` follow it, and so do the canvas, textures, vignette and confetti. `G.SAFE = {x, y, w, h}` is where text, faces and logos stay visible. On 9:16 the platform UI covers the top 11.5% (header), the bottom 22% (caption, handle, audio) and 140px on the right (like/share buttons); on other formats it's a 5% margin.
- **Vertical is not a crop.** Re-stage shots for a tall frame: stack instead of spreading (character below, title above), make the subject fill the width, and let the sky, wall or table fill the height. One idea per frame reads on a phone; wide two-shots don't.
- **Size for a phone held at arm's length.** Titles ≥ 56px, labels ≥ 26px on a 1080-wide frame, and phone mockups ~1250px tall so the app text is readable.
- **Hook in the first second.** Something moves on the first downbeat (a door opens, a character lands), because feeds scroll past still openers.
- **Leave the bottom band quiet.** Put ground, tables or floors in the bottom 22%, never text.

## Product UI (the `UI` kit)
Real apps in a hand-drawn world: the phone and its screens are crisp (system font, rounded white cards, soft shadows, the brand colour on primary actions and "my" chat bubbles), while everything around them boils. `UI.phone(ctx, cx, cy, h, screen, t, {rot, dark})` gives the screen a 412-point-wide coordinate system, so layouts use real-app numbers (16pt margins, 17–26pt text, 78pt tab bar). Slide screens in from the right on bar lines (0.24s), push the world back with a translucent wash of the wall colour while the phone is up, and turn every UI event (a card, a tick, a chip, a bubble) into a note of the melody.

## Transitions
- **Paper wipe**: a 2700px torn cream sheet crosses the screen, fully covering it exactly at the cut (`t0 = cut − 1 beat`). It can carry a word in Permanent Marker ("KICK-OFF!"). Draw captions *before* the wipe.
- **Hard cut** on a bar line for shocks (interception → tension).
- **Dissolve** (0.8s) out of a frozen climax into the calm outro.
- **Circle wipe** `UI.iris(ctx, t, tc, {cx, cy, color})`: a brand-colour disc grows from the key object until the frame is covered at `tc`, then a hole opens to the next shot. For a logo hit, draw only the closing half and cut hard to the end card at `tc` (the cut is the visible hit).

## Text
- Captions: `G.caption(ctx, {t, end, text, x, y, rot, size}, t)` with Caveat Bold, a torn cream note and 2 tape strips. They pop in with outBack.
- Speech: `G.bubble(ctx, text, x, y, tailX, tailY, t, t0, t1)`.
- Handwriting reveal: clip-reveal each word left → right over its duration, with a small pencil tip at the leading edge.
- Fonts available: Caveat (700), Bungee, Permanent Marker, Patrick Hand, Gochi Hand.
