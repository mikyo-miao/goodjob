# -*- coding: utf-8 -*-
import numpy as np, sys
from PIL import Image, ImageDraw, ImageFilter
sys.stdout.reconfigure(encoding='utf-8')
W,H=832,1216
src=Image.open('_rig/a_pose.png').convert('RGBA')
HEAD=[(320,300),(310,250),(305,190),(315,130),(335,80),(365,45),(405,28),(450,30),
      (490,55),(515,100),(525,150),(525,200),(515,245),(500,285),(480,300),(460,280),
      (440,255),(410,245),(380,250),(355,270),(340,290)]
ARML=[(330,285),(322,300),(312,325),(302,355),(292,390),(282,425),(272,460),(262,495),
      (252,525),(240,550),(225,572),(210,588),(198,600),(188,608),(182,614),(190,618),
      (202,612),(216,604),(230,592),(245,575),(258,555),(270,530),(280,500),(290,470),
      (300,435),(310,400),(320,365),(328,330),(334,300),(338,288)]
ARMR=[(832-x,y) for x,y in ARML]
def poly(points, feather=1):
    m=Image.new('L',(W,H),0)
    ImageDraw.Draw(m).polygon(points,fill=255)
    if feather: m=m.filter(ImageFilter.GaussianBlur(feather))
    return np.array(m,dtype=np.float32)/255.
def cut(mask):
    a=np.array(src).copy()
    a[:,:,3]=(a[:,:,3].astype(np.float32)*mask).clip(0,255).astype(np.uint8)
    return Image.fromarray(a,'RGBA')
mh=poly(HEAD,1); ml=poly(ARML,1); mr=poly(ARMR,1)
cut(ml).save('assets/rig/armL.png')
cut(mr).save('assets/rig/armR.png')
cut(mh).save('assets/rig/head.png')
# body: remove head and arms, keep everything else (no inpaint; arms were separated)
mb=np.clip(1-mh-ml-mr,0,1)
cut(mb).save('assets/rig/body.png')
# preview composite in A-pose
comp=Image.new('RGBA',(W,H),(0,0,0,0))
for n in ['body','head','armL','armR']:
    comp.alpha_composite(Image.open(f'assets/rig/{n}.png'))
comp.convert('RGB').save('_rig/rig_rest.jpg',quality=92)
print('layers done')
