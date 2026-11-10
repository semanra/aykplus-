# v12: sol üstte sekme adı + açılışta kayarak kaybolan AYK+, "Kaydedildi" yazısı kaldırıldı,
# eski "uygulama içi logo" → profil fotoğrafı (sağ üstte yuvarlak), fotoğraf küçültülerek kaydedilir.
import os, sys, base64
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SHOTS = os.path.join(os.path.dirname(__file__), "shots")
os.makedirs(SHOTS, exist_ok=True)
import subprocess, time, json
srv = subprocess.Popen(['python3', '-m', 'http.server', '8765'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; native = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
def st(pg): return pg.evaluate("JSON.parse(localStorage.getItem('ayk_plus_v5_state'))")
def ov(pg):
    w = pg.evaluate("[document.documentElement.scrollWidth, document.documentElement.clientWidth]"); return w[0] <= w[1]
def brand(pg): return pg.evaluate("(() => { const b = $('brandTag'); const cs = getComputedStyle(b); return { disp: cs.display, op: +cs.opacity, w: b.getBoundingClientRect().width }; })()")
# Küçük kırmızı 1x1 PNG (eski "logo" kaydını taklit etmek için)
PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="

try:
  with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={"width": 375, "height": 812}, device_scale_factor=2, is_mobile=True, has_touch=True)
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("dialog", lambda d: (native.append(d.message), d.accept()))
    # ---------- Açılış: sekme adı + AYK+ (splash açıkken, bu testte splash atlanmıyor)
    pg.goto("http://localhost:8765/index.html"); pg.wait_for_timeout(1300)
    check(pg.locator("#headerLogo").count() == 0 and pg.locator("#saveBadge").count() == 0, "sol üstte logo resmi ve 'Kaydedildi' yazısı yok")
    check(pg.inner_text("#tabTitle").upper() == "BESLENME", "açılışta sekme adı yazıyor (BESLENME)")
    bb = brand(pg)
    check(bb["disp"] != "none" and bb["op"] > 0.9 and bb["w"] > 40, "açılışta yanında AYK+ görünüyor")
    pg.screenshot(path=SHOTS + "/v12_launch.png", clip={"x": 0, "y": 0, "width": 375, "height": 120})
    pg.wait_for_timeout(2300)
    bb = brand(pg)
    check(bb["op"] < 0.05 and bb["w"] < 1, "birkaç saniye sonra AYK+ kayarak kayboldu")
    pg.screenshot(path=SHOTS + "/v12_after.png", clip={"x": 0, "y": 0, "width": 375, "height": 120})
    for tab, name in [("gym", "ANTRENMAN"), ("mobility", "MOBİLİTE"), ("progress", "İLERLEME"), ("nutrition", "BESLENME")]:
        pg.evaluate(f"switchTab('{tab}')"); pg.wait_for_timeout(120)
        check(pg.inner_text("#tabTitle").upper() == name and brand(pg)["w"] < 1, f"{name} sekmesinde başlık doğru, AYK+ geri gelmiyor")
    pg.evaluate("switchTab('gym')"); pg.wait_for_timeout(100)
    check(pg.evaluate("getComputedStyle($('tabTitle')).fontFamily").startswith("AYKDisplay") or "AYKDisplay" in pg.evaluate("getComputedStyle($('tabTitle')).fontFamily"), "başlık uygulamanın yazı tipinde")
    pg.screenshot(path=SHOTS + "/v12_gym_header.png", clip={"x": 0, "y": 0, "width": 375, "height": 120})
    # Kayıt hâlâ otomatik
    pg.evaluate("state.waterLiters = 1.25; renderAll()")
    check(st(pg)["waterLiters"] == 1.25, "'Kaydedildi' yazısı olmadan kayıt otomatik devam ediyor")
    # Yeniden açılışta tekrar görünür (her açılışta bir kez)
    pg.reload(); pg.wait_for_timeout(1300)
    check(brand(pg)["op"] > 0.9 and pg.inner_text("#tabTitle").upper() == "ANTRENMAN", "uygulama yeniden açılınca AYK+ yine bir kez görünüyor, son sekmenin adıyla")
    pg.wait_for_timeout(2300)

    # ---------- Açılış animasyonu kapalıysa AYK+ hiç görünmez
    s = st(pg); s["settings"]["splash"] = False
    pg.evaluate("s=>localStorage.setItem('ayk_plus_v5_state', s)", json.dumps(s)); pg.reload(); pg.wait_for_timeout(200)
    check(brand(pg)["disp"] == "none" and pg.locator("#splash").count() == 0, "açılış animasyonu kapalıyken AYK+ hiç görünmüyor")

    # ---------- Profil fotoğrafı
    check(pg.is_visible("#profileIcon") and not pg.is_visible("#profileAvatar"), "fotoğraf yokken sağ üstte kişi simgesi")
    pg.click("#profileBtn"); pg.wait_for_timeout(150)
    t = pg.inner_text("#profilePage")
    check("Profil fotoğrafı" in t and "UYGULAMA İÇİ LOGO" not in t and "AYK+ v" in t, "Profilde 'Profil fotoğrafı' var, eski logo bölümü yok, sürüm etiketi görünüyor")
    check(not pg.is_visible("#pfPhotoRemove"), "fotoğraf yokken Kaldır düğmesi gizli")
    big = os.path.join(REPO, "anatomy.jpg")
    pg.set_input_files("#pfPhotoInput", big); pg.wait_for_timeout(700)
    url = pg.evaluate("state.customIconDataUrl")
    dims = pg.evaluate("u => new Promise(r => { const i = new Image(); i.onload = () => r([i.naturalWidth, i.naturalHeight]); i.src = u; })", url)
    check(url.startswith("data:image/jpeg") and len(url) < 120000 and dims == [320, 320], f"fotoğraf 320×320 JPEG'e küçültülüp kaydedildi ({len(url)//1024} KB, kaynak {os.path.getsize(big)//1024} KB)")
    check(pg.is_visible("#profileAvatar") and not pg.is_visible("#profileIcon") and pg.is_visible("#pfAvatar"), "fotoğraf sağ üstte ve Profilde görünüyor")
    check(pg.is_visible("#pfPhotoRemove") and pg.inner_text("#pfPhotoBtnText") == "Değiştir", "fotoğraf varken Değiştir / Kaldır")
    check(st(pg)["customIconDataUrl"] == url, "fotoğraf kalıcı olarak kaydedildi")
    pg.screenshot(path=SHOTS + "/v12_profile_photo.png", clip={"x": 0, "y": 0, "width": 375, "height": 330})
    # Kaldır + geri al
    pg.click("#pfPhotoRemove"); pg.wait_for_timeout(150)
    check(st(pg)["customIconDataUrl"] == "" and pg.is_visible("#pfAvatarIcon"), "Kaldır fotoğrafı siliyor")
    pg.locator("#toastWrap button", has_text="Geri al").click(); pg.wait_for_timeout(150)
    check(st(pg)["customIconDataUrl"] == url and pg.is_visible("#pfAvatar"), "Geri al fotoğrafı geri getiriyor")
    # Bozuk dosya: temalı uyarı, eski fotoğraf korunur
    bad = os.path.join(os.path.dirname(SHOTS), "_bozuk.jpg")
    open(bad, "wb").write(b"bu bir resim degil")
    pg.set_input_files("#pfPhotoInput", bad); pg.wait_for_timeout(500)
    os.remove(bad)
    check(pg.is_visible("#uiDialog") and "yüklenemedi" in pg.inner_text("#uiDlgTitle") and st(pg)["customIconDataUrl"] == url, "bozuk dosyada temalı uyarı, eski fotoğraf korunuyor")
    pg.click("#uiDlgOk")
    pg.click("#profilePage button[aria-label=Geri]"); pg.wait_for_timeout(150)
    check(not pg.is_visible("#profilePage"), "fotoğraf değişikliği profil formunu 'kaydedilmedi' saymıyor")
    pg.evaluate("switchTab('gym')"); pg.wait_for_timeout(100)
    pg.screenshot(path=SHOTS + "/v12_gym_avatar.png", clip={"x": 0, "y": 0, "width": 375, "height": 120})

    # ---------- Eski kayıt: daha önce yüklenmiş "logo" profil fotoğrafı olarak görünür, kaybolmaz
    legacy = {"customIconDataUrl": PNG, "activeTab": "progress", "settings": {"splash": False}, "weight": 90}
    pg.evaluate("s=>localStorage.setItem('ayk_plus_v5_state', s)", json.dumps(legacy)); pg.reload(); pg.wait_for_timeout(300)
    check(pg.get_attribute("#profileAvatar", "src") == PNG and pg.is_visible("#profileAvatar"), "eski logo profil fotoğrafı olarak görünüyor")
    check(st(pg)["customIconDataUrl"] == PNG and st(pg)["weight"] == 90, "eski kayıt bozulmadı")
    check(pg.inner_text("#tabTitle").upper() == "İLERLEME", "eski kayıtta son sekmenin adı yazıyor")
    # Paylaşım kartı profil fotoğrafını değil uygulama logosunu kullanır
    check(pg.evaluate("buildShareCanvas.toString().includes('img.src = \"icon.png\"')"), "paylaşım kartında AYK+ logosu kullanılıyor")

    # ---------- 320 px ekranda başlık sığıyor
    pg.set_viewport_size({"width": 320, "height": 700})
    for tab in ["nutrition", "gym", "mobility", "progress"]:
        pg.evaluate(f"switchTab('{tab}')"); pg.wait_for_timeout(80)
        r = pg.evaluate("[$('tabTitle').getBoundingClientRect().right, $('profileBtn').getBoundingClientRect().left]")
        check(r[0] <= r[1] and ov(pg), f"320 px: {tab} başlığı profil düğmesine çarpmıyor, taşma yok")
    hb = pg.locator("#profileBtn").bounding_box()
    check(hb["width"] >= 44 and hb["height"] >= 44, "profil düğmesi en az 44 px")
    b.close()
finally:
    srv.terminate()
print("native dialogs:", native)
print("ERRORS:", errs or "none")
print(f"{'HATA: ' + str(len(fails)) + ' kontrol başarısız' if fails else 'TÜM KONTROLLER GEÇTİ'}")
sys.exit(1 if errs or fails or native else 0)
