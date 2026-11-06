import os, sys
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SHOTS = os.path.join(os.path.dirname(__file__), "shots")
os.makedirs(SHOTS, exist_ok=True)
import subprocess, time, json
srv=subprocess.Popen(['python3','-m','http.server','8765'],cwd=REPO,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
DAY=86400000; now=int(time.time()*1000)
errs=[]
def st(pg): return pg.evaluate("JSON.parse(localStorage.getItem('ayk_plus_v5_state'))")
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={"width":375,"height":812},device_scale_factor=2,is_mobile=True,has_touch=True); ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.getElementById('splash'); if(s) s.remove();})")
    pg=ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("dialog", lambda d: d.accept())
    pg.goto("http://localhost:8765/index.html"); pg.wait_for_timeout(300)
    print("rules:", pg.evaluate("['Incline Press','Seated Two-Arm Overhead Dumbbell Extension','Leg Press','Dumbbell Shoulder Press','Close-Grip Bench Press'].map(n=>n+'→'+autoMuscle(n))"))
    # --- plate & warmup
    print("plates 100/20:", pg.evaluate("JSON.stringify(platesFor(100,20))"))
    print("plates 102.5/20:", pg.evaluate("JSON.stringify(platesFor(102.5,20).list)"))
    print("plates 61/20:", pg.evaluate("JSON.stringify(platesFor(61,20))"))
    print("plates 15/20:", pg.evaluate("JSON.stringify(platesFor(15,20))"))
    print("warmup 100/20:", pg.evaluate("JSON.stringify(warmupSets(100,20))"))
    print("warmup 30/0:", pg.evaluate("JSON.stringify(warmupSets(30,0))"))
    print("warmup 22/20:", pg.evaluate("JSON.stringify(warmupSets(22,20))"))
    # --- overload: seed history
    seed={"activeTab":"gym","weight":104,
      "exerciseHistory":{
        "barbell bench press":[{"ts":now-3*DAY,"logId":"a","kind":"weight","name":"Barbell Bench Press","sets":[{"kg":80,"reps":8},{"kg":80,"reps":8},{"kg":80,"reps":9}]}],
        "chest-supported row":[{"ts":now-3*DAY,"logId":"a","kind":"weight","name":"Chest-Supported Row","sets":[{"kg":60,"reps":5},{"kg":60,"reps":4},{"kg":60,"reps":7},{"kg":60,"reps":8}]}],
        "incline dumbbell press":[{"ts":now-3*DAY,"logId":"a","kind":"weight","name":"Incline Dumbbell Press","sets":[{"kg":30,"reps":10},{"kg":30,"reps":10}]}]
      }}
    pg.evaluate("s=>localStorage.setItem('ayk_plus_v5_state', s)", json.dumps(seed)); pg.reload(); pg.wait_for_timeout(400)
    pg.evaluate("startWorkout()"); pg.evaluate("()=>{activeDay().exercises[1].sets.forEach(s=>s.kg=60); activeDay().exercises[0].sets.forEach(s=>s.kg=80); renderAll();}")
    sug=pg.evaluate("activeDay().exercises.slice(0,3).map(e=>{const s=overloadSuggestion(e); return e.name+': '+(s? s.type+' '+s.kg+'x'+s.reps : 'none');})")
    print("suggestions:", sug)  # bench up 82.5x5 ; row down 57.5 ; incline DB: only 2 of 3 sets → none
    pg.screenshot(path=""+SHOTS+"/v7_gym.png")
    pg.locator('[onclick="applySuggestion(0)"]').click(); pg.wait_for_timeout(200)
    print("after apply bench sets:", st(pg)["workoutDays"][0]["exercises"][0]["sets"], "banner gone:", pg.evaluate("overloadSuggestion(activeDay().exercises[0])"))
    pg.locator('[onclick="dismissSuggestion(1)"]').click(); pg.wait_for_timeout(200)
    print("row dismissed:", pg.evaluate("overloadSuggestion(activeDay().exercises[1])"), st(pg)["workoutDays"][0]["exercises"][1].get("sugDismiss"))
    # plate tool UI
    pg.evaluate("openPlateTool(0)"); pg.wait_for_timeout(200)
    print("plate ui:", pg.inner_text("#ptOut").replace("\n"," | ")[:300])
    pg.screenshot(path=""+SHOTS+"/v7_plate.png")
    pg.select_option("#ptBar","15"); pg.wait_for_timeout(100); print("bar saved:", st(pg)["settings"]["barKg"])
    pg.click("#chartModal button[onclick=\"closeModal('chartModal')\"]")
    # edit modal muscle/inc
    pg.evaluate("openEditExercise(0)"); pg.wait_for_timeout(100)
    print("muscle auto label:", pg.evaluate("$('exMuscle').options[0].textContent"), "inc ph:", pg.get_attribute("#exInc","placeholder"))
    pg.select_option("#exMuscle","Triceps"); pg.fill("#exInc","5"); pg.click("#exerciseModal >> text=Kaydet"); pg.wait_for_timeout(200)
    e=st(pg)["workoutDays"][0]["exercises"][0]; print("edited:", e.get("muscle"), e.get("inc"), len(e["sets"]))
    pg.evaluate("openEditExercise(0)"); pg.select_option("#exMuscle","auto"); pg.fill("#exInc",""); pg.click("#exerciseModal >> text=Kaydet"); pg.wait_for_timeout(200)
    e=st(pg)["workoutDays"][0]["exercises"][0]; print("reverted:", e.get("muscle"), e.get("inc"))
    # finish workout -> muscle sets
    pg.locator('[onclick="toggleSetDone(0, 0)"]').tap(); pg.locator('[onclick="toggleSetDone(0, 1)"]').tap(); pg.locator('[onclick="toggleSetDone(4, 0)"]').tap()
    pg.locator("button", has_text="Antrenmanı Bitir ve Kaydet").first.click(); pg.click("#uiDlgOk"); pg.wait_for_timeout(200)
    print("weekly muscle:", pg.evaluate("JSON.stringify(weeklyMuscleSets(weekStart()))"))
    # --- eaten view
    pg.click("#navBtnNutrition"); pg.wait_for_timeout(200)
    print("plan view cal:", pg.inner_text("#calConsumed"), pg.inner_text("#mmPlan"), "|", pg.inner_text("#mmEaten"))
    pg.locator('[onchange="toggleMealDone(0)"]').check(); pg.wait_for_timeout(100)
    pg.click("#mmEaten"); pg.wait_for_timeout(100)
    print("eaten view cal:", pg.inner_text("#calConsumed"), pg.inner_text("#calStatus"), "|", pg.inner_text("#mmEaten"))
    pg.screenshot(path=""+SHOTS+"/v7_nut.png")
    # --- coach: seed 21 days, loss 0.25kg/week, intake 2400 while target ~2478, deficit 700 expects -0.64
    wl=[{"date":"x","weight":round(106-0.25*(d/7),2),"ts":now-(21-d)*DAY} for d in [0,4,7,11,14,18,21]]
    dl={}
    import datetime
    for d in range(1,21):
        k=(datetime.date.today()-datetime.timedelta(days=d)).isoformat(); dl[k]={"kcal":2500,"eatenKcal":2400,"mealsDone":4,"mealsTotal":4,"water":3}
    seed2={"activeTab":"progress","weight":105.25,"weightLogs":wl,"dailyLogs":dl}
    pg.evaluate("s=>localStorage.setItem('ayk_plus_v5_state', s)", json.dumps(seed2)); pg.reload(); pg.wait_for_timeout(400)
    a=pg.evaluate("JSON.stringify(coachAnalysis())"); print("coach:", a)
    print("hint:", pg.evaluate("coachHintText()"))
    pg.screenshot(path=""+SHOTS+"/v7_coach.png")
    before=pg.evaluate("getTargets().calTarget")
    pg.click("text=✓ Öneriyi uygula"); pg.wait_for_timeout(200)
    after=pg.evaluate("getTargets().calTarget"); print("calTarget", before, "->", after, "adj", st(pg)["settings"]["calAdjust"], "delta after:", pg.evaluate("coachAnalysis().delta"))
    pg.screenshot(path=""+SHOTS+"/v7_coach2.png")
    pg.click("button[onclick=\"resetCoachAdjust()\"]"); pg.wait_for_timeout(100); print("reset:", pg.evaluate("getTargets().calTarget"))
    # not ready
    pg.evaluate("localStorage.clear()"); pg.reload(); pg.click("#navBtnProgress"); pg.wait_for_timeout(300)
    print("not ready text ok:", "en az 4 tartı" in pg.inner_text("#progressContent"))
    b.close()
srv.terminate(); print("errors:",errs)
sys.exit(1 if errs else 0)
