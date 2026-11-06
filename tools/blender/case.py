"""The three watch cases, each with its crown, crystal and inner flange (PR 9). Makes models/case-dress.glb,
models/case-mid.glb and models/case-big.glb.

  python3 tools/blender/case.py

One model per size; the metal (steel, gold, platinum) is the game's material, swapped in by name:
  dress  36 mm, thin, slim curved lugs, a sloped polished bezel (steel dress and gold dress cases)
  mid    39 mm, a stepped bezel and a fluted crown (the platinum case)
  big    41 mm, heavy faceted lugs, a wide flat bezel and crown guards (steel sports case, gold display-back case)
The dial is not here (tools/blender/dials.py, vis/watch.js): an empty named "dialAt" marks the dial's centre, its X
scale is the dial's radius, so the game knows where to lay it.
Object (node) names: case, bezel, back, crown, crystal, rehaut, dialAt. Material roles: metal (satin case), polish
(bezel and crown), crystal, rehaut (the flange round the dial, coloured like the dial by the game).
The same numbers are in CASE_GEO in src/vis/watch.js, which draws the Lite stand-ins: change both together.
Blender's +Y is 12 o'clock and +X the crown (3 o'clock); the case back sits on z = 0.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *   # noqa: E402,F403

# all in millimetres: R radius, lw lug gap, lt lug thickness, l2l lug to lug, b back top, m middle top, top bezel top,
# ct crystal top, dz dial height, dr dial radius, bi bezel inner radius, cr crown radius, cl crown length
SIZES = {
    "dress": dict(R=18.0, lw=18, lt=2.3, l2l=44, b=1.4, m=5.8, top=6.8, ct=7.7, dz=4.4, dr=15.4, bi=15.8, cr=2.5, cl=2.2, style="dress"),
    "mid": dict(R=19.5, lw=20, lt=2.4, l2l=47, b=1.6, m=7.0, top=8.2, ct=9.2, dz=5.4, dr=16.6, bi=17.2, cr=2.8, cl=2.4, style="mid"),
    "big": dict(R=20.5, lw=20, lt=3.0, l2l=49, b=2.0, m=8.6, top=10.0, ct=11.0, dz=6.6, dr=16.8, bi=17.4, cr=3.2, cl=2.8, style="big"),
}


def mm(pts):
    return [(r * MM, z * MM) for r, z in pts]


def crown(S, metal):
    """A crown along +X: fluted (dress: fine, big: coarse) with a domed end, on a short tube."""
    cr, cl, seg = S["cr"], S["cl"], 48
    flutes = {"dress": 24, "mid": 18, "big": 12}[S["style"]]
    import bmesh
    bm = bmesh.new()
    prof = [(0, 0), (cr * 0.55, 0), (cr * 0.92, 0.12 * cl), (cr, 0.25 * cl), (cr, 0.82 * cl), (cr * 0.85, 0.97 * cl), (cr * 0.5, cl), (0, cl)]
    rings = []
    for i in range(seg):
        a = i / seg * math.tau
        k = 1.0 - 0.07 * (0.5 + 0.5 * math.cos(a * flutes))   # flutes round the knurled band only
        ring = []
        for j, (r, z) in enumerate(prof):
            rr = r * (k if 2 <= j <= 4 else 1.0)
            ring.append(bm.verts.new((rr * MM * math.cos(a), rr * MM * math.sin(a), z * MM)))
        rings.append(ring)
    for i in range(seg):
        A, B = rings[i], rings[(i + 1) % seg]
        for j in range(len(prof) - 1):
            if prof[j][0] == 0:
                bm.faces.new([A[j], B[j + 1], A[j + 1]])
            elif prof[j + 1][0] == 0:
                bm.faces.new([A[j], B[j], A[j + 1]])
            else:
                bm.faces.new([A[j], B[j], B[j + 1], A[j + 1]])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-8)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    head = obj_from_bm("crownHead", bm, metal)
    autosmooth(head, 50)
    tube = lathe("crownTube", mm([(0, -1.2), (cr * 0.45, -1.2), (cr * 0.45, 0.01), (0, 0.01)]), 24, metal)
    ob = join("crown", [head, tube])
    # lie it along +X at the middle's height, just outside the case
    ob.rotation_euler = (0, math.pi / 2, 0)
    ob.location = ((S["R"] + 0.9) * MM, 0, (S["b"] + S["m"]) / 2 * MM)
    return ob


def lug_outline(S):
    """The lug's side profile in (y, z), mm: from inside the case out to its rounded tip, the top curving down."""
    R, half, b, m = S["R"], S["l2l"] / 2, S["b"], S["m"]
    y0 = R * 0.72
    pts = []
    if S["style"] == "big":   # straight, faceted: a chamfered block that drops at the end
        pts = [(y0, b * 0.6), (half - 1.2, b * 0.7), (half, b * 0.7 + 1.0), (half, m - 2.6), (half - 2.0, m - 1.2), (y0, m - 0.2)]
    else:                      # a smooth downward curve to a rounded tip
        n = 10
        top = []
        for i in range(n + 1):
            t = i / n
            y = y0 + (half - 1.0 - y0) * t
            z = (m - 0.3) - (m - 0.3 - (b + 1.6)) * (t ** 1.6)
            top.append((y, z))
        tip = [(half - 1.0 + math.sin(a) * 1.0, (b + 0.6) + 1.0 * math.cos(a) * 1.0) for a in [i / 6 * math.pi for i in range(1, 6)]]
        bot = [(half - 1.6, b * 0.55), (y0, b * 0.55)]
        pts = top + [(half - 0.2, b + 1.4)] + tip[2:] + bot
    return pts


