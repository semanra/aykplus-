# v40: antrenmanda isteğe bağlı ısınma kartı, isteğe bağlı sesli yönlendirme, v39 incelemesinden ertelenen noktalar.
import os, sys, json, subprocess, time, datetime
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SHOTS = os.path.join(os.path.dirname(__file__), "shots"); os.makedirs(SHOTS, exist_ok=True)
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8799'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
URL = "http://localhost:8799/index.html"
T = datetime.datetime.fromisoformat
def st(pg): return pg.evaluate("JSON.parse(localStorage.getItem('ayk_plus_v5_state'))")
def it(name, **kw):
    d = {"id": "i_" + name.replace(" ", "_"), "name": name, "type": "dynamic", "region": "hip", "region2": "", "sets": 1, "mode": "reps",
         "reps": 8, "sec": 30, "sides": 1, "note": "", "rx": "", "rxOk": True, "done": False}
    d.update(kw); return d
def base(**kw):
    d = {"activeTab": "mobility", "today": "2026-11-13", "settings": {"splash": False}, "mobilityRoutine": {"dynamic": [], "static": [], "routines": []}}
    d.update(kw); return d
SPEECH = """window.__said = []; window.__cancel = 0; try { Object.defineProperty(window, 'speechSynthesis', { value: { speak: u => window.__said.push(u.text), cancel: () => { window.__cancel++; }, getVoices: () => [] }, configurable: true }); } catch (e) {}"""

