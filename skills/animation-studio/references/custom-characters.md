# Characters: presets, customizing people, building new ones, using real images

Nobody is locked into fixed characters. There are four levels, from least to most work.

## 1. Presets (`Ch.STYLES`)

Named looks ready to use: `Ch.person(ctx, { x, y, pose: 'stand', style: Ch.STYLES.afaq })`.
- `afaq`: Afaq, who made this plugin. Curly black hair (`curlytop`), trimmed beard + mustache, round gold sunglasses, black shalwar kameez, broad build. Signature pose: `crossArms: true, mouth: 'smirk'`.
- `afaqFan`: the same Afaq in the custom #10 "AFAQ" football jersey, with eyes visible for acting. The World Cup example uses it.

Extend a preset instead of copying it: `style: { ...Ch.STYLES.afaq, glasses: 'none' }`. Sunglasses hide the eyes, so take them off for emotional close-ups. To add a preset for a recurring person, add an entry to `Ch.STYLES` in the film (or in the engine, for a published skill).

## 2. Customizing `Ch.person` (the `style` object)

All fields are optional; defaults draw the original jersey look.

| field | values |
|---|---|
| `skin`, `skinDark` | any colour; `skinDark` (neck, nose) is derived if omitted. `Ch.SKIN_TONES` has 6 swatches |
| `hair` | any colour (also brows and facial hair). `Ch.HAIR_COLORS` has swatches |
| `hairStyle` | `quiff` (default), `short`, `buzz`, `curlytop`, `long`, `curly` (big curls), `bun`, `ponytail`, `bald`, `hijab` |
| `hijab` | hijab colour |
| `facialHair` | `none`, `stubble`, `mustache`, `trimmed` (short beard + mustache), `beard` |
| `glasses`, `glassesColor` | `none`, `round`, `square`, `bold` (big rectangular optical frames with thick rims, the Beckham look), `sun` (round sunglasses, gold frames by default) |
| `outfit` | `jersey` (side panels, `name` + `number`), `tee`, `hoodie`, `shirt` (collar, buttons, pocket), `dress`, `kameez` (long shirt to the knees) |
| `shirt`, `trim`, `collar` | outfit colours (dark fabrics get light seams automatically) |
| `bottoms`, `shorts` | `shorts`, `pants`, `shalwar` (loose trousers), `skirt`; `shorts` is the bottoms colour |
| `sleeves` | `short`, `long`, `none` (default depends on the outfit) |
| `build` | `slim`, `regular`, `broad`, `heavy` |
| `print`, `printColor` | big text on a tee or hoodie |
| `freckles`, `shoes`, `name`, `number` | as named |

Acting parameters (per frame, not style): `eyes`, `brows`, `mouth` (`flat wavy smile smirk grin open o sleep`), `look`, `lookY`, `blink`, `headRot`, `handL`/`handR` hand targets, `crossArms`, `knee`, `pillow`, `sweat`, `blush`, `legBend`, `scarf`, `blanket`.

Audition before animating: set `globalThis.CAST = { hero: {...}, friend: {...} }` in film.js and run `node engine/render.js cast`. `out/cast.png` shows each character neutral, happy, surprised, worried, cheering, and sitting + waving.

When personalizing for a real viewer, ask for (or read from a photo they share) hair style and colour, facial hair, glasses, skin tone, typical clothing and one signature pose. Map each to the table above, and keep the cartoon kind and flattering. Never store or publish the photo itself; only the style description goes into code.

