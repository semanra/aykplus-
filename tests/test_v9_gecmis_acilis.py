import os, sys
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SHOTS = os.path.join(os.path.dirname(__file__), "shots")
os.makedirs(SHOTS, exist_ok=True)
import subprocess, time, json, datetime, random
srv=subprocess.Popen(['python3','-m','http.server','8765'],cwd=REPO,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs=[]
random.seed(4)
dl={}
for d in range(1,30):
    if d in (6,7,19): continue  # veri olmayan günler
    k=(datetime.date.today()-datetime.timedelta(days=d)).isoformat()
    eaten = d%4!=0
    dl[k]={"kcal":2487,"p":211,"eatenKcal":random.choice([2100,2300,2450,2550,2800]) if eaten else 0,"eatenP":random.choice([170,195,205,215]) if eaten else 0,
           "mealsDone":4 if eaten else 0,"mealsTotal":4,"water":random.choice([2.0,2.75,3.0,3.5,3.75,4.0]),"calTarget":2478,"proTarget":201}
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={"width":375,"height":812},device_scale_factor=2,is_mobile=True,has_touch=True)
    pg=ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("dialog", lambda d: d.accept())
    pg.goto("http://localhost:8765/index.html")
    print("meta status bar:", pg.get_attribute('meta[name="apple-mobile-web-app-status-bar-style"]','content'))
    pg.wait_for_timeout(250); print("splash at 250ms:", pg.locator("#splash").count()); pg.screenshot(path=""+SHOTS+"/v9_splash.png")
    pg.wait_for_timeout(1300); print("splash at 1550ms:", pg.locator("#splash").count())
    # tap-to-skip
    pg.reload(); pg.wait_for_timeout(150); pg.locator("#splash").click(); print("after tap:", pg.locator("#splash").count())
    # disable via settings
    pg.click("#profileBtn"); pg.locator("#setSplash").uncheck(); pg.click("#profileSave"); pg.wait_for_timeout(100)
    pg.reload(); pg.wait_for_timeout(60); print("disabled -> splash on reload:", pg.locator("#splash").count())
    # history
    pg.evaluate("s=>localStorage.setItem('ayk_plus_v5_state', s)", json.dumps({"activeTab":"progress","waterLiters":1.5,"dailyLogs":dl,"settings":{"splash":False}}))
    pg.reload(); pg.wait_for_timeout(400)
    card=pg.locator(".card", has_text="Su & Beslenme Geçmişi")
    print("card stats:", card.inner_text().replace("\n"," | ")[:220])
    print("bars 14:", card.locator("svg").first.locator("rect").count())
    card.screenshot(path=""+SHOTS+"/v9_hist14.png")
    pg.click("#tabProgress >> text=30 gün"); pg.wait_for_timeout(200)
    card=pg.locator(".card", has_text="Su & Beslenme Geçmişi")
    print("bars 30:", card.locator("svg").first.locator("rect").count())
    card.screenshot(path=""+SHOTS+"/v9_hist30.png")
    w=pg.evaluate("[document.documentElement.scrollWidth, document.documentElement.clientWidth]"); print("overflow:", w)
    # archive stores targets
    pg.evaluate("()=>{state.today='2026-09-01'; checkNewDay();}")
    print("archived targets:", pg.evaluate("JSON.stringify([state.dailyLogs['2026-09-01'].calTarget, state.dailyLogs['2026-09-01'].proTarget])"))
    # empty state
    pg.evaluate("s=>localStorage.setItem('ayk_plus_v5_state', s)", json.dumps({"activeTab":"progress","settings":{"splash":False}}))
    pg.reload(); pg.wait_for_timeout(300)
    print("empty msg:", "İlk günün yarın" in pg.inner_text("#progressContent"))
    b.close()
srv.terminate(); print("ERRORS:", errs or "none")
sys.exit(1 if errs else 0)
