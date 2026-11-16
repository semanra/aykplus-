# v58: Profil hızlı düzeltmeler — açılışta bütün kayıt metne çevrilmiyor, yazarken de kayıt (iPhone'da kutudan çıkılmadan
# uygulamadan çıkılırsa kaybolmasın), arka plana geçerken odaktaki alan kaydı, su hedefi kutusu otomatikken hesaplananı
# gösterir (kayıttaki elle hedef değişmez), yedek durumu (telefon dışı + otomatik iç yedek), gizlilik notu.
import os, sys, subprocess, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8815'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
URL = "http://localhost:8815/index.html"
def st(pg): return pg.evaluate("aykStoredState()")
def boot(pg): pg.wait_for_function("window.aykBooted === true"); pg.wait_for_timeout(80)
try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    c = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}, locale="tr-TR"); c.add_init_script(TEST_INIT)
    pg = c.new_page(); pg.on("pageerror", lambda e: errs.append(str(e))); pg.goto(URL); boot(pg)

    # 1) Açılışta yedek kodu üretilmiyor; "Kodu kopyala" üretir
    pg.evaluate("openProfile()"); pg.wait_for_timeout(150)
    check(pg.input_value("#backupText") == "", "Profil açılınca yedek kodu kutusu boş (bütün kayıt metne çevrilmiyor)")
    pg.evaluate("void copyBackup()"); pg.wait_for_timeout(150)
    check(len(pg.input_value("#backupText")) > 1000, "Kodu kopyala yedek kodunu o anda üretir")

    # 2) Yazarken kayıt (kutudan çıkmadan, 0,9 sn sonra), sessiz; kutudan çıkınca bildirim
    age0 = st(pg)["settings"]["age"]
    pg.click("#setAge"); pg.fill("#setAge", "37"); pg.wait_for_timeout(1300)
    check(st(pg)["settings"]["age"] == 37, "yazmayı bırakınca kutudan çıkmadan kaydedildi")
    check(pg.evaluate("document.activeElement.id") == "setAge" and pg.input_value("#setAge") == "37", "yazılan kutu odakta ve yerinde kaldı")
    check("Kaydedildi" not in pg.inner_text("#toastWrap"), "yazarken bildirim çıkmadı")
    pg.press("#setAge", "Tab"); pg.wait_for_timeout(150)
    check("Kaydedildi" in pg.inner_text("#toastWrap"), "kutudan çıkınca 'Kaydedildi · Geri al'")
    pg.evaluate("doUndo()"); pg.wait_for_timeout(150)
    check(st(pg)["settings"]["age"] == age0 and pg.input_value("#setAge") == str(age0), "Geri al yazmadan önceki yaşa döner")

    # 3) Yarım / sınır dışı değer yazarken kaydedilmez, kutuya dokunulmaz; kutudan çıkınca sınıra çekilir
    pg.click("#setAge"); pg.fill("#setAge", "3"); pg.wait_for_timeout(1300)
    check(st(pg)["settings"]["age"] == age0 and pg.input_value("#setAge") == "3", "yarım değer (3) yazarken kaydedilmedi, kutu değişmedi")
    pg.fill("#setAge", "abc"); pg.wait_for_timeout(1300)
    check(st(pg)["settings"]["age"] == age0, "harf yazarken kaydedilmedi")
    pg.fill("#setAge", "3"); pg.press("#setAge", "Tab"); pg.wait_for_timeout(150)
    check(st(pg)["settings"]["age"] == 12 and pg.input_value("#setAge") == "12", "kutudan çıkınca sınıra (12) çekildi")
    pg.click("#setBf"); pg.fill("#setBf", "8"); pg.wait_for_timeout(1300)   # %3–60 aralığında, geçerli
    check(st(pg)["settings"]["bodyFat"] == 8, "yağ oranı yazarken kaydedildi")
    pg.fill("#setBf", "80"); pg.wait_for_timeout(1300)
    check(st(pg)["settings"]["bodyFat"] == 8 and pg.input_value("#setBf") == "80" and "eski değer" not in pg.inner_text("#toastWrap"), "geçersiz yağ oranı yazarken sessizce atlandı")
    pg.fill("#setBf", ""); pg.press("#setBf", "Tab"); pg.wait_for_timeout(150)

    # 4) Uygulama arka plana geçerken odaktaki alan kaydedilir (kutudan çıkılmamış olsa da)
    pg.click("#setRest"); pg.fill("#setRest", "150")
    pg.evaluate("""() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange')); delete document.visibilityState; }"""); pg.wait_for_timeout(150)
    check(st(pg)["settings"]["restSec"] == 150, "arka plana geçerken odaktaki dinlenme süresi kaydedildi")

    # 5) Su: otomatik açıkken kutu hesaplanan hedefi gösterir, kilitli; elle hedef kayıtta aynı kalır
    pg.evaluate("state.settings.waterAuto = true; state.settings.waterTarget = 3.5; renderAll(); fillProfileFields()"); pg.wait_for_timeout(100)
    auto = pg.evaluate("fmtNum(waterAutoInfo(state.weight).total)")
    check(pg.is_disabled("#setWater") and pg.input_value("#setWater") == auto, "otomatik su: kutu kilitli ve hesaplananı gösteriyor (%s)" % auto)
    pg.click("#setAge"); pg.fill("#setAge", "40"); pg.press("#setAge", "Tab"); pg.wait_for_timeout(150)
    check(st(pg)["settings"]["waterTarget"] == 3.5, "başka alan kaydedilince elle su hedefi kutudaki hesaplanan değerle ezilmedi")
    pg.click("#setWaterAuto"); pg.wait_for_timeout(150)
    check(not pg.is_disabled("#setWater") and pg.input_value("#setWater") == "3,5" and st(pg)["settings"]["waterTarget"] == 3.5 and st(pg)["settings"]["waterAuto"] is False,
          "otomatik kapatılınca elle hedef (3,5) geri geldi, kayıt aynı")
    pg.click("#setWaterAuto"); pg.wait_for_timeout(150)

    # 6) Yedek durumu
    pg.evaluate("state.lastBackupAt = 0; renderAll()"); pg.wait_for_timeout(100)
    check(pg.inner_text("#pfBkOff") == "Hiç alınmadı", "telefon dışı yedek: Hiç alınmadı")
    pg.wait_for_function("document.getElementById('pfBkAuto') && document.getElementById('pfBkAuto').textContent !== '…'");
    check(pg.inner_text("#pfBkAuto") == "Bugün alındı", "otomatik iç yedek: Bugün alındı (açılışta oluştu)")
    pg.evaluate("state.lastBackupAt = Date.now() - 3 * DAY_MS - 1000; renderAll()"); pg.wait_for_timeout(100)
    check(pg.inner_text("#pfBkOff") == "3 gün önce", "telefon dışı yedek: 3 gün önce")
    check("IP" in pg.inner_text("#pfAboutPrivacy"), "gizlilik notu Open Food Facts'e IP adresinin de ulaştığını söylüyor")
    check(pg.evaluate("[...document.querySelectorAll('#pfBackupStatus i')].every(i => i.getBoundingClientRect().width > 0)"), "durum noktaları görünüyor")

    # 7) İngilizce
    pg.evaluate("setLang('en'); openProfile()"); pg.wait_for_timeout(200)
    check(pg.inner_text("#pfBkOff") == "3 days ago" and "Off-phone backup" in pg.inner_text("#pfBackupStatus"), "en: yedek durumu İngilizce")
    pg.evaluate("setLang('tr')"); pg.wait_for_timeout(100)
    check(errs == [], "sayfa hatası yok: " + str(errs[:3]))
    b.close()
finally:
    srv.terminate()
print("BAŞARISIZ:" if fails else "TÜMÜ GEÇTİ", fails)
sys.exit(1 if (fails or errs) else 0)
