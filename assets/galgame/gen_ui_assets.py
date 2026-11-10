# -*- coding: utf-8 -*-
"""生成 galgame 开局介绍页专属 8 张 NAI V5 UI 美化素材（与角色卡状态栏同画风、零重复）
模型: nai-diffusion-5-full + V5偏live2D精致动漫
输出: F:\\AI-Workspace\\Claude\\嘉欣同桌\\galgame\\assets\\ui\\*.webp
"""
import io, json, os, sys, time, uuid, urllib.request, http.cookiejar
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')
BASE = 'http://127.0.0.1:8899'
OUT_DIR = r'F:\AI-Workspace\Claude\嘉欣同桌\galgame\assets\ui'
os.makedirs(OUT_DIR, exist_ok=True)

sys.path.insert(0, r'F:\AI-Workspace\Claude\嘉欣同桌\立绘工程')
from style_preset import STYLE_POS, STYLE_NEG

NEG_COMMON = (
    "1girl, 1boy, human, hands, fingers, face, person, character, people, body, "
    "text, letters, numbers, kanji, chinese characters, english text, words, writing, calligraphy, "
    "watermark, signature, logo, username, blurry, lowres, worst quality, low quality, jpeg artifacts"
)

NEG_STICKER = NEG_COMMON + (
    ", room interior, wall, floor, window, scenery, background scenery, photo background, "
    "solid white background, solid black background, grey background, gradient background, "
    "frame, border, multiple views, clutter, tiny confetti, messy specks"
)

ASSETS = [
    {
        "key": "blackboard_bg",
        "size": (1024, 640),
        "transparent": False,
        "pos": (
            "no humans, flat front view of a vintage Chinese high school classroom slate blackboard, "
            "1.3::deep matte dark slate-green chalkboard surface with subtle wiped chalk dust smudges and faint erasure trails::, "
            "framed by a warm weathered vintage brown wooden frame, a wooden chalk ledge along the bottom edge "
            "holding a few short broken pieces of red and white chalk and a wooden felt chalkboard eraser, "
            "soft warm afternoon sunlight beam slanting across the top left corner, floating chalk dust motes, "
            "empty clean center area for text overlay, anime background art style, high complexity, depthness, "
            "-1::text::, -1::letters::, -1::numbers::, no text, no writing on blackboard"
        ),
        "neg": NEG_COMMON + ", desks, chairs, students, teacher, messy writing, formulas, equations, diagrams, graphs, clock",
    },
    {
        "key": "sticker_chalk_eraser",
        "size": (512, 512),
        "transparent": True,
        "pos": (
            "no humans, cute anime style UI die-cut sticker illustration, top-down angled view, "
            "1.3::a wooden felt blackboard eraser paired with a half-used stick of bright crimson-red chalk and a stick of white chalk::, "
            "a tiny puff of chalk dust particles around the chalk tips, clean dark mulberry plum outline, "
            "thick white sticker border, cel shading with soft highlights, isolated on transparent background, "
            "2.1::transparent background::, single cohesive sticker cluster, no text"
        ),
        "neg": NEG_STICKER,
    },
    {
        "key": "sticker_glasses_pen",
        "size": (640, 512),
        "transparent": True,
        "pos": (
            "no humans, cute anime style UI die-cut sticker illustration, flat lay angled composition, "
            "1.3::a pair of delicate silver-rimmed half-frame glasses, a clear barrel 0.38mm blue-black gel ink pen, "
            "and a small pastel blue-and-pink correction tape dispenser::, "
            "subtle lens reflection on the silver glasses, clean dark mulberry plum outline, "
            "white die-cut sticker border, glossy cel shading, isolated on transparent background, "
            "2.1::transparent background::, single cohesive sticker asset, no text"
        ),
        "neg": NEG_STICKER,
    },
    {
        "key": "sticker_cup_book",
        "size": (512, 512),
        "transparent": True,
        "pos": (
            "no humans, cute anime style UI die-cut sticker illustration, still life prop icon, "
            "1.3::a slightly crumpled cream-colored paper takeaway tea cup with oriental pattern beside a worn vintage pocket paperback book "
            "with clear adhesive tape repairing its spine::, a dried osmanthus flower sprig resting on the book, "
            "clean dark mulberry plum outline, white die-cut sticker border, warm nostalgic cel shading, "
            "isolated on transparent background, 2.1::transparent background::, single sticker asset, no text"
        ),
        "neg": NEG_STICKER,
    },
    {
        "key": "sticker_math_tools",
        "size": (512, 512),
        "transparent": True,
        "pos": (
            "no humans, cute anime style UI die-cut sticker illustration, school stationery icon, "
            "1.3::a metallic drafting compass, a translucent sky-blue plastic triangle ruler with worn white edges, "
            "and a small torn corner of grid graph paper with a red circle mark::, "
            "clean dark mulberry plum outline, white die-cut sticker border, crisp anime cel shading, "
            "isolated on transparent background, 2.1::transparent background::, single sticker asset, no text"
        ),
        "neg": NEG_STICKER,
    },
    {
        "key": "sticker_headphone",
        "size": (512, 512),
        "transparent": True,
        "pos": (
            "no humans, cute anime style UI die-cut sticker illustration, late night radio icon, "
            "1.3::a pair of vintage studio monitor over-ear headphones in midnight blue and silver with a coiled audio cable "
            "and a dual 3.5mm splitter jack::, two glowing golden musical eighth notes floating nearby, "
            "clean dark mulberry plum outline, white die-cut sticker border, glossy anime cel shading, "
            "isolated on transparent background, 2.1::transparent background::, single sticker asset, no text"
        ),
        "neg": NEG_STICKER,
    },
    {
        "key": "sticker_sneakers",
        "size": (512, 512),
        "transparent": True,
        "pos": (
            "no humans, cute anime style UI die-cut sticker illustration, gift item icon, "
            "1.3::a pair of clean retro cream-and-oatmeal lightweight running sneakers with soft folded white cotton crew socks "
            "and two cute pastel pink adhesive bandages (band-aids)::, "
            "clean dark mulberry plum outline, white die-cut sticker border, soft warm anime cel shading, "
            "isolated on transparent background, 2.1::transparent background::, single sticker asset, no text"
        ),
        "neg": NEG_STICKER,
    },
    {
        "key": "sticker_seal_card",
        "size": (512, 512),
        "transparent": True,
        "pos": (
            "no humans, cute anime style UI die-cut sticker illustration, contract seal icon, "
            "1.3::a small round vintage tin of vermilion red ink pad (yinni) open beside a pale yellow cardstock tag "
            "stamped with a glowing red thumbprint mark and clipped with a brass paperclip::, "
            "clean dark mulberry plum outline, white die-cut sticker border, crisp anime cel shading, "
            "isolated on transparent background, 2.1::transparent background::, single sticker asset, no text"
        ),
        "neg": NEG_STICKER,
    },
]


