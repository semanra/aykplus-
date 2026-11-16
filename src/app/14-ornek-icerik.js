// ===========================================================================
// v44: ÖRNEK İÇERİK ÜRETİCİLERİ — yalnızca veri + saf fonksiyonlar (kurulum ekranı çağırır; açılışta yan etkisi yok).
// Genel, yaygın Türk mutfağı menüsü; başlangıç ve ileri düzey için hazır programlar; kısa günlük esneme rutini.
// ===========================================================================

// Şablon ~2000 kcal. Yalnızca görünür (gizli olmayan) besin kimlikleri; çiğ tartılan besinler (tavuk, pirinç, bulgur).
const SAMPLE_MENU_TEMPLATE = [
  { title: "Kahvaltı", time: "08:00", items: [["u173424", 150], ["tr_beyaz_peynir", 40], ["tam_bugday_ekmek", 2], ["u170457", 100], ["u168409", 100], ["u169094", 20]] },
  { title: "Öğle yemeği", time: "13:00", items: [["u171077", 150], ["u170688", 70], ["u170886", 150], ["u170457", 150], ["u171413", 10]] },
  { title: "Ara öğün", time: "16:30", items: [["u173944", 120], ["u170567", 25], ["kefir", 200]] },
  { title: "Akşam yemeği", time: "19:30", items: [["u173686", 150], ["u168877", 60], ["u170379", 150], ["u171413", 10]] }
];
let _sampleMenuSeq = 0;
function buildSampleMenu(calTarget) {
  // v44: besin veritabanı yüklenmediyse ya da şablondaki bir besin gerçek (bulunamayan olmayan) kayıt değilse menü kurulmaz
  if (typeof USDA_FOODS === "undefined") return [];
  const db = getFoodDB();
  if (SAMPLE_MENU_TEMPLATE.some(m => m.items.some(([id]) => !db[id] || db[id]._lost))) return [];
  const mk = tpl => tpl.map(m => ({ title: t(m.title), time: m.time, items: m.items.map(([foodId, amount]) => ({ foodId, amount })) }));
  const rawMeals = mk(SAMPLE_MENU_TEMPLATE);
  const baseKcal = nutritionTotals(rawMeals).cal;
  const k = baseKcal > 0 && num(calTarget, 0) > 0 ? num(calTarget, 0) / baseKcal : 1;
  const tag = Date.now().toString(36) + (++_sampleMenuSeq) + Math.random().toString(36).slice(2, 5);
  const meals = rawMeals.map((m, mi) => ({
    id: "sm_" + tag + "_" + mi, title: m.title, time: m.time, done: false,
    items: m.items.map(it => {
      const unit = db[it.foodId] && db[it.foodId].unit;
      const v = it.amount * k;
      return { foodId: it.foodId, amount: unit === "g" || unit === "ml" ? Math.max(5, Math.round(v / 5) * 5) : Math.max(1, Math.round(v)) };
    })
  }));
  // v44 düzeltme: yuvarlamadan sonra menü hedefi aşmasın (−%5 … +%2). Karbonhidratı baskın gram besinlerden en çok kalori
  // vereni 5 g adımlarla kısılır (fazlaysa) ya da artırılır (eksikse); en az 5 g kalır.
  const tgt = num(calTarget, 0);
  if (tgt > 0) {
    const carbItems = [];
    meals.forEach(m => m.items.forEach(it => {
      const f = db[it.foodId];
      if (f && (f.unit === "g" || f.unit === "ml") && f.c * 4 > f.p * 4 && f.c * 4 > f.f * 9) carbItems.push(it);
    }));
    const kc = it => calcItemMacros(it).cal;
    for (let guard = 0; guard < 400 && carbItems.length; guard++) {
      const total = nutritionTotals(meals).cal;
      if (total > tgt * 1.02) {
        const c = carbItems.filter(it => it.amount > 5).sort((a, b) => kc(b) - kc(a))[0];
        if (!c) break;
        c.amount -= 5;
      } else if (total < tgt * 0.95) {
        const c = carbItems.slice().sort((a, b) => kc(b) - kc(a))[0];
        const step = calcItemMacros({ foodId: c.foodId, amount: 5 }).cal;
        if (total + step > tgt * 1.02) break;
        c.amount += 5;
      } else break;
    }
  }
  return meals;
}

