// ============================================================================
// AYK+ — UYGULAMA MANTIĞI (sürüm: src/markup.html Ayarlar etiketi ve sw.js CACHE)
// ============================================================================

const DEFAULT_SETTINGS = {
  sex: "male", height: 180, age: 26, targetWeight: 82,
  waterTarget: 3.5, restSec: 90, sound: true, mobSound: true, keepAwake: true,
  bodyFat: "", targetBodyFat: "",
  macroView: "eaten", calAdjust: 0, coachAppliedAt: 0, barKg: 20, separatePlans: false, splash: true,
  nutriLight: false, scaleOn: false, scaleBase: 0,
  theme: "system"   // v31: system | dark | light (nutriLight eski alan, artık kullanılmıyor ama silinmez)
};
const DEFAULT_SUPPS = [
  { id: "creatine", name: "⚡ Kreatin (5g)" },
  { id: "greens", name: "🥬 Greens" },
  { id: "omega", name: "🐟 Omega/Vit" }
];
// v24: hazır takviyeler (Düzenle'de tek dokunuşla eklenir; listede adı m'ye uyan takviye varsa gösterilmez)
const SUPP_PRESETS = [
  { key: "d3k2", m: /d3|d vitamin/, name: "Vitamin D3 + K2", dose: 1, step: 1, min: 1, max: 10, unit: "damla/kapsül", note: "Tok karnına", time: "morning" },
  { key: "omega3", m: /omega/, name: "Omega-3", dose: 2, step: 1, min: 1, max: 6, unit: "softjel", note: "Tok karnına", time: "morning" },
  { key: "creatine", m: /kreatin|creatine/, name: "Kreatin Monohidrat", dose: 5, step: 1, min: 3, max: 10, unit: "g", note: "Bol su ile", time: "post" },
  { key: "whey", m: /whey|protein tozu/, name: "Whey Protein", dose: 1, step: 0.5, min: 0.5, max: 4, unit: "ölçek", note: "Antrenman sonrası", time: "post" },
  { key: "magnesium", m: /magnez/, name: "Magnezyum", dose: 200, step: 100, min: 100, max: 600, unit: "mg", note: "Uykudan 1 saat önce", time: "bed" },
  { key: "zinc", m: /cinko|zinc/, name: "Çinko", dose: 15, step: 5, min: 5, max: 50, unit: "mg", note: "Akşam", time: "bed" }
];
const r2 = v => Math.round(v * 100) / 100;
function fmtDose(v) { return String(r2(v)).replace(".", ","); }
const SUPP_DOSE_KEYS = ["dose", "unit", "step", "min", "max"];
const TABS = ["nutrition", "gym", "mobility", "progress"];
const DAY_MS = 86400000;

