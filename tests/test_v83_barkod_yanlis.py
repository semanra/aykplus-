# v83: barkod yanlış ürünü getirirse "Bu ürün değil, elle gir" → boş etiket formu, ürün bu barkodla kaydedilir;
# sonraki taramada kayıtlı ürün internetsiz bulunur; değerler gram başına saklanır (40 g = 100 g değerinin %40'ı)
import os, sys, subprocess, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PORT = 8839
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT)], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
URL = f"http://localhost:{PORT}/index.html"
MOCK = """() => { fetchOFF = async () => ({ product_name: 'Yanlış Ürün', brands: 'X', nutriments: { proteins_100g: 5, carbohydrates_100g: 60, fat_100g: 10, 'energy-kcal_100g': 350 } });
  if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = () => new Promise(() => {}); }"""
try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    for lang in ("tr", "en"):
        c = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}, locale="tr-TR" if lang == "tr" else "en-US", service_workers="block")
        c.add_init_script(TEST_INIT)
        pg = c.new_page(); pg.on("pageerror", lambda e: errs.append(str(e))); pg.goto(URL)
        pg.wait_for_function("window.aykBooted === true")
        if lang == "en": pg.evaluate("setLang('en'); renderAll()")
        pg.evaluate("state.activeTab = 'nutrition'; state.nutriView = 'foods'; renderAll()")
        pg.evaluate(MOCK)
        pg.evaluate("async () => { openBarcode(); await onBarcode('8690000000123'); }")
        btn = pg.locator("[data-bc-wrong]")
        check(btn.count() == 1 and btn.is_visible(), f"{lang}: sonuç kartında 'Bu ürün değil' düğmesi var")
        h = btn.evaluate("e => e.getBoundingClientRect().height")
        check(h >= 44, f"{lang}: düğme ≥ 44 px ({h})")
        txt = btn.inner_text()
        if lang == "en": check(not any(ch in txt for ch in "çğıöşüİ"), f"en: düğme İngilizce: {txt}")
        btn.click(); pg.wait_for_timeout(150)
        st = pg.evaluate("""() => ({ open: !$('customFoodModal').classList.contains('hidden'), bc: $('barcodeModal') ? $('barcodeModal').classList.contains('hidden') : true,
          name: $('cfName').value, k: $('cfK').value, p: $('cfP').value, hint: $('cfHint').textContent })""")
        check(st["open"] and st["bc"], f"{lang}: etiket formu açıldı, barkod penceresi kapandı")
        check(st["name"] == "" and st["k"] == "" and st["p"] == "", f"{lang}: form boş (yanlış ürünün adı/değerleri yok): {st}")
        check("8690000000123" in st["hint"], f"{lang}: açıklamada barkod var")
        if lang == "en": check(not any(ch in st["hint"] for ch in "çğıöşüİ"), "en: açıklama İngilizce")
        pg.fill("#cfName", "Doğru Bisküvi")
        pg.fill("#cfK", "450"); pg.fill("#cfP", "8"); pg.fill("#cfC", "65"); pg.fill("#cfF", "18")
        pg.evaluate("void saveCustomFood()"); pg.wait_for_timeout(250)
        f = pg.evaluate("state.customFoods['custom_bc_8690000000123']")
        check(f is not None and f["barcode"] == "8690000000123" and "Doğru Bisküvi" in f["name"], f"{lang}: doğru ürün bu barkodla kaydedildi")
        check(abs(f["p"] * 40 - 3.2) < 1e-9 and abs(f["kcal"] * 40 - 180) < 1e-9, f"{lang}: gram başına saklanır (40 g → 3,2 g protein, 180 kcal)")
        # tekrar tarama: kayıtlı ürün internetsiz bulunur
        pg.evaluate("() => { fetchOFF = async () => { throw new Error('ağ yok'); }; }")
        pg.evaluate("async () => { openBarcode(); await onBarcode('8690000000123'); }")
        pg.wait_for_timeout(150)
        check(pg.evaluate("foodUI.sel") == "custom_bc_8690000000123", f"{lang}: sonraki taramada kayıtlı ürün seçilir")
        c.close()
    check(errs == [], "sayfa hatası yok: " + str(errs[:3]))
    b.close()
finally:
    srv.terminate()
print("BAŞARISIZ:" if fails else "TÜMÜ GEÇTİ", fails)
sys.exit(1 if (fails or errs) else 0)
