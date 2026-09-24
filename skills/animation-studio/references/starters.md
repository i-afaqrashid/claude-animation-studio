# Starting points: which one to scaffold, and what each one shows

Scaffold with `node <skill-dir>/scripts/new-project.js <target-dir> [--from <example>] [--format 9:16]`. Every starter uses the documented API. Keep its structure, then replace the story, the words, the people and the brand.

| starter | format | pick it for |
|---|---|---|
| `template` (no `--from`) | any | most stories: a birthday, a pet, a thank-you, an explainer. It lays itself out for any format |
| `app-promo` | 9:16 | an app or product walkthrough with phone screens (the UI kit) |
| `product-launch` | 16:9 | a launch or explainer with a voiceover, captions, counters and charts |
| `qawwali-night` | 16:9 | music-first films: a band or a performance, a tempo that speeds up, singing |
| `gully-cricket` | 9:16 | a comic escalation with dialogue: sports, mishaps, pranks |
| `birthday-card` | 1:1 | a personal card with a sung name: birthdays, anniversaries, Eid |
| `wedding-invite` | 9:16, any | a wedding invitation: the names, the Mehndi, Baraat and Walima details, and a baraat on a horse |
| `lyric-video` | 9:16 | a film cut to the user's own song (`analyze`) |
| `world-cup-2026` | 16:9 | only to re-render or remix that film (older API) |

## template: "every star is a note" (23s)
Claude drops onto a paper stage and bounces on every beat. Each melody note pops a star, so the melody draws a constellation. Then comes a held breath, a sunburst drop and a handwritten ending. It shows the basic pattern: the clock, the events, `hop()` and `squash()` on beats, markers, captions, and a responsive layout from `G.W`, `G.H` and `G.SAFE`.

## app-promo: "Pantrio" (9:16, 20s)
A fictional recipe app. A fridge opens on the downbeat, then come four app steps, one bar each, each with its own gimmick:
- ingredients recognised on 8ths,
- recipe cards on beats,
- steps ticked off per beat,
- a chat call-and-response on guitar vs e-piano.

Then a held breath, the plate landing on the drop, stats, and a logo end card. It is built with the UI kit (`UI.phone`, cards, chat, stats).

## product-launch (16:9, 36s)
A launch film for this plugin (every claim in it is true).
- **Voice:** a voiceover (`Voice.speak`, Samantha) with captions timed to each word (`Subs.fromVoice`) and a lip-synced narrator (`Subs.mouth`). The music ducks under the voice (`MIX.duck`).
- **Montages:** counters (`UI.stat`), then a style montage where `G.setStyle` changes the look on every pluck. Then a genre montage: one bar each of lo-fi, chiptune, qawwali and EDM (`Genre.play`), each in its own style.
- **People and data:** a parade of outfits walking in and dancing, a Pakistan map with pins (`Data.map`/`pin`), a bar chart, and greetings in four scripts. It ends on an EDM drop into the end card.

To make it yours, change the `vo` lines, the facts, the colours, and the end card.

## qawwali-night (16:9, 43s)
A qawwali party on a stage under a shamiana, with original Roman Urdu lyrics and Nastaliq captions.
- **Tempo:** a tempo map (`makeClock({ tempo })`) speeds it up from 88 to 152 BPM.
- **Voices:** the lead sings each line and a chorus of five answers it (`Sing.phrase`, the formant singer). A harmonium doubles every sung note, as in a real qawwali, and plays fast runs between lines.
- **The score drives the hands:** the chorus claps (taali on beats 1–3, khali on 4) and the tabla player's hands hit on the strokes. The harmonium player's right hand follows the pitch of each note, and his left hand pumps the bellows on the beat.
- **The peak:** held breaths (an 8th of silence) land the peak and the final hit. Rupee notes (vail) and rose petals fall, the crowd shouts "واہ!", "Kya baat hai!", and a flash marks the final hit.

It also shows the cross-legged `pose: 'floor'`, a drone, stereo chorus voices, crowd shouts and applause.

## gully-cricket (9:16, 27s)
The last ball of a street cricket match, six to win, as a comic escalation built with `Shots.film`.
- **Voices:** Chacha commentates on a microphone (a TTS voiceover, Rishi, lip-synced). Aunty's "Kis ne maara?!" is a Hindi voice (Lekha) reading Devanagari, captioned in Roman Urdu and Urdu (`display` and `alt` on the voice line). The kids' "chhakka!" chant is sung by five formant voices.
- **Shots:** a run-up in perspective, a THWACK impact frame, a camera climbing the building past pigeons and a cat, then a SIX! stamp. Next comes a glass shatter and a record scratch into a freeze with a snap zoom on the window. Then blame (everyone points), the escape, and an end card.
- **Also shows:** `MIX.gate` for the silence after the crash, `I.glass`, `I.scratch`, gestures (`bat`, `mic`, `point`, `shrug`, `cheer`), `sx: -1` to mirror a pointer, and `Ch.walk` for running away.

