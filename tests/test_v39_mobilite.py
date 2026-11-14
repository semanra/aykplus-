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

    check(not errs, f"sayfa hatası yok ({errs[:3]})")
    b.close()
finally:
    srv.terminate()
print(f"\n{len(fails)} hata" if fails else "\nHEPSİ GEÇTİ")
sys.exit(1 if fails else 0)
