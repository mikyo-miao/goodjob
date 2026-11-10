# -*- coding: utf-8 -*-
import json, sys, time, urllib.request, http.cookiejar, os
sys.stdout.reconfigure(encoding='utf-8')
BASE='http://127.0.0.1:8899'
META=json.load(open(r'F:\AI-Workspace\Claude\嘉欣同桌\立绘工程\还原元数据.json',encoding='utf-8'))
SRC=META['1']['E01']
pos=SRC['positive_prompt']
pos=pos.replace('upper body, medium close-up, facing viewer, straight-on, eye-level, centered',
                'full body, standing, feet visible, facing viewer, straight-on, eye-level, centered')
pos=pos.replace('looking at viewer, cool aloof expression, closed mouth, delicate lips, eye contact',
                'A-pose, arms slightly away from body, arms angled down at 25 degrees, hands open, palms facing thighs, standing straight, looking at viewer, cool aloof expression, closed mouth')
pos=pos.replace('simple indoor background, soft lighting','2.1::transparent background::, soft lighting')
neg=SRC['negative_prompt'] + ', arms crossed, hands on hips, hands behind back, hands in pockets, bent arms, hands together, dynamic pose, foreshortening, cropped legs, feet cut off, out of frame, scenery, environment, room interior, wall, floor, window, furniture, ground shadow, gradient background, grey background'
assert len(pos)<=750, len(pos)
from importlib import util
spec=util.spec_from_file_location('sp',r'F:\AI-Workspace\Claude\嘉欣同桌\立绘工程\style_preset.py')
sp=util.module_from_spec(spec); spec.loader.exec_module(sp)
body={
 "model":"nai-diffusion-5-full","generation_mode":"generate",
 "positive_prompt":pos,"negative_prompt":neg,
 "style_prompt":sp.STYLE_POS,"style_position":"before",
 "style_negative_prompt":sp.STYLE_NEG,"style_negative_position":"after",
 "count":1,"stream":True,"width":832,"height":1216,
 "steps":28,"cfg":6.5,"cfg_rescale":0.25,
 "seed":1748707176,"sampler":"k_euler_ancestral",
 "quality_preset":"off","uc_preset":"none","model_mode":"anime",
 "transparent_background":True,"characters":[],"use_coords":False,
 "variety":False,"dynamic_thresholding":False,"sm":False,"sm_dyn":False,
 "auto_smea":False,"legacy_v3_extend":False,
 "input_image":None,"mask_image":None,"vibe_references":[],"precise_references":[],
 "normalize_reference_strength":False,"output_format":"png"
}
def req(opener,method,path,data=None,timeout=60):
    r=urllib.request.Request(BASE+path,method=method,
        data=json.dumps(data).encode() if data is not None else None,
        headers={'Content-Type':'application/json','User-Agent':'Mozilla/5.0 opencode-rig'})
    with opener.open(r,timeout=timeout) as resp: raw=resp.read()
    return json.loads(raw) if raw and raw[:1] in (b'{',b'[') else raw
cj=http.cookiejar.CookieJar(); opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
opener.addheaders=[('User-Agent','Mozilla/5.0 opencode-rig')]
req(opener,'GET','/api/auth/init?fingerprint=opencode-rig-apose')
task=req(opener,'POST','/api/novelai/generate',body)
tid=task.get('id'); print('task',tid)
deadline=time.time()+300; st={}
while time.time()<deadline:
    time.sleep(1.5)
    st=req(opener,'GET',f'/api/novelai/tasks/{tid}')
    print(st.get('status'))
    if st.get('status') in ('completed','failed','cancelled'): break
if st.get('status')!='completed':
    print('FAILED',json.dumps(st,ensure_ascii=False)[:800]); sys.exit(1)
raw=req(opener,'GET',f'/api/novelai/tasks/{tid}/image?format=png&index=0')
open('_rig/a_pose.png','wb').write(raw)
print('saved',len(raw),'bytes')
