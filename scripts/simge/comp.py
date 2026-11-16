import json
from PIL import Image, ImageOps
P=json.load(open("paths.json"))
def bb(*fs):
    boxes=[ImageOps.invert(Image.open(f).convert("L")).getbbox() for f in fs]
    return min(b[0] for b in boxes),min(b[1] for b in boxes),max(b[2] for b in boxes),max(b[3] for b in boxes)
cb=bb("clean_w.png","clean_t.png"); ib=bb("icon_w.png","icon_t.png")
print("clean bbox",cb,"icon bbox",ib)
x0,y0,x1,y1=cb
brand=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0} {y0} {x1-x0} {y1-y0}" shape-rendering="geometricPrecision"><path fill="#FFFFFF" fill-rule="evenodd" d="{P["clean_w.png"]}"/><path fill="#1FD1C1" fill-rule="evenodd" d="{P["clean_t.png"]}"/></svg>'
open("brand.svg","w").write(brand)
x0,y0,x1,y1=ib; w,h=x1-x0,y1-y0; cx,cy=(x0+x1)/2,(y0+y1)/2
S=2048; s=S*0.80/w  # content width 80% of canvas
icon=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}" shape-rendering="geometricPrecision"><rect width="{S}" height="{S}" fill="#000"/><g transform="translate({S/2} {S/2}) scale({s:.4f}) translate({-cx} {-cy})"><path fill="#FFFFFF" fill-rule="evenodd" d="{P["icon_w.png"]}"/><path fill="#1FD1C1" fill-rule="evenodd" d="{P["icon_t.png"]}"/></g></svg>'
open("iconA.svg","w").write(icon)
print(len(brand),len(icon))
