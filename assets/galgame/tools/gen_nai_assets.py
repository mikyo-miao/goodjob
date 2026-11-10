# -*- coding: utf-8 -*-
"""Generate the visual assets for the Zhou Qinghe guide page.

Source: local NovelAI mirror at http://127.0.0.1:8899
Model: nai-diffusion-5-full, 28 steps, CFG 6, k_euler_ancestral, random seed.
- 7 identity cards: 832x1216 text2img
- 4 desk props: 1024x1024 text2img, transparent
- 8 background replacements: 1216x832; character scenes use img2img to keep the face/pose.
"""
import io
import json
import os
import sys
import time
import uuid
from pathlib import Path

import requests
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, r"F:\AI-Workspace\Claude\嘉欣同桌\立绘工程")
from style_preset import STYLE_POS, STYLE_NEG

BASE = "http://127.0.0.1:8899"
ROOT = Path(r"F:\AI-Workspace\Claude\嘉欣同桌\galgame")
BG = ROOT / "assets" / "bg"
CARD = ROOT / "assets" / "card"
PROPS_DIR = ROOT / "assets" / "ui" / "props"
for d in (BG, CARD, PROPS_DIR):
    d.mkdir(parents=True, exist_ok=True)
SKIP_EXISTING = "--resume" in sys.argv

NEG_BASE = (
    "worst quality, low quality, jpeg artifacts, blurry, text, letters, watermark, "
    "signature, logo, photorealistic, 3d render, horror, dark, gloomy, "
    "astronomical instrument, orrery, galaxy, outer space, stars, nebula, star trail, "
    "european castle, medieval, oil lantern, kerosene lamp, camping lantern, "
    "magical bubbles, soap bubbles, bubbles, floating orbs, iridescent bubbles, fantasy, sci-fi, "
    "neon cyberpunk, hologram, sci-fi console, hotel luggage cart, alpine, mountain, "
    "western wooden cabin, white wood plank wall, black border, letterbox"
)
NEG_NO_HUMAN = (
    ", 1girl, 1boy, human, person, people, character, face, portrait, body, hands, fingers, "
    "cleavage, revealing clothes, open cardigan, large breasts"
)
CHAR = (
    "1girl, 18 years old, long straight black hair, side hair clip, "
    "silver half-rim glasses, white medical mask, beige knit cardigan, white shirt, "
    "navy pleated skirt, slender, gentle expression"
)

IDENTITIES = [
    ("E1_id_science.png", "no humans, close-up of a high school desk in warm afternoon sunlight, a neat math worksheet with clear coordinate axes, parabolas, geometric diagrams and red annotation lines, a metal compass, a half eraser, a black gel pen, chalk dust in the light, clean romantic anime still life, vertical composition, no scribbles"),
    ("E2_id_sneaker.png", "no humans, an open cream shoebox on a wooden desk, a pair of cream white retro running shoes, folded cotton socks, pink bandages, warm spring sunlight, clean romantic anime still life, vertical composition"),
    ("E3_id_sound_tech.png", "no humans, a cozy small internet cafe booth at night, a professional condenser microphone, an audio interface with soft knobs, a monitor showing a clean blue audio waveform, silver headphones, warm cyan and amber ambient light, clean romantic anime still life, vertical composition"),
    ("E4_id_childhood.png", "no humans, two old bicycles parked side by side under a locust tree, two sealed soy milk cups in the basket, a spring city market street, warm afternoon sunlight through leaves, clean romantic anime still life, vertical composition"),
    ("E5_id_young_master.png", "no humans, inside a school desk, a vintage CD, a silver fountain pen, a folded banknote in an open book, soft window light, clean romantic anime still life, vertical composition"),
    ("E6_id_day_student.png", "no humans, an abandoned red brick bus stop beside a plane-tree lined river road at sunset, an old bicycle with a wet umbrella, warm orange light, clean romantic anime still life, vertical composition"),
    ("E7_id_custom.png", "no humans, an empty wooden chair by the window in a high school classroom, warm afternoon sunlight on the desk, a pale yellow goal card, floating chalk dust, clean romantic anime still life, vertical composition"),
]

