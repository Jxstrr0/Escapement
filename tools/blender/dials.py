"""The applied parts of the dials (PR 9): models/dial-silver.glb, dial-black.glb, dial-open.glb, dial-guilloche.glb.

  python3 tools/blender/dials.py

Each case comes with its own dial (CASES in src/app/state.js). The dial plate itself, its printing, the sub-dials the
build asks for and the hands are drawn in code on every tier (src/vis/watch.js), because they change with the build.
Blender makes only what stands up off the dial and catches the light, so Full / Ultra show real applied indices:
  silver     (steel dress)   faceted batons, doubled at 12
  black      (steel sports)  lume plots in polished surrounds, batons at 3, 6 and 9, a triangle at 12
  open       (gold, display back)  domed gold studs, a double baton at 12
  guilloche  (platinum)      applied Roman numerals, set radially
  enamel     (gold dress)    nothing applied: its Roman numerals are fired into the enamel (printed in code)
Every hour marker is its own object named h0 (12 o'clock) to h11 (11 o'clock), so the game can hide the ones a sub-dial
or a window covers. Materials: applied (the marker metal), lume. Modelled on a dial of radius DIAL_R mm, centre at the
origin, sitting on z = 0; the game scales to the case's dial. 12 o'clock is +Y.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *   # noqa: E402,F403
import bmesh            # noqa: E402

DIAL_R = 16.0   # mm


def at_hour(ob, h, r):
    """Place an object built pointing up +Y at the origin onto hour h, radius r (mm)."""
    a = -h / 12 * math.tau
    ob.location = (-r * MM * math.sin(a), r * MM * math.cos(a), 0)
    ob.rotation_euler = (0, 0, a)
    return ob


def faceted_baton(name, L, W, H, material):
    """A baton with a ridge along its length, its ends cut square: centred on the origin, along Y."""
    bm = bmesh.new()
    hw, hl = W / 2 * MM, L / 2 * MM
    h, ridge = H * MM * 0.55, H * MM
    v = [bm.verts.new(p) for p in [(-hw, -hl, 0), (hw, -hl, 0), (hw, hl, 0), (-hw, hl, 0),
                                   (-hw, -hl, h), (hw, -hl, h), (hw, hl, h), (-hw, hl, h),
                                   (0, -hl, ridge), (0, hl, ridge)]]
    for f in [(0, 3, 2, 1), (0, 1, 5, 4), (2, 3, 7, 6), (1, 2, 6, 5), (3, 0, 4, 7),
              (4, 5, 8), (6, 7, 9), (5, 6, 9, 8), (7, 4, 8, 9)]:
        bm.faces.new([v[i] for i in f])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj_from_bm(name, bm, material)


def silver():
    reset()
    ap = mat("applied", (0.9, 0.92, 0.94), 1, 0.08)
    for h in range(12):
        L = 3.4 if h % 3 == 0 else 2.6
        if h == 0:
            parts = [place(faceted_baton("a", L, 0.8, 0.45, ap), x=-0.6 * MM), place(faceted_baton("b", L, 0.8, 0.45, ap), x=0.6 * MM)]
            ob = join("h0", parts)
        else:
            ob = faceted_baton("h%d" % h, L, 0.95, 0.45, ap)
        at_hour(ob, h, DIAL_R - 2.6 - L / 2)
    return export("dial-silver")


def plot(name, r, H, ap, lume):
    """A lume plot: a polished cup with the luminous fill a hair below its rim."""
    cup = lathe(name + "c", [(0, 0), (r * MM, 0), (r * MM, H * MM), ((r - 0.25) * MM, H * MM), ((r - 0.25) * MM, H * 0.6 * MM), (0, H * 0.6 * MM)], 24, ap)
    fill = lathe(name + "f", [(0, H * 0.6 * MM), ((r - 0.25) * MM, H * 0.6 * MM), ((r - 0.25) * MM, H * 0.9 * MM), (0, H * 0.92 * MM)], 24, lume)
    return [cup, fill]


def framed(name, outline, H, ap, lume):
    """A frame of polished metal round a lume fill: outline [(x, y)] in mm, centred on the origin."""
    cx = sum(p[0] for p in outline) / len(outline)
    cy = sum(p[1] for p in outline) / len(outline)
    inner = [((x - cx) * 0.62 + cx, (y - cy) * 0.78 + cy) for x, y in outline]
    frame = prism(name + "c", [(x * MM, y * MM) for x, y in outline], 0, H * 0.6 * MM, ap, 0.08 * MM, 1)
    rim = prism(name + "r", [(x * MM, y * MM) for x, y in outline], H * 0.6 * MM, H * MM, ap)
    fill = prism(name + "f", [(x * MM, y * MM) for x, y in inner], H * 0.6 * MM, H * 0.92 * MM, lume)
    return [frame, rim, fill]


def black():
    reset()
    ap = mat("applied", (0.9, 0.92, 0.94), 1, 0.1)
    lume = mat("lume", (0.92, 0.94, 0.86), 0, 0.6)
    for h in range(12):
        if h == 0:
            parts = framed("t", [(-1.5, 1.4), (1.5, 1.4), (0, -1.6)], 0.5, ap, lume)
        elif h % 3 == 0:
            parts = framed("b", [(-0.85, -2.0), (0.85, -2.0), (0.85, 2.0), (-0.85, 2.0)], 0.5, ap, lume)
        else:
            parts = plot("p", 1.05, 0.5, ap, lume)
        ob = join("h%d" % h, parts)
        at_hour(ob, h, DIAL_R - 3.4)
    return export("dial-black")


def stud(name, r, H, ap):
    return lathe(name, [(0, 0), (r * MM, 0), (r * MM, H * 0.3 * MM), (r * 0.85 * MM, H * 0.7 * MM), (r * 0.5 * MM, H * 0.95 * MM), (0, H * MM)], 24, ap)


def open_dial():
    reset()
    ap = mat("applied", (0.95, 0.8, 0.5), 1, 0.1)
    for h in range(12):
        if h == 0:
            ob = join("h0", [place(faceted_baton("a", 3.2, 0.7, 0.45, ap), x=-0.55 * MM), place(faceted_baton("b", 3.2, 0.7, 0.45, ap), x=0.55 * MM)])
            at_hour(ob, h, DIAL_R - 4.0)
        else:
            ob = stud("h%d" % h, 0.85 if h % 3 else 1.05, 0.5, ap)
            at_hour(ob, h, DIAL_R - 3.4)
    return export("dial-open")


ROMAN = ["XII", "I", "II", "III", "IIII", "V", "VI", "VII", "VIII", "IX", "X", "XI"]


def numeral(name, text, height, depth, ap):
    """A Roman numeral as a solid: Blender's own font, converted to a mesh and centred on the origin, reading upright."""
    cu = bpy.data.curves.new(name, "FONT")
    cu.body = text
    cu.size = height * MM * 1.38    # the font's capital height is about 0.72 of its size
    cu.extrude = depth * MM / 2
    cu.align_x = "CENTER"
    cu.align_y = "CENTER"
    cu.resolution_u = 2
    ob = bpy.data.objects.new(name, cu)
    bpy.context.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.ops.object.convert(target="MESH")
    ob = bpy.context.view_layer.objects.active
    ob.data.materials.clear()
    ob.data.materials.append(ap)
    # sit it on z = 0, centred in x and y
    xs = [v.co.x for v in ob.data.vertices]
    ys = [v.co.y for v in ob.data.vertices]
    zs = [v.co.z for v in ob.data.vertices]
    cx, cy, z0 = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, min(zs)
    for v in ob.data.vertices:
        v.co.x -= cx
        v.co.y -= cy
        v.co.z -= z0
    autosmooth(ob, 30)
    return ob


def guilloche():
    reset()
    ap = mat("applied", (0.9, 0.92, 0.94), 1, 0.08)
    for h in range(12):
        ob = numeral("h%d" % h, ROMAN[h], 2.5, 0.35, ap)
        ob.name = "h%d" % h
        # radial: the foot of each numeral points at the centre
        at_hour(ob, h, DIAL_R - 3.2)
        # the 4 to 8 numerals would read upside down at the bottom; radial setting keeps them all foot-in (as on a clock)
        w = max(v.co.x for v in ob.data.vertices) - min(v.co.x for v in ob.data.vertices)
        if w > 4.4 * MM:   # VIII and XII are wide: narrow them a little so they clear their neighbours
            ob.scale = (4.4 * MM / w, 1, 1)
    return export("dial-guilloche")


if __name__ == "__main__":
    want = sys.argv[1:] or ["silver", "black", "open", "guilloche"]
    for n in want:
        {"silver": silver, "black": black, "open": open_dial, "guilloche": guilloche}[n]()
