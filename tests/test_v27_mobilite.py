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

    # ================= 2) ANA EKRAN =================
    seed(pg, LEGACY)
    def reg(key): return pg.locator(f'[data-mob-region="{key}"]')
    def lvl(key): return pg.evaluate(f"document.querySelector('[data-mob-region=\"{key}\"] [data-mob-lvl]').style.height")
    check("theme-mob" in (pg.get_attribute("body", "class") or ""), "Mobilite sekmesinde lavanta tema (body.theme-mob)")
    check("B3A6FF" in (pg.get_attribute("#navBtnMobility", "class") or ""), "alt menüde Mobilite lavanta")
    check(pg.locator("#mobilityHeaderBar").count() == 0 and pg.locator("#mobilityTargetType").count() == 0, "eski üst şerit ve tür seçimi kaldırıldı")
    check(reg("hip").inner_text().replace("\n", " ").upper().startswith("KALÇA") and "1 / 3" in reg("hip").inner_text(), f"Kalça: 1 / 3 ({reg('hip').inner_text()!r})")
    check(lvl("hip") == "33%", f"Kalça doluluk %33 ({lvl('hip')})")
    check("0 / 1" in reg("spine").inner_text() and lvl("spine") == "25%", f"Omurga: ikincil WGS yarım puan → %25 ({lvl('spine')})")
    check(lvl("chest") == "0%" and "—" in reg("chest").inner_text(), "Göğüs: hareket yok → —")
    check(pg.inner_text("#mobAllBtn") == "Tümü (1 / 7)", f"Tümü sayacı ({pg.inner_text('#mobAllBtn')})")
    check(pg.locator("#mobList [data-mob-row]").count() == 7, "Tümü: 7 hareket")
    check(pg.locator("#mobList [data-mob-timer]").count() == 4, "yalnızca süreli 4 harekette sayaç düğmesi")
    check(pg.locator("#mobList .drag-handle").count() == 7, "Tümü'nde sürükleme tutamacı")
    check("Sağ/sol · 2 set × 40 sn" in pg.locator("#mobList [data-mob-row]").nth(3).inner_text(), f"kartta özet ({pg.locator('#mobList [data-mob-row]').nth(3).inner_text()!r})")
    small = pg.evaluate(SMALL_JS, "#mobRoot button")
    check(not small, f"tüm düğmeler ≥ 44 px ({small})")
    check(ov(pg), "yatay taşma yok")
    pg.screenshot(path=SHOTS + "/v27_1_ana.png", full_page=True)
    # Bölgeye süz
    reg("hip").click(); pg.wait_for_timeout(80)
    rows = pg.locator("#mobList [data-mob-row]").all_inner_texts()
    check(len(rows) == 3 and "KALÇA" in pg.inner_text("#mobListTitle").upper(), f"Kalça süzüldü: 3 hareket ({len(rows)})")
    check(pg.locator("#mobList .drag-handle").count() == 0, "süzülmüş listede sürükleme yok")
    reg("spine").click(); pg.wait_for_timeout(80)
    rows = pg.locator("#mobList [data-mob-row]").all_inner_texts()
    check(len(rows) == 3 and "Thoracic Spine" in rows[0] and "ikincil" in rows[1].lower() and "ikincil" in rows[2].lower(), f"Omurga: ana önce, ikinciller etiketli sonda ({rows})")
    pg.screenshot(path=SHOTS + "/v27_2_bolge.png", full_page=True)
    reg("spine").click(); pg.wait_for_timeout(80)
    check(pg.locator("#mobList [data-mob-row]").count() == 7, "aynı bölgeye tekrar dokununca Tümü")
    reg("hip").click(); pg.click("#mobAllBtn"); pg.wait_for_timeout(80)
    check(pg.locator("#mobList [data-mob-row]").count() == 7, "Tümü düğmesi süzmeyi kaldırıyor")
    # Tik
    pg.locator("#mobList [data-mob-row]").nth(3).locator("[data-mob-check]").click(); pg.wait_for_timeout(80)
    check(items(pg)[3]["done"] is True and "2 / 3" in reg("hip").inner_text(), "tik → kayıt + Kalça 2 / 3")
    # Sıfırla + Geri al
    pg.click("#mobResetBtn"); pg.wait_for_timeout(80)
    check(not any(x["done"] for x in items(pg)), "Sıfırla tüm tikleri kaldırıyor")
    pg.locator("#toastWrap button", has_text="Geri al").click(); pg.wait_for_timeout(100)
    check(items(pg)[0]["done"] and items(pg)[3]["done"], "Geri al tikleri geri getiriyor")
    # Sürükle-bırak
    first = items(pg)[0]["id"]; pg.evaluate("window.scrollTo(0, 0)"); pg.wait_for_timeout(50)
    h = pg.locator('#mobList .drag-handle[data-mobidx="0"]').bounding_box(); t = pg.locator('#mobList [data-mob-row]').nth(2).bounding_box()
    x, y = h["x"] + h["width"] / 2, h["y"] + h["height"] / 2; ty = t["y"] + t["height"] / 2
    pg.mouse.move(x, y); pg.mouse.down()
    for i in range(1, 9): pg.mouse.move(x, y + (ty - y) * i / 8); pg.wait_for_timeout(16)
    pg.mouse.up(); pg.wait_for_timeout(150)
    check(items(pg)[2]["id"] == first, "sürükle-bırak sırayı değiştiriyor")

    #__NEXT__

    check(not errs, f"sayfa hatası yok ({errs[:3]})")
    b.close()
finally:
    srv.terminate()
print(f"\n{len(fails)} hata" if fails else "\nHEPSİ GEÇTİ")
sys.exit(1 if fails else 0)
