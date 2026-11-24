# v67: Antrenman paylaşım görselleri (Strava benzeri)
# 1) img/kas-harita.png: yalnız 11 anahtar renk, her kas grubu var, 900 px, < 150 KB, sw.js önbelleğinde
# 2) shareData: kas setleri, istatistikler, rekorlar, ay sırası, eski kayıt, kardiyo
# 3) paintMuscleMap: çalışan kas turkuaz, boş kas gri, boşluk şeffaf; görsel yoksa null
# 4) buildShareCanvas: 5 şablon × 2 boyut, şeffaf çıkartma, kişisel bilgi yok, istatistik kapatma, rekor kartı, uzun ad, İngilizce
# 5) Paylaşım penceresi: açılış, seçimlerin hatırlanması, bozuk ayar, fotoğraf saklanmaz, paylaş/kopyala yedekleri, 44 px
import os, sys, subprocess, time, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SHOTS = os.path.join(REPO, "tests", "shots"); os.makedirs(SHOTS, exist_ok=True)
PORT = 8824
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)

# --- 1) Kas haritası etiket görseli (sayfa açmadan)
KEYS = {(0, 0, 0): "boşluk", (128, 128, 128): "gövde", (255, 0, 0): "Göğüs", (255, 255, 0): "Omuz", (0, 0, 255): "Biceps",
        (255, 0, 255): "Triceps", (255, 128, 0): "Karın", (0, 255, 0): "Ön Bacak", (0, 255, 255): "Sırt",
        (128, 0, 255): "Arka Bacak & Kalça", (128, 64, 0): "Kalf"}
MAP = os.path.join(REPO, "img", "kas-harita.png")
if not os.path.exists(MAP):
    check(False, "1: img/kas-harita.png var")
else:
    from PIL import Image
    im = Image.open(MAP).convert("RGB")
    cols = dict((c, n) for n, c in im.getcolors(maxcolors=1 << 20) or [])
    check(set(cols) <= set(KEYS), "1: yalnız 11 anahtar renk: fazlası %s" % [c for c in cols if c not in KEYS][:5])
    small = [KEYS[c] for c in KEYS if c not in [(0, 0, 0), (128, 128, 128)] and cols.get(c, 0) < 5000]
    check(small == [], "1: her kas grubu ≥ 5000 piksel: eksik %s" % small)
    check(im.width == 900, "1: genişlik 900 (%d)" % im.width)
    check(os.path.getsize(MAP) < 150_000, "1: dosya < 150 KB (%d)" % os.path.getsize(MAP))
sw = open(os.path.join(REPO, "sw.js"), encoding="utf-8").read()
check("'./img/kas-harita.png'" in sw, "1: sw.js FILES içinde kas-harita.png")

srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT)], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
URL = f"http://localhost:{PORT}/index.html"
def boot(pg): pg.wait_for_function("window.aykBooted === true"); pg.wait_for_timeout(80)
# Örnek antrenman: 24 Kasım 2026, İtiş Günü; Bench önceki 80×8 → bu sefer 85×8 (rekor)
SEED = """() => { const T = new Date(2026, 10, 24, 18, 0).getTime(), D = 86400000;
  state.workoutLogs = []; state.exerciseHistory = {};
  const add = (name, muscle, ts, logId, sets, kind) => { const k = exKey(name); (state.exerciseHistory[k] = state.exerciseHistory[k] || []).push(Object.assign({ ts, logId, kind: kind || 'weight', name, sets }, muscle ? { muscle } : {})); };
  const rep = (n, kg, reps) => Array.from({ length: n }, () => ({ kg, reps }));
  state.workoutLogs.push({ id: 'L0', ts: T - 7 * D, dayName: 'İtiş Günü', durationMin: 60, volume: 2560, sets: 4, prs: 0, cardioMin: 0 });
  add('Bench Press', 'Göğüs', T - 7 * D, 'L0', rep(4, 80, 8));
  state.workoutLogs.push({ id: 'L1', ts: T, dayName: 'İtiş Günü', durationMin: 72, volume: 12450, sets: 11, prs: 1, cardioMin: 0 });
  add('Bench Press', 'Göğüs', T, 'L1', rep(4, 85, 8));
  add('Lateral Raise', 'Omuz', T, 'L1', rep(4, 10, 15));
  add('Triceps Pushdown', 'Triceps', T, 'L1', rep(3, 35, 12));
  renderAll(); }"""
