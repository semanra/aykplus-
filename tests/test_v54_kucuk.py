# v54: Beslenme seçim düğmesi gruplarında aria-pressed (tam bir "true", görsel seçimle (.on) aynı).
import os, sys, subprocess, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8812'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
URL = "http://localhost:8812/index.html"
def boot(pg): pg.wait_for_function("window.aykBooted === true"); pg.wait_for_timeout(80)
STATE_JS = """sel => [...document.querySelectorAll(sel)].map(b => [b.getAttribute('aria-pressed'), b.classList.contains('on')])"""
def group(pg, label, view, sels, actions):
    """sels: grup düğmelerinin seçicileri; actions: her düğme için çalıştırılacak js (seçili olacak sıra)."""
    pg.evaluate(view); pg.wait_for_timeout(80)
    sel = ", ".join(sels)
    for i, act in enumerate(actions):
        pg.evaluate(act); pg.wait_for_timeout(80)
        st = pg.evaluate(STATE_JS, sel)
        ok = all(a in ("true", "false") for a, _ in st) and [a == "true" for a, _ in st] == [on for _, on in st] and sum(a == "true" for a, _ in st) == 1 and st[i][0] == "true"
        check(ok, "%s: düğme %d seçilince tam bir aria-pressed=true ve görsel seçimle aynı: %s" % (label, i, st))
try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    c = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}, locale="tr-TR"); c.add_init_script(TEST_INIT)
    pg = c.new_page(); pg.on("pageerror", lambda e: errs.append(str(e))); pg.goto(URL); boot(pg)
    pg.evaluate("switchTab('nutrition')")
    # tıklamayla da denenir (gerçek dokunuş yolu)
    group(pg, "gün tipi (Bugün)", "setNutriView('today')", ["#btnTrain", "#btnRest"], ["setDayType('train')", "setDayType('rest')"])
    group(pg, "menü (Menülerim)", "setNutriView('menus')", ["#mnTrain", "#mnRest"], ["setDayType('train')", "setDayType('rest')"])
    group(pg, "hedef Ver/Koru/Al", "setNutriView('menus')", ["#goalLose", "#goalKeep", "#goalGain"], ["setGoal('lose')", "setGoal('keep')", "setGoal('gain')"])
    group(pg, "kilo alma hızı", "setNutriView('menus'); setGoal('gain')", ["#paceSlow", "#paceMid", "#paceFast"], ["setGainPace('slow')", "setGainPace('mid')", "setGainPace('fast')"])
    group(pg, "makro görünümü", "setNutriView('today')", ["#mmPlan", "#mmEaten"], ["setMacroView('plan')", "setMacroView('eaten')"])
    group(pg, "Nereye eklensin?", "setNutriView('foods')", ["#fdDay", "#fdMenu"], ["setFoodDest('day')", "setFoodDest('menu')"])
    group(pg, "takvim aralığı 30", "setNutriView('history')", ["#weekCard .n-seg button"], ["setNutriHistRange('7')", "setNutriHistRange('30')"])
    # gerçek tıklama
    pg.evaluate("setNutriView('today')"); pg.wait_for_timeout(80)
    pg.click("#btnRest"); pg.wait_for_timeout(80)
    check(pg.get_attribute("#btnRest", "aria-pressed") == "true" and pg.get_attribute("#btnTrain", "aria-pressed") == "false", "tıklama: gün tipi Dinlenme")
    check(errs == [], "sayfa hatası yok: " + str(errs[:3]))
    b.close()
finally:
    srv.terminate()
print("BAŞARISIZ:" if fails else "TÜMÜ GEÇTİ", fails)
sys.exit(1 if (fails or errs) else 0)
