# sounds/ credits

Every file here is CC0. These are the workshop sounds (`WORKSHOP_SOUND` in `src/sound/workshop.js`, the **Workshop sounds** switch in Settings). They are fetched only once that switch is on and you have tapped the page, and the service worker keeps them for offline. The watch's tick on the Test tab is not a file: it is made in code (`src/sound/tick.js`).

Longlight Interactive trimmed, filtered and peak-normalised each recording with ffmpeg, mixed it to mono and saved it as MP3. The three loops (`clock`, `valley`, `machine`) carry 0.1 s of padding at both ends so they repeat without a click. Those edits are released under CC0 too.

| File | What it is in the game | Made from | Author | Licence |
|---|---|---|---|---|
| `door.mp3` | The shop bell, when a repair, a commission enquiry or a trade offer comes in | `bell.wav` from [OpenGameArt: Various Sound Effects](https://opengameart.org/content/various-sound-effects) | laleksic | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `sale.mp3` | The till drawer and coins, when a piece sells or a trade batch is delivered | `drawer_open.wav` and `pickup_coins.wav` from [OpenGameArt: Various Sound Effects](https://opengameart.org/content/various-sound-effects) | laleksic | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `chime.mp3` | Three strokes of a mantel clock, at Close week | The same `bell.wav`, an octave down and struck three times | laleksic | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `clock.mp3` | The wall clock ticking (ambience) | `clock-1.ogg` from [OpenGameArt: Ticking Clock](https://opengameart.org/content/ticking-clock-0) | AntumDeluge | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `valley.mp3` | Birds and air through the window (ambience) | 30 s of `amb_morning.ogg` from [OpenGameArt: AMB Morning Sounds (Perfect Loop)](https://opengameart.org/content/amb-morning-sounds-perfect-loop) | Kresiek The Furry | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `machine.mp3` | The cleaning machine running a cycle (ambience, once you own one) | `loop_generator_1.mp3` from [OpenGameArt: Generator (loop)](https://opengameart.org/content/generator-loop) | YCbCr | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
