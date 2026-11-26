# v84: Besinler kartında bir besin en son kaç gram/ml/adet eklendiyse bir dahakine o miktarla açılır (state.foodAmts)
import os, sys, subprocess, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PORT = 8840
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT)], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
URL = f"http://localhost:{PORT}/index.html"
def boot(pg): pg.wait_for_function("window.aykBooted === true"); pg.wait_for_timeout(80)
try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    c = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}, locale="tr-TR", service_workers="block")
    c.add_init_script(TEST_INIT)
    pg = c.new_page(); pg.on("pageerror", lambda e: errs.append(str(e))); pg.goto(URL); boot(pg)
    pg.evaluate("state.activeTab = 'nutrition'; state.nutriView = 'foods'; renderAll()")
    fid = pg.evaluate("Object.keys(getFoodDB()).find(id => { const f = getFoodDB()[id]; return f.unit === 'g' && round1(num(f.def, 0)) !== 40; })")
    d = pg.evaluate("id => round1(num(getFoodDB()[id].def, 1))", fid)
    pg.evaluate("id => selectFood(id)", fid)
    check(pg.evaluate("foodUI.amt") == d, f"ilk seçim varsayılan miktarla ({d})")
    # kartta 40 yaz, ekle
    pg.fill("#foodAmt", "40"); pg.wait_for_timeout(50)
    pg.evaluate("addSelectedFood()"); pg.wait_for_timeout(100)
    check(pg.evaluate("id => state.foodAmts[id]", fid) == 40, "eklenen miktar kaydedildi (40)")
    pg.evaluate("id => selectFood(id)", fid)
    check(pg.evaluate("foodUI.amt") == 40 and pg.input_value("#foodAmt") == "40", "ikinci seçimde 40 hazır geliyor")
    # kalıcı: yeniden açılışta da
    pg.wait_for_timeout(2500); pg.reload(); boot(pg)
    check(pg.evaluate("id => state.foodAmts[id]", fid) == 40, "yeniden açılışta korunuyor")
    pg.evaluate("id => { state.activeTab = 'nutrition'; state.nutriView = 'foods'; renderAll(); selectFood(id); }", fid)
    check(pg.evaluate("foodUI.amt") == 40, "yeniden açılışta kart 40 ile açılıyor")
    # başka besin etkilenmez
    other = pg.evaluate("id => Object.keys(getFoodDB()).find(x => x !== id && getFoodDB()[x].unit === 'g')", fid)
    pg.evaluate("id => selectFood(id)", other)
    check(pg.evaluate("id => foodUI.amt === round1(num(getFoodDB()[id].def, 1))", other), "başka besin kendi varsayılanıyla açılır")
    # bozuk veri temizlenir
    r = pg.evaluate("""() => { const s = JSON.parse(JSON.stringify(state)); s.foodAmts = JSON.parse('{"a": 30, "b": "25,5", "c": -3, "d": "x", "e": 99999, "__proto__": 5}');
      return normalizeState(s).foodAmts; }""")
    check(r == {"a": 30, "b": 25.5}, f"bozuk değerler atılır: {r}")
    r = pg.evaluate("""() => { const s = JSON.parse(JSON.stringify(state)); s.foodAmts = 'bozuk'; return normalizeState(s).foodAmts; }""")
    check(r == {}, "nesne değilse boş")
    r = pg.evaluate("""() => { const s = JSON.parse(JSON.stringify(state)); delete s.foodAmts; return normalizeState(s).foodAmts; }""")
    check(r == {}, "alanı olmayan eski kayıt: boş")
    r = pg.evaluate("""() => { const s = JSON.parse(JSON.stringify(state)); s.foodAmts = {}; for (let i = 0; i < 250; i++) s.foodAmts['f' + i] = 10; const o = normalizeState(s).foodAmts; return [Object.keys(o).length, 'f249' in o, 'f0' in o]; }""")
    check(r == [200, True, False], f"en fazla 200, en yeniler kalır: {r}")
    c.close()
    check(errs == [], "sayfa hatası yok: " + str(errs[:3]))
    b.close()
finally:
    srv.terminate()
print("BAŞARISIZ:" if fails else "TÜMÜ GEÇTİ", fails)
sys.exit(1 if (fails or errs) else 0)
