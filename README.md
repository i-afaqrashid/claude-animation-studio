# Claude Animation Studio

**A Claude Code plugin for making animated short films where every frame is drawn in code and the music is synthesized in code, perfectly in sync.**

🔊 **Sound on**. The music is made in code too.

https://github.com/user-attachments/assets/9168dc15-a663-4611-a5de-5dd5a20bd7b9

*An 18-second moment from "Claude × Afaq, World Cup 2026", a 58-second film Claude made with this skill. The frames and the soundtrack come from zero samples, stock clips, or music libraries: drums, bass, brass, the crowd, and a street chanting "o-lé".*

## Demo films

Every film below was made with this plugin: the pictures, the music, the singing and the voices are all code. The GIFs are silent; click one to watch the MP4 **with sound**. Each one is a starter you can remix: `new-project.js my-film --from <name>`.

| | |
|:--:|:--:|
| [![Qawwali Night](docs/gallery/qawwali-night.gif)](https://github.com/i-afaqrashid/claude-animation-studio/releases/download/demos/qawwali-night.mp4)<br>**Qawwali Night** · `qawwali-night` · 16:9 · 43s<br>An original qawwali that speeds up from 88 to 152 BPM. The lead sings in Roman Urdu with Nastaliq captions, and the chorus answers. Harmonium, tabla and taali play, and the crowd showers the stage with notes and petals. | [![Gully Cricket](docs/gallery/gully-cricket.gif)](https://github.com/i-afaqrashid/claude-animation-studio/releases/download/demos/gully-cricket.mp4)<br>**Gully Cricket** · `gully-cricket` · 9:16 · 27s<br>Last ball, six to win. Chacha commentates (a real voiceover, lip-synced): THWACK, it's up… it's up… SIX! Then aunty's window. |
| [![Chai aur Baarish](docs/gallery/lyric-video.gif)](https://github.com/i-afaqrashid/claude-animation-studio/releases/download/demos/lyric-video.mp4)<br>**Chai aur Baarish** · `lyric-video` · 9:16 · 29s<br>A lyric video cut to a song with `analyze`: its beats, bars and word-timed lyrics. The song itself is lo-fi made in code. | [![Happy Birthday](docs/gallery/birthday-card.gif)](https://github.com/i-afaqrashid/claude-animation-studio/releases/download/demos/birthday-card.mp4)<br>**Happy Birthday, Ayesha** · `birthday-card` · 1:1 · 22s<br>A watercolour card that sings "Happy Birthday" with any name, and the candles blow out on the last note. |
| [![Animation Studio launch](docs/gallery/product-launch.gif)](https://github.com/i-afaqrashid/claude-animation-studio/releases/download/demos/product-launch.mp4)<br>**The launch film** · `product-launch` · 16:9 · 36s<br>A voiceover with word-timed captions, six looks, four genres, a parade, a map and a chart. | [▶ **Pantrio**](https://github.com/i-afaqrashid/claude-animation-studio/releases/download/demos/app-promo-pantrio.mp4) · `app-promo` · 9:16 · 20s<br>An app promo made with the UI kit (a fictional app).<br><br>[▶ **Claude × Afaq, World Cup 2026**](https://github.com/i-afaqrashid/claude-animation-studio/releases/download/demos/world-cup-2026.mp4) · 16:9 · 58s<br>The film that started it all. |

## What it does

Ask Claude for a video, and it:

1. writes the story as a **song structure** that fits the moment (a last-minute goal might get a tense build, a beat of silence and a huge drop),
2. puts every moment in one **score file** that both the music and the animation read,
3. **synthesizes the soundtrack** in plain JavaScript: drums, bass, pads, brass, music box, formant-synthesized crowds and choirs, and sound effects,
4. **draws every frame** in a hand-drawn paper-cutout style (boiling pencil lines, hatching, torn-paper captions),
5. lets you **watch and listen before rendering** (a live preview in your browser with a timeline of every scene and moment),
6. renders a 1080p MP4 with headless Chrome + ffmpeg, then **checks its own work**: a storyboard for your approval before the full render, loudness and true-peak measurements, and `verify`, which measures that the sound and the picture hit every moment marked as a sync hit (±20 ms, ±1 frame), and fails any it can't measure clearly.

Because one score drives both sides, a football pass can *play* a note of the melody, a title can stamp one letter per 8th note, and fireworks can burst exactly on the clap.

**Any format, including vertical.** 16:9 for YouTube and X, **9:16 for Reels, TikTok and Shorts** (laid out for the platforms' safe areas, not cropped), 1:1 and 4:5 for feeds. A UI kit draws crisp app screens (phone mockup, cards, chat, stats, buttons) inside the hand-drawn world, which makes it good for app and brand promos too.

**Your own characters.** People are fully customizable: hair (curly, long, bun, hijab…), beards, glasses, outfits (jersey, hoodie, dress, shalwar kameez, thobe, abaya, sari, suit…), headwear (topi, cap, turban, ghutra), build and colours. They walk, gesture (wave, point, cheer, phone, dua, a cricket bat, a microphone…) and lip-sync to the voiceover, and dogs, cats and birds join them. Claude can also build new characters, like pets, robots or mascots, from the same hand-drawn primitives, and drop your real photos into a film as taped prints. Share a photo and say either **"make a cartoon of me"** (Claude designs a matching character) or **"put this photo in the film"** (the real photo appears as a taped print).

**Sound beyond the synth.**
- Eight genre packs lay down a full backing track in one call: lo-fi, chiptune, orchestral, EDM, afrobeats, qawwali, desi pop and boom-bap.
- An offline **voiceover** uses your computer's own text-to-speech. It gives captions timed to each word (the word times are estimated from the speech, so they can be a little off), lip-synced mouths, and music that ducks under the voice.
- A formant singer sings short jingles, and "Happy Birthday" with any name.
- `analyze` finds the beats, bars and sections of **your own song**, so a lyric video or montage lands on the real beat.

**Six looks from one switch:** paper (the default), flat vector, pixel art, chalkboard, neon and watercolour.

**Data and places:** numbers that count up on the beat (in lakh format too: Rs 12,50,000), bar, line and donut charts, and hand-drawn maps with pins that drop across Pakistan and planes that fly routes. `snap` screenshots a real website so it can scroll inside the phone mockup.

## Install (Claude Code)

```
/plugin marketplace add i-afaqrashid/claude-animation-studio
/plugin install animation-studio@claude-animation-studio
```

Then just ask, in any project:

> make a 30-second animated video about my cat's birthday, with music

> make an animated short like the Opus animations: Claude helping me study for exams

**Requirements:** Node.js 22+, ffmpeg, and Google Chrome (or Chromium; set `CHROME_PATH` if it's somewhere unusual). No `npm install` needed.

## Using the engine by hand

```bash
node skills/animation-studio/scripts/new-project.js my-film        # starter (23s demo); add --format 9:16 for vertical
cd my-film
node song.js                   # music  -> out/music.wav
node engine/render.js preview  # watch + listen live in your browser (timeline, markers, loop)
node engine/render.js board    # storyboard of every named moment -> out/board.png
node engine/render.js cast     # every character in 6 expressions -> out/cast.png
node engine/render.js clip @drop-2 @drop+3   # one section with sound -> out/clip_*.mp4
node engine/render.js video    # frames  -> out/video.mp4
node engine/render.js mux      # final   -> out/my-film.mp4
node engine/render.js verify   # measures sound + picture at every sync marker (unclear = fail)
node engine/render.js qa       # text in sampled frames (1/s + each marker): safe area, size, overlap, contrast
node engine/render.js pacing   # the hook in the first 3 seconds, and the cuts
node engine/render.js poster   # three YouTube thumbnails + a vertical cover
node engine/render.js formats 16:9,9:16   # every format from one score
node engine/render.js analyze assets/song.mp3   # tempo, beats, bars, sections of your own song
node engine/render.js snap https://your.site --full   # a phone screenshot of a real website
node engine/render.js brand-from https://your.site    # brand.json: colours, fonts, logo
```

Add `--style neon` (or `flat`, `pixel`, `chalk`, `watercolor`) to any command to change the look, and `--draft` for half-resolution renders that are 2–4× faster.

Times can be seconds, `bar:beat` (`8:2`), or a named moment from the score (`@drop`, `@drop+0.5`).

Start from a demo with `--from <name>`: `app-promo`, `product-launch`, `qawwali-night`, `gully-cricket`, `birthday-card`, `lyric-video`, or `world-cup-2026` (to re-render or remix the original 58s film).

## What's inside

```
skills/animation-studio/
├── SKILL.md              instructions Claude follows
├── references/           storytelling, music cookbook, visual style, engine API, gotchas
├── engine/               synth (DSP, instruments, mixing), drawing toolkit, characters, renderer
├── template/             a 23s starter film (any format)
├── examples/             starters: app-promo, product-launch, qawwali-night, gully-cricket,
│                         birthday-card, lyric-video, world-cup-2026 (see references/starters.md)
└── scripts/new-project.js     scaffolds a new film
```

## Credits

- Inspired by the Claude Opus 5.5 animations people shared on X.
- Fonts: Caveat, Bungee, Patrick Hand, Gochi Hand, Inter, Noto Nastaliq Urdu, Noto Naskh Arabic, Noto Sans Devanagari (SIL OFL 1.1), Permanent Marker (Apache 2.0), all from Google Fonts. License files are in `engine/fonts/`.
- Map outlines: [Natural Earth](https://www.naturalearthdata.com/) (public domain) via [world-atlas](https://github.com/topojson/world-atlas) (ISC).
- Community project, not affiliated with or endorsed by Anthropic.

MIT License.