// ---------------------------------------------------------------------------
// YARDIMCI FONKSİYONLAR
// ---------------------------------------------------------------------------
const $ = id => document.getElementById(id);
function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function num(v, d = 0) {
  if (typeof v === "number") return isFinite(v) ? v : d;
  const n = parseFloat(String(v ?? "").replace(",", ".").trim());
  return isFinite(n) ? n : d;
}
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function round1(n) { return Math.round(n * 10) / 10; }
function fmtNum(n) { return String(round1(n)).replace(".", ","); }
function round2(n) { return Math.round(n * 100) / 100; }
function fmtKg(n) { return String(round2(n)).replace(".", ","); }
function todayStr(d = new Date()) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
// v21: Beslenme günü (Profil → Gün geçişi, 00:00–05:00). Örn. 03:00 seçiliyse 02:30'da hâlâ önceki gün sayılır.
function dayStartHour() { const h = parseInt(state && state.settings ? state.settings.dayStartHour : 0, 10); return h >= 0 && h <= 5 ? h : 0; }
function logicalNow() { return new Date(Date.now() - dayStartHour() * 3600000); }
function logicalToday() { return todayStr(logicalNow()); }
function fmtDate(ts, withTime = false) {
  const o = { day: "2-digit", month: "short" };
  if (withTime) { o.hour = "2-digit"; o.minute = "2-digit"; }
  return new Date(ts).toLocaleDateString("tr-TR", o);
}
function fmtClock(sec) {
  sec = Math.max(0, Math.round(sec));
  return String(Math.floor(sec / 60)).padStart(2, "0") + ":" + String(sec % 60).padStart(2, "0");
}
function exKey(name) { return String(name || "").toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/\s+/g, " ").trim(); }
function normSearch(s) {
  return String(s || "").toLocaleLowerCase("tr").replace(/ı/g, "i").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function weekStart(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x.getTime();
}

// Hareket tipini isimden otomatik algıla
function detectKind(name) {
  const n = String(name || "").toLocaleLowerCase("tr");
  if (/farmer|çiftçi|kettlebell/.test(n)) return "weight";
  if (/plank|vacuum|dead hang|wall sit|l-sit|hollow hold|asılma/.test(n)) return "time";
  if (/treadmill|koşu|\brun\b|running|jogging|yürüyüş|stairmaster|merdiven|bike|bisiklet|cycling|rowing machine|kürek|elliptical|eliptik|jump rope|ip atlama|swim|yüzme|kardiyo|cardio|hiit|spinning/.test(n)) return "cardio";
  return "weight";
}
const KIND_LABEL = { weight: "🏋️ Ağırlık", cardio: "🏃 Kardiyo", time: "⏱️ Süreli" };

function makeWeightSets(count, target, kg = 0, reps = 10) {
  return Array.from({ length: count }, () => ({ kg, reps, target, done: false }));
}
function makeTimeSets(count, sec) {
  return Array.from({ length: count }, () => ({ sec, target: sec + " sn", done: false }));
}
function makeCardioRow(min = 30, km = "", lvl = "") { return { min, km, lvl, done: false }; }

// ---------------------------------------------------------------------------
// DURUM (STATE) YÜKLEME, NORMALLEŞTİRME, KAYDETME
// ---------------------------------------------------------------------------
// v23: set zorluğu etiketleri (durum yüklenirken de kullanıldığı için en üstte)
const EFFORT_LABELS = { 1: "Kolay", 2: "Orta", 3: "Zor", 4: "Tükeniş" };
const EFFORT_COLORS = { 1: "#4ADE80", 2: "#1FD1C1", 3: "#FBBF24", 4: "#FF5A5F" };
function normalizeExercise(ex) {
  // v35: adı okunamayan hareket silinmez, "Adsız hareket" olur; boş/bozuk set kayıtları atılır
  if (typeof ex.name !== "string" || !ex.name.trim()) ex.name = String(ex.name == null || typeof ex.name === "object" ? "" : ex.name).trim() || "Adsız hareket";
  if (Array.isArray(ex.sets)) ex.sets = ex.sets.filter(isObj);
  if (!ex.kind) {
    ex.kind = detectKind(ex.name);
    if (ex.kind === "cardio") {
      ex.sets = [makeCardioRow(30)];
      ex.targetInfo = "30 dk";
      if (/^Hedef:/.test(ex.note || "")) ex.note = "";
    } else if (ex.kind === "time") {
      const n = Math.max(1, Math.min(10, (ex.sets || []).length || 3));
      ex.sets = makeTimeSets(n, 45);
      ex.targetInfo = n + "x45 sn";
      if (/^Hedef:/.test(ex.note || "")) ex.note = "";
    }
  }
  if (!Array.isArray(ex.sets) || ex.sets.length === 0) {
    ex.sets = ex.kind === "cardio" ? [makeCardioRow(30)] : ex.kind === "time" ? makeTimeSets(3, 45) : makeWeightSets(3, "8–12");
  }
  ex.sets.forEach(s => { s.done = !!s.done; if (s.e != null && !(EFFORT_LABELS[s.e] && s.done)) delete s.e; });   // v23: set zorluğu (1–4)
  if (ex.note == null) ex.note = "";
  return ex;
}

// v25: Bozuk/eski veriye karşı öğün ve kalem temizliği. Boş (null) öğün/kalem atılır; metin miktar ("80,5") sayıya
// çevrilir; okunamayan miktar 0 olur (besin silinmez, değer tahmin edilmez).
function isObj(x) { return !!x && typeof x === "object" && !Array.isArray(x); }
function normItems(items) {
  if (!Array.isArray(items)) return [];
  return items.filter(i => isObj(i) && (isObj(i.est) || (i.foodId != null && i.foodId !== ""))).map(i => {
    i.amount = num(i.amount, 0);
    if (isObj(i.est)) {
      const e = i.est;
      i.est = { ...e, name: String(e.name || "Tahmini öğün").slice(0, 60), cal: num(e.cal, 0), p: num(e.p, 0), c: num(e.c, 0), f: num(e.f, 0) };
      if (i.foodId == null || i.foodId === "") i.foodId = "_est";
    } else {
      delete i.est;
      i.foodId = String(i.foodId);
    }
    return i;
  });
}
function normMealList(list) {
  if (!Array.isArray(list)) return [];
  return list.filter(isObj).map((m, i) => {
    m.items = normItems(m.items);
    // v35: metin alanları metin olsun (sayı/boş değer ekranları bozmasın); değer uydurulmaz, yalnızca yer tutucu
    if (typeof m.title !== "string" || !m.title.trim()) m.title = (m.title != null && typeof m.title !== "object" ? String(m.title) : "").trim() || `${i + 1}. Öğün`;
    if (m.targetNote != null && typeof m.targetNote !== "string") m.targetNote = typeof m.targetNote === "object" ? "" : String(m.targetNote);
    if (m.time != null && (typeof m.time !== "string" || !/^\d{1,2}:\d{2}$/.test(m.time))) delete m.time;
    return m;
  });
}

// v27: MOBİLİTE VERİSİ — eski "uygulama" yazısını (örn. "Sağ ve Sol için 2'şer Set x 30 sn") alanlara çevirir.
// Aralıklarda üst değer alınır; hiçbir değer okunamazsa ok:false (varsayılanlar kullanılır, yazı rx'te saklanır).
function parseMobRx(rx) {
  const t = String(rx || "");
  const out = { ok: false };
  const sm = t.match(/(\d+)\s*(?:['’]?\s*(?:er|şer|ar|şar))?\s*set/i);
  if (sm) out.sets = parseInt(sm[1], 10);
  const rm = t.match(/(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:tekrar|tur)/i);
  const tm = t.match(/(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:sn|saniye|sec)(?![a-zçğıöşü])/i);
  if (tm) { out.mode = "time"; out.sec = parseInt(tm[2] || tm[1], 10); out.ok = true; }
  else if (rm) { out.mode = "reps"; out.reps = parseInt(rm[2] || rm[1], 10); out.ok = true; }
  if (/sa[gğ]\s*(?:ve|\/|-)\s*sol|her\s*(?:ayak|kol|y[oö]n|bacak|taraf)/i.test(t)) out.sides = 2;
  return out;
}
function mobLibEntry(name) {
  for (const [ci, cat] of Object.keys(MOBILITY_LIBRARY).entries()) {
    const m = MOBILITY_LIBRARY[cat].find(x => x.name === name);
    if (m) return { m, type: MOB_TYPES[Math.min(ci, 2)][0] };
  }
  return null;
}
function mobNewId() { return "mob_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function mobFromLegacy(x, type) {
  if (!isObj(x) || !String(x.name || "").trim()) return null;
  const lib = mobLibEntry(x.name);
  if (lib && lib.type === "release") type = "release";
  const rx = String(x.prescription || "");
  const r = parseMobRx(rx);
  const timer = num(x.timerSec, 0);
  if (r.mode === "time" && timer > 0) r.sec = timer;
  const reg = MOB_LIB_REGIONS[x.name] || [];
  return {
    id: mobNewId(), name: x.name, type, region: reg[0] || "", region2: reg[1] || "",
    sets: r.sets || (r.ok ? 1 : (type === "dynamic" ? 1 : 2)),
    mode: r.mode || (type === "dynamic" ? "reps" : "time"),
    reps: r.reps || 10, sec: r.sec || (timer > 0 ? timer : 30), sides: r.sides || 1,
    note: x.note || "", rx, rxOk: r.ok, done: !!x.done
  };
}
const MOB_REGION_KEYS = MOB_REGIONS.map(r => r[0]);
function normMobItem(x) {
  if (!isObj(x) || !String(x.name || "").trim()) return null;
  const clampInt = (v, lo, hi, d) => { const n = Math.round(num(v, d)); return Math.min(hi, Math.max(lo, isFinite(n) ? n : d)); };
  const region = MOB_REGION_KEYS.includes(x.region) ? x.region : "";
  const region2 = MOB_REGION_KEYS.includes(x.region2) && x.region2 !== region ? x.region2 : "";
  return {
    id: String(x.id || mobNewId()), name: String(x.name).trim().slice(0, 80),
    type: MOB_TYPES.some(t => t[0] === x.type) ? x.type : "static",
    region, region2,
    sets: clampInt(x.sets, 1, 10, 1), mode: x.mode === "reps" ? "reps" : "time",
    reps: clampInt(x.reps, 1, 100, 10), sec: clampInt(x.sec, 5, 600, 30), sides: num(x.sides, 1) === 2 ? 2 : 1,
    note: String(x.note || ""), rx: String(x.rx || ""), rxOk: x.rxOk !== false, done: !!x.done
  };
}

function normalizeState(raw) {
  const s = { ...clone(DEFAULT_STATE), ...(raw || {}) };
  s.settings = { ...DEFAULT_SETTINGS, ...((raw && raw.settings) || {}) };
  s.meals = normMealList(s.meals);   // v25
  if (s.meals.length === 0) s.meals = clone(DEFAULT_STATE.meals);
  if (Array.isArray(s.workoutDays)) s.workoutDays = s.workoutDays.filter(isObj);   // v25: boş gün kaydı açılışı bozmasın
  if (!Array.isArray(s.workoutDays) || s.workoutDays.length === 0) s.workoutDays = clone(DEFAULT_STATE.workoutDays);
  s.workoutDays.forEach(day => {
    if (!Array.isArray(day.exercises)) day.exercises = [];
    day.exercises = day.exercises.filter(isObj);   // v35: boş/bozuk hareket kaydı bütün veriyi okunamaz yapmasın
    if (typeof day.name !== "string" || !day.name.trim()) day.name = (day.name != null && typeof day.name !== "object" ? String(day.name) : "").trim() || "Antrenman günü";
    day.exercises.forEach(normalizeExercise);
  });
  if (!isObj(s.mobilityRoutine)) s.mobilityRoutine = clone(DEFAULT_STATE.mobilityRoutine);
  if (!Array.isArray(s.mobilityRoutine.dynamic)) s.mobilityRoutine.dynamic = [];
  if (!Array.isArray(s.mobilityRoutine.static)) s.mobilityRoutine.static = [];
  // v27: iki eski liste bir kez tek sıralı listeye çevrilir; eski diziler yedek olarak dokunulmadan kalır
  const mr = s.mobilityRoutine;
  // v39: birden fazla rutin. Eski tek liste (items; o da yoksa eski dynamic/static) bir kez "Rutinim"e taşınır ve
  // items kopyası silinir (veri taşındı). routines varken eski diziler hiç okunmaz.
  if (!Array.isArray(mr.routines)) {
    const items = Array.isArray(mr.items) ? mr.items : [...mr.dynamic.map(x => mobFromLegacy(x, "dynamic")), ...mr.static.map(x => mobFromLegacy(x, "static"))];
    mr.routines = [{ id: "mr_main", name: "Rutinim", items }];
  }
  delete mr.items;
  mr.routines = mr.routines.filter(isObj).map(r => ({
    id: typeof r.id === "string" && r.id ? r.id : "mr_" + Math.random().toString(36).slice(2, 9),
    name: (r.name != null && typeof r.name !== "object" ? String(r.name) : "").trim().slice(0, 40) || "Rutin",
    items: Array.isArray(r.items) ? r.items.map(normMobItem).filter(Boolean) : []
  }));
  if (!isObj(s.mobilityLog)) s.mobilityLog = {};
  if (!Array.isArray(s.workoutLogs)) s.workoutLogs = [];
  if (!Array.isArray(s.weightLogs)) s.weightLogs = [];
  // v35: boş (null) / bozuk kayıtlar atılır; geçerli kayıtlar ve alanları olduğu gibi kalır
  s.workoutLogs = s.workoutLogs.filter(isObj);
  s.workoutLogs.forEach(l => { if (l.dayName != null && typeof l.dayName !== "string") l.dayName = typeof l.dayName === "object" ? "" : String(l.dayName); });
  s.weightLogs = s.weightLogs.filter(isObj);
  if (!isObj(s.exerciseHistory)) s.exerciseHistory = {};
  Object.keys(s.exerciseHistory).forEach(k => {
    const arr = s.exerciseHistory[k];
    if (!Array.isArray(arr)) { delete s.exerciseHistory[k]; return; }
    const ok = arr.filter(h => isObj(h) && num(h.ts, 0) > 0);
    ok.forEach(h => { h.sets = Array.isArray(h.sets) ? h.sets.filter(isObj) : []; });
    if (ok.length) s.exerciseHistory[k] = ok; else delete s.exerciseHistory[k];
  });
  if (!isObj(s.dailyLogs)) s.dailyLogs = {};
  // v25: boş günlük kayıtlar atılır, içlerindeki öğünler temizlenir
  Object.keys(s.dailyLogs).forEach(k => {
    const d = s.dailyLogs[k];
    if (!isObj(d)) { delete s.dailyLogs[k]; return; }
    if (d.meals != null) { if (Array.isArray(d.meals)) d.meals = normMealList(d.meals); else delete d.meals; }
  });
  if (!Array.isArray(s.recentFoods)) s.recentFoods = [];
  s.recentFoods = s.recentFoods.filter(x => typeof x === "string" && x);   // v35
  if (!isObj(s.customFoods)) s.customFoods = {};
  // v25: özel besin kayıtları: boşlar atılır, değerler sayıya çevrilir, tarif malzemeleri temizlenir
  Object.keys(s.customFoods).forEach(id => {
    const f = s.customFoods[id];
    if (!isObj(f)) { delete s.customFoods[id]; return; }
    f.name = String(f.name || "Adsız besin");
    ["p", "c", "f"].forEach(k => { f[k] = num(f[k], 0); });
    if (f.kcal != null) { const k = num(f.kcal, NaN); if (isFinite(k)) f.kcal = k; else delete f.kcal; }
    if (f.def != null) f.def = num(f.def, 100) || 100;
    if (f.recipe != null) {
      if (!isObj(f.recipe)) delete f.recipe;
      else { f.recipe.items = normItems(f.recipe.items); if (f.recipe.cooked != null) f.recipe.cooked = num(f.recipe.cooked, 0); }
    }
  });
  if (!s.supplements || typeof s.supplements !== "object") s.supplements = {};
  if (!Array.isArray(s.supplementList)) s.supplementList = clone(DEFAULT_SUPPS);
  // v17: zamanlama etiketi doğrulaması
  s.supplementList = s.supplementList.filter(x => x && typeof x === "object" && x.id && x.name && typeof x.name !== "object");
  s.supplementList.forEach(x => { x.id = String(x.id); x.name = String(x.name); });   // v35
  s.supplementList.forEach(x => {
    if (!["morning", "pre", "post", "bed", "custom"].includes(x.time)) delete x.time;
    if (x.time === "custom") x.timeLabel = String(x.timeLabel || "Özel").slice(0, 24); else delete x.timeLabel;
    normalizeSuppDose(x);   // v24: isteğe bağlı doz / birim / adım
  });
  s.restMeals = normMealList(s.restMeals);   // v25
  if (!Array.isArray(s.measurements)) s.measurements = [];
  s.measurements = s.measurements.filter(isObj);   // v35
  if (!num(s.workoutStartedAt, 0)) s.workoutStartedAt = 0;
  // v10: antrenman ve dinlenme menüleri her zaman ayrı
  if (!s.restMeals.length) s.restMeals = clone(s.meals).map(mm => ({ ...mm, id: (mm.id || "meal") + "_rest", done: false }));
  s.settings.separatePlans = true;
  // v13: her öğünün kalıcı bir kimliği olsun (açık/kapalı görünüm "Geri al" sonrası da korunur)
  [s.meals, s.restMeals].forEach((ms, li) => {
    const seen = new Set();
    ms.forEach((m, i) => {
      if (!m.id || seen.has(m.id)) m.id = "meal_" + Date.now().toString(36) + "_" + li + "_" + i;
      seen.add(m.id);
    });
  });
  // v14: bugüne özel menü kopyası ({ date, train, rest }); yalnızca o günün tarihiyle geçerli
  if (!s.dayPlan || typeof s.dayPlan !== "object" || typeof s.dayPlan.date !== "string") s.dayPlan = null;
  else ["train", "rest"].forEach(k => {
    const a = s.dayPlan[k];
    if (!Array.isArray(a)) { s.dayPlan[k] = null; return; }
    s.dayPlan[k] = normMealList(a);   // v25
  });
  // v15: komboalar, alışveriş listesi
  if (!Array.isArray(s.combos)) s.combos = [];
  s.combos = s.combos.filter(c => c && typeof c === "object" && Array.isArray(c.items)).map(c => ({
    id: String(c.id || "combo_" + Math.random().toString(36).slice(2, 9)), name: String(c.name || "Kombo").slice(0, 40),
    items: c.items.filter(i => i && i.foodId && num(i.amount, 0) > 0).map(i => ({ foodId: String(i.foodId), amount: num(i.amount, 0) }))
  }));
  if (!s.shopChecked || typeof s.shopChecked !== "object" || Array.isArray(s.shopChecked)) s.shopChecked = {};
  if (!(Number.isInteger(s.shopTrainDays) && s.shopTrainDays >= 0 && s.shopTrainDays <= 7)) s.shopTrainDays = null;
  if (s.nutriHistRange !== "30") s.nutriHistRange = "7";
  // v18: bulunamayan aramalar
  if (!Array.isArray(s.missSearches)) s.missSearches = [];
  s.missSearches = s.missSearches.filter(x => x && typeof x.q === "string" && x.q.trim()).slice(0, 50);
  // v19: kullanılan besinlerin yedek değerleri
  const fs = {};
  if (s.foodSnap && typeof s.foodSnap === "object" && !Array.isArray(s.foodSnap)) {
    Object.keys(s.foodSnap).forEach(id => {
      const x = s.foodSnap[id];
      if (!x || typeof x !== "object") return;
      if (!x.n) { fs[id] = { n: "" }; return; }
      fs[id] = { n: String(x.n).slice(0, 80), u: ["g", "ml", "adet"].includes(x.u) ? x.u : String(x.u || "g").slice(0, 12), p: num(x.p, 0), c: num(x.c, 0), f: num(x.f, 0), k: num(x.k, 0), d: num(x.d, 0) };
    });
  }
  s.foodSnap = fs;
  if (!["today", "program", "library", "history"].includes(s.gymView)) s.gymView = "today";
  if (!["today", "menus", "foods", "history"].includes(s.nutriView)) s.nutriView = "today";
  // v29: İlerleme alt sekmesi (son açılan hatırlanır)
  if (!["genel", "kilo", "guc", "beslenme"].includes(s.progressView)) s.progressView = "genel";
  s.settings.nutriLight = !!s.settings.nutriLight;
  if (!["system", "dark", "light"].includes(s.settings.theme)) s.settings.theme = "system";
  // v26: kalori halkası bir kereliğine "Yenen"e geçer (eskiden varsayılan "Plan" da kaydediliyordu, seçimle ayırt edilemiyordu);
  // işaret kaydedilir, sonra kullanıcının seçimi korunur.
  if (!s.settings.macroViewV26) { s.settings.macroView = "eaten"; s.settings.macroViewV26 = 1; }
  if (s.settings.macroView !== "plan") s.settings.macroView = "eaten";
  { const h = parseInt(s.settings.dayStartHour, 10); s.settings.dayStartHour = h >= 0 && h <= 5 ? h : 0; }   // v21
  s.settings.waterAuto = s.settings.waterAuto !== false;   // v24: su hedefi kiloya göre (varsayılan açık)
  s.settings.scaleOn = !!s.settings.scaleOn;
  s.settings.scaleBase = num(s.settings.scaleBase, 0);
  if (s.settings.scaleOn && !(s.settings.scaleBase > 0)) s.settings.scaleOn = false;
  if (!["week", "today", "program"].includes(s.libRange)) s.libRange = "week";
  if (s.libMuscle && !["Göğüs", "Sırt", "Omuz", "Ön Bacak", "Arka Bacak & Kalça", "Kalf", "Biceps", "Triceps", "Karın"].includes(s.libMuscle)) s.libMuscle = null;
  s.workoutDays.forEach((d, i) => { if (!d.id) d.id = "day_" + i + "_" + Date.now(); });
  if (!TABS.includes(s.activeTab)) s.activeTab = "nutrition";
  s.activeWorkoutDayIdx = Math.max(0, Math.min(s.workoutDays.length - 1, parseInt(s.activeWorkoutDayIdx) || 0));
  s.weight = num(s.weight, 105);
  s.deficit = num(s.deficit, 700);
  s.waterLiters = num(s.waterLiters, 0);
  if (!s.createdAt) s.createdAt = Date.now();
  // v35: bozuk "bugün" tarihi gün geçişini sessizce durdurmasın (checkNewDay bugünün tarihini yazar; arşivlenecek gün uydurulmaz)
  if (typeof s.today !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s.today)) delete s.today;
  return s;
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) { const st = normalizeState(JSON.parse(saved)); hadV5State = true; return st; }
    const oldV4 = localStorage.getItem("ayk_plus_v4_state");
    if (oldV4) {
      const o = JSON.parse(oldV4);
      return normalizeState({
        weight: o.weight, deficit: o.deficit, dayType: o.dayType, waterLiters: o.waterLiters,
        supplements: o.supplements, weightLogs: o.weightLogs, customFoods: o.customFoods,
        customIconDataUrl: o.customIconDataUrl, meals: o.meals
      });
    }
  } catch (e) {
    console.error(e);
    // v25: Kayıtlı veri okunamadı. Boş veriyle açılıp gerçek verinin üzerine yazmadan önce ham hâli ayrı bir
    // anahtara kopyalanır (ana anahtar değişmez) ve açılışta uyarı gösterilir.
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw && !localStorage.getItem(RESCUE_KEY)) localStorage.setItem(RESCUE_KEY, raw);
      if (raw) loadFailed = true;
    } catch (e2) { console.error(e2); }
  }
  return normalizeState({});
}
const RESCUE_KEY = "ayk_plus_v5_state_kurtarma";
var loadFailed = false;
var hadV5State = false;   // v37: açılışta bugünkü kayıt vardı ve okundu (eski v4 kaydı ancak o zaman silinir)

