# sounds/ credits

The six recordings in the first table are CC0. The ten in the second table were made for Escapement with ElevenLabs' sound effects generator on Kelbo's paid plan (1.1.1.0), which allows their use in the game. These are the workshop sounds (`WORKSHOP_SOUND` in `src/sound/workshop.js`, the **Workshop sounds** switch in Settings). They are fetched only once that switch is on and you have tapped the page, and the service worker keeps them for offline. The watch's tick on the Test tab is not a file: it is made in code (`src/sound/tick.js`).

Longlight Interactive trimmed, filtered and peak-normalised each recording with ffmpeg, mixed it to mono and saved it as MP3. The three loops (`clock`, `valley`, `machine`) carry 0.1 s of padding at both ends so they repeat without a click. Those edits are released under CC0 too.

| File | What it is in the game | Made from | Author | Licence |
|---|---|---|---|---|
| `door.mp3` | The shop bell, when a repair, a commission enquiry or a trade offer comes in | `bell.wav` from [OpenGameArt: Various Sound Effects](https://opengameart.org/content/various-sound-effects) | laleksic | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `sale.mp3` | The till drawer and coins, when a piece sells or a trade batch is delivered | `drawer_open.wav` and `pickup_coins.wav` from [OpenGameArt: Various Sound Effects](https://opengameart.org/content/various-sound-effects) | laleksic | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `chime.mp3` | Three strokes of a mantel clock, at Close week | The same `bell.wav`, an octave down and struck three times | laleksic | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `clock.mp3` | The wall clock ticking (ambience) | `clock-1.ogg` from [OpenGameArt: Ticking Clock](https://opengameart.org/content/ticking-clock-0) | AntumDeluge | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `valley.mp3` | Birds and air through the window (ambience) | 30 s of `amb_morning.ogg` from [OpenGameArt: AMB Morning Sounds (Perfect Loop)](https://opengameart.org/content/amb-morning-sounds-perfect-loop) | Kresiek The Furry | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `machine.mp3` | The cleaning machine running a cycle (ambience, once you own one) | `loop_generator_1.mp3` from [OpenGameArt: Generator (loop)](https://opengameart.org/content/generator-loop) | YCbCr | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |

## Made with ElevenLabs (1.1.1.0)

Generated from text prompts with ElevenLabs sound effects on Kelbo's paid plan, three takes each; Longlight Interactive picked one, trimmed it, faded its tail, peak-normalised it and saved it as mono MP3 with ffmpeg. The three loops (`staff`, `fair`, `rain`) were crossfaded into themselves (0.6 s) and carry 0.1 s of padding at both ends, like the loops above.

| File | What it is in the game | Prompt (short) |
|---|---|---|
| `pass.mp3` | A trial passed: the result sheet opens | A rubber stamp, then a small bell |
| `fail.mp3` | A trial failed | A dull thud, then paper |
| `gavel.mp3` | Your lot knocked down at Brugg & Lell | An auction gavel |
| `tool.mp3` | An adjusting press on the Test tab (Regulate, Adjust beat, Poise) | Small watchmaker's tool clicks |
| `wind.mp3` | Full wind on the timegrapher | Winding a watch crown |
| `crate.mp3` | A trade batch accepted: the parts arrive | A wooden crate of parts set down |
| `newmachine.mp3` | A workshop machine bought | A bench machine starting up |
| `staff.mp3` | Staff at their benches (ambience, once you employ someone) | A quiet workshop at work |
| `fair.mp3` | The Haldis Valley Fair's crowd (ambience, in fair week) | A fair crowd outdoors |
| `rain.mp3` | Rain on the window (ambience, the Rain setting) | Rain on a window pane |
