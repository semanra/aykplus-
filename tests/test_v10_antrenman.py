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
    b=p.chromium.launch(); ctx=b.new_context(color_scheme="dark", viewport={"width":390,"height":844},device_scale_factor=2,is_mobile=True,has_touch=True)
    ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.getElementById('splash'); if(s) s.remove();})")
    pg=ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("dialog", lambda d: d.accept())
    pg.goto("http://localhost:8765/index.html"); pg.wait_for_timeout(300)
    print("auto equip:", pg.evaluate("['Lat Pulldown','Incline Dumbbell Press','Barbell Bench Press','Pull-up','Leg Press','Cable Lateral Raise','Leg Extension','Weighted Dips'].map(n=>n+'→'+autoEquip(n))"))
    # --- seviye hesapları
    r=pg.evaluate("""()=>{
      const ex={name:'Lat Pulldown',kind:'weight',sets:[{kg:20,reps:12,target:'8–12'}]};
      const o={};
      ex.levels={mode:'step',start:5,step:7.5,addon:0}; o.stepNext=nextLevel(ex,20); o.stepPrev=prevLevel(ex,20);
      ex.levels={mode:'step',start:5,step:7.5,addon:2.5}; o.addonNext=nextLevel(ex,20);
      ex.levels={mode:'list',list:[20,27.5,35,40,47.5],addon:0}; o.listNext=nextLevel(ex,35); o.listTop=nextLevel(ex,47.5);
      delete ex.levels; o.noLevels=nextLevel(ex,20);
      const ex2={name:'Barbell Bench Press',kind:'weight',sets:[]}; o.plates=nextLevel(ex2,80);
      return o; }""")
    print("levels:", r)
    assert r["stepNext"]==27.5 and r["addonNext"]==22.5 and r["listNext"]==40 and r["plates"]==82.5, r
    # --- senin örneğin: makinede 20 → 27,5 önerisi
    seed={"activeTab":"gym","exerciseHistory":{"lat pulldown":[{"ts":now-3*DAY,"logId":"a","kind":"weight","name":"Lat Pulldown","sets":[{"kg":20,"reps":12},{"kg":20,"reps":12},{"kg":20,"reps":13}]}]}}
    pg.evaluate("s=>localStorage.setItem('ayk_plus_v5_state', s)", json.dumps(seed)); pg.reload(); pg.wait_for_timeout(300)
    li=pg.evaluate("activeDay().exercises.findIndex(e=>e.name==='Lat Pulldown')")
    print("Lat Pulldown idx:", li, "equip:", pg.evaluate(f"equipOf(activeDay().exercises[{li}])"))
    pg.evaluate(f"()=>{{activeDay().exercises[{li}].sets.forEach(s=>s.kg=20); renderAll();}}")
    print("suggest without levels:", pg.evaluate(f"JSON.stringify(overloadSuggestion(activeDay().exercises[{li}]))"))
    pg.evaluate(f"()=>{{activeDay().exercises[{li}].levels={{mode:'step',start:5,step:7.5,addon:0}}; renderAll();}}")
    _k=pg.evaluate(f"overloadSuggestion(activeDay().exercises[{li}]).kg"); print("suggest with 7.5 levels:", _k)
    assert _k==27.5, "makine kademesi önerisi 27,5 olmalı"
    pg.evaluate("startWorkout()"); pg.wait_for_timeout(200)
    print("banner text:", pg.locator(f"#exCard_{li}").inner_text().replace("\n"," | ")[:330])
    pg.locator(f"#exCard_{li}").screenshot(path=""+SHOTS+"/v10_latcard.png")
    pg.locator(f'[onclick="applySuggestion({li})"]').click(); pg.wait_for_timeout(150)
    print("applied sets:", [s["kg"] for s in st(pg)["workoutDays"][0]["exercises"][li]["sets"]])
    # --- geçmişten öğrenme
    seed2={"activeTab":"gym","gymActive":True,"exerciseHistory":{"lat pulldown":[
      {"ts":now-9*DAY,"logId":"a","kind":"weight","name":"Lat Pulldown","sets":[{"kg":20,"reps":12}]},
      {"ts":now-6*DAY,"logId":"b","kind":"weight","name":"Lat Pulldown","sets":[{"kg":27.5,"reps":10}]},
      {"ts":now-3*DAY,"logId":"c","kind":"weight","name":"Lat Pulldown","sets":[{"kg":35,"reps":8}]}]}}
    pg.evaluate("s=>localStorage.setItem('ayk_plus_v5_state', s)", json.dumps(seed2)); pg.reload(); pg.wait_for_timeout(300)
    print("inferred:", pg.evaluate(f"JSON.stringify(inferLevels(activeDay().exercises[{li}]))"))
    print("ask banner:", pg.locator(f"#exCard_{li}", has_text="arayla mı gidiyor").count())
    pg.locator(f'[onclick="confirmInferredLevels({li})"]').click(); pg.wait_for_timeout(150)
    print("saved levels:", st(pg)["workoutDays"][0]["exercises"][li].get("levels"))
    # --- düzenleme penceresi: liste + ek plaka
    pg.evaluate(f"openEditExercise({li})"); pg.wait_for_timeout(100)
    print("levels box visible:", pg.is_visible("#exLevelsWrap"), "inc hidden:", not pg.is_visible("#exIncWrap"))
    pg.click("#exLvModeList"); pg.fill("#exLvList","20; 27,5; 35 42,5"); pg.fill("#exLvAddon","2,5")
    pg.screenshot(path=""+SHOTS+"/v10_exmodal.png")
    pg.click("#exerciseModal >> text=Kaydet"); pg.wait_for_timeout(150)
    print("list levels:", st(pg)["workoutDays"][0]["exercises"][li].get("levels"), "next(27.5)=", pg.evaluate(f"nextLevel(activeDay().exercises[{li}],27.5)"))
    # ekipmanı plakalıya çevirince kademeler silinir
    pg.evaluate(f"openEditExercise({li})"); pg.select_option("#exEquip","plates"); pg.click("#exerciseModal >> text=Kaydet"); pg.wait_for_timeout(100)
    e=st(pg)["workoutDays"][0]["exercises"][li]; print("to plates:", e.get("equip"), e.get("levels"))
    pg.evaluate(f"openEditExercise({li})"); pg.select_option("#exEquip","auto"); pg.click("#exLvModeStep"); pg.fill("#exLvStart","5"); pg.fill("#exLvStep","7,5"); pg.click("#exerciseModal >> text=Kaydet"); pg.wait_for_timeout(100)
    # --- kademe hesaplayıcı
    pg.evaluate(f"openPlateTool({li})"); pg.wait_for_timeout(150)
    print("level tool:", pg.inner_text("#chartBody").replace("\n"," | ")[:260])
    pg.fill("#ptKg","30"); pg.wait_for_timeout(100); print("non-level warn:", "bu makinede yok" in pg.inner_text("#ptOut"))
    pg.click("#chartModal button[onclick=\"closeModal('chartModal')\"]")
    # --- hareket menüsü
    pg.locator(f'[onclick="openExSheet({li})"]').click(); pg.wait_for_timeout(150)
    print("sheet:", pg.inner_text("#exSheetBody").replace("\n"," | ")[:220]); pg.screenshot(path=""+SHOTS+"/v10_sheet.png")
    pg.locator("#exSheet button", has_text="Kapat").click()
    # --- vücut haritası
    pg.evaluate("exitActiveWorkout(); setGymView('library')"); pg.wait_for_timeout(200)
    fills=pg.evaluate("[...document.querySelectorAll('#gymRoot svg polygon')].filter(p=>p.getAttribute('fill')!=='transparent' && p.getAttribute('fill')!=='none').length")
    print("colored polys (week):", fills)
    pg.locator('#gymRoot svg polygon').nth(0).click(force=True); pg.wait_for_timeout(150)
    print("selected:", st(pg).get("libMuscle"), "| list:", pg.inner_text("#libList").replace("\n"," | ")[:160])
    pg.fill('#gymRoot input.t-search', "leg press"); pg.wait_for_timeout(100)
    print("search:", pg.inner_text("#libList").replace("\n"," | ")[:120])
    pg.screenshot(path=""+SHOTS+"/v10_lib2.png")
    # --- öğün: saat yerleştirme
    pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(300)
    pg.evaluate("()=>{curMeals()[0].time='08:00'; curMeals()[1].time='13:00'; renderAll();}")
    pg.evaluate("setNutriView('menus')"); pg.wait_for_timeout(100)
    pg.locator("text=Yeni öğün ekle").click(); pg.fill("#mmName","Ara Öğün"); pg.fill("#mmTime","10:30"); pg.click("#mealModal >> text=Kaydet"); pg.wait_for_timeout(200)
    _o=[m.get("time") for m in st(pg)["meals"]][:3]; assert _o==["08:00","10:30","13:00"], _o
    print("order:", [ (m.get("time") or "--")+" "+m["title"][:10] for m in st(pg)["meals"]])
    # --- sürükle-bırak (fare = pointer olayları)
    before=[m["title"][:12] for m in st(pg)["meals"]]
    pg.evaluate("document.querySelector('[data-meal-card=\"0\"]').scrollIntoView({block:'center'})"); pg.wait_for_timeout(150)
    h=pg.locator('#mealsContainer .drag-handle').nth(0); hb=h.bounding_box()
    tgt=pg.locator('#mealsContainer [data-meal-card="1"]'); tb=tgt.bounding_box()
    print("handle y:", round(hb["y"]), "target y:", round(tb["y"]))
    pg.mouse.move(hb["x"]+hb["width"]/2, hb["y"]+hb["height"]/2); pg.mouse.down()
    for k in range(1,11): pg.mouse.move(hb["x"]+hb["width"]/2, hb["y"]+(tb["y"]+tb["height"]/2-hb["y"])*k/10)
    pg.mouse.up(); pg.wait_for_timeout(200)
    print("drag:", before, "->", [m["title"][:12] for m in st(pg)["meals"]])
    # --- özel besin düzenle / sil
    pg.evaluate("openCustomFoodModal()"); pg.fill("#cfName","Proteinli Süt"); pg.fill("#cfP","10"); pg.click("#customFoodModal >> text=Kaydet"); pg.wait_for_timeout(100)
    cid=[k for k in st(pg)["customFoods"]][0]
    pg.evaluate(f"quickAdd(0, '{cid}', 200)"); pg.wait_for_timeout(100)
    pg.evaluate(f"goAddFood(0, 'menu'); selectFood('{cid}')"); pg.wait_for_timeout(150)   # v33: düzenle/sil Besinler'deki seçili besin kartında
    pg.screenshot(path=""+SHOTS+"/v10_customfood.png")
    pg.locator('#foodSelCard button', has_text="Düzenle").first.click(); pg.wait_for_timeout(100)
    print("edit prefill:", pg.input_value("#cfName"), pg.input_value("#cfP"), pg.inner_text("#cfTitle"))
    pg.fill("#cfP","12"); pg.click("#customFoodModal >> text=Kaydet"); pg.wait_for_timeout(100)
    cf=st(pg)["customFoods"]; print("after edit:", list(cf.keys())==[cid], cf[cid]["p"], cf[cid]["name"])
    pg.evaluate(f"goAddFood(0, 'menu'); selectFood('{cid}')"); pg.wait_for_timeout(150)
    pg.locator('#foodSelCard button', has_text="Sil").first.click(); pg.wait_for_timeout(150)
    if pg.is_visible("#uiDialog"): pg.click("#uiDlgOk"); pg.wait_for_timeout(150)   # v21: temalı onay
    s=st(pg); print("deleted:", cid not in s["customFoods"], "still in meal:", any(i["foodId"]==cid for i in s["meals"][0]["items"]))
    pg.locator("#toastWrap button", has_text="Geri al").first.click(); pg.wait_for_timeout(150)
    s=st(pg); assert cid in s["customFoods"], "geri al çalışmadı"; print("undo:", cid in s["customFoods"], any(i["foodId"]==cid for i in s["meals"][0]["items"]))
    for v in ["today","program","library","history"]:
        pg.evaluate(f"switchTab('gym'); setGymView('{v}')"); pg.wait_for_timeout(120)
        w=pg.evaluate("[document.documentElement.scrollWidth, document.documentElement.clientWidth]"); print(v, "overflow" if w[0]>w[1] else "ok")
    b.close()
srv.terminate(); print("ERRORS:", errs or "none")
sys.exit(1 if errs else 0)
