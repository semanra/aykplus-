# v68: 3D kas haritası, yeni kas grupları, animasyonlar
# 1) img/kas-3d-etiket.png + img/kas-3d-isik.webp: boyut, indeksler, kırıntı yok, sabit nokta
# 2) MUSCLES 13 grup, autoMuscle, eski kayıt, #exMuscle
# 3) Çizici: renk, seviye, kontur, önbellek, seçim, muscleAt
# 4) Paylaşım kartı  5) Antrenman KAS YÜKÜ  6) Bitiş özeti  7) Paylaşım penceresi animasyonu
import os, sys, subprocess, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SHOTS = os.path.join(REPO, "tests", "shots"); os.makedirs(SHOTS, exist_ok=True)
PORT = 8825
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)

MUSCLES = ["Göğüs", "Sırt", "Omuz", "Ön Bacak", "Arka Bacak & Kalça", "Kalf", "Biceps", "Triceps", "Karın", "Ön Kol", "Boyun", "İç Bacak", "Kaval"]

# --- 1) Harita dosyaları (sayfa açmadan)
LAB = os.path.join(REPO, "img", "kas-3d-etiket.png"); SHD = os.path.join(REPO, "img", "kas-3d-isik.webp")
if not (os.path.exists(LAB) and os.path.exists(SHD)):
    check(False, "1a: kas-3d-etiket.png ve kas-3d-isik.webp var")
else:
    import numpy as np
    from PIL import Image
    from scipy import ndimage
    li = Image.open(LAB); si = Image.open(SHD)
    check(li.size == si.size and li.width == 900, "1a: aynı boyut, genişlik 900 (%s / %s)" % (li.size, si.size))
    check(li.mode == "P", "1a: etiket paletli PNG (%s)" % li.mode)
    lab = np.asarray(li)
    check(int(lab.max()) <= 14, "1b: yalnız 0–14 indeksleri (en büyük %d)" % lab.max())
    small = [MUSCLES[i - 2] for i in range(2, 15) if (lab == i).sum() < 1500]
    check(small == [], "1b: her kas ≥ 1500 piksel: eksik %s" % small)
    crumbs = []
    for i in range(2, 15):
        cc, n = ndimage.label(lab == i)
        if n:
            sizes = ndimage.sum(np.ones_like(cc), cc, range(1, n + 1))
            if (sizes < 150).any(): crumbs.append((MUSCLES[i - 2], int((sizes < 150).sum())))
    check(crumbs == [], "1c: 150 pikselden küçük kopuk parça yok: %s" % crumbs)
    tot = os.path.getsize(LAB) + os.path.getsize(SHD)
    check(tot < 160_000, "1d: toplam < 160 KB (%d)" % tot)
    H, W = lab.shape
    # ön figür (sol yarı) göğüs bölgesi
    box = lab[int(H * 0.215):int(H * 0.245), int(W * 0.19):int(W * 0.31)]
    vals, cnt = np.unique(box, return_counts=True)
    check(int(vals[cnt.argmax()]) == MUSCLES.index("Göğüs") + 2, "1e: ön göğüs bölgesinde çoğunluk Göğüs (%s)" % dict(zip(vals.tolist(), cnt.tolist())))

srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT)], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
URL = f"http://localhost:{PORT}/index.html"
def boot(pg): pg.wait_for_function("window.aykBooted === true"); pg.wait_for_timeout(80)
try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    def ctx(locale="tr-TR", scheme="dark", anim=False, route=None):
        c = b.new_context(color_scheme=scheme, viewport={"width": 390, "height": 844}, locale=locale, service_workers="block")
        c.add_init_script(TEST_INIT)
        if anim: c.add_init_script("delete window.AYK_NO_ANIM; Object.defineProperty(window, 'AYK_NO_ANIM', { get: () => undefined, set: () => {} });")
        if route: c.route(route[0], route[1])
        pg = c.new_page(); pg.on("pageerror", lambda e: errs.append(str(e))); pg.goto(URL); boot(pg)
        return c, pg
    c, pg = ctx()

    # --- 2) Kas grupları
    check(pg.evaluate("MUSCLES") == MUSCLES, "2a: MUSCLES 13 grup, sıra")
    check(pg.evaluate("MINOR_MUSCLES") == ["Ön Kol", "Boyun", "İç Bacak", "Kaval"], "2a: MINOR_MUSCLES")
    AUTO = {"Wrist Curl (Bilek)": "Ön Kol", "Reverse Wrist Curl (Bilek)": "Ön Kol", "Reverse Barbell / Cable Curl (Ön Kol)": "Ön Kol",
            "Hip Adduction Machine (İç Bacak)": "İç Bacak", "Tibialis Raise": "Kaval", "Neck Curl": "Boyun", "Seated Calf Raise": "Kalf",
            "Hammer Curl (Dumbbell)": "Biceps", "Hip Abduction Machine (Dış Bacak / Yan Kalça)": "Arka Bacak & Kalça",
            "Copenhagen Plank": "İç Bacak", "Farmer Walk": "Ön Kol", "Bench Press": "Göğüs", "Barbell Curl": "Biceps"}
    got = pg.evaluate("names => Object.fromEntries(names.map(n => [n, autoMuscle(n)]))", list(AUTO))
    check(got == AUTO, "2b: autoMuscle %s" % {k: v for k, v in got.items() if AUTO[k] != v})
    w = pg.evaluate("""() => { const T = Date.now(); state.exerciseHistory = {};
      state.exerciseHistory[exKey('Tibialis Raise')] = [{ ts: T, logId: 'X', kind: 'weight', name: 'Tibialis Raise', muscle: 'Kalf', sets: [{ kg: 10, reps: 15 }, { kg: 10, reps: 15 }] }];
      state.exerciseHistory[exKey('Wrist Curl (Bilek)')] = [{ ts: T, logId: 'X', kind: 'weight', name: 'Wrist Curl (Bilek)', sets: [{ kg: 10, reps: 15 }] }];
      renderAll(); return weeklyMuscleSets(weekStart()); }""")
    check(w["Kalf"] == 2 and w["Kaval"] == 0 and w["Ön Kol"] == 1, "2c: elle seçilmiş Kalf korunur, Wrist Curl Ön Kol'a sayılır %s" % w)
    pg.wait_for_timeout(2300)
    st = pg.evaluate("aykStoredState()")
    check(st["exerciseHistory"][pg.evaluate("exKey('Tibialis Raise')")][0]["muscle"] == "Kalf", "2c: kayıttaki muscle değişmedi")
    opts = pg.evaluate("Array.from(document.querySelectorAll('#exMuscle option')).map(o => o.value)")
    check(opts == ["auto"] + MUSCLES, "2d: #exMuscle seçenekleri %s" % opts)
    pg.evaluate("setLang('en')")
    pg.evaluate("openExerciseModal({ name: 'Tibialis Raise', kind: 'weight' })")
    txt = pg.evaluate("Array.from(document.querySelectorAll('#exMuscle option')).slice(-4).map(o => o.textContent)")
    check(txt == ["Forearms", "Neck", "Adductors", "Tibialis"], "2d: İngilizce adlar %s" % txt)
    pg.evaluate("closeModal('exerciseModal'); setLang('tr')")
    c.close()

    b.close()
finally:
    srv.terminate()
check(errs == [], "sayfa hatası yok: %s" % errs[:3])
if fails: print("\n%d HATA" % len(fails)); sys.exit(1)
print("\nTÜMÜ GEÇTİ")
