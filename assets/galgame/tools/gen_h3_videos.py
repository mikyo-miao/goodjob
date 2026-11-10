# -*- coding: utf-8 -*-
"""Generate scene loops with local ComfyUI MiniMax H3 (fl2va + audio)."""
import argparse
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

import imageio_ffmpeg
import requests

sys.stdout.reconfigure(encoding="utf-8")

COMFY = "http://127.0.0.1:8188"
ROOT = Path(r"F:\AI-Workspace\Claude\嘉欣同桌\galgame")
INPUT = Path(r"F:\AI\ComfyUI\input")
OUTPUT = Path(r"F:\AI\ComfyUI\output")
VIDEO = ROOT / "assets" / "video"
AUDIO = ROOT / "assets" / "audio"
for d in (VIDEO, AUDIO):
    d.mkdir(parents=True, exist_ok=True)

API = json.loads(Path(r"F:\AI\MiniMax-H3-setup\H3_NF4_api.json").read_text(encoding="utf-8"))

SCENES = {
    "C0": {
        "source": "C0_stage_bg.png",
        "out": "C0_stage.mp4",
        "prompt": "An empty Chinese high school classroom after school. Warm orange-pink sunset light pours through the large windows, white curtains sway gently in the breeze, fine dust motes float in the light. Slow, steady camera push-in. Quiet, nostalgic, romantic anime atmosphere. Natural room tone, no music, no speech.",
    },
    "B6": {
        "source": "B6_attic_singing.png",
        "out": "B6_singing.mp4",
        "prompt": "A cozy ten-square-meter attic at night. A girl with long black hair and white headphones sits by the window, singing softly into a simple microphone. Warm string lights and a desk lamp glow, city lights shimmer outside the deep blue window. Slow, gentle camera drift. Intimate, quiet, romantic anime atmosphere. Soft breathing and faint night city ambience, no music, no speech.",
    },
    "D2": {
        "source": "D2_audiolab_singing.png",
        "out": "D2_audiolab.mp4",
        "prompt": "An old school audio lab in the afternoon. A girl with long black hair and silver glasses sings softly into a vintage condenser microphone, wearing silver headphones. Wooden blinds cast moving strips of golden light across floating dust. Slow, steady camera drift. Warm, intimate, romantic anime atmosphere. Faint room tone and soft breathing, no music, no speech.",
    },
    "D5": {
        "source": "D5_bikeshed.png",
        "out": "D5_bikeshed.mp4",
        "prompt": "A semi-basement bicycle shed under a Chinese high school. A single warm incandescent bulb flickers softly overhead. A girl in a beige cardigan leans against a concrete pillar among rows of bicycles, holding her breath. Slow, subtle camera drift. Quiet, tense, romantic anime atmosphere. Faint electrical hum and distant footsteps, no music, no speech.",
    },
}


def build_workflow(scene, steps, frames, width, height, seed):
    wf = json.loads(json.dumps(API))
    # Add first-frame keyframe input.
    wf["20"] = {"class_type": "LoadImage", "inputs": {"image": scene["input_name"], "upload": "image"}}
    wf["21"] = {"class_type": "PrimitiveString", "inputs": {"value": "0"}}
    inf = wf["11"]["inputs"]
    inf.update({
        "prompt": scene["prompt"],
        "seed": seed,
        "num_inference_steps": steps,
        "height": height,
        "width": width,
        "num_frames": frames,
        "cfg_scale": 1.0,
        "flow_shift": 12.0,
        "audio_flow_shift": 3.0,
        "tiled": True,
        "tile_size": 256,
        "tile_overlap": 64,
        "keyframes": ["20", 0],
        "keyframe_indices": ["21", 0],
    })
    wf["15"]["inputs"]["filename_prefix"] = "MiniMax-H3/zhou_" + scene["out"].replace(".mp4", "")
    wf["15"]["inputs"]["format"] = "mp4"
    wf["15"]["inputs"]["codec"] = "h264"
    return wf


