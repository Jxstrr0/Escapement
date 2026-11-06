"""Three workshop machines for the Full / Ultra room (PR 9). Makes models/timing-machine.glb, models/cleaning-machine.glb
and models/display-window.glb.

  python3 tools/blender/machines.py

They replace coded box stand-ins in src/vis/room.js (ROOM_MODELS; the same footprints as the boxes there):
  timing-machine    a timegrapher on the bench: a wedge-shaped desk instrument with its screen on the slope, and the
                    microphone stand beside it that holds the watch. Object (node) names the game shows or hides:
                      body, screen, mic   always (screen carries the room's canvas trace; its UVs cover 0..1)
                      head                the plain clamp head (basic machine only)
                      six                 the six-position head: the clamp on a tilting drum (six and lab)
                      lab                 the climate box beside it: a glass chamber on a white base (lab only)
  cleaning-machine  a watch-cleaning machine on the drawer riser: a white base, a row of three glass jars, a lift column
                    at the back with an arm and the parts basket hanging over the middle jar
  display-window    a shop vitrine standing on the floor: a walnut cabinet (drawer, two panelled doors, brass knobs) with a
                    glass case on top, four watches on stands on green felt inside
Material roles are keys of roomMats() in src/vis/room.js (paintGrey, white, black, dark, glass, screen, steel, chrome,
brass, benchDark, felt, cloth); the game swaps each for the room's own material, so the colours here are only a preview.
The one exception is "solvent", the cleaning baths, which keeps its own see-through blue.
The walnut parts get box-projected UVs, one repeat of the room's wood canvas per WOOD metres.
Units are metres; each model's origin is the middle of its footprint, on the surface it stands on; its front faces
Blender's -Y (the game's +Z, towards the camera); the game turns it into place.
"""
import math
import os
import sys

import bpy
import bmesh  # after bpy: bmesh only exists once bpy is loaded
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *   # noqa: E402,F403

WOOD = 0.6   # metres per repeat of the room's walnut canvas (four boards): the cabinet's boards come out about 15 cm wide


def M():
    """The role materials (preview colours only)."""
    return dict(
        paintGrey=mat("paintGrey", (0.55, 0.57, 0.58), 0, 0.4), white=mat("white", (0.9, 0.9, 0.88), 0, 0.35),
        black=mat("black", (0.09, 0.1, 0.1), 0, 0.35), dark=mat("dark", (0.23, 0.25, 0.27), 1, 0.45),
        glass=mat("glass", (0.8, 0.88, 0.92), 0, 0.05), screen=mat("screen", (0.05, 0.1, 0.07), 0, 0.3),
        steel=mat("steel", (0.77, 0.8, 0.82), 1, 0.22), chrome=mat("chrome", (0.85, 0.87, 0.88), 1, 0.08),
        brass=mat("brass", (0.79, 0.64, 0.36), 1, 0.3), benchDark=mat("benchDark", (0.42, 0.27, 0.16), 0, 0.6),
        felt=mat("felt", (0.12, 0.23, 0.17), 0, 1), cloth=mat("cloth", (0.94, 0.93, 0.89), 0, 1))


def solvent():
    """The cleaning bath: not a room role, so the game keeps this material as it comes (a pale see-through blue). The room's
    glass is so faint that empty jars would vanish; the bath shows where they stand."""
    m = mat("solvent", (0.62, 0.78, 0.86), 0, 0.15)
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Alpha"].default_value = 0.42
    m.surface_render_method = "BLENDED"
    m.use_backface_culling = True
    return m


# ---- builders (metres; z is the bottom of the part unless noted) ----
def uv_box(bm, tile):
    """Box-project UVs, one repeat per `tile` metres. The wood canvas's grain runs along U: up the upright faces (the way a
    door's stiles run), along X on the flat ones."""
    uv = bm.loops.layers.uv.verify()
    for f in bm.faces:
        n = f.normal
        ax = max(range(3), key=lambda i: abs(n[i]))
        a, b = {0: (2, 1), 1: (2, 0), 2: (0, 1)}[ax]
        for lp in f.loops:
            co = lp.vert.co
            lp[uv].uv = (co[a] / tile, co[b] / tile)