## 2b. Acting: walking, gestures, lip-sync, outfits, animals (v0.7)
- **Walk:** `Ch.person(ctx, { ...Ch.walk(t, { x0: -200, speed: 260, t0: T(2) }), y: GROUND, style })`. `Ch.walk` returns `x`, the leg phase `walk` and `pose: 'walk'`: legs lift in turn, arms swing, the body bobs. Match `speed` to `stride` so the feet do not slide (stride ≈ 300 px at s = 1).
- **Gestures:** `gesture: 'wave'` (animated), `point`, `pointUp`, `thumbsUp`, `phone` (holds a phone), `typing`, `cheer` (arms up, bouncing), `shrug`, `facepalm`, `think` (hand at chin), `clap` (animated), `akimbo`, `dua` (hands raised in prayer), `mic` (holding a microphone: presenters and commentators), `bat` (a cricket batting stance). Explicit `handL` / `handR` still win.
- **Lip-sync:** `mouth: Subs.mouth(VO, t, 'dad')`, where VO is `out/voice.json` from the voiceover. The mouth opens with the voice's loudness and widens on bright vowels. Works on `Ch.claude` too.
- **Outfits:** `outfit: 'thobe'` (white robe to the ankles; add `headwear: 'ghutra'`), `'abaya'` (long black robe, wide sleeves; pair with `hairStyle: 'hijab'`), `'sari'` (wrap skirt + pallu over the shoulder; `robe` = sari colour, `shirt` = blouse, `trim` = border, gold by default), `'suit'` (jacket with lapels + tie; `robe` = jacket, `trim` = tie). Set a robe's colour with `style.robe`.
- **Headwear:** `headwear: 'topi'` (prayer cap), `'cap'` (baseball cap, `headwearColor`), `'turban'`, `'ghutra'` (headscarf with a black agal).
- **Weddings (v1.1):**
  - The groom: `outfit: 'sherwani'` is a long coat to the knees with a bandhgala collar, gold buttons, embroidery and cuffs (`robe` = the coat, `trim` = the gold). Pair it with `headwear: 'pagri'` (a turban with a starched turra fan and a jewelled kalgi; `headwearColor`). `sehra: true` hangs a veil of jasmine and roses from the pagri.
  - The bride: `outfit: 'lehenga'` is a flared skirt to the ground with gold bands, and a choli (`robe` = the skirt, `shirt` = the choli). Add `headwear: 'dupatta'` (a drape over the head and across the front; `headwearColor`), `jewelry: true` (maang tikka, jhumkas, nath), `bangles: '<colour>'` and `mehndi: true` (henna on the hands).
  - `garland: 'flowers'` (marigold and roses), `'roses'` or `'notes'` (a money garland) goes on anyone. `Ch.garland(ctx, sh, bw, kind, seed)` draws one on your own characters.
  - Gestures `bhangra` (animated), `dhol` (a dhol slung across the belly, played with both sticks; `Ch.dholDrum` draws the drum alone) and `adab` (a hand raised in greeting).
  - `Ch.horse(ctx, { x, y, s, walk, facing, color, mane, decorated, cloth, seed, shadow })` draws a baraat horse in side view with an embroidered saddle cloth, a plume and beads. It returns `{ seat: [x, y] }`, so the rider is `Ch.person(ctx, { x: seat[0], y: seat[1], pose: 'sit', … })`.
  - The `wedding-invite` starter uses all of these.
- **Animals:** `Ch.dog` (sit/stand, a tail that wags faster when `happy`, `bark`), `Ch.cat` (swaying tail, `meow`), `Ch.bird` (`flap`, `sing`, `facing`).
- Dress people as the audience would expect: a grandfather in a kameez and topi, a bride in a red sari or lehenga, office staff in suits. Show the brief's own culture with care, and avoid caricature.

## 3. Building a new character from primitives

For pets, robots, vehicles, mascots, products, and creatures, write `Ch.<name>(ctx, o)` in a film file. The complete worked example is `examples/characters/cat.js` (`Ch.cat`: tabby/tuxedo/plain patterns, expressions, a waving tail, a collar and bell, a party hat). Copy it next to `film.js` and load it in `index.html` after `engine/video/boot.js`.

The recipe:
1. **Origin at the feet.** Apply `translate(x, y) → shadow → scale(s·sx, s·sy) → rotate(rot)`, then build upward in local units. Squash/stretch and hops then work exactly like Claude's.
2. **Draw back to front**: tail/back hair → haunches/body → limbs → head → face → accessories.
3. **Use only `G.*` for shapes** (`G.poly`, `G.ellipse`, `G.rrect`, `G.limb`, `G.line`) with `fill`, ink outline and `hatch`, so the character boils and hatches like the rest of the film.
4. **Give every part its own seed** (`seed + n`) so each part's jitter is stable and independent.
5. **Expressions are parameters.** Eyes (`normal/wide/happy/closed`), mouth and one or two signature moves (tail wave, ear wiggle) are driven from the score in `film.js`.
6. **Patterns and markings**: clip to the body path (`ctx.clip()` after `G.path`), draw stripes or patches, then restore.
7. **Test in isolation first**: render a still with the character in 3–4 expressions side by side before animating.

## 4. Using real images (photos, logos, drawings)

Put files in `<project>/assets/`. Load them once in `init` and draw them every frame:

```js
let photo;
Studio.film({
  async init() { photo = await Studio.loadImage('assets/team.jpg'); },
  draw(ctx, t) {
    G.photo(ctx, photo, 1500, 540, 480, 320, { rot: -0.05, caption: 'summer 2026', seed: 3 }); // a taped paper print
    // or raw: ctx.drawImage(photo, x, y, w, h)
  },
});
```

`G.photo` cover-fits the image into a paper print with a torn border, tape and an optional handwritten caption, so a real photo sits naturally in the hand-drawn world. Logos usually look best raw (`ctx.drawImage`) on a torn paper card (`G.tornPaper`). The paper-grain post pass is applied over images too. Supported formats: png, jpg/jpeg, webp, gif, svg. Only use images the user provided or owns.
