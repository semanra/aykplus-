# v39: Mobilite — birden fazla rutin (eski tek liste bir kez "Rutinim"e taşınır), nasıl yapılır, ana ekran,
# rutinin içi + Düzenle, rehberli seans (her zaman baştan) + bitiş ekranı.
import os, sys, json, subprocess, time, datetime
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SHOTS = os.path.join(os.path.dirname(__file__), "shots"); os.makedirs(SHOTS, exist_ok=True)
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8798'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
URL = "http://localhost:8798/index.html"
def st(pg): return pg.evaluate("JSON.parse(localStorage.getItem('ayk_plus_v5_state'))")
def mr(pg): return st(pg)["mobilityRoutine"]
TODAY = datetime.date.today().isoformat()
def it(name, **kw):
    d = {"id": "i_" + name.replace(" ", "_"), "name": name, "type": "dynamic", "region": "hip", "region2": "", "sets": 1, "mode": "reps",
         "reps": 8, "sec": 30, "sides": 1, "note": "", "rx": "", "rxOk": True, "done": False}
    d.update(kw); return d
V38 = {"activeTab": "mobility", "today": TODAY, "settings": {"splash": False}, "mobilityRoutine": {
    "dynamic": [{"name": "Eski dinamik", "prescription": "1 Set x 8 Tekrar"}], "static": [],
    "items": [it("World’s Greatest Stretch", done=True), it("Couch Stretch", type="static", mode="time", sides=2, sets=2), it("Kendi hareketim", region="")]}}
PRE27 = {"activeTab": "mobility", "today": TODAY, "settings": {"splash": False}, "mobilityRoutine": {
    "dynamic": [{"name": "D%d" % i, "prescription": "1 Set x 8 Tekrar"} for i in range(5)],
    "static": [{"name": "S%d" % i, "prescription": "2 Set x 30 sn", "timerSec": 30} for i in range(4)]}}

def seed(pg, data):
    pg.goto(URL); pg.wait_for_timeout(200)
    pg.evaluate("s => { localStorage.clear(); localStorage.setItem('ayk_plus_v5_state', s); }", json.dumps(data)); pg.reload(); pg.wait_for_timeout(350)

