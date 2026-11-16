from PIL import Image
D="C:/Users/aykaraali/Desktop/"
def mk(src, out, kind, xmin=0):
    im=Image.open(D+src).convert("RGB"); w,h=im.size; px=im.load()
    m=Image.new("L",(w,h),255); mp=m.load()
    for y in range(h):
        for x in range(w):
            r,g,b=px[x,y]
            if kind=="white": ok = r>150 and g>150 and b>150 and abs(r-b)<40
            else: ok = r<130 and g>130 and b>110 and g-r>60 and x>=xmin
            if ok: mp[x,y]=0
    m.save(out)
mk("Gemini_Generated_Image_7g2957g2957g2957.jpg","clean_w.png","white")
mk("Gemini_Generated_Image_7g2957g2957g2957.jpg","clean_t.png","teal")
mk("Gemini_Generated_Image_owups0owups0owup.jpg","icon_w.png","white")
mk("Gemini_Generated_Image_owups0owups0owup.jpg","icon_t.png","teal",xmin=1300)
print("ok")
