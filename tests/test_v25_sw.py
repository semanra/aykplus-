# v25: service worker. Uygulama bir kez açılıp önbellek dolduktan sonra sunucu 404 / 503 döndürse, internet olmasa
# ya da sunucu çok yavaş yanıt verse de (3 sn zaman aşımı) uygulama önbellekteki kopyayla açılmalı.
# Test kendi sunucusunu çalıştırır; sunucunun davranışı (normal / 404 / 503 / yavaş) testten değiştirilir.
import os, sys, time, threading, functools
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SHOTS = os.path.join(os.path.dirname(__file__), "shots")
os.makedirs(SHOTS, exist_ok=True)
PORT = 8782
import re
CACHE = re.search(r"const CACHE = '([^']+)'", open(os.path.join(REPO, "sw.js"), encoding="utf-8").read()).group(1)
MODE = {"m": "ok"}

class H(SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")   # tarayıcı önbelleği değil, service worker sınansın
        super().end_headers()
    def do_GET(self):
        m = MODE["m"]
        if m in ("404", "503"):
            body = ("<html><body><h1>" + m + " Hata sayfası</h1></body></html>").encode()
            self.send_response(int(m)); self.send_header("Content-Type", "text/html"); self.send_header("Content-Length", str(len(body)))
            self.end_headers(); self.wfile.write(body); return
        if m == "slow": time.sleep(10)
        return super().do_GET()

srv = ThreadingHTTPServer(("localhost", PORT), functools.partial(H, directory=REPO))
srv.daemon_threads = True
threading.Thread(target=srv.serve_forever, daemon=True).start()
from playwright.sync_api import sync_playwright
fails = []
URL = f"http://localhost:{PORT}/"
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
SPLASH = "document.addEventListener('DOMContentLoaded',()=>{const s=document.getElementById('splash'); if(s) s.remove();})"
APP_OK = "!!document.getElementById('tabNutrition') && typeof renderAll === 'function' && typeof USDA_FOODS !== 'undefined'"

def reload_ok(pg, label, max_s=8):
    t = time.time()
    try:
        pg.reload(wait_until="domcontentloaded", timeout=max_s * 1000)
        pg.wait_for_function(APP_OK, timeout=max_s * 1000)
        ok = True
    except Exception as e:
        ok = False; print("   ", str(e).splitlines()[0])
    dt = time.time() - t
    check(ok and "Hata sayfası" not in pg.content(), f"{label}: uygulama önbellekten açıldı ({dt:.1f} sn)")
    return dt

try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(color_scheme="dark", viewport={"width": 375, "height": 812}, is_mobile=True, has_touch=True)
    ctx.add_init_script(SPLASH)
    pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))

    # Kurulum: ilk açılış, service worker yüklenir ve dosyaları önbelleğe alır
    pg.goto(URL); pg.wait_for_function(APP_OK)
    pg.evaluate("navigator.serviceWorker.ready.then(() => true)")
    pg.wait_for_function(f"""caches.keys().then(k => window.__k = k) && (window.__k || []).includes('{CACHE}')""", timeout=15000, polling=200)
    pg.reload(); pg.wait_for_function(APP_OK)
    check(pg.evaluate("!!navigator.serviceWorker.controller"), "service worker sayfayı yönetiyor")
    n = pg.evaluate("caches.open('" + CACHE + "').then(c => c.keys()).then(k => k.length)")
    check(n >= 9, f"tüm dosyalar önbellekte ({n})")

    # 1) Sunucu 404 → önbellek
    MODE["m"] = "404"; reload_ok(pg, "sunucu 404")
    # 2) Sunucu 503 → önbellek
    MODE["m"] = "503"; reload_ok(pg, "sunucu 503")
    pg.screenshot(path=os.path.join(SHOTS, "v25_sw_503.png"))
    # 3) Sunucu 404 iken foods.js (sayfa olmayan istek) yine JavaScript gelmeli, HTML değil
    js = pg.evaluate("fetch('foods.js').then(r => r.text()).then(t => t.slice(0, 40))")
    check(not js.lstrip().startswith("<"), f"hata sırasında foods.js önbellekten (HTML değil): {js[:25]!r}")
    # 4) Sunucu 10 sn gecikiyor → 3 sn zaman aşımından sonra önbellekten (sayfa + foods.js toplam ~3 sn, 6 değil)
    MODE["m"] = "slow"
    dt = reload_ok(pg, "sunucu 10 sn gecikmeli", max_s=8)
    check(2.5 <= dt < 5, f"yavaş sunucuda ~3 sn beklenip önbellekten açıldı ({dt:.1f} sn)")
    MODE["m"] = "ok"
    # 5) Çevrimdışı → önbellek
    MODE["m"] = "ok"; ctx.set_offline(True)
    reload_ok(pg, "çevrimdışı")
    # Önbellekte olmayan bir dosya çevrimdışıyken HTML döndürmemeli (eskiden index.html dönüyordu)
    miss = pg.evaluate("fetch('olmayan-dosya.js').then(r => r.status + ':' + r.headers.get('content-type'), e => 'ağ hatası')")
    check(miss == "ağ hatası", f"önbellekte olmayan dosyaya index.html dönmüyor ({miss})")
    ctx.set_offline(False)
    # 6) Sunucu normale döndükten sonra uygulama çalışır
    reload_ok(pg, "sunucu normal")
    check(not errs, f"sayfa hatası yok {errs[:1]}")
    ctx.close()

    # 7) Önbellek yokken (ilk kurulum) 404: sunucunun yanıtı gösterilir (sonsuza dek beklemez)
    MODE["m"] = "404"
    ctx = b.new_context(); pg = ctx.new_page()
    r = pg.goto(URL)
    check(r is not None and r.status == 404, "önbellek yokken sunucunun 404 yanıtı geliyor")
    ctx.close()
    MODE["m"] = "ok"
    b.close()
finally:
    srv.shutdown()
print(f"{'HATA: ' + str(len(fails)) + ' kontrol başarısız' if fails else 'TÜM KONTROLLER GEÇTİ'}")
sys.exit(1 if fails else 0)