def bx(name, sx, sy, sz, x=0.0, y=0.0, z=0.0, m=None, bevel=0.0, seg=1, tile=None, rx=0.0, ry=0.0, rz=0.0):
    """A box sx * sy * sz, its bottom at z (before any turn), bevelled if asked."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * sx, v.co.y * sy, v.co.z * sz + sz / 2))
    bm.normal_update()
    if tile:
        uv_box(bm, tile)
    ob = obj_from_bm(name, bm, m)
    place(ob, x, y, z, rz=rz, rx=rx, ry=ry)
    if bevel:
        add_bevel(ob, bevel, seg)
    autosmooth(ob)
    return ob


def cy(name, r, h, x=0.0, y=0.0, z=0.0, m=None, seg=24, r2=None, ch=0.0, rx=0.0, ry=0.0):
    """A cylinder up Z from z (r at the bottom, r2 at the top), its rims chamfered by ch."""
    r2 = r if r2 is None else r2
    if ch:
        prof = [(0, 0), (r - ch, 0), (r, ch), (r2, h - ch), (r2 - ch, h), (0, h)]
    else:
        prof = [(0, 0), (r, 0), (r2, h), (0, h)]
    ob = lathe(name, prof, seg, m)
    return place(ob, x, y, z, rx=rx, ry=ry)


def tube(name, r_out, r_in, h, x=0.0, y=0.0, z=0.0, m=None, seg=24, bottom=False):
    """An open tube (a jar, a basket): the outer wall, a rolled rim, the inner wall, a floor if `bottom`."""
    prof = ([(0, 0)] if bottom else []) + [(r_out, 0), (r_out, h), (r_in, h), (r_in, 0.004 if bottom else 0)] + ([(0, 0.004)] if bottom else [])
    ob = lathe(name, prof, seg, m)
    return place(ob, x, y, z)


def ring(name, R, rr, x=0.0, y=0.0, z=0.0, m=None, seg=24, sides=8, rx=0.0, ry=0.0):
    """A torus round Z, centred at z."""
    prof = [(R + rr * math.cos(t / sides * math.tau), rr * math.sin(t / sides * math.tau)) for t in range(sides + 1)]
    ob = lathe(name, prof, seg, m)
    return place(ob, x, y, z, rx=rx, ry=ry)


def rod(name, a, b, r, m=None, seg=10):
    """A round rod from point a to point b."""
    a, b = Vector(a), Vector(b)
    d = b - a
    ob = cy(name, r, d.length, m=m, seg=seg)
    ob.location = a
    ob.rotation_mode = "QUATERNION"
    ob.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized())
    return ob


def cable(name, pts, r, m):
    """A cable through the points (a smooth curve with a round section), as a mesh."""
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = r
    cu.bevel_resolution = 1
    cu.resolution_u = 4
    sp = cu.splines.new("NURBS")
    sp.points.add(len(pts) - 1)
    for p, q in zip(sp.points, pts):
        p.co = (*q, 1)
    sp.use_endpoint_u = True
    sp.order_u = 3
    tmp = bpy.data.objects.new(name + "-c", cu)
    bpy.context.collection.objects.link(tmp)
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(tmp.evaluated_get(dg))
    bpy.data.objects.remove(tmp)
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    me.materials.clear()
    me.materials.append(m)
    autosmooth(ob, 60)
    return ob


def quad(name, w, h, m):
    """A flat rectangle w * h in XZ facing -Y, its UVs covering 0..1. V runs top to bottom here so that after the glTF
    exporter flips V it runs bottom to top, the way three.js reads the room's canvas textures (flipY)."""
    bm = bmesh.new()
    vs = [bm.verts.new(p) for p in ((-w / 2, 0, -h / 2), (w / 2, 0, -h / 2), (w / 2, 0, h / 2), (-w / 2, 0, h / 2))]
    f = bm.faces.new(vs)
    uv = bm.loops.layers.uv.verify()
    for lp, t in zip(f.loops, ((0, 1), (1, 1), (1, 0), (0, 0))):
        lp[uv].uv = t
    bm.normal_update()
    if f.normal.y > 0:
        f.normal_flip()
    return obj_from_bm(name, bm, m)