def lugs(S, metal):
    obs = []
    prof = lug_outline(S)
    for sx in (-1, 1):
        for sy in (-1, 1):
            x0 = sx * (S["lw"] / 2) * MM
            x1 = sx * (S["lw"] / 2 + S["lt"]) * MM
            import bmesh
            bm = bmesh.new()
            a = [bm.verts.new((x0, sy * y * MM, z * MM)) for y, z in prof]
            b = [bm.verts.new((x1, sy * y * MM, z * MM)) for y, z in prof]
            n = len(prof)
            bm.faces.new(a)
            bm.faces.new(list(reversed(b)))
            for i in range(n):
                j = (i + 1) % n
                bm.faces.new([a[i], a[j], b[j], b[i]])
            bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
            ob = obj_from_bm("lug", bm, metal)
            add_bevel(ob, (0.35 if S["style"] == "big" else 0.5) * MM, 2 if S["style"] == "big" else 3, 30)
            autosmooth(ob, 40)
            obs.append(ob)
    return obs


def guards(S, metal):
    """Crown guards on the big case: two shoulders either side of the crown."""
    obs = []
    for sy in (-1, 1):
        y0, y1 = sy * (S["cr"] + 0.6), sy * (S["cr"] + 3.6)
        R = S["R"]
        outline = [(R - 1.0, y0), (R + 2.2, y0 * 0.98 + sy * 0.2), (R + 2.4, (y0 + y1) / 2), (R - 0.5, y1)]
        if sy < 0:
            outline.reverse()
        ob = prism("guard", [(x * MM, y * MM) for x, y in outline], (S["b"] + 0.8) * MM, (S["m"] - 0.8) * MM, metal, 0.5 * MM, 2)
        obs.append(ob)
    return obs


def build(name, S):
    reset()
    metal = mat("metal", (0.78, 0.8, 0.82), 1.0, 0.32)
    polish = mat("polish", (0.85, 0.87, 0.89), 1.0, 0.08)
    glass = mat("crystal", (0.9, 0.95, 1.0), 0.0, 0.02)
    rehaut = mat("rehaut", (0.85, 0.85, 0.82), 0.0, 0.5)
    R, b, m, top, ct, dz, dr, bi = S["R"], S["b"], S["m"], S["top"], S["ct"], S["dz"], S["dr"], S["bi"]
    # the middle: a ring with softly rounded outer edges, its bore down to the dial
    mid = [(dr + 0.3, b), (R - 1.0, b), (R - 0.35, b + 0.2), (R - 0.05, b + 0.7), (R, b + 1.2), (R, m - 1.2), (R - 0.05, m - 0.7), (R - 0.35, m - 0.2),
           (R - 1.0, m), (bi + 0.3, m), (bi + 0.3, dz - 0.2), (dr + 0.3, dz - 0.2), (dr + 0.3, b)]
    case = lathe("caseMid", mm(mid), 96, metal)
    parts = [case] + lugs(S, metal)
    if S["style"] == "big":
        parts += guards(S, metal)
    join("case", parts)
    # the bezel
    if S["style"] == "dress":
        bz = [(bi, m), (R - 1.0, m), (R - 0.7, m + 0.25), (bi + 0.9, top - 0.05), (bi + 0.35, top), (bi, top - 0.2), (bi, m)]
    elif S["style"] == "mid":   # stepped: a flat outer ring, then a sloped inner step
        bz = [(bi, m), (R - 1.0, m), (R - 0.75, m + 0.45), (R - 0.9, m + 0.7), (R - 2.0, m + 0.75), (bi + 0.6, top - 0.05), (bi + 0.2, top), (bi, top - 0.2), (bi, m)]
    else:                       # wide and flat, polished
        bz = [(bi, m), (R - 0.6, m), (R - 0.2, m + 0.4), (R - 0.3, top - 0.35), (R - 0.7, top), (bi + 0.5, top), (bi, top - 0.3), (bi, m)]
    lathe("bezel", mm(bz), 96, polish)
    # the back: a low dome with a step
    lathe("back", mm([(0, -0.2), (R - 4.5, -0.2), (R - 3.2, 0), (R - 1.4, 0.15), (R - 1.0, b), (0, b)]), 64, metal)
    # the flange round the dial (rehaut): from the dial's edge up to the crystal
    cz0 = top - 0.6
    lathe("rehaut", mm([(dr - 0.1, dz), (bi - 0.05, cz0), (bi + 0.25, cz0), (bi + 0.25, dz - 0.1), (dr - 0.1, dz)]), 96, rehaut)
    # the crystal: a gently domed sapphire
    lathe("crystal", mm([(0, ct), (bi * 0.55, ct - 0.12), (bi * 0.85, ct - 0.35), (bi - 0.15, ct - 0.75), (bi, cz0 + 0.1), (bi, cz0), (0, cz0)]), 64, glass)
    crown(S, polish)
    e = empty("dialAt", 0, 0, dz * MM)
    e.scale = (dr * MM, dr * MM, dr * MM)
    return export("case-" + name)


if __name__ == "__main__":
    for n in (sys.argv[1:] or SIZES.keys()):
        build(n, SIZES[n])
