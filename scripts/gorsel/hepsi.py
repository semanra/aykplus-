import os, sys, isle
from concurrent.futures import ProcessPoolExecutor
OUT=r"C:\Users\aykaraali\Desktop\AYK+ Görseller webp"
def nums():
    have={int(f.split('.')[0]) for f in os.listdir(isle.SRC) if f.endswith('..jpg')}
    return sorted(have|set(isle.PILOT))
def one(n):
    img=isle.frame(isle.process(isle.src(n), arrows=n in isle.ARROWS))
    p=os.path.join(OUT,f"{n}.webp"); img.save(p,"WEBP",quality=78,method=6)
    return n, os.path.getsize(p)
if __name__=="__main__":
    os.makedirs(OUT,exist_ok=True)
    ns=nums(); print(len(ns),"görsel",flush=True); tot=0
    with ProcessPoolExecutor(6) as ex:
        for n,s in ex.map(one,ns): tot+=s
    print("bitti, toplam MB:", round(tot/1e6,1))