# ---- the timing machine ----
def timing():
    reset()
    k = M()
    W, D = 0.200, 0.150           # footprint 58 x 44 units in the room (about 203 x 154 mm)
    fy, fz, sy, sz, top = -D / 2, 0.024, 0.012, 0.068, 0.068
    # the body: a wedge, low at the front, the screen on the slope (side profile in y, z, extruded along x)
    prof = [(fy, 0.0), (fy, fz), (sy, sz), (D / 2, top), (D / 2, 0.0)]
    bm = bmesh.new()
    L = [bm.verts.new((-W / 2, y, z)) for y, z in prof]
    R = [bm.verts.new((W / 2, y, z)) for y, z in prof]
    n = len(prof)
    bm.faces.new(L)
    bm.faces.new(list(reversed(R)))
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new([L[i], L[j], R[j], R[i]])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    shell = obj_from_bm("bodyShell", bm, k["paintGrey"])
    add_bevel(shell, 0.004, 2)
    autosmooth(shell)
    # the slope: angle, middle, outward normal
    ang = math.atan2(sz - fz, sy - fy)
    mid = Vector((0, (fy + sy) / 2, (fz + sz) / 2))
    nrm = Vector((0, -math.sin(ang), math.cos(ang)))
    slope_len = math.hypot(sy - fy, sz - fz)

    def on_slope(ob, u, v, out):
        """Put an object on the slope: u across (x), v up the slope, out off its face; turn it to lie on the slope."""
        p = mid + Vector((u, 0, 0)) + Vector((0, math.cos(ang), math.sin(ang))) * v + nrm * out
        ob.location = p
        ob.rotation_euler = (ang, 0, 0)
        return ob

    bezel = on_slope(bx("bezel", W - 0.026, slope_len - 0.018, 0.003, m=k["black"], bevel=0.0012), 0, 0, -0.0005)
    btns = [on_slope(cy("btn%d" % i, 0.0055, 0.004, m=k["dark"], seg=12), 0.072, -0.022 + i * 0.016, 0.0024)
            for i in range(3)]
    knob = cy("knob", 0.008, 0.012, m=k["dark"], seg=14, ch=0.0015)
    place(knob, W / 2 - 0.03, fy + 0.002, 0.012, rx=math.pi / 2)
    plate = bx("plate", 0.05, 0.002, 0.008, 0.0, fy - 0.001, 0.009, k["brass"])
    join("body", [shell, bezel, knob, plate] + btns)
    # the screen: a 2:1 quad on the bezel (the room's trace canvas is 256 x 128)
    scr = quad("screen", 0.124, 0.062, k["screen"])
    scr.location = mid + Vector((-0.016, 0, 0)) + Vector((0, math.cos(ang), math.sin(ang))) * 0.001 + nrm * 0.0028
    scr.rotation_euler = (ang - math.pi / 2, 0, 0)
    # the microphone stand, right of the machine (40 units right, 6 back), and its cable round to the back
    mx, my = 0.140, 0.021
    post_top = 0.118
    base = cy("micBase", 0.030, 0.012, mx, my, 0, k["black"], seg=20, ch=0.003)
    post = cy("micPost", 0.0048, post_top - 0.012, mx, my, 0.012, k["chrome"], seg=10)
    collar = cy("micCollar", 0.008, 0.012, mx, my, post_top - 0.012, k["dark"], seg=12)
    lead = cable("micLead", [(mx + 0.012, my + 0.02, 0.004), (mx, my + 0.06, 0.003), (0.07, D / 2 + 0.03, 0.003),
                             (0.04, D / 2 + 0.004, 0.012)], 0.0022, k["black"])
    join("mic", [base, post, collar, lead])
    # the plain head: a microphone block on the post with the watch clamp on top (two jaws and a screw)
    hz = post_top
    blk = bx("headBlk", 0.046, 0.040, 0.022, mx, my - 0.004, hz, k["dark"], bevel=0.003)
    pad = cy("headPad", 0.013, 0.002, mx, my - 0.004, hz + 0.022, k["black"], seg=14)
    jaws = [bx("jaw%d" % s, 0.034, 0.005, 0.010, mx, my - 0.004 + s * 0.016, hz + 0.022, k["chrome"]) for s in (-1, 1)]
    scw = cy("headScrew", 0.0035, 0.016, mx, my + 0.016, hz + 0.028, k["chrome"], seg=10, rx=-math.pi / 2)
    scw.location = (mx, my + 0.0145, hz + 0.027)
    join("head", [blk, pad, scw] + jaws)
    # the six-position head: a fork on the post, a drum on a front-to-back axle, the clamp on the drum tilted over
    fork = bx("sixFork", 0.050, 0.014, 0.020, mx, my, hz - 0.004, k["dark"], bevel=0.002)
    drum = cy("sixDrum", 0.019, 0.026, m=k["dark"], seg=18, ch=0.002)
    drum.location = (mx, my + 0.010, hz + 0.026)
    drum.rotation_euler = (math.pi / 2, 0, 0)
    dial = ring("sixDial", 0.0205, 0.0016, m=k["chrome"], seg=18, sides=4)
    dial.location = (mx, my - 0.0165, hz + 0.026)
    dial.rotation_euler = (math.pi / 2, 0, 0)
    lever = rod("sixLever", (mx, my - 0.017, hz + 0.026), (mx + 0.024, my - 0.022, hz + 0.040), 0.0022, k["chrome"])
    tip = cy("sixTip", 0.0045, 0.008, m=k["black"], seg=12)
    tip.location = (mx + 0.024, my - 0.022, hz + 0.036)
    tilt = 0.5
    c, s = math.cos(tilt), math.sin(tilt)

    def tilted(ob, dx, dz):
        """Hang a clamp part off the drum, turned `tilt` about the drum's axle (Y)."""
        ob.location = (mx + dx * c + dz * s, ob.location.y, hz + 0.026 + (-dx * s + dz * c))
        ob.rotation_euler = (0, tilt, 0)
        return ob

    cblk = tilted(bx("sixBlk", 0.044, 0.034, 0.012, 0, my - 0.0035, 0, k["dark"], bevel=0.002), 0, 0.017)
    cpad = tilted(cy("sixPad", 0.012, 0.002, 0, my - 0.0035, 0, k["black"], seg=14), 0, 0.029)
    cj = [tilted(bx("sixJaw%d" % i, 0.030, 0.004, 0.009, 0, my - 0.0035 + sg * 0.014, 0, k["chrome"]), 0, 0.029)
          for i, sg in enumerate((-1, 1))]
    join("six", [fork, drum, dial, lever, tip, cblk, cpad] + cj)
    # the climate box: a white base with its controls, a glass chamber in a steel frame, a watch holder inside
    lx, ly, lw = 0.236, 0.049, 0.118
    lb = bx("labBase", lw, lw, 0.032, lx, ly, 0, k["white"], bevel=0.003)
    lpanel = bx("labPanel", 0.070, 0.002, 0.014, lx - 0.016, ly - lw / 2 - 0.0005, 0.009, k["black"])
    lknob = cy("labKnob", 0.0055, 0.005, m=k["dark"], seg=10)
    lknob.location = (lx + 0.036, ly - lw / 2 + 0.001, 0.016)
    lknob.rotation_euler = (math.pi / 2, 0, 0)
    gh, gw = 0.098, lw - 0.008
    glass = bx("labGlass", gw, gw, gh, lx, ly, 0.032, k["glass"])
    posts = [bx("labPost%d" % i, 0.006, 0.006, gh, lx + sx * (gw / 2 - 0.002), ly + sy_ * (gw / 2 - 0.002), 0.032, k["steel"])
             for i, (sx, sy_) in enumerate([(-1, -1), (1, -1), (-1, 1), (1, 1)])]
    lid = bx("labLid", gw + 0.004, gw + 0.004, 0.006, lx, ly, 0.032 + gh, k["white"], bevel=0.0015)
    handle = bx("labHandle", 0.040, 0.008, 0.006, lx, ly, 0.032 + gh + 0.006, k["dark"])
    holder = cy("labHolder", 0.006, 0.030, lx, ly + 0.01, 0.032, k["dark"], seg=8)
    hhead = bx("labHead", 0.030, 0.024, 0.012, lx, ly + 0.01, 0.062, k["dark"], bevel=0.002)
    hwatch = cy("labWatch", 0.012, 0.006, lx, ly + 0.01, 0.074, k["steel"], seg=14, ch=0.0015)
    join("lab", [lb, lpanel, lknob, lid, handle, holder, hhead, hwatch, glass] + posts)
    export("timing-machine")


