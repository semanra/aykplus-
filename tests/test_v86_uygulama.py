# v86 (Aşama B1): iPhone uygulaması (Capacitor) yardımcıları — sahte window.Capacitor ile;
# parmakla yakınlaştırma ayarı (web + uygulama), tanılama günlüğü, web uygulamasının değişmediği
import os, sys, subprocess, time, json, base64
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PORT = 8842
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT)], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
URL = f"http://localhost:{PORT}/index.html"
def boot(pg): pg.wait_for_function("window.aykBooted === true"); pg.wait_for_timeout(80)
def vp(pg): return pg.evaluate("document.querySelector('meta[name=viewport]').getAttribute('content')")
# service worker kaydı sayılır (gerçek kayıt yapılmaz)
SW_SPY = """(() => { window.__swReg = 0; try { if (navigator.serviceWorker) navigator.serviceWorker.register = function () { window.__swReg++; return Promise.resolve({}); }; } catch (e) {} })();"""
# iPhone uygulamasındaki köprünün taklidi: Filesystem / Share / StatusBar
FAKE_CAP = """(() => {
  window.__fs = []; window.__sh = []; window.__sb = []; window.__shCancel = false;
  window.Capacitor = { isNativePlatform: () => true, Plugins: {
    Filesystem: { writeFile: async o => { window.__fs.push(o); return { uri: 'file:///cache/' + o.path }; } },
    Share: { share: async o => { window.__sh.push(o); if (window.__shCancel) throw new Error('Share canceled'); return {}; } },
    StatusBar: { setStyle: async o => { window.__sb.push(o.style); } }
  } };
})();"""
try:
  with sync_playwright() as p:
    b = p.chromium.launch()

    # ===== 1) Web uygulaması: değişmeyenler + yakınlaştırma ayarı =====
    c = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}, locale="tr-TR")
    c.add_init_script(SW_SPY); c.add_init_script(TEST_INIT)
    pg = c.new_page(); pg.on("pageerror", lambda e: errs.append(str(e))); pg.goto(URL); boot(pg)
    pg.wait_for_function("window.__swReg >= 1", timeout=5000)
    check(pg.evaluate("isNative()") is False and pg.evaluate("window.__swReg") == 1, "web: uygulama değil, service worker kaydediliyor")
    check(pg.evaluate("state.settings.zoom") is False and "user-scalable=no" in vp(pg), "yakınlaştırma varsayılan kapalı")
    check("viewport-fit=cover" in vp(pg), "viewport-fit korunuyor")
    pg.evaluate("openProfile()"); pg.wait_for_timeout(80)
    check(pg.get_attribute("#pfPrivacyLink", "href") == "privacy.html", "web: gizlilik bağlantısı yerel")
    check(pg.evaluate("$('setZoom').checked") is False, "Profil anahtarı kapalı görünüyor")
    pg.evaluate("$('setZoom').click()"); pg.wait_for_timeout(120)
    check(pg.evaluate("state.settings.zoom") is True and "maximum-scale=5.0" in vp(pg) and "user-scalable=no" not in vp(pg), "anahtar açılınca yakınlaştırma açık")
    pg.wait_for_timeout(300)
    check(pg.evaluate("aykStoredState()")["settings"]["zoom"] is True, "ayar kalıcı")
    check(pg.evaluate("getComputedStyle(document.body).touchAction") == "manipulation", "çift dokunuş yakınlaştırması kapalı (touch-action)")
    pg.reload(); boot(pg)
    check(pg.evaluate("state.settings.zoom") is True and "maximum-scale=5.0" in vp(pg), "yeniden açılışta yakınlaştırma açık")
    pg.evaluate("openProfile()"); pg.wait_for_timeout(80)
    check(pg.evaluate("$('setZoom').checked") is True, "anahtar açık görünüyor")
    pg.evaluate("$('setZoom').click()"); pg.wait_for_timeout(120)
    check(pg.evaluate("state.settings.zoom") is False and "user-scalable=no" in vp(pg), "kapatınca eski hâline dönüyor")
    # bozuk / eski değer
    check(pg.evaluate("normalizeState({ ...JSON.parse(JSON.stringify(state)), settings: { ...state.settings, zoom: 'evet' } }).settings.zoom") is False, "bozuk zoom değeri → kapalı")
    # tanılama
    pg.evaluate("localStorage.removeItem('ayk_tani'); diagLog('deneme', new Error('ornek hata'))")
    d = pg.evaluate("diagRead()")
    check(len(d) == 1 and "ornek hata" in d[0]["m"] and d[0]["w"] == "deneme", "tanılama: hata kaydı tutuluyor")
    pg.evaluate("for (let i = 0; i < 40; i++) diagLog('x', 'h' + i)")
    check(len(pg.evaluate("diagRead()")) == 30, "tanılama: en fazla 30 kayıt")
    txt = pg.evaluate("diagText()")
    check("AYK+ v86" in txt and "| web |" in txt and "foods.js:" in txt and "boot:" in txt and "h39" in txt, "tanılama metni: sürüm, ortam, yükleme süresi, kayıtlar")
    check(pg.evaluate("window.aykBootMs") > 0, "açılış süresi ölçülüyor")
    check(pg.evaluate("JSON.stringify(state).includes('ornek hata')") is False and "ayk_tani" not in json.dumps(pg.evaluate("aykStoredState()")), "tanılama kullanıcı kaydına girmiyor")
    pg.evaluate("openProfile('about')"); pg.wait_for_timeout(80)
    pg.evaluate("void openDiag()"); pg.wait_for_selector("#uiDlgOk", state="visible")
    check("30 hata kaydı" in pg.inner_text("#uiDlgMsg") and pg.inner_text("#uiDlgOk") == "Kopyala", "Tanılama penceresi")
    pg.click("#uiDlgCancel"); pg.wait_for_timeout(60)
    pg.evaluate("localStorage.removeItem('ayk_tani')")
    c.close()

    # ===== 2) Sahte iPhone uygulaması =====
    c = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}, locale="tr-TR")
    c.add_init_script(SW_SPY); c.add_init_script(FAKE_CAP); c.add_init_script(TEST_INIT)
    pg = c.new_page(); pg.on("pageerror", lambda e: errs.append(str(e))); pg.goto(URL); boot(pg)
    pg.wait_for_timeout(400)
    check(pg.evaluate("isNative()") is True and pg.evaluate("window.__swReg") == 0, "uygulama: service worker kaydedilmiyor")
    check(pg.evaluate("window.__sb[window.__sb.length - 1]") == "DARK", "koyu temada durum çubuğu açık yazı")
    pg.evaluate("setTheme('light')"); pg.wait_for_timeout(60)
    check(pg.evaluate("window.__sb[window.__sb.length - 1]") == "LIGHT", "aydınlık temada durum çubuğu koyu yazı")
    n_sb = pg.evaluate("window.__sb.length"); pg.evaluate("renderAll(); renderAll()")
    check(pg.evaluate("window.__sb.length") == n_sb, "durum çubuğu her çizimde tekrar çağrılmıyor")
    pg.evaluate("setTheme('dark')")
    # yedek dosyası
    pg.evaluate("state.lastBackupAt = 0")
    pg.evaluate("void exportBackupFile()"); pg.wait_for_function("window.__sh.length >= 1")
    fs = pg.evaluate("window.__fs[0]"); sh = pg.evaluate("window.__sh[0]")
    check(fs["directory"] == "CACHE" and fs["encoding"] == "utf8" and fs["path"].startswith("AYK-yedek-") and fs["path"].endswith(".json"), "yedek önbellek klasörüne yazıldı")
    back = json.loads(fs["data"])
    check(back.get("workoutDays") == pg.evaluate("state.workoutDays") and back.get("dataVer") == pg.evaluate("state.dataVer"), "yazılan yedek = kayıt")
    check(sh["files"] == ["file:///cache/" + fs["path"]], "paylaş menüsü dosyayla açıldı")
    pg.wait_for_timeout(60)
    check(pg.evaluate("state.lastBackupAt") > 0, "paylaşınca yedek alındı sayılıyor")
    pg.evaluate("state.lastBackupAt = 0; window.__shCancel = true; void exportBackupFile()"); pg.wait_for_function("window.__sh.length >= 2"); pg.wait_for_timeout(60)
    check(pg.evaluate("state.lastBackupAt") == 0, "vazgeçince yedek alındı sayılmıyor")
    check(pg.evaluate("saveTextFile('a;b', 'x.csv', 'T', 'text/csv')") == "aborted", "vazgeç → 'aborted'")
    pg.evaluate("window.__shCancel = false; window.Capacitor.Plugins.Filesystem.writeFile = async () => { throw new Error('disk dolu'); }; 0")
    check(pg.evaluate("saveTextFile('a', 'y.json', 'T')") == "failed", "yazılamazsa 'failed'")
    check(any("disk dolu" in x["m"] for x in pg.evaluate("diagRead()")), "hata tanılamaya yazıldı")
    pg.evaluate("window.Capacitor.Plugins.Filesystem.writeFile = async o => { window.__fs.push(o); return { uri: 'file:///cache/' + o.path }; }; 0")
    # paylaşım kartı (görsel)
    pg.evaluate("void shareFileOut(new File([new Uint8Array([137,80,78,71,1,2,3])], 'AYK-map-2026-11-28.png', { type: 'image/png' }))")
    pg.wait_for_function("window.__fs.some(o => o.path.endsWith('.png'))")
    png = pg.evaluate("window.__fs.find(o => o.path.endsWith('.png'))")
    check("encoding" not in png and base64.b64decode(png["data"]) == bytes([137,80,78,71,1,2,3]), "görsel base64 olarak yazıldı (bayt bayt aynı)")
    # alışveriş listesi
    n = pg.evaluate("window.__sh.length")
    pg.evaluate("void shareShopList()"); pg.wait_for_function(f"window.__sh.length > {n}")
    check(isinstance(pg.evaluate("window.__sh[window.__sh.length - 1].text"), str), "alışveriş listesi metin olarak paylaşıldı")
    # gizlilik / destek: Safari'de web adresi
    pg.evaluate("openProfile('about')"); pg.wait_for_timeout(80)
    check(pg.get_attribute("#pfPrivacyLink", "href") == "https://semanra.github.io/aykplus-/privacy.html", "uygulama: gizlilik bağlantısı web adresi")
    check(pg.get_attribute("#pfSupportLink", "href").startswith("https://semanra.github.io/aykplus-/support.html"), "uygulama: destek bağlantısı web adresi")
    check("| app |" in pg.evaluate("diagText()"), "tanılamada ortam 'app'")
    # dosya adındaki yasak karakterler
    check(pg.evaluate("nativeSafeName('a/b:c?.json')") == "a-b-c-.json", "dosya adı temizleniyor")
    c.close()

    # ===== 3) İngilizce =====
    c = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}, locale="en-US")
    c.add_init_script(TEST_INIT)
    pg = c.new_page(); pg.on("pageerror", lambda e: errs.append(str(e))); pg.goto(URL); boot(pg)
    pg.evaluate("setLang('en'); openProfile()"); pg.wait_for_timeout(100)
    txt = pg.inner_text("#profilePage")
    check("Pinch to zoom" in txt and "Diagnostics" in txt and "yakınlaştırma" not in txt, "İngilizce: yakınlaştırma ve tanılama satırları")
    pg.evaluate("localStorage.removeItem('ayk_tani'); void openDiag()"); pg.wait_for_selector("#uiDlgOk", state="visible")
    check("No error records." in pg.inner_text("#uiDlgMsg") and pg.inner_text("#uiDlgOk") == "Copy", "İngilizce: tanılama penceresi")
    c.close()
    b.close()
finally:
  srv.terminate()
if errs: print("SAYFA HATALARI:", errs[:5])
print(f"\n{'BAŞARISIZ: ' + str(len(fails)) if fails or errs else 'HEPSİ GEÇTİ'}")
sys.exit(1 if fails or errs else 0)
