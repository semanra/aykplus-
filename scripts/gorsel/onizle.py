import sys
from PIL import Image
for p in sys.argv[1:]:
    im=Image.open(p).convert("RGBA"); W,H=im.size
    out=Image.new("RGB",(W,H*2))
    for i,bg in enumerate([(0,0,0),(244,244,245)]):
        b=Image.new("RGBA",(W,H),bg+(255,)); b.alpha_composite(im); out.paste(b.convert("RGB"),(0,H*i))
    out.save(p.replace(".webp","_on.png"))
