# v37: eski sürümlerden kalan yük. Küçültülmemiş eski profil fotoğrafı açılışta / yedek geri yüklenince küçültülür;
# ilk sürümlerin kaydı (ayk_plus_v4_state) yalnızca bugünkü kayıt sorunsuz okunduysa silinir. Diğer veriye dokunulmaz.
import os, sys, json, subprocess, time
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8797'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
URL = "http://localhost:8797/index.html"
KEY, V4 = "ayk_plus_v5_state", "ayk_plus_v4_state"
def st(pg): return pg.evaluate(f"JSON.parse(localStorage.getItem('{KEY}'))")
def ls(pg, k): return pg.evaluate(f"localStorage.getItem('{k}')")
# Telefondan seçilmiş, küçültülmemiş fotoğraf yerine: 1200×900 gürültülü JPEG (birkaç yüz bin karakter)
BIG_JS = """() => { const c = document.createElement('canvas'); c.width = 1200; c.height = 900; const x = c.getContext('2d');
  const d = x.createImageData(1200, 900); for (let i = 0; i < d.data.length; i++) d.data[i] = (i * 2654435761 >>> 13) & 255;
  x.putImageData(d, 0, 0); return c.toDataURL('image/jpeg', 0.95); }"""
LEGACY = {"weight": 88, "settings": {"splash": False}, "weightLogs": [{"ts": 1700000000000, "weight": 90}],
          "customFoods": {"custom_x": {"name": "Ev yoğurdu", "p": 0.04, "c": 0.05, "f": 0.03, "unit": "g"}}}

