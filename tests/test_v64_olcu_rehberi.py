# v64: ölçü rehberi ("Nasıl ölçerim?")
# 1) Görsel dosyaları: img/olcu/<anahtar>.webp, her ölçü için bir tane, küçük
# 2) Ölçü penceresi → rehber: genel kurallar, 6 kart (görsel + 3 adım + sık hata), atlama düğmeleri;
#    "Ölçülere dön" yazılan değerleri korur, kaydetme çalışır; dokunma alanları ≥ 44 px
# 3) Profil'den açılır ("Kapat" ile kapanır); yeniden açılan ölçü penceresi eski taslağı getirmez
# 4) İngilizcede rehber metni İngilizce (Türkçe harf yok); aydınlık temada ekran görüntüsü
# 5) Görsel yüklenemezse (404) kutusu kaldırılır, metin kalır
import os, sys, subprocess, time, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SHOTS = os.path.join(REPO, "tests", "shots"); os.makedirs(SHOTS, exist_ok=True)
PORT = 8821
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT)], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
URL = f"http://localhost:{PORT}/index.html"
def boot(pg): pg.wait_for_function("window.aykBooted === true"); pg.wait_for_timeout(80)
KEYS = ["bel", "kalca", "gogus", "kol", "bacak", "boyun"]
IMG_DIR = os.path.join(REPO, "img", "olcu")
LOADED = """() => Promise.all([...document.querySelectorAll('[data-olcu-img] img')].map(i => { i.loading = 'eager';
  return new Promise(r => { const t0 = Date.now(); (function w() { if ((i.complete && i.naturalWidth) || !i.isConnected || Date.now() - t0 > 8000) r(i); else setTimeout(w, 50); })(); }); }))
  .then(a => a.map(i => ({ ok: i.isConnected && i.naturalWidth === 720 && i.naturalHeight === 720, alt: i.alt })))"""
