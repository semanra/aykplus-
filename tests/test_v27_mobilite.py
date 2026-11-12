# v27: Mobilite yeniden tasarım — tek sıralı liste + bir kerelik göç, vücut bölgeleri (ana/ikincil),
# hareket detayı (set/tekrar/süre/taraf/tür/bölge), hareket ekle, nefes daireli sayaç, sessiz günlük kayıt.
import os, sys
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SHOTS = os.path.join(os.path.dirname(__file__), "shots")
os.makedirs(SHOTS, exist_ok=True)
import subprocess, time, json
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8777'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
def st(pg): return pg.evaluate("JSON.parse(localStorage.getItem('ayk_plus_v5_state'))")
def items(pg): return st(pg)["mobilityRoutine"]["items"]
def ov(pg):
    w = pg.evaluate("[document.documentElement.scrollWidth, document.documentElement.clientWidth]"); return w[0] <= w[1]
SMALL_JS = """(sel) => [...document.querySelectorAll(sel)]
  .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.width < 44 || r.height < 44); })
  .map(e => (e.textContent || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 30) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height))"""
URL = "http://localhost:8777/index.html"

LEGACY = {"activeTab": "mobility", "today": "2026-11-12", "mobilityRoutine": {
    "dynamic": [
        {"name": "World’s Greatest Stretch", "prescription": "1 Set x 8–10 Tekrar", "note": "Sağ ve sol akıcı geçiş", "done": True},
        {"name": "Kendi hareketim", "prescription": "birkaç kez", "note": "", "done": False},
        {"name": "Deep Squat Hold with Pry & Thoracic Reach", "prescription": "1 Set x 60 sn Akış"},
        "bozuk", {"prescription": "adsız"}],
    "static": [
        {"name": "Couch Stretch", "prescription": "Sağ ve Sol için 2'şer Set x 30 sn", "timerSec": 40, "note": "Diz minderde", "done": False},
        {"name": "Dead Hang (Barfikste Pasif Asılma)", "prescription": "2 Set x 30–45 sn"},
        {"name": "Thoracic Spine Foam Roll", "prescription": "1 Set x 60 sn"},
        {"name": "Kneeling Ankle Dorsiflexion", "prescription": "1 Set x 8-10 Tekrar (Her Ayak)"}]}}

def seed(pg, data):
    pg.goto(URL); pg.wait_for_timeout(200)
    pg.evaluate("s => localStorage.setItem('ayk_plus_v5_state', s)", json.dumps(data)); pg.reload(); pg.wait_for_timeout(300)