try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844})
    ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.getElementById('splash'); if(s) s.remove();})")
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))

    # ================= 1) VERİ: RUTİNLER VE GÖÇ =================
    seed(pg, V38); m = mr(pg)
    r = m.get("routines") or []
    check(len(r) == 1 and r[0]["id"] == "mr_main" and r[0]["name"] == "Rutinim", f"v38 kaydı tek 'Rutinim' rutinine taşındı ({[(x.get('id'), x.get('name')) for x in r]})")
    check(r and [x["name"] for x in r[0]["items"]] == ["World’s Greatest Stretch", "Couch Stretch", "Kendi hareketim"] and r[0]["items"][0]["done"], "hareketler aynı sırada, tik korundu")
    check("items" not in m and m["dynamic"] == V38["mobilityRoutine"]["dynamic"], "eski 'items' kopyası silindi, eski dynamic/static dokunulmadı")
    pg.reload(); pg.wait_for_timeout(300); r2 = mr(pg)["routines"]
    check(len(r2) == 1 and len(r2[0]["items"]) == 3, "ikinci açılışta tekrar göç yok (hareket çiftlenmedi)")

    seed(pg, PRE27); r = mr(pg)["routines"]
    check(len(r) == 1 and len(r[0]["items"]) == 9, f"v27 öncesi kayıt: 9 hareket tek rutinde ({len(r[0]['items']) if r else 0})")

    bad = json.loads(json.dumps(V38)); del bad["mobilityRoutine"]["items"]
    bad["mobilityRoutine"]["routines"] = [None, {"name": 5, "items": "x"}, {"id": "a", "name": "<b>x</b>", "items": [None, {"name": "Y"}]}]
    seed(pg, bad); r = mr(pg)["routines"]
    check(len(r) == 2 and r[0]["name"] == "5" and r[0]["items"] == [] and r[1]["name"] == "<b>x</b>" and [x["name"] for x in r[1]["items"]] == ["Y"],
          f"bozuk rutinler temizlendi ({[(x['name'], len(x['items'])) for x in r]})")
    check(mr(pg)["dynamic"] == bad["mobilityRoutine"]["dynamic"] and sum(len(x["items"]) for x in r) == 1, "rutinler varken eski diziler yeniden çevrilmedi")

    two = json.loads(json.dumps(V38)); del two["mobilityRoutine"]["items"]; two["today"] = "2026-01-05"
    two["mobilityRoutine"]["routines"] = [{"id": "a", "name": "A", "items": [it("Couch Stretch", done=True), it("X1")]},
                                          {"id": "b", "name": "B", "items": [it("Couch Stretch", id="c2", done=True), it("X2", done=True)]}]
    seed(pg, two); s = st(pg)
    check(sorted(s["mobilityLog"].get("2026-01-05", [])) == ["Couch Stretch", "X2"], f"gün geçişi: iki rutinin yapılanları tekil kaydedildi ({s['mobilityLog']})")
    check(not any(x["done"] for rr in s["mobilityRoutine"]["routines"] for x in rr["items"]), "gün geçişi: bütün rutinlerde tikler sıfırlandı")

    empty = json.loads(json.dumps(V38)); del empty["mobilityRoutine"]["items"]; empty["mobilityRoutine"]["routines"] = []; empty["today"] = "2026-01-05"
    seed(pg, empty)
    pg.evaluate("switchTab('progress'); switchTab('mobility'); switchTab('gym'); setGymView('library'); switchTab('mobility')"); pg.wait_for_timeout(200)
    check(mr(pg)["routines"] == [], "bütün rutinler silinmişken açılış/gün geçişi/sekmeler çalışıyor")

    pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(300); r = mr(pg)["routines"]
    check(len(r) == 1 and r[0]["name"] == "Rutinim" and len(r[0]["items"]) == 10, "yeni kullanıcı: varsayılan 10 hareket 'Rutinim' içinde")

    # ================= 2) NASIL YAPILIR =================
    seed(pg, V38)
    g = pg.evaluate("""(() => { const names = Object.values(MOBILITY_LIBRARY).flat().map(m => m.name);
      const bad = names.filter(n => { const x = typeof mobGuide === 'function' && mobGuide(n); return !x || x.steps.length < 3 || x.steps.length > 4 || !x.warn; });
      return { n: names.length, bad }; })()""")
    check(g["n"] >= 37 and not g["bad"], f"kütüphanedeki her harekette 3–4 adım + dikkat notu ({g['n']} hareket, eksik: {g['bad'][:5]})")
    check(pg.evaluate("!!(typeof mobGuide === 'function' && mobGuide('Worlds Greatest Stretch'))"), "kesme işareti farkı yok sayılıyor")
    pg.evaluate("mobOpen(mobRoutines()[0].items[1].id)"); pg.wait_for_timeout(150)
    check(pg.is_visible("#mobDtGuide") and "Dikkat" in pg.inner_text("#mobDtGuide"), "detay sayfasında 'Nasıl yapılır' görünüyor")
    pg.evaluate("mobOpen(mobRoutines()[0].items[2].id)"); pg.wait_for_timeout(150)
    check(pg.query_selector("#mobDtGuide") is None, "elle eklenmiş harekette kılavuz yok")

    # ================= 3) ANA EKRAN =================
    ctx3 = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844})
    ctx3.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.getElementById('splash'); if(s) s.remove();})")
    p3 = ctx3.new_page(); p3.on("pageerror", lambda e: errs.append(str(e)))
    p3.clock.install(time=datetime.datetime.fromisoformat("2026-11-13T10:00:00"))   # Cuma
    home = {"activeTab": "mobility", "today": "2026-11-13", "settings": {"splash": False},
            "mobilityLog": {"2026-11-04": ["Kneeling Ankle Dorsiflexion"], "2026-11-09": ["Couch Stretch"], "2026-11-11": ["Couch Stretch"], "2026-11-12": ["X2"]},
            "mobilityRoutine": {"dynamic": [], "static": [], "routines": [
                {"id": "a", "name": "<b>A</b>", "items": [it("Couch Stretch", done=True), it("Leg Swings", region="hamstring"), it("Kneeling Ankle Dorsiflexion", region="ankle", mode="time", sec=30, sets=2, sides=2)]},
                {"id": "e", "name": "Boş", "items": []}]}}
    seed(p3, home); p3.evaluate("switchTab('mobility')"); p3.wait_for_timeout(150)
    w = p3.evaluate("mobWeekStats()")
    check(w["days"] == [True, False, True, True, True, False, False] and w["count"] == 4 and w["streak"] == 3, f"bu hafta: Pt Ça Pe Cu, 4 gün, seri 3 ({w})")
    p3.evaluate("mobRoutines()[0].items[0].done = false; renderAll()")
    w = p3.evaluate("mobWeekStats()")
    check(w["count"] == 3 and w["streak"] == 2, f"bugün yapılmadıysa seri dünden sayılır ({w})")
    p3.evaluate("mobRoutines()[0].items[0].done = true; renderAll()")
    check(p3.evaluate("mobUI.view") == "home" and p3.is_visible("#mobHome"), "mobilite ana ekranla açılıyor")
    cards = p3.query_selector_all("[data-mob-routine]")
    check(len(cards) == 2, f"her rutin için bir kart ({len(cards)})")
    t0 = cards[0].inner_text() if cards else ""
    check("<b>a</b>" in t0.lower() and "3 hareket" in t0 and "dk" in t0 and "Bugün yapıldı" in t0, f"kart: ad kaçışlı, hareket sayısı, süre, son yapılma ({t0[:80]!r})")
    check(p3.query_selector('[data-mob-routine="a"] [data-mob-start]') is not None and p3.query_selector('[data-mob-routine="e"] [data-mob-start]') is None, "boş rutinde Başlat yok")
    rg = p3.evaluate("mobRegionLast()")
    check(rg.get("hip") == 0 and rg.get("ankle") == 9 and rg.get("shoulder") is None, f"bölgeler son çalışma ({rg})")
    ank = p3.inner_text('[data-mob-reg="ankle"]'); hip = p3.inner_text('[data-mob-reg="hip"]'); sh = p3.inner_text('[data-mob-reg="shoulder"]')
    check("9 gündür yok" in ank and "warn" in (p3.get_attribute('[data-mob-reg="ankle"]', "class") or "") and "Bugün" in hip and "Henüz yok" in sh,
          f"bölge kutuları ({ank!r}, {hip!r}, {sh!r})")
    small = p3.evaluate("""[...document.querySelectorAll('#mobHome button')].filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.width < 44 || r.height < 44); }).length""")
    check(small == 0, f"ana ekrandaki düğmeler ≥ 44 px ({small})")
    p3.click("#mobNewRoutine"); p3.wait_for_timeout(150); p3.fill("#uiDlgInput", "Akşam"); p3.click("#uiDlgOk"); p3.wait_for_timeout(200)
    rs = mr(p3)["routines"]
    check(len(rs) == 3 and rs[-1]["name"] == "Akşam" and rs[-1]["items"] == [] and p3.evaluate("mobUI.view === 'routine' && mobUI.edit && mobUI.rid") == rs[-1]["id"],
          "Yeni rutin: ad soruldu, boş rutin açıldı, Düzenle açık")
    p3.evaluate("switchTab('gym'); switchTab('mobility')"); p3.wait_for_timeout(100)
    check(p3.evaluate("mobUI.view") == "home", "sekmeye dönünce ana ekran")
    p3.screenshot(path=os.path.join(SHOTS, "v39_ana.png"), full_page=True)
    ctx3.close()

    # ================= 4) RUTİNİN İÇİ + DÜZENLE =================
    dialogs = []; pg.on("dialog", lambda d: (dialogs.append(d.message), d.dismiss()))
    four = json.loads(json.dumps(V38)); del four["mobilityRoutine"]["items"]
    four["mobilityRoutine"]["routines"] = [{"id": "mr_main", "name": "Sabah", "items": [it("A1", done=True), it("A2", mode="time", sec=45, sides=2, sets=2), it("A3")]},
                                           {"id": "b", "name": "B", "items": [it("B1")]}]
    seed(pg, four)
    def names(i=0): return [x["name"] for x in mr(pg)["routines"][i]["items"]]
    pg.click('[data-mob-routine="mr_main"] [data-mob-openr]'); pg.wait_for_timeout(120)
    check(pg.is_visible("#mobRoutine") and pg.locator("#mobRoutine [data-mob-row]").count() == 3, "Aç → rutinin içi, 3 hareket")
    eb = pg.locator("#mobEditBtn").bounding_box()
    check(eb and eb["height"] >= 44 and eb["width"] >= 44, "Düzenle düğmesi görünür ve ≥ 44 px")
    stx = pg.inner_text("#mobRoutine [data-mob-start]")
    check("Başlat" in stx and "3 hareket" in stx and "dk" in stx, f"altta Başlat · 3 hareket · ~dk ({stx!r})")
    check(pg.locator("#mobRoutine .drag-handle").count() == 0 and pg.locator("#mobRoutine [data-mob-del]").count() == 0, "Düzenle kapalıyken tutamaç/çöp yok")
    pg.locator("#mobRoutine [data-mob-row]").nth(2).locator("[data-mob-check]").click(); pg.wait_for_timeout(80)
    check(mr(pg)["routines"][0]["items"][2]["done"], "rutinin içinde tik çalışıyor")
    pg.locator("#mobRoutine [data-mob-row]").nth(1).locator("[data-mob-open]").click(); pg.wait_for_timeout(80)
    check(pg.is_visible("#mobDetail"), "satıra dokununca detay"); pg.click("#mobDtBack"); pg.wait_for_timeout(80)
    check(pg.is_visible("#mobRoutine"), "detaydan geri → rutinin içi")
    # Düzenle
    pg.click("#mobEditBtn"); pg.wait_for_timeout(80)
    check(pg.evaluate("mobUI.edit") and pg.locator("#mobRoutine .drag-handle").count() == 3 and pg.locator("#mobRoutine [data-mob-del]").count() == 3, "Düzenle: tutamaç + çöp")
    XSS = "<img src=x onerror=alert(1)>"
    pg.fill("#mobRName", XSS); pg.press("#mobRName", "Enter"); pg.locator("#mobRName").blur(); pg.wait_for_timeout(120)
    check(mr(pg)["routines"][0]["name"] == XSS, "rutin adı değişti")
    pg.locator("#mobRoutine [data-mob-del]").nth(1).click(); pg.wait_for_timeout(80)
    check(names() == ["A1", "A3"], f"çöp: hareket silindi ({names()})")
    pg.locator("#toastWrap button", has_text="Geri al").click(); pg.wait_for_timeout(100)
    check(names() == ["A1", "A2", "A3"] and pg.evaluate("mobUI.view === 'routine'"), "Geri al: yerine geldi")
    if not pg.evaluate("mobUI.edit"): pg.click("#mobEditBtn"); pg.wait_for_timeout(80)
    pg.evaluate("window.scrollTo(0, 0)"); pg.wait_for_timeout(50)
    h = pg.locator('#mobRoutine .drag-handle[data-mobidx="0"]').bounding_box(); t = pg.locator('#mobRoutine [data-mob-row]').nth(2).bounding_box()
    x, y = h["x"] + h["width"] / 2, h["y"] + h["height"] / 2; ty = t["y"] + t["height"] / 2
    pg.mouse.move(x, y); pg.mouse.down()
    for i in range(1, 9): pg.mouse.move(x, y + (ty - y) * i / 8); pg.wait_for_timeout(16)
    pg.mouse.up(); pg.wait_for_timeout(150)
    check(names() == ["A2", "A3", "A1"], f"Düzenle'de sürükle-bırak ({names()})")
    pg.click("#mobEditDone"); pg.wait_for_timeout(80)
    check(not pg.evaluate("mobUI.edit") and pg.evaluate("document.getElementById('mobListTitle').textContent") == XSS and not dialogs, "Bitti: ad düz metin olarak görünüyor, betik çalışmadı")
    # Hareket ekle → açık rutine
    pg.click("#mobEditBtn"); pg.click("#mobAddBtn"); pg.wait_for_timeout(80)
    pg.locator('[data-mob-lib] [data-mob-add]').first.click(); pg.wait_for_timeout(120)
    check(len(names(0)) == 4 and names(1) == ["B1"], "hareket açık rutine eklendi, diğer rutin değişmedi")
    pg.click("#mobAddClose"); pg.wait_for_timeout(80)
    check(pg.is_visible("#mobRoutine") and pg.evaluate("mobUI.edit"), "ekle ekranından Düzenle'ye dönüldü")
    # Kopyala
    pg.click("#mobCopyRoutine"); pg.wait_for_timeout(120)
    rs = mr(pg)["routines"]; cp = rs[1] if len(rs) == 3 else {"name": "", "items": []}
    check(len(rs) == 3 and cp["name"].endswith("(kopya)") and len(cp["items"]) == 4 and not any(x["done"] for x in cp["items"])
          and not set(x["id"] for x in cp["items"]) & set(x["id"] for x in rs[0]["items"]), "Kopyala: aslının altında, tiksiz, yeni kimlikli kopya")
    # Rutini sil + Geri al
    pg.evaluate("mobOpenRoutine('b'); mobEdit(true)"); pg.wait_for_timeout(80)
    pg.click("#mobDeleteRoutine"); pg.wait_for_timeout(120); pg.click("#uiDlgOk"); pg.wait_for_timeout(150)
    check([r["id"] for r in mr(pg)["routines"]].count("b") == 0 and pg.evaluate("mobUI.view") == "home", "Rutini sil: onaydan sonra silindi, ana ekrana dönüldü")
    pg.locator("#toastWrap button", has_text="Geri al").click(); pg.wait_for_timeout(120)
    check(any(r["id"] == "b" and r["items"][0]["name"] == "B1" for r in mr(pg)["routines"]), "Rutini sil → Geri al")
    pg.evaluate("mobOpenRoutine('mr_main')"); pg.wait_for_timeout(80)
    pg.click("#mobBackBtn"); pg.wait_for_timeout(80)
    check(pg.evaluate("mobUI.view") == "home", "rutinden geri → ana ekran")
    pg.evaluate("mobOpenRoutine('mr_main'); mobEdit(true)"); pg.wait_for_timeout(80)
    pg.screenshot(path=os.path.join(SHOTS, "v39_duzenle.png"), full_page=True)
    pg.evaluate("mobEdit(false)"); pg.wait_for_timeout(80)
    pg.screenshot(path=os.path.join(SHOTS, "v39_rutin.png"), full_page=True)

    # ================= 5) SEANS (BAŞLAT) + BİTİŞ =================
    ctx5 = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844})
    ctx5.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.getElementById('splash'); if(s) s.remove();})")
    p5 = ctx5.new_page(); p5.on("pageerror", lambda e: errs.append(str(e)))
    p5.clock.install(time=datetime.datetime.fromisoformat("2026-11-13T10:00:00"))
    five = {"activeTab": "mobility", "today": "2026-11-13", "settings": {"splash": False},
            "mobilityRoutine": {"dynamic": [], "static": [], "routines": [{"id": "s", "name": "Sabah", "items": [
                it("World’s Greatest Stretch", id="r1", sides=2, done=True),
                it("Couch Stretch", id="r2", type="static", mode="time", sec=30, sets=2),
                it("R3", id="r3", reps=12)]}]}}
    seed(p5, five)
    def S(): return [x["done"] for x in mr(p5)["routines"][0]["items"]]
    def prog(): return p5.inner_text("#mobTProg")
    def sub(): return p5.inner_text("#mobTSub").lower()
    def tick(ms): p5.clock.run_for(ms); p5.wait_for_timeout(30)
    p5.evaluate("mobOpenRoutine('s')"); p5.click("[data-mob-start]"); p5.wait_for_timeout(100)
    check(p5.is_visible("#mobTimer") and "1 / 3" in prog() and "sabah" in prog().lower(), f"Başlat: tikli ilk hareketten (1 / 3) başlıyor ({prog()!r})")
    check(p5.inner_text("#mobTReps").strip() == "8" and "sağ" in sub(), f"tekrarlı: 8 tekrar, sağ taraf ({sub()!r})")
    p5.click("#mobTDone"); p5.wait_for_timeout(60)
    check("sol" in sub() and "1 / 3" in prog(), "Bitti → sol taraf")
    p5.click("#mobTDone"); p5.wait_for_timeout(60)
    check("2 / 3" in prog() and "hazırlan" in sub(), f"sıradaki süreli hareket önce 5 sn hazırlık ({sub()!r})")
    check(p5.is_visible("#mobTGuide") and "Dikkat" in p5.inner_text("#mobTGuide"), "seansta nasıl yapılır görünüyor")
    tick(5300); check("set 1" in sub() and p5.inner_text("#mobTTime").strip() in ("0:30", "0:29"), f"hazırlıktan sonra 1. set ({sub()!r})")
    tick(30000); check("2" in sub() and ("geç" in sub() or "sıradaki" in sub()), f"1. set bitti → ara ({sub()!r})")
    tick(5000); check("set 2" in sub(), f"2. set ({sub()!r})")
    tick(30000); check("3 / 3" in prog() and S()[1] is True, f"süreli hareket bitince tiklendi, 3. harekete geçti ({S()})")
    p5.click("#mobTPrev"); p5.wait_for_timeout(60)
    check("2 / 3" in prog() and "hazırlan" in sub(), "Önceki → bir önceki hareketin başı")
    p5.click("#mobTSkip"); p5.wait_for_timeout(60)
    check("3 / 3" in prog() and S()[1] is True, "Atla → sonraki hareket, tik durumu değişmedi")
    p5.click("#mobTClose"); p5.wait_for_timeout(80)
    check(not p5.is_visible("#mobTimer") and S() == [True, True, False], f"yarıda kapat: yapılanlar kayıtlı, kalan tiksiz ({S()})")
    # Baştan sona, bir hareket atlanarak → bitiş ekranı
    p5.evaluate("mobRoutines()[0].items.forEach(i => { i.done = false; }); renderAll()")
    p5.click("[data-mob-start]"); p5.wait_for_timeout(80)
    p5.click("#mobTDone"); p5.click("#mobTDone"); p5.wait_for_timeout(50)
    p5.click("#mobTGuideBtn"); p5.wait_for_timeout(50)
    check(p5.locator("#mobTGuide ol").count() == 0, "nasıl yapılır kapatılabiliyor")
    p5.click("#mobTSkip"); p5.wait_for_timeout(50)
    p5.click("#mobTDone"); p5.wait_for_timeout(100)
    fin = p5.inner_text("#mobTFin") if p5.query_selector("#mobTFin") else ""
    check(p5.is_visible("#mobTFin") and "SABAH" in fin.upper() and "atlandı" in fin.lower(), f"bitiş ekranı ({fin[:120]!r})")
    nums = p5.evaluate("[...document.querySelectorAll('#mobTFin [data-fin]')].map(e => e.dataset.fin + '=' + e.textContent.trim())")
    check("hareket=2" in nums and "atlandi=1" in nums, f"bitiş: 2 hareket, 1 atlandı ({nums})")
    check(S() == [True, False, True], f"atlanan tiklenmedi ({S()})")
    small = p5.evaluate("""[...document.querySelectorAll('#mobTimer button')].filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.width < 44 || r.height < 44); }).length""")
    check(small == 0, f"seans/bitiş düğmeleri ≥ 44 px ({small})")
    p5.screenshot(path=os.path.join(SHOTS, "v39_bitis.png"))
    p5.click("#mobTFinOk"); p5.wait_for_timeout(80)
    check(not p5.is_visible("#mobTimer") and p5.evaluate("mobUI.view") == "routine", "Tamam → rutinin içi")
    # Uygulama arka plandayken süre işler (bitiş saatine göre)
    p5.evaluate("mobRoutines()[0].items.forEach(i => { i.done = false; }); renderAll()")
    p5.click("[data-mob-start]"); p5.click("#mobTDone"); p5.click("#mobTDone"); p5.wait_for_timeout(50)
    check(p5.locator("#mobTGuide ol").count() == 1, "yeni seansta nasıl yapılır yine açık")
    p5.screenshot(path=os.path.join(SHOTS, "v39_seans_sure.png"))
    p5.evaluate("clearInterval(mobT.iv)"); tick(71000)
    p5.evaluate("document.dispatchEvent(new Event('visibilitychange'))"); p5.wait_for_timeout(60)
    check("3 / 3" in prog() and S()[1] is True, f"arka plandan dönünce kaçırılan süre işlendi ({prog()!r}, {S()})")
    p5.screenshot(path=os.path.join(SHOTS, "v39_seans_tekrar.png"))
    p5.click("#mobTClose")
    ctx5.close()

    check(not errs, f"sayfa hatası yok ({errs[:3]})")
    b.close()
finally:
    srv.terminate()
print(f"\n{len(fails)} hata" if fails else "\nHEPSİ GEÇTİ")
sys.exit(1 if fails else 0)
