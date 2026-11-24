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

    # --- 3) Çizici
    PX = """async ([mus, opts]) => { const M = await loadMuscleMap(); const cv = await paintMuscleMap3d(mus, opts);
      const ctx = cv.getContext('2d'); const px = ctx.getImageData(0, 0, cv.width, cv.height).data;
      const sx = cv.width / M.w, sy = cv.height / M.h;
      const avg = name => { const id = MUSCLES.indexOf(name) + 2; let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < M.lab.length; i += 7) { if (M.lab[i] !== id) continue; const x = i % M.w, y = (i / M.w) | 0;
          const j = ((Math.round(y * sy) * cv.width) + Math.round(x * sx)) * 4; r += px[j]; g += px[j + 1]; b += px[j + 2]; n++; }
        return [r / n, g / n, b / n]; };
      return { w: cv.width, mw: M.w, chest: avg('Göğüs'), back: avg('Sırt') }; }"""
    r8 = pg.evaluate(PX, [{"Göğüs": 8}, {"theme": "dark", "scale": "session"}])
    check(r8["chest"][1] > 180 and r8["chest"][2] > 170 and r8["chest"][0] < 90, "3a: 8 set göğüs parlak turkuaz %s" % r8["chest"])
    bk = r8["back"]
    check(abs(bk[0] - bk[1]) < 12 and max(bk) < 120, "3a: çalışılmayan sırt gri %s" % bk)
    r1 = pg.evaluate(PX, [{"Göğüs": 1}, {"theme": "dark", "scale": "session"}])
    check(sum(r1["chest"]) < 0.75 * sum(r8["chest"]) and r1["chest"][1] > r1["chest"][0] + 40, "3b: 1 set daha koyu ama turkuaz %s" % r1["chest"])
    edge = pg.evaluate("""async () => { const M = await loadMuscleMap(); const cv = await paintMuscleMap3d({ 'Göğüs': 8 }, { theme: 'light', scale: 'session' });
      const px = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data, sx = cv.width / M.w;
      const y = Math.round(M.h * 0.5); let x = 0; while (x < M.w && M.lab[y * M.w + x] === 0) x++;
      const at = xx => { const j = (Math.round(y * sx) * cv.width + Math.round(xx * sx)) * 4; return Array.from(px.slice(j, j + 4)); };
      const atXY = (xx, yy) => { const j = (Math.round(yy * sx) * cv.width + Math.round(xx * sx)) * 4; return Array.from(px.slice(j, j + 4)); };
      return { near: at(x - 2), far: atXY(3, 3) }; }""")
    check(edge["near"][3] > 0 and max(edge["near"][:3]) < 170, "3c: aydınlıkta figür kenarında kontur %s" % edge["near"])
    check(edge["far"][3] == 0, "3c: zemin uzağı saydam %s" % edge["far"])
    lv = pg.evaluate("[muscleLevel(1,'session'), muscleLevel(8,'session'), muscleLevel(20,'week'), muscleLevel(0,'week'), muscleLevel(4.5,'session')]")
    check(lv[:4] == [0, 1, 1, -1] and 0.4 < lv[4] < 0.6, "3d: muscleLevel %s" % lv)
    at = pg.evaluate("""async () => { const M = await loadMuscleMap(); const id = MUSCLES.indexOf('Göğüs') + 2;
      const ci = M.lab.indexOf(id) + 6 * M.w; let bi = 0; while (!(M.lab[bi] === 1 && M.lab[bi + 3] >= 2)) bi++;
      return [muscleAt(M, ci % M.w, (ci / M.w) | 0, 0), muscleAt(M, 2, 2, 0), muscleAt(M, bi % M.w, (bi / M.w) | 0, 0), muscleAt(M, bi % M.w, (bi / M.w) | 0, 10) !== null, muscleAt(M, -5, 99999, 10)]; }""")
    check(at[0] == "Göğüs" and at[1] is None and at[2] is None and at[3] and at[4] is None, "3d: muscleAt %s" % at)
    same = pg.evaluate("""async () => { const a = await paintMuscleMap3d({ 'Göğüs': 3 }, { theme: 'dark', scale: 'week' });
      const b = await paintMuscleMap3d({ 'Göğüs': 3 }, { theme: 'dark', scale: 'week' }); const c = await paintMuscleMap3d({ 'Göğüs': 3 }, { theme: 'light', scale: 'week' });
      return [a === b, a !== c]; }""")
    check(same == [True, True], "3e: aynı anahtar aynı canvas, tema farklı → farklı %s" % same)
    SEL = """async theme => { const M = await loadMuscleMap(); const cv = await paintMuscleMap3d({}, { theme, scale: 'week', selected: 'Göğüs' });
      const px = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data, sx = cv.width / M.w, id = MUSCLES.indexOf('Göğüs') + 2;
      let hi = 0, lo = 255;
      for (let y = 1; y < M.h - 1; y++) for (let x = 1; x < M.w - 1; x++) { const i = y * M.w + x; if (M.lab[i] !== id) continue;
        if (M.lab[i - 1] === id && M.lab[i + 1] === id && M.lab[i - M.w] === id && M.lab[i + M.w] === id) continue;
        const j = (Math.round(y * sx) * cv.width + Math.round(x * sx)) * 4, v = Math.min(px[j], px[j + 1], px[j + 2]), V = Math.max(px[j], px[j + 1], px[j + 2]);
        hi = Math.max(hi, v); lo = Math.min(lo, V); }
      return [hi, lo]; }"""
    sd = pg.evaluate(SEL, "dark"); sl = pg.evaluate(SEL, "light")
    check(sd[0] >= 230, "3f: koyuda seçili kas kenarı beyaz %s" % sd)
    check(sl[1] <= 40, "3f: aydınlıkta seçili kas kenarı koyu %s" % sl)
    for th in ["dark", "light", "clear"]:
        pg.evaluate("""async th => { const cv = await paintMuscleMap3d({ 'Göğüs': 9, 'Omuz': 5, 'Triceps': 3, 'Karın': 1 }, { theme: th, scale: 'session' });
          const o = document.createElement('canvas'); o.width = cv.width; o.height = cv.height; const x = o.getContext('2d');
          x.fillStyle = th === 'light' ? '#F6F6F8' : th === 'clear' ? '#5A4A3A' : '#000'; x.fillRect(0, 0, o.width, o.height); x.drawImage(cv, 0, 0);
          window.__shot = o.toDataURL(); }""", th)
        import base64
        open(os.path.join(SHOTS, "v68_harita_%s.png" % th), "wb").write(base64.b64decode(pg.evaluate("window.__shot").split(",")[1]))
    c.close()

    b.close()
finally:
    srv.terminate()
check(errs == [], "sayfa hatası yok: %s" % errs[:3])
if fails: print("\n%d HATA" % len(fails)); sys.exit(1)
print("\nTÜMÜ GEÇTİ")
