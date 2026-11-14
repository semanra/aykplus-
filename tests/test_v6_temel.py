import os, sys
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SHOTS = os.path.join(os.path.dirname(__file__), "shots")
os.makedirs(SHOTS, exist_ok=True)
import json, time, subprocess
srv=subprocess.Popen(['python3','-m','http.server','8765'],cwd=REPO,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
time.sleep(1)
from playwright.sync_api import sync_playwright
errors=[]
legacy = {
  "activeTab":"gym","weight":104.5,"deficit":700,"dayType":"train","waterLiters":1.5,
  "weightLogs":[{"date":"Başlangıç","weight":105}],
  "workoutLogs":[{"date":"20 Eki 18:00","dayName":"1. GÜN: Üst Vücut A","sets":20,"volume":5000,"summary":"9 Hareket"}],
  "activeWorkoutDayIdx":0,
  "workoutDays":[{"id":"upperA","name":"1. GÜN: Üst Vücut A","exercises":[
     {"name":"Barbell Bench Press","targetInfo":"3x5–8","note":"Hedef: \"3\" Set","sets":[{"kg":80,"reps":6,"target":"5–8","done":False},{"kg":80,"reps":6,"target":"5–8","done":False}]},
     {"name":"Incline Treadmill Walk (Eğimli Yürüyüş)","targetInfo":"3x8–12","note":"Hedef: 3x8–12","sets":[{"kg":0,"reps":10,"target":"8–12","done":False}]},
     {"name":"Plank / RKC Plank","targetInfo":"3x8–12","note":"","sets":[{"kg":0,"reps":10,"target":"8–12","done":False},{"kg":0,"reps":10,"target":"8–12","done":False}]}
  ]}]
}
with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context(color_scheme="dark", viewport={"width":390,"height":844},device_scale_factor=2,is_mobile=True,has_touch=True); ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.getElementById('splash'); if(s) s.remove();})")
    pg=ctx.new_page()
    pg.on("console", lambda m: errors.append("console:"+m.text) if m.type=="error" else None)
    pg.on("pageerror", lambda e: errors.append("pageerror:"+str(e)))
    pg.goto("http://localhost:8765/index.html")
    pg.evaluate("s=>localStorage.setItem('ayk_plus_v5_state', s)", json.dumps(legacy))
    pg.reload(); pg.wait_for_timeout(400); pg.evaluate("startWorkout()"); pg.wait_for_timeout(150)
    def overflow(tag):
        w=pg.evaluate("[document.documentElement.scrollWidth, document.documentElement.clientWidth]")
        print(tag,"scrollWidth/clientWidth",w, "OVERFLOW!" if w[0]>w[1] else "ok")
    # migration check
    st=pg.evaluate("JSON.parse(localStorage.getItem('ayk_plus_v5_state'))")
    exs=st["workoutDays"][0]["exercises"]
    print("kinds:",[e["kind"] for e in exs], "cardio sets:",exs[1]["sets"], "time sets:",exs[2]["sets"])
    pg.screenshot(path=""+SHOTS+"/1_gym.png", full_page=True); overflow("gym")
    # focus test: type kg then tap reps
    kg=pg.locator('[onchange="updateSetData(0, 0, \'kg\', this.value)"]')
    kg.tap(); kg.fill("82,5")
    reps=pg.locator('[onchange="updateSetData(0, 0, \'reps\', this.value)"]')
    reps.tap()
    pg.keyboard.press("Control+A"); pg.keyboard.type("7")
    pg.locator("body").tap(position={"x":5,"y":400})
    pg.wait_for_timeout(200)
    st=pg.evaluate("JSON.parse(localStorage.getItem('ayk_plus_v5_state'))")
    print("set0 after edit:",st["workoutDays"][0]["exercises"][0]["sets"][0])
    # cardio fill
    pg.locator('[onchange="updateSetData(1, 0, \'min\', this.value)"]').fill("35")
    pg.locator('[onchange="updateSetData(1, 0, \'km\', this.value)"]').fill("3,5")
    pg.locator('[onchange="updateSetData(1, 0, \'lvl\', this.value)"]').fill("12%")
    pg.locator("body").tap(position={"x":5,"y":400}); pg.wait_for_timeout(150)
    print("cardio right:", pg.inner_text("#exRight_1").replace("\n"," | "))
    # tick sets
    pg.locator('[onclick="toggleSetDone(0, 0)"]').tap(); pg.wait_for_timeout(300)
    print("pill visible:", pg.is_visible("#restPill"), pg.inner_text("#restPillTime"))
    pg.locator('[onclick="toggleSetDone(0, 1)"]').tap()
    pg.locator('[onclick="toggleSetDone(1, 0)"]').tap()
    pg.wait_for_timeout(200)
    print("header:", pg.inner_text("#gymHeaderBar").replace("\n"," | "))
    pg.screenshot(path=""+SHOTS+"/2_gym_ticked.png")
    pg.on("dialog", lambda d: d.accept())
    pg.locator("button", has_text="Antrenmanı Bitir ve Kaydet").first.click(); pg.click("#uiDlgOk"); pg.wait_for_timeout(300)
    pg.evaluate("setGymView('history')"); print("history:", pg.inner_text("#workoutHistoryList").replace("\n"," | ")[:300])
    # PR test
    pg.evaluate("startWorkout()"); pg.wait_for_timeout(150)
    kg=pg.locator('[onchange="updateSetData(0, 0, \'kg\', this.value)"]'); kg.fill("90"); pg.locator("body").tap(position={"x":5,"y":400})
    pg.locator('[onclick="toggleSetDone(0, 0)"]').tap(); pg.wait_for_timeout(200)
    print("toasts:", pg.inner_text("#toastWrap").replace("\n"," | "))
    print("last-time line:", pg.locator("text=Geçen sefer").first.inner_text())
    pg.screenshot(path=""+SHOTS+"/3_gym_pr.png", full_page=True)
    # add cardio via picker
    pg.evaluate("openExercisePicker()"); pg.fill("#pickerSearch","kosu"); pg.wait_for_timeout(100)
    print("picker results:", pg.inner_text("#pickerList").replace("\n"," | ")[:200])
    pg.screenshot(path=""+SHOTS+"/4_picker.png")
    pg.locator("#pickerList button").first.tap(); pg.wait_for_timeout(100)
    print("modal kind cardio visible:", pg.is_visible("#exSec_cardio"), pg.is_visible("#exSec_weight"))
    pg.screenshot(path=""+SHOTS+"/5_exmodal.png")
    pg.click("#exerciseModal >> text=Kaydet"); pg.wait_for_timeout(300)
    st=pg.evaluate("JSON.parse(localStorage.getItem('ayk_plus_v5_state'))")
    print("added:", st["workoutDays"][0]["exercises"][-1])
    # weight custom exercise with target
    pg.evaluate("openExerciseModal({name:'',kind:'weight'})"); pg.fill("#exName","Test Press"); pg.fill("#exSetCount","4"); pg.fill("#exRepRange","6-8"); pg.fill("#exStartKg","40")
    pg.click("#exerciseModal >> text=Kaydet"); pg.wait_for_timeout(200)
    st=pg.evaluate("JSON.parse(localStorage.getItem('ayk_plus_v5_state'))")
    e=st["workoutDays"][0]["exercises"][-1]; print("custom:", e["targetInfo"], len(e["sets"]), e["sets"][0])
    # nutrition
    pg.click("#navBtnNutrition"); pg.wait_for_timeout(300)
    pg.screenshot(path=""+SHOTS+"/6_nutrition.png", full_page=True); overflow("nutrition")
    pg.evaluate("openFoodPicker(0)"); pg.fill("#pickerSearch","tavuk gogsu"); pg.wait_for_timeout(100)
    pg.screenshot(path=""+SHOTS+"/7_foodpicker.png")
    pg.locator("#pickerList button").first.tap(); pg.wait_for_timeout(200)
    st=pg.evaluate("JSON.parse(localStorage.getItem('ayk_plus_v5_state'))")
    print("meal0 items:", [i["foodId"] for i in st["meals"][0]["items"]])
    # amount focus test (gramaj kutuları Menülerim'de, öğün açıkken)
    pg.evaluate("setNutriView('menus'); toggleMenuMeal(0)"); pg.wait_for_timeout(100)
    a0=pg.locator('[data-fk="amt-0-0"]'); a1=pg.locator('[data-fk="amt-0-1"]')
    a0.tap(); a0.fill("4"); a1.tap(); pg.wait_for_timeout(100)
    print("focused after re-render:", pg.evaluate("document.activeElement && document.activeElement.dataset.fk"))
    pg.click("#navBtnMobility"); pg.wait_for_timeout(200); pg.screenshot(path=""+SHOTS+"/8_mobility.png", full_page=True); overflow("mobility")
    pg.click("#navBtnProgress"); pg.wait_for_timeout(300); pg.screenshot(path=""+SHOTS+"/9_progress.png", full_page=True); overflow("progress")
    pg.click("#profileBtn"); pg.wait_for_timeout(200); pg.screenshot(path=""+SHOTS+"/10_settings.png")
    pg.fill("#setAge","30"); pg.click("#profileSave"); pg.wait_for_timeout(200)
    st=pg.evaluate("JSON.parse(localStorage.getItem('ayk_plus_v5_state'))"); print("settings:", st["settings"])
    # new day rollover
    pg.evaluate("()=>{const s=JSON.parse(localStorage.getItem('ayk_plus_v5_state')); s.today='2026-10-20'; localStorage.setItem('ayk_plus_v5_state', JSON.stringify(s));}")
    pg.reload(); pg.wait_for_timeout(400)
    st=pg.evaluate("JSON.parse(localStorage.getItem('ayk_plus_v5_state'))"); print("rollover:", st["today"], list(st["dailyLogs"].keys()), st["waterLiters"])
    # backup roundtrip
    backup=pg.evaluate("JSON.stringify(state)")
    pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(300)
    pg.evaluate("t=>{ void restoreFromText(t); }", backup); pg.wait_for_timeout(300)
    if pg.is_visible("#uiDialog"): pg.click("#uiDlgOk"); pg.wait_for_timeout(300)   # v21: temalı onay
    st=pg.evaluate("JSON.parse(localStorage.getItem('ayk_plus_v5_state'))")
    print("restored logs:", len(st["workoutLogs"]), "history keys:", list(st["exerciseHistory"].keys()))
    pg.evaluate("t=>{ void restoreFromText(t); }", json.dumps(legacy)); pg.wait_for_timeout(200)
    if pg.is_visible("#uiDialog"): pg.click("#uiDlgOk"); pg.wait_for_timeout(300)   # v21: temalı onay
    st=pg.evaluate("JSON.parse(localStorage.getItem('ayk_plus_v5_state'))")
    print("legacy restore kinds:", [e["kind"] for e in st["workoutDays"][0]["exercises"]])
    # fresh install
    pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(400)
    pg.screenshot(path=""+SHOTS+"/11_fresh.png"); overflow("fresh")
    b.close()
print("ERRORS:", errors or "none")
srv.terminate()
sys.exit(1 if errors else 0)
