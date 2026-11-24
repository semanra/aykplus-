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

    # --- 4) Paylaşım kartı
    SEED = """() => { const T = Date.now(); state.workoutLogs = []; state.exerciseHistory = {};
      const add = (name, muscle, sets) => { const k = exKey(name); (state.exerciseHistory[k] = state.exerciseHistory[k] || []).push({ ts: T, logId: 'L1', kind: 'weight', name, muscle, sets }); };
      const rep = (n, kg, reps) => Array.from({ length: n }, () => ({ kg, reps }));
      state.workoutLogs.push({ id: 'L1', ts: T, dayName: 'İtiş Günü', durationMin: 60, volume: 9000, sets: 11, prs: 0, cardioMin: 0 });
      add('Bench Press', 'Göğüs', rep(8, 80, 8)); add('Lateral Raise', 'Omuz', rep(3, 10, 15)); renderAll(); }"""
    CARD = """async ([tpl, theme, size]) => { const cv = await buildShareCanvas(state.workoutLogs[0], { tpl, theme, size, stats: {} });
      const px = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let tq = 0;
      for (let i = 0; i < px.length; i += 16) { const r = px[i], g = px[i + 1], b = px[i + 2]; if (px[i + 3] > 200 && g > 150 && b > 130 && r < 110) tq++; }
      return tq; }"""
    c, pg = ctx(); pg.evaluate(SEED)
    for tpl, th in [("map", "dark"), ("map", "light"), ("sticker", "dark"), ("list", "dark")]:
        check(pg.evaluate(CARD, [tpl, th, "story"]) > 500, "4a: %s/%s kartında turkuaz kas haritası" % (tpl, th))
    check(pg.evaluate("[typeof paintMuscleMap, typeof MAP_KEYS, typeof loadMuscleLabels]") == ["undefined"] * 3, "4a: eski düz harita kodu kaldırıldı")
    c.close()
    sw = open(os.path.join(REPO, "sw.js"), encoding="utf-8").read()
    check("'./img/kas-3d-etiket.png'" in sw and "'./img/kas-3d-isik.webp'" in sw and "kas-harita.png" not in sw, "4b: sw.js FILES 3D harita dosyaları, eski harita yok")
    check("/kas-3d-" in sw, "4b: sw.js kalıcı görsel önbelleği 3D haritayı hariç tutar")
    c, pg = ctx(route=("**/img/kas-3d-*", lambda rt: rt.fulfill(status=404, body="yok"))); pg.evaluate(SEED)
    n = pg.evaluate("buildShareCanvas(state.workoutLogs[0], { tpl: 'map', theme: 'dark', size: 'story', stats: {} }).then(cv => cv.width)")
    check(n == 1080, "4c: harita görseli 404 → kart yine üretilir")
    c.close()

    # --- 5) Antrenman "KAS YÜKÜ"
    WSEED = """() => { const T = Date.now(); state.exerciseHistory = {}; state.libMuscle = null; state.libRange = 'week';
      const add = (name, muscle, n) => { const k = exKey(name); (state.exerciseHistory[k] = state.exerciseHistory[k] || []).push(Object.assign({ ts: T, logId: 'W', kind: 'weight', name, sets: Array.from({ length: n }, () => ({ kg: 20, reps: 10 })) }, muscle ? { muscle } : {})); };
      add('Neck Curl', null, 3); add('Lateral Raise', 'Omuz', 12); state.gymView = 'library'; state.activeTab = 'gym'; renderAll(); }"""
    CENTER = """async name => { const M = await loadMuscleMap(); const id = MUSCLES.indexOf(name) + 2, R = 8; let sx = 0, sy = 0, n = 0;
      for (let i = 0; i < M.lab.length; i++) if (M.lab[i] === id && (i % M.w) < M.w / 2) { sx += i % M.w; sy += (i / M.w) | 0; n++; }
      const mx = sx / n, my = sy / n; let best = null, bd = Infinity;
      for (let y = R; y < M.h - R; y++) for (let x = R; x < M.w / 2; x++) { if (M.lab[y * M.w + x] !== id) continue;
        if (M.lab[y * M.w + x - R] !== id || M.lab[y * M.w + x + R] !== id || M.lab[(y - R) * M.w + x] !== id || M.lab[(y + R) * M.w + x] !== id) continue;
        const d = (x - mx) ** 2 + (y - my) ** 2; if (d < bd) { bd = d; best = [x, y]; } }
      const r = document.getElementById('bodyMapCv').getBoundingClientRect(); return [r.left + best[0] * r.width / M.w, r.top + best[1] * r.height / M.h]; }"""
    TQPIX = """() => { const cv = document.getElementById('bodyMapCv'); if (!cv || !cv.width) return -1; const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let n = 0, lt = 0;
      for (let i = 0; i < d.length; i += 32) { if (d[i + 3] > 200 && d[i + 1] > d[i] + 60) n++; if (d[i + 3] > 200 && d[i] > 180 && Math.abs(d[i] - d[i + 1]) < 10) lt++; } return [n, lt]; }"""
    reqs = []
    c, pg = ctx(); pg.on("request", lambda r: reqs.append(r.url)); pg.evaluate(WSEED); pg.wait_for_timeout(300)
    check(pg.locator("#bodyMapCv").count() == 1 and pg.locator("#gymRoot img[src='anatomy.jpg']").count() == 0, "5a: canvas harita var, anatomy.jpg yok")
    pg.screenshot(path=os.path.join(SHOTS, "v68_kutuphane_koyu.png"), full_page=True)
    xy = pg.evaluate(CENTER, "Göğüs"); pg.mouse.click(*xy); pg.wait_for_timeout(150)
    check(pg.evaluate("state.libMuscle") == "Göğüs", "5b: göğse dokununca Göğüs seçilir (%s)" % pg.evaluate("state.libMuscle"))
    for m in ["Boyun", "Kaval"]:
        xy = pg.evaluate(CENTER, m); pg.mouse.click(*xy); pg.wait_for_timeout(150)
        check(pg.evaluate("state.libMuscle") == m, "5b: küçük kas %s dokunuşla seçilir (%s)" % (m, pg.evaluate("state.libMuscle")))
    r = pg.evaluate("document.getElementById('bodyMapCv').getBoundingClientRect().toJSON()")
    pg.mouse.click(r["left"] + 3, r["top"] + 3); pg.wait_for_timeout(150)
    check(pg.evaluate("state.libMuscle") == "Kaval", "5b: boş zemine dokunmak seçimi değiştirmez")
    btn = pg.evaluate("Array.from(document.querySelectorAll('[data-muscle-btn]')).map(b => [b.getAttribute('aria-label'), b.getAttribute('aria-pressed')])")
    check(len(btn) == 13 and [x[0] for x in btn] == MUSCLES and [x[0] for x in btn if x[1] == "true"] == ["Kaval"], "5c: 13 erişilebilir kas düğmesi, seçili aria-pressed %s" % btn[:3])
    rows = pg.evaluate("Array.from(document.querySelectorAll('[data-week-muscles] button')).map(b => b.innerText.replace(/\\s+/g, ' ').trim())")
    names = [x.split(" ")[0] for x in rows]
    neck = [x for x in rows if x.startswith("Boyun")]
    check(any(x.startswith("Göğüs") and "yok" in x for x in rows) and not any(x.startswith("Kaval") or x.startswith("Ön Kol") or x.startswith("İç Bacak") for x in rows), "5d: büyük kas 0 sette 'yok', küçük kas 0 sette satır yok %s" % rows)
    check(len(neck) == 1 and "3" in neck[0] and not any(w in neck[0] for w in ["az", "ideal", "yok", "yüksek"]), "5d: Boyun 3 set: yalnız sayı, yorum yok %s" % neck)
    sel = pg.evaluate("document.getElementById('gymRoot').innerText")
    check("henüz çalışılmadı" in sel, "5g: 0 setteki küçük kas seçilince 'henüz çalışılmadı'")
    pg.evaluate("state.libMuscle = 'xyz'; renderAll()")
    check(pg.locator("#bodyMapCv").count() == 1, "5g: bozuk libMuscle hata vermez")
    pg.evaluate("switchTab('progress'); setProgressView('guc')"); pg.wait_for_timeout(200)
    prog = pg.evaluate("document.getElementById('pMuscles') ? document.getElementById('pMuscles').innerText : ''")
    check("Boyun" in prog and "Kaval" not in prog and "Göğüs" in prog, "5d: İlerleme kas listesinde aynı kural")
    pg.evaluate("switchTab('gym'); setGymView('library')"); pg.wait_for_timeout(200)
    leg = pg.evaluate("document.querySelector('[data-map-legend]').innerText.replace(/\\s+/g, ' ')")
    check(leg.strip() == "0 1–9 10–20 20+ set", "5j: haftalık lejant (%s)" % leg)
    pg.evaluate("setLibRange('today')"); pg.wait_for_timeout(200)
    leg = pg.evaluate("document.querySelector('[data-map-legend]').innerText.replace(/\\s+/g, ' ')")
    check(leg.strip() == "0 1–3 4–7 8+ set", "5j: bugün lejantı (%s)" % leg)
    trow = pg.locator("[data-today-muscles] button", has_text="Omuz")
    check(trow.count() == 1 and trow.bounding_box()["height"] >= 44, "5i: Bugün görünümünde çalışılan kas satırı (≥ 44 px)")
    if trow.count(): trow.click(); pg.wait_for_timeout(150)
    check(pg.evaluate("state.libMuscle") == "Omuz", "5i: satıra dokununca kas seçilir")
    pg.evaluate("setLibRange('week')"); pg.wait_for_timeout(200)
    tq = pg.evaluate(TQPIX)
    pg.evaluate("setTheme('light')"); pg.wait_for_timeout(500)
    tl = pg.evaluate(TQPIX)
    check(tl[1] > 10 * max(tq[1], 50), "5f: tema değişince harita açık figürle yeniden çizilir (koyu %s, aydınlık %s)" % (tq, tl))
    pg.screenshot(path=os.path.join(SHOTS, "v68_kutuphane_acik.png"), full_page=True)
    check(not any("anatomy" in u for u in reqs), "5a: anatomy görselleri yüklenmez (aydınlık dahil)")
    c.close()
    def slow(rt):
        time.sleep(0.6); rt.continue_()
    c, pg = ctx(route=("**/img/kas-3d-*", slow))
    pg.evaluate("() => { state.gymView = 'library'; state.activeTab = 'gym'; renderAll(); }")
    pg.mouse.click(195, 400); pg.wait_for_timeout(1800)
    check(pg.evaluate(TQPIX) not in (-1, None) and pg.evaluate(TQPIX)[1] >= 0 and pg.evaluate("document.getElementById('bodyMapCv').width") > 0, "5e: geç yüklenen harita kendiliğinden çizilir, önce dokunmak hata vermez")
    c.close()
    c, pg = ctx(route=("**/img/kas-3d-*", lambda rt: rt.fulfill(status=404, body="yok")))
    pg.evaluate("() => { state.gymView = 'library'; state.activeTab = 'gym'; renderAll(); }"); pg.wait_for_timeout(400)
    check(pg.locator("#libList").count() == 1 and not pg.locator(".t-bodymap").is_visible(), "5h: harita 404 → harita kutusu gizli, liste çalışır")
    c.close()

    # --- 6) Bitiş özeti
    FSEED = """() => { const T = Date.now(); state.workoutLogs = []; state.exerciseHistory = {};
      const add = (name, muscle, n) => { const k = exKey(name); (state.exerciseHistory[k] = state.exerciseHistory[k] || []).push({ ts: T, logId: 'F1', kind: 'weight', name, muscle, sets: Array.from({ length: n }, () => ({ kg: 20, reps: 10 })) }); };
      state.workoutLogs.push({ id: 'F1', ts: T, dayName: 'İtiş', durationMin: 50, volume: 4000, sets: 14, prs: 0, cardioMin: 0 });
      add('Bench Press', 'Göğüs', 8); add('Lateral Raise', 'Omuz', 4); add('Pushdown', 'Triceps', 2);
      state.exerciseHistory['kosu68'] = [{ ts: T, logId: 'F2', kind: 'cardio', name: 'Koşu', sets: [{ min: 30 }] }];
      state.workoutLogs.push({ id: 'F2', ts: T, dayName: 'Kardiyo', durationMin: 30, volume: 0, sets: 1, prs: 0, cardioMin: 30 });
      state.activeTab = 'gym'; renderAll(); }"""
    FPIX = """() => { const cv = document.getElementById('finMap'); if (!cv || !cv.width) return -1; const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let n = 0, s = 0;
      for (let i = 0; i < d.length; i += 16) if (d[i + 3] > 200 && d[i + 1] > d[i] + 60) { n++; s += d[i + 1]; } return [n, n ? s / n : 0]; }"""
    c, pg = ctx(); pg.evaluate(FSEED)
    pg.evaluate("openFinishSummary(0, [])"); pg.wait_for_timeout(500)
    f6 = pg.evaluate(FPIX)
    check(f6 != -1 and f6[0] > 500, "6a: bitiş özetinde kas haritası, çalışan kaslar turkuaz (%s)" % (f6,))
    check(pg.locator("#finMap").bounding_box()["height"] >= 150, "6a: harita yeterince büyük")
    pg.screenshot(path=os.path.join(SHOTS, "v68_bitis_ozeti.png"))
    pg.evaluate("closeModal('finishModal'); openFinishSummary(1, [])"); pg.wait_for_timeout(300)
    check(pg.locator("#finMap").count() == 0, "6b: yalnız kardiyoda harita yok")
    pg.evaluate("closeModal('finishModal')")
    c.close()
    c, pg = ctx(route=("**/img/kas-3d-*", lambda rt: rt.fulfill(status=404, body="yok"))); pg.evaluate(FSEED)
    pg.evaluate("openFinishSummary(0, [])"); pg.wait_for_timeout(500)
    check(pg.locator("#finTitle").is_visible() and pg.locator("#finMap").count() == 0, "6c: harita 404 → özet açılır, harita yok")
    c.close()
    c, pg = ctx(anim=True); pg.evaluate(FSEED)
    check(pg.evaluate("animOK()"), "6d: (ön koşul) animasyon açık")
    pg.evaluate("""() => { window.__lv = []; const o = window.paintMuscleMap3d; window.paintMuscleMap3d = (m, op) => { if (op && op.levels) window.__lv.push(Object.assign({}, op.levels)); return o(m, op); }; }""")
    pg.evaluate("openFinishSummary(0, [])"); pg.wait_for_timeout(2200)
    lv = pg.evaluate("window.__lv")
    early = [x for x in lv if "Göğüs" in x and "Triceps" not in x]
    check(len(lv) >= 4 and early, "6d: kaslar sırayla yanar (önce en çok setli göğüs; %d kare)" % len(lv))
    check(all(x.get("Göğüs", 0) <= 1 for x in lv) and len(set(round(x.get("Göğüs", 0), 2) for x in lv)) > 2, "6d: göğüs parlaklığı kademeli artar")
    fa = pg.evaluate(FPIX)
    check(f6 != -1 and fa != -1 and abs(fa[1] - f6[1]) <= 5 and abs(fa[0] - f6[0]) <= max(20, f6[0] * 0.03), "6d: animasyon sonunda son hâl (%s / %s)" % (fa, f6))
    c.close()

    # --- 7) Paylaşım penceresi animasyonu
    PSEED = """() => { const T = Date.now(); state.workoutLogs = []; state.exerciseHistory = {};
      const add = (name, muscle, ts, logId, kg) => { const k = exKey(name); (state.exerciseHistory[k] = state.exerciseHistory[k] || []).push({ ts, logId, kind: 'weight', name, muscle, sets: [{ kg, reps: 8 }, { kg, reps: 8 }] }); };
      state.workoutLogs.push({ id: 'P0', ts: T - 7 * 864e5, dayName: 'İtiş', durationMin: 50, volume: 1280, sets: 2, prs: 0, cardioMin: 0 }); add('Bench Press', 'Göğüs', T - 7 * 864e5, 'P0', 80);
      state.workoutLogs.push({ id: 'P1', ts: T, dayName: 'İtiş', durationMin: 50, volume: 1360, sets: 2, prs: 1, cardioMin: 0 }); add('Bench Press', 'Göğüs', T, 'P1', 85);
      state.settings.share.tpl = 'map'; state.activeTab = 'gym'; renderAll(); }"""
    c, pg = ctx(anim=True); pg.evaluate(PSEED)
    pg.evaluate("void openShareCard(1)")
    check(pg.evaluate("document.getElementById('shareTrack').classList.contains('ayk-share-in')"), "7a: açılışta önizleme giriş animasyonu")
    pg.wait_for_timeout(450)
    check(not pg.evaluate("document.getElementById('shareTrack').classList.contains('ayk-share-in')"), "7a: giriş sınıfı 400 ms içinde kalkar")
    pg.wait_for_timeout(1500)
    pg.evaluate("setShareTpl('pr', true)")
    pg.wait_for_function("document.querySelector('[data-share-tpl=\"pr\"] .share-prev').classList.contains('ayk-pr-shine')", timeout=3000)
    check(True, "7b: rekor şablonu ilk gösterimde parıltı")
    pg.wait_for_timeout(900)
    check(not pg.evaluate("document.querySelector('[data-share-tpl=\"pr\"] .share-prev').classList.contains('ayk-pr-shine')"), "7b: parıltı sınıfı biter")
    pg.evaluate("setShareTpl('map', true)"); pg.wait_for_timeout(300); pg.evaluate("setShareTpl('pr', true)"); pg.wait_for_timeout(300)
    check(not pg.evaluate("document.querySelector('[data-share-tpl=\"pr\"] .share-prev').classList.contains('ayk-pr-shine')"), "7b: ikinci gösterimde parıltı yok")
    da = pg.evaluate("buildShareCanvas(state.workoutLogs[1], { tpl: 'pr', theme: 'dark', size: 'post', stats: {} }).then(cv => cv.toDataURL())")
    pg.evaluate("closeShare()")
    c.close()
    c, pg = ctx(); pg.evaluate(PSEED)
    pg.evaluate("state.settings.share.tpl = 'pr'; void openShareCard(1)"); pg.wait_for_timeout(1200)
    check(not pg.evaluate("document.getElementById('shareTrack').classList.contains('ayk-share-in')") and pg.locator(".ayk-pr-shine").count() == 0, "7c: animasyon kapalıyken sınıf eklenmez")
    dn = pg.evaluate("buildShareCanvas(state.workoutLogs[1], { tpl: 'pr', theme: 'dark', size: 'post', stats: {} }).then(cv => cv.toDataURL())")
    check(da == dn, "7d: paylaşılan görsel animasyondan etkilenmez")
    pg.evaluate("closeShare()")
    c.close()

    b.close()
finally:
    srv.terminate()
check(errs == [], "sayfa hatası yok: %s" % errs[:3])
if fails: print("\n%d HATA" % len(fails)); sys.exit(1)
print("\nTÜMÜ GEÇTİ")
