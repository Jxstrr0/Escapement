# models/ credits

Every file here is CC0 or CC-BY. These models dress the workshop and the cased watch on the **Full and Ultra** tiers only (`ROOM_MODELS` in `src/vis/room.js`, `WATCH.models` in `src/vis/watch.js`); Lite draws everything in code and never downloads them. The watch movement itself is drawn in code (`src/vis/movement.js`).

The Poly Haven ones were downloaded as the 1k glTF and packed with `tools/pack-model.py` (vertex data quantized; textures re-saved as JPEG). The four small hand tools that the camera sees up close (magnifier, oil tin, pliers, screwdrivers) keep 512 px textures (`--tex 512 --normal 256`); the rest use 256 px (normal maps 128 px).

The files made by `tools/blender/*.py` are original: Longlight Interactive built them from code in Blender (no downloaded meshes or textures), and they are released under CC0 like the rest. Run the script again to remake one.

| File | What it is in the game | Source | Author | Licence |
|---|---|---|---|---|
| `arm-lamp.glb` | The arm lamp clamped at the left of the bench | [Poly Haven: Desk Lamp Arm 01](https://polyhaven.com/a/desk_lamp_arm_01) | Yann Kervran, Kuutti Siitonen | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `screwdrivers.glb` | The screwdrivers by the felt mat | [Poly Haven: Screwdrivers 02](https://polyhaven.com/a/screwdrivers_02) | BKS | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `pliers.glb` | Pliers lying on the bench | [Poly Haven: Pliers](https://polyhaven.com/a/pliers) | PierreB3D | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `magnifier.glb` | The hand magnifier at the front right | [Poly Haven: Magnifying Glass 01](https://polyhaven.com/a/magnifying_glass_01) | Nazar Borodavka | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `oil-tin.glb` | The oil tin on the drawer riser | [Poly Haven: Oil Tin](https://polyhaven.com/a/oil_tin) | Niklas | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `cleaner-tin.glb` | The cleaning-fluid tin on the drawer riser | [Poly Haven: Cleaner Tin 01](https://polyhaven.com/a/cleaner_tin_01) | Tom Phillips | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `alarm-clock.glb` | The alarm clock (on the riser in the corner, on the shelf later) | [Poly Haven: Alarm Clock 01](https://polyhaven.com/a/alarm_clock_01) | Yann Kervran, James Ray Cock | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `wall-clock.glb` | The wall clock (from the shop on) | [Poly Haven: Wall Clock](https://polyhaven.com/a/wall_clock) | PierreB3D | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `grandfather-clock.glb` | The longcase clock in the shop and workshop | [Poly Haven: Vintage Grandfather Clock 01](https://polyhaven.com/a/vintage_grandfather_clock_01) | Yann Kervran, James Ray Cock | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `drawers.glb` | The parts cabinet against the left wall (from the shop on) | [Poly Haven: Vintage Wooden Drawer 01](https://polyhaven.com/a/vintage_wooden_drawer_01) | James Ray Cock | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `timing-machine.glb` | The timing machine on the bench: the timegrapher, its microphone stand (plain or six-position head) and the lab's climate box | Original, made by `tools/blender/machines.py` | Kelbo / Longlight Interactive | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `cleaning-machine.glb` | The cleaning machine on the drawer riser | Original, made by `tools/blender/machines.py` | Kelbo / Longlight Interactive | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `display-window.glb` | The shop's display window (a vitrine on a walnut cabinet) | Original, made by `tools/blender/machines.py` | Kelbo / Longlight Interactive | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `case-dress.glb` | The dress case (36 mm) with its crown and crystal: steel dress and gold dress cases on the Dial side | Original, made by `tools/blender/case.py` | Kelbo / Longlight Interactive | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `case-mid.glb` | The mid case (39 mm, stepped bezel): the platinum case | Original, made by `tools/blender/case.py` | Kelbo / Longlight Interactive | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `case-big.glb` | The big case (41 mm, crown guards): steel sports and gold display-back cases | Original, made by `tools/blender/case.py` | Kelbo / Longlight Interactive | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `dial-silver.glb` | The silver dial's applied faceted batons | Original, made by `tools/blender/dials.py` | Kelbo / Longlight Interactive | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `dial-black.glb` | The black dial's lume plots, batons and triangle | Original, made by `tools/blender/dials.py` | Kelbo / Longlight Interactive | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `dial-open.glb` | The open-heart dial's gold studs | Original, made by `tools/blender/dials.py` | Kelbo / Longlight Interactive | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `dial-guilloche.glb` | The guilloché dial's applied Roman numerals | Original, made by `tools/blender/dials.py` | Kelbo / Longlight Interactive | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `tourbillon-cage.glb` | The tourbillon cage, in the movement and in the dial's aperture | Original, made by `tools/blender/tourbillon.py` | Kelbo / Longlight Interactive | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
