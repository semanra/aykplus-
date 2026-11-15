# v47 bölüm 1: ortak metinler (yedek bandı, uiAsk, bildirim, dinlenme sayacı, üst panel) İngilizce; Türkçe aynı.
import os, sys, re, subprocess, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8805'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
URL = "http://localhost:8805/index.html"
TR_CH = re.compile(r"[çğıöşüÇĞİÖŞÜ]")
BK = "Son yedeğin {n} gün önce. Verilerini korumak için yedekle."
def boot(pg): pg.wait_for_function("window.aykBooted === true"); pg.wait_for_timeout(80)

try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}, locale="en-US")
    ctx.add_init_script(TEST_INIT); ctx.add_init_script("window.AYK_TEST_EN = true")
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL); boot(pg)
    pg.evaluate("() => { window.hasMeaningfulData = () => true; state.lastBackupAt = Date.now() - 12 * DAY_MS; state.backupSnoozeUntil = 0; saveState(); }")
    def banner():
        pg.evaluate("renderBanner()")
        return pg.evaluate("""() => ({ txt: $('backupBannerText').textContent, hidden: $('backupBanner').classList.contains('hidden'),
          btns: [...document.querySelectorAll('#backupBanner button')].map(x => (x.textContent + ' ' + (x.getAttribute('aria-label') || '')).trim()) })""")
    LAST_BTN = "$('restPill').querySelector('button:last-child').textContent"
    # --- Türkçe: eskisiyle aynı ---
    tr = banner()
    check(not tr["hidden"] and tr["txt"] == "Son yedeğin 12 gün önce. Verilerini korumak için yedekle.", "tr: yedek bandı metni aynı: " + tr["txt"])
    check(tr["btns"] == ["Yedekle", "Uyarıyı 3 gün gizle"], "tr: yedek bandı düğmeleri aynı: %s" % tr["btns"])
    pg.evaluate("void manualNewDay()"); pg.wait_for_selector("#uiDialog:not(.hidden)")
    d = pg.evaluate("() => [$('uiDlgTitle').textContent, $('uiDlgMsg').textContent, $('uiDlgOk').textContent, $('uiDlgCancel').textContent]")
    check(d == ["Yeni güne geçilsin mi?", "Su, takviye, öğün ve mobilite tikleri sıfırlanır. Bugünün özeti Beslenme → Geçmiş'e kaydedilir.", "Yeni güne geç", "Vazgeç"], "tr: gün dönümü penceresi aynı")
    pg.click("#uiDlgCancel")
    check(pg.evaluate("[" + LAST_BTN + ", $('profileBtn').getAttribute('aria-label')]") == ["Atla", "Profil"], "tr: Atla / Profil aynı")
    check(pg.evaluate("[timerLabelText('Dinlenme'), timerLabelText('Dinlenme • Squat')]") == ["Dinlenme", "Dinlenme • Squat"], "tr: sayaç etiketi aynı")
    pg.evaluate("toast(t('Hata: {m}', { m: 'x' }), 'error')")
    check(pg.evaluate("$('toastWrap').lastElementChild.textContent") == "Hata: x", "tr: Hata bildirimi aynı")
    # --- İngilizce ---
    pg.evaluate("() => { state.settings.lang = 'en'; applyStaticI18n(); renderAll(); }")
    en = banner()
    check(not TR_CH.search(en["txt"]) and "12 days ago" in en["txt"], "en: yedek bandı İngilizce: " + en["txt"])
    check(en["btns"] == ["Back up", "Hide reminder for 3 days"], "en: yedek bandı düğmeleri: %s" % en["btns"])
    pg.evaluate("state.lastBackupAt = 0; state.createdAt = Date.now() - 12 * DAY_MS; renderBanner()")
    t0 = pg.evaluate("$('backupBannerText').textContent")
    check(not TR_CH.search(t0) and t0.startswith("You haven't"), "en: hiç yedek yok metni: " + t0)
    one = pg.evaluate("tn(1, '%s')" % BK); two = pg.evaluate("tn(2, '%s')" % BK)
    check(one.startswith("Your last backup was 1 day ago") and "2 days ago" in two, "en: tn tekil/çoğul")
    pg.evaluate("void manualNewDay()"); pg.wait_for_selector("#uiDialog:not(.hidden)")
    d = pg.evaluate("() => [$('uiDlgTitle').textContent, $('uiDlgMsg').textContent, $('uiDlgOk').textContent, $('uiDlgCancel').textContent]")
    check(d == ["Start a new day?", "Water, supplements, meals and mobility check-offs will be reset. Today's summary is saved in Nutrition → History.", "Start new day", "Cancel"], "en: gün dönümü uiAsk penceresi: %s" % d)
    check(not any(TR_CH.search(x) for x in d), "en: pencere Türkçe harf içermez")
    pg.click("#uiDlgCancel")
    pg.evaluate("void uiAlert(t('Fotoğraf yüklenemedi'), t('Bu fotoğraf açılamadı. Başka bir fotoğraf seçmeyi dene.'))"); pg.wait_for_selector("#uiDialog:not(.hidden)")
    d = pg.evaluate("() => [$('uiDlgTitle').textContent, $('uiDlgOk').textContent, $('uiDlgCancel').classList.contains('hidden')]")
    check(d == ["Couldn't upload photo", "OK", True], "en: uiAlert düğmesi OK: %s" % d)
    pg.click("#uiDlgOk")
    pg.evaluate("void askText(t('Fotoğraf yüklenemedi'))"); pg.wait_for_selector("#uiDialog:not(.hidden)")
    check(pg.evaluate("[$('uiDlgOk').textContent, $('uiDlgCancel').textContent]") == ["Save", "Cancel"], "en: askText varsayılan Save/Cancel")
    pg.click("#uiDlgCancel")
    check(pg.evaluate("[" + LAST_BTN + ", $('profileBtn').getAttribute('aria-label')]") == ["Skip", "Profile"], "en: Skip / Profile")
    check(pg.evaluate("[timerLabelText('Dinlenme'), timerLabelText('Dinlenme • Squat'), timerLabelText('Plank')]") == ["Rest", "Rest • Squat", "Plank"], "en: sayaç etiketi, hareket adı dokunulmaz")
    pg.evaluate("startTimer(1, 'Dinlenme • Squat')"); pg.wait_for_timeout(1600)
    tt = pg.evaluate("[$('restPillTime').textContent, $('toastWrap').textContent]")
    check(tt[0] == "DONE" and "Rest • Squat over" in tt[1], "en: sayaç bitişi ve bildirim: %s" % tt)
    check(pg.evaluate("JSON.parse(localStorage.getItem('ayk_timer') || 'null')") is None, "sayaç kaydı bitince silinir")
    pg.evaluate("toast(t('Veriler kaydedilemedi! Hemen yedek al.'), 'error')")
    tx = pg.evaluate("$('toastWrap').lastElementChild.textContent")
    check(tx == "Your data couldn't be saved. Back it up now.", "en: kayıt hatası bildirimi: " + tx)
    pg.evaluate("applyTabVisibility()")
    check(pg.evaluate("$('tabTitle').textContent") == "Nutrition", "en: sekme başlığı")
    a = pg.evaluate("$('nutriThemeBtn').getAttribute('aria-label')")
    check(not TR_CH.search(a) and a.startswith("Switch to"), "en: tema düğmesi etiketi: " + a)
    # --- Türkçeye dönüş ---
    pg.evaluate("() => { state.settings.lang = 'tr'; applyStaticI18n(); renderAll(); state.lastBackupAt = Date.now() - 12 * DAY_MS; renderBanner(); }")
    check(pg.evaluate("[" + LAST_BTN + ", $('profileBtn').getAttribute('aria-label'), $('backupBannerText').textContent]") == ["Atla", "Profil", "Son yedeğin 12 gün önce. Verilerini korumak için yedekle."], "Türkçeye dönüş: metinler geri geldi")
    check(errs == [], "sayfa hatası yok: " + str(errs[:3]))
    b.close()
finally:
    srv.terminate()
print("BAŞARISIZ:" if fails else "TÜMÜ GEÇTİ", fails)
sys.exit(1 if (fails or errs) else 0)