PROP_ITEMS = [
    ("prop_target_card.png", "a pale yellow hard paper goal card, one corner slightly lifted, red handwritten number 100 and small handwriting, clean anime prop sticker, thick soft outline, transparent background, centered, no scenery"),
    ("prop_notebook_dual.png", "a kraft paper notebook open to a hand-drawn grid page, red and blue math notes, a small red oil stain, a traditional Chinese medicine paper bookmark, clean anime prop sticker, transparent background, centered, no scenery"),
    ("prop_cookie_tin.png", "an open vintage blue cookie tin full of neatly arranged coins and a small pink note, clean anime prop sticker, transparent background, centered, no scenery"),
    ("prop_sony_headphone.png", "silver retro over-ear headphones with a black phone cord, clean anime prop sticker, transparent background, centered, no scenery"),
]

# character scenes: use the existing image as img2img base, low strength to keep face/pose
BACKGROUNDS = [
    {
        "file": "B2_cold_water_wash.png",
        "base": False,
        "strength": 0,
        "prompt": "1girl, long black hair in a messy ponytail, no glasses, no mask, beige knit cardigan, white shirt, navy skirt, squatting by a concrete washing sink in a small Chinese backyard, washing a white shirt, white soap foam, water droplets, warm spring sunset, soft orange and pink light, gentle melancholy, romantic anime, no bubbles, no floating orbs",
    },
    {
        "file": "B3_father_rain_umbrella.png",
        "base": False,
        "strength": 0,
        "prompt": "1girl, long straight black hair, silver half-rim glasses, white medical mask, beige knit cardigan, standing by a high school corridor window, holding a black umbrella, looking out at a rainy spring evening, wet glass with raindrops, warm streetlights, green camphor trees, a distant tricycle with a rain cover parked under a tree, soft melancholy, romantic anime, cinematic, no cherry blossoms",
    },
    {
        "file": "B4_mother_hands_cookie_tin.png",
        "base": False,
        "strength": 0,
        "neg": ", 1girl, face, body, chest, cleavage, breasts, portrait, person, revealing, low neckline, open cardigan",
        "prompt": "close-up of a girl's hands holding an open vintage blue cookie tin full of neatly arranged coins and a small pink note, sitting on a light blue floral bed in a cozy Chinese attic room, warm desk lamp, wooden shelves, a small worn teddy bear in the background, soft afternoon light, no face, no body, no chest, modest, romantic anime still life",
    },
    {
        "file": "B5_attic_mirror_mask.png",
        "base": False,
        "strength": 0,
        "prompt": "1girl, long straight black hair, putting on silver half-rim glasses and a white medical mask in front of a small round mirror, cozy Chinese attic room with warm wooden walls, morning sunlight through the window, osmanthus incense bottle, sticky notes, light blue floral bed, beige cardigan, gentle expression, romantic anime, no alpine, no western cabin",
    },
    {
        "file": "B6_attic_singing.png",
        "base": False,
        "strength": 0,
        "prompt": "1girl, long straight black hair, silver half-rim glasses, white headphones, singing into a simple microphone, cozy ten-square-meter Chinese attic at night, warm string lights and desk lamp, light blue floral bed, window with gentle Chinese city lights and deep blue night sky, beige cardigan, intimate quiet atmosphere, romantic anime, no orrery, no galaxy, no european town",
    },
    {
        "file": "C0_stage_bg.png",
        "base": False,
        "strength": 0,
        "prompt": "no humans, empty Chinese high school classroom after school, sunset, orange pink and violet sky through large windows, white curtains blowing in the breeze, wooden desks, green blackboard, warm dust in the light, romantic anime background, cinematic, no outer space, no stars",
    },
    {
        "file": "C7_shoes.png",
        "base": False,
        "strength": 0,
        "prompt": "close-up of a girl's legs under a wooden school desk in a bright classroom, dark gray knee socks, cream white chunky sneakers, warm sunset light on the wooden floor, wooden chair legs, classroom floor and wall visible, clean romantic anime, no black background, no galaxy, no outer space, no stars",
    },
    {
        "file": "D7_cybercafe_sleepy.png",
        "base": False,
        "strength": 0,
        "prompt": "1girl, long straight black hair, silver half-rim glasses, beige cardigan, sleeping on a soft leather sofa in a cozy Chinese internet cafe private booth, holding math papers, dual monitors showing a clean audio waveform and music player, warm white and soft cyan ambient light, gentle peaceful atmosphere, romantic anime, no sci-fi console, no hologram, no cyberpunk neon",
    },
]