# ---- the cleaning machine ----
def cleaning():
    reset()
    k = M()
    W, D, H = 0.170, 0.124, 0.034     # footprint 48 x 36 units on the riser (about 168 x 126 mm)
    base = bx("base", W, D, H, 0, 0, 0, k["white"], bevel=0.004, seg=2)
    deck = bx("deck", W - 0.012, D - 0.012, 0.003, 0, 0, H - 0.001, k["paintGrey"], bevel=0.001)
    panel = bx("panel", W - 0.03, 0.002, 0.018, 0, -D / 2 - 0.0005, 0.008, k["black"])
    knobs = []
    for i, x in enumerate((-0.05, 0.05)):
        kb = cy("knob%d" % i, 0.0065, 0.008, m=k["chrome"], seg=12, ch=0.0012)
        kb.location = (x, -D / 2 - 0.001, 0.017)
        kb.rotation_euler = (math.pi / 2, 0, 0)
        knobs.append(kb)
    lamp = cy("lamp", 0.003, 0.002, m=k["glass"], seg=10)
    lamp.location = (0.0, -D / 2 - 0.001, 0.017)
    lamp.rotation_euler = (math.pi / 2, 0, 0)
    jy, jr, jh = -0.016, 0.0235, 0.058
    JX = (-0.052, 0, 0.052)
    rims = [ring("rim%d" % i, jr - 0.0005, 0.0018, x, jy, H + jh, k["steel"], seg=20, sides=4) for i, x in enumerate(JX)]
    # the lift column at the back right, a carriage on it, the arm reaching over the middle jar, the basket on a spindle
    cx, cy_ = 0.064, 0.042
    col = cy("column", 0.0065, 0.150, cx, cy_, H, k["chrome"], seg=14)
    cap = cy("colCap", 0.0085, 0.006, cx, cy_, H + 0.150, k["white"], seg=12)
    cz = H + 0.112
    carr = bx("carriage", 0.024, 0.024, 0.026, cx, cy_, cz - 0.013, k["white"], bevel=0.003)
    end = Vector((0.0, jy, cz))
    d = end - Vector((cx, cy_, cz))
    arm = bx("arm", d.length + 0.012, 0.012, 0.010, 0, 0, 0, k["white"], bevel=0.002)
    arm.location = ((cx + end.x) / 2, (cy_ + end.y) / 2, cz - 0.005)
    arm.rotation_euler = (0, 0, math.atan2(d.y, d.x))
    motor = cy("motor", 0.011, 0.020, 0, jy, cz - 0.014, k["white"], seg=14, ch=0.002)
    spindle = cy("spindle", 0.002, 0.024, 0, jy, cz - 0.036, k["chrome"], seg=8)
    bz = H + jh + 0.004
    basket = tube("basket", 0.017, 0.0155, 0.022, 0, jy, bz, k["chrome"], seg=18, bottom=True)
    bands = [ring("band", 0.0172, 0.0011, 0, jy, bz + 0.009, k["steel"], seg=18, sides=3)]
    hub = cy("hub", 0.005, 0.006, 0, jy, bz + 0.020, k["chrome"], seg=10)
    join("machine", [base, deck, panel, cap, carr, arm, motor] + knobs)
    # the jars stand in steel cups; each holds its bath (a second glass layer, so the solvent reads through the glass)
    cups = [tube("cup%d" % i, jr + 0.0012, jr - 0.0005, 0.014, x, jy, H, k["steel"], seg=20) for i, x in enumerate(JX)]
    join("metal", [col, spindle, basket, hub] + rims + bands + cups)
    jars = [tube("jar%d" % i, jr, jr - 0.002, jh, x, jy, H + 0.001, k["glass"], seg=20, bottom=True) for i, x in enumerate(JX)]
    join("jars", jars + [lamp])
    baths = [cy("bath%d" % i, jr - 0.0022, jh * 0.7, x, jy, H + 0.005, solvent(), seg=20) for i, x in enumerate(JX)]
    join("baths", baths)
    export("cleaning-machine")