LAST = "state.workoutLogs[state.workoutLogs.length - 1]"
try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    def ctx(locale="tr-TR"):
        c = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}, locale=locale, service_workers="block")
        c.add_init_script(TEST_INIT)
        pg = c.new_page(); pg.on("pageerror", lambda e: errs.append(str(e))); pg.goto(URL); boot(pg)
        return c, pg
    c, pg = ctx()
    pg.evaluate(SEED)

    # --- 2) shareData
    d = pg.evaluate("shareData(%s)" % LAST)
    check(d["muscles"] == {"Göğüs": 4, "Omuz": 4, "Triceps": 3}, "2: kas setleri %s" % d["muscles"])
    check([s["key"] for s in d["stats"]] == ["dur", "vol", "sets", "prs", "cardio"], "2: istatistik sırası")
    st = {s["key"]: s for s in d["stats"]}
    check(st["vol"]["value"] == "12.450 kg" and st["vol"]["label"] == "Tonaj" and st["dur"]["value"] == "1 sa 12 dk", "2: tonaj/süre metni %s %s" % (st["vol"], st["dur"]))
    check(st["dur"]["has"] and st["prs"]["has"] and not st["cardio"]["has"], "2: has bayrakları")
    check(len(d["rows"]) == 3 and [r["pr"] for r in d["rows"]].count(True) == 1 and [r for r in d["rows"] if r["pr"]][0]["name"] == "Bench Press", "2: satırlar ve rekor yıldızı %s" % d["rows"])
    check(len(d["prs"]) == 1 and d["prs"][0]["name"] == "Bench Press" and d["prs"][0]["kg"] == 85 and d["prs"][0]["reps"] == 8 and d["prs"][0]["pct"] > 0, "2: rekor listesi %s" % d["prs"])
    check(d["monthNo"] == 2 and d["monthTxt"] == "Kasım ayının 2. antrenmanı", "2: ay sırası %s %s" % (d["monthNo"], d["monthTxt"]))
    d0 = pg.evaluate("shareData(state.workoutLogs[0])")
    check(d0["prs"] == [] and not any(r["pr"] for r in d0["rows"]) and d0["monthNo"] == 1, "2: önceki oturum yoksa rekor yok; ilk antrenman 1.")
    pg.evaluate("%s.prs = 0" % LAST)
    d = pg.evaluate("shareData(%s)" % LAST)
    check(d["prs"] == [] and not any(r["pr"] for r in d["rows"]), "2: log.prs 0 → yıldız yok")
    pg.evaluate("%s.prs = 1" % LAST)
    # eski kayıt: id yok, süre yok
    d = pg.evaluate("shareData({ dayName: 'Eski', ts: Date.now(), volume: 500, sets: 5 })")
    check(d["muscles"] == {} and d["rows"] == [] and not d["stats"][0]["has"] and d["stats"][1]["has"], "2: eski kayıt güvenli %s" % d["stats"][:2])
    # kardiyo
    d = pg.evaluate("""() => { const T = Date.now(); state.exerciseHistory['kosu67'] = [{ ts: T, logId: 'LC', kind: 'cardio', name: 'Koşu Bandı', sets: [{ min: 30, km: 5 }] }];
      return shareData({ id: 'LC', ts: T, dayName: 'Kardiyo', durationMin: 30, volume: 0, sets: 1, prs: 0, cardioMin: 30, cardioKm: 5 }); }""")
    check(d["muscles"] == {} and d["stats"][4]["has"] and d["prs"] == [] and len(d["rows"]) == 1, "2: yalnız kardiyo")
    # İngilizce sıra eki
    pg.evaluate("setLang('en')")
    en = pg.evaluate("[shareData(%s).monthTxt, monthOrdinalEn(1), monthOrdinalEn(2), monthOrdinalEn(3), monthOrdinalEn(11), monthOrdinalEn(12), monthOrdinalEn(13), monthOrdinalEn(21), monthOrdinalEn(22)]" % LAST)
    check(en == ["2nd workout of November", "1st", "2nd", "3rd", "11th", "12th", "13th", "21st", "22nd"], "2: İngilizce ay sırası %s" % en)
    pg.evaluate("setLang('tr')")

    # --- 3) paintMuscleMap
    PX = """async ([mus, pal]) => { const L = await loadMuscleLabels(); const cv = await paintMuscleMap(mus, pal);
      const px = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      const at = name => { const i = MAP_KEYS.findIndex(k => k.name === name); const j = L.lab.indexOf(i); return Array.from(px.slice(j * 4, j * 4 + 4)); };
      return { w: cv.width, h: cv.height, lw: L.w, chest: at('Göğüs'), sh: at('Omuz'), back: at('Sırt'), body: at('govde'), gap: at('bosluk') }; }"""
    r = pg.evaluate(PX, [{"Göğüs": 7, "Omuz": 9}, "dark"])
    check(r["w"] == r["lw"] == 900, "3: boyanan harita etiket boyutunda (%s)" % r["w"])
    check(r["chest"][1] > 120 and r["chest"][0] < 60 and r["chest"][3] == 255, "3: çalışan kas turkuaz %s" % r["chest"])
    check(r["sh"][1] > r["chest"][1], "3: çok set = daha parlak (omuz %s > göğüs %s)" % (r["sh"][1], r["chest"][1]))
    check(r["back"] == [64, 64, 72, 255] and r["body"] == [40, 40, 45, 255], "3: boş kas / gövde koyu gri %s %s" % (r["back"], r["body"]))
    check(r["gap"][3] == 0, "3: boşluk şeffaf")
    r = pg.evaluate(PX, [{"Göğüs": 3}, "clear"])
    check(r["body"][3] == 70 and r["back"][3] == 120 and r["chest"][:3] == [31, 209, 193], "3: şeffaf takım %s %s %s" % (r["body"], r["back"], r["chest"]))
    r = pg.evaluate(PX, [{"Göğüs": 3}, "light"])
    check(r["body"][:3] == [212, 212, 216] and r["chest"][:3] == [14, 124, 114], "3: aydınlık takım %s %s" % (r["body"], r["chest"]))
    # --- 4) Şablonlar
    TX = """async (opts) => { const out = []; const o = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (tx) { out.push([String(tx), this.measureText(String(tx)).width]); return o.apply(this, arguments); };
      let cv; try { cv = await buildShareCanvas(opts.log ? opts.log : state.workoutLogs[state.workoutLogs.length - 1], opts); } finally { CanvasRenderingContext2D.prototype.fillText = o; }
      const ctx = cv.getContext('2d');
      return { w: cv.width, h: cv.height, tx: out.map(x => x[0]), wid: out.map(x => x[1]), a: ctx.getImageData(5, 5, 1, 1).data[3],
               png: opts.png ? cv.toDataURL('image/png') : null }; }"""
    import base64
    def draw(**o): return pg.evaluate(TX, o)
    def save(r, name):
        open(os.path.join(SHOTS, name), "wb").write(base64.b64decode(r["png"].split(",", 1)[1]))
    tpls = pg.evaluate("shareTplsFor(shareData(%s))" % LAST)
    check(tpls == ["map", "pr", "photo", "sticker", "list"], "4: rekorlu antrenmanda 5 şablon %s" % tpls)
    for tp in tpls:
        for sz, dims in (("story", [1080, 1920]), ("post", [1080, 1350])):
            for th in (("dark", "light") if tp in ("map", "pr", "list") else ("dark",)):
                r = draw(tpl=tp, size=sz, theme=th, png=True)
                check([r["w"], r["h"]] == dims, "4: %s %s %s boyut %s" % (tp, sz, th, [r["w"], r["h"]]))
                check(all(w <= 1080 - 2 * 56 for w in r["wid"]), "4: %s %s %s hiçbir yazı taşmıyor (en geniş %d)" % (tp, sz, th, max(r["wid"] or [0])))
                save(r, "v67_%s_%s_%s.png" % (tp, sz, th))
    cut = [(tp, sz, x) for tp in tpls for sz in ("story", "post") for x in draw(tpl=tp, size=sz)["tx"] if x.endswith("…")]
    check(cut == [], "4: normal verili kartlarda hiçbir yazı kırpılmıyor: %s" % cut[:4])
    BOX = """async (opts) => { const boxes = []; const o = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function (im, x, y, w, h) { if (this.canvas.width === 1080 && im.width === 900) boxes.push([x, y, x + w, y + h]); return o.apply(this, arguments); };
      const f = CanvasRenderingContext2D.prototype.fill; const pan = [];
      let cv; try { cv = await buildShareCanvas(state.workoutLogs[state.workoutLogs.length - 1], opts); } finally { CanvasRenderingContext2D.prototype.drawImage = o; }
      return boxes; }"""
    over = []
    for tp in ("map", "pr", "list", "photo"):
        for sz in ("story", "post"):
            bx = pg.evaluate(BOX, {"tpl": tp, "size": sz})
            if len(bx) != 1: over.append((tp, sz, "harita sayısı %d" % len(bx)))
    check(over == [], "4: her kartta tek harita %s" % over)
    lst = pg.evaluate(BOX, {"tpl": "list", "size": "story"})
    check(lst and lst[0][1] > 900 and (lst[0][2] - lst[0][0]) >= 360, "4: az hareketli listede harita alttaki boşlukta büyük: %s" % lst)
    lp = pg.evaluate(BOX, {"tpl": "list", "size": "post"})
    check(lp and lp[0][3] <= 400, "4: gönderi listesinde harita panelin (400) üstünde biter: %s" % lp)
    ph = pg.evaluate(BOX, {"tpl": "photo", "size": "story"})
    check(ph and ph[0][1] > 600, "4: fotoğraf kartında harita yer tutucunun (270–570) altında başlar: %s" % ph)
    check(draw(tpl="sticker")["a"] == 0 and draw(tpl="map")["a"] == 255, "4: çıkartma köşesi şeffaf, kart köşesi dolu")
    r = draw(tpl="map")
    check("AYK" in r["tx"] and "+" in r["tx"] and "Antrenman tamamlandı" in r["tx"] and "AYK+ ile kaydedildi" in r["tx"], "4: kart metinleri (AYK+ yazısı, etiket, alt satır)")
    check("Kasım ayının 2. antrenmanı" in r["tx"] and "İTİŞ GÜNÜ" in r["tx"], "4: ay sırası ve gün adı")
    check(any("Göğüs" in x for x in r["tx"]) and any("Çalışan kaslar" in x for x in r["tx"]), "4: çalışan kaslar satırı")
    # kişisel bilgi yok
    pg.evaluate("""() => { state.weight = 93.7; state.settings.targetWeight = 77.3; state.settings.height = 181; state.settings.age = 34;
      state.measurements = [{ date: '2026-11-20', waist: 88.5, chest: 104.5 }]; }""")
    alltx = []
    for tp in tpls:
        for sz in ("story", "post"): alltx += draw(tpl=tp, size=sz)["tx"]
    bad = [x for x in alltx if re.search(r"93[,.]7|77[,.]3|\b181\b|\b34\b|88[,.]5|104[,.]5", x)]
    check(bad == [], "4: kişisel bilgi (kilo, hedef, boy, yaş, ölçü) hiçbir şablonda yok: %s" % bad)
    # istatistik kapatma
    r = draw(tpl="map", stats={"vol": False})
    check("Tonaj" not in r["tx"] and "Süre" in r["tx"], "4: Tonaj kapalı → çizilmez")
    r = draw(tpl="map", stats={"dur": False, "vol": False, "sets": False, "prs": False, "cardio": False, "month": False})
    check(not any(x in r["tx"] for x in ("Süre", "Tonaj", "Set", "Rekor")) and "Kasım ayının 2. antrenmanı" not in r["tx"], "4: hepsi kapalı → panel ve ay satırı yok")
    # rekor kartı
    r = draw(tpl="pr")
    check("YENİ REKOR" in r["tx"] and "BENCH PRESS" in r["tx"] and "85 kg × 8" in r["tx"], "4: rekor kartı %s" % r["tx"][:8])
    pg.evaluate("setUnits('imperial')")
    want = pg.evaluate("fmtW(85) + ' × 8'")
    r = draw(tpl="pr"); r2 = draw(tpl="list")
    check(want in r["tx"] and not [x for x in r["tx"] + r2["tx"] if x.endswith(" kg") or " kg " in x], "4: imperial rekor/liste lb (%s)" % want)
    pg.evaluate("setUnits('metric')")
    # uzun adlar
    pg.evaluate("""() => { const L = state.workoutLogs[state.workoutLogs.length - 1]; L.dayName = 'Çok Uzun Bir Antrenman Günü Adı Gerçekten Çok Uzun 🔥🔥 Süper';
      state.exerciseHistory[exKey('Bench Press')][1].name = 'Bench Press 🏋️ geniş tutuş, duraklamalı, çok uzun bir ad'; }""")
    for tp in tpls:
        for sz in ("story", "post"):
            r = draw(tpl=tp, size=sz)
            check(all(w <= 1080 - 2 * 56 for w in r["wid"]), "4: uzun adlar %s %s taşmıyor (en geniş %d)" % (tp, sz, max(r["wid"] or [0])))
    pg.evaluate("""() => { state.workoutLogs[state.workoutLogs.length - 1].dayName = 'İtiş Günü'; state.exerciseHistory[exKey('Bench Press')][1].name = 'Bench Press'; }""")
    # tam vücut: çalışan kaslar satırı kırpılmaz, gerekirse iki satır
    FB = """() => { const T = Date.now(); MUSCLES.forEach((m, i) => { const k = 'fb67_' + i; state.exerciseHistory[k] = [{ ts: T, logId: 'LF', kind: 'weight', name: 'Hareket ' + i, muscle: m, sets: [{ kg: 20, reps: 10 }] }]; });
      return { id: 'LF', ts: T, dayName: 'Tam Vücut', durationMin: 60, volume: 1800, sets: 9, prs: 0, cardioMin: 0 }; }"""
    r = pg.evaluate("async () => { const L = (%s)(); const out = []; const o = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function (tx) { out.push([String(tx), this.measureText(String(tx)).width]); return o.apply(this, arguments); }; try { await buildShareCanvas(L, { tpl: 'map' }); } finally { CanvasRenderingContext2D.prototype.fillText = o; } return out; }" % FB)
    cutw = [x for x, w in r if x.endswith("…")]
    check(cutw == [] and all(w <= 968 for x, w in r) and sum(1 for x, w in r if "Arka Bacak & Kalça" in x or x == "Arka Bacak & Kalça") == 1, "4: tam vücutta çalışan kaslar kırpılmadan (gerekirse 2 satır): %s" % [x for x, w in r if "Çalışan" in x or "Karın" in x or "…" in x])
    # İngilizce
    pg.evaluate("setLang('en')")
    TR_CH = re.compile(r"[çğıöşüÇĞİÖŞÜ]")
    r = draw(tpl="map"); rp = draw(tpl="pr"); rl = draw(tpl="list")
    user = {"İTİŞ GÜNÜ", "İtiş Günü", pg.evaluate("upperL('İtiş Günü')")}   # kullanıcının Türkçe gün adı, dilin büyük harf kuralıyla
    check("Workout complete" in r["tx"] and "Logged with AYK+" in r["tx"] and any("Muscles worked" in x for x in r["tx"]) and "2nd workout of November" in r["tx"] and "NEW PR" in rp["tx"], "4: İngilizce metinler")
    check(not [x for x in r["tx"] + rp["tx"] + rl["tx"] if TR_CH.search(x) and x not in user], "4: İngilizcede Türkçe harf yok (kullanıcı adları hariç): %s" % [x for x in r["tx"] + rp["tx"] + rl["tx"] if TR_CH.search(x) and x not in user][:5])
    pg.evaluate("setLang('tr')")
    # yalnız kardiyo
    CL = "{ id: 'LC', ts: Date.now(), dayName: 'Kardiyo', durationMin: 30, volume: 0, sets: 1, prs: 0, cardioMin: 30, cardioKm: 5 }"
    check(pg.evaluate("shareTplsFor(shareData(%s))" % CL) == ["map", "photo", "sticker", "list"], "4: kardiyo → rekor şablonu yok")
    r = pg.evaluate(TX.replace("opts.log ? opts.log :", "(%s) ||" % CL), {"tpl": "map"})
    check(not any("Çalışan kaslar" in x for x in r["tx"]) and "Kardiyo" in r["tx"], "4: kardiyo kartında çalışan kaslar satırı yok, Kardiyo var")
    check(pg.evaluate("shareTplsFor(shareData({ dayName: 'Eski', ts: Date.now(), volume: 500, sets: 5 }))") == ["map", "photo", "sticker"], "4: eski kayıt → liste yok")
    c.close()

    # --- 5) Paylaşım penceresi
    c, pg = ctx(); pg.evaluate(SEED)
    pg.evaluate("void openFinishSummary(state.workoutLogs.length - 1, [])"); pg.wait_for_selector("#finShare")
    pg.click("#finShare")
    pg.wait_for_selector("#shareModal:not(.hidden)"); pg.wait_for_function("document.querySelector('#shareTrack [data-share-tpl] img[src]')")
    r = pg.evaluate("""() => ({ dots: [...document.querySelectorAll('#shareDots [data-share-dot]')].map(e => e.dataset.shareDot),
      tpl: $('shareModal').dataset.tpl, theme: !$('shareTheme').classList.contains('hidden'), photo: !$('sharePhotoBtn').classList.contains('hidden'),
      copy: !$('shareCopy').classList.contains('hidden') })""")
    check(r["dots"] == ["map", "pr", "photo", "sticker", "list"] and r["tpl"] == "map", "5: bitiş özetinden açılır, 5 şablon, kas haritasıyla %s" % r)
    check(r["theme"] and not r["photo"] and not r["copy"], "5: kas haritasında tema seçici var, fotoğraf/kopyala yok")
    small = pg.evaluate("""() => [...document.querySelectorAll('#shareModal button')].filter(e => e.offsetParent).map(e => { const b = e.getBoundingClientRect(); return [e.textContent.trim().slice(0, 16) || e.getAttribute('aria-label'), Math.round(b.width), Math.round(b.height)]; }).filter(x => x[1] < 44 || x[2] < 44)""")
    check(small == [], "5: penceredeki bütün düğmeler ≥ 44 px: %s" % small)
    check(pg.evaluate("$('shareGo').getBoundingClientRect().bottom") <= 844, "5: Paylaş düğmesi iPhone ekranında kaydırmadan görünür (%s)" % pg.evaluate("$('shareGo').getBoundingClientRect().bottom"))
    pg.screenshot(path=os.path.join(SHOTS, "v67_pencere.png"))
    # parmakla kaydırma: kaydırma durunca o şablon seçilir
    pg.evaluate("() => { const tr = $('shareTrack'); tr.scrollLeft = 4 * tr.clientWidth; }")
    pg.wait_for_function("$('shareModal').dataset.tpl === 'list'", timeout=3000)
    check(pg.evaluate("$('shareModal').dataset.tpl") == "list", "5: kaydırınca şablon değişir (liste)")
    pg.evaluate("() => { const tr = $('shareTrack'); tr.scrollLeft = 0; }")
    pg.wait_for_function("$('shareModal').dataset.tpl === 'map'", timeout=3000)
    # seçimler hatırlanır
    pg.click('[data-share-size="post"]'); pg.click('[data-share-theme="light"]'); pg.click('[data-share-stat="vol"]')
    pg.click('[data-share-dot="list"]'); pg.wait_for_timeout(150)
    pg.click("#shareClose"); pg.wait_for_selector("#shareModal.hidden", state="attached")
    stored = pg.evaluate("aykStoredState().then(s => s.settings.share)")
    check(stored and stored["tpl"] == "list" and stored["size"] == "post" and stored["theme"] == "light" and stored["stats"]["vol"] is False and stored["stats"]["dur"] is True, "5: seçimler kayda yazıldı %s" % stored)
    pg.evaluate("void openShareCard(state.workoutLogs.length - 1)"); pg.wait_for_selector("#shareModal:not(.hidden)")
    r = pg.evaluate("""() => ({ tpl: $('shareModal').dataset.tpl, size: document.querySelector('[data-share-size="post"]').getAttribute('aria-pressed'),
      theme: document.querySelector('[data-share-theme="light"]').getAttribute('aria-pressed'), vol: document.querySelector('[data-share-stat="vol"]').getAttribute('aria-pressed') })""")
    check(r == {"tpl": "list", "size": "true", "theme": "true", "vol": "false"}, "5: yeniden açılınca aynı seçimler %s" % r)
    # son açık istatistik kapatılamaz
    left = pg.evaluate("""() => { const on = () => [...document.querySelectorAll('[data-share-stat]')].filter(b => !b.disabled && b.getAttribute('aria-pressed') === 'true');
      for (let i = 0; i < 8 && on().length; i++) on()[0].click();   // hepsini kapatmayı dene
      return on().map(b => b.dataset.shareStat); }""")
    check(len(left) == 1, "5: son açık istatistik kapatılamaz (açık kalan: %s)" % left)
    pg.click("#shareClose")
    # bozuk ayar → varsayılan; fotoğraf hatırlanmaz
    nb = pg.evaluate("""() => { const a = clone(state); a.settings.share = 'x'; const b = clone(state); b.settings.share = { tpl: 'photo', size: 5, theme: 'mor', stats: { vol: 'evet' } };
      const c = clone(state); delete c.settings.share; return [normalizeState(a).settings.share, normalizeState(b).settings.share, normalizeState(c).settings.share]; }""")
    dflt = {"tpl": "map", "size": "story", "theme": "dark", "stats": {"dur": True, "vol": True, "sets": True, "prs": True, "cardio": True, "month": True}}
    check(nb[0] == dflt and nb[2] == dflt and nb[1]["tpl"] == "map" and nb[1]["size"] == "story" and nb[1]["theme"] == "dark" and nb[1]["stats"]["vol"] is True, "5: bozuk / eksik ayar → varsayılan %s" % nb)
    # fotoğraf: önizlemede kullanılır, hiçbir yere kaydedilmez
    pg.evaluate("void openShareCard(state.workoutLogs.length - 1)"); pg.wait_for_selector("#shareModal:not(.hidden)")
    pg.click('[data-share-dot="photo"]'); pg.wait_for_selector("#sharePhotoBtn:not(.hidden)")
    check(pg.evaluate("$('shareGo').disabled"), "5: fotoğraf seçilmeden Paylaş pasif")
    import struct, zlib
    def png1(rgb):
        raw = b"\x00" + bytes(rgb) * 4
        def ch(t, d): return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d))
        return b"\x89PNG\r\n\x1a\n" + ch(b"IHDR", struct.pack(">IIBBBBB", 4, 1, 8, 2, 0, 0, 0)) + ch(b"IDAT", zlib.compress(raw)) + ch(b"IEND", b"")
    pg.set_input_files("#sharePhotoInput", files=[{"name": "f.png", "mimeType": "image/png", "buffer": png1((220, 40, 40))}])
    pg.wait_for_function("!$('shareGo').disabled")
    check(pg.evaluate("sharePhoto !== null"), "5: seçilen fotoğraf önizlemede kullanılıyor")
    pg.click("#shareClose")
    leak = pg.evaluate("""async () => { const s = JSON.stringify(await aykStoredState()); const ls = Object.keys(localStorage).map(k => localStorage.getItem(k) || '').join('');
      return { photo: sharePhoto, s: /data:image|blob:/.test(s.replace(state.customIconDataUrl || '@@', '')), ls: /blob:/.test(ls) }; }""")
    check(leak["photo"] is None and not leak["s"] and not leak["ls"], "5: pencere kapanınca fotoğraf bırakılır, kayıtta görsel yok %s" % leak)
    pg.evaluate("void openShareCard(state.workoutLogs.length - 1)"); pg.wait_for_selector("#shareModal:not(.hidden)")
    check(pg.evaluate("$('shareModal').dataset.tpl") != "photo" and pg.evaluate("sharePhoto") is None, "5: fotoğraf şablonu ve fotoğraf hatırlanmaz")
    pg.click("#shareClose")
    # paylaş yedeği (indirme) ve kopyala
    pg.evaluate("() => { delete Navigator.prototype.share; delete Navigator.prototype.canShare; }")
    pg.evaluate("void openShareCard(state.workoutLogs.length - 1)"); pg.wait_for_selector("#shareModal:not(.hidden)")
    pg.click('[data-share-dot="map"]')
    with pg.expect_download(timeout=8000) as dl: pg.click("#shareGo")
    check(dl.value.suggested_filename.endswith(".png"), "5: paylaşım yoksa PNG indirilir (%s)" % dl.value.suggested_filename)
    pg.click("#shareClose")
    pg.evaluate("() => { window.__cp = 0; window.ClipboardItem = function (o) { this.o = o; }; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { write: async () => { window.__cp++; } } }); }")
    pg.evaluate("void openShareCard(state.workoutLogs.length - 1)"); pg.wait_for_selector("#shareModal:not(.hidden)")
    pg.click('[data-share-dot="sticker"]'); pg.wait_for_selector("#shareCopy:not(.hidden)")
    check(pg.evaluate("$('shareTheme').classList.contains('hidden')"), "5: çıkartmada tema seçici gizli")
    pg.click("#shareCopy"); pg.wait_for_function("window.__cp === 1")
    check(pg.evaluate("window.__cp") == 1, "5: Kopyala panoya yazar")
    pg.click("#shareClose")
    pg.evaluate("() => { delete window.ClipboardItem; }")
    pg.evaluate("void openShareCard(state.workoutLogs.length - 1)"); pg.wait_for_selector("#shareModal:not(.hidden)")
    pg.click('[data-share-dot="sticker"]'); pg.wait_for_timeout(100)
    check(pg.evaluate("$('shareCopy').classList.contains('hidden')"), "5: pano desteklenmiyorsa Kopyala gizli")
    pg.click("#shareClose")
    # Geçmiş'ten eski antrenman: liste yok, Süre pasif
    pg.evaluate("() => { state.workoutLogs.unshift({ dayName: 'Eski', ts: Date.now() - 400 * 86400000, volume: 500, sets: 5 }); renderAll(); }")
    pg.evaluate("void openShareCard(0)"); pg.wait_for_selector("#shareModal:not(.hidden)")
    r = pg.evaluate("""() => ({ dots: [...document.querySelectorAll('#shareDots [data-share-dot]')].map(e => e.dataset.shareDot),
      dur: document.querySelector('[data-share-stat="dur"]').disabled })""")
    check(r["dots"] == ["map", "photo", "sticker"] and r["dur"], "5: eski antrenman: liste/rekor yok, Süre çipi pasif %s" % r)
    pg.click("#shareClose")
    # 6) Eski açık (bozuk_veri.py v67'de buldu): mobilityLog'da liste olmayan kayıt Mobilite'yi çökertmesin; kayıt silinmez
    n0 = len(errs)
    pg.evaluate("() => { state.mobilityLog = Object.assign({}, state.mobilityLog, { x: 1, '2026-11-20': { a: 1 } }); state.gymActive = false; switchTab('mobility'); }")
    pg.wait_for_timeout(150)
    check(len(errs) == n0 and pg.evaluate("state.mobilityLog.x === 1"), "6: bozuk mobilityLog kaydında Mobilite açılır, kayıt aynen durur %s" % errs[n0:])
    del errs[n0:]
    c.close()
    # görsel yüklenemezse: null, sayfa hatası yok
    c2 = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}, locale="tr-TR", service_workers="block")
    c2.add_init_script(TEST_INIT); c2.route("**/img/kas-harita.png", lambda rt: rt.fulfill(status=404, body="yok"))
    pg2 = c2.new_page(); pg2.on("pageerror", lambda e: errs.append(str(e))); pg2.goto(URL); boot(pg2)
    check(pg2.evaluate("paintMuscleMap({ 'Göğüs': 2 }, 'dark').then(x => x === null)"), "3: görsel yoksa null")
    c2.close()
    b.close()
finally:
    srv.terminate()

print("\n%d hata" % len(fails) + (" · sayfa hataları: %s" % errs if errs else ""))
sys.exit(1 if fails or errs else 0)
