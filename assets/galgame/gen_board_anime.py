# -*- coding: utf-8 -*-
"""黑板底板：精致清新二次元版本（多方案试抽，透明关闭）
用法: python gen_board_anime.py
输出: F:\\AI-Workspace\\Claude\\嘉欣同桌\\galgame\\assets\\ui\\board_v{1..3}.webp
"""
import io, json, os, sys, time, uuid, urllib.request, http.cookiejar
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')
BASE = 'http://127.0.0.1:8899'
OUT_DIR = r'F:\AI-Workspace\Claude\嘉欣同桌\galgame\assets\ui'
os.makedirs(OUT_DIR, exist_ok=True)
sys.path.insert(0, r'F:\AI-Workspace\Claude\嘉欣同桌\立绘工程')
from style_preset import STYLE_POS, STYLE_NEG

NEG = ("1girl, 1boy, human, hands, people, character, person, body, "
       "text, letters, numbers, kanji, writing, calligraphy, chalk writing, equations, formulas, "
       "watermark, signature, logo, photo, photograph, realistic, photorealistic, 3d render, "
       "dark, gloomy, heavy shadow, blurry, lowres, worst quality, low quality, jpeg artifacts, "
       "desks, chairs, students, teacher, clock")

VARIANTS = [
    {
        "key": "board_v1",
        "pos": (
            "no humans, delicate anime background art, flat front view of a cute classroom chalkboard, "
            "1.2::fresh pale mint-green chalkboard surface with soft powdery chalk haze, "
            "light cream-white wooden frame with rounded corners::, "
            "a slim light wooden chalk ledge holding a small cute eraser and two short chalks, "
            "soft warm afternoon sunlight from the upper left, floating dust motes, "
            "clean bright pastel palette, cel shading, crisp clean lineart, airy and crisp, "
            "empty center for text overlay, high quality anime illustration style, "
            "-1::text::, no text, no writing"
        ),
    },
    {
        "key": "board_v2",
        "pos": (
            "no humans, delicate anime background art, straight-on view of a clean classroom blackboard, "
            "1.2::soft sage green board surface with gentle chalk smudges, "
            "warm birch wood frame, thin and neat, rounded soft corners::, "
            "tiny chalk pieces and a pastel pink eraser on the ledge, "
            "bright spring morning light, gentle pastel tone, flat cel shaded anime style, "
            "clean tidy composition, lots of empty space, high quality anime illustration, "
            "-1::text::, no text"
        ),
    },
    {
        "key": "board_v3",
        "pos": (
            "no humans, delicate anime background art, a cute classroom blackboard panel, "
            "1.2::very light desaturated teal-green chalkboard, almost pastel, "
            "pale cream painted wooden frame with small corner brackets::, "
            "chalk tray with a mini eraser and chalk sticks, "
            "soft diffused daylight, minimal soft shadows, pastel and fresh atmosphere, "
            "clean flat cel shading, thin lineart, high quality anime illustration, empty middle, "
            "-1::text::, no text, no letters"
        ),
    },
]


def init_session():
    cj = http.cookiejar.CookieJar()
    op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    op.open(f'{BASE}/api/auth/init?fingerprint=opencode-board-' + uuid.uuid4().hex[:8], timeout=15).read()
    return op


def submit(op, item):
    payload = {
        "model": "nai-diffusion-5-full",
        "generation_mode": "generate",
        "positive_prompt": item["pos"],
        "negative_prompt": NEG,
        "style_prompt": STYLE_POS,
        "style_position": "before",
        "style_negative_prompt": STYLE_NEG,
        "style_negative_position": "after",
        "count": 1, "stream": True, "width": 1024, "height": 640,
        "steps": 28, "cfg": 5.6, "cfg_rescale": 0.25, "seed": -1,
        "sampler": "k_euler_ancestral", "quality_preset": "off", "uc_preset": "none",
        "model_mode": "anime", "transparent_background": False,
        "characters": [], "use_coords": False, "variety": False,
        "dynamic_thresholding": False, "sm": False, "sm_dyn": False,
        "auto_smea": False, "legacy_v3_extend": False,
        "input_image": None, "mask_image": None,
        "vibe_references": [], "precise_references": [],
        "normalize_reference_strength": False, "output_format": "png",
    }
    req = urllib.request.Request(f'{BASE}/api/novelai/generate',
                                data=json.dumps(payload).encode(),
                                method='POST',
                                headers={'Content-Type': 'application/json', 'Accept': 'text/event-stream'})
    body = op.open(req, timeout=180).read().decode('utf-8', errors='replace')
    j = json.loads(body)
    if not j.get('id'):
        raise RuntimeError(body[:200])
    return j['id']


def wait(op, tid, timeout=180):
    t0 = time.time()
    while time.time() - t0 < timeout:
        st = json.loads(op.open(f'{BASE}/api/novelai/tasks/{tid}', timeout=15).read())
        if st.get('status') == 'completed':
            return st
        if st.get('status') in ('failed', 'cancelled'):
            raise RuntimeError(st.get('error'))
        time.sleep(2)
    raise TimeoutError(tid)


def main():
    op = init_session()
    for item in VARIANTS:
        dst = os.path.join(OUT_DIR, item["key"] + '.webp')
        if os.path.exists(dst):
            print('[skip]', item["key"]); continue
        tid = submit(op, item)
        wait(op, tid)
        raw = op.open(f'{BASE}/api/novelai/tasks/{tid}/image?format=png&index=0', timeout=60).read()
        im = Image.open(io.BytesIO(raw)).convert('RGB')
        im.save(os.path.join(OUT_DIR, item["key"] + '.png'), 'PNG')
        im.save(dst, 'WEBP', quality=92, method=6)
        print('[ok]', item["key"], im.size)
        time.sleep(1.2)


if __name__ == '__main__':
    main()