# ---- the display window ----
def window():
    reset()
    k = M()
    W, D, CH = 0.570, 0.230, 0.860    # footprint 160 x 60 units (cabinet about 570 x 230 mm, 0.86 m high)
    wd = k["benchDark"]
    plinth = bx("plinth", W - 0.03, D - 0.02, 0.07, 0, 0.005, 0, wd, bevel=0.004, tile=WOOD)
    carcass = bx("carcass", W, D, CH - 0.07 - 0.026, 0, 0, 0.07, wd, bevel=0.003, tile=WOOD)
    top = bx("top", W + 0.024, D + 0.02, 0.026, 0, 0, CH - 0.026, wd, bevel=0.006, seg=2, tile=WOOD)
    base_mould = bx("mould", W + 0.012, D + 0.01, 0.014, 0, 0, 0.068, wd, bevel=0.005, tile=WOOD)
    fy = -D / 2
    # a drawer under the top, two panelled doors below it, brass knobs and a keyhole
    drawer = bx("drawer", W - 0.05, 0.010, 0.10, 0, fy - 0.003, CH - 0.026 - 0.115, wd, bevel=0.004, tile=WOOD)
    pull = cy("pull", 0.007, 0.012, m=k["brass"], seg=12, ch=0.002)
    pull.location = (0, fy - 0.008, CH - 0.026 - 0.065)
    pull.rotation_euler = (math.pi / 2, 0, 0)
    doors = []
    dh = CH - 0.026 - 0.135 - 0.10
    dz = 0.10
    for i, s in enumerate((-1, 1)):
        dx = s * (W / 4 - 0.004)
        doors.append(bx("door%d" % i, W / 2 - 0.03, 0.010, dh, dx, fy - 0.003, dz, wd, bevel=0.004, tile=WOOD))
        doors.append(bx("panel%d" % i, W / 2 - 0.10, 0.010, dh - 0.09, dx, fy - 0.008, dz + 0.045, wd, bevel=0.008, seg=2, tile=WOOD))
        kb = cy("knob%d" % i, 0.008, 0.016, m=k["brass"], seg=12, ch=0.003)
        kb.location = (s * 0.03, fy - 0.006, dz + dh * 0.55)
        kb.rotation_euler = (math.pi / 2, 0, 0)
        doors.append(kb)
    # the glass case: a felt floor, a walnut sill and cornice, slim brass corner posts, the glass box
    gz, gh = CH, 0.230
    gw, gd = W - 0.01, D - 0.004
    sill = bx("sill", gw, gd, 0.016, 0, 0, gz, wd, bevel=0.003, tile=WOOD)
    felt = bx("feltFloor", gw - 0.024, gd - 0.024, 0.004, 0, 0, gz + 0.016, k["felt"])
    cornice = bx("cornice", gw + 0.004, gd + 0.004, 0.016, 0, 0, gz + 0.016 + gh, wd, bevel=0.004, tile=WOOD)
    posts = [bx("post%d" % i, 0.010, 0.010, gh, sx * (gw / 2 - 0.005), sy * (gd / 2 - 0.005), gz + 0.016, k["brass"])
             for i, (sx, sy) in enumerate([(-1, -1), (1, -1), (-1, 1), (1, 1)])]
    # slim brass rails along the glass's top and bottom edges, so the case reads as a case even though its glass is faint
    rails = []
    for z in (gz + 0.016, gz + 0.016 + gh - 0.006):
        for sy in (-1, 1):
            rails.append(bx("railx", gw - 0.01, 0.006, 0.006, 0, sy * (gd / 2 - 0.003), z, k["brass"]))
        for sx in (-1, 1):
            rails.append(bx("raily", 0.006, gd - 0.01, 0.006, sx * (gw / 2 - 0.003), 0, z, k["brass"]))
    # four watches on little stands: a walnut block, a cream cushion the strap wraps round, the watch head on its face
    stands = []
    for i in range(4):
        x = -0.195 + i * 0.13
        y = 0.01 if i % 2 else -0.012
        z0 = gz + 0.020
        blk = bx("stand%d" % i, 0.05, 0.05, 0.012, x, y, z0, wd, tile=WOOD)
        cush = cy("cush%d" % i, 0.018, 0.034, m=k["cloth"], seg=14, ch=0.004)
        cush.location = (x - 0.017, y, z0 + 0.012 + 0.018)
        cush.rotation_euler = (0, math.pi / 2, 0)
        strap = ring("strap%d" % i, 0.0195, 0.0025, m=k["black"] if i % 2 else k["benchDark"], seg=14, sides=4)
        strap.scale = (1, 1, 3.4)
        strap.location = (x, y, z0 + 0.012 + 0.018)
        strap.rotation_euler = (0, math.pi / 2, 0)
        head = cy("case%d" % i, 0.0175, 0.008, m=k["steel"] if i % 2 == 0 else k["brass"], seg=16, ch=0.002)
        head.location = (x, y - 0.019, z0 + 0.012 + 0.018)
        head.rotation_euler = (math.pi / 2, 0, 0)
        face = cy("dial%d" % i, 0.0145, 0.001, m=k["cloth"] if i != 2 else k["black"], seg=16)
        face.location = (x, y - 0.0275, z0 + 0.012 + 0.018)
        face.rotation_euler = (math.pi / 2, 0, 0)
        stands += [blk, cush, strap, head, face]
    join("cabinet", [carcass, plinth, top, base_mould, drawer, pull, sill, cornice, felt] + doors + posts + rails + stands)
    glass = bx("glass", gw - 0.004, gd - 0.004, gh, 0, 0, gz + 0.016, k["glass"])
    export("display-window")


if __name__ == "__main__":
    which = sys.argv[1:] or ["timing", "cleaning", "window"]
    for w in which:
        {"timing": timing, "cleaning": cleaning, "window": window}[w]()
