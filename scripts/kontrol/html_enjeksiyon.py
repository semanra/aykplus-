# Kötü niyetli metin denemesi: kullanıcının yazabildiği her alana HTML/JS parçası yazılır, bütün ekranlar ve pencereler açılır.
# Parça gerçek bir öğe olarak oluşursa (#xss_*) veya kod çalışırsa (window.__xss) açık var demektir.
# Kullanım: python scripts/kontrol/html_enjeksiyon.py
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from ortak import server
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))

def P(tag):   # her alan için ayrı izlenebilir parça (tırnak türleri dahil)
    return f"""X<img id="xss_{tag}" src=x onerror="window.__xss=(window.__xss||[]).concat('{tag}')">'"`<b id="xssb_{tag}">"""

SETUP = r"""(P) => {
  const D = 864e5, now = Date.now(), key = t => todayStr(new Date(t));
  state.customFoods["custom_x"] = { name: P.food, cat: P.cat, unit: "g", step: 10, def: 100, p: 0.2, c: 0.1, f: 0.05 };
  state.customFoods["custom_recipe_y"] = { name: P.recipe, cat: "🍲 Tariflerim", unit: "g", step: 10, def: 200, p: 0.1, c: 0.1, f: 0.1, kcal: 1.2, recipe: { items: [{ foodId: "custom_x", amount: 50 }], cooked: 200 } };
  state.meals[0].title = P.meal; state.meals[0].targetNote = P.note; state.meals[0].items.push({ foodId: "custom_x", amount: 100 });
  state.restMeals[0].title = P.meal;
  ensureDayCopy(); dayMeals()[1].items.push({ foodId: "_est", amount: 1, est: { name: P.est, cal: 500, p: 20, c: 50, f: 20 } });
  state.combos = [{ id: "c1", name: P.combo, items: [{ foodId: "custom_x", amount: 100 }] }];
  state.workoutDays[0].name = P.day; state.workoutDays[0].exercises[0].name = P.ex; state.workoutDays[0].exercises[0].note = P.exnote;
  const ts = now - 2 * D;
  state.exerciseHistory[exKey(P.ex)] = [1, 2, 3, 4, 5].map(i => ({ ts: ts - i * 7 * D, logId: "x" + i, kind: "weight", name: P.ex, sets: [{ kg: 50 + i, reps: 8 }] }));
  state.workoutLogs.push({ id: "x1", ts, date: fmtDate(ts), dayName: P.logday, sets: 3, volume: 1000, cardioMin: 0, cardioKm: 0, prs: 0 });
  state.supplementList.push({ id: "sx", name: P.supp, time: "custom", timeLabel: P.suppTime, dose: 1, unit: P.suppUnit, note: P.suppNote });
  state.mobilityRoutine.routines[0].items.unshift(normMobItem({ name: P.mob, note: P.mobnote, type: "static", region: "hip", mode: "time", sec: 30, sets: 1 }));
  state.mobilityRoutine.routines[0].name = P.mobroutine;   // v39: rutin adı
  state.missSearches = [{ q: P.miss, n: 1, ts: now }];
  state.weightLogs.push({ date: P.wdate, weight: 97, ts: now - D });
  state.foodSnap["kayip_besin"] = { n: P.snap, u: "g", p: 0.1, c: 0.1, f: 0.1, k: 1, d: 100 };
  state.meals[1].items.push({ foodId: "kayip_besin", amount: 50 });
  renderAll();
}"""
STEPS = [
  "switchTab('nutrition'); setNutriView('today')", "toggleMealEdit(0)", "setNutriView('menus')", "toggleMenuMeal && toggleMenuMeal(0)",
  "setNutriView('foods')", "selectFood('custom_x')", "setFoodCat('combos')", "setNutriView('history')",
  "openSwap(1, 0, 'day')", "closeModal('pickerModal'); openShopList()", "closeModal('shopModal'); openRecipeModal('custom_recipe_y')",
  "closeModal('recipeModal'); openFreeMeal(0)", "closeModal('freeMealModal'); openMealModal(0)", "closeModal('mealModal'); editCustomFood('custom_x')",
  "closeModal('customFoodModal'); switchTab('gym'); setGymView('today')", "setGymView('program')", "setGymView('library')", "setGymView('history')",
  "startWorkout()", "openEditExercise(0)", "closeModal('exerciseModal'); openExerciseChart(0)", "closeModal('chartModal'); openExercisePicker()",
  "closeModal('pickerModal'); state.gymActive = false; setGymView('history'); openShareCard(state.workoutLogs.length - 1)",
  "closeModal('chartModal'); switchTab('mobility')", "mobOpenRoutine(mobRoutines()[0].id)", "mobEdit(true)",
  "mobEdit(false); mobOpen(state.mobilityRoutine.routines[0].items[0].id)", "mobBack(); mobEdit(true); mobAddOpen()",
  "mobBack(); mobTimerStart(state.mobilityRoutine.routines[0].items[0].id)", "mobTimerClose(); mobSesStart(mobRoutines()[0].id)", "mobSesFinish()",
  "mobTimerClose(); switchTab('progress'); setProgressView('genel')",
  "setProgressView('kilo')", "setProgressView('guc')", "setProgressView('beslenme')", "openProfile()",
  "hideProfile(); offerUndo(state.meals[0].title + ' silindi')", "void uiAsk({ title: state.meals[0].title, message: state.workoutDays[0].name, ok: 'Tamam' })",
]
FIELDS = ["food", "cat", "recipe", "meal", "note", "est", "combo", "day", "ex", "exnote", "logday", "supp", "suppTime", "suppUnit", "suppNote", "mob", "mobnote", "mobroutine", "miss", "wdate", "snap"]