// Hareket adları EXERCISE_LIBRARY içinden birebir (kas haritası adla eşleşir). [ad, set, hedef tekrar, varsayılan tekrar]; süreli: [ad, set, "t", saniye]
const SAMPLE_PROGRAMS = {
  new: [
    ["1. Gün: Tüm Vücut A", [["Machine Chest Press (Flat)", 3, "8–12", 10], ["Lat Pulldown (Wide Grip / Geniş Tutuş)", 3, "8–12", 10], ["Leg Press (45 Derece)", 3, "10–12", 10],
      ["Machine Shoulder Press", 3, "8–12", 10], ["Seated Leg Curl", 3, "10–12", 10], ["Plank / RKC Plank", 3, "t", 30]]],
    ["2. Gün: Tüm Vücut B", [["Incline Dumbbell Press", 3, "8–12", 10], ["Seated Cable Row (V-Bar / Close Grip)", 3, "8–12", 10], ["Goblet Squat", 3, "8–12", 10],
      ["Dumbbell Lateral Raise", 3, "12–15", 12], ["Dumbbell Romanian Deadlift", 3, "8–12", 10], ["Hammer Curl (Dumbbell)", 3, "10–12", 10]]],
    ["3. Gün: Tüm Vücut C", [["Flat Dumbbell Bench Press", 3, "8–12", 10], ["Machine High Row / Iso-Lateral Pulldown", 3, "8–12", 10], ["Horizontal / Seated Leg Press", 3, "10–12", 10],
      ["Overhead Dumbbell Shoulder Press (Seated / Standing)", 3, "8–12", 10], ["Machine Hip Thrust / Glute Drive", 3, "10–12", 10], ["Triceps Rope/Bar Pushdown", 3, "10–12", 10]]]
  ],
  pro: [
    ["1. Gün: Üst Vücut A", [["Barbell Bench Press", 4, "6–8", 8], ["Barbell Bent-Over Row (Overhand / Underhand)", 4, "6–8", 8], ["Overhead Dumbbell Shoulder Press (Seated / Standing)", 3, "8–10", 8],
      ["Lat Pulldown (Wide Grip / Geniş Tutuş)", 3, "8–12", 10], ["Dumbbell Lateral Raise", 3, "12–15", 12], ["Triceps Rope/Bar Pushdown", 3, "10–12", 10], ["Standing Barbell / EZ-Bar Curl", 3, "10–12", 10]]],
    ["2. Gün: Alt Vücut A", [["Barbell Back Squat (High-Bar / Low-Bar)", 4, "6–8", 8], ["Romanian Deadlift (RDL - Barbell)", 3, "8–10", 8], ["Leg Press (45 Derece)", 3, "10–12", 10],
      ["Seated Leg Curl", 3, "10–12", 10], ["Standing Calf Raise (Makine veya Smith)", 4, "10–15", 12], ["Hanging Leg Raise", 3, "10–15", 12]]],
    ["3. Gün: Üst Vücut B", [["Incline Dumbbell Press", 4, "8–10", 8], ["Pull-up (Geniş Tutuş Barfiks)", 4, "6–10", 8], ["Seated Cable Row (V-Bar / Close Grip)", 3, "8–12", 10],
      ["Cable Fly (Mid-Pulley)", 3, "12–15", 12], ["Face Pull (Rope)", 3, "12–15", 12], ["Hammer Curl (Dumbbell)", 3, "10–12", 10], ["Skullcrusher (EZ-Bar / Dumbbell Alna Triceps)", 3, "10–12", 10]]],
    ["4. Gün: Alt Vücut B", [["Conventional Deadlift", 3, "5", 5], ["Hack Squat", 3, "8–12", 10], ["Barbell Hip Thrust", 3, "8–12", 10],
      ["Leg Extension (Çift Bacak)", 3, "12–15", 12], ["Lying Leg Curl", 3, "10–12", 10], ["Seated Calf Raise", 4, "12–15", 12]]]
  ]
};
let _sampleProgSeq = 0;
function samplePrograms(level) {
  const list = SAMPLE_PROGRAMS[level === "pro" ? "pro" : "new"];
  const tag = Date.now().toString(36) + (++_sampleProgSeq);
  return list.map(([name, exs], di) => ({
    id: "day_s" + tag + "_" + di, name: t(name),
    exercises: exs.map(([exName, setCount, target, def]) => target === "t"
      ? { name: exName, kind: "time", targetInfo: setCount + "x" + def + " sn", note: "", sets: makeTimeSets(setCount, def) }
      : { name: exName, targetInfo: setCount + "x" + target, note: t("Hedef: {n} Set x {hedef} Tekrar", { n: setCount, hedef: target }), sets: makeSets(setCount, target, 0, def) })
  }));
}

// Hareket adları mobilite kütüphanesinden birebir. [ad, tür, bölge, ikinci bölge, mod, tekrar, süre, set, taraf]
const SAMPLE_MOBILITY_ITEMS = [
  ["Quadruped Cat-Cow", "dynamic", "spine", "", "reps", 10, 30, 1, 1],
  ["World’s Greatest Stretch", "dynamic", "hip", "spine", "reps", 8, 30, 1, 2],
  ["Leg Swings (Öne-Arkaya & Yana)", "dynamic", "hip", "hamstring", "reps", 12, 30, 1, 2],
  ["Couch Stretch", "static", "hip", "", "time", 10, 30, 2, 2],
  ["Single-Leg Seated Hamstring Stretch", "static", "hamstring", "", "time", 10, 30, 2, 2],
  ["Doorway Pec & Biceps Stretch", "static", "chest", "shoulder", "time", 10, 30, 2, 1],
  ["Child’s Pose with Lat Reach", "static", "shoulder", "spine", "time", 10, 45, 1, 2]
];
function sampleMobility() {
  return {
    id: mobNewRoutineId(), name: t("Günlük esneme"),
    items: SAMPLE_MOBILITY_ITEMS.map(([name, type, region, region2, mode, reps, sec, sets, sides]) =>
      normMobItem({ id: mobNewId(), name, type, region, region2, mode, reps, sec, sets, sides, note: "", rx: "", rxOk: true, done: false }))
  };
}
