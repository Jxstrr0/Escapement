# Escapement: the game as built

This file describes the game as it actually is on `main`. It grows as plan PRs land; the plan itself, with everything still to come, is [`ESCAPEMENT-PLAN.md`](ESCAPEMENT-PLAN.md).

## 0.1.0.0: scaffold (PR 0)

- **Setting:** the Haldis, a high watchmaking valley in the north of Velmark, an invented alpine country. Career years 2000 to 2030 (not playable yet).
- **Money:** the Velmark thaler, shown `Th 4,850` (100 pfennig to a thaler). Prices are sized like Swiss francs: repairs 80 to 400, Chronometer pieces 5,000 to 15,000, auction lots up to six figures.
- **Look:** dark felt and brass, steel greys for secondary text; a pale workshop light theme. Space Grotesk for UI, JetBrains Mono for readouts. The 3D bench view stays dark in both themes.
- **Screens:** an intro on first visit; five tabs (Bench, Build, Test, Shop, Career), each with cards saying what is coming and in which PR; a Settings sheet from the gear (graphics tier, auto-adjust, theme, motion, saves, install app, version).
- **3D:** a placeholder screw balance with a blued hairspring and a balance cock on a felt mat under one warm lamp. The balance swings at 28,800 bph (4 full swings a second) and 280° amplitude. Drag to orbit, pinch or wheel to zoom. Lite: Phong materials, no shadows, pixel ratio 1. Full: PBR brass and steel with a painted studio reflection, soft lamp shadow. Ultra: Full plus bloom (addons loaded on demand).
- **Saves:** everything in localStorage under `esc-save` and `esc-slot1`–`3`. Back up / Restore with `ESC1:` codes.
- **Save safety (0.1.0.2):** in Shop → Saves and Settings → Saves, **Save backup file** writes the same code to `escapement-backup-YYYY-MM-DD.txt` (share sheet on phones that take files, so iPhone offers Save to Files; a download elsewhere) and **Load backup file** reads one back through the same checks and confirm as a pasted code. A line says whether the browser has agreed to keep the game's storage; the game asks it once a visit, once there is progress. With progress and no backup (copied code or file) for 14 days, a quiet bar offers the Saves card once a visit. The last backup time rides in `esc-save` as `lastBackup`.
- **PWA:** installable, works offline, shows "New version ready" after a deploy.

## Known loose ends

- Save slots exist in the save format but have no UI until PR 5.