try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    def page():
        ctx = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844})
        ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.getElementById('splash'); if(s) s.remove();})")
        pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(URL); pg.wait_for_timeout(300)
        return ctx, pg
    def seed(pg, items):
        pg.evaluate("items => { localStorage.clear(); for (const k in items) localStorage.setItem(k, items[k]); }", items)
        pg.reload(); pg.wait_for_timeout(1200)

    ctx, pg = page()
    big = pg.evaluate(BIG_JS)
    check(len(big) > 300000, f"deneme fotoğrafı büyük ({len(big)} karakter)")

    # ===== 1) Bugünkü kayıtta büyük fotoğraf + eski v4 kaydı =====
    s5 = dict(LEGACY, customIconDataUrl=big)
    v4 = json.dumps({"weight": 70, "customIconDataUrl": big, "meals": []})
    seed(pg, {KEY: json.dumps(s5), V4: v4})
    s = st(pg); ph = s["customIconDataUrl"]
    check(ph.startswith("data:image/jpeg") and len(ph) < 150000, f"büyük fotoğraf küçültüldü ({len(big)} → {len(ph)} karakter)")
    sz = pg.evaluate("(() => { const i = new Image(); i.src = state.customIconDataUrl; return new Promise(r => i.onload = () => r([i.naturalWidth, i.naturalHeight])); })()")
    check(sz == [320, 320], f"yeni fotoğraf 320×320 ({sz})")
    check(pg.is_visible("#profileAvatar") and pg.get_attribute("#profileAvatar", "src") == ph, "sağ üstte küçültülmüş fotoğraf görünüyor")
    check(s["weight"] == 88 and s["weightLogs"] == LEGACY["weightLogs"] and s["customFoods"]["custom_x"]["name"] == "Ev yoğurdu", "diğer veriler değişmedi")
    check(ls(pg, V4) is None, "eski v4 kaydı silindi")
    pg.evaluate("openProfile()"); pg.wait_for_timeout(200)
    pct = int(pg.inner_text("#pfStorageTxt").strip("%").split()[0])
    check(pct <= 5, f"kayıt alanı göstergesi düştü (%{pct})")
    pg.evaluate("closeSettings()")

    # Yeniden açılış: küçük fotoğrafa tekrar dokunulmaz
    pg.reload(); pg.wait_for_timeout(800)
    check(st(pg)["customIconDataUrl"] == ph, "küçük fotoğraf ikinci açılışta aynen kaldı")

    # ===== 2) Yalnızca v4 kaydı (ilk taşıma açılışı): v4 bu açılışta silinmez, sonraki açılışta silinir =====
    seed(pg, {V4: json.dumps({"weight": 77, "customIconDataUrl": big, "weightLogs": [{"ts": 1600000000000, "weight": 80}], "meals": [{"name": "Kahvaltı", "items": []}]})})
    s = st(pg)
    check(s and s["weight"] == 77 and s["weightLogs"][0]["weight"] == 80, "v4 verisi bugünkü kayda taşındı")
    check(ls(pg, V4) is not None, "taşıma açılışında v4 kaydına dokunulmadı")
    check(len(s["customIconDataUrl"]) < 150000, "taşınan eski logo da küçültüldü")
    pg.reload(); pg.wait_for_timeout(800)
    check(ls(pg, V4) is None and st(pg)["weight"] == 77, "sonraki açılışta v4 silindi, veri yerinde")

    # ===== 3) Bugünkü kayıt okunamazsa v4'e dokunulmaz =====
    seed(pg, {KEY: "{bozuk", V4: v4})
    check(ls(pg, V4) == v4, "kayıt okunamadığında v4 kaydı korunuyor")
    errs[:] = [e for e in errs if "JSON" not in e]

    # ===== 4) Açılamayan (bozuk) büyük fotoğraf silinmez, aynen kalır =====
    junk = "data:image/jpeg;base64," + "A" * 200000
    seed(pg, {KEY: json.dumps(dict(LEGACY, customIconDataUrl=junk))})
    check(st(pg)["customIconDataUrl"] == junk, "açılamayan fotoğrafa dokunulmadı (silinmedi)")

    # ===== 5) Küçük fotoğraf hiç değişmez =====
    small = pg.evaluate("(() => { const c = document.createElement('canvas'); c.width = c.height = 40; c.getContext('2d').fillRect(0,0,20,20); return c.toDataURL('image/png'); })()")
    seed(pg, {KEY: json.dumps(dict(LEGACY, customIconDataUrl=small))})
    check(st(pg)["customIconDataUrl"] == small, "küçük fotoğraf (PNG) olduğu gibi kaldı")

    # ===== 6) Büyük fotoğraflı eski yedeği geri yükleme =====
    pg.evaluate("t => void restoreFromText(t)", json.dumps(dict(LEGACY, weight=95, customIconDataUrl=big, meals=[{"name": "Öğle", "items": []}])))
    pg.wait_for_timeout(200); pg.click("#uiDlgOk"); pg.wait_for_timeout(1000)
    s = st(pg)
    check(s["weight"] == 95 and len(s["customIconDataUrl"]) < 150000 and s["customIconDataUrl"].startswith("data:image/jpeg"), "yedekten gelen büyük fotoğraf küçültüldü")

    # ===== 7) Yeni fotoğraf yükleme hâlâ çalışıyor (dosyadan) =====
    pg.evaluate("state.customIconDataUrl = ''; renderAll(); openProfile()"); pg.wait_for_timeout(200)
    import base64
    pg.set_input_files("#pfPhotoInput", files=[{"name": "a.jpg", "mimeType": "image/jpeg", "buffer": base64.b64decode(big.split(",")[1])}])
    pg.wait_for_timeout(1000)
    ph2 = st(pg)["customIconDataUrl"]
    check(ph2.startswith("data:image/jpeg") and len(ph2) < 150000 and ph2 == s["customIconDataUrl"], "dosyadan yeni fotoğraf yüklenip küçültülüyor")
    ctx.close()

    check(not errs, f"sayfa hatası yok ({errs[:3]})")
    b.close()
finally:
    srv.terminate()
print(f"\n{len(fails)} hata" if fails else "\nHEPSİ GEÇTİ")
sys.exit(1 if fails else 0)