try:
  with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.getElementById('splash'); if(s) s.remove();})")
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))

    # ================= 1) GÖÇ =================
    seed(pg, LEGACY)
    s = st(pg); it = s["mobilityRoutine"]["items"]
    names = [x["name"] for x in it]
    check(names == ["World’s Greatest Stretch", "Kendi hareketim", "Deep Squat Hold with Pry & Thoracic Reach", "Couch Stretch",
                    "Dead Hang (Barfikste Pasif Asılma)", "Thoracic Spine Foam Roll", "Kneeling Ankle Dorsiflexion"],
          f"göç: önce dinamik sonra statik, bozuk/adsız kayıtlar atıldı ({names})")
    w = it[0]
    check(w["type"] == "dynamic" and w["mode"] == "reps" and w["reps"] == 10 and w["sets"] == 1 and w["sides"] == 1 and w["rxOk"] is True,
          f"WGS: 1 set × 10 tekrar (aralığın üstü) ({w})")
    check(w["region"] == "hip" and w["region2"] == "spine", "WGS: kütüphaneden Kalça + Omurga")
    check(w["done"] is True and w["note"] == "Sağ ve sol akıcı geçiş" and w["rx"] == "1 Set x 8–10 Tekrar", "WGS: tik, not, eski yazı korunuyor")
    k = it[1]
    check(k["rxOk"] is False and k["mode"] == "reps" and k["reps"] == 10 and k["region"] == "" and k["rx"] == "birkaç kez",
          f"okunamayan yazı: varsayılan + rxOk false + bölgesiz ({k})")
    d = it[2]
    check(d["type"] == "dynamic" and d["mode"] == "time" and d["sec"] == 60 and d["region"] == "hip" and d["region2"] == "ankle", f"Deep Squat: süreli dinamik 60 sn ({d})")
    c = it[3]
    check(c["type"] == "static" and c["sets"] == 2 and c["sides"] == 2 and c["mode"] == "time" and c["sec"] == 40 and c["note"] == "Diz minderde",
          f"Couch: 2 set, sağ/sol, elle ayarlı 40 sn korunuyor ({c})")
    h = it[4]
    check(h["sets"] == 2 and h["sec"] == 45 and h["sides"] == 1 and h["region"] == "shoulder", f"Dead Hang: 30–45 sn → 45 ({h})")
    check(it[5]["type"] == "release" and it[5]["region"] == "spine", "Foam roller kategorisindeki hareket release türünde")
    a = it[6]
    check(a["type"] == "static" and a["mode"] == "reps" and a["reps"] == 10 and a["sides"] == 2 and a["region"] == "ankle", f"Her Ayak → sağ/sol ({a})")
    check(len(set(x["id"] for x in it)) == 7, "her hareketin benzersiz kimliği var")
    check(len(s["mobilityRoutine"]["dynamic"]) == 5 and len(s["mobilityRoutine"]["static"]) == 4, "eski listeler yedek olarak duruyor")
    check(s.get("mobilityLog") == {}, "mobilityLog boş başlıyor")
    # İkinci açılış: yeniden göç yapılmaz, değerler aynı
    pg.reload(); pg.wait_for_timeout(250)
    check([x["id"] for x in items(pg)] == [x["id"] for x in it], "ikinci açılışta göç tekrarlanmıyor, kimlikler aynı")
    # Bozuk items temizleniyor
    bad = json.loads(json.dumps(LEGACY)); bad["mobilityRoutine"]["items"] = [None, {"name": "  "}, {"name": "X", "sets": "abc", "sec": 9999, "mode": "zzz", "region": "kafa", "sides": 5}]
    seed(pg, bad)
    bi = items(pg)
    check(len(bi) == 1 and bi[0]["sets"] == 1 and bi[0]["sec"] == 600 and bi[0]["mode"] == "time" and bi[0]["region"] == "" and bi[0]["sides"] == 1,
          f"bozuk items: boşlar atıldı, sayılar sınırlandı ({bi})")
    # Yeni kullanıcı: varsayılan rutin de yeni modelde
    pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(300)
    ni = items(pg)
    check(len(ni) == 10 and ni[0]["region"] == "hip" and ni[5]["type"] == "static", f"yeni kullanıcı: 10 hareket yeni modelde ({len(ni)})")
    # Gün arşivi: yapılanlar mobilityLog'a, tikler sıfırlanır
    old = json.loads(json.dumps(LEGACY)); old["today"] = "2026-01-05"
    seed(pg, old)
    s = st(pg)
    check(s["mobilityLog"].get("2026-01-05") == ["World’s Greatest Stretch"], f"gün geçişi: yapılan hareket kaydedildi ({s['mobilityLog']})")
    check(not any(x["done"] for x in s["mobilityRoutine"]["items"]), "gün geçişi: tikler sıfırlandı")
    nd = json.loads(json.dumps(LEGACY)); nd["today"] = "2026-01-06"
    for x in nd["mobilityRoutine"]["dynamic"]:
        if isinstance(x, dict): x["done"] = False
    seed(pg, nd)
    check("2026-01-06" not in st(pg)["mobilityLog"], "hiç hareket yapılmayan gün kaydedilmiyor")

    #__NEXT__

    check(not errs, f"sayfa hatası yok ({errs[:3]})")
    b.close()
finally:
    srv.terminate()
print(f"\n{len(fails)} hata" if fails else "\nHEPSİ GEÇTİ")
sys.exit(1 if fails else 0)