SMALL = """sel => [...document.querySelectorAll(sel)].filter(e => e.offsetParent).map(e => { const r = e.getBoundingClientRect(); return [e.textContent.trim().slice(0, 20), Math.round(r.height)]; }).filter(x => x[1] < 44)"""
try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    def ctx(locale="tr-TR", scheme="dark"):
        c = b.new_context(color_scheme=scheme, viewport={"width": 390, "height": 844}, locale=locale, service_workers="block")
        c.add_init_script(TEST_INIT)
        pg = c.new_page(); pg.on("pageerror", lambda e: errs.append(str(e))); pg.goto(URL); boot(pg)
        return c, pg

    # --- 1) Dosyalar
    files = sorted(f for f in os.listdir(IMG_DIR) if f.endswith(".webp"))
    check(files == sorted(k + ".webp" for k in KEYS), "her ölçü için tek görsel: " + str(files))
    big = [f for f in files if os.path.getsize(os.path.join(IMG_DIR, f)) > 100_000]
    check(not big, "her görsel 100 KB'tan küçük: " + str(big))

    # --- 2) Ölçü penceresinden rehber
    c, pg = ctx()
    check(pg.evaluate("MEASURES.map(m => m[0]).join()") == ",".join(KEYS) and pg.evaluate("Object.keys(MEASURE_GUIDE).join()") == ",".join(KEYS),
          "rehberde her ölçünün kartı var (MEASURES ile aynı sıra)")
    pg.evaluate("switchTab('progress'); openMeasureModal()"); pg.wait_for_timeout(150)
    check(pg.locator("#chartModal [data-measure-guide]").is_visible(), "ölçü penceresinde \"Nasıl ölçerim?\" düğmesi")
    pg.fill("#ms_bel", "88,5"); pg.fill("#ms_kol", "")
    pg.click("#chartModal [data-measure-guide]"); pg.wait_for_timeout(150)
    check(pg.inner_text("#chartTitle") == "Nasıl ölçerim?", "başlık: Nasıl ölçerim?")
    check(pg.locator("[data-mg]").count() == 6, "6 ölçü kartı")
    check(pg.locator("[data-measure-guide-body] ul li").count() == 7, "7 genel kural")
    check(pg.evaluate("[...document.querySelectorAll('[data-mg]')].every(s => s.querySelectorAll('ol li').length === 3 && /Sık hata:/.test(s.textContent))"),
          "her kartta 3 adım ve sık hata")
    imgs = pg.evaluate(LOADED)
    check(len(imgs) == 6 and all(i["ok"] for i in imgs), "6 görsel yüklendi (720×720): " + str([i for i in imgs if not i["ok"]]))
    check(imgs and imgs[0]["alt"] == "Bel: mezuranın yeri", "görsel alt metni: " + (imgs[0]["alt"] if imgs else ""))
    txt = pg.inner_text("[data-measure-guide-body]")
    check("göbek deliği" in txt and "gevşek" in txt, "kararlar metinde: bel göbek deliği hizası, kol gevşek")
    small = pg.evaluate(SMALL, "[data-measure-guide-body] button")
    check(small == [], "rehberdeki düğmeler ≥ 44 px: " + str(small))
    pg.screenshot(path=os.path.join(SHOTS, "v64_rehber_ust.png"))
    pg.click("[data-mg-chip='gogus']"); pg.wait_for_timeout(700)
    top = pg.evaluate("document.getElementById('mg_gogus').getBoundingClientRect().top")
    check(0 <= top < 200, f"atlama düğmesi karta kaydırır (göğüs kartı üstü {round(top)})")
    pg.screenshot(path=os.path.join(SHOTS, "v64_rehber_gogus.png"))
    pg.click("[data-mg-back]"); pg.wait_for_timeout(150)
    check(pg.input_value("#ms_bel") == "88,5" and pg.input_value("#ms_kol") == "", "\"Ölçülere dön\" yazılan değerleri korur")
    pg.evaluate("saveMeasurement()"); pg.wait_for_timeout(150)
    check(pg.evaluate("state.measurements[state.measurements.length - 1].bel") == 88.5, "rehberden dönünce kaydetme çalışır")
    pg.evaluate("openMeasureModal()"); pg.wait_for_timeout(100)
    check(pg.input_value("#ms_bel") == "88,5", "yeni açılan pencere son kaydı gösterir")
    pg.evaluate("closeModal('chartModal')")

    # --- 3) Profil'den
    pg.evaluate("openProfile()"); pg.wait_for_timeout(200)
    btn = pg.locator("#profilePage button[onclick='openMeasureGuide()']")
    check(btn.count() == 1 and btn.is_visible(), "Profil → Vücut ölçülerim altında \"Nasıl ölçerim?\"")
    h = btn.bounding_box()["height"] if btn.count() else 0
    check(h >= 44, f"Profil düğmesi ≥ 44 px ({h})")
    btn.click(); pg.wait_for_timeout(150)
    check(pg.locator("#chartModal").is_visible() and pg.locator("[data-mg-close]").is_visible() and pg.locator("[data-mg-back]").count() == 0,
          "Profil'den açılınca \"Kapat\" var, \"Ölçülere dön\" yok")
    pg.click("[data-mg-close]"); pg.wait_for_timeout(100)
    check(not pg.locator("#chartModal").is_visible(), "Kapat pencereyi kapatır")
    # rehberden "Kapat" (X) ile çıkıldıysa taslak sonraki açılışa taşınmaz
    pg.evaluate("openMeasureModal()"); pg.fill("#ms_boyun", "55"); pg.evaluate("openMeasureGuide(true)"); pg.evaluate("closeModal('chartModal'); openMeasureModal()")
    check(pg.input_value("#ms_boyun") == "", "X ile kapatılan taslak yeniden açılışta gelmez")
    pg.evaluate("closeModal('chartModal')")
    c.close()

    # --- 4) İngilizce + aydınlık tema
    c, pg = ctx(locale="en-US", scheme="light")
    pg.evaluate("setLang('en'); switchTab('progress')"); pg.wait_for_timeout(200)
    pg.evaluate("openMeasureGuide()"); pg.wait_for_timeout(200)
    txt = pg.inner_text("[data-measure-guide-body]") + pg.inner_text("#chartTitle")
    tr = re.findall(r"\S*[çğıöşüÇĞİÖŞÜ]\S*", txt)
    check(not tr, "İngilizcede rehberde Türkçe kelime yok: " + str(tr[:5]))
    check("How do I measure?" in txt and "Common mistake:" in txt and "navel" in txt, "İngilizce metin görünür")
    check(pg.evaluate("document.querySelector('[data-olcu-img] img').alt") == "Waist: where the tape goes", "İngilizce alt metin")
    pg.evaluate(LOADED); pg.wait_for_timeout(100)
    pg.screenshot(path=os.path.join(SHOTS, "v64_rehber_en_acik.png"))
    pg.evaluate("setUnits('imperial'); openMeasureModal()"); pg.wait_for_timeout(100)
    check(pg.locator("#chartModal [data-measure-guide]").inner_text().strip() == "How do I measure?", "imperial'de de düğme var")
    c.close()

    # --- 5) Görsel yüklenemezse
    c, pg = ctx()
    pg.route("**/img/olcu/**", lambda r: r.fulfill(status=404, body="yok"))
    pg.evaluate("openMeasureGuide()"); pg.evaluate("document.querySelectorAll('[data-olcu-img] img').forEach(i => { i.loading = 'eager'; })"); pg.wait_for_timeout(800)
    check(pg.locator("[data-olcu-img]").count() == 0 and pg.locator("[data-mg] ol li").count() == 18, "görsel yüklenemezse kutusu kalkar, adımlar kalır")
    c.close()
    check(errs == [], "sayfa hatası yok: " + str(errs[:3]))
    b.close()
finally:
    srv.terminate()
print("BAŞARISIZ:" if fails else "TÜMÜ GEÇTİ", fails)
sys.exit(1 if (fails or errs) else 0)
