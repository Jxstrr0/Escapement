"""Remake every Blender prop (PR 9): python3 tools/blender/all.py

Runs each script in turn, each in its own Python process (bpy keeps one scene per process). See common.py for what the
scripts share and the conventions the game relies on. The .glb files land in models/ and are committed.
"""
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
for name in ["case.py", "dials.py", "tourbillon.py", "machines.py"]:
    path = os.path.join(HERE, name)
    if os.path.exists(path):
        print("==", name)
        subprocess.run([sys.executable, path], check=True)