def main():
    from playwright.sync_api import sync_playwright
    payload = {f: P(f) for f in FIELDS}
    found = set(); errs = []; step_err = []; shown = set()
    with server(REPO) as url, sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width": 390, "height": 844}, color_scheme="dark")
        ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.getElementById('splash'); if(s) s.remove();})")
        pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)[:150]))
        pg.goto(url); pg.wait_for_timeout(400)
        pg.evaluate(SETUP, payload); pg.wait_for_timeout(200)
        pg.reload(); pg.wait_for_timeout(300)   # kaydedilmiş hâlinden de açılsın
        for st in STEPS:
            try: pg.evaluate("() => { " + st + " }")
            except Exception as e: step_err.append(f"{st[:50]} → {str(e)[:100]}")
            pg.wait_for_timeout(150)
            got = pg.evaluate("""() => ({ el: [...document.querySelectorAll('[id^="xss_"], [id^="xssb_"]')].map(e => e.id), run: window.__xss || [] })""")
            for x in got["el"] + got["run"]: found.add(f"{x} ← {st[:45]}")
            shown.update(pg.evaluate(r"""() => { const t = document.body.innerText + [...document.querySelectorAll('input, textarea')].map(e => e.value).join(' ');
              return [...t.matchAll(/<img id="xss_([A-Za-z]+)/g)].map(m => m[1]); }"""))
        b.close()
    print("Adım hataları:", step_err or "yok")
    print("Sayfa hataları:", errs or "yok")
    if found:
        print(f"\nAÇIK: {len(found)} yerde metin HTML olarak işlendi:"); [print("  " + f) for f in sorted(found)]; sys.exit(1)
    miss = [f for f in FIELDS if not any(x == f or (len(x) >= 5 and f.startswith(x)) for x in shown)]   # uzunluk sınırıyla kesilen adlar da sayılır
    print(f"Ekranda düz metin olarak görülen alanlar: {len(FIELDS) - len(miss)}/{len(FIELDS)}" + (f" (görünmeyen: {chr(44).join(miss)})" if miss else ""))
    print(f"\nTemiz: {len(FIELDS)} alan × {len(STEPS)} ekran/pencere — hiçbir yerde metin HTML olarak işlenmedi.")

if __name__ == "__main__":
    main()