let saveFailNotified = false;
function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    saveFailNotified = false;
  } catch (e) {
    console.error(e);
    if (!saveFailNotified) { toast("Veriler kaydedilemedi! Hemen yedek al.", "error"); saveFailNotified = true; }
  }
}

let state = loadState();
let progressSel = "";

// v18: USDA veritabanı (foods.js) uygulama biçimine bir kez çevrilir; birleşik tablo önbellekte tutulur
// (her renderAll'da ve özel besin nesnesi değişince yenilenir). foods.js yüklenemezse uygulama eski listeyle çalışır.
const USDA_DB = (() => {
  const out = {};
  try {
    if (typeof USDA_FOODS === "undefined") return out;
    Object.keys(USDA_FOODS).forEach(id => {
      const x = USDA_FOODS[id];
      const def = num(x.d, 100) || 100;
      const f = { name: x.n, cat: x.c, unit: "g", step: def < 60 ? 5 : 10, def, p: x.p, c: x.h, f: x.f, kcal: x.k, src: x.s, aliases: x.a || [] };
      if (x.o) f.portions = x.o;
      if (x.x) f.kx = x.x;
      if (x.t) f.note = x.t;
      if (x.z) f.hidden = 1;
      if (x.b != null) f.fib = x.b;     // v22: lif (g / g)
      if (x.na != null) f.na = x.na;    // v22: sodyum (mg / g)   // v20: pişmiş hâl — listede gösterilmez, menüde kullanılıyorsa çalışır
      out[id] = f;
    });
  } catch (e) { console.error(e); }
  return out;
})();
let foodDbVer = 0, _rdb = null, _rdbRef = null, _rdbVer = -1, _fdb = null, _fdbRef = null, _fdbSnap = null, _fdbVer = -1;
// Gerçek besin tablosu: veritabanı + uygulamanın listesi + özel besinler
function realFoodDB() {
  const c = state.customFoods || {};
  if (_rdb && _rdbRef === c && _rdbVer === foodDbVer) return _rdb;
  _rdb = Object.assign({}, USDA_DB, BASE_FOOD_DB, c);
  _rdbRef = c; _rdbVer = foodDbVer;
  return _rdb;
}
// v19: Menüde/komboda/tarifte kullanılan ama artık bulunamayan besinler (foods.js yüklenemedi, besin kaldırıldı...)
// sessizce 0 kcal sayılmaz: son kaydedilen değerleriyle (state.foodSnap) "⚠" işaretli olarak yer alır.
function lostFood(x) {
  const known = !!(x && x.n);
  const unit = known && x.u ? x.u : "g";
  const scal = unit === "g" || unit === "ml";
  const f = {
    name: "⚠ " + (known ? x.n : "Bulunamayan besin"), cat: "⚠ Bulunamayan", unit, step: scal ? 10 : 1,
    def: num(known && x.d, scal ? 100 : 1) || (scal ? 100 : 1),
    p: known ? num(x.p, 0) : 0, c: known ? num(x.c, 0) : 0, f: known ? num(x.f, 0) : 0, _lost: known ? 1 : 2
  };
  if (known && x.k != null) f.kcal = num(x.k, 0);
  return f;
}
function getFoodDB() {
  const c = state.customFoods || {}, s = state.foodSnap || {};
  if (_fdb && _fdbRef === c && _fdbSnap === s && _fdbVer === foodDbVer) return _fdb;
  const real = realFoodDB();
  const lost = {};
  Object.keys(s).forEach(id => { if (!real[id]) lost[id] = lostFood(s[id]); });
  _fdb = Object.keys(lost).length ? Object.assign(lost, real) : real;
  _fdbRef = c; _fdbSnap = s; _fdbVer = foodDbVer;
  return _fdb;
}
function invalidateFoodDB() { foodDbVer++; }
// v20: Gizli besinler (pişmiş hâller, eski listedeki tekrarlar) ve bulunamayanlar arama/liste/seçici/önerilerde gösterilmez;
// menüde kullanılıyorsa hesaplanmaya devam eder.
function isHiddenFood(f) { return !!(f && (f._lost || f.hidden)); }
// Kullanılan her besinin değerleri yedeklenir (her renderAll'da; yalnızca değişince yazılır)
function foodRefIds() {
  const ids = new Set();
  const add = items => (Array.isArray(items) ? items : []).forEach(i => { if (i && !i.est && i.foodId && i.foodId !== "_est") ids.add(String(i.foodId)); });
  allMealLists().forEach(l => (l || []).forEach(m => add(m && m.items)));
  (state.combos || []).forEach(c => add(c.items));
  Object.values(state.customFoods || {}).forEach(f => { if (f && f.recipe) add(f.recipe.items); });
  Object.values(state.dailyLogs || {}).forEach(d => { if (d && Array.isArray(d.meals)) d.meals.forEach(m => add(m && m.items)); });
  return ids;
}
function refreshFoodSnaps() {
  const real = realFoodDB(), old = state.foodSnap || {}, out = {};
  const r = x => Math.round(num(x, 0) * 10000) / 10000;
  foodRefIds().forEach(id => {
    const f = real[id];
    if (f) out[id] = { n: String(f.name || "").slice(0, 80), u: f.unit || "g", p: r(f.p), c: r(f.c), f: r(f.f), k: r(kcalPerUnit(f)), d: num(f.def, 0) };
    else out[id] = old[id] || { n: "" };
  });
  if (JSON.stringify(out) !== JSON.stringify(old)) state.foodSnap = out;
}
// Uyarı yalnızca menülerde, bugünkü planda ve kombolarda kullanılanlar için (tarif içi/arşiv değerleri zaten kayıtlı)
function lostFoodIds() {
  const real = realFoodDB(), ids = new Set();
  const add = items => (items || []).forEach(i => { if (i && !i.est && i.foodId && !real[i.foodId]) ids.add(i.foodId); });
  allMealLists().forEach(l => (l || []).forEach(m => add(m && m.items)));
  (state.combos || []).forEach(c => add(c.items));
  return [...ids];
}
// Açılışta bir kez: veritabanı yüklenemediyse veya bulunamayan besin varsa söyle
function checkFoodHealth() {
  if (typeof USDA_FOODS === "undefined") { toast("Besin veritabanı yüklenemedi. Uygulamayı tamamen kapatıp yeniden aç.", "error"); return; }
  const n = lostFoodIds().length;
  if (n) toast(`${n} besin veritabanında bulunamadı; "⚠" işaretliler son kayıtlı değerleriyle hesaplanıyor.`, "error");
}
function activeDay() { return state.workoutDays[state.activeWorkoutDayIdx]; }

