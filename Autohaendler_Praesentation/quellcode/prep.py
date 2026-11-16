from PIL import Image, ImageEnhance
import numpy as np
BASE=np.array([9,10,11],dtype=float)
def crop(src, ratio, fx=0.5, fy=0.5, width=2400):
    im=Image.open('raw/'+src).convert('RGB'); W,H=im.size
    if W/H>ratio: nw=int(H*ratio); x=int((W-nw)*fx); im=im.crop((x,0,x+nw,H))
    else: nh=int(W/ratio); y=int((H-nh)*fy); im=im.crop((0,y,W,y+nh))
    return im.resize((width,int(width/ratio)),Image.LANCZOS)
def grade(im, sat=0.85, con=1.08, bri=1.0):
    im=ImageEnhance.Color(im).enhance(sat); im=ImageEnhance.Contrast(im).enhance(con); return ImageEnhance.Brightness(im).enhance(bri)
def overlay(im, kind, strength=0.9, base=0.0, start=0.0, end=1.0):
    a=np.asarray(im).astype(float); h,w,_=a.shape
    if kind=='left': t=np.linspace(0,1,w)[None,:].repeat(h,0)
    elif kind=='right': t=np.linspace(1,0,w)[None,:].repeat(h,0)
    elif kind=='bottom': t=np.linspace(1,0,h)[:,None].repeat(w,1)
    elif kind=='top': t=np.linspace(0,1,h)[:,None].repeat(w,1)
    t=np.clip((t-start)/(end-start),0,1)
    alpha=base+(strength-base)*(1-t)**1.6  # strongest where t=0
    alpha=alpha[...,None]
    return Image.fromarray((a*(1-alpha)+BASE*alpha).clip(0,255).astype('uint8'))
def uniform(im, alpha):
    a=np.asarray(im).astype(float); return Image.fromarray((a*(1-alpha)+BASE*alpha).astype('uint8'))
def save(im,name): im.save('img/'+name,quality=86,optimize=True,progressive=True)

R=16/9
# 1 title: black car
im=grade(crop('u_1485291571150-772bcfc10da5.jpg',R,0.5,0.5),1,1.1)
im=overlay(im,'left',0.85,0.0,0,0.6); save(im,'s01_title.jpg')
# 2 showroom portrait for left panel 5.6x7.5
im=grade(crop('p_7144177.jpg',5.4/7.5,0.42,0.5,1400),0.8,1.05,0.92)
im=overlay(im,'bottom',0.75,0.0,0,0.45); save(im,'s02_showroom.jpg')
# 6 supra showroom right half 6.0x7.5
im=grade(crop('p_3874337.jpg',6.0/7.5,0.55,0.5,1500),0.75,1.05,0.9)
im=overlay(im,'right',0.9,0.0,0,0.5); save(im,'s06_showroom.jpg')
# 8 porsche full bleed heavy dark
im=grade(crop('u_1503376780353-7e6692767b70.jpg',R,0.5,0.6),0.7,1.05)
im=uniform(im,0.8); save(im,'s08_bg.jpg')
# 9 charging right panel 5.6x7.5
im=grade(crop('u_1593941707882-a5bba14938c7.jpg',5.2/7.5,0.62,0.5,1400),0.9,1.15,0.7)
im=overlay(im,'right',0.85,0.0,0,0.45); save(im,'s09_charge.jpg')
# 10 fazit full bleed moving car
im=grade(crop('p_3136673.jpg',R,0.5,0.5),0.8,1.1)
im=overlay(im,'top',0.8,0.25,0,0.75); save(im,'s10_bg.jpg')
# 4/11 dark garage camaro thin panel
im=grade(crop('u_1492144534655-ae79c964c9d7.jpg',4.0/7.5,0.78,0.5,1000),0.7,1.05,0.85)
im=overlay(im,'right',0.8,0,0,0.5); save(im,'s11_panel.jpg')
im=grade(crop('u_1492144534655-ae79c964c9d7.jpg',R,0.5,0.5),0.6,1.05); im=uniform(im,0.82); save(im,'s04_bg.jpg')
# Fazit composite: car on right
src=grade(crop('p_3136673.jpg',1.15,0.5,0.5,1560),0.8,1.1)
canvas=Image.new('RGB',(2400,1350),(9,10,11))
src=src.resize((int(1350*1.15),1350)); canvas.paste(src,(2400-src.width,0))
a=np.asarray(canvas).astype(float); w=2400
x=np.arange(w); x0=2400-src.width
t=np.clip((x-x0)/(src.width*0.55),0,1)  # 0 at left edge of photo
alpha=np.where(x<x0,1.0,(1-t)**1.3)[None,:,None]
a=a*(1-alpha)+BASE*alpha
canvas=Image.fromarray(a.clip(0,255).astype('uint8'))
canvas=overlay(canvas,'bottom',0.6,0,0,0.35); save(canvas,'s10_bg.jpg')
