# Bozuk veri denemesi (fuzz): gerçekçi bir kaydın rastgele alanlarını bozar, uygulamayı açar, bütün ekranları çizer.
# Bulunan sorunlar: (1) açılışta tüm verinin "okunamadı" sayılması (kurtarma kopyasına düşme), (2) sayfa hataları.
# Kullanım: python scripts/kontrol/bozuk_veri.py [deneme sayısı] [tohum]
import os, sys, json, random, copy, collections
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from ortak import server
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
N = int(sys.argv[1]) if len(sys.argv) > 1 else 200
SEED_RNG = int(sys.argv[2]) if len(sys.argv) > 2 else 7

RICH = r"""() => {
  const D = 864e5, now = Date.now(), key = t => todayStr(new Date(t));
  for (let i = 0; i < 6; i++) { const ts = now - (20 - i * 3) * D;
    [["Barbell Bench Press", "Göğüs"], ["Lat Pulldown", "Sırt"], ["Treadmill", null]].forEach(([n, m], j) => {
      const kind = j === 2 ? "cardio" : "weight";
      (state.exerciseHistory[exKey(n)] = state.exerciseHistory[exKey(n)] || []).push({ ts, logId: "l" + i, kind, name: n, muscle: m || undefined,
        sets: kind === "cardio" ? [{ min: 20, km: 3, lvl: "" }] : [{ kg: 60 + i, reps: 8, e: 2 }, { kg: 60 + i, reps: 6 }] }); });
    state.workoutLogs.push({ id: "l" + i, ts, date: fmtDate(ts), dayId: "upperA", dayName: "1. GÜN", sets: 5, volume: 900, cardioMin: 20, cardioKm: 3, prs: i % 2, durationMin: 55 }); }
  for (let i = 30; i >= 1; i -= 2) state.weightLogs.push({ date: fmtDate(now - i * D), weight: 98 - i * 0.05, ts: now - i * D, bf: 22 });
  for (let i = 1; i <= 10; i++) state.dailyLogs[key(now - i * D)] = { kcal: 2400, p: 190, c: 230, f: 70, eatenKcal: 2300, eatenP: 180, mealsDone: 3, mealsTotal: 4, water: 3, supps: 2, dayType: "train", calTarget: 2400, proTarget: 190,
    meals: i < 3 ? dayMeals().map(m => ({ id: m.id, title: m.title, items: clone(m.items) })) : undefined };
  state.measurements = [{ ts: now - 20 * D, bel: 100, kol: 40 }, { ts: now - 2 * D, bel: 98 }];
  state.customFoods["custom_abc"] = { name: "Ev yoğurdu", cat: "⭐ Özel Eklediklerim", unit: "g", step: 10, def: 150, p: 0.04, c: 0.05, f: 0.03 };
  state.customFoods["custom_recipe_x"] = { name: "🍲 Mercimek", cat: "🍲 Tariflerim", unit: "g", step: 10, def: 250, p: 0.08, c: 0.15, f: 0.02, kcal: 1.1, recipe: { items: [{ foodId: "yulaf", amount: 100 }], cooked: 400 } };
  state.combos = [{ id: "c1", name: "Kahvaltı kasesi", items: [{ foodId: "yulaf", amount: 60 }, { foodId: "custom_abc", amount: 150 }] }];
  ensureDayCopy(); dayMeals()[0].items.push({ foodId: "_est", amount: 1, est: { name: "Dışarıda", cal: 600, p: 30, c: 60, f: 20 } });
  state.mobilityLog[key(now - D)] = ["Couch Stretch"]; state.mobilityRoutine.items[0].done = true;
  state.supplementList[0].dose = 5; state.supplementList[0].unit = "g"; state.supplementList[0].time = "post";
  state.missSearches = [{ q: "kinoa", n: 2, ts: now }];
  renderAll();
  return JSON.parse(localStorage.getItem('ayk_plus_v5_state'));
}"""

