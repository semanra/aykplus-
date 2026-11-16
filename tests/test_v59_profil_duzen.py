# v59: Profil yeniden düzeni — ana ekran (özet kartı, ayar arama, 7 bölüm), bölümler alt sayfa, Geri ana ekrana döner,
# Profil'de hedef (Ver/Koru/Al, açık, hız), arama sonucuna dokununca ilgili satıra gider. Eski testler window.AYK_PF_FLAT
# ile bütün bölümleri alt alta açar; bu test gerçek düzeni (bayrak kapalı) dener.
import os, sys, subprocess, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SHOTS = os.path.join(REPO, "tests", "shots"); os.makedirs(SHOTS, exist_ok=True)
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8816'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
URL = "http://localhost:8816/index.html"
def st(pg): return pg.evaluate("aykStoredState()")
def boot(pg): pg.wait_for_function("window.aykBooted === true"); pg.wait_for_timeout(80)
def vis(pg, sel): return pg.is_visible(sel)
try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    def ctx(w=390, scheme="dark"):
        c = b.new_context(color_scheme=scheme, viewport={"width": w, "height": 844}, locale="tr-TR")
        c.add_init_script(TEST_INIT); c.add_init_script("window.AYK_PF_FLAT = false;")
        pg = c.new_page(); pg.on("pageerror", lambda e: errs.append(str(e))); pg.goto(URL); boot(pg)
        return c, pg
    c, pg = ctx()

    # 1) Ana ekran
    pg.click("#profileBtn"); pg.wait_for_timeout(200)
    check(pg.get_attribute("#profilePage", "data-pf-view") == "home" and vis(pg, "#pfHome") and vis(pg, "#pfSummary"), "Profil ana ekranla açılır (özet kartı görünür)")
    check(not vis(pg, "#setAge") and not vis(pg, "#setRest") and not vis(pg, "#pfBackupStatus"), "bölüm içerikleri ana ekranda gizli")
    rows = pg.evaluate("[...document.querySelectorAll('#pfNav [data-pf-open]')].map(e => [e.dataset.pfOpen, Math.round(e.getBoundingClientRect().height)])")
    check([r[0] for r in rows] == ["me", "body", "app", "train", "nutri", "data", "about"] and all(r[1] >= 44 for r in rows), "7 bölüm satırı, hepsi ≥ 44 px: %s" % rows)
    summ = pg.inner_text("#pfSummary")
    check("Kilo vermek" in pg.text_content("#pfSummary"), "özet: hedef yazıyor")
    check("kcal" in summ and "protein" in summ and "→" in summ, "özet: kilo → hedef kilo ve bugünün kalori/protein hedefi")
    check(pg.evaluate("document.documentElement.scrollWidth <= innerWidth && $('pfScroll').scrollWidth <= $('pfScroll').clientWidth"), "ana ekranda yatay taşma yok")
    check(vis(pg, "#pfFoot") and "v59" in pg.inner_text("#pfFoot"), "alt satır (sürüm + fabrika ayarları) ana ekranda")
    pg.screenshot(path=os.path.join(SHOTS, "v59_profil_ana.png"))

    # 2) Bölüm aç / Geri
    pg.click("[data-pf-open=body]"); pg.wait_for_timeout(150)
    check(pg.text_content("#pfTitle") == "Kilo ve hedefler" and vis(pg, "#setTarget") and vis(pg, "#pfWeight") and not vis(pg, "#setAge") and not vis(pg, "#pfHome"), "Kilo ve hedefler açıldı, yalnızca o bölüm görünür")
    pg.screenshot(path=os.path.join(SHOTS, "v59_profil_hedef.png"))
    pg.click("#profilePage .pf-top button"); pg.wait_for_timeout(150)
    check(pg.get_attribute("#profilePage", "data-pf-view") == "home" and pg.text_content("#pfTitle") == "Profil" and vis(pg, "#profilePage"), "Geri: ana ekrana döner, Profil açık kalır")
    pg.click("#profilePage .pf-top button"); pg.wait_for_timeout(150)
    check(not vis(pg, "#profilePage"), "ana ekranda Geri: Profil kapanır")

    # 3) Hedef Profil'den (Menülerim'le aynı ayar)
    pg.evaluate("openProfile('body')"); pg.wait_for_timeout(150)
    pg.click("[data-pf-goal=gain]"); pg.wait_for_timeout(120)
    check(st(pg)["settings"]["goal"] == "gain" and vis(pg, "#pfGainBox") and not vis(pg, "#pfLoseBox"), "Al seçildi, kilo alma hızı görünür")
    pg.click("[data-pf-pace=fast]"); pg.wait_for_timeout(120)
    check(st(pg)["settings"]["gainPace"] == "fast" and pg.get_attribute("[data-pf-pace=fast]", "aria-pressed") == "true", "hız Hızlı kaydedildi")
    pg.click("[data-pf-goal=lose]"); pg.wait_for_timeout(120)
    d0 = st(pg)["deficit"]
    pg.click("#pfLoseBox button[aria-label='Açığı artır']"); pg.wait_for_timeout(120)
    check(st(pg)["deficit"] == min(1000, d0 + 50) and pg.inner_text("#pfDeficitVal") == str(min(1000, d0 + 50)), "açık +50 kcal (%s → %s)" % (d0, st(pg)["deficit"]))

    # 4) Arama
    pg.evaluate("pfHome()"); pg.wait_for_timeout(80)
    pg.fill("#pfSearch", "dinlenme"); pg.wait_for_timeout(120)
    hits = pg.evaluate("[...document.querySelectorAll('#pfSearchRes [data-pf-hit] b')].map(e => e.textContent)")
    check("Varsayılan dinlenme" in hits and not vis(pg, "#pfNav"), "arama 'dinlenme': Varsayılan dinlenme bulundu, bölüm listesi gizli: %s" % hits)
    pg.screenshot(path=os.path.join(SHOTS, "v59_profil_arama.png"))
    pg.click("#pfSearchRes [data-pf-hit]"); pg.wait_for_timeout(250)
    check(pg.text_content("#pfTitle") == "Antrenman ve mobilite" and vis(pg, "#setRest"), "sonuca dokununca Antrenman ve mobilite açıldı, dinlenme satırı görünür")
    pg.evaluate("pfHome()"); pg.fill("#pfSearch", "yedek dosyasi"); pg.wait_for_timeout(120)
    check("Yedek dosyası kaydet" in pg.inner_text("#pfSearchRes"), "arama Türkçe harfsiz yazımı da bulur ('yedek dosyasi')")
    pg.fill("#pfSearch", "qqqzzz"); pg.wait_for_timeout(120)
    check("Sonuç yok" in pg.inner_text("#pfSearchRes"), "sonuç yoksa açıklama")
    pg.fill("#pfSearch", ""); pg.wait_for_timeout(120)
    check(vis(pg, "#pfNav") and not vis(pg, "#pfSearchRes"), "arama silinince bölüm listesi geri gelir")

    # 5) Alt sayfada otomatik kayıt + Geri
    pg.click("[data-pf-open=me]"); pg.wait_for_timeout(120)
    pg.click("#setAge"); pg.fill("#setAge", "44")
    pg.click("#profilePage .pf-top button"); pg.wait_for_timeout(150)
    check(st(pg)["settings"]["age"] == 44 and "Kaydedildi" in pg.inner_text("#toastWrap"), "alt sayfada yazıp Geri: kaydedildi")

    # 6) Özetteki yedek satırı Veri ve yedekleme'yi açar
    pg.click("[data-pf-sum-backup]"); pg.wait_for_timeout(150)
    check(pg.text_content("#pfTitle") == "Veri ve yedekleme" and vis(pg, "#pfBackupStatus"), "özetteki yedek satırı → Veri ve yedekleme")
    pg.screenshot(path=os.path.join(SHOTS, "v59_profil_veri.png"))
    pg.evaluate("pfOpen('app')"); pg.wait_for_timeout(100)
    check(vis(pg, "[data-theme-opt=dark]") and vis(pg, "#setAnim"), "Görünüm ve dil: tema ve animasyon satırları")
    pg.evaluate("pfOpen('nutri')"); pg.wait_for_timeout(100)
    check(vis(pg, "#setDayStart") and vis(pg, "#missList"), "Beslenme: gün geçişi ve bulunamayan aramalar")
    pg.evaluate("pfOpen('about')"); pg.wait_for_timeout(100)
    check(vis(pg, "#pfAboutHealth") and vis(pg, "#pfMethod"), "Hakkında bölümü")
    # İlerleme'deki yağ oranı bağlantısı doğrudan Kilo ve hedefler'i açar
    pg.evaluate("closeProfile(); openProfile('body')"); pg.wait_for_timeout(100)
    check(pg.text_content("#pfTitle") == "Kilo ve hedefler", "openProfile('body') doğrudan bölümü açar")
    pg.evaluate("closeProfile()")

    # 7) İngilizce
    pg.evaluate("setLang('en'); openProfile()"); pg.wait_for_timeout(200)
    nav = pg.inner_text("#pfNav")
    check("Personal details" in nav and "Data and backup" in nav and pg.text_content("#pfTitle") == "Profile", "en: bölüm listesi ve başlık İngilizce")
    pg.fill("#pfSearch", "rest"); pg.wait_for_timeout(120)
    check(pg.evaluate("document.querySelectorAll('#pfSearchRes [data-pf-hit]').length") >= 1, "en: arama İngilizce metinde ('rest')")
    pg.evaluate("pfOpen('train')"); pg.wait_for_timeout(100)
    check(pg.text_content("#pfTitle") == "Training and mobility", "en: bölüm başlığı")
    pg.evaluate("pfHome()"); pg.wait_for_timeout(80)
    check("Today's target" in pg.inner_text("#pfSummary"), "en: özet kartı")
    pg.screenshot(path=os.path.join(SHOTS, "v59_profil_ana_en.png"))
    pg.evaluate("setLang('tr')"); pg.wait_for_timeout(100)
    c.close()

    # 8) Dar ekran ve aydınlık tema
    c, pg = ctx(320, "light")
    pg.evaluate("openProfile()"); pg.wait_for_timeout(200)
    check(pg.evaluate("document.documentElement.scrollWidth <= innerWidth && $('pfScroll').scrollWidth <= $('pfScroll').clientWidth"), "320 px: yatay taşma yok")
    pg.screenshot(path=os.path.join(SHOTS, "v59_profil_ana_acik_320.png"))
    pg.evaluate("pfOpen('body')"); pg.wait_for_timeout(100)
    check(pg.evaluate("$('pfScroll').scrollWidth <= $('pfScroll').clientWidth"), "320 px: Kilo ve hedefler taşmıyor")
    c.close()
    check(errs == [], "sayfa hatası yok: " + str(errs[:3]))
    b.close()
finally:
    srv.terminate()
print("BAŞARISIZ:" if fails else "TÜMÜ GEÇTİ", fails)
sys.exit(1 if (fails or errs) else 0)
