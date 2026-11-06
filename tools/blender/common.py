"""Shared helpers for the Blender scripts that make Escapement's props (PR 9).

Every model is built from code here, never by hand, so it can be remade and changed in a diff:

  python3 tools/blender/case.py          # the three watch cases with their crowns
  python3 tools/blender/dials.py         # the five dials' applied parts
  python3 tools/blender/tourbillon.py    # the tourbillon cage
  python3 tools/blender/machines.py      # the timing machine, cleaning machine, display window
  python3 tools/blender/all.py           # all of the above

Needs Blender as a Python module (`pip install bpy`; 4.x or 5.x) plus Pillow and numpy for tools/pack-model.py.
Each script builds its scene, exports a glTF to a scratch folder and packs it into models/<name>.glb with
tools/pack-model.py (vertex data quantized). The output is committed; the game never runs Blender.

Conventions the game relies on (src/vis/watch.js and src/vis/room.js):
  - units are metres, Blender's Z up becomes the game's Y up; the game scales by ROOM.U (286 units a metre)
  - materials are named for the role the game gives them ("metal", "polish", "crystal", "lume", "dark", ...);
    the game swaps each for its own tier's material by that name, so colours here are only a preview
  - object names are kept as node names, so the game can find a part (an hour index it hides under a sub-dial, the screen)
  - no textures: the finishes and printing are drawn in the game (vis/finish.js, vis/watch.js)
"""
import math
import os
import subprocess
import sys
import tempfile

import bpy
import bmesh

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MM = 0.001   # one millimetre in Blender units (metres)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def mat(name, rgb=(0.8, 0.8, 0.8), metal=0.0, rough=0.5):
    """A material by role name (reused if it exists). rgb is sRGB 0..1, converted to linear for the preview colour."""
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in rgb]
    b.inputs["Base Color"].default_value = (*lin, 1)
    b.inputs["Metallic"].default_value = metal
    b.inputs["Roughness"].default_value = rough
    return m


def obj_from_bm(name, bm, material=None, smooth=False):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    if material:
        me.materials.append(material)
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    return ob


def lathe(name, profile, seg=64, material=None, smooth=True):
    """Spin a profile [(r, z), ...] (metres, r >= 0) round the Z axis. Closed if the first and last points touch the axis."""
    bm = bmesh.new()
    rings = []
    for i in range(seg):
        a = i / seg * math.tau
        ca, sa = math.cos(a), math.sin(a)
        rings.append([bm.verts.new((r * ca, r * sa, z)) for r, z in profile])
    for i in range(seg):
        A, B = rings[i], rings[(i + 1) % seg]
        for j in range(len(profile) - 1):
            vs = [A[j], B[j], B[j + 1], A[j + 1]]
            if profile[j][0] < 1e-9:
                vs = [A[j], B[j + 1], A[j + 1]]
                if profile[j + 1][0] < 1e-9:
                    continue
            elif profile[j + 1][0] < 1e-9:
                vs = [A[j], B[j], A[j + 1]]
            try:
                bm.faces.new(vs)
            except ValueError:
                pass
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-7)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = obj_from_bm(name, bm, material, smooth)
    autosmooth(ob)
    return ob


def prism(name, outline, z0, z1, material=None, bevel=0.0, seg=2):
    """Extrude a closed 2D outline [(x, y), ...] (metres) from z0 to z1, optionally bevelling the edges."""
    bm = bmesh.new()
    bot = [bm.verts.new((x, y, z0)) for x, y in outline]
    top = [bm.verts.new((x, y, z1)) for x, y in outline]
    n = len(outline)
    bm.faces.new(list(reversed(bot)))
    bm.faces.new(top)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new([bot[i], bot[j], top[j], top[i]])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = obj_from_bm(name, bm, material)
    if bevel > 0:
        add_bevel(ob, bevel, seg)
    autosmooth(ob)
    return ob


def add_bevel(ob, width, seg=2, angle=40):
    m = ob.modifiers.new("bevel", "BEVEL")
    m.width = width
    m.segments = seg
    m.limit_method = "ANGLE"
    m.angle_limit = math.radians(angle)
    m.harden_normals = False
    return m


def autosmooth(ob, angle=35):
    """Smooth faces that meet at less than `angle` degrees, keep sharper edges crisp (Blender 4.1+ dropped auto smooth)."""
    me = ob.data
    bm = bmesh.new()
    bm.from_mesh(me)
    for f in bm.faces:
        f.smooth = True
    lim = math.radians(angle)
    for e in bm.edges:
        if len(e.link_faces) == 2 and e.calc_face_angle(0) > lim:
            e.smooth = False
        elif len(e.link_faces) != 2:
            e.smooth = False
    bm.to_mesh(me)
    bm.free()
    return ob


def apply_all(ob):
    bpy.context.view_layer.objects.active = ob
    for m in list(ob.modifiers):
        with bpy.context.temp_override(object=ob):
            bpy.ops.object.modifier_apply(modifier=m.name)


def join(name, obs):
    """Join objects into one (modifiers applied first)."""
    for o in obs:
        apply_all(o)
    bpy.ops.object.select_all(action="DESELECT")
    for o in obs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]
    bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = name
    ob.data.name = name
    return ob


def place(ob, x=0, y=0, z=0, rz=0.0, rx=0.0, ry=0.0):
    ob.location = (x, y, z)
    ob.rotation_euler = (rx, ry, rz)
    return ob


def parent(child, par):
    child.parent = par
    return child


def empty(name, x=0, y=0, z=0):
    e = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(e)
    e.location = (x, y, z)
    return e


def tri_count():
    n = 0
    dg = bpy.context.evaluated_depsgraph_get()
    for ob in bpy.context.scene.objects:
        if ob.type == "MESH":
            me = ob.evaluated_get(dg).to_mesh()
            me.calc_loop_triangles()
            n += len(me.loop_triangles)
            ob.evaluated_get(dg).to_mesh_clear()
    return n


def export(name, tex=256, normal=128):
    """Apply every modifier, export the scene as glTF to a scratch folder, pack it into models/<name>.glb."""
    for ob in list(bpy.context.scene.objects):
        if ob.type == "MESH" and ob.modifiers:
            apply_all(ob)
    tris = tri_count()
    tmp = tempfile.mkdtemp(prefix="esc-blender-")
    path = os.path.join(tmp, name + ".gltf")
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLTF_SEPARATE", export_apply=True,
                              export_yup=True, export_materials="EXPORT", export_normals=True,
                              export_texcoords=True, export_extras=False)
    out = os.path.join(ROOT, "models", name + ".glb")
    subprocess.run([sys.executable, os.path.join(ROOT, "tools", "pack-model.py"), path, out,
                    "--tex", str(tex), "--normal", str(normal)], check=True)
    print("%s: %d triangles" % (name, tris))
    return out