def init_session():
    cj = http.cookiejar.CookieJar()
    op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    fp = 'opencode-gal-ui-' + uuid.uuid4().hex[:8]
    op.open(f'{BASE}/api/auth/init?fingerprint={fp}', timeout=15).read()
    return op


def submit(op, item):
    w, h = item["size"]
    payload = {
        "model": "nai-diffusion-5-full",
        "generation_mode": "generate",
        "positive_prompt": item["pos"],
        "negative_prompt": item["neg"],
        "style_prompt": STYLE_POS,
        "style_position": "before",
        "style_negative_prompt": STYLE_NEG,
        "style_negative_position": "after",
        "count": 1,
        "stream": True,
        "width": w,
        "height": h,
        "steps": 28,
        "cfg": 6.0,
        "cfg_rescale": 0.25,
        "seed": -1,
        "sampler": "k_euler_ancestral",
        "quality_preset": "off",
        "uc_preset": "none",
        "model_mode": "anime",
        "transparent_background": item["transparent"],
        "characters": [],
        "use_coords": False,
        "variety": False,
        "dynamic_thresholding": False,
        "sm": False,
        "sm_dyn": False,
        "auto_smea": False,
        "legacy_v3_extend": False,
        "input_image": None,
        "mask_image": None,
        "vibe_references": [],
        "precise_references": [],
        "normalize_reference_strength": False,
        "output_format": "png",
    }
    req = urllib.request.Request(
        f'{BASE}/api/novelai/generate',
        data=json.dumps(payload).encode('utf-8'),
        method='POST',
        headers={'Content-Type': 'application/json', 'Accept': 'text/event-stream'},
    )
    body = op.open(req, timeout=180).read().decode('utf-8', errors='replace')
    j = json.loads(body)
    tid = j.get('id')
    if not tid:
        raise RuntimeError(f'no task id: {body[:200]}')
    return tid


def wait_task(op, tid, timeout=180):
    t0 = time.time()
    while time.time() - t0 < timeout:
        st = json.loads(op.open(f'{BASE}/api/novelai/tasks/{tid}', timeout=15).read())
        s = st.get('status')
        if s == 'completed':
            return st
        if s in ('failed', 'cancelled'):
            raise RuntimeError(f'task {tid} {s}: {st.get("error")}')
        time.sleep(2.0)
    raise TimeoutError(f'task {tid} timeout')


def save_asset(op, tid, item):
    raw = op.open(f'{BASE}/api/novelai/tasks/{tid}/image?format=png&index=0', timeout=60).read()
    im = Image.open(io.BytesIO(raw)).convert('RGBA')
    if item["transparent"]:
        a = im.getchannel('A')
        bbox = a.getbbox()
        if bbox:
            pad = 8
            x0 = max(0, bbox[0] - pad)
            y0 = max(0, bbox[1] - pad)
            x1 = min(im.width, bbox[2] + pad)
            y1 = min(im.height, bbox[3] + pad)
            im = im.crop((x0, y0, x1, y1))
    webp_path = os.path.join(OUT_DIR, f'{item["key"]}.webp')
    png_path = os.path.join(OUT_DIR, f'{item["key"]}.png')
    im.save(png_path, 'PNG')
    im.save(webp_path, 'WEBP', quality=92, method=6)
    return webp_path, im.size


def main():
    only = [x.strip() for x in sys.argv[1:] if x.strip()]
    op = init_session()
    for item in ASSETS:
        key = item["key"]
        if only and key not in only:
            continue
        webp_path = os.path.join(OUT_DIR, f'{key}.webp')
        if not only and os.path.exists(webp_path):
            print(f'[skip] {key} already exists')
            continue
        print(f'[gen] submitting {key} ({item["size"][0]}x{item["size"][1]}, transparent={item["transparent"]})...')
        tid = submit(op, item)
        st = wait_task(op, tid)
        out_path, sz = save_asset(op, tid, item)
        print(f'[ok] {key} -> {out_path} ({sz[0]}x{sz[1]}, task={tid}, filenames={st.get("filenames")})')
        time.sleep(1.5)


if __name__ == '__main__':
    main()
