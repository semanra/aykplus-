# v42: Profil otomatik kayıt ("Kaydet" düğmesi yok) + veri sürümü (eski biçim çevirileri tek zincirde, bir kez).
import os, sys, json, subprocess, time, datetime
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8801'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
URL = "http://localhost:8801/index.html"
KEY = "ayk_plus_v5_state"
def st(pg): return pg.evaluate("aykStoredState()")

try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    def page():
        ctx = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844})
        ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.getElementById('splash'); if(s) s.remove();})")
        pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(URL); pg.wait_for_function("window.aykBooted === true"); pg.wait_for_timeout(50)
        return ctx, pg
    def seed(pg, data):
        pg.evaluate("s => { localStorage.clear(); void indexedDB.deleteDatabase('aykplus'); localStorage.setItem('%s', s); }" % KEY, json.dumps(data))
        pg.reload(); pg.wait_for_function("window.aykBooted === true"); pg.wait_for_timeout(50)

    # ================= 1) PROFİL OTOMATİK KAYIT =================
    ctx, pg = page()
    pg.evaluate("openProfile()"); pg.wait_for_timeout(150)
    check(pg.query_selector("#profileSave") is None, "Kaydet düğmesi yok")
    pg.fill("#setAge", "41"); pg.wait_for_timeout(50)
    check(st(pg)["settings"]["age"] != 41, "yazarken (kutudan çıkmadan) kaydedilmiyor")
    pg.click("#setHeight"); pg.wait_for_timeout(100)
    check(st(pg)["settings"]["age"] == 41 and "Kaydedildi" in pg.inner_text("#toastWrap"), "kutudan çıkınca kaydedildi + bildirim")
    pg.fill("#setHeight", "500"); pg.press("#setHeight", "Tab"); pg.wait_for_timeout(100)
    check(st(pg)["settings"]["height"] == 230 and pg.input_value("#setHeight") == "230", "sınır dışı boy sınırlandı ve kutuda düzeldi")
    pg.fill("#setBf", "80"); pg.press("#setBf", "Tab"); pg.wait_for_timeout(100)
    check(st(pg)["settings"]["bodyFat"] in ("", None) and pg.input_value("#setBf") == "" and "eski değer" in pg.inner_text("#toastWrap"), "geçersiz yağ oranı kaydedilmedi, eski değer geri geldi")
    w0 = st(pg)["weight"]; n0 = len(st(pg)["weightLogs"])
    pg.fill("#pfWeight", "12"); pg.press("#pfWeight", "Tab"); pg.wait_for_timeout(100)
    check(st(pg)["weight"] == w0 and "kaydedilmedi" in pg.inner_text("#toastWrap"), "geçersiz kilo kaydedilmedi, uyarı çıktı")
    pg.click("#profilePage >> text=Tartıyı kaydet"); pg.wait_for_timeout(120)
    check(len(st(pg)["weightLogs"]) == n0 and pg.is_visible("#uiDialog"), "geçersiz kiloyla 'Tartıyı kaydet' eski kiloyu tekrar yazmıyor")
    pg.click("#uiDlgOk"); pg.wait_for_timeout(80)
    pg.fill("#pfWeight", "91,5"); pg.press("#pfWeight", "Tab"); pg.wait_for_timeout(100)
    check(st(pg)["weight"] == 91.5 and len(st(pg)["weightLogs"]) == n0, "kilo kaydedildi, tartı geçmişi çiftlenmedi")
    pg.locator("#setSplash").uncheck(); pg.wait_for_timeout(100)
    check(st(pg)["settings"]["splash"] is False, "anahtar değişince hemen kaydedildi")
    pg.locator("#toastWrap button", has_text="Geri al").last.click(); pg.wait_for_timeout(120)
    check(st(pg)["settings"]["splash"] is True and pg.is_checked("#setSplash"), "Geri al: hem kayıt hem kutu geri geldi")
    pg.fill("#setTarget", "80"); pg.wait_for_timeout(30)
    pg.evaluate("closeProfile()"); pg.wait_for_timeout(150)
    check(not pg.is_visible("#profilePage") and not pg.is_visible("#uiDialog") and st(pg)["settings"]["targetWeight"] == 80, "Geri: soru sormadan kapanır, yazılmakta olan alan da kaydedilir")
    pg.reload(); pg.wait_for_function("window.aykBooted === true")
    check(st(pg)["settings"]["age"] == 41 and st(pg)["weight"] == 91.5, "yeniden açınca değerler duruyor")
    ctx.close()

    # ================= 2) VERİ SÜRÜMÜ: eski biçimler tek zincirden, bir kez =================
    ctx, pg = page()
    PRE27 = {"settings": {"splash": False, "macroView": "plan"}, "mobilityRoutine": {"dynamic": [{"name": "D1", "prescription": "1 Set x 8 Tekrar"}], "static": [{"name": "S1", "prescription": "2 Set x 30 sn"}]}}
    seed(pg, PRE27); s = st(pg)
    r = s["mobilityRoutine"]
    check(s.get("dataVer") == 3 and len(r["routines"]) == 1 and [x["name"] for x in r["routines"][0]["items"]] == ["D1", "S1"], f"v27 öncesi kayıt: sürüm 3, rutine taşındı ({s.get('dataVer')})")
    check(s["settings"]["macroView"] == "eaten" and "macroViewV26" not in s["settings"], "v26 öncesi: kalori halkası bir kereliğine Yenen, eski işaret kalktı")
    pg.evaluate("state.settings.macroView = 'plan'; renderAll()"); pg.reload(); pg.wait_for_function("window.aykBooted === true")
    check(st(pg)["settings"]["macroView"] == "plan", "sürüm 3'de kullanıcının seçimi korunuyor (tekrar çevrilmiyor)")
    V2 = {"dataVer": 2, "settings": {"splash": False}, "mobilityRoutine": {"dynamic": [{"name": "Eski", "prescription": "1 Set x 8 Tekrar"}], "static": [], "routines": "bozuk"}}
    seed(pg, V2); r = st(pg)["mobilityRoutine"]
    check(r["routines"] == [] and r["dynamic"][0]["name"] == "Eski", "sürüm 3'de bozuk rutin listesi boşalır; eski diziler yeniden çevrilmez, silinmez")
    V38 = {"settings": {"splash": False}, "mobilityRoutine": {"dynamic": [], "static": [], "items": [{"id": "x", "name": "Couch Stretch", "type": "static", "region": "hip", "sets": 2, "mode": "time", "sec": 30, "sides": 2}]}}
    seed(pg, V38); s = st(pg)
    check(s["dataVer"] == 3 and s["mobilityRoutine"]["routines"][0]["items"][0]["name"] == "Couch Stretch", "v38 kaydı (items) sürüm 3'ye taşındı")
    pg.evaluate("t => void restoreFromText(t)", json.dumps(dict(PRE27, meals=[]))); pg.wait_for_timeout(150); pg.click("#uiDlgOk"); pg.wait_for_timeout(250)
    s = st(pg)
    check(s["dataVer"] == 3 and s["mobilityRoutine"]["routines"][0]["items"][0]["name"] == "D1", "eski yedek dosyası geri yüklenince aynı zincirden geçiyor")
    pg.evaluate("localStorage.clear(); void indexedDB.deleteDatabase('aykplus')"); pg.reload(); pg.wait_for_function("window.aykBooted === true")
    s = st(pg)
    check(s["dataVer"] == 3 and len(s["mobilityRoutine"]["routines"][0]["items"]) == 10, "yeni kurulum: varsayılanlar da sürüm 3'de")
    ctx.close()

    check(not errs, f"sayfa hatası yok ({errs[:3]})")
    b.close()
finally:
    srv.terminate()
print(f"\n{len(fails)} hata" if fails else "\nHEPSİ GEÇTİ")
sys.exit(1 if fails else 0)
