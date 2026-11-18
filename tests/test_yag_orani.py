import os as _o, sys as _s; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__))); from ortak_tohum import TEST_INIT
import os, sys
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SHOTS = os.path.join(os.path.dirname(__file__), "shots")
os.makedirs(SHOTS, exist_ok=True)
import subprocess, time, json
srv=subprocess.Popen(['python3','-m','http.server','8765'],cwd=REPO,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs=[]; dialogs=[]
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(locale="tr-TR", color_scheme="dark", viewport={"width":375,"height":812},device_scale_factor=2,is_mobile=True,has_touch=True); ctx.add_init_script(TEST_INIT)
    pg=ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("dialog", lambda d: (dialogs.append(d.message), d.accept()))
    pg.goto("http://localhost:8765/index.html"); pg.wait_for_timeout(400)
    print("before:", pg.evaluate("JSON.stringify(getTargets())"))
    pg.click("#profileBtn"); pg.fill("#setBf","25"); pg.fill("#setTargetBf","15"); pg.wait_for_timeout(100)
    print("hint:", pg.inner_text("#setBfHint").replace("\n"," | "))
    pg.screenshot(path=""+SHOTS+"/bf_settings.png")
    pg.click("text=Bunu hedef kilom yap"); print("target field:", pg.input_value("#setTarget"))
    pg.evaluate("saveSettings(); void closeProfile()"); pg.wait_for_timeout(200)
    print("after:", pg.evaluate("JSON.stringify(getTargets())"), pg.evaluate("JSON.stringify(state.settings)"))
    pg.evaluate("switchTab('nutrition'); setNutriView('menus')"); pg.click('#tabNutrition [onclick="logCurrentWeight()"]'); pg.wait_for_timeout(100)
    print("log:", pg.evaluate("JSON.stringify(state.weightLogs.slice(-1))"))
    pg.click("#navBtnProgress"); pg.wait_for_timeout(300)
    pg.screenshot(path=""+SHOTS+"/bf_progress.png")
    # invalid
    pg.click("#profileBtn"); pg.fill("#setBf","80"); pg.evaluate("saveSettings()"); pg.wait_for_timeout(100)
    bf = pg.evaluate("state.settings.bodyFat"); print("toast:", pg.inner_text("#toastWrap").replace("\n", " ")[:80], "bf still:", bf)
    if bf != 25: errs.append("geçersiz yağ oranı kaydedildi: " + str(bf))
    pg.fill("#setBf",""); pg.fill("#setTargetBf",""); pg.evaluate("saveSettings(); void closeProfile()"); pg.wait_for_timeout(100)
    print("cleared:", pg.evaluate("JSON.stringify([state.settings.bodyFat, state.settings.targetBodyFat, getTargets().calTarget])"))
    b.close()
srv.terminate(); print("errors:", errs)
sys.exit(1 if errs else 0)