try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    def page(t0="2026-11-13T10:00:00"):
        ctx = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844})
        ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.getElementById('splash'); if(s) s.remove();})")
        ctx.add_init_script(SPEECH)
        pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.clock.install(time=T(t0)); pg.goto(URL); pg.wait_for_timeout(200)
        return ctx, pg
    def seed(pg, data):
        pg.evaluate("s => { localStorage.clear(); localStorage.setItem('ayk_plus_v5_state', s); }", json.dumps(data)); pg.reload(); pg.wait_for_timeout(350)
    def tick(pg, ms): pg.clock.run_for(ms); pg.wait_for_timeout(30)

    # ================= 1) ERTELENENLER =================
    ctx, pg = page()
    seed(pg, base(mobilityRoutine={"dynamic": [], "static": [], "routines": [
        {"id": "a", "name": "A", "items": [it("Couch Stretch", id="a1"), it("A2", id="a2")]},
        {"id": "a", "name": "Kopya kimlik", "items": [it("Couch Stretch", id="a1"), it("B2", id="b2")]}]},
        mobilityLog={"2026-11-12": ["Couch Stretch"], "2026-11-10": ["Couch Stretch"]}, mobilityRoutineLog={"2026-11-12": ["a"], "bozuk": 5}))
    rs = st(pg)["mobilityRoutine"]["routines"]
    ids = [r["id"] for r in rs]; iids = [x["id"] for r in rs for x in r["items"]]
    check(len(set(ids)) == 2 and len(set(iids)) == 4, f"yinelenen rutin/hareket kimlikleri ayrıştırıldı ({ids}, {iids})")
    check(st(pg).get("mobilityRoutineLog") == {"2026-11-12": ["a"]}, f"rutin günlüğü temizlendi ({st(pg).get('mobilityRoutineLog')})")
    pg.evaluate("switchTab('gym'); switchTab('mobility')"); pg.wait_for_timeout(100)
    ta = pg.inner_text('[data-mob-routine="a"]'); tb = pg.inner_text(f'[data-mob-routine="{ids[1]}"]')
    check("Dün yapıldı" in ta and "Dün" not in tb and "3 gün önce" in tb, f"rutin kartı rutin günlüğüne göre; eski gün ada göre ({ta[:40]!r} / {tb[:60]!r})")
    # Gün dönümü rutin günlüğünü yazar
    pg.evaluate("mobRoutines()[1].items[1].done = true; renderAll()")
    pg.clock.set_system_time(T("2026-11-14T09:00:00")); pg.evaluate("document.dispatchEvent(new Event('visibilitychange'))"); pg.wait_for_timeout(100)
    check(st(pg)["mobilityRoutineLog"].get("2026-11-13") == [ids[1]], f"gün dönümünde yapılan rutin kaydedildi ({st(pg)['mobilityRoutineLog']})")
    # Başlat çubuğu zemini
    pg.evaluate("mobOpenRoutine('a')"); pg.wait_for_timeout(80)
    bgi = pg.evaluate("getComputedStyle(document.querySelector('.m-startbar')).backgroundImage")
    check("gradient" in bgi, f"Başlat çubuğunun zemini var, kartlar arkadan görünmüyor ({bgi[:50]})")
    # Seans başlarken eski "Geri al" geçersiz
    pg.evaluate("snapshot(); offerUndo('Deneme')"); pg.click("[data-mob-start]"); pg.wait_for_timeout(60)
    pg.click("#mobTDone"); pg.wait_for_timeout(60)
    pg.evaluate("doUndo()"); pg.wait_for_timeout(60)
    check(st(pg)["mobilityRoutine"]["routines"][0]["items"][0]["done"] is True, "seanstan önceki Geri al seansın tikini geri almıyor")
    pg.evaluate("mobTimerClose()")
    ctx.close()

    # ================= 2) ISINMA KARTI =================
    ctx, pg = page()
    gym = base(activeTab="gym", workoutDays=[{"id": "d1", "name": "Bacak", "exercises": [
        {"name": "Squat", "kind": "weight", "muscle": "Ön Bacak", "sets": [{"kg": 100, "reps": 5, "done": False}]},
        {"name": "Leg Curl", "kind": "weight", "muscle": "Arka Bacak & Kalça", "sets": [{"kg": 40, "reps": 10, "done": False}]}]},
        {"id": "d2", "name": "Kol", "exercises": [{"name": "Curl", "kind": "weight", "muscle": "Biceps", "sets": [{"kg": 10, "reps": 10, "done": False}]}]}],
        mobilityRoutine={"dynamic": [], "static": [], "routines": [
            {"id": "s", "name": "Sabah", "items": [it("90/90 Hip Switch", id="h1"), it("Ankle Circles", id="h2", region="ankle"), it("Couch Stretch", id="h3", type="static", mode="time"),
                                                    it("Leg Swings", id="h4", region="hamstring"), it("Cat-Cow", id="h5", region="spine")]},
            {"id": "t", "name": "Akşam", "items": [it("90/90 Hip Switch", id="h6"), it("Hip Circles", id="h7"), it("Gate Openers", id="h8")]}]})
    seed(pg, gym)
    pg.evaluate("selectWorkoutDay(0)"); pg.wait_for_timeout(100)
    check(pg.is_visible("#gymWarmup"), "bacak gününde ısınma kartı görünüyor")
    wn = pg.evaluate("mobWarmupItems(activeDay()).map(i => i.name)")
    check(len(wn) == 4 and len(set(wn)) == 4 and "Couch Stretch" not in wn and "Cat-Cow" not in wn and wn[0] == "90/90 Hip Switch",
          f"yalnızca dinamik, ilgili bölgeler, en fazla 4, tekil ({wn})")
    wt = pg.inner_text("#gymWarmup")
    check("Isınma" in wt and "4 hareket" in wt and "90/90 Hip Switch" in wt, f"kart metni ({wt[:120]!r})")
    pg.click("#gymWarmupStart"); pg.wait_for_timeout(100)
    check(pg.is_visible("#mobTimer") and "Isınma · 1 / 4" in pg.inner_text("#mobTProg"), "Başlat → ısınma seansı")
    pg.click("#mobTDone"); pg.wait_for_timeout(60)
    check(st(pg)["mobilityRoutine"]["routines"][0]["items"][0]["done"] is True, "biten hareket kendi rutininde tiklendi")
    sh = pg.evaluate("getComputedStyle(document.querySelector('#mobTDone')).backgroundColor")
    check(sh not in ("rgba(0, 0, 0, 0)", ""), f"antrenman temasında seans düğmeleri renkli ({sh})")
    pg.screenshot(path=os.path.join(SHOTS, "v40_isinma_seans.png"))
    pg.click("#mobTClose"); pg.wait_for_timeout(100)
    check(pg.evaluate("state.activeTab") == "gym" and pg.is_visible("#gymWarmup"), "kapatınca antrenman sekmesinde kalınır")
    pg.evaluate("mobWarmupItems(activeDay()).forEach(i => { i.done = true; }); renderAll()"); pg.wait_for_timeout(60)
    check("Isınma yapıldı" in pg.inner_text("#gymWarmup") and pg.query_selector("#gymWarmupStart") is None, "hepsi yapıldıysa tek satır 'Isınma yapıldı'")
    pg.evaluate("mobAllItems().forEach(i => { i.done = false; }); renderAll()"); pg.wait_for_timeout(60)
    pg.screenshot(path=os.path.join(SHOTS, "v40_isinma_kart.png"))
    pg.click("#gymWarmupHide"); pg.wait_for_timeout(80)
    check(not pg.is_visible("#gymWarmup") and st(pg)["settings"]["warmupCard"] is False, "Gizle → kart yok, ayar kapalı")
    pg.locator("#toastWrap button", has_text="Geri al").click(); pg.wait_for_timeout(100)
    check(pg.is_visible("#gymWarmup"), "Gizle → Geri al")
    pg.evaluate("openProfile()"); pg.wait_for_timeout(100)
    check(pg.is_checked("#setWarmup"), "Profil'de ısınma kartı anahtarı açık")
    pg.uncheck("#setWarmup"); pg.click("#profileSave"); pg.wait_for_timeout(150)
    check(st(pg)["settings"]["warmupCard"] is False, "Profil'den kapatıldı")
    pg.evaluate("hideProfile && hideProfile(); state.settings.warmupCard = true; renderAll()"); pg.wait_for_timeout(80)
    pg.evaluate("selectWorkoutDay(1)"); pg.wait_for_timeout(80)
    check(not pg.is_visible("#gymWarmup"), "kol gününde (rutinde omuz hareketi yok) kart yok")
    pg.evaluate("selectWorkoutDay(0); startWorkout()"); pg.wait_for_timeout(100)
    check(pg.query_selector("#gymWarmup") is None, "antrenman sürerken kart yok")
    ctx.close()

    # ================= 3) SESLİ YÖNLENDİRME =================
    ctx, pg = page()
    seed(pg, base(mobilityRoutine={"dynamic": [], "static": [], "routines": [{"id": "s", "name": "Sabah", "items": [
        it("World’s Greatest Stretch", id="v1", sides=2, reps=10), it("Couch Stretch", id="v2", type="static", mode="time", sec=30, sets=1, sides=2)]}]}))
    said = lambda: pg.evaluate("window.__said.slice()")
    check(pg.evaluate("state.settings.mobVoice") is False, "sesli yönlendirme varsayılan kapalı")
    pg.evaluate("mobOpenRoutine('s')"); pg.click("[data-mob-start]"); pg.wait_for_timeout(60)
    pg.click("#mobTDone"); pg.wait_for_timeout(60)
    check(said() == [], f"kapalıyken hiç konuşmuyor ({said()})")
    pg.click("#mobTClose"); pg.wait_for_timeout(60)
    pg.evaluate("mobRoutines()[0].items.forEach(i => { i.done = false; }); renderAll()")
    pg.click("[data-mob-start]"); pg.wait_for_timeout(60)
    pg.click("#mobTVoice"); pg.wait_for_timeout(60)
    check(st(pg)["settings"]["mobVoice"] is True and pg.get_attribute("#mobTVoice", "aria-pressed") == "true", "seans ekranından açıldı (kaydedildi)")
    s0 = " | ".join(said())
    check("World’s Greatest Stretch" in s0 and "10 tekrar" in s0 and "sağ taraf" in s0.lower(), f"açınca hareket anons edildi ({s0})")
    pg.click("#mobTDone"); pg.wait_for_timeout(60)
    check("sol taraf" in " | ".join(said()).lower(), "taraf değişince söylüyor")
    pg.click("#mobTDone"); pg.wait_for_timeout(60)
    s1 = " | ".join(said())
    check("Couch Stretch" in s1 and "30 saniye" in s1, f"sıradaki süreli hareket anons edildi ({s1[-80:]})")
    tick(pg, 5300); check("Başla" in said(), "hazırlık bitince 'Başla'")
    tick(pg, 20000); check("Son 10 saniye" in said(), "son 10 saniye")
    tick(pg, 10000); check(any("Sola geç" in x for x in said()), "ara: 'Sola geç'")
    tick(pg, 5000); tick(pg, 30000)
    check(pg.is_visible("#mobTFin") and any("bitti" in x.lower() for x in said()[-2:]), f"seans sonu anonsu ({said()[-2:]})")
    pg.click("#mobTFinOk"); pg.wait_for_timeout(60)
    pg.click("[data-mob-start]"); pg.wait_for_timeout(60); c0 = pg.evaluate("window.__cancel")
    pg.click("#mobTClose"); pg.wait_for_timeout(60)
    check(pg.evaluate("window.__cancel") > c0, "seans kapatılınca konuşma susuyor")
    pg.evaluate("openProfile()"); pg.wait_for_timeout(100)
    check(pg.is_checked("#setMobVoice"), "Profil'de sesli yönlendirme anahtarı ayarla aynı")
    pg.uncheck("#setMobVoice"); pg.click("#profileSave"); pg.wait_for_timeout(150)
    check(st(pg)["settings"]["mobVoice"] is False, "Profil'den kapatıldı")
    # Eski kayıt: yeni ayarlar yok → varsayılanlar
    seed(pg, {"settings": {"splash": False}, "mobilityRoutine": {"dynamic": [], "static": [], "items": []}})
    s = st(pg)["settings"]
    check(s.get("mobVoice") is False and s.get("warmupCard") is True, f"eski kayıtta varsayılanlar ({s.get('mobVoice')}, {s.get('warmupCard')})")
    ctx.close()

    check(not errs, f"sayfa hatası yok ({errs[:3]})")
    b.close()
finally:
    srv.terminate()
print(f"\n{len(fails)} hata" if fails else "\nHEPSİ GEÇTİ")
sys.exit(1 if fails else 0)
