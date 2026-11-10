# -*- coding: utf-8 -*-
"""Generate the site BGM with local ComfyUI ACE-Step 1.5 Turbo."""
import argparse
import json
import shutil
import sys
import time
from pathlib import Path

import requests

sys.stdout.reconfigure(encoding="utf-8")

COMFY = "http://127.0.0.1:8188"
OUTPUT = Path(r"F:\AI\ComfyUI\output")
AUDIO = Path(r"F:\AI-Workspace\Claude\嘉欣同桌\galgame\assets\audio")
AUDIO.mkdir(parents=True, exist_ok=True)

TRACKS = {
    "desk": {
        "file": "bgm_desk.mp3",
        "tags": "acoustic pop, warm fingerstyle guitar, soft piano, light string pad, 92 bpm, C major, sunny, romantic, gentle, instrumental, no drums",
        "lyrics": "[instrumental]",
        "language": "en",
        "duration": 45,
        "bpm": 92,
        "keyscale": "C major",
    },
    "origin": {
        "file": "bgm_origin.mp3",
        "tags": "emotional piano ballad, soft rain ambience, warm guitar harmonics, 74 bpm, A minor, tender, nostalgic, instrumental, no drums",
        "lyrics": "[instrumental]",
        "language": "en",
        "duration": 45,
        "bpm": 74,
        "keyscale": "A minor",
    },
    "night": {
        "file": "bgm_night.mp3",
        "tags": "indie acoustic pop, intimate female vocal, breathy close mic, fingerstyle guitar, soft piano, 86 bpm, C major, late night, warm, gentle",
        "lyrics": "[verse]\n晚自习的窗扣 响了一声\n你推过来的笔 停在白线正中\n[chorus]\n门帘后的七月 风把灯吹斜\n我把没唱完的半首 留在你课桌边\n[verse]\n楼下的米袋 又响了一遍\n我把声音压低 怕被听见\n[chorus]\n门帘后的七月 风把灯吹斜\n等天亮以后 你还在我身边",
        "language": "zh",
        "duration": 60,
        "bpm": 86,
        "keyscale": "C major",
    },
}


def build_workflow(track, seed=42):
    return {
        "1": {"class_type": "UNETLoader", "inputs": {"unet_name": "acestep_v1.5_turbo.safetensors", "weight_dtype": "default"}},
        "2": {"class_type": "DualCLIPLoader", "inputs": {"clip_name1": "qwen_0.6b_ace15.safetensors", "clip_name2": "qwen_1.7b_ace15.safetensors", "type": "ace", "device": "default"}},
        "3": {"class_type": "VAELoader", "inputs": {"vae_name": "ace_1.5_vae.safetensors"}},
        "4": {"class_type": "TextEncodeAceStepAudio1.5", "inputs": {
            "clip": ["2", 0], "tags": track["tags"], "lyrics": track["lyrics"], "seed": seed,
            "bpm": track["bpm"], "duration": track["duration"], "timesignature": "4",
            "language": track["language"], "keyscale": track["keyscale"],
            "generate_audio_codes": True, "cfg_scale": 2.0, "temperature": 0.85,
            "top_p": 0.9, "top_k": 0, "min_p": 0,
        }},
        "5": {"class_type": "ConditioningZeroOut", "inputs": {"conditioning": ["4", 0]}},
        "6": {"class_type": "EmptyAceStep1.5LatentAudio", "inputs": {"seconds": track["duration"], "batch_size": 1}},
        "7": {"class_type": "ModelSamplingAuraFlow", "inputs": {"model": ["1", 0], "shift": 3.0}},
        "8": {"class_type": "KSampler", "inputs": {
            "model": ["7", 0], "positive": ["4", 0], "negative": ["5", 0], "latent_image": ["6", 0],
            "seed": seed, "steps": 8, "cfg": 1.0, "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0,
        }},
        "9": {"class_type": "VAEDecodeAudio", "inputs": {"samples": ["8", 0], "vae": ["3", 0]}},
        "10": {"class_type": "SaveAudioMP3", "inputs": {"audio": ["9", 0], "filename_prefix": "zhou_bgm/" + track["file"].replace(".mp3", ""), "quality": "320k"}},
    }


def submit(workflow):
    r = requests.post(f"{COMFY}/prompt", json={"prompt": workflow, "client_id": "zhou-bgm"}, timeout=30)
    r.raise_for_status()
    return r.json()["prompt_id"]


def wait(prompt_id, timeout=1800):
    t0 = time.time()
    while time.time() - t0 < timeout:
        try:
            r = requests.get(f"{COMFY}/history/{prompt_id}", timeout=60)
            h = r.json()
            if prompt_id in h:
                status = h[prompt_id].get("status", {})
                if status.get("status_str") == "error":
                    raise RuntimeError(json.dumps(status, ensure_ascii=False)[:500])
                return h[prompt_id].get("outputs", {})
        except requests.exceptions.RequestException:
            pass
        time.sleep(5)
    raise TimeoutError(prompt_id)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--track", default="test")
    ap.add_argument("--test", action="store_true")
    args = ap.parse_args()

    if args.test:
        track = {
            "file": "bgm_test.mp3",
            "tags": "warm acoustic guitar, soft piano, romantic, gentle, instrumental",
            "lyrics": "[instrumental]",
            "language": "en",
            "duration": 20,
            "bpm": 92,
            "keyscale": "C major",
        }
        name = "test"
    else:
        track = TRACKS[args.track]
        name = args.track

    wf = build_workflow(track, seed=20261110)
    print("submit", name, flush=True)
    pid = submit(wf)
    print("prompt", pid, flush=True)
    outputs = wait(pid)
    print("outputs", json.dumps(outputs, ensure_ascii=False), flush=True)
    # Find the saved audio file
    saved = None
    for node in outputs.values():
        for key in ("audio", "audio_file", "files"):
            v = node.get(key) if isinstance(node, dict) else None
            if isinstance(v, list):
                for item in v:
                    if isinstance(item, dict) and item.get("filename"):
                        saved = (item.get("subfolder", ""), item["filename"])
            elif isinstance(v, dict) and v.get("filename"):
                saved = (v.get("subfolder", ""), v["filename"])
    if not saved:
        raise RuntimeError("no audio filename in outputs")
    subfolder, filename = saved
    src = OUTPUT / subfolder / filename
    if not src.exists():
        src = OUTPUT / filename
    dst = AUDIO / track["file"]
    shutil.copy2(src, dst)
    print("saved", dst, dst.stat().st_size, flush=True)


if __name__ == "__main__":
    main()
