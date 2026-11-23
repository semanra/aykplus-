import sys, os, numpy as np
from PIL import Image
from scipy import ndimage as ndi
SRC=r"C:\Users\aykaraali\Desktop\AYK+ Egzersizler"
def bg_region(a):
    lum=a.mean(2); mn=a.min(2); ch=a.max(2)-mn
    white=(mn>=246)&(ch<8)
    lab,_=ndi.label(white)
    area=np.bincount(lab.ravel())
    border=np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]]))
    big=np.where(area>a.shape[0]*a.shape[1]*0.002)[0]
    seeds=set(border)|set(big); seeds.discard(0)
    seedmask=np.isin(lab,list(seeds))
    sc=a.shape[1]/1376.0
    gm=ndi.gaussian_gradient_magnitude(lum,sigma=max(1.0,sc))*sc
    soft=(lum>=150)&(gm<GRAD)
    lab2,_=ndi.label(soft)
    keep=np.unique(lab2[seedmask]); keep=keep[keep>0]
    reg=np.isin(lab2,keep)
    # gölgeler: yumuşak kenarlı açık gri alanlar (kenar eğimi düşük) arka plana katılır; makine/figür kenarı serttir
    lab3,_=ndi.label((lum>=SHADOW_LUM)&(ch<14)&(gm<SHADOW_SPLIT)); keep3=np.unique(lab3[seedmask]); keep3=keep3[keep3>0]
    extra=np.isin(lab3,keep3)&~reg
    lab4,k4=ndi.label(extra); objs=ndi.find_objects(lab4)
    for i in range(1,k4+1):
        sl=tuple(slice(max(0,s.start-4),s.stop+4) for s in objs[i-1])
        m=lab4[sl]==i
        edge=m&ndi.binary_dilation(reg[sl],iterations=3)
        if edge.sum()<5: continue
        if np.median(gm[sl][edge])<SHADOW_EDGE: reg[sl]|=m
    return ndi.binary_dilation(reg,iterations=2)
PILOT={19:os.path.join(os.path.dirname(os.path.abspath(__file__)),"19_duzeltilmis.png"),1:"Gemini_Generated_Image_sjgjhbsjgjhbsjgj.jpg",20:"Gemini_Generated_Image_xf6kyxf6kyxf6kyx.jpg",23:"Gemini_Generated_Image_bdsfpubdsfpubdsf.jpg",32:"Gemini_Generated_Image_v41gzov41gzov41g.jpg"}
HALO=0.35
GRAD=6.0
SHADOW_EDGE=22.0
SHADOW_LUM=130
SHADOW_SPLIT=18.0
ARROWS={3,21,36,66,67,104,85}
def src(n): return os.path.join(SRC, PILOT.get(n, f"{n}..jpg"))
def process(path, erase=(), arrows=False):
    im=Image.open(path).convert("RGB")
    a=np.asarray(im).astype(np.float32)
    reg=bg_region(a)
    for (x0,y0,x1,y1) in erase:  # fractional boxes: make pure white
        H,W=a.shape[:2]; a[int(y0*H):int(y1*H),int(x0*W):int(x1*W)]=255; reg[int(y0*H):int(y1*H),int(x0*W):int(x1*W)]=True
    mn=a.min(2); ch=ndi.gaussian_filter(a.max(2)-mn,1.2)
    if arrows:
        sat=ch>30
        lab,k=ndi.label(ndi.binary_closing(sat,iterations=2))
        for i in range(1,k+1):
            m=lab==i
            if m.sum()<150: continue
            ring=ndi.binary_dilation(m,iterations=12)&~ndi.binary_dilation(m,iterations=5)
            frac=reg[ring].mean()
            if frac>0.85:
                print("  ok silindi", m.sum(), round(float(frac),2))
                mm=ndi.binary_dilation(m,iterations=5)
                a[mm]=255; ch[mm]=0; reg|=mm
        mn=a.min(2)
    ac2a=(255-mn)/255.0
    s=np.clip((ch-12)/40.0,0,1); s=s*s*(3-2*s)
    al=np.maximum(ac2a,s)
    al=np.where(reg,al,1.0)
    al=np.clip(al,0,1)
    safe=np.maximum(al,1e-3)[...,None]
    F=(a-255*(1-al[...,None]))/safe
    F=np.clip(F,0,255)
    al[al<0.02]=0
    # v: koyu zeminde ince koyu cizgiler (kablo) gorunsun diye hafif acik kenar
    if HALO:
        core=al>0.6
        sc=a.shape[1]/1376.0
        h=ndi.gaussian_filter(ndi.binary_dilation(core,iterations=max(1,round(2*sc))).astype(np.float32),1.0*sc)
        ha=np.clip(h,0,1)*HALO*(1-al)
        hc=np.array([225,225,230],np.float32)
        na=al+ha
        F=np.where(na[...,None]>0,(F*al[...,None]+hc*ha[...,None])/np.maximum(na,1e-3)[...,None],F)
        al=na
    rgba=np.dstack([F,al*255]).astype(np.uint8)
    return Image.fromarray(rgba,"RGBA")
def frame(img, W=1024, H=576, pad=0.05):
    bb=img.getchannel("A").point(lambda v:255 if v>8 else 0).getbbox()
    img=img.crop(bb)
    sw,sh=img.size; sc=min(W*(1-2*pad)/sw, H*(1-2*pad)/sh)
    img=img.resize((max(1,round(sw*sc)),max(1,round(sh*sc))),Image.LANCZOS)
    c=Image.new("RGBA",(W,H),(0,0,0,0)); c.paste(img,((W-img.width)//2,(H-img.height)//2),img)
    return c
if __name__=="__main__":
    out=sys.argv[1]; os.makedirs(out,exist_ok=True)
    for n in sys.argv[2:]:
        n=int(n); img=frame(process(src(n), arrows=n in ARROWS))
        p=os.path.join(out,f"{n}.webp"); img.save(p,"WEBP",quality=78,method=6)
        print(n, os.path.getsize(p)//1024,"KB")