def submit(wf):
    r = requests.post(f"{COMFY}/prompt", json={"prompt": wf, "client_id": "zhou-h3"}, timeout=60)
    r.raise_for_status()
    return r.json()["prompt_id"]


def wait(prompt_id, timeout=3600):
    t0 = time.time()
    while time.time() - t0 < timeout:
        try:
            r = requests.get(f"{COMFY}/history/{prompt_id}", timeout=60)
            h = r.json()
            if prompt_id in h:
                status = h[prompt_id].get("status", {})
                if status.get("status_str") == "error":
                    raise RuntimeError(json.dumps(status, ensure_ascii=False)[:800])
                return h[prompt_id].get("outputs", {})
        except requests.exceptions.RequestException:
            pass
        time.sleep(8)
    raise TimeoutError(prompt_id)


def extract_audio(video_path, audio_path):
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    subprocess.run(
        [ff, "-y", "-i", str(video_path), "-vn", "-acodec", "libmp3lame", "-q:a", "4", str(audio_path)],
        check=False, capture_output=True
    )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="C0")
    ap.add_argument("--steps", type=int, default=12)
    ap.add_argument("--frames", type=int, default=76)
    ap.add_argument("--width", type=int, default=640)
    ap.add_argument("--height", type=int, default=360)
    ap.add_argument("--seed", type=int, default=20261110)
    ap.add_argument("--draft", action="store_true")
    ap.add_argument("--suffix", default="")
    ap.add_argument("--upscale", action="store_true")
    args = ap.parse_args()

    scene = SCENES[args.only]
    if args.draft:
        args.steps = 6
        args.frames = 33
        args.width = 480
        args.height = 270

    src = ROOT / "assets" / "bg" / scene["source"]
    scene["input_name"] = "zqh_h3_" + args.only.lower() + ".png"
    shutil.copy2(src, INPUT / scene["input_name"])
    wf = build_workflow(scene, args.steps, args.frames, args.width, args.height, args.seed)
    print("submit", args.only, "steps", args.steps, "frames", args.frames, f"{args.width}x{args.height}", flush=True)
    pid = submit(wf)
    print("prompt", pid, flush=True)
    outputs = wait(pid)
    print("outputs", json.dumps(outputs, ensure_ascii=False), flush=True)
    saved = None
    for node in outputs.values():
        for key in ("gifs", "videos", "images", "files"):
            v = node.get(key) if isinstance(node, dict) else None
            if isinstance(v, list):
                for item in v:
                    if isinstance(item, dict) and item.get("filename"):
                        saved = (item.get("subfolder", ""), item["filename"])
            elif isinstance(v, dict) and v.get("filename"):
                saved = (v.get("subfolder", ""), v["filename"])
    if not saved:
        raise RuntimeError("no video filename in outputs")
    sub, fn = saved
    src_out = OUTPUT / sub / fn
    if not src_out.exists():
        src_out = OUTPUT / fn
    dst = VIDEO / scene["out"].replace(".mp4", args.suffix + ".mp4")
    shutil.copy2(src_out, dst)
    audio = AUDIO / ("voice_" + args.only.lower() + ".mp3")
    extract_audio(dst, audio)
    print("saved", dst, dst.stat().st_size, "audio", audio, audio.stat().st_size if audio.exists() else 0, flush=True)

    if args.upscale:
        final = VIDEO / scene["out"]
        ff = imageio_ffmpeg.get_ffmpeg_exe()
        cmd = [
            ff, "-y", "-i", str(dst),
            "-vf", "scale=1920:1080:flags=lanczos,unsharp=5:5:0.5:5:5:0.0",
            "-c:v", "libx264", "-crf", "18", "-preset", "slow",
            "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an",
            str(final)
        ]
        r = subprocess.run(cmd, capture_output=True)
        print("upscale", final, "rc", r.returncode, final.stat().st_size if final.exists() else 0, flush=True)


if __name__ == "__main__":
    main()