## birthday-card (1:1, 22s, watercolour)
"Happy Birthday" sung with any name: set `NAME` (and `AGE`) in score.js. The name is split into sung syllables (`Sing.split`: "Ayesha" → a-ye-sha).
- The candles light one by one in the intro, and a balloon rises on every "hap-py".
- Each syllable of the name stamps in as it is sung. On the last note the candles blow out, with a party popper, a flash and confetti.
- Music box, pizzicato strings and a sung melody in 3/4 time (`beatsPerBar: 3`).
- `STYLE: 'watercolor'` in score.js.

## wedding-invite (9:16, lays itself out for 16:9, 1:1 and 4:5, 39s)
An animated shaadi card. Everything it says is in the `INVITE` block at the top of score.js: the names (with optional Urdu names), the city, the three events (title, Urdu title, date, time, venue), the save-the-date line, the hosts, an optional Bismillah, and an optional credit line. All of them start as placeholders, so confirm every name, date and venue with the family before sharing.
- **The story, one scene per ceremony:** the doors stay closed through a shehnai alaap. They open on the dhol to reveal the couple under a floral arch, and the names stamp in on the beats. An invitation scroll unrolls, and the groom's glasses catch the light on a ting. Then:
  - Mehndi: a henna hand draws itself one stroke per 8th, while the taali claps.
  - Baraat: at night, the groom rides a decorated horse behind a dhol player, with fireworks on the big beats.
  - Walima: the couple sit on a sofa under chandeliers that sparkle on every note.
  
  Then a dhol roll, a held breath, and "Shaadi Mubarak!" with everyone dancing bhangra, the chorus singing it and petals falling. It ends on a save-the-date medallion.
- **The music:** the shaadi recipe in music-cookbook.md: a shehnai line with meend and kan over a drone, a dholak mehndi groove, the dhol chaal with a brass band, soft tabla and strings, and a sung "shaa-di mu-baa-rak!".
- **The look:** a gold-framed card with metallic gold lettering (Great Vibes, Cinzel and Cormorant Garamond, OFL, in `assets/fonts/`), and Urdu in Nastaliq.
- **The people:** the couple are `Ch.person` with `sherwani` + `pagri` + `sehra` and `lehenga` + `dupatta` + `jewelry` + `mehndi`, defined once as `GROOM` and `BRIDE` at the top of film.js. Change those two to look like the real couple, and check them with `render.js cast`.
- **Publishing:** `render.js formats 9:16,16:9,1:1,4:5` gives every platform, and `--res 2160` a 4K master. For sending in WhatsApp chats, make a small 720p copy (reach-and-workflow.md).

## lyric-video (9:16, 29s)
A film cut to a song the film did not write.
- **The files:** `assets/song.m4a` + `assets/song.lrc` (lyrics with word times) → `node engine/render.js analyze assets/song.m4a` → `beats.js`. score.js builds its clock from the analysed beats and takes the lyrics from there.
- **The picture:** a rainy window with a cat and a glass of chai. The city lights pulse on bars, the steam puffs on beats, the sky flashes as each line lands, and the lyrics are sung karaoke-style with the Urdu under them.
- **The demo song** ("Chai aur Baarish") is itself made in code by `make-song.js`: Genre lofi plus the singer, and it writes its own LRC.
- **For the user's own song:** replace the two files, run `analyze`, edit the `URDU` second lines (or delete them), and look at `out/analysis.svg`.

## world-cup-2026 (patterns only, older API, 58s)
"Claude × Afaq, World Cup 2026" covers a living room, a TV match where the ball plays the hook, and tension with a heartbeat. Then come the strike and close-ups, a freeze, GOOOOOAL letters on 8ths, a party, a street chant, a high-five and an outro.
- It predates the documented API: it has its own `T()`/`m()`, its own mixer and its own `window.renderAt`, and its index.html loads neither `engine/music.js` nor `engine/video/boot.js`.
- Read it for staging patterns (a room set, crowds, lighting, paper wipes, impact frames, a handwritten ending) and port them into the template's structure. Never mix the two styles in one project.

## characters/cat.js
A complete custom character built from primitives, the worked example for building new ones. The engine also ships `Ch.cat`, `Ch.dog` and `Ch.bird`.