def init_session():
    s = requests.Session()
    fp = "opencode-visual-" + uuid.uuid4().hex[:8]
    r = s.get(f"{BASE}/api/auth/init", params={"fingerprint": fp}, timeout=15)
    r.raise_for_status()
    return s


def upload(session, path):
    with open(path, "rb") as f:
        r = session.post(
            f"{BASE}/api/novelai/upload",
            files={"file": (Path(path).name, f, "image/png")},
            timeout=60,
        )
    r.raise_for_status()
    j = r.json()
    return j.get("filename") or j.get("file") or j.get("name")


def crop_black_border(im, tol=10):
    im = im.convert("RGB")
    w, h = im.size
    px = im.load()

    def row_has(y):
        return any(sum(px[x, y]) > tol * 3 for x in range(0, w, 4))

    def col_has(x):
        return any(sum(px[x, y]) > tol * 3 for y in range(0, h, 4))

    top = 0
    while top < h and not row_has(top):
        top += 1
    bottom = h - 1
    while bottom > top and not row_has(bottom):
        bottom -= 1
    left = 0
    while left < w and not col_has(left):
        left += 1
    right = w - 1
    while right > left and not col_has(right):
        right -= 1
    if top > 0 or bottom < h - 1 or left > 0 or right < w - 1:
        im = im.crop((left, top, right + 1, bottom + 1))
    return im.convert("RGBA")


def submit(session, prompt, negative, width, height, mode="generate", input_image=None, strength=0.55, seed=-1):
    payload = {
        "model": "nai-diffusion-5-full",
        "generation_mode": mode,
        "positive_prompt": prompt,
        "negative_prompt": negative,
        "style_prompt": STYLE_POS,
        "style_position": "before",
        "style_negative_prompt": STYLE_NEG,
        "style_negative_position": "after",
        "count": 1,
        "stream": True,
        "width": width,
        "height": height,
        "steps": 28,
        "cfg": 6,
        "cfg_rescale": 0.25,
        "seed": seed,
        "sampler": "k_euler_ancestral",
        "model_mode": "anime",
        "transparent_background": True,
        "quality_preset": "off",
        "uc_preset": "none",
        "characters": [],
        "use_coords": False,
        "variety": False,
        "dynamic_thresholding": False,
        "input_image": input_image,
        "strength": strength if mode == "img2img" else 0,
        "noise": 0.05 if mode == "img2img" else 0,
        "output_format": "png",
    }
    r = session.post(
        f"{BASE}/api/novelai/generate",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "Accept": "text/event-stream"},
        timeout=240,
    )
    body = r.text
    try:
        j = json.loads(body)
    except Exception:
        raise RuntimeError("bad response: " + body[:300])
    tid = j.get("id")
    if not tid:
        raise RuntimeError("no task id: " + body[:300])
    return tid


def wait_task(session, tid, timeout=300):
    t0 = time.time()
    while time.time() - t0 < timeout:
        r = session.get(f"{BASE}/api/novelai/tasks/{tid}", timeout=20)
        st = r.json()
        status = st.get("status")
        if status == "completed":
            return st.get("filenames") or []
        if status in ("failed", "cancelled"):
            raise RuntimeError(f"task {tid} {status}")
        time.sleep(1.5)
    raise TimeoutError(f"task {tid} timeout")


