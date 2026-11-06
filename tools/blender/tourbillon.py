"""The tourbillon cage (PR 9): models/tourbillon-cage.glb.

  python3 tools/blender/tourbillon.py

The cage that carries the escapement and the balance round once a minute. On Full / Ultra it replaces the coded rings
and bars of the cage in the movement (src/vis/movement.js) and fills the tourbillon aperture on the dial side
(src/vis/watch.js); Lite keeps the coded cage. The escape wheel, the pallet fork and the balance stay code (they move).
A lower carriage (a ring and three straight spokes to the hub), three pillars, and an upper bridge of three lyre-shaped
arms, each a pair of curves that meet at the hub, with a jewel in a gold chaton on top.
Sized in mm for the movement: the ring is 4.55 mm across its radius (1.3 scene units) and the cage 1.8 mm tall; the
centre is the cage's axis, z = 0 its foot. Materials: cage (polished steel), ruby, gilt.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *   # noqa: E402,F403

R, H = 4.55, 1.8   # mm


def ring(name, r0, r1, z0, z1, m, seg=64):
    return lathe(name, [(r0 * MM, z0 * MM), (r1 * MM, z0 * MM), (r1 * MM, z1 * MM), (r0 * MM, z1 * MM), (r0 * MM, z0 * MM)], seg, m)


def build():
    reset()
    steel = mat("cage", (0.85, 0.87, 0.9), 1, 0.06)
    ruby = mat("ruby", (0.6, 0.03, 0.1), 0, 0.05)
    gilt = mat("gilt", (0.85, 0.7, 0.4), 1, 0.15)
    parts = [ring("lower", R - 0.45, R, 0, 0.22, steel)]
    # lower spokes: straight, tapering from the ring to the hub
    for i in range(3):
        a = i * math.tau / 3 + math.pi / 6
        ca, sa = math.cos(a), math.sin(a)
        px, py = -sa, ca
        pts = [(0.5, 0.32), (R - 0.3, 0.2), (R - 0.3, -0.2), (0.5, -0.32)]
        outline = [((d * ca + w * px) * MM, (d * sa + w * py) * MM) for d, w in pts]
        parts.append(prism("spoke", outline, 0, 0.18 * MM, steel, 0.04 * MM, 1))
    parts.append(lathe("hubL", [(0, 0), (0.7 * MM, 0), (0.7 * MM, 0.26 * MM), (0, 0.26 * MM)], 24, steel))
    # pillars
    for i in range(3):
        a = i * math.tau / 3 + math.pi / 6
        p = lathe("pillar", [(0, 0.2 * MM), (0.2 * MM, 0.2 * MM), (0.16 * MM, (H - 0.2) * MM), (0, (H - 0.2) * MM)], 12, steel)
        p.location = ((R - 0.22) * math.cos(a) * MM, (R - 0.22) * math.sin(a) * MM, 0)
        parts.append(p)
    parts.append(ring("upper", R - 0.35, R, H - 0.22, H, steel))
    # the lyre arms: each a pair of curves from the hub, bowing apart, meeting the ring either side of a pillar
    n = 14
    for i in range(3):
        a0 = i * math.tau / 3 + math.pi / 6
        for side in (-1, 1):
            out, inn = [], []
            for k in range(n + 1):
                t = k / n
                d = 0.6 + (R - 0.6 - 0.15) * t
                bow = side * (0.18 + 0.75 * math.sin(t * math.pi) ** 1.2 + 0.25 * t)   # radians of sweep off the arm's line
                ang = a0 + bow * (1 - 0.35 * t) * 0.5
                w = 0.17 - 0.05 * t
                x, y = d * math.cos(ang), d * math.sin(ang)
                nx, ny = -math.sin(ang), math.cos(ang)
                out.append(((x + nx * w) * MM, (y + ny * w) * MM))
                inn.append(((x - nx * w) * MM, (y - ny * w) * MM))
            outline = out + list(reversed(inn))
            parts.append(prism("lyre", outline, (H - 0.2) * MM, (H - 0.02) * MM, steel, 0.03 * MM, 1))
    parts.append(lathe("hubU", [(0, (H - 0.24) * MM), (0.75 * MM, (H - 0.24) * MM), (0.75 * MM, H * MM), (0, H * MM)], 24, steel))
    join("cage", parts)
    lathe("chaton", [(0, H * MM), (0.42 * MM, H * MM), (0.42 * MM, (H + 0.14) * MM), (0, (H + 0.14) * MM)], 20, gilt)
    lathe("jewel", [(0, H * MM), (0.24 * MM, H * MM), (0.24 * MM, (H + 0.18) * MM), (0, (H + 0.2) * MM)], 16, ruby)
    return export("tourbillon-cage")


if __name__ == "__main__":
    build()
