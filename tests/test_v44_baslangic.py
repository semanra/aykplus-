# v44 bölüm 1: yeni kurulumu tanıma (settings.onboarded, veri sürümü 4), test fikstürü ve kancası.
import os, sys, json, subprocess, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT, SPLASH_OFF, FIXTURE
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8803'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
URL = "http://localhost:8803/index.html"
KEY = "ayk_plus_v5_state"
def st(pg): return pg.evaluate("aykStoredState()")
STUB = """(() => { try { const m = sessionStorage.getItem('stub'); if (m === 'hang') indexedDB.open = () => ({}); // hiç yanıt vermez
  if (m === 'get') IDBObjectStore.prototype.get = function () { throw new Error('gecici hata'); }; } catch (e) {} })()"""
def boot(pg): pg.wait_for_function("window.aykBooted === true"); pg.wait_for_timeout(80)

try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    def page_fresh():   # TEST_INIT YOK: yalnızca açılış animasyonu kaldırılır
        ctx = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844})
        ctx.add_init_script(SPLASH_OFF)
        ctx.add_init_script(STUB)
        pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(URL); boot(pg)
        return pg
    def seed(pg, data):
        pg.evaluate("s => { localStorage.clear(); void indexedDB.deleteDatabase('aykplus'); localStorage.setItem('%s', s); }" % KEY, json.dumps(data))
        pg.reload(); boot(pg)

    pg = page_fresh()
    s = st(pg)
    check(s["settings"]["onboarded"] is False and s["dataVer"] == 4, "yeni kurulum: onboarded false, dataVer 4")
    pg.reload(); boot(pg)
    check(st(pg)["settings"]["onboarded"] is False, "kurulum bitmeden yeniden açılınca yine onboarded false")
    OWNER43 = json.load(open(FIXTURE, encoding="utf-8")); OWNER43["dataVer"] = 3
    seed(pg, OWNER43); check(st(pg)["settings"]["onboarded"] is True and st(pg)["dataVer"] == 4, "v43 kaydı: onboarded true")
    check(st(pg)["weight"] == OWNER43["weight"], "v43 kaydı: veri aynı")
    seed(pg, {**OWNER43, "dataVer": 2}); check(st(pg)["settings"]["onboarded"] is True, "v42 kaydı: onboarded true")
    # v4 kaydı
    pg.evaluate("s => { localStorage.clear(); void indexedDB.deleteDatabase('aykplus'); localStorage.setItem('ayk_plus_v4_state', s); }", json.dumps({"weight": 90, "meals": OWNER43["meals"]}))
    pg.reload(); boot(pg)
    check(st(pg)["settings"]["onboarded"] is True and st(pg)["weight"] == 90, "v4 kaydı: kurulum yok, kilo 90")
    # bozuk kayıt
    pg.evaluate("() => { localStorage.clear(); void indexedDB.deleteDatabase('aykplus'); localStorage.setItem('ayk_plus_v5_state', '{bozuk'); }")
    pg.reload(); boot(pg)
    check(pg.evaluate("state.settings.onboarded") is True, "bozuk kayıt: kurulum yok (kurtarma akışı)")
    # IndexedDB'de veri var, localStorage silinmiş
    seed(pg, OWNER43); pg.evaluate("() => { localStorage.removeItem('ayk_plus_v5_state'); localStorage.removeItem('ayk_plus_v5_sira'); localStorage.removeItem('ayk_plus_v5_imza'); }")
    pg.reload(); boot(pg)
    check(pg.evaluate("state.settings.onboarded") is True and pg.evaluate("state.weight") == OWNER43["weight"], "yalnızca IndexedDB: kurulum yok, veri aynı")
    # geçici IndexedDB hatası + localStorage boş: kurulum açılmaz (dataVer <= 3 sahibi hiçbir yolda görmez)
    for mode, lbl in (("hang", "IndexedDB açılışı zaman aşımı"), ("get", "IndexedDB okuma hatası")):
        seed(pg, OWNER43)
        pg.evaluate("m => { sessionStorage.setItem('stub', m); localStorage.clear(); }", mode)
        pg.reload(); pg.wait_for_function("window.aykBooted === true", timeout=20000); pg.wait_for_timeout(80)
        check(pg.evaluate("state.settings.onboarded") is True, lbl + " + boş localStorage: kurulum yok")
        pg.evaluate("sessionStorage.removeItem('stub')")
    pg.evaluate("sessionStorage.removeItem('stub')")
    seed(pg, OWNER43); pg.evaluate("() => { localStorage.removeItem('ayk_plus_v5_state'); localStorage.removeItem('ayk_plus_v5_sira'); localStorage.removeItem('ayk_plus_v5_imza'); }")
    pg.reload(); boot(pg)
    # fabrika ayarları
    pg.evaluate("void resetToDefaults()"); pg.click("#uiDlgOk"); pg.wait_for_timeout(80); pg.click("#uiDlgOk"); pg.wait_for_timeout(300)
    check(pg.evaluate("state.settings.onboarded") is False, "fabrika ayarları: kurulum yeniden açılacak")
    # kanca: aynı tarayıcıda TEST_INIT'li yeni bağlam
    ctx2 = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}); ctx2.add_init_script(TEST_INIT)
    pg2 = ctx2.new_page(); pg2.on("pageerror", lambda e: errs.append(str(e)))
    pg2.goto(URL); boot(pg2)
    check(pg2.evaluate("state.settings.onboarded") is True and pg2.evaluate("state.weight") == 105, "test kancası: eski varsayılanlarla, kurulumsuz")
    check(pg2.evaluate("freshInstall") is False, "test kancası: freshInstall false")
    check(pg2.evaluate("state.settings.onboarded") is True and st(pg2)["settings"]["onboarded"] is True, "test kancası: kayıt da onboarded true")
    b.close()
finally:
    srv.terminate()
print("sayfa hataları:", errs)
print("BAŞARISIZ:" if fails else "TÜMÜ GEÇTİ", fails)
sys.exit(1 if (fails or errs) else 0)