def fetch_image(session, tid, index=0):
    r = session.get(f"{BASE}/api/novelai/tasks/{tid}/image", params={"format": "png", "index": index}, timeout=60)
    r.raise_for_status()
    return Image.open(io.BytesIO(r.content)).convert("RGBA")


def key_white(im, tolerance=18):
    """Make near-white background transparent from the corners."""
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    visited = set()
    stack = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    while stack:
        x, y = stack.pop()
        if (x, y) in visited or x < 0 or y < 0 or x >= w or y >= h:
            continue
        visited.add((x, y))
        r, g, b, a = px[x, y]
        if a < 10 or (r > 255 - tolerance and g > 255 - tolerance and b > 255 - tolerance):
            px[x, y] = (r, g, b, 0)
            stack.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])
    return im


def run():
    session = init_session()
    manifest = []

    print("=== identity cards ===", flush=True)
    for filename, prompt in IDENTITIES:
        out = CARD / filename
        if SKIP_EXISTING and out.exists() and out.stat().st_size > 10000:
            print("[skip]", filename, flush=True)
            manifest.append(str(out))
            continue
        try:
            tid = submit(session, "no humans, object still life, no people, " + prompt, NEG_BASE + NEG_NO_HUMAN, 832, 1216)
            wait_task(session, tid)
            im = crop_black_border(fetch_image(session, tid))
            im.save(out, "PNG")
            print("[ok]", filename, im.size, flush=True)
            manifest.append(str(out))
        except Exception as e:
            print("[FAIL]", filename, e, flush=True)
        time.sleep(1.5)

    print("=== props ===", flush=True)
    for filename, prompt in PROP_ITEMS:
        out = PROPS_DIR / filename
        if SKIP_EXISTING and out.exists() and out.stat().st_size > 10000:
            print("[skip]", filename, flush=True)
            manifest.append(str(out))
            continue
        try:
            tid = submit(session, "no humans, cute anime style die-cut sticker, object only, " + prompt, NEG_BASE + NEG_NO_HUMAN + ", background, scenery, room, wall, floor, window, furniture", 1024, 1024)
            wait_task(session, tid)
            im = fetch_image(session, tid)
            im = key_white(im)
            bbox = im.getchannel("A").getbbox()
            if bbox:
                im = im.crop(bbox)
            im.save(out, "PNG")
            print("[ok]", filename, im.size, flush=True)
            manifest.append(str(out))
        except Exception as e:
            print("[FAIL]", filename, e, flush=True)
        time.sleep(1.5)

    print("=== backgrounds ===", flush=True)
    for item in BACKGROUNDS:
        out = BG / item["file"]
        base_path = out if item["base"] else None
        if SKIP_EXISTING and out.exists() and out.stat().st_size > 10000:
            print("[skip]", item["file"], flush=True)
            manifest.append(str(out))
            continue
        # For img2img, use the current file as base; keep a backup first.
        backup = BG / ("_orig_" + item["file"])
        if base_path and not backup.exists():
            backup.write_bytes(out.read_bytes())
        try:
            neg = NEG_BASE + (item.get("neg") or "")
            if item["base"]:
                upload_name = upload(session, backup if backup.exists() else out)
                tid = submit(session, item["prompt"], neg, 1216, 832, mode="img2img", input_image=upload_name, strength=item["strength"], seed=20261110)
            else:
                tid = submit(session, item["prompt"], neg, 1216, 832, seed=20261110)
            wait_task(session, tid)
            im = crop_black_border(fetch_image(session, tid))
            im.save(out, "PNG")
            print("[ok]", item["file"], im.size, flush=True)
            manifest.append(str(out))
        except Exception as e:
            print("[FAIL]", item["file"], e, flush=True)
        time.sleep(1.5)

    (ROOT / "tools" / "nai_manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    print("DONE", len(manifest), flush=True)


if __name__ == "__main__":
    run()