JUNK = [None, "", "abc", 0, -5, 1e12, "12,5", [], {}, True, [None], {"x": 1}, "<b>x</b>", -0.0001]

def paths(o, pre=()):
    out = [pre] if pre else []
    if isinstance(o, dict):
        for k, v in o.items(): out += paths(v, pre + (k,))
    elif isinstance(o, list):
        for i, v in enumerate(o[:4]): out += paths(v, pre + (i,))
    return out

def mutate(state, rng, k):
    s = copy.deepcopy(state); done = []
    ps = paths(s)
    for _ in range(k):
        p = rng.choice(ps)
        parent = s
        try:
            for x in p[:-1]: parent = parent[x]
            last = p[-1]
            if rng.random() < 0.2 and isinstance(parent, dict):
                parent.pop(last, None); done.append(("sil", p))
            else:
                j = rng.choice(JUNK); parent[last] = copy.deepcopy(j); done.append((repr(j)[:12], p))
        except Exception: pass
    return s, done

VISIT = r"""async () => {
  const errs = [];
  const steps = [
    "switchTab('nutrition'); setNutriView('today')", "setNutriView('menus')", "setNutriView('foods')", "setNutriView('history')",
    "switchTab('gym'); setGymView('today')", "setGymView('program')", "setGymView('library')", "setGymView('history')", "startWorkout()",
    "state.gymActive = false; switchTab('mobility')", "mobOpen(state.mobilityRoutine.items[0] && state.mobilityRoutine.items[0].id)", "mobAddOpen()",
    "switchTab('progress'); setProgressView('genel')", "setProgressView('kilo')", "setProgressView('guc')", "setProgressView('beslenme')",
    "openProfile()", "hideProfile(); switchTab('nutrition'); openShopList()", "closeModal('shopModal'); checkNewDay()"
  ];
  for (const s of steps) { try { new Function(s)(); } catch (e) { errs.push(s.slice(0, 40) + " → " + String(e && e.message || e).slice(0, 120)); } }
  return errs;
}"""

def main():
    from playwright.sync_api import sync_playwright
    rng = random.Random(SEED_RNG)
    fallback = collections.Counter(); crash = collections.defaultdict(list); total = 0
    with server(REPO) as url, sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width": 390, "height": 844}, color_scheme="dark")
        ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.getElementById('splash'); if(s) s.remove();})")
        pg = ctx.new_page(); perr = []
        pg.on("pageerror", lambda e: perr.append(str(e)[:160]))
        pg.goto(url); pg.wait_for_timeout(400)
        base = pg.evaluate(RICH)
        for it in range(N):
            k = rng.choice([1, 1, 2, 3, 5, 8, 12])
            s, done = mutate(base, rng, k)
            pg.evaluate("s => { localStorage.clear(); localStorage.setItem('ayk_plus_v5_state', s); }", json.dumps(s))
            perr.clear(); pg.reload(); pg.wait_for_timeout(120)
            failed = pg.evaluate("!!localStorage.getItem('ayk_plus_v5_state_kurtarma')")
            errs = pg.evaluate(VISIT)
            errs += [f"(sayfa) {e}" for e in perr]
            total += 1
            label = " | ".join(f"{a}@{'.'.join(map(str, p))}" for a, p in done)
            if failed: fallback[label] += 1
            for e in set(errs): crash[e].append(label)
        b.close()
    print(f"{total} deneme")
    print(f"\n== Açılışta TÜM veri okunamadı sayıldı ({sum(fallback.values())}):")
    for l, c in fallback.most_common(25): print(f"  {c}× {l}")
    print(f"\n== Hatalar ({len(crash)} farklı):")
    for e, ls in sorted(crash.items(), key=lambda x: -len(x[1]))[:40]:
        print(f"  {len(ls)}× {e}\n      örnek: {ls[0][:150]}")

if __name__ == "__main__":
    main()
