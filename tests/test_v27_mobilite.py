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

# v28: "today" bugünün tarihi olmalı; sabit tarih ertesi gün "yeni gün" sayılıp tikleri sıfırlıyordu.
import datetime
TODAY = datetime.date.today().isoformat()
LEGACY = {"activeTab": "mobility", "today": TODAY, "mobilityRoutine": {
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
    b = p.chromium.launch(); ctx = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
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

    # ================= 3) HAREKET DETAYI =================
    seed(pg, LEGACY)
    def row(i): return pg.locator("#mobList [data-mob-row]").nth(i)
    def it_(i): return items(pg)[i]
    row(3).locator("[data-mob-open]").click(); pg.wait_for_timeout(80)
    check(pg.is_visible("#mobDetail") and pg.inner_text("#mobDtTitle").strip() == "Couch Stretch", "karta dokununca detay açılıyor")
    check(pg.inner_text("#mobDtCrumb") == "Kalça · 4. hareket", f"üst yazı ({pg.inner_text('#mobDtCrumb')})")
    pv = pg.inner_text("#mobDtPreview")
    check("sağ 40 sn → sol 40 sn" in pv and "2 tur" in pv and "≈ 3 dk" in pv, f"önizleme: sağ/sol, tur, toplam ({pv})")
    check(pg.is_visible("#mobDtStart") and pg.locator("#mobDtRx").count() == 0, "süreli harekette Sayacı başlat; eski yazım notu yok")
    pg.click('[data-mob-step="sets:1"]'); pg.wait_for_timeout(50)
    check(it_(3)["sets"] == 3 and pg.inner_text("#mobDtSets") == "3", "Set + → 3")
    for _ in range(2): pg.click('[data-mob-step="sets:-1"]'); pg.wait_for_timeout(30)
    check(it_(3)["sets"] == 1 and pg.is_disabled('[data-mob-step="sets:-1"]'), "Set en az 1, − düğmesi pasif")
    pg.click('[data-mob-step="val:-1"]'); pg.wait_for_timeout(50)
    check(it_(3)["sec"] == 35 and pg.inner_text("#mobDtVal") == "35", "Süre − → 35 sn (5'er)")
    pg.click('[data-mob-mode="reps"]'); pg.wait_for_timeout(50)
    check(it_(3)["mode"] == "reps" and pg.inner_text("#mobDtVal") == "10" and pg.locator("#mobDtStart").count() == 0, "Tekrar modunda tekrar sayısı, sayaç düğmesi yok")
    pg.click('[data-mob-step="val:1"]'); pg.wait_for_timeout(50)
    check(it_(3)["reps"] == 11, "Tekrar + → 11 (1'er)")
    pg.click('[data-mob-mode="time"]'); pg.wait_for_timeout(50)
    check(it_(3)["sec"] == 35 and pg.inner_text("#mobDtVal") == "35", "Süreye dönünce eski süre korunuyor")
    pg.click('[data-mob-sides="1"]'); pg.click('[data-mob-type="dynamic"]'); pg.wait_for_timeout(50)
    check(it_(3)["sides"] == 1 and it_(3)["type"] == "dynamic", "taraf ve tür değişiyor")
    pg.click('[data-mob-r1="spine"]'); pg.wait_for_timeout(40); pg.click('[data-mob-r2="hip"]'); pg.wait_for_timeout(40)
    check(it_(3)["region"] == "spine" and it_(3)["region2"] == "hip" and pg.locator('[data-mob-r2="spine"]').count() == 0, "ana + ikincil bölge; ikincilde ana bölge seçeneği yok")
    pg.click('[data-mob-r1="hip"]'); pg.wait_for_timeout(40)
    check(it_(3)["region"] == "hip" and it_(3)["region2"] == "", "ana bölge ikincille aynı olunca ikincil temizleniyor")
    pg.fill("#mobDtNote", "Kalçayı sık <b>"); pg.locator("#mobDtNote").blur(); pg.wait_for_timeout(60)
    check(it_(3)["note"] == "Kalçayı sık <b>", "not kaydediliyor")
    small = pg.evaluate(SMALL_JS, "#mobRoot button")
    check(not small, f"detayda düğmeler ≥ 44 px ({small})")
    check(ov(pg), "detayda yatay taşma yok")
    pg.evaluate("window.scrollTo(0, 0)"); pg.screenshot(path=SHOTS + "/v27_3_detay.png", full_page=True)
    pg.click("#mobDtTitle"); pg.wait_for_timeout(80)
    check(pg.is_visible("#uiDialog") and not pg.evaluate("document.getElementById('uiDialog').classList.contains('nd')"), "yeniden adlandırma temalı pencerede")
    pg.fill("#uiDlgInput", "Couch Stretch (duvar)"); pg.click("#uiDlgOk"); pg.wait_for_timeout(80)
    check(it_(3)["name"] == "Couch Stretch (duvar)", "ad değişti")
    pg.click("#mobDtBack"); pg.wait_for_timeout(60)
    check(pg.locator("#mobList").count() == 1, "Geri → liste")
    # Okunamayan eski yazı
    row(1).locator("[data-mob-open]").click(); pg.wait_for_timeout(60)
    check("birkaç kez" in pg.inner_text("#mobDtRx") and pg.inner_text("#mobDtCrumb") == "Bölgesiz · 2. hareket", "eski yazım gösteriliyor, bölgesiz")
    pg.click("#mobDtDone"); pg.wait_for_timeout(50)
    check(it_(1)["done"] is True, "tekrarlı harekette detaydan 'Yapıldı'")
    # Kaldır + Geri al
    pg.click("#mobDtRemove"); pg.wait_for_timeout(80)
    check(len(items(pg)) == 6 and pg.locator("#mobList").count() == 1, "Kaldır → listeye dönüyor, hareket silindi")
    pg.locator("#toastWrap button", has_text="Geri al").click(); pg.wait_for_timeout(100)
    check(len(items(pg)) == 7 and items(pg)[1]["name"] == "Kendi hareketim", "Geri al hareketi yerine getiriyor")
    row(3).locator("[data-mob-open]").click(); pg.wait_for_timeout(60)
    check(pg.locator("#mobDtNote").input_value() == "Kalçayı sık <b>" and pg.locator("#mobDetail b", has_text="sık").count() == 0, "kullanıcı notu kaçışlı (HTML olarak çizilmiyor)")
    pg.click("#mobDtBack"); pg.wait_for_timeout(40)

    # ================= 4) HAREKET EKLE =================
    seed(pg, LEGACY)
    pg.locator('[data-mob-region="hip"]').click(); pg.click("#mobAddBtn"); pg.wait_for_timeout(80)
    def libnames(): return [t.split("\n") for t in pg.locator("#mobAddList [data-mob-lib]").all_inner_texts()]
    groups = pg.locator("#mobAddList [data-mob-group]").all_inner_texts()
    check(pg.is_visible("#mobAdd") and groups[0] == "Kalça" and len(groups) == 6, f"ekleme ekranı; seçili bölge (Kalça) en üstte ({groups})")
    check(pg.locator("#mobAddList [data-mob-lib]").count() == 37, "kütüphanedeki 37 hareket")
    pg.click('[data-mob-filter="release"]'); pg.wait_for_timeout(50)
    check(pg.locator("#mobAddList [data-mob-lib]").count() == 5, "Foam roller süzgeci: 5 hareket")
    pg.click('[data-mob-filter="all"]'); pg.wait_for_timeout(50)
    pg.locator("#mobSearch").click(); pg.keyboard.type("couch"); pg.wait_for_timeout(80)
    rows = pg.locator("#mobAddList [data-mob-lib]").all_inner_texts()
    check(len(rows) == 1 and "Couch Stretch" in rows[0] and "Rutinde" in rows[0], f"arama: Couch Stretch, Rutinde etiketli ({rows})")
    check(pg.evaluate("document.activeElement && document.activeElement.id") == "mobSearch", "yazarken arama kutusu odakta kalıyor")
    pg.fill("#mobSearch", "omuz kapsülü"); pg.wait_for_timeout(80)
    check(pg.locator("#mobAddList [data-mob-lib]").count() >= 1, "notta geçen kelimeyle de bulunuyor")
    pg.fill("#mobSearch", "zzzz"); pg.wait_for_timeout(80)
    check(pg.locator("#mobAddList [data-mob-lib]").count() == 0 and "bulunamadı" in pg.inner_text("#mobAddList"), "sonuç yoksa bilgi yazısı")
    pg.fill("#mobSearch", ""); pg.wait_for_timeout(80)
    pg.locator('#mobAddList [data-mob-lib]', has_text="Shoulder CARs").locator("[data-mob-add]").click(); pg.wait_for_timeout(100)
    n = items(pg)[-1]
    check(len(items(pg)) == 8 and n["name"] == "Shoulder CARs (Ayakta Tam Daire)" and n["type"] == "dynamic" and n["region"] == "shoulder"
          and n["sides"] == 2 and n["mode"] == "reps" and n["reps"] == 5 and n["sets"] == 1 and n["note"] == "Omuz eklem sağlığı", f"kütüphaneden ekleme değerleri ({n})")
    check(pg.is_visible("#mobAdd") and "Rutinde" in pg.locator('#mobAddList [data-mob-lib]', has_text="Shoulder CARs").inner_text(), "ekledikten sonra ekran açık, Rutinde etiketi")
    small = pg.evaluate(SMALL_JS, "#mobRoot button")
    check(not small, f"ekle ekranında düğmeler ≥ 44 px ({small})")
    check(ov(pg), "ekle ekranında yatay taşma yok")
    pg.evaluate("window.scrollTo(0, 0)"); pg.screenshot(path=SHOTS + "/v27_4_ekle.png", full_page=True)
    pg.click("#mobAddCustom"); pg.wait_for_timeout(80)
    pg.fill("#uiDlgInput", "Kendi esnemem"); pg.click("#uiDlgOk"); pg.wait_for_timeout(100)
    n = items(pg)[-1]
    check(n["name"] == "Kendi esnemem" and n["type"] == "static" and n["region"] == "hip" and n["sets"] == 2 and n["mode"] == "time" and n["sec"] == 30,
          f"elle ekle: statik 2 × 30 sn, seçili bölge ({n})")
    check(pg.is_visible("#mobDetail") and pg.inner_text("#mobDtTitle").strip() == "Kendi esnemem", "elle eklenen hareketin detayı açılıyor")
    pg.click("#mobDtBack"); pg.click("#mobAddBtn"); pg.wait_for_timeout(50); pg.click("#mobAddClose"); pg.wait_for_timeout(50)
    check(pg.locator("#mobList").count() == 1, "Kapat → liste")

    # ================= 5) SAYAÇ =================
    seed(pg, LEGACY)
    def adv(ms): pg.evaluate("ms => { mobT.endAt -= ms; mobTimerTick(); }", ms); pg.wait_for_timeout(40)
    def sub(): return pg.inner_text("#mobTSub")
    def tm(): return pg.inner_text("#mobTTime")
    def boxes(): return pg.evaluate("[...document.querySelectorAll('#mobTRounds i')].map(e => e.textContent + (e.classList.contains('d') ? ':d' : e.classList.contains('n') ? ':n' : ''))")
    row(3).locator("[data-mob-timer]").click(); pg.wait_for_timeout(80)
    check(pg.is_visible("#mobTimer") and pg.inner_text("#mobTTitle") == "Couch Stretch", "kart üzerindeki düğme sayacı tek dokunuşla açıyor")
    check(sub() == "Sağ taraf · 1. tur / 2" and tm() == "0:40", f"ilk tur: sağ, 0:40 ({sub()} {tm()})")
    check(boxes() == ["Sağ 1:n", "Sol 1", "Sağ 2", "Sol 2"], f"tur kutuları ({boxes()})")
    check(pg.inner_text("#mobTRegion") == "Kalça" and pg.inner_text("#mobTBreath") in ("Nefes al", "Nefes ver"), "bölge adı ve nefes yazısı")
    small = pg.evaluate(SMALL_JS, "#mobTimer button")
    check(not small, f"sayaç düğmeleri ≥ 44 px ({small})")
    pg.screenshot(path=SHOTS + "/v27_5_sayac.png")
    pg.click("#mobTPlus"); pg.wait_for_timeout(40)
    check(tm() == "0:55", f"+15 ({tm()})")
    pg.click("#mobTMinus"); pg.wait_for_timeout(40)
    check(tm() == "0:40", f"−15 ({tm()})")
    adv(40000)
    check("Sola geç" in sub() and tm() == "0:05" and "pause" in pg.get_attribute("#mobTCircle", "class") and boxes()[0] == "Sağ 1:d", f"tur bitti → 5 sn ara, sola geç ({sub()} {tm()} {boxes()})")
    adv(5000)
    check(sub() == "Sol taraf · 1. tur / 2" and tm() == "0:40" and boxes()[1] == "Sol 1:n", f"ara bitince sıradaki tur kendiliğinden ({sub()})")
    pg.click("#mobTSkip"); pg.wait_for_timeout(40)
    check("Sağa geç" in sub(), f"Atla → ara ({sub()})")
    pg.click("#mobTSkip"); pg.wait_for_timeout(40)
    check(sub() == "Sağ taraf · 2. tur / 2", f"arada Atla → sonraki tur hemen ({sub()})")
    adv(40000); adv(5000)
    check(sub() == "Sol taraf · 2. tur / 2", "son tur")
    check(items(pg)[3]["done"] is False, "son tur bitmeden tiklenmiyor")
    adv(40000)
    check(not pg.is_visible("#mobTimer") and items(pg)[3]["done"] is True and pg.evaluate("mobT") is None, "son tur bitince sayaç kapanıyor, hareket tikleniyor")
    # Kapat: tiklemeden çıkar
    row(4).locator("[data-mob-timer]").click(); pg.wait_for_timeout(60)
    check(sub() == "Set 1 / 2" and boxes() == ["Set 1:n", "Set 2"], f"tek taraflı: Set kutuları ({boxes()})")
    pg.click("#mobTSound"); pg.wait_for_timeout(40)
    check(st(pg)["settings"]["mobSound"] is False and "aç" in pg.get_attribute("#mobTSound", "aria-label"), "ses kapatma kaydediliyor")
    pg.click("#mobTSound"); pg.wait_for_timeout(40)
    pg.click("#mobTClose"); pg.wait_for_timeout(60)
    check(not pg.is_visible("#mobTimer") and items(pg)[4]["done"] is False, "Kapat → sayaç kapanıyor, tiklenmiyor")
    # Arka plandan dönüş: kaçırılan tüm aşamalar tek seferde ilerliyor
    row(2).locator("[data-mob-open]").click(); pg.wait_for_timeout(60)
    pg.click("#mobDtStart"); pg.wait_for_timeout(60)
    check(pg.is_visible("#mobTimer") and tm() == "1:00", "detaydan Sayacı başlat")
    adv(10 * 60 * 1000)
    check(not pg.is_visible("#mobTimer") and items(pg)[2]["done"] is True, "uzun süre sonra dönünce hareket tamamlanmış")

    #__NEXT__

    check(not errs, f"sayfa hatası yok ({errs[:3]})")
    b.close()
finally:
    srv.terminate()
print(f"\n{len(fails)} hata" if fails else "\nHEPSİ GEÇTİ")
sys.exit(1 if fails else 0)
