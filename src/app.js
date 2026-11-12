// ============================================================================
// AYK+ v10 — UYGULAMA MANTIĞI
// ============================================================================

const DEFAULT_SETTINGS = {
  sex: "male", height: 180, age: 26, targetWeight: 82,
  waterTarget: 3.5, restSec: 90, sound: true, keepAwake: true,
  bodyFat: "", targetBodyFat: "",
  macroView: "eaten", calAdjust: 0, coachAppliedAt: 0, barKg: 20, separatePlans: false, splash: true,
  nutriLight: false, scaleOn: false, scaleBase: 0
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
  return list.filter(isObj).map(m => { m.items = normItems(m.items); return m; });
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
    day.exercises.forEach(normalizeExercise);
  });
  if (!isObj(s.mobilityRoutine)) s.mobilityRoutine = clone(DEFAULT_STATE.mobilityRoutine);
  if (!Array.isArray(s.mobilityRoutine.dynamic)) s.mobilityRoutine.dynamic = [];
  if (!Array.isArray(s.mobilityRoutine.static)) s.mobilityRoutine.static = [];
  // v27: iki eski liste bir kez tek sıralı listeye çevrilir; eski diziler yedek olarak dokunulmadan kalır
  const mr = s.mobilityRoutine;
  if (!Array.isArray(mr.items)) mr.items = [...mr.dynamic.map(x => mobFromLegacy(x, "dynamic")), ...mr.static.map(x => mobFromLegacy(x, "static"))];
  mr.items = mr.items.map(normMobItem).filter(Boolean);
  if (!isObj(s.mobilityLog)) s.mobilityLog = {};
  if (!Array.isArray(s.workoutLogs)) s.workoutLogs = [];
  if (!Array.isArray(s.weightLogs)) s.weightLogs = [];
  if (!s.exerciseHistory || typeof s.exerciseHistory !== "object") s.exerciseHistory = {};
  if (!isObj(s.dailyLogs)) s.dailyLogs = {};
  // v25: boş günlük kayıtlar atılır, içlerindeki öğünler temizlenir
  Object.keys(s.dailyLogs).forEach(k => {
    const d = s.dailyLogs[k];
    if (!isObj(d)) { delete s.dailyLogs[k]; return; }
    if (d.meals != null) { if (Array.isArray(d.meals)) d.meals = normMealList(d.meals); else delete d.meals; }
  });
  if (!Array.isArray(s.recentFoods)) s.recentFoods = [];
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
  s.supplementList = s.supplementList.filter(x => x && typeof x === "object" && x.id && x.name);
  s.supplementList.forEach(x => {
    if (!["morning", "pre", "post", "bed", "custom"].includes(x.time)) delete x.time;
    if (x.time === "custom") x.timeLabel = String(x.timeLabel || "Özel").slice(0, 24); else delete x.timeLabel;
    normalizeSuppDose(x);   // v24: isteğe bağlı doz / birim / adım
  });
  s.restMeals = normMealList(s.restMeals);   // v25
  if (!Array.isArray(s.measurements)) s.measurements = [];
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
  s.settings.nutriLight = !!s.settings.nutriLight;
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
  return s;
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return normalizeState(JSON.parse(saved));
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

let saveFailNotified = false;
function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    saveFailNotified = false;
  } catch (e) {
    console.error(e);
    if (!saveFailNotified) { toast("⚠️ Veriler kaydedilemedi! Hemen yedek al.", "error"); saveFailNotified = true; }
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
  if (typeof USDA_FOODS === "undefined") { toast("⚠️ Besin veritabanı yüklenemedi. Uygulamayı tamamen kapatıp yeniden aç.", "error"); return; }
  const n = lostFoodIds().length;
  if (n) toast(`⚠️ ${n} besin veritabanında bulunamadı; "⚠" işaretliler son kayıtlı değerleriyle hesaplanıyor.`, "error");
}
function activeDay() { return state.workoutDays[state.activeWorkoutDayIdx]; }

// ---------------------------------------------------------------------------
// BİLDİRİM (TOAST)
// ---------------------------------------------------------------------------
function toast(msg, type = "ok", action = null) {
  const wrap = $("toastWrap");
  const el = document.createElement("div");
  const tm = trainCtx();
  const nm = !tm && nutriCtx();
  if ((tm || nm) && type !== "error") { msg = String(msg).replace(EMOJI_LEAD, ""); if (action) action = { ...action, label: String(action.label).replace(EMOJI_LEAD, "") }; }
  const color = type === "error" ? "bg-rose-950 border-rose-700 text-rose-100"
    : type === "pr" ? "bg-amber-950 border-amber-500 text-amber-100"
    : tm ? "bg-[#141416] border-[#1B5E58] text-white"
    : nm ? "n-toast" : "bg-slate-900 border-emerald-600/70 text-slate-100";
  el.className = "toast max-w-sm w-full text-center text-sm font-semibold border px-4 py-2.5 shadow-2xl " + (tm || nm ? "rounded-2xl " : "rounded-xl ") + color;
  el.textContent = msg;
  if (action) {
    el.textContent = "";
    el.classList.add("flex", "items-center", "justify-between", "gap-3", "text-left");
    el.style.pointerEvents = "auto";
    const sp = document.createElement("span");
    sp.textContent = msg;
    const b = document.createElement("button");
    b.textContent = action.label;
    b.className = tm ? "t-btn shrink-0 h-11 px-4 rounded-xl text-[13px]"
      : nm ? "n-btn shrink-0 h-11 px-4 rounded-full text-[13px]"
      : "shrink-0 bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg";
    b.onclick = () => { el.remove(); action.fn(); };
    el.append(sp, b);
  }
  // v21: bildirimler üst üste yığılıp başlığı kapatmasın: aynı mesaj tekrarlanmaz, en fazla 2 tane görünür
  [...wrap.children].forEach(c => { if (c.textContent === el.textContent) c.remove(); });
  while (wrap.children.length >= 2) ([...wrap.children].find(c => !c.querySelector("button")) || wrap.firstElementChild).remove();   // "Geri al" düğmeli olan en son silinir
  wrap.appendChild(el);
  const life = action ? 6000 : type === "pr" ? 3500 : 2400;
  setTimeout(() => { el.style.transition = "opacity .3s"; el.style.opacity = "0"; }, life);
  setTimeout(() => el.remove(), life + 400);
}

window.addEventListener("error", e => { toast("⚠️ Hata: " + (e.message || "bilinmeyen"), "error"); });

// ---------------------------------------------------------------------------
// MODAL YÖNETİMİ
// ---------------------------------------------------------------------------
// Antrenman sekmesinden veya Profil ekranından açılan ortak pencereler yeni (siyah) temada görünür.
function trainCtx() { try { return state.activeTab === "gym" || profileIsOpen(); } catch (e) { return false; } }
// Beslenme sekmesinden a\u00E7\u0131lan ortak pencereler beslenme temas\u0131nda (.nm) g\u00F6r\u00FCn\u00FCr.
function nutriCtx() { try { return !trainCtx() && state.activeTab === "nutrition"; } catch (e) { return false; } }
const EMOJI_LEAD = /^(?:[\p{Extended_Pictographic}\u2190-\u21FF\u2700-\u27BF\uFE0F\u200D]+\s*)+/u;
function openModal(id) {
  const m = $(id);
  const tm = trainCtx();
  const nm = !tm && nutriCtx();
  m.classList.toggle("tm", tm);
  m.classList.toggle("nm", nm);
  if (tm || nm) m.querySelectorAll("h3").forEach(h => { const t = h.textContent; const c = t.replace(EMOJI_LEAD, ""); if (c !== t) h.textContent = c; });
  m.classList.remove("hidden"); m.classList.add("flex");
}
function closeModal(id) { const m = $(id); m.classList.add("hidden"); m.classList.remove("flex"); }
document.addEventListener("click", e => {
  const t = e.target;
  if (t && t.id && ["customFoodModal", "pickerModal", "exerciseModal", "chartModal", "settingsModal", "exSheet", "mealModal", "shopModal"].includes(t.id)) closeModal(t.id);
});

// Temalı onay / metin penceresi. Sonuç: onay → true (veya yazılan metin), vazgeç → null.
let uiDlg = null;
function uiAsk({ title, message = "", input = null, ok = "Tamam", cancel = "Vazgeç", danger = false, dismissable = true }) {
  if (uiDlg) uiDialogDone(false);
  return new Promise(resolve => {
    uiDlg = { resolve, input: !!input, dismissable };
    $("uiDlgTitle").textContent = title;
    $("uiDlgMsg").textContent = message;
    $("uiDlgMsg").classList.toggle("hidden", !message);
    const inp = $("uiDlgInput");
    inp.classList.toggle("hidden", !input);
    inp.value = input ? (input.value || "") : "";
    inp.placeholder = input ? (input.placeholder || "") : "";
    $("uiDlgOk").textContent = ok;
    // v21: beslenme ekranında beslenme temasında (koyu/gündüz), diğer yerlerde antrenman temasında
    const nd = !trainCtx() && nutriCtx();
    $("uiDialog").classList.toggle("nd", nd);
    inp.className = (nd ? "n-in" : "t-in") + (input ? "" : " hidden");
    $("uiDlgCancel").className = nd ? "n-btn-ghost h-[52px] rounded-full text-[15px]" : "t-btn-ghost h-[52px] rounded-2xl text-[15px]";
    $("uiDlgOk").className = danger
      ? (nd ? "h-[52px] rounded-full text-[15px] font-extrabold n-danger-btn" : "h-[52px] rounded-2xl text-[15px] font-extrabold bg-[#FF5A5F] text-white")
      : (nd ? "n-btn h-[52px] rounded-full text-[15px]" : "t-btn h-[52px] rounded-2xl text-[15px]");
    $("uiDlgCancel").textContent = cancel || "";
    $("uiDlgCancel").classList.toggle("hidden", !cancel);
    $("uiDlgBtns").className = cancel ? "grid grid-cols-2 gap-2" : "grid grid-cols-1 gap-2";
    const m = $("uiDialog");
    m.classList.remove("hidden"); m.classList.add("flex");
    if (input) { inp.focus(); try { inp.setSelectionRange(inp.value.length, inp.value.length); } catch (e) { /* yoksay */ } }
  });
}
function uiDialogDone(okPressed) {
  if (!uiDlg) return;
  const d = uiDlg;
  uiDlg = null;
  const m = $("uiDialog");
  m.classList.add("hidden"); m.classList.remove("flex");
  const inp = $("uiDlgInput");
  inp.blur();
  d.resolve(okPressed ? (d.input ? inp.value : true) : null);
}
function uiAlert(title, message) { return uiAsk({ title, message, ok: "Tamam", cancel: null }); }
// Bağlama göre uyarı: antrenman/profil ekranında temalı pencere, diğer yerlerde sistem kutusu.
function sayAlert(title, message) { if (trainCtx() || nutriCtx()) return uiAlert(title, message); alert(message); return Promise.resolve(true); }
// v21: metin sorma (temalı; mobilite gibi eski temalı yerlerde sistem kutusu). Sonuç: yazılan metin veya null.
async function askText(title, value = "", placeholder = "", message = "", ok = "Kaydet") {
  if (trainCtx() || nutriCtx()) return uiAsk({ title, message, input: { value, placeholder }, ok });
  return prompt(message ? title + "\n" + message : title, value);
}

// ---------------------------------------------------------------------------
// SES, EKRAN AÇIK TUTMA
// ---------------------------------------------------------------------------
let audioCtx = null;
function unlockAudio() {
  try {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audioCtx = new AC();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
  } catch (e) { /* ses desteklenmiyor */ }
}
document.addEventListener("pointerdown", unlockAudio, { passive: true });

function beep() {
  if (!state.settings.sound || !audioCtx) return;
  try {
    const t0 = audioCtx.currentTime + 0.02;
    [0, 0.28, 0.56].forEach((d, i) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = "sine";
      o.frequency.value = i === 2 ? 1320 : 880;
      g.gain.setValueAtTime(0.0001, t0 + d);
      g.gain.exponentialRampToValueAtTime(0.5, t0 + d + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.22);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(t0 + d); o.stop(t0 + d + 0.24);
    });
  } catch (e) { /* yoksay */ }
}

let wakeLock = null, wakeBusy = false;
async function updateWakeLock() {
  if (!("wakeLock" in navigator) || wakeBusy) return;
  const want = state.settings.keepAwake && state.activeTab === "gym" && document.visibilityState === "visible";
  wakeBusy = true;
  try {
    if (want && !wakeLock) {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => { wakeLock = null; });
    } else if (!want && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch (e) { wakeLock = null; }
  wakeBusy = false;
}

// ---------------------------------------------------------------------------
// SAYAÇ (Zaman damgası tabanlı: uygulama arka plana geçse de doğru kalır)
// ---------------------------------------------------------------------------
const timer = { endAt: 0, label: "Dinlenme", running: false, iv: null, finishedAt: 0 };

function startTimer(sec, label = "Dinlenme") {
  sec = Math.round(num(sec, 0));
  if (sec <= 0) return;
  unlockAudio();
  timer.endAt = Date.now() + sec * 1000;
  timer.label = label;
  timer.running = true;
  timer.finishedAt = 0;
  clearInterval(timer.iv);
  timer.iv = setInterval(tickTimer, 250);
  $("restPillInner").classList.remove("timer-flash");
  tickTimer();
}

function tickTimer() {
  if (!timer.running) return;
  const rem = Math.ceil((timer.endAt - Date.now()) / 1000);
  if (rem <= 0) { finishTimer(); return; }
  renderTimerUI(rem);
}

function finishTimer() {
  timer.running = false;
  clearInterval(timer.iv);
  timer.finishedAt = Date.now();
  beep();
  try { if (navigator.vibrate) navigator.vibrate([300, 150, 300]); } catch (e) { /* yoksay */ }
  $("restPillTime").textContent = "BİTTİ!";
  $("restPillTime").className = "t-display text-[30px] leading-none tabular-nums text-rose-400";
  $("restPillInner").classList.add("timer-flash");
  toast("⏰ " + timer.label + " bitti!");
  setTimeout(() => { if (!timer.running) resetTimerUI(); }, 4500);
}

function adjustTimer(delta) {
  if (!timer.running) return;
  timer.endAt += delta * 1000;
  tickTimer();
}

function stopTimer() {
  timer.running = false;
  clearInterval(timer.iv);
  resetTimerUI();
}

function renderTimerUI(rem) {
  $("restPill").classList.remove("hidden");
  $("restPillLabel").textContent = timer.label;
  $("restPillTime").textContent = fmtClock(rem);
  $("restPillTime").className = "t-display text-[30px] leading-none tabular-nums " + (rem <= 10 ? "text-rose-400" : "text-[#1FD1C1]");
}

function resetTimerUI() {
  $("restPill").classList.add("hidden");
  $("restPillInner").classList.remove("timer-flash");
}

// ---------------------------------------------------------------------------
// GÜN DÖNÜMÜ (Gece yarısından sonra otomatik yeni gün + günlük arşiv)
// ---------------------------------------------------------------------------
// meals verilmezse bugünün planı (bugüne özel kopya varsa o) kullanılır
function nutritionTotals(meals) {
  let p = 0, c = 0, f = 0, cal = 0;
  (meals || dayMeals()).forEach(m => m.items.forEach(i => { const x = calcItemMacros(i); p += x.p; c += x.c; f += x.f; cal += x.cal; }));
  return { p, c, f, cal };
}

function archiveDay(dateKey) {
  if (!dateKey) return;
  // v27: o gün yapılan mobilite hareketleri sessizce saklanır (boş gün yazılmaz, kayıt silinmez)
  const mobDone = state.mobilityRoutine.items.filter(i => i.done).map(i => i.name);
  if (mobDone.length) state.mobilityLog[dateKey] = mobDone;
  const t = nutritionTotals();
  const e = eatenTotals();
  const sup = state.supplements || {};
  const dm = dayMeals();
  state.dailyLogs[dateKey] = {
    kcal: Math.round(t.cal), p: Math.round(t.p), c: Math.round(t.c), f: Math.round(t.f),
    eatenKcal: Math.round(e.cal), eatenP: Math.round(e.p),
    water: state.waterLiters || 0,
    mealsDone: dm.filter(m => m.done).length, mealsTotal: dm.length,
    supps: state.supplementList.filter(x => sup[x.id]).length, dayType: state.dayType,
    calTarget: getTargets().calTarget, proTarget: getTargets().proTarget,
    // v15: "Dünkü öğünü tekrarla" için öğünlerin içeriği (yalnızca son 7 gün saklanır)
    meals: dm.map(m => ({ id: m.id, title: m.title, items: clone(m.items) }))
  };
  const keys = Object.keys(state.dailyLogs).sort();
  // v25: günlük özetler hiç silinmez (eskiden 180 günden eskiler siliniyordu)
  keys.slice(0, Math.max(0, keys.length - 7)).forEach(k => { if (state.dailyLogs[k]) delete state.dailyLogs[k].meals; });
}

function resetDaily() {
  state.waterLiters = 0;
  state.supplements = {};
  state.dayPlan = null;   // bugüne özel değişiklikler arşivlendi; yeni gün menüden temiz başlar
  state.meals.forEach(m => { m.done = false; });
  state.restMeals.forEach(m => { m.done = false; });
  state.mobilityRoutine.items.forEach(i => { i.done = false; });
}

function checkNewDay() {
  const t = logicalToday();
  if (!state.today) { state.today = t; return false; }
  if (t > state.today) {   // yalnızca ileri gidince (gün geçişi saati ileri alınınca aynı gün tekrar arşivlenmez)
    archiveDay(state.today);
    resetDaily();
    state.today = t;
    toast("🌅 Yeni gün! Su, takviye, öğün ve mobilite tikleri sıfırlandı.");
    return true;
  }
  return false;
}

async function manualNewDay() {
  if (!(await askConfirm("Yeni güne geçilsin mi?", "Su, takviye, öğün ve mobilite tikleri sıfırlanır. Bugünün özeti Beslenme → Geçmiş'e kaydedilir.", "Yeni güne geç"))) return;
  archiveDay(state.today || logicalToday());
  resetDaily();
  state.today = logicalToday();
  renderAll();
}

// ---------------------------------------------------------------------------
// SEKME GEÇİŞİ
// ---------------------------------------------------------------------------
const TAB_TITLES = { nutrition: "Beslenme", gym: "Antrenman", mobility: "Mobilite", progress: "İlerleme" };
function switchTab(tab) {
  if (!TABS.includes(tab)) tab = "nutrition";
  if (tab !== state.activeTab) {
    state.activeTab = tab;
    window.scrollTo(0, 0);
  }
  renderAll();
  updateWakeLock();
}

function applyTabVisibility() {
  const map = {
    nutrition: ["tabNutrition", "nutritionHeaderBar", "navBtnNutrition", "block"],
    gym: ["tabGym", "gymHeaderBar", "navBtnGym", "grid"],
    mobility: ["tabMobility", "mobilityHeaderBar", "navBtnMobility", "grid"],
    progress: ["tabProgress", "progressHeaderBar", "navBtnProgress", "block"]
  };
  const activeCls = "nav-btn flex flex-col items-center justify-center gap-1 h-14 font-bold text-[11px] " + (state.activeTab === "gym" ? "text-[#1FD1C1]" : state.activeTab === "nutrition" ? "text-[#22C55E]" : "text-emerald-400");
  const idleCls = "nav-btn flex flex-col items-center justify-center gap-1 h-14 font-semibold text-[11px] text-[#8B8B93]";
  document.body.classList.toggle("theme-train", state.activeTab === "gym");
  const nutri = state.activeTab === "nutrition";
  document.body.classList.toggle("theme-nutri", nutri);
  document.body.classList.toggle("nutri-light", nutri && !!state.settings.nutriLight);
  const tb = $("nutriThemeBtn");
  tb.classList.toggle("hidden", !nutri);
  tb.classList.toggle("flex", nutri);
  const light = !!state.settings.nutriLight;
  const want = light ? "moon" : "sun";
  if (tb.dataset.icon !== want) {
    tb.dataset.icon = want;
    tb.innerHTML = light
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"></path></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path></svg>';
    tb.setAttribute("aria-label", light ? "Gece temasına geç" : "Gündüz temasına geç");
  }
  const tt = $("tabTitle");
  const title = TAB_TITLES[state.activeTab] || "AYK+";
  if (tt.textContent !== title) tt.textContent = title;
  Object.keys(map).forEach(k => {
    const [tabId, headId, btnId, disp] = map[k];
    const on = k === state.activeTab;
    $(tabId).classList.toggle("hidden", !on);
    $(headId).classList.toggle("hidden", !on);
    $(headId).classList.toggle(disp, on);
    $(btnId).className = on ? activeCls : idleCls;
  });
}

// ---------------------------------------------------------------------------
// PROFİL FOTOĞRAFI (v12: eski "uygulama içi logo" alanı state.customIconDataUrl profil fotoğrafı oldu)
// ---------------------------------------------------------------------------
function applyCustomIcon() {
  const src = state.customIconDataUrl || "";
  [["profileAvatar", "profileIcon"], ["pfAvatar", "pfAvatarIcon"]].forEach(([imgId, icoId]) => {
    const img = $(imgId), ico = $(icoId);
    if (!img) return;
    if (src) { if (img.getAttribute("src") !== src) img.setAttribute("src", src); }
    else img.removeAttribute("src");
    img.classList.toggle("hidden", !src);
    ico.classList.toggle("hidden", !!src);
  });
  if ($("pfPhotoRemove")) {
    $("pfPhotoRemove").classList.toggle("hidden", !src);
    $("pfPhotoBtnText").textContent = src ? "Değiştir" : "Fotoğraf seç";
  }
}
// Telefondan seçilen fotoğraf (birkaç MB olabilir) ortadan kare kırpılıp 320×320 JPEG'e küçültülür;
// böylece telefondaki kayıt alanı dolmaz.
function shrinkPhoto(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const S = 320, side = Math.min(img.naturalWidth, img.naturalHeight);
        if (!side) throw new Error("boş görsel");
        const cv = document.createElement("canvas");
        cv.width = S; cv.height = S;
        const ctx = cv.getContext("2d");
        ctx.fillStyle = "#141416"; ctx.fillRect(0, 0, S, S);
        ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, S, S);
        resolve(cv.toDataURL("image/jpeg", 0.85));
      } catch (e) { reject(e); } finally { URL.revokeObjectURL(url); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("okunamadı")); };
    img.src = url;
  });
}
async function handleIconUpload(event) {
  const file = event.target.files && event.target.files[0];
  event.target.value = "";
  if (!file) return;
  try {
    state.customIconDataUrl = await shrinkPhoto(file);
    renderAll();
    toast("Profil fotoğrafı güncellendi");
  } catch (e) {
    sayAlert("Fotoğraf yüklenemedi", "Bu fotoğraf açılamadı. Başka bir fotoğraf seçmeyi dene.");
  }
}
function removeCustomIcon() {
  if (!state.customIconDataUrl) return;
  snapshot();
  state.customIconDataUrl = "";
  renderAll();
  offerUndo("Profil fotoğrafı kaldırıldı");
}

// ---------------------------------------------------------------------------
// BESLENME HESAPLAMALARI
// ---------------------------------------------------------------------------
function getTargets() {
  const st = state.settings;
  const female = st.sex === "female";
  const bf = validBf(st.bodyFat);
  // Yağ oranı biliniyorsa yağsız kütleye dayalı Katch-McArdle, bilinmiyorsa Mifflin-St Jeor
  const bmr = bf
    ? 370 + 21.6 * state.weight * (1 - bf / 100)
    : (10 * state.weight) + (6.25 * num(st.height, 180)) - (5 * num(st.age, 26)) + (female ? -161 : 5);
  const mult = state.dayType === "train" ? 1.55 : 1.43;
  const tdee = Math.round(bmr * mult);
  const calTarget = Math.max(female ? 1400 : 1750, tdee + Math.round(num(st.calAdjust, 0)) - state.deficit);
  const proTarget = Math.round((num(st.targetWeight, 82) * 2.0) + (state.weight * 0.35));
  const fatTarget = Math.max(female ? 45 : 55, Math.round(state.weight * 0.72));
  const carbTarget = Math.max(60, Math.round((calTarget - (proTarget * 4) - (fatTarget * 9)) / 4));
  return { calTarget, proTarget, carbTarget, fatTarget, tdee };
}

function validBf(v) {
  if (v === "" || v == null) return 0;
  const n = num(v, 0);
  return n >= 3 && n <= 60 ? n : 0;
}
function bodyComp(weight, bf) {
  if (!bf) return null;
  const fatKg = weight * bf / 100;
  return { bf, fatKg, leanKg: weight - fatKg };
}
function updateBfHint() {
  const bf = validBf($("setBf").value);
  const tbf = validBf($("setTargetBf").value);
  const el = $("setBfHint");
  if (!bf) { el.classList.add("hidden"); return; }
  const c = bodyComp(state.weight, bf);
  let html = `Yağsız kütlen: <b class="text-emerald-400">${fmtNum(c.leanKg)} kg</b> • Yağ kütlen: <b class="text-rose-400">${fmtNum(c.fatKg)} kg</b>`;
  if (tbf && tbf < bf) {
    const suggest = round1(c.leanKg / (1 - tbf / 100));
    html += `<div class="mt-1.5">Kas kütleni koruyarak %${fmtNum(tbf)} yağ oranına inersen tahmini kilon: <b class="text-amber-400">${fmtNum(suggest)} kg</b></div>
      <button onclick="$('setTarget').value='${fmtNum(suggest)}'; toast('Hedef kilo ${fmtNum(suggest)} kg olarak dolduruldu, kaydetmeyi unutma');" class="t-btn-outline mt-2.5 w-full h-11 rounded-xl text-[14px]">Bunu hedef kilom yap</button>`;
  }
  html += `<div class="mt-1.5 text-slate-500">Yağ oranı girildiği için kalori hesabı yağsız kütleye göre yapılıyor. Ölçüm değiştikçe (ayda bir gibi) güncelle.</div>`;
  el.innerHTML = html;
  el.classList.remove("hidden");
}

function calcItemMacros(item) {
  if (item.est) {   // v14: "Dışarıda yedim" tahmini girişi
    const e = item.est;
    return { p: num(e.p, 0), c: num(e.c, 0), f: num(e.f, 0), cal: num(e.cal, 0) };
  }
  const f = getFoodDB()[item.foodId];
  if (!f) return { p: 0, c: 0, f: 0, cal: 0 };
  const a = effAmount(item);
  const p = f.p * a, c = f.c * a, fat = f.f * a;
  return { p, c, f: fat, cal: kcalPerUnit(f) * a };
}

// ---------------------------------------------------------------------------
// BESLENME RENDER
// ---------------------------------------------------------------------------
// ============================================================================
// v13 — BESLENME: Bugün / Menülerim / Besinler / Geçmiş, ikame, hazır porsiyon,
//        kiloya göre gramaj, gündüz teması, barkod
// ============================================================================
const NUTRI_VIEWS = [["today", "Bugün"], ["menus", "Menülerim"], ["foods", "Besinler"], ["history", "Geçmiş"]];
function setNutriView(v) {
  state.nutriView = NUTRI_VIEWS.some(x => x[0] === v) ? v : "today";
  window.scrollTo(0, 0);
  renderAll();
}
function toggleNutriLight() { state.settings.nutriLight = !state.settings.nutriLight; renderAll(); }

// Tam sayıyı Türkçe binlik ayırıcıyla yazar: 2478 → "2.478"
function fmtInt(n) { return Math.round(num(n, 0)).toLocaleString("tr-TR"); }
// Etiketten girilen kalori (f.kcal) varsa o kullanılır; yoksa 4P + 4K + 9Y
function kcalPerUnit(f) {
  if (!f) return 0;
  if (f.kcal != null && isFinite(f.kcal) && f.kcal >= 0) return f.kcal;
  return (f.p * 4) + (f.c * 4) + (f.f * 9);
}
// Baştaki emojiyi (bayraklar dahil) kaldırır: "🇹🇷 Türk Mutfağı" → "Türk Mutfağı"
function stripEmoji(s) { return String(s || "").replace(/^(?:[\u{1F1E6}-\u{1F1FF}]+\s*)+/u, "").replace(EMOJI_LEAD, ""); }

// ---------------------------------------------------------------------------
// Kiloya göre gramaj: menü, açıldığı andaki kiloya (referans) göre saklanır;
// kilo değişince yalnızca gram/ml ile ölçülen besinler orantılı gösterilir ve hesaplanır.
// Saklanan miktar değişmez; ayar kapatılınca menü eski hâline döner.
// ---------------------------------------------------------------------------
function scaleK() {
  const st = state.settings;
  if (!st.scaleOn || !(num(st.scaleBase, 0) > 0)) return 1;
  return Math.max(0.7, Math.min(1.3, state.weight / num(st.scaleBase, state.weight)));
}
function isScalable(f) { return !!f && (f.unit === "g" || f.unit === "ml"); }
function effAmount(item) {
  const f = getFoodDB()[item.foodId];
  const k = scaleK();
  if (k === 1 || !isScalable(f)) return item.amount;
  return Math.max(1, Math.round(item.amount * k));
}
// Ekranda görünen (ölçeklenmiş) miktarı saklanacak miktara çevirir
function rawFromEff(f, eff) {
  const k = scaleK();
  // 0,1 hassasiyet: oran en fazla 1,3 olduğundan ekranda yazılan gram aynen geri görünür
  return k !== 1 && isScalable(f) ? round1(eff / k) : round1(eff);
}
function toggleWeightScale(on) {
  state.settings.scaleOn = !!on;
  if (on) state.settings.scaleBase = state.weight;
  renderAll();
  toast(on ? `Gramajlar artık ${fmtNum(state.weight)} kg'a göre ayarlanacak` : "Kiloya göre gramaj kapatıldı; menü son başlangıç gramajlarına döndü");
}
function resetScaleBase() {
  snapshot();   // v26: Geri al
  const k = scaleK();
  // Şu an görünen gramajlar yeni referans olsun: saklanan miktarları sabitle
  if (k !== 1) allMealLists().forEach(ms => ms.forEach(m => m.items.forEach(i => {
    if (i.est) return;
    const f = getFoodDB()[i.foodId];
    if (isScalable(f)) i.amount = Math.max(1, Math.round(i.amount * k));
  })));
  state.settings.scaleBase = state.weight;
  renderAll();
  offerUndo(`Gramajlar ${fmtNum(state.weight)} kg için yeni başlangıç oldu`);
}

// ---------------------------------------------------------------------------
// İkame: aynı gruptaki besinle, kalori aynı kalacak şekilde değiştir
// ---------------------------------------------------------------------------
const SWAP_GROUPS = [
  ["pirinc", "basmati", "bulgur", "makarna_tam", "yulaf", "pirinc_unu"],
  ["patates", "tatli_patates"],
  ["tr_pirinc_pilavi", "tr_bulgur_pilavi"],
  ["tavuk_gogsu", "hindi_gogsu", "dana_kiyma", "tavuk_incik", "somon"],
  ["suzme_yogurt", "lor_peyniri"],
  ["badem", "ceviz", "findik", "kaju", "yer_fistigi", "kabak_cekirdegi", "fistik_ezmesi"],
  ["brokoli_karnabahar", "ispanak_kabak", "domates_salatalik"]
];
// v20: gizlenen eski kayıt yerine listede kalan karşılığı (data.js "replace") kullanılır
function swapVisibleId(id) {
  const db = getFoodDB(), f = db[id];
  return f && f.hidden && f.replace && db[f.replace] && !isHiddenFood(db[f.replace]) ? f.replace : id;
}
function swapGroup(foodId) { return SWAP_GROUPS.find(g => g.includes(foodId) || g.some(id => swapVisibleId(id) === foodId)) || null; }
function swapOptions(item) {
  const db = getFoodDB();
  const g = swapGroup(item.foodId);
  const f0 = db[item.foodId];
  if (!g || !f0) return [];
  const kcal0 = kcalPerUnit(f0) * effAmount(item);
  const self = swapVisibleId(item.foodId);
  return [...new Set(g.map(swapVisibleId))].filter(id => id !== item.foodId && id !== self && db[id] && !isHiddenFood(db[id])).map(id => {
    const f = db[id];
    const eff = Math.max(5, Math.round(kcal0 / kcalPerUnit(f) / 5) * 5);
    return { id, f, eff, kcal: Math.round(kcalPerUnit(f) * eff), p: f.p * eff, c: f.c * eff, fat: f.f * eff };
  });
}
// dest: "menu" (Menülerim) veya "day" (Bugün: yalnızca bugünü değiştirir)
function openSwap(mIdx, iIdx, dest) {
  const list = dest === "day" ? dayMeals() : curMeals();
  const item = list[mIdx] && list[mIdx].items[iIdx];
  if (!item || item.est) return;
  const f0 = getFoodDB()[item.foodId];
  const opts = swapOptions(item);
  if (!opts.length) return;
  const items = opts.map(o => ({ id: o.id, eff: o.eff, label: o.f.name, sub: `${fmtNum(o.eff)} ${o.f.unit} · ${o.kcal} kcal · ${Math.round(o.p)}P ${Math.round(o.c)}K ${Math.round(o.fat)}Y` }));
  openPicker(`${f0.name} yerine`, [{ label: `Şu an: ${fmtNum(effAmount(item))} ${f0.unit} · ${Math.round(kcalPerUnit(f0) * effAmount(item))} kcal`, short: "Alternatifler", items }], it => {
    snapshot();
    const l2 = dest === "day" ? ensureDayCopy() : curMeals();
    const cur = l2[mIdx] && l2[mIdx].items[iIdx];
    if (!cur) return;
    const nf = getFoodDB()[it.id];
    cur.foodId = it.id;
    cur.amount = rawFromEff(nf, it.eff);
    renderAll();
    offerUndo(`⇄ ${f0.name} → ${nf.name} (${fmtNum(it.eff)} ${nf.unit})${dest === "day" ? " · yalnızca bugün" : ""}`);
  });
}

// ---------------------------------------------------------------------------
// GENEL BESLENME ÇİZİMİ
// ---------------------------------------------------------------------------
const openDoneMeals = new Set();   // Bugün: açılmış "yenmiş" öğünler (kaydedilmez)
const openMenuMeals = new Set();   // Menülerim: açılmış öğünler (kaydedilmez)
function toggleMealOpen(mIdx) {
  const m = dayMeals()[mIdx];
  if (!m) return;
  if (openDoneMeals.has(m.id)) openDoneMeals.delete(m.id); else openDoneMeals.add(m.id);
  renderAll();
}
function toggleMenuMeal(mIdx) {
  const m = curMeals()[mIdx];
  if (!m) return;
  if (openMenuMeals.has(m.id)) openMenuMeals.delete(m.id); else openMenuMeals.add(m.id);
  renderAll();
}

function mealTotals(meal) {
  let p = 0, c = 0, f = 0, cal = 0, n = 0;
  meal.items.forEach(i => { if (!i.est && !getFoodDB()[i.foodId]) return; const x = calcItemMacros(i); p += x.p; c += x.c; f += x.f; cal += x.cal; n++; });
  return { p, c, f, cal, n };
}
function macroLine(p, c, f, dec) {
  const v = x => dec ? fmtNum(x) : Math.round(x);
  return `<span class="n-p">${v(p)}P</span> <span class="n-k">${v(c)}K</span> <span class="n-y">${v(f)}Y</span>`;
}

function renderNutrition() {
  const st = state.settings;
  const view = NUTRI_VIEWS.some(x => x[0] === state.nutriView) ? state.nutriView : "today";
  $("nutriNav").innerHTML = NUTRI_VIEWS.map(([k, l]) => `<button onclick="setNutriView('${k}')" class="n-tab ${view === k ? "on" : ""}" ${view === k ? 'aria-current="page"' : ""}>${l}</button>`).join("");
  [["today", "nvToday"], ["menus", "nvMenus"], ["foods", "nvFoods"], ["history", "nvHistory"]].forEach(([k, id]) => $(id).classList.toggle("hidden", k !== view));

  // Kilo / açık
  const logged = state.weightLogs.map(l => num(l.weight, 0)).filter(w => w > 0);
  const minW = Math.floor(Math.min(num(st.targetWeight, 82) - 5, ...logged.map(w => w - 5), state.weight));
  const maxW = Math.ceil(Math.max(...logged.map(w => w + 10), state.weight + 10, num(st.targetWeight, 82) + 10));
  const slider = $("weightSlider");
  slider.min = minW; slider.max = maxW; slider.value = state.weight;
  $("weightVal").textContent = fmtNum(state.weight);
  $("deficitSlider").value = state.deficit;
  $("deficitVal").textContent = state.deficit;
  $("weightHistoryText").textContent = state.weightLogs.length > 0
    ? state.weightLogs.slice(-3).map(l => `${fmtNum(num(l.weight))} kg (${l.date})`).join(" → ")
    : `Hedef: ${fmtNum(num(st.targetWeight, 82))} kg`;
  const wa7 = weightAvg7();
  $("weightAvgText").textContent = wa7 ? `7 günlük ortalama: ${fmtNum(wa7.avg)} kg (${wa7.n} tartı)` : "";
  $("weightAvgText").classList.toggle("hidden", !wa7);
  const target = num(st.targetWeight, 82);
  const diffKg = state.weight - target;
  const weeklyLoss = (state.deficit * 7) / 7700;
  $("timelineInfo").textContent = diffKg <= 0 ? `${fmtNum(target)} kg hedefine ulaştın!`
    : weeklyLoss > 0 ? `Haftalık ~${fmtKg(weeklyLoss)} kg kayıp → ${fmtNum(target)} kg hedefine ~${Math.ceil(diffKg / weeklyLoss)} hafta`
    : "Kalori açığı yok: kilo koruma modu";
  const hint = coachHintText();
  $("coachHint").classList.toggle("hidden", !hint);
  $("coachHint").textContent = hint;

  const isRest = state.dayType === "rest";
  ["btnTrain", "mnTrain"].forEach(id => { $(id).className = isRest ? "" : "on"; });
  ["btnRest", "mnRest"].forEach(id => { $(id).className = isRest ? "on" : ""; });
  $("planSub").textContent = `${isRest ? "Dinlenme" : "Antrenman"} menüsü · hedef ${fmtInt(getTargets().calTarget)} kcal`;

  renderWater();
  renderSupps();
  renderHero();
  renderTodayMeals();
  renderMenus();
  renderFoods();
  renderNutriHistory();
}

function renderHero() {
  const targets = getTargets();
  const plan = nutritionTotals();
  const eaten = eatenTotals();
  const view = state.settings.macroView === "plan" ? "plan" : "eaten";
  const shown = view === "eaten" ? eaten : plan;
  updateMacroCard("cal", shown.cal, targets.calTarget, "kcal");
  updateMacroCard("pro", shown.p, targets.proTarget, "g");
  updateMacroCard("carb", shown.c, targets.carbTarget, "g");
  updateMacroCard("fat", shown.f, targets.fatTarget, "g");
  const meals = dayMeals();
  $("mmPlanVal").textContent = fmtInt(plan.cal);
  $("mmEatenVal").textContent = fmtInt(eaten.cal);
  $("mmEatenMeals").textContent = `${meals.filter(m => m.done).length}/${meals.length}`;
  $("mmPlan").className = view === "plan" ? "on" : "";
  $("mmEaten").className = view === "eaten" ? "on" : "";
  renderMicroLine(view);
}

function updateMacroCard(prefix, consumed, target, unit) {
  const cRound = Math.round(consumed);
  const diff = target - cRound;
  const over = diff < 0;
  const pct = target > 0 ? Math.min(100, Math.round((cRound / target) * 100)) : 0;
  $(`${prefix}Consumed`).textContent = fmtInt(cRound);
  $(`${prefix}Target`).textContent = fmtInt(target);
  const st = $(`${prefix}Status`);
  if (prefix === "cal") {
    st.innerHTML = `<div class="text-[12px] font-semibold ${over ? "text-[#FB7185]" : "text-white/70"}">${over ? "Aşım" : "Kalan"}</div>
      <div class="flex items-baseline gap-1 whitespace-nowrap"><span class="t-display text-[34px] leading-none tabular-nums ${over ? "text-[#FB7185]" : "text-white"}">${over ? "+" : ""}${fmtInt(Math.abs(diff))}</span><span class="text-[12px] font-semibold text-white/80">kcal</span></div>`;
    const ring = $("calRing");
    const C = 301.59;
    ring.style.strokeDashoffset = String(C - (C * pct) / 100);
    ring.setAttribute("stroke", over ? "#FB7185" : "#22C55E");
    return;
  }
  st.textContent = over ? `+${Math.abs(diff)} ${unit} aşım` : `${diff} ${unit} kaldı`;
  st.className = "text-[11px] mt-0.5 font-semibold " + (over ? "text-[#FB7185]" : "text-white/60");
  $(`${prefix}Bar`).style.width = `${pct}%`;
}

// v24: Su hedefi. Açıkken kilo × 35 ml (+0,5 L listede kreatin varsa), kapalıyken Profil'de elle yazılan değer.
function hasCreatine() { return state.supplementList.some(x => /kreatin|creatine/.test(normSearch(x.name))); }
function waterAutoInfo(weight) {
  const w = num(weight === undefined ? state.weight : weight, 0);
  if (!(w >= 30 && w <= 300)) return null;
  const base = Math.round(w * 0.035 * 10) / 10, cr = hasCreatine();
  return { w, base, cr, total: Math.round((base + (cr ? 0.5 : 0)) * 10) / 10 };
}
function waterTargetL() {
  if (state.settings.waterAuto !== false) { const a = waterAutoInfo(); if (a) return a.total; }
  return num(state.settings.waterTarget, 3.5);
}
const WATER_RING_C = 364.42;   // 2π × 58
function renderWater() {
  const wt = waterTargetL();
  const w = state.waterLiters || 0;
  const pct = wt > 0 ? Math.min(100, Math.round(w / wt * 100)) : 0;
  $("waterVal").textContent = fmtKg(w);
  $("waterTarget").textContent = fmtNum(wt);
  $("waterPct").textContent = "%" + pct;
  $("waterRing").style.strokeDashoffset = String(Math.round(WATER_RING_C * (1 - pct / 100) * 100) / 100);
  const a = state.settings.waterAuto !== false ? waterAutoInfo() : null;
  $("waterNote").textContent = a ? `Kilona göre: ${fmtNum(a.w)} kg × 35 ml${a.cr ? " + 0,5 L kreatin" : ""}`
    : state.settings.waterAuto !== false ? "Kilo girilmemiş; Profil'deki hedef kullanılıyor." : "Hedef Profil'de elle ayarlı.";
}

// ---------------------------------------------------------------------------
// BUGÜN: zaman çizelgesi
// ---------------------------------------------------------------------------
function renderTodayMeals() {
  const db = getFoodDB();
  const meals = dayMeals();
  const nextIdx = meals.findIndex(m => !m.done);
  if (!meals.length) {
    $("todayMeals").innerHTML = `<div class="n-card rounded-[22px] p-5 text-center space-y-3"><p class="text-[14px] n-muted">Bu menüde henüz öğün yok.</p>
      <button onclick="setNutriView('menus')" class="n-btn h-12 px-6 rounded-full text-[14px]">Menülerim'e git</button></div>`;
    return;
  }
  const changed = dayChangedIds();
  const savable = meals.some(m => changed.has(m.id) && !mealHasEst(m));
  let banner = "";
  if (dayCopy() && changed.size) {
    const tg = getTargets().calTarget;
    const over = Math.round(nutritionTotals(meals).cal - tg);
    const canBalance = over > Math.max(50, Math.round(tg * 0.05)) && meals.some(m => !m.done);
    banner = `<div id="dayDiffBanner" class="n-card rounded-[20px] p-3.5 mb-3 space-y-2.5">
        <div class="text-[14px] font-bold">Bugüne özel değişiklikler var</div>
        <p class="text-[12px] n-muted">Menülerim değişmedi. Bugünkü hâli menüye de kaydedebilir ya da menüdeki hâline dönebilirsin.${canBalance ? ` Bugün hedefi <strong class="n-over">${fmtInt(over)} kcal</strong> aşıyor.` : ""}</p>
        <div class="grid grid-cols-2 gap-2">
          ${savable ? `<button onclick="saveDayToMenu()" class="n-btn h-11 rounded-full text-[13px]">Menüye de kaydet</button>` : ""}
          <button onclick="revertDayToMenu()" class="n-btn-ghost h-11 rounded-full text-[13px] ${savable ? "" : "col-span-2"}">Bugünü menüye geri döndür</button>
          ${canBalance ? `<button onclick="balanceDayNow()" class="n-btn-outline h-11 rounded-full text-[13px] col-span-2">Günü dengele (kalan öğünlerden kıs)</button>` : ""}
        </div>
      </div>`;
  }
  $("todayMeals").innerHTML = banner + meals.map((meal, mIdx) => {
    const t = mealTotals(meal);
    const isNext = mIdx === nextIdx;
    const last = mIdx === meals.length - 1;
    const collapsed = meal.done && !openDoneMeals.has(meal.id);
    const editing = openEditMeals.has(meal.id);
    const rail = `<div class="flex flex-col items-center w-11 shrink-0">
        <label class="w-11 h-11 flex items-center justify-center cursor-pointer"><input type="checkbox" ${meal.done ? "checked" : ""} onchange="toggleMealDone(${mIdx})" class="n-check" aria-label="${esc(meal.title)}: yedim" /></label>
        ${last ? "" : '<div class="w-[1.5px] flex-1 n-rail my-1 rounded-full"></div>'}
      </div>`;
    const time = meal.time ? esc(meal.time) : "";
    if (collapsed && !editing) {
      return `<div class="flex gap-2" data-today-meal="${mIdx}">${rail}
        <button onclick="toggleMealOpen(${mIdx})" class="flex-1 min-w-0 min-h-[52px] mb-3 flex items-center justify-between gap-3 text-left" aria-expanded="false" aria-label="${esc(meal.title)} öğününü aç">
          <div class="min-w-0"><div class="text-[12px] font-semibold n-muted">${time ? time + " · " : ""}yendi${changed.has(meal.id) ? " · bugüne özel" : ""}</div><div class="text-[16px] font-bold n-muted truncate">${esc(meal.title)}</div></div>
          <div class="text-[14px] font-semibold n-muted whitespace-nowrap shrink-0">${fmtInt(t.cal)} kcal</div>
        </button></div>`;
    }
    const status = meal.done ? "TAMAMLANDI" : isNext ? "SIRADAKİ" : "";
    const label = [time, status, changed.has(meal.id) ? "BUGÜNE ÖZEL" : ""].filter(Boolean).join(" · ");
    const items = meal.items.map((item, iIdx) => {
      if (item.est) {
        const e = item.est;
        return `<div class="flex items-center justify-between gap-2 min-h-[44px] py-1" data-est="1">
            <div class="min-w-0 flex-1 text-[14px] leading-snug"><span class="font-semibold">${esc(e.name)}</span> <span class="n-muted whitespace-nowrap">· tahmini · ${fmtInt(num(e.p))} g P</span></div>
            <span class="text-[13px] font-semibold n-muted tabular-nums w-10 text-right shrink-0">${fmtInt(num(e.cal))}</span>
            ${editing ? `<button onclick="dayRemoveItem(${mIdx}, ${iIdx})" class="w-11 h-11 -my-1 -mr-2 shrink-0 rounded-full flex items-center justify-center n-over" aria-label="${esc(e.name)} çıkar">${svgI("x", 18, 2.2)}</button>` : ""}
          </div>`;
      }
      const f = db[item.foodId];
      if (!f) return "";
      const mac = calcItemMacros(item);
      const canSwap = !!swapGroup(item.foodId);
      if (editing) {
        return `<div class="py-2">
            <div class="flex items-center gap-1 min-h-[24px]">
              <div class="flex-1 min-w-0 text-[14px] font-semibold truncate">${esc(f.name)}</div>
              <div class="shrink-0 text-[13px] font-bold tabular-nums">${Math.round(mac.cal)} <span class="text-[11px] font-semibold n-dim">kcal</span></div>
              <button onclick="dayRemoveItem(${mIdx}, ${iIdx})" class="w-11 h-11 -my-2.5 -mr-2 shrink-0 rounded-full flex items-center justify-center n-over" aria-label="${esc(f.name)} bugünden çıkar">${svgI("x", 18, 2.2)}</button>
            </div>
            <div class="flex items-center justify-end gap-1 mt-1.5">
              <button onclick="dayChangeAmount(${mIdx}, ${iIdx}, -1)" class="n-btn-ghost w-11 h-11 shrink-0 rounded-xl flex items-center justify-center" aria-label="${esc(f.name)} azalt">${svgI("minus", 18, 2.4)}</button>
              <input type="text" inputmode="decimal" data-fk="damt-${mIdx}-${iIdx}" value="${esc(fmtNum(effAmount(item)))}" onchange="daySetAmount(${mIdx}, ${iIdx}, this.value)" class="n-amt shrink-0" aria-label="${esc(f.name)} bugünkü miktarı" />
              <span class="text-[11px] n-muted w-10 min-w-0 truncate">${esc(f.unit)}</span>
              <button onclick="dayChangeAmount(${mIdx}, ${iIdx}, 1)" class="n-btn-ghost w-11 h-11 shrink-0 rounded-xl flex items-center justify-center" aria-label="${esc(f.name)} artır">${svgI("plus", 18, 2.4)}</button>
            </div>
          </div>`;
      }
      return `<div class="flex items-center justify-between gap-2 min-h-[44px] py-1">
          <div class="min-w-0 flex-1 text-[14px] leading-snug"><span class="font-semibold">${esc(f.name)}</span> <span class="n-muted whitespace-nowrap">· ${fmtNum(effAmount(item))} ${esc(f.unit)}</span></div>
          ${canSwap ? `<button onclick="openSwap(${mIdx}, ${iIdx}, 'day')" class="n-chip swap text-[12px]" aria-label="${esc(f.name)} için ikame seç">⇄ İkame</button>` : ""}
          <span class="text-[13px] font-semibold n-muted tabular-nums w-10 text-right shrink-0">${Math.round(mac.cal)}</span>
        </div>`;
    }).join("");
    const last1 = editing ? lastDayMealFor(meal) : null;
    const editPanel = editing ? `<div class="pt-2 n-bt space-y-2" data-edit-panel="${mIdx}">
        <div class="text-[12px] n-muted">Buradaki değişiklikler yalnızca bugünü etkiler; menün aynı kalır.</div>
        <div class="grid grid-cols-2 gap-2">
          <button onclick="halfMeal(${mIdx})" class="n-btn-ghost h-11 rounded-full text-[13px]">½ Yarısını yedim</button>
          <button onclick="openFreeMeal(${mIdx})" class="n-btn-ghost h-11 rounded-full text-[13px]">Dışarıda yedim</button>
          ${last1 ? `<button onclick="repeatLastMeal(${mIdx})" class="n-btn-ghost h-11 rounded-full text-[13px] flex items-center justify-center gap-1.5" data-repeat="${mIdx}">${svgI("repeat", 16)}${dayLabelShort(last1.key)} gibi</button>` : ""}
          <button onclick="saveMealAsCombo(${mIdx}, 'day')" class="n-btn-ghost h-11 rounded-full text-[13px] flex items-center justify-center gap-1.5 ${last1 ? "" : "col-span-2"}">${svgI("star", 16)}Kombo kaydet</button>
        </div>
      </div>` : "";
    const headOpen = meal.done && !editing;
    return `<div class="flex gap-2" data-today-meal="${mIdx}">${rail}
      <div class="flex-1 min-w-0 pb-3">
        <div class="n-card ${isNext ? "n-next" : ""} rounded-[22px] p-4 space-y-2">
          ${headOpen
            ? `<button onclick="toggleMealOpen(${mIdx})" class="w-full flex items-start justify-between gap-3 text-left min-h-[44px]" aria-expanded="true" aria-label="${esc(meal.title)} öğününü kapat">`
            : `<div class="flex items-start justify-between gap-3">`}
            <div class="min-w-0">
              ${label ? `<div class="text-[11px] font-bold tracking-wide n-accent">${label}</div>` : ""}
              <h3 class="text-[18px] font-extrabold leading-tight mt-0.5 break-words">${esc(meal.title)}</h3>
              ${meal.targetNote ? `<div class="text-[12px] n-muted mt-0.5">${esc(meal.targetNote)}</div>` : ""}
              ${num(meal.balanced, 0) < 0 ? `<div class="text-[12px] font-semibold n-k mt-0.5" data-balanced="${mIdx}">Gün dengelendi: bu öğünden ${fmtInt(-meal.balanced)} kcal kısıldı</div>` : ""}
            </div>
            <div class="text-right shrink-0 whitespace-nowrap"><span class="t-display text-[24px] leading-none tabular-nums">${fmtInt(t.cal)}</span><span class="text-[12px] n-muted ml-0.5">kcal</span>
              <div class="text-[11px] font-semibold tabular-nums mt-0.5">${macroLine(t.p, t.c, t.f)}</div></div>
          ${headOpen ? "</button>" : "</div>"}
          <div class="n-div">${items || '<div class="text-[13px] n-dim py-2">Bu öğünde henüz besin yok.</div>'}</div>
          ${editPanel}
          <div class="flex gap-2 pt-1">
            <button onclick="toggleMealDone(${mIdx})" class="${meal.done ? "n-btn-ghost" : "n-btn"} flex-1 min-w-0 h-12 rounded-full text-[14px] flex items-center justify-center gap-1.5">${meal.done ? svgI("check", 18, 2.6) + "Yendi" : "Yedim"}</button>
            <button onclick="goAddFood(${mIdx}, 'day')" class="n-btn-outline flex-1 min-w-0 h-12 rounded-full text-[14px] flex items-center justify-center gap-1.5">${svgI("plus", 18, 2.4)}Besin</button>
            <button onclick="toggleMealEdit(${mIdx})" class="${editing ? "n-btn" : "n-btn-ghost"} w-12 h-12 shrink-0 rounded-full flex items-center justify-center" aria-expanded="${editing}" aria-label="${esc(meal.title)}: bugün için düzenle" data-edit-btn="${mIdx}">${svgI(editing ? "check" : "edit", 18, 2.2)}</button>
          </div>
        </div>
      </div></div>`;
  }).join("");
}

// ---------------------------------------------------------------------------
// v14 — "SADECE BUGÜN": Bugün ekranındaki değişiklikler menünün o güne ait
// kopyasında yapılır (state.dayPlan). Menülerim yalnızca "Menüye de kaydet" ile değişir.
// Gece yarısı kopya arşivlenir ve silinir; yeni gün menüden temiz başlar.
// ---------------------------------------------------------------------------
const openEditMeals = new Set();   // Bugün: düzenleme modu açık öğünler (kaydedilmez)
function dayKind() { return state.dayType === "rest" ? "rest" : "train"; }
function dayKey() { return state.today || logicalToday(); }
function dayCopy() {
  const dp = state.dayPlan;
  return dp && dp.date === dayKey() && Array.isArray(dp[dayKind()]) ? dp[dayKind()] : null;
}
function dayMeals() { return dayCopy() || curMeals(); }
function ensureDayCopy() {
  const c = dayCopy();
  if (c) return c;
  if (!state.dayPlan || state.dayPlan.date !== dayKey()) state.dayPlan = { date: dayKey(), train: null, rest: null };
  const copy = clone(curMeals());
  state.dayPlan[dayKind()] = copy;
  return copy;
}
// Menüler + bugüne özel kopyalar (besin silme, gramaj sabitleme gibi toplu işlemler için)
function allMealLists() {
  const out = [state.meals, state.restMeals];
  const dp = state.dayPlan;
  if (dp) ["train", "rest"].forEach(k => { if (Array.isArray(dp[k])) out.push(dp[k]); });
  return out;
}
function mealHasEst(m) { return m.items.some(i => i.est); }
function itemsSig(items) {
  return JSON.stringify(items.map(i => i.est ? ["~", String(i.est.name), num(i.est.cal)] : [i.foodId, round1(num(i.amount))]));
}
// Bugüne özel kopyada menüden farklı olan öğünlerin kimlikleri
function dayChangedIds() {
  const out = new Set();
  const c = dayCopy();
  if (!c) return out;
  const menu = curMeals();
  c.forEach(m => {
    const mm = menu.find(x => x.id === m.id);
    if (!mm || itemsSig(mm.items) !== itemsSig(m.items)) out.add(m.id);
  });
  return out;
}
function toggleMealEdit(mIdx) {
  const m = dayMeals()[mIdx];
  if (!m) return;
  if (openEditMeals.has(m.id)) openEditMeals.delete(m.id); else openEditMeals.add(m.id);
  renderAll();
}
function dayChangeAmount(mIdx, iIdx, dir) {
  const c = ensureDayCopy();
  const item = c[mIdx] && c[mIdx].items[iIdx];
  if (!item || item.est) return;
  const f = getFoodDB()[item.foodId];
  const next = Math.max(0, round1(effAmount(item) + dir * (f ? num(f.step, 1) : 1)));
  if (next === 0) { dayRemoveItem(mIdx, iIdx); return; }
  item.amount = rawFromEff(f, next);
  renderAll();
}
function daySetAmount(mIdx, iIdx, val) {
  const n = num(val, NaN);
  const c = ensureDayCopy();
  const item = c[mIdx] && c[mIdx].items[iIdx];
  if (!item || item.est) return;
  if (!isFinite(n) || n <= 0) { dayRemoveItem(mIdx, iIdx); return; }
  item.amount = rawFromEff(getFoodDB()[item.foodId], round1(n));
  renderAll();
}
function dayRemoveItem(mIdx, iIdx) {
  snapshot();
  const c = ensureDayCopy();
  if (!c[mIdx] || !c[mIdx].items[iIdx]) return;
  const it = c[mIdx].items.splice(iIdx, 1)[0];
  const f = it.est ? null : getFoodDB()[it.foodId];
  renderAll();
  offerUndo(`🗑️ ${it.est ? it.est.name : f ? f.name : "Besin"} bugünden çıkarıldı`);
}
// Öğünün yarısı yendi: bugünkü miktarlar yarıya iner, öğün yendi işaretlenir
function halfMeal(mIdx) {
  snapshot();
  const c = ensureDayCopy();
  const m = c[mIdx];
  if (!m) return;
  const db = getFoodDB();
  m.items.forEach(it => {
    if (it.est) { ["cal", "p", "c", "f"].forEach(k => { it.est[k] = round1(num(it.est[k]) / 2); }); return; }
    const f = db[it.foodId];
    if (!f) return;
    it.amount = rawFromEff(f, Math.max(0.1, round1(effAmount(it) / 2)));
  });
  m.done = true;
  openDoneMeals.delete(m.id);
  openEditMeals.delete(m.id);
  renderAll();
  offerUndo(`½ ${m.title}: yarısı yendi (yalnızca bugün)`);
}
function saveDayToMenu() {
  const c = dayCopy();
  if (!c) return;
  snapshot();
  const changed = dayChangedIds();
  const menu = curMeals();
  let n = 0, skipped = 0;
  c.forEach(m => {
    if (!changed.has(m.id)) return;
    if (mealHasEst(m)) { skipped++; return; }
    const mm = menu.find(x => x.id === m.id);
    if (!mm) return;
    mm.items = clone(m.items);
    n++;
  });
  renderAll();
  offerUndo(`✓ ${n} öğün menüye kaydedildi${skipped ? ` · dışarıda yenen ${skipped} öğün menüye yazılmadı` : ""}`);
}
function revertDayToMenu() {
  const c = dayCopy();
  if (!c) return;
  snapshot();
  const menu = curMeals();
  c.forEach(m => { const mm = menu.find(x => x.id === m.id); if (mm) mm.done = !!m.done; });
  state.dayPlan[dayKind()] = null;
  openEditMeals.clear();
  renderAll();
  offerUndo("↺ Bugün menüdeki hâline döndü");
}

// ---------------------------------------------------------------------------
// v14 — DIŞARIDA YEDİM (tahmini giriş) ve GÜNÜ DENGELE
// ---------------------------------------------------------------------------
let fmIdx = -1;
function openFreeMeal(mIdx) {
  const m = dayMeals()[mIdx];
  if (!m) return;
  fmIdx = mIdx;
  $("fmMeal").textContent = m.title;
  ["fmName", "fmKcal", "fmP", "fmC", "fmF"].forEach(id => { $(id).value = ""; });
  $("fmReplace").checked = true;
  $("fmBalance").checked = false;
  updateFreeMealHint();
  openModal("freeMealModal");
}
function freeMealPreview() {
  const meals = dayMeals();
  const m = meals[fmIdx];
  if (!m) return null;
  const kcal = num($("fmKcal").value, 0);
  const total = nutritionTotals(meals).cal - ($("fmReplace").checked ? mealTotals(m).cal : 0) + Math.max(0, kcal);
  const target = getTargets().calTarget;
  return { total, target, over: Math.round(total - target) };
}
function updateFreeMealHint() {
  const pv = freeMealPreview();
  if (!pv) return;
  const tol = Math.max(50, Math.round(pv.target * 0.05));
  $("fmHint").innerHTML = pv.over > 0
    ? `Bu girişle bugün <strong>${fmtInt(pv.total)} kcal</strong> olur; hedefi <strong class="n-over">${fmtInt(pv.over)} kcal</strong> aşar.`
    : `Bu girişle bugün <strong>${fmtInt(pv.total)} kcal</strong> olur; hedefin (${fmtInt(pv.target)} kcal) altında kalırsın.`;
  const can = pv.over > tol;
  $("fmBalance").disabled = !can;
  if (!can) $("fmBalance").checked = false;
  $("fmBalanceWrap").classList.toggle("opacity-50", !can);
}
function saveFreeMeal() {
  const kcal = num($("fmKcal").value, NaN);
  const p = num($("fmP").value, NaN);
  if (!(kcal > 0) || kcal > 6000) { sayAlert("Kalori eksik", "Lütfen tahmini kaloriyi yaz (örn: 850)."); return; }
  if (!isFinite(p) || p < 0 || p * 4 > kcal * 1.2) { sayAlert("Protein eksik", "Lütfen tahmini proteini gram olarak yaz (bilmiyorsan 0 yazabilirsin). Protein, kaloriden fazla olamaz."); return; }
  const cv = num($("fmC").value, NaN), fv = num($("fmF").value, NaN);
  if ((isFinite(cv) && cv < 0) || (isFinite(fv) && fv < 0)) { sayAlert("Değer hatalı", "Karb ve yağ negatif olamaz."); return; }
  snapshot();
  const c = ensureDayCopy();
  const m = c[fmIdx];
  if (!m) return;
  const est = { name: $("fmName").value.trim().slice(0, 50) || "Dışarıda yemek", cal: Math.round(kcal), p: round1(p), c: isFinite(cv) ? round1(cv) : 0, f: isFinite(fv) ? round1(fv) : 0 };
  const it = { foodId: "_est", amount: 1, est };
  if ($("fmReplace").checked) m.items = [it]; else m.items.push(it);
  m.done = true;
  openDoneMeals.delete(m.id);
  openEditMeals.delete(m.id);
  let msg = `✓ ${shortMealTitle(m)}: ${est.cal} kcal tahmini girildi (yalnızca bugün)`;
  if ($("fmBalance").checked) msg += balanceDay(fmIdx).msg;
  closeModal("freeMealModal");
  renderAll();
  offerUndo(msg);
}
function balanceDayNow() {
  snapshot();
  const r = balanceDay(-1);
  renderAll();
  if (r.parts.length) offerUndo("⚖️ " + r.msg.replace(/^ · /, "")); else toast(r.msg.replace(/^ · /, ""), "error");
}
// Kalan (yenmemiş) öğünlerde karb/yağ ağırlıklı besinleri orantılı kısar; protein kaynakları
// (kalorisinin %40+'ı proteinden gelen besinler) değişmez. Hedef aşımını kapatmaya çalışır.
function balanceDay(skipIdx) {
  const meals = ensureDayCopy();
  const target = getTargets().calTarget;
  const over = nutritionTotals(meals).cal - target;
  if (over <= 20) return { msg: " · gün zaten hedefte, kısmaya gerek yok", parts: [] };
  const db = getFoodDB();
  const cands = [];
  meals.forEach((m, mi) => {
    if (mi === skipIdx || m.done) return;
    m.items.forEach(it => {
      if (it.est) return;
      const f = db[it.foodId];
      if (!f) return;
      const x = calcItemMacros(it);
      // 50 kcal altı (sebze, salata gibi) ve protein ağırlıklı besinlere dokunulmaz
      if (x.cal < 50 || (x.p * 4) / x.cal >= 0.4) return;
      cands.push({ m, it, f, cal: x.cal });
    });
  });
  // Her besinden en fazla %75 kısılır (en az dörtte biri kalır; besin tamamen silinmez)
  const avail = cands.reduce((a, b) => a + b.cal, 0) * BALANCE_MAX_CUT;
  if (avail <= 0) return { msg: " · kalan öğünlerde kısılabilecek karb/yağ ağırlıklı besin yok", parts: [] };
  const k = 1 - BALANCE_MAX_CUT * Math.min(1, over / avail);
  const before = new Map(meals.map(m => [m, mealTotals(m).cal]));
  cands.forEach(c => {
    const eff = effAmount(c.it);
    let ne = eff * k;
    ne = isScalable(c.f) ? Math.round(ne / 5) * 5 : Math.round(ne * 2) / 2;
    ne = Math.max(ne, isScalable(c.f) ? 5 : 0.5, 0);
    if (ne < eff) c.it.amount = rawFromEff(c.f, ne);
  });
  const parts = [];
  meals.forEach(m => {
    const d = Math.round(mealTotals(m).cal - before.get(m));
    if (d < 0) { m.balanced = Math.round(num(m.balanced, 0) + d); parts.push(`${shortMealTitle(m)} −${fmtInt(-d)}`); }
  });
  return { msg: ` · Günü dengeledim: ${parts.join(", ")} kcal${avail < over ? " (aşımın tamamı kapatılamadı)" : ""}`, parts };
}
const BALANCE_MAX_CUT = 0.75;
// "2. Öğün: Öğle Yemeği (...)" → "2. Öğün"; uzun adlar kısaltılır
function shortMealTitle(m) {
  const t = String(m.title || "");
  const i = t.indexOf(":");
  if (i > 0 && i <= 16) return t.slice(0, i);
  return t.length > 18 ? t.slice(0, 17) + "…" : t;
}

// ---------------------------------------------------------------------------
// MENÜLERİM
// ---------------------------------------------------------------------------
// v22: Proteinin öğünlere dağılımı (genel öneri: öğün başına ~20–40 g). Yalnızca içinde besin olan öğünler.
function proteinSpreadHtml(meals) {
  const rows = meals.filter(m => m.items.length).map(m => ({ t: shortMealTitle(m), p: mealTotals(m).p }));
  if (rows.length < 2) return "";
  const max = Math.max(40, ...rows.map(r => r.p));
  const low = rows.filter(r => r.p < 20).length;
  return `<div class="n-bt pt-3 space-y-1.5" data-protein-spread>
      <div class="flex items-baseline justify-between gap-2"><span class="n-label">PROTEİN DAĞILIMI</span><span class="text-[11px] n-dim">öğün başına ~20–40 g önerilir</span></div>
      ${rows.map(r => `<div class="flex items-center gap-2 text-[12px]">
        <span class="w-[92px] shrink-0 truncate n-muted">${esc(r.t)}</span>
        <span class="relative flex-1 h-2 rounded-full n-bar-bg overflow-hidden">
          <span class="absolute inset-y-0 rounded-full" style="left:${20 / max * 100}%;width:${20 / max * 100}%;background:var(--n-accent-soft)"></span>
          <span class="absolute inset-y-0 left-0 rounded-full" style="width:${Math.min(100, r.p / max * 100)}%;background:var(--n-p)"></span>
        </span>
        <span class="w-[46px] shrink-0 text-right tabular-nums ${r.p < 20 ? "n-k font-bold" : "n-text font-semibold"}">${Math.round(r.p)} g</span>
      </div>`).join("")}
      ${low ? `<p class="text-[11px] n-dim">${low} öğünde protein 20 g'ın altında; günlük toplam aynı kalsa da proteini öğünlere yaymak tokluk ve kas onarımı için daha iyi.</p>` : ""}
    </div>`;
}
function renderMenus() {
  const db = getFoodDB();
  const targets = getTargets();
  const plan = nutritionTotals(curMeals());
  const diff = Math.round(plan.cal) - targets.calTarget;
  const tol = Math.max(50, Math.round(targets.calTarget * 0.05));
  const ok = Math.abs(diff) <= tol;
  const statusHtml = ok
    ? `<span class="font-bold n-accent flex items-center gap-1">${svgI("check", 16, 2.6)}Hedefe uygun</span>`
    : diff > 0 ? `<span class="font-bold n-over">${fmtInt(diff)} kcal fazla</span>` : `<span class="font-bold n-k">${fmtInt(-diff)} kcal eksik</span>`;
  const pk = plan.p * 4, ck = plan.c * 4, fk = plan.f * 9, sum = pk + ck + fk || 1;
  const pct = x => Math.round((x / sum) * 100);
  $("menuTotal").innerHTML = `
    <div class="flex items-center justify-between gap-2 text-[13px]"><span class="n-muted">Menü toplamı</span>${statusHtml}</div>
    <div class="flex items-baseline gap-1.5 flex-wrap"><span class="t-display text-[36px] leading-none tabular-nums">${fmtInt(plan.cal)}</span><span class="text-[14px] font-semibold n-muted">/ ${fmtInt(targets.calTarget)} kcal hedef</span></div>
    <div class="h-2.5 w-full rounded-full overflow-hidden flex gap-1" aria-hidden="true">
      <div class="h-full rounded-l-full" style="width:${pct(pk)}%;background:var(--n-p)"></div>
      <div class="h-full" style="width:${pct(ck)}%;background:var(--n-k)"></div>
      <div class="h-full rounded-r-full" style="width:${pct(fk)}%;background:var(--n-y)"></div>
    </div>
    <div class="grid grid-cols-3 gap-2 text-[12px]">
      <div><strong class="n-p text-[14px]">${Math.round(plan.p)} g</strong> <span class="n-muted">protein</span><div class="n-dim">hedef ${targets.proTarget} g · %${pct(pk)}</div></div>
      <div><strong class="n-k text-[14px]">${Math.round(plan.c)} g</strong> <span class="n-muted">karb</span><div class="n-dim">hedef ${targets.carbTarget} g · %${pct(ck)}</div></div>
      <div><strong class="n-y text-[14px]">${Math.round(plan.f)} g</strong> <span class="n-muted">yağ</span><div class="n-dim">hedef ${targets.fatTarget} g · %${pct(fk)}</div></div>
    </div>
    ${proteinSpreadHtml(curMeals())}`;

  // Kiloya göre gramaj kartı
  const st = state.settings;
  const k = scaleK();
  $("scaleCard").innerHTML = `
    <label class="flex items-center justify-between gap-3 cursor-pointer min-h-[44px]">
      <span class="min-w-0"><span class="block text-[15px] font-bold">Kiloya göre gramaj</span>
        <span class="block text-[12px] n-muted">Kilon değişince menüdeki gramajlar da orantılı değişir.</span></span>
      <input id="scaleToggle" type="checkbox" class="n-sw" ${st.scaleOn ? "checked" : ""} onchange="toggleWeightScale(this.checked)" />
    </label>
    ${st.scaleOn ? `
      <div class="n-elev rounded-2xl px-3.5 py-3 space-y-1">
        <div class="flex items-center justify-between gap-2 text-[14px]"><span class="n-muted">Başlangıç kilosu</span><strong>${fmtNum(num(st.scaleBase, state.weight))} kg</strong></div>
        <div class="flex items-center justify-between gap-2 text-[14px]"><span class="n-muted">Şimdiki kilo</span><strong>${fmtNum(state.weight)} kg</strong></div>
        <div class="flex items-center justify-between gap-2 text-[14px]"><span class="n-muted">Gramaj oranı</span><strong class="n-accent">%${Math.round(k * 100)}</strong></div>
      </div>
      <button onclick="resetScaleBase()" class="n-btn-outline w-full h-11 rounded-full text-[13px]">Bu gramajları yeni başlangıç yap (${fmtNum(state.weight)} kg)</button>
      <p class="text-[12px] n-dim">Yalnızca gram ve ml ile ölçülen besinler değişir (tavuk, pirinç, yulaf...). Adet, kase, ölçek gibi besinler aynı kalır. Oran en fazla %70–%130 arasında uygulanır. Ayarı kapatırsan menü son başlangıç yaptığın gramajlara döner.</p>
      ${num(st.calAdjust, 0) !== 0 ? `<p id="scaleCoachNote" class="text-[12px] n-k border border-current rounded-2xl px-3 py-2">Kalori koçu hedefini ${num(st.calAdjust, 0) > 0 ? "+" : ""}${fmtInt(num(st.calAdjust, 0))} kcal ayarladı. İkisi aynı düzeltmeyi iki kez yapmaz: gramajlar yalnızca kilona göre değişir, koç yalnızca hedef kaloriyi değiştirir. Bu yüzden koçun düzeltmesi menüye kendiliğinden yansımaz; menü toplamını hedefe uydurmak için öğünlerdeki gramajları ayarla.</p>` : ""}` : ""}`;

  // Öğün listesi
  const meals = curMeals();
  const copyLabel = state.dayType === "rest" ? "Antrenmana kopyala" : "Dinlenmeye kopyala";
  let html = meals.map((meal, mIdx) => {
    const t = mealTotals(meal);
    const open = openMenuMeals.has(meal.id);
    const head = `<div class="flex items-center gap-1">
        <button class="drag-handle w-11 h-11 -ml-2 shrink-0 flex items-center justify-center n-dim" data-midx="${mIdx}" aria-label="Öğünü sürükleyerek taşı" style="touch-action: none; cursor: grab;">
          <svg width="14" height="20" viewBox="0 0 14 20" fill="currentColor" aria-hidden="true"><circle cx="4" cy="4" r="1.6"></circle><circle cx="10" cy="4" r="1.6"></circle><circle cx="4" cy="10" r="1.6"></circle><circle cx="10" cy="10" r="1.6"></circle><circle cx="4" cy="16" r="1.6"></circle><circle cx="10" cy="16" r="1.6"></circle></svg>
        </button>
        <button onclick="toggleMenuMeal(${mIdx})" class="flex-1 min-w-0 min-h-[52px] flex items-center gap-3 text-left" aria-expanded="${open}" aria-label="${esc(meal.title)} öğününü ${open ? "kapat" : "aç"}">
          ${meal.time ? `<span class="t-display text-[18px] n-accent tabular-nums shrink-0">${esc(meal.time)}</span>` : ""}
          <span class="flex-1 min-w-0"><span class="block text-[15px] font-bold leading-snug break-words">${esc(meal.title)}</span>
            <span class="block text-[12px] n-muted tabular-nums mt-0.5">${fmtInt(t.cal)} kcal · ${macroLine(t.p, t.c, t.f)} · ${t.n} besin</span></span>
          <span class="n-dim shrink-0">${svgI(open ? "chevD" : "chevR", 18)}</span>
        </button>
      </div>`;
    if (!open) return `<div data-meal-card="${mIdx}" class="n-card rounded-[20px] px-3 py-1.5">${head}</div>`;
    const items = meal.items.map((item, iIdx) => {
      const f = db[item.foodId];
      if (!f) return "";
      const mac = calcItemMacros(item);
      const canSwap = !!swapGroup(item.foodId);
      return `<div class="py-2.5">
          <div class="flex items-center gap-1 min-h-[24px]">
            <div class="flex-1 min-w-0 text-[15px] font-semibold truncate">${esc(f.name)}</div>
            <div class="shrink-0 text-[14px] font-bold tabular-nums">${Math.round(mac.cal)} <span class="text-[12px] font-semibold n-dim">kcal</span></div>
            ${canSwap ? `<button onclick="openSwap(${mIdx}, ${iIdx})" class="w-11 h-11 -my-2.5 shrink-0 rounded-full flex items-center justify-center n-accent text-[18px] font-bold" aria-label="${esc(f.name)} için ikame seç">⇄</button>` : ""}
            <button onclick="removeItem(${mIdx}, ${iIdx})" class="w-11 h-11 -my-2.5 -mr-2 shrink-0 rounded-full flex items-center justify-center n-over" aria-label="${esc(f.name)} çıkar">${svgI("x", 18, 2.2)}</button>
          </div>
          <div class="flex items-center justify-between gap-2 mt-2">
            <div class="text-[12px] font-semibold tabular-nums leading-tight min-w-0">${macroLine(mac.p, mac.c, mac.f, true)}</div>
            <div class="flex items-center gap-1 shrink-0">
              <button onclick="changeAmount(${mIdx}, ${iIdx}, -1)" class="n-btn-ghost w-11 h-11 rounded-xl flex items-center justify-center" aria-label="${esc(f.name)} azalt">${svgI("minus", 18, 2.4)}</button>
              <input type="text" inputmode="decimal" data-fk="amt-${mIdx}-${iIdx}" value="${esc(fmtNum(effAmount(item)))}" onchange="setAmount(${mIdx}, ${iIdx}, this.value)" class="n-amt" aria-label="${esc(f.name)} miktarı" />
              <span class="text-[11px] n-muted w-12 truncate">${esc(f.unit)}</span>
              <button onclick="changeAmount(${mIdx}, ${iIdx}, 1)" class="n-btn-ghost w-11 h-11 rounded-xl flex items-center justify-center" aria-label="${esc(f.name)} artır">${svgI("plus", 18, 2.4)}</button>
            </div>
          </div>
        </div>`;
    }).join("");
    return `<div data-meal-card="${mIdx}" class="n-card n-sel rounded-[20px] px-3.5 pt-1.5 pb-3.5 space-y-3">
        ${head}
        ${meal.targetNote ? `<div class="text-[12px] n-muted -mt-2 pl-10">${esc(meal.targetNote)}</div>` : ""}
        <div class="n-div n-bt">${items || '<div class="text-[13px] n-dim py-3">Bu öğünde henüz besin yok.</div>'}</div>
        <button onclick="goAddFood(${mIdx}, 'menu')" class="n-btn w-full h-12 rounded-full text-[14px] flex items-center justify-center gap-1.5">${svgI("plus", 18, 2.4)}Besin ekle</button>
        <div class="flex gap-2 overflow-x-auto no-scrollbar -mx-0.5 px-0.5">
          <button onclick="quickAdd(${mIdx}, 'whey_shake', 1)" class="n-chip">+1 Shake</button>
          <button onclick="quickAdd(${mIdx}, 'yesil_salata', 1)" class="n-chip">+ Salata</button>
          <button onclick="quickAdd(${mIdx}, 'ceviz', 20)" class="n-chip">+20 g Ceviz</button>
        </div>
        <div class="flex flex-wrap items-center justify-end gap-1.5 pt-2 n-bt">
          <button onclick="saveMealAsCombo(${mIdx}, 'menu')" class="n-btn-ghost w-11 h-11 shrink-0 rounded-full flex items-center justify-center" aria-label="${esc(meal.title)}: kombo olarak kaydet">${svgI("star", 18)}</button>
          <button onclick="openMealModal(${mIdx})" class="n-btn-ghost w-11 h-11 shrink-0 rounded-full flex items-center justify-center" aria-label="${esc(meal.title)} öğününü düzenle">${svgI("edit", 18)}</button>
          <button onclick="copyMeal(${mIdx})" class="n-btn-ghost h-11 px-4 shrink-0 whitespace-nowrap rounded-full text-[13px] flex items-center gap-1.5">${svgI("copy", 16)}${copyLabel}</button>
          <button onclick="deleteMeal(${mIdx})" class="n-btn-ghost w-11 h-11 shrink-0 rounded-full flex items-center justify-center n-over" aria-label="${esc(meal.title)} öğününü sil">${svgI("trash", 18)}</button>
        </div>
      </div>`;
  }).join("");
  html += `<button onclick="openMealModal()" class="w-full min-h-[60px] rounded-[20px] border-[1.5px] border-dashed n-accent flex items-center justify-center gap-2 font-bold text-[14px]" style="border-color: var(--n-accent)">
    ${svgI("plus", 20, 2.4)}Yeni öğün ekle</button>`;
  if (dayChangedIds().size) {
    html = `<div id="menuDayNote" class="n-card rounded-[20px] p-3.5 space-y-2.5">
        <p class="text-[13px] n-muted">Bugün ekranında bugüne özel değişiklikler yaptın. Burada yaptıkların <strong class="n-text">bugünü değiştirmez</strong>; yarından itibaren geçerli olur.</p>
        <button onclick="revertDayToMenu()" class="n-btn-ghost w-full h-11 rounded-full text-[13px]">Bugünü menüye geri döndür</button>
      </div>` + html;
  }
  $("mealsContainer").innerHTML = html;
}

// ---------------------------------------------------------------------------
// BESİNLER (arama, kategori, gramaj, hazır porsiyon, canlı kalan)
// ---------------------------------------------------------------------------
// dest: "day" → bugünkü plana (yalnızca bugün), "menu" → Menülerim'e
const foodUI = { meal: null, cat: "all", sel: null, amt: 0, dest: "day" };
function foodMeals() { return foodUI.dest === "menu" ? curMeals() : dayMeals(); }
function foodTargetIdx() {
  const meals = foodMeals();
  if (!meals.length) return -1;
  if (foodUI.meal != null && foodUI.meal >= 0 && foodUI.meal < meals.length) return foodUI.meal;
  const nx = meals.findIndex(m => !m.done);
  return nx >= 0 ? nx : 0;
}
function goAddFood(mIdx, dest) {
  foodUI.meal = mIdx;
  foodUI.sel = null;
  foodUI.dest = dest === "menu" ? "menu" : "day";
  state.nutriView = "foods";
  window.scrollTo(0, 0);
  renderAll();
}
function setFoodDest(d) { foodUI.dest = d === "menu" ? "menu" : "day"; renderAll(); }
function setFoodMeal(i) { foodUI.meal = i; renderAll(); }
function setFoodCat(c) { foodUI.cat = c; foodUI.sel = null; foodUI.limit = 0; renderFoods(); }
function foodCatKey(cat) { return "c:" + String(cat || "Diğer"); }

function renderFoods() {
  const meals = foodMeals();
  const tIdx = foodTargetIdx();
  $("foodMealChips").innerHTML = meals.map((m, i) => `<button onclick="setFoodMeal(${i})" class="n-chip ${i === tIdx ? "solid" : ""} max-w-[220px]" aria-pressed="${i === tIdx}"><span class="truncate">${esc(m.time ? m.time + " · " + m.title : m.title)}</span></button>`).join("");
  const db = getFoodDB();
  const cats = [];
  if (state.recentFoods.some(id => db[id] && !isHiddenFood(db[id]))) cats.push(["recent", "Son kullanılanlar"]);
  if (state.combos.length) cats.push(["combos", "Komboların"]);
  if (Object.keys(state.customFoods).some(id => id.startsWith("custom_recipe_"))) cats.push(["recipes", "Tariflerim"]);
  if (Object.keys(state.customFoods).length) cats.push(["custom", "Özel eklediklerim"]);
  [...new Set(Object.values(BASE_FOOD_DB).map(f => f.cat || "Diğer"))].forEach(c => cats.push([foodCatKey(c), stripEmoji(c)]));
  [...new Set(Object.values(USDA_DB).map(f => f.cat))].forEach(c => { if (!cats.some(x => x[0] === foodCatKey(c))) cats.push([foodCatKey(c), c]); });
  if (!cats.some(c => c[0] === foodUI.cat)) foodUI.cat = "all";
  $("foodCats").innerHTML = [["all", "Tümü"], ...cats].map(([k, l]) => `<button onclick='setFoodCat(${esc(JSON.stringify(k))})' class="n-chip ${foodUI.cat === k ? "solid" : ""}">${esc(l)}</button>`).join("");
  renderFoodHead();
  renderFoodSuggest();
  renderFoodList();
}

function foodRemainingText(extraCal, extraP) {
  const targets = getTargets();
  const plan = nutritionTotals(foodMeals());
  const rc = targets.calTarget - Math.round(plan.cal + extraCal);
  const rp = targets.proTarget - Math.round(plan.p + extraP);
  const c = rc >= 0 ? `<strong class="tabular-nums">${fmtInt(rc)} kcal</strong> kalır` : `<strong class="tabular-nums n-over">${fmtInt(-rc)} kcal</strong> aşar`;
  const p = rp >= 0 ? `<strong class="n-p tabular-nums">${fmtInt(rp)} g</strong> protein kalır` : `protein hedefi <strong class="n-p">${fmtInt(-rp)} g</strong> aşılır`;
  return `${c} · ${p}`;
}
function foodRemainPrefix(sel) {
  const where = foodUI.dest === "menu" ? "menüde" : "bugün";
  return sel ? `Ekledikten sonra ${where} ` : (foodUI.dest === "menu" ? "Menüde " : "Bugün ");
}
function renderFoodHead() {
  const meals = foodMeals();
  const tIdx = foodTargetIdx();
  const day = foodUI.dest !== "menu";
  const seg = `<div class="n-seg grid-cols-2 mb-1.5" aria-label="Nereye eklensin?">
      <button id="fdDay" onclick="setFoodDest('day')" class="${day ? "on" : ""}" aria-pressed="${day}">Sadece bugüne</button>
      <button id="fdMenu" onclick="setFoodDest('menu')" class="${day ? "" : "on"}" aria-pressed="${!day}">Menüme (her gün)</button>
    </div>
    <p id="fdHint" class="text-[12px] n-dim mb-3 px-1">${day ? "Yalnızca bugünkü öğüne eklenir; menün değişmez." : "Menüne eklenir; her gün geçerli olur."}</p>`;
  if (tIdx < 0) {
    $("foodHead").innerHTML = seg + `<div class="n-card rounded-[20px] p-4 text-[14px] n-muted">Besin eklemek için önce Menülerim'den bir öğün oluştur.</div>`;
    return;
  }
  const sel = foodSelMacros();
  $("foodHead").innerHTML = seg + `<div class="flex items-start justify-between gap-2">
      <div class="min-w-0"><div class="n-label">${day ? "BUGÜN HANGİ ÖĞÜNE?" : "MENÜDE HANGİ ÖĞÜNE?"}</div>
        <h2 class="text-[20px] font-extrabold leading-tight mt-0.5 break-words">${esc(meals[tIdx].title)}</h2></div>
    </div>
    <p id="foodRemain" class="text-[13px] n-muted mt-1">${foodRemainPrefix(sel)}${foodRemainingText(sel ? sel.cal : 0, sel ? sel.p : 0)}</p>`;
}

function foodSelMacros() {
  if (foodUI.sel && String(foodUI.sel).startsWith("combo:")) {
    const c = state.combos.find(x => "combo:" + x.id === foodUI.sel);
    if (!c) return null;
    const t = itemsTotals(c.items);
    return { combo: true, f: null, a: 1, p: t.p, c: t.c, fat: t.f, cal: t.cal };
  }
  const f = foodUI.sel && getFoodDB()[foodUI.sel];
  if (!f) return null;
  const a = num(foodUI.amt, 0);
  return { f, a, p: f.p * a, c: f.c * a, fat: f.f * a, cal: kcalPerUnit(f) * a };
}

// Hazır porsiyonlar: [{ v: miktar, label }]. USDA besinlerinde USDA porsiyonları (gram karşılığıyla) gösterilir.
function foodPresets(f) {
  const def = num(f.def, 1);
  if (Array.isArray(f.portions) && f.portions.length) {
    const list = f.portions.map(([n, g]) => ({ v: round1(g), label: `${n} · ${fmtNum(g)} g` }));
    if (!list.some(x => x.v === 100)) list.push({ v: 100, label: "100 g" });
    return { list, plus: 50 };
  }
  let vals;
  if (f.unit === "g") vals = [def, 50, 100, 150, 200];
  else if (f.unit === "ml") vals = [def, 100, 200, 250, 330];
  else vals = [def, 0.5, 1, 2, 3].filter(v => v >= num(f.step, 1) || v === def);
  vals = [...new Set(vals.map(v => round1(v)))].filter(v => v > 0).sort((a, b) => a - b);
  const plus = f.unit === "g" || f.unit === "ml" ? 50 : num(f.step, 1);
  return { list: vals.map(v => ({ v, label: `${fmtNum(v)} ${f.unit}${v === round1(def) ? " · porsiyon" : ""}` })), plus };
}

function renderFoodList() {
  const db = getFoodDB();
  const q = normSearch($("foodSearch").value).trim();
  const words = q.split(/\s+/).filter(Boolean);
  // v16: öneri kartı yalnızca arama boşken ve besin seçili değilken görünür
  if ($("foodSuggest")) $("foodSuggest").classList.toggle("hidden", !!q || !!foodUI.sel || !foodSuggestCache.length);
  let ids;
  // v15: komboalar ("Komboların" kategorisinde ve aramada adıyla eşleşenler)
  let comboHtml = "";
  if (foodUI.cat === "combos" || (foodUI.cat === "all" && words.length)) {
    comboHtml = state.combos.filter(c => !words.length || words.every(w => normSearch(c.name).includes(w))).map(comboRowHtml).join("");
  }
  if (foodUI.cat === "combos") {
    $("foodList").innerHTML = comboHtml || `<div class="text-[14px] n-muted text-center py-8">Henüz kombon yok. Bir öğünü açıp ★ Kombo olarak kaydedebilirsin.</div>`;
    updateFoodSelUI();
    return;
  }
  if (foodUI.cat === "recent") ids = state.recentFoods.filter(id => db[id] && !isHiddenFood(db[id]));
  else if (foodUI.cat === "recipes") ids = Object.keys(state.customFoods).filter(id => id.startsWith("custom_recipe_") && db[id]);
  else if (foodUI.cat === "custom") ids = Object.keys(state.customFoods).filter(id => db[id]);
  else if (foodUI.cat.startsWith("c:")) ids = Object.keys(db).filter(id => !isHiddenFood(db[id]) && foodCatKey(db[id].cat) === foodUI.cat);
  else ids = Object.keys(db).filter(id => !isHiddenFood(db[id]));
  // v18: akıllı arama (Türkçe karakter, kelime sırası, eş anlamlı, küçük yazım hatası) + sıralama
  if (words.length) ids = searchFoods(ids, q);
  else if (foodUI.cat === "all") ids = rankBrowse(ids);
  const total = ids.length;
  const shownIds = ids.slice(0, foodUI.limit || FOOD_PAGE);
  if (foodUI.sel && !shownIds.includes(foodUI.sel) && ids.includes(foodUI.sel)) shownIds.unshift(foodUI.sel);   // seçili besin her zaman görünür
  if (words.length) { if (!total && !comboHtml) noteMissSearch($("foodSearch").value); else cancelMissSearch(); }
  const tIdx = foodTargetIdx();
  const html = shownIds.map(id => {
    const f = db[id];
    const def = num(f.def, 1);
    if (id !== foodUI.sel) {
      return `<button onclick='selectFood(${esc(JSON.stringify(id))})' class="w-full min-h-[64px] flex items-center justify-between gap-3 py-2.5 text-left n-bb" data-food="${esc(id)}">
          <span class="min-w-0"><span class="block text-[15px] font-bold leading-snug">${esc(f.name)}</span>
            <span class="block text-[12px] n-muted mt-0.5 tabular-nums">${fmtNum(def)} ${esc(f.unit)} · ${Math.round(kcalPerUnit(f) * def)} kcal · ${Math.round(f.p * def)} g protein</span></span>
          <span class="w-10 h-10 rounded-full n-btn flex items-center justify-center shrink-0" aria-hidden="true">${svgI("plus", 20, 2.4)}</span>
        </button>`;
    }
    const pr = foodPresets(f);
    const custom = id.startsWith("custom_");
    return `<div class="n-elev n-sel rounded-[24px] p-4 space-y-3.5 my-2" data-food="${esc(id)}" id="foodSelCard">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0"><h3 class="text-[17px] font-extrabold leading-snug break-words">${esc(f.name)}</h3>
            <div class="text-[12px] n-muted mt-0.5">${esc(stripEmoji(f.cat || ""))}${f.barcode ? " · barkod " + esc(f.barcode) : ""}</div>
            ${foodSourceText(f) ? `<div class="text-[11px] n-dim mt-0.5" data-src>${esc(foodSourceText(f))}</div>` : ""}
            ${f.note ? `<div class="text-[11px] n-dim mt-0.5">${esc(f.note)}</div>` : ""}
            ${f.kx ? `<div class="text-[11px] n-dim mt-0.5">Kalori USDA ölçümüdür (${esc(f.kx)} nedeniyle makrolardan hesaplanandan farklı).</div>` : ""}</div>
          <div class="text-right shrink-0 whitespace-nowrap"><span id="foodSelKcal" class="t-display text-[28px] leading-none tabular-nums"></span><span class="text-[12px] n-muted ml-1">kcal</span></div>
        </div>
        <div class="flex items-center justify-between px-1">
          <button onclick="foodStep(-1)" class="w-12 h-12 rounded-full n-card flex items-center justify-center" aria-label="Azalt">${svgI("minus", 20, 2.4)}</button>
          <div class="flex items-baseline justify-center gap-1 min-w-0">
            <input id="foodAmt" type="text" inputmode="decimal" data-fk="food-amt" value="${esc(fmtNum(foodUI.amt))}" oninput="foodAmtInput(this.value)" class="n-amt big t-display" aria-label="${esc(f.name)} miktarı" />
            <span class="text-[14px] font-semibold n-muted">${esc(f.unit)}</span>
          </div>
          <button onclick="foodStep(1)" class="w-12 h-12 rounded-full n-card flex items-center justify-center" aria-label="Artır">${svgI("plus", 20, 2.4)}</button>
        </div>
        ${naturalUnit(f) ? `<div class="flex items-center justify-between gap-2 n-card rounded-full pl-4 pr-1 py-1" data-unit-row>
            <span class="min-w-0 text-[13px] n-muted leading-tight"><strong id="foodUnitCount" class="n-text text-[15px]"></strong><span class="block text-[11px]">1 ${esc(naturalUnit(f).label)} = ${fmtNum(naturalUnit(f).g)} g</span></span>
            <div class="flex gap-1 shrink-0">
              <button onclick="foodUnitStep(-1)" class="w-11 h-11 rounded-full n-elev flex items-center justify-center" aria-label="Bir ${esc(naturalUnit(f).label)} azalt">${svgI("minus", 18, 2.4)}</button>
              <button onclick="foodUnitStep(1)" class="w-11 h-11 rounded-full n-elev flex items-center justify-center" aria-label="Bir ${esc(naturalUnit(f).label)} artır">${svgI("plus", 18, 2.4)}</button>
            </div>
          </div>` : ""}
        <div class="flex items-center justify-start gap-2 flex-wrap" aria-label="Hazır porsiyonlar">
          ${pr.list.map(x => `<button onclick="foodPreset(${x.v})" class="n-chip ${round1(num(foodUI.amt)) === x.v ? "on" : ""}" data-preset="${x.v}">${esc(x.label)}</button>`).join("")}
          <button onclick="foodPreset(null, ${pr.plus})" class="n-chip">+${fmtNum(pr.plus)} ${esc(f.unit)}</button>
        </div>
        <div class="grid grid-cols-3 gap-2 text-center text-[13px] font-extrabold">
          <div id="foodSelP" class="py-2 rounded-full n-p" style="background: var(--n-p-soft)"></div>
          <div id="foodSelC" class="py-2 rounded-full n-k" style="background: var(--n-k-soft)"></div>
          <div id="foodSelF" class="py-2 rounded-full n-y" style="background: var(--n-y-soft)"></div>
        </div>
        ${microOf(f, 1) ? `<div id="foodSelMicro" class="text-[12px] n-muted text-center -mt-1"></div>` : ""}
        <button id="foodAddBtn" onclick="addSelectedFood()" class="n-btn w-full h-[52px] rounded-full text-[15px]" ${tIdx < 0 ? "disabled" : ""}></button>
        ${custom ? `<div class="flex justify-end gap-2 pt-1 n-bt">
            <button onclick='editCustomFood(${esc(JSON.stringify(id))})' class="n-btn-ghost h-11 px-4 rounded-full text-[13px] flex items-center gap-1.5">${svgI("edit", 16)}Düzenle</button>
            <button onclick='deleteCustomFood(${esc(JSON.stringify(id))})' class="n-btn-ghost h-11 px-4 rounded-full text-[13px] flex items-center gap-1.5 n-over">${svgI("trash", 16)}Sil</button>
          </div>` : ""}
      </div>`;
  }).join("");
  const more = total > shownIds.length
    ? `<button onclick="foodUI.limit = (foodUI.limit || FOOD_PAGE) + 100; renderFoodList()" class="n-btn-ghost w-full h-12 rounded-full text-[14px] mt-2" id="foodMore">${fmtInt(total - shownIds.length)} sonuç daha · göster</button>` : "";
  $("foodList").innerHTML = (comboHtml + html) ? comboHtml + html + more : noResultHtml($("foodSearch").value.trim());
  updateFoodSelUI();
}

// Seçili besinin canlı değerleri (tam yeniden çizim yapmadan; iPhone'da klavye kapanmasın)
function updateFoodSelUI() {
  const s = foodSelMacros();
  if (s && !s.combo && $("foodSelKcal")) {
    const tIdx = foodTargetIdx();
    $("foodSelKcal").textContent = fmtInt(s.cal);
    $("foodSelP").textContent = `${fmtNum(s.p)} g P`;
    $("foodSelC").textContent = `${fmtNum(s.c)} g K`;
    $("foodSelF").textContent = `${fmtNum(s.fat)} g Y`;
    $("foodAddBtn").textContent = tIdx >= 0 ? `Öğüne ekle · ${fmtInt(s.cal)} kcal` : "Önce bir öğün oluştur";
    $("foodAddBtn").disabled = tIdx < 0 || !(s.a > 0);
    document.querySelectorAll("#foodSelCard [data-preset]").forEach(b => b.classList.toggle("on", num(b.dataset.preset) === round1(s.a)));
    const f = getFoodDB()[foodUI.sel];
    const u = naturalUnit(f);
    if (u && $("foodUnitCount")) $("foodUnitCount").textContent = `${fmtNum(round1(s.a / u.g))} × ${u.label}`;
    const mi = microOf(f, s.a);
    if ($("foodSelMicro")) $("foodSelMicro").textContent = mi ? [mi.fib != null ? `Lif ${fmtNum(mi.fib)} g` : "", mi.salt != null ? `Tuz ${fmtNum(mi.salt)} g` : ""].filter(Boolean).join(" · ") : "";
  }
  const r = $("foodRemain");
  if (r) r.innerHTML = foodRemainPrefix(s) + foodRemainingText(s ? s.cal : 0, s ? s.p : 0);
}
function selectFood(id) {
  const f = getFoodDB()[id];
  if (!f) return;
  foodUI.sel = id;
  foodUI.amt = round1(num(f.def, 1));
  renderFoodHead();
  renderFoodList();
  const el = $("foodSelCard");
  if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
}
// v22: Doğal birim (adet, dilim, parça...): gramla seçilen besinlerde "adet ile" sayaç. Varsayılan porsiyon doğal birimse o seçilir.
const NATURAL_RX = /^1 (adet|dilim|parça|fileto|göğüs|baget|kanat|pirzola|köfte|yaprak|diş|sap|baş|koçan|çubuk|şerit|üst but)/;
function naturalUnit(f) {
  if (!f || f.unit !== "g" || !Array.isArray(f.portions)) return null;
  const nat = f.portions.filter(([n, g]) => NATURAL_RX.test(n) && g > 0);
  if (!nat.length) return null;
  const p = nat.find(([, g]) => round1(g) === round1(num(f.def, 0))) || nat[0];
  return { label: p[0].replace(/^1 /, ""), g: num(p[1], 0) };
}
function foodUnitStep(dir) {
  const f = foodUI.sel && getFoodDB()[foodUI.sel];
  const u = naturalUnit(f);
  if (!u) return;
  const n = Math.max(1, Math.round(num(foodUI.amt) / u.g) + dir);
  foodUI.amt = round1(n * u.g);
  $("foodAmt").value = fmtNum(foodUI.amt);
  updateFoodSelUI();
}
// v22: lif ve tuz (tuz = sodyum × 2,5). Veri yalnızca veritabanı (USDA) besinlerinde var.
function microOf(f, a) {
  if (!f) return null;
  const r = {};
  if (f.fib != null) r.fib = f.fib * a;
  if (f.na != null) r.salt = f.na * a * 2.5 / 1000;
  return r.fib == null && r.salt == null ? null : r;
}
function microTotals(view) {
  const db = getFoodDB();
  let fib = 0, salt = 0, n = 0, mFib = 0, mSalt = 0;
  dayMeals().forEach(m => {
    if (view === "eaten" && !m.done) return;
    m.items.forEach(it => {
      n++;
      const f = it.est ? null : db[it.foodId];
      const x = f ? microOf(f, effAmount(it)) : null;
      if (x && x.fib != null) fib += x.fib; else mFib++;
      if (x && x.salt != null) salt += x.salt; else mSalt++;
    });
  });
  return { fib, salt, n, miss: Math.max(mFib, mSalt) };
}
function fibTarget() { return Math.round(getTargets().calTarget / 1000 * 14); }   // 14 g / 1000 kcal (genel öneri)
const SALT_LIMIT = 5;   // g/gün (DSÖ önerisi)
function renderMicroLine(view) {
  const el = $("microLine");
  if (!el) return;
  const t = microTotals(view);
  if (!t.n) { el.innerHTML = ""; el.classList.add("hidden"); return; }
  el.classList.remove("hidden");
  const over = t.salt > SALT_LIMIT;
  el.innerHTML = `<span>Lif <strong class="text-white tabular-nums">${fmtNum(t.fib)}</strong> / ${fibTarget()} g</span>
    <span>Tuz <strong class="tabular-nums" style="color:${over ? "#FB7185" : "#fff"}">${fmtNum(t.salt)}</strong> / ${SALT_LIMIT} g</span>
    ${t.miss ? `<span class="text-white/60" data-micro-miss>${t.miss} besinde lif/tuz verisi yok</span>` : ""}`;
}
function foodAmtInput(v) { foodUI.amt = Math.max(0, num(v, 0)); updateFoodSelUI(); }
function foodStep(dir) {
  const f = foodUI.sel && getFoodDB()[foodUI.sel];
  if (!f) return;
  foodUI.amt = Math.max(0, round1(num(foodUI.amt) + dir * num(f.step, 1)));
  $("foodAmt").value = fmtNum(foodUI.amt);
  updateFoodSelUI();
}
function foodPreset(v, plus) {
  foodUI.amt = plus ? round1(num(foodUI.amt) + plus) : round1(v);
  $("foodAmt").value = fmtNum(foodUI.amt);
  updateFoodSelUI();
}
function addSelectedFood() {
  const s = foodSelMacros();
  const tIdx = foodTargetIdx();
  if (!s || tIdx < 0 || !(s.a > 0)) return;
  const fid = foodUI.sel, amt = s.a;
  if (foodUI.dest === "menu") {
    const mealTitle = curMeals()[tIdx].title;
    quickAdd(tIdx, fid, amt, curMeals());
    toast(`✓ ${fmtNum(amt)} ${s.f.unit} ${s.f.name} → ${mealTitle} (menüne, her gün)`);
  } else {
    const list = ensureDayCopy();
    const meal = list[tIdx];
    quickAdd(tIdx, fid, amt, list);
    const mid = meal.id;
    toast(`✓ ${fmtNum(amt)} ${s.f.unit} ${s.f.name} → ${meal.title} (yalnızca bugün)`, "ok", { label: "Menüye de kaydet", fn: () => addToMenuById(mid, fid, amt) });
  }
  foodUI.sel = null;
  renderFoods();
}
// Bugüne eklenen besini, aynı kimlikli menü öğününe de ekler
function addToMenuById(mealId, foodId, amount) {
  const mi = curMeals().findIndex(m => m.id === mealId);
  if (mi < 0) { toast("Bu öğün menüde bulunamadı", "error"); return; }
  quickAdd(mi, foodId, amount, curMeals());
  toast(`✓ Menüdeki "${curMeals()[mi].title}" öğününe de eklendi`);
}

// ---------------------------------------------------------------------------
// GEÇMİŞ
// ---------------------------------------------------------------------------
function renderNutriHistory() {
  const t = getTargets();
  const plan = nutritionTotals();
  const eaten = eatenTotals();
  const meals = dayMeals();
  const sup = state.supplements || {};
  const rows = [{
    key: state.today || logicalToday(), live: true, dayType: state.dayType,
    eatenKcal: eaten.cal, eatenP: eaten.p, kcal: plan.cal, calTarget: t.calTarget, proTarget: t.proTarget,
    water: state.waterLiters || 0, mealsDone: meals.filter(m => m.done).length, mealsTotal: meals.length,
    supps: state.supplementList.filter(x => sup[x.id]).length
  }];
  Object.keys(state.dailyLogs).sort().reverse().filter(k => k !== rows[0].key).slice(0, 60).forEach(k => rows.push({ key: k, ...state.dailyLogs[k] }));
  const dayLabel = k => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(k);
    return m ? new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString("tr-TR", { weekday: "short", day: "numeric", month: "short" }) : k;
  };
  const card = r => {
    const hasEaten = r.eatenKcal != null;
    const kc = Math.round(num(hasEaten ? r.eatenKcal : r.kcal, 0));
    const tg = Math.round(num(r.calTarget, 0));
    const pct = tg > 0 ? Math.min(100, Math.round(kc / tg * 100)) : 0;
    const over = tg > 0 && kc > tg;
    const bits = [];
    if (r.eatenP != null) bits.push(`Protein <strong>${fmtInt(r.eatenP)}</strong>${r.proTarget ? " / " + fmtInt(r.proTarget) : ""} g`);
    if (r.water != null) bits.push(`Su <strong>${fmtNum(num(r.water))}</strong> L`);
    if (r.mealsTotal) bits.push(`Öğün <strong>${num(r.mealsDone)}/${num(r.mealsTotal)}</strong>`);
    if (r.supps != null) bits.push(`Takviye <strong>${num(r.supps)}</strong>`);
    return `<div class="n-card rounded-[20px] p-4 space-y-2.5" data-history-day="${esc(r.key)}">
        <div class="flex items-center justify-between gap-2">
          <div class="text-[15px] font-bold">${r.live ? "Bugün" : esc(dayLabel(r.key))}${r.live ? ' <span class="text-[12px] font-semibold n-accent">· devam ediyor</span>' : ""}</div>
          ${r.dayType ? `<span class="text-[12px] font-semibold n-muted">${r.dayType === "rest" ? "Dinlenme" : "Antrenman"}</span>` : ""}
        </div>
        <div class="flex items-baseline gap-1.5"><span class="t-display text-[26px] leading-none tabular-nums ${over ? "n-over" : ""}">${fmtInt(kc)}</span>
          <span class="text-[13px] n-muted">${tg ? "/ " + fmtInt(tg) + " " : ""}kcal ${hasEaten ? "yenen" : "planlanan"}</span></div>
        ${tg ? `<div class="h-1.5 rounded-full n-bar-bg overflow-hidden"><div class="h-full rounded-full" style="width:${pct}%;background:${over ? "var(--n-over)" : "var(--n-accent)"}"></div></div>` : ""}
        ${bits.length ? `<div class="text-[12px] n-muted flex flex-wrap gap-x-3 gap-y-1">${bits.map(b => `<span>${b}</span>`).join("")}</div>` : ""}
      </div>`;
  };
  $("nutriHistory").innerHTML = weekCardHtml() + rows.map(card).join("")
    + (rows.length === 1 ? `<p class="text-[13px] n-muted text-center py-2">Her gün gece yarısı (ya da "Yeni gün" ile) günün özeti buraya eklenir.</p>` : "")
    + `<button onclick="switchTab('progress')" class="n-btn-outline w-full h-12 rounded-full text-[14px]">Grafikler için İlerleme sekmesine git</button>`;
}

// ---------------------------------------------------------------------------
// BARKOD (kamera → ZXing; ürün bilgisi Open Food Facts'ten, internet gerekir)
// ---------------------------------------------------------------------------
const bc = { reader: null, token: 0, found: null };
let cfPendingBarcode = null;
function bcStatus(msg) { $("bcStatus").textContent = msg || ""; }
function openBarcode() {
  $("bcResult").innerHTML = "";
  $("bcManual").value = "";
  bc.found = null;
  const m = $("barcodeModal");
  m.classList.remove("hidden"); m.classList.add("flex");
  startScan();
}
function closeBarcode() { stopScan(); closeModal("barcodeModal"); }
function loadZXing() {
  return new Promise((res, rej) => {
    if (window.ZXing) { res(window.ZXing); return; }
    const s = document.createElement("script");
    s.src = "vendor/zxing.min.js";
    s.onload = () => window.ZXing ? res(window.ZXing) : rej(new Error("ZXing yüklenemedi"));
    s.onerror = () => rej(new Error("ZXing yüklenemedi"));
    document.head.appendChild(s);
  });
}
async function startScan() {
  stopScan();
  const token = bc.token;
  const wrap = $("bcCamWrap");
  wrap.classList.remove("hidden");
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    wrap.classList.add("hidden");
    bcStatus("Bu cihazda kamera açılamadı. Barkod numarasını aşağıya elle yazabilirsin.");
    return;
  }
  bcStatus("Kamera açılıyor…");
  try {
    const Z = await loadZXing();
    if (token !== bc.token) return;
    const hints = new Map();
    hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.UPC_E, Z.BarcodeFormat.CODE_128]);
    const reader = new Z.BrowserMultiFormatReader(hints, 250);
    bc.reader = reader;
    await reader.decodeFromConstraints({ audio: false, video: { facingMode: { ideal: "environment" } } }, $("bcVideo"), (result) => {
      if (!result || token !== bc.token) return;
      const code = result.getText();
      stopScan();
      wrap.classList.add("hidden");
      onBarcode(code);
    });
    if (token === bc.token) bcStatus("Barkodu çerçevenin içine getir.");
  } catch (e) {
    if (token !== bc.token) return;
    stopScan();
    wrap.classList.add("hidden");
    const name = e && e.name;
    bcStatus(name === "NotAllowedError" || name === "SecurityError"
      ? "Kamera izni verilmedi. iPhone'da Ayarlar → Safari → Kamera'dan izin verebilirsin. Numarayı aşağıya elle de yazabilirsin."
      : name === "NotFoundError" || name === "OverconstrainedError"
        ? "Kamera bulunamadı. Barkod numarasını aşağıya elle yazabilirsin."
        : "Kamera açılamadı. Barkod numarasını aşağıya elle yazabilirsin.");
  }
}
function stopScan() {
  bc.token++;
  try { if (bc.reader) bc.reader.reset(); } catch (e) { /* yoksay */ }
  bc.reader = null;
  const v = $("bcVideo");
  if (v && v.srcObject) { try { v.srcObject.getTracks().forEach(t => t.stop()); } catch (e) { /* yoksay */ } v.srcObject = null; }
}
function barcodeManual() { stopScan(); $("bcCamWrap").classList.add("hidden"); onBarcode($("bcManual").value); }

async function onBarcode(raw) {
  const code = String(raw || "").replace(/\D/g, "");
  $("bcResult").innerHTML = "";
  if (code.length < 8 || code.length > 14) { bcStatus("Geçerli bir barkod numarası değil (8–14 rakam olmalı)."); return; }
  $("bcManual").value = code;
  const local = Object.keys(state.customFoods).find(id => state.customFoods[id] && state.customFoods[id].barcode === code);
  if (local) {
    closeBarcode();
    pickFoodInFoods(local);
    toast(`✓ ${state.customFoods[local].name} listende vardı; miktarı seçip öğüne ekle`);
    return;
  }
  if (navigator.onLine === false) {
    bcStatus(`${code} okundu. Ürünü bulmak için internet gerekli. Bağlanınca tekrar dene ya da besini elle ekle.`);
    bcManualButton(code, "");
    return;
  }
  bcStatus(`${code} aranıyor…`);
  let p;
  try { p = await fetchOFF(code); }
  catch (e) {
    bcStatus("Ürün bilgisine ulaşılamadı. İnternet bağlantını kontrol edip tekrar dene ya da besini elle ekle.");
    bcManualButton(code, "");
    return;
  }
  if ($("bcManual").value !== code) return;   // bu arada başka barkod arandı
  if (!p) {
    // v14: bulunamayınca doğrudan etiket formu açılır
    closeBarcode();
    openLabelForm(code, "");
    return;
  }
  const n = p.nutriments || {};
  const v = k => { const x = n[k]; return x === "" || x == null ? NaN : num(x, NaN); };
  const pr = v("proteins_100g"), cb = v("carbohydrates_100g"), ft = v("fat_100g");
  let kcal = v("energy-kcal_100g");
  if (!isFinite(kcal) && isFinite(v("energy_100g"))) kcal = v("energy_100g") / 4.184;
  const name = String(p.product_name_tr || p.product_name || "").trim() || `Ürün ${code}`;
  const brand = String(p.brands || "").split(",")[0].trim();
  const unit = String(p.product_quantity_unit || "").toLowerCase() === "ml" ? "ml" : "g";
  const serving = num(p.serving_quantity, 0);
  const complete = [pr, cb, ft].every(x => isFinite(x) && x >= 0);
  bc.found = { code, name, brand, unit, p: pr, c: cb, f: ft, kcal: isFinite(kcal) ? kcal : null, def: serving > 0 && serving <= 1000 ? Math.round(serving) : 100 };
  const issues = complete ? labelCheck(isFinite(kcal) ? kcal : null, pr, cb, ft, 100) : [];
  bcStatus(!complete ? "Ürün bulundu ama besin değerleri eksik." : issues.length ? "Ürün bulundu ama değerleri tutarsız görünüyor." : "Ürün bulundu.");
  $("bcResult").innerHTML = `<div class="n-elev rounded-[20px] p-4 space-y-2.5">
      <div><div class="text-[16px] font-bold leading-snug break-words">${esc(name)}</div><div class="text-[12px] n-muted">${brand ? esc(brand) + " · " : ""}${code}</div></div>
      ${complete
        ? `<div class="text-[13px]"><span class="n-muted">100 ${unit}:</span> <strong>${Math.round(isFinite(kcal) ? kcal : pr * 4 + cb * 4 + ft * 9)} kcal</strong> · <span class="n-p">${fmtNum(pr)} g P</span> · <span class="n-k">${fmtNum(cb)} g K</span> · <span class="n-y">${fmtNum(ft)} g Y</span></div>
           ${issues.length
             ? `<div id="bcWarn" class="rounded-2xl p-3 text-[13px] leading-snug" style="background: var(--n-over-soft); color: var(--n-text)"><strong style="color: var(--n-over)">⚠ Etiketle karşılaştır.</strong> ${esc(issues.join(" "))} Bu veriler gönüllülerce girilir; hata olabilir.</div>
                <button onclick="barcodeFixFood()" class="n-btn w-full h-12 rounded-full text-[15px]">Etikete bakıp düzelt</button>
                <button onclick="addBarcodeFood()" class="n-btn-outline w-full h-12 rounded-full text-[15px]">Yine de ekle</button>`
             : `<button onclick="addBarcodeFood()" class="n-btn w-full h-12 rounded-full text-[15px]">Listeme ekle ve seç</button>`}`
        : `<p class="text-[13px] n-muted">Paketin üzerindeki 100 ${unit} değerleriyle elle ekleyebilirsin.</p>
           <button onclick="barcodeManualFood()" class="n-btn w-full h-12 rounded-full text-[15px]">Elle ekle</button>`}
    </div>`;
}
function bcManualButton(code, name) {
  bc.found = { code, name };
  $("bcResult").innerHTML = `<button onclick="barcodeManualFood()" class="n-btn-outline w-full h-12 rounded-full text-[15px]">Etiketteki değerleri gir</button>`;
}
// v21: Etiket değerleri tutarlı mı? (Open Food Facts'te ve elle girişte sık görülen hatalar: kJ/kcal karışıklığı,
// ondalık hatası, porsiyon ↔ 100 g karışıklığı). base = değerlerin ait olduğu gram (100 ya da porsiyon); 0 = adet (yalnızca kalori sağlaması).
// Sonuç: sorun cümleleri (boşsa tutarlı).
function labelCheck(kcal, p, c, f, base) {
  const out = [];
  p = num(p, 0); c = num(c, 0); f = num(f, 0);
  if (base > 0 && p + c + f > base * 1.03) out.push(`Protein + karb + yağ (${fmtNum(p + c + f)} g), ${fmtNum(base)} g'ı aşıyor.`);
  const k = kcal == null || !isFinite(kcal) ? null : num(kcal, 0);
  if (base > 0 && k != null && k > base * 9.2) out.push(`${fmtNum(base)} g için ${Math.round(k)} kcal olamaz (en fazla ~${Math.round(base * 9)}).`);
  if (k != null && (p + c + f) > 0) {
    const calc = p * 4 + c * 4 + f * 9;
    if (Math.abs(calc - k) > Math.max(12, 0.2 * Math.max(k, calc))) {
      const kj = Math.abs(calc * 4.184 - k) <= Math.max(25, 0.15 * k);
      out.push(`Yazan kalori ${Math.round(k)}, makrolardan hesaplanan ${Math.round(calc)}.${kj ? " Kalori yerine kilojoule (kJ) yazılmış olabilir." : ""}`);
    }
  }
  return out;
}
async function fetchOFF(code) {
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = setTimeout(() => { if (ctrl) ctrl.abort(); }, 10000);
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,product_name_tr,brands,nutriments,serving_quantity,product_quantity_unit`, ctrl ? { signal: ctrl.signal } : {});
    if (r.status === 404) return null;
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    return j && j.status === 1 && j.product ? j.product : null;
  } finally { clearTimeout(timer); }
}
function addBarcodeFood() {
  const b = bc.found;
  if (!b || !isFinite(b.p)) return;
  const id = "custom_bc_" + b.code;
  const nm = (b.brand && !b.name.toLocaleLowerCase("tr").includes(b.brand.toLocaleLowerCase("tr")) ? `${b.name} (${b.brand})` : b.name).slice(0, 70);
  state.customFoods[id] = { name: "⭐ " + nm, cat: "⭐ Özel Eklediklerim", unit: b.unit, step: 10, def: b.def, p: b.p / 100, c: b.c / 100, f: b.f / 100, barcode: b.code };
  invalidateFoodDB();
  closeBarcode();
  pickFoodInFoods(id);
  toast(`✓ ${nm} listene eklendi; miktarı seçip öğüne ekle`);
}
// Tutarsız barkod ürünü: etiket formu bulunan değerlerle dolu açılır, kullanıcı paketteki tabloyla düzeltir
function barcodeFixFood() {
  const b = bc.found || {};
  if (!b.code) return;
  closeBarcode();
  openLabelForm(b.code, (b.brand && b.name && !b.name.toLocaleLowerCase("tr").includes(b.brand.toLocaleLowerCase("tr")) ? `${b.name} (${b.brand})` : b.name || "").slice(0, 50));
  $("cfHint").textContent = `Barkod ${b.code}. Bulunan değerler tutarsızdı; paketin besin tablosuyla karşılaştırıp düzelt (100 g değerleri).`;
  if (b.kcal != null) $("cfK").value = fmtNum(b.kcal);
  $("cfP").value = fmtNum(b.p); $("cfC").value = fmtNum(b.c); $("cfF").value = fmtNum(b.f);
}
function barcodeManualFood() {
  const b = bc.found || {};
  closeBarcode();
  if (b.code) {
    openLabelForm(b.code, b.name || "");
    $("cfHint").textContent = `Barkod ${b.code}. Paketin besin tablosundaki değerleri yaz (100 g ya da 1 porsiyon). Ürün bu barkodla kaydedilir; sonraki taramada internetsiz tanırım.`;
    return;
  }
  openCustomFoodModal();
  if (b.name) $("cfName").value = b.name;
}
function pickFoodInFoods(id) {
  state.nutriView = "foods";
  foodUI.cat = "all";
  $("foodSearch").value = "";
  renderAll();
  selectFood(id);
}
document.addEventListener("click", e => { if (e.target && e.target.id === "barcodeModal") closeBarcode(); });

function updateProfile() {
  state.weight = round1(num($("weightSlider").value, state.weight));
  state.deficit = Math.round(num($("deficitSlider").value, state.deficit));
  renderAll();
}
function adjustWeight(d) { state.weight = Math.max(30, round1(state.weight + d)); renderAll(); }

function logCurrentWeight() {
  const now = Date.now();
  const last = state.weightLogs[state.weightLogs.length - 1];
  const entry = { date: fmtDate(now), weight: state.weight, ts: now };
  if (validBf(state.settings.bodyFat)) entry.bf = validBf(state.settings.bodyFat);
  if (last && last.ts && todayStr(new Date(last.ts)) === todayStr()) state.weightLogs[state.weightLogs.length - 1] = entry;
  else state.weightLogs.push(entry);
  toast(`📌 ${fmtNum(state.weight)} kg kaydedildi`);
  renderAll();
}
function deleteWeightLog(idx) {
  if (idx < 0) return;
  snapshot();
  state.weightLogs.splice(idx, 1);
  renderAll();
  offerUndo("🗑️ Tartı kaydı silindi");
}

function addWater(delta) { state.waterLiters = Math.max(0, Math.round(((state.waterLiters || 0) + delta) * 100) / 100); renderAll(); }
function toggleSupp(key) { state.supplements[key] = !state.supplements[key]; renderAll(); }
function toggleMealDone(mIdx) {
  const m = dayMeals()[mIdx];
  if (!m) return;
  m.done = !m.done;
  openDoneMeals.delete(m.id);
  renderAll();
}
function setDayType(type) { state.dayType = type; renderAll(); }
async function renameMeal(mIdx) {
  const m = curMeals()[mIdx];
  if (!m) return;
  const t = await askText("Öğün adı", m.title);
  if (t && t.trim()) { m.title = t.trim(); renderAll(); }
}

// Ekranda görünen miktar (kiloya göre gramaj açıksa ölçeklenmiş hâli) üzerinden çalışır
function changeAmount(mIdx, iIdx, dir) {
  const item = curMeals()[mIdx].items[iIdx];
  const f = getFoodDB()[item.foodId];
  const step = f ? num(f.step, 1) : 1;
  const next = Math.max(0, round1(effAmount(item) + dir * step));
  if (next === 0) { removeItem(mIdx, iIdx); return; }   // v25: 0'a inince silme Geri al ile
  item.amount = rawFromEff(f, next);
  renderAll();
}
function setAmount(mIdx, iIdx, val) {
  const n = num(val, NaN);
  const item = curMeals()[mIdx].items[iIdx];
  if (!item) return;
  // v25: boş / geçersiz giriş besini silmez, eski gram geri gelir; 0 yazınca Geri al ile silinir
  if (!isFinite(n) || n < 0) { renderAll(); return; }
  if (n === 0) { removeItem(mIdx, iIdx); return; }
  item.amount = rawFromEff(getFoodDB()[item.foodId], round1(n));
  renderAll();
}
function removeItem(mIdx, iIdx) {
  snapshot();
  const it = curMeals()[mIdx].items.splice(iIdx, 1)[0];
  const f = it ? getFoodDB()[it.foodId] : null;
  renderAll();
  offerUndo(`🗑️ ${f ? f.name : "Besin"} çıkarıldı`);
}

// amount: ekranda görünen miktar (ölçek açıksa saklanacak miktara çevrilir)
// meals verilmezse Menülerim (curMeals) kullanılır
function quickAdd(mIdx, foodId, amount, meals) {
  const list = meals || curMeals();
  const f = getFoodDB()[foodId];
  if (!f || !list[mIdx]) return;
  const raw = rawFromEff(f, amount);
  const existing = list[mIdx].items.find(i => i.foodId === foodId);
  if (existing) existing.amount = isScalable(f) && scaleK() !== 1 ? existing.amount + raw : round1(existing.amount + raw);
  else list[mIdx].items.push({ foodId, amount: raw });
  state.recentFoods = [foodId, ...state.recentFoods.filter(id => id !== foodId)].slice(0, 8);
  renderAll();
}

function openCustomFoodModal() {
  cfEditId = null;
  cfPendingBarcode = null;
  $("cfTitle").textContent = "➕ Kendi Özel Besinini Tanımla";
  $("cfHint").classList.add("hidden");
  $("cfName").value = ""; $("cfUnit").value = "100g"; $("cfDef").value = "100";
  $("cfK").value = "";
  $("cfP").value = "20"; $("cfC").value = "10"; $("cfF").value = "5";
  cfUnitChanged();
  openModal("customFoodModal");
}
// v14: barkod bulunamayınca doğrudan etiket formu (ürün bu barkodla kaydedilir)
function openLabelForm(code, name) {
  openCustomFoodModal();
  cfPendingBarcode = code || null;
  $("cfTitle").textContent = "Etiketteki değerleri gir";
  $("cfHint").textContent = `Barkod ${code} veritabanında yok. Paketin besin tablosundaki değerleri yaz (100 g ya da 1 porsiyon). Ürün bu barkodla kaydedilir; sonraki taramada internetsiz tanırım.`;
  $("cfHint").classList.remove("hidden");
  $("cfName").value = name || "";
  ["cfK", "cfP", "cfC", "cfF"].forEach(id => { $(id).value = ""; });
}
function cfUnitChanged() {
  const m = $("cfUnit").value;
  $("cfDefLabel").textContent = m === "serv" ? "1 porsiyon kaç gram?" : m === "1adet" ? "Varsayılan miktar (adet):" : "Varsayılan miktar (g):";
}
function openFoodModalFromPicker() { closeModal("pickerModal"); openCustomFoodModal(); }
async function saveCustomFood() {
  const name = $("cfName").value.trim();
  if (!name) { sayAlert("Ad eksik", "Lütfen besin adını gir."); return; }
  const unitMode = $("cfUnit").value;
  const def = num($("cfDef").value, 100) || 100;
  const p = num($("cfP").value), c = num($("cfC").value), f = num($("cfF").value);
  const kRaw = $("cfK").value.trim();
  const k = kRaw === "" ? null : num(kRaw, NaN);
  if ([p, c, f].some(x => x < 0) || (k != null && !(k >= 0))) { sayAlert("Değer hatalı", "Değerler negatif olamaz; kaloriyi rakamla yaz."); return; }
  if (unitMode === "serv" && !(def > 0 && def <= 2000)) { sayAlert("Porsiyon eksik", "Lütfen 1 porsiyonun kaç gram olduğunu yaz (etikette yazar, örn: 30)."); return; }
  // v21: etiket tutarlılık kontrolü (100 g / 1 porsiyon; adet modunda yalnızca kalori sağlaması)
  const lc = labelCheck(k, p, c, f, unitMode === "1adet" ? 0 : unitMode === "serv" ? def : 100);
  if (lc.length && !(await askConfirm("Değerler tutarsız görünüyor", lc.join(" ") + " Etiketle karşılaştır; doğruysa yine de kaydedebilirsin.", "Yine de kaydet"))) return;
  const editing = cfEditId && state.customFoods[cfEditId];
  const prev = editing ? state.customFoods[cfEditId] : null;
  const barcode = prev && prev.barcode ? prev.barcode : cfPendingBarcode;
  const id = editing ? cfEditId : barcode ? "custom_bc_" + barcode : "custom_" + Date.now();
  cfEditId = null;
  cfPendingBarcode = null;
  const gUnit = prev && prev.unit === "ml" ? "ml" : "g";
  const base = unitMode === "1adet" ? 1 : unitMode === "serv" ? def : 100;
  const food = unitMode === "1adet"
    ? { name: "⭐ " + name, cat: "⭐ Özel Eklediklerim", unit: "adet", step: 1, def, p, c, f }
    : { name: "⭐ " + name, cat: "⭐ Özel Eklediklerim", unit: gUnit, step: 10, def, p: p / base, c: c / base, f: f / base };
  if (unitMode === "serv") food.serv = def;
  if (k != null) food.kcal = k / base;
  if (barcode) food.barcode = barcode;
  state.customFoods[id] = food;
  invalidateFoodDB();
  closeModal("customFoodModal");
  toast(editing ? "✓ " + name + " güncellendi" : "⭐ " + name + " besin listene eklendi");
  renderAll();
  if (!editing && state.activeTab === "nutrition" && state.nutriView === "foods") selectFood(id);
}

// ---------------------------------------------------------------------------
// ARAMALI SEÇİCİ
// ---------------------------------------------------------------------------
let picker = null;

function openPicker(title, groups, onPick, extra) {
  picker = { groups, onPick, extra: extra || null, cat: "all", flat: [] };
  $("pickerTitle").textContent = title;
  $("pickerSearch").value = "";
  $("pickerSearch").placeholder = trainCtx() || nutriCtx() ? "Ara..." : "🔍 Ara...";
  $("pickerExtraWrap").classList.toggle("hidden", !extra);
  if (extra) $("pickerExtraBtn").textContent = trainCtx() || nutriCtx() ? String(extra.label).replace(EMOJI_LEAD, "") : extra.label;
  renderPickerChips();
  renderPickerList();
  openModal("pickerModal");
  $("pickerList").scrollTop = 0;
}

function renderPickerChips() {
  const chip = (key, label) => {
    const on = picker.cat === key;
    return `<button onclick="setPickerCat('${key}')" class="shrink-0 text-[11px] px-2.5 py-1 rounded-full border ${on ? "bg-emerald-600 border-emerald-500 text-white font-semibold" : "bg-slate-800 border-slate-700 text-slate-300"}">${esc(label)}</button>`;
  };
  $("pickerChips").innerHTML = chip("all", "Tümü") + picker.groups.map((g, i) => chip(String(i), g.short || g.label)).join("");
}

function setPickerCat(key) { picker.cat = key; renderPickerChips(); renderPickerList(); }

function renderPickerList() {
  if (!picker) return;
  const q = normSearch($("pickerSearch").value).trim();
  const words = q.split(/\s+/).filter(Boolean);
  picker.flat = [];
  let html = "";
  let shown = 0, hidden = 0;
  picker.groups.forEach((g, gi) => {
    if (picker.cat !== "all" && picker.cat !== String(gi)) return;
    const items = g.items.filter(it => {
      if (!words.length) return true;
      const hay = normSearch(it.label + " " + (it.sub || "") + " " + g.label);
      return words.every(w => hay.includes(w));
    });
    if (!items.length) return;
    // v18: çok uzun listede (binlerce besin) ilk 150 sonuç; gerisi için arama daraltılır
    if (shown >= 150) { hidden += items.length; return; }
    html += `<div class="text-[11px] font-bold text-slate-500 tracking-wide pt-2">${esc(g.label)}</div>`;
    items.forEach(it => {
      if (shown >= 150) { hidden++; return; }
      shown++;
      const idx = picker.flat.push(it) - 1;
      const main = `<button onclick="pickerChoose(${idx})" class="flex-1 min-w-0 text-left px-3 py-2.5">
        <div class="text-sm font-medium text-slate-100">${esc(it.label)}</div>
        ${it.sub ? `<div class="text-[11px] text-slate-400 mt-0.5">${esc(it.sub)}</div>` : ""}
      </button>`;
      html += it.customId
        ? `<div class="flex items-center bg-slate-800/80 border border-slate-700 rounded-xl pr-1">${main}
            <button onclick="editCustomFood(${esc(JSON.stringify(it.customId))})" class="w-11 h-11 shrink-0 rounded-lg text-slate-300" aria-label="${esc(it.label)} düzenle">✎</button>
            <button onclick="deleteCustomFood(${esc(JSON.stringify(it.customId))})" class="w-11 h-11 shrink-0 rounded-lg text-rose-300" aria-label="${esc(it.label)} sil">🗑️</button></div>`
        : `<div class="bg-slate-800/80 border border-slate-700 rounded-xl active:bg-slate-700 flex">${main}</div>`;
    });
  });
  if (hidden) html += `<div class="text-[12px] text-slate-500 text-center py-3">${hidden} sonuç daha var; aramayı daralt.</div>`;
  $("pickerList").innerHTML = html || `<div class="text-sm text-slate-500 text-center py-8">Sonuç bulunamadı.</div>`;
}

function pickerChoose(idx) {
  const it = picker && picker.flat[idx];
  if (!it) return;
  const cb = picker.onPick;
  closeModal("pickerModal");
  cb(it);
}
function pickerExtra() {
  const ex = picker && picker.extra;
  closeModal("pickerModal");
  if (ex) ex.onClick();
}

function openFoodPicker(mIdx) {
  const db = getFoodDB();
  const sub = f => {
    const p = f.p * f.def, c = f.c * f.def, fat = f.f * f.def;
    return `${fmtNum(f.def)} ${f.unit} • ${Math.round(kcalPerUnit(f) * f.def)} kcal • ${Math.round(p)}P ${Math.round(c)}K ${Math.round(fat)}Y`;
  };
  const cats = {};
  Object.keys(db).forEach(id => {
    const f = db[id];
    if (isHiddenFood(f)) return;
    const cat = f.cat || "Diğer";
    (cats[cat] = cats[cat] || []).push({ id, label: f.name, sub: sub(f), customId: id.startsWith("custom_") ? id : null });
  });
  const groups = [];
  const recent = state.recentFoods.filter(id => db[id]).map(id => ({ id, label: db[id].name, sub: sub(db[id]) }));
  if (recent.length) groups.push({ label: "🕘 Son Kullanılanlar", short: "🕘 Son", items: recent });
  Object.keys(cats).forEach(c => groups.push({ label: c, short: c.replace(/\s*[&/].*$/, ""), items: cats[c] }));
  openPicker(`🍽️ ${curMeals()[mIdx].title}`, groups, it => {
    const f = getFoodDB()[it.id];
    quickAdd(mIdx, it.id, f.def);
    toast(`✓ ${f.name} (${fmtNum(f.def)} ${f.unit}) eklendi`);
  }, { label: "➕ Listede yok mu? Özel besin tanımla", onClick: openCustomFoodModal });
}

function openExercisePicker() {
  const groups = Object.keys(EXERCISE_LIBRARY).map(g => ({
    label: g,
    short: g.replace(/^\d+\.\s*/, "").replace(/\s*\(.*$/, ""),
    items: EXERCISE_LIBRARY[g].map(n => n.trim()).map(n => ({ id: n, label: n, sub: detectKind(n) !== "weight" ? KIND_LABEL[detectKind(n)] : "" }))
  }));
  openPicker("Hareket Kütüphanesi", groups, it => openExerciseModal({ name: it.id, kind: detectKind(it.id) }),
    { label: "Listede yok mu? Özel hareket yaz", onClick: () => openExerciseModal({ name: "", kind: "weight" }) });
}

function openMobilityPicker() {
  const groups = Object.keys(MOBILITY_LIBRARY).map(cat => ({
    label: cat,
    short: cat.replace(/\s*\(.*$/, "").replace(/ & .*$/, ""),
    items: MOBILITY_LIBRARY[cat].map((m, i) => ({ id: cat + "__" + i, label: m.name, sub: m.prescription + (m.note ? " • " + m.note : ""), data: m }))
  }));
  const targetType = $("mobilityTargetType").value;
  openPicker(targetType === "dynamic" ? "🔥 Dinamik Mobiliteye Ekle" : "🧘 Statik Stretching'e Ekle", groups, it => {
    const m = it.data;
    state.mobilityRoutine[targetType].push({
      name: m.name, prescription: m.prescription, timerSec: /45/.test(m.prescription) ? 45 : /60/.test(m.prescription) ? 60 : 30,
      note: m.note || "", done: false
    });
    toast("✓ " + m.name + " eklendi");
    renderAll();
  }, { label: "✍️ Listede yok mu? Elle ekle", onClick: addCustomMobilityPrompt });
}

// ---------------------------------------------------------------------------
// HAREKET EKLE / DÜZENLE MODALI
// ---------------------------------------------------------------------------
let exModal = { mode: "add", idx: -1, kind: "weight", orig: null };

function setExModalKind(kind) {
  exModal.kind = kind;
  ["weight", "cardio", "time"].forEach(k => {
    const on = k === kind;
    $("exKind_" + k).classList.toggle("on", on);
    $("exKind_" + k).setAttribute("aria-pressed", on ? "true" : "false");
    $("exSec_" + k).classList.toggle("hidden", !on);
    $("exSec_" + k).classList.toggle("grid", on);
  });
  $("exRestWrap").classList.toggle("hidden", kind === "cardio");
  $("exExtraWrap").classList.toggle("hidden", kind === "cardio");
  $("exIncWrap").classList.toggle("hidden", kind !== "weight");
  updateExMuscleAuto();
  updateExEquipUI();
  $("exEditHint").classList.toggle("hidden", !(exModal.mode === "edit" && exModal.orig && kind !== exModal.orig.kind));
}

function fillExModalFields(v) {
  $("exName").value = v.name || "";
  $("exSetCount").value = v.count ?? 3;
  $("exRepRange").value = v.target ?? "8–12";
  $("exStartKg").value = fmtKg(v.kg ?? 0);
  $("exTimeSetCount").value = v.tcount ?? 3;
  $("exTimeSec").value = v.sec ?? 45;
  $("exCardioMin").value = v.min ?? 30;
  $("exCardioKm").value = v.km ?? "";
  $("exCardioLvl").value = v.lvl ?? "";
  $("exRest").value = v.rest ?? state.settings.restSec;
  $("exMuscle").value = v.muscle && MUSCLES.includes(v.muscle) ? v.muscle : "auto";
  $("exInc").value = v.inc ? fmtKg(v.inc) : "";
  updateExMuscleAuto();
  fillExLevels(v);
}

function updateExMuscleAuto() {
  const name = $("exName").value;
  const g = autoMuscle(name);
  $("exMuscle").options[0].textContent = "Otomatik" + (g ? ` (${g})` : " (belirlenemedi)");
  $("exInc").placeholder = fmtNum(autoInc(name)) + " (otomatik)";
}

function openExerciseModal(opts) {
  exModal = { mode: "add", idx: -1, kind: opts.kind || "weight", orig: null };
  $("exModalTitle").textContent = "Hareket Ekle";
  fillExModalFields({ name: opts.name || "" });
  setExModalKind(exModal.kind);
  openModal("exerciseModal");
}

function openEditExercise(exIdx) {
  const ex = activeDay().exercises[exIdx];
  const s0 = ex.sets[0] || {};
  const vals = {
    name: ex.name, count: ex.kind === "weight" ? ex.sets.length : 3, target: ex.kind === "weight" ? (s0.target || "8–12") : "8–12",
    kg: ex.kind === "weight" ? num(s0.kg) : 0, tcount: ex.kind === "time" ? ex.sets.length : 3, sec: ex.kind === "time" ? num(s0.sec, 45) : 45,
    min: ex.kind === "cardio" ? num(s0.min, 30) : 30, km: ex.kind === "cardio" ? (s0.km ?? "") : "", lvl: ex.kind === "cardio" ? (s0.lvl ?? "") : "",
    rest: ex.rest ?? state.settings.restSec,
    muscle: ex.muscle || "", inc: num(ex.inc, 0) > 0 ? num(ex.inc) : "",
    equip: ex.equip || "", levels: ex.levels ? clone(ex.levels) : null
  };
  exModal = { mode: "edit", idx: exIdx, kind: ex.kind, orig: { ...vals, kind: ex.kind } };
  $("exModalTitle").textContent = "Hareketi Düzenle";
  fillExModalFields(vals);
  setExModalKind(ex.kind);
  openModal("exerciseModal");
}

function readExModal() {
  return {
    name: $("exName").value.trim(),
    count: Math.max(1, Math.min(12, Math.round(num($("exSetCount").value, 3)))),
    target: $("exRepRange").value.trim().replace(/-/g, "–") || "8–12",
    kg: Math.max(0, round2(num($("exStartKg").value, 0))),
    tcount: Math.max(1, Math.min(12, Math.round(num($("exTimeSetCount").value, 3)))),
    sec: Math.max(5, Math.round(num($("exTimeSec").value, 45))),
    min: Math.max(0, round1(num($("exCardioMin").value, 30))),
    km: $("exCardioKm").value.trim() === "" ? "" : Math.max(0, Math.round(num($("exCardioKm").value, 0) * 100) / 100),
    lvl: $("exCardioLvl").value.trim(),
    rest: Math.max(0, Math.min(900, Math.round(num($("exRest").value, state.settings.restSec)))),
    muscle: MUSCLES.includes($("exMuscle").value) ? $("exMuscle").value : "",
    inc: $("exInc").value.trim() === "" ? 0 : Math.max(0, Math.min(50, round2(num($("exInc").value, 0)))),
    ...readExLevels()
  };
}

function applyExExtras(ex, v) {
  if (ex.kind !== "cardio" && v.muscle) ex.muscle = v.muscle; else delete ex.muscle;
  if (ex.kind === "weight" && v.inc > 0) ex.inc = v.inc; else delete ex.inc;
  if (ex.kind === "weight" && v.equip) ex.equip = v.equip; else delete ex.equip;
  const eq = ex.kind === "weight" ? (v.equip || autoEquip(ex.name)) : null;
  if ((eq === "stack" || eq === "dumbbell") && v.levels) { ex.levels = v.levels; delete ex.levelsAskDismiss; } else delete ex.levels;
}

function targetInfoFor(kind, v, ex) {
  if (kind === "weight") return `${ex ? ex.sets.length : v.count}x${v.target}`;
  if (kind === "time") return `${ex ? ex.sets.length : v.tcount}x${v.sec} sn`;
  return `${fmtNum(v.min)} dk` + (v.km !== "" && v.km > 0 ? ` • ${fmtNum(v.km)} km` : "");
}

function buildSets(kind, v) {
  if (kind === "weight") return makeWeightSets(v.count, v.target, v.kg, Math.max(1, parseInt(v.target, 10) || 10));
  if (kind === "time") return makeTimeSets(v.tcount, v.sec);
  return [makeCardioRow(v.min, v.km, v.lvl)];
}

function resize(arr, n, makeNew) {
  while (arr.length > n) arr.pop();
  while (arr.length < n) arr.push(makeNew(arr[arr.length - 1]));
}

function saveExerciseModal() {
  const v = readExModal();
  if (!v.name) { uiAlert("Hareket adı eksik", "Lütfen hareket adını yaz."); return; }
  const kind = exModal.kind;

  if (exModal.mode === "add") {
    const ex = { name: v.name, kind, targetInfo: "", note: "", sets: buildSets(kind, v) };
    if (kind !== "cardio") ex.rest = v.rest;
    applyExExtras(ex, v);
    ex.targetInfo = targetInfoFor(kind, v, null);
    activeDay().exercises.push(ex);
    closeModal("exerciseModal");
    toast("✓ " + v.name + " eklendi");
    renderAll();
    if (state.gymActive) setTimeout(() => { const el = $("exCard_" + (activeDay().exercises.length - 1)); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 60);
    return;
  }

  const ex = activeDay().exercises[exModal.idx];
  const o = exModal.orig;
  ex.name = v.name;
  if (kind !== o.kind) {
    ex.kind = kind;
    ex.sets = buildSets(kind, v);
  } else if (kind === "weight") {
    resize(ex.sets, v.count, last => ({ kg: last ? last.kg : v.kg, reps: last ? last.reps : 10, target: v.target, done: false }));
    ex.sets.forEach(s => { s.target = v.target; if (v.kg !== o.kg) s.kg = v.kg; });
  } else if (kind === "time") {
    resize(ex.sets, v.tcount, last => ({ sec: last ? last.sec : v.sec, target: v.sec + " sn", done: false }));
    if (v.sec !== o.sec) ex.sets.forEach(s => { s.sec = v.sec; s.target = v.sec + " sn"; });
  } else {
    const r = ex.sets[0];
    if (v.min !== o.min) r.min = v.min;
    if (String(v.km) !== String(o.km)) r.km = v.km;
    if (v.lvl !== o.lvl) r.lvl = v.lvl;
  }
  if (kind !== "cardio") ex.rest = v.rest; else delete ex.rest;
  applyExExtras(ex, v);
  ex.targetInfo = targetInfoFor(kind, v, kind === "cardio" ? null : ex);
  closeModal("exerciseModal");
  toast("✓ Hareket güncellendi");
  renderAll();
}

// ---------------------------------------------------------------------------
// ANTRENMAN GEÇMİŞİ / REKOR HESAPLARI
// ---------------------------------------------------------------------------
function e1rm(kg, reps) {
  kg = num(kg); reps = num(reps);
  if (kg <= 0 || reps <= 0) return 0;
  return reps === 1 ? kg : kg * (1 + reps / 30);
}
function historyFor(name) { return state.exerciseHistory[exKey(name)] || []; }
function bestHistE1RM(name) {
  let best = 0;
  historyFor(name).forEach(s => (s.sets || []).forEach(x => { const v = e1rm(x.kg, x.reps); if (v > best) best = v; }));
  return best;
}
function cardioTotals(sets, onlyDone) {
  let min = 0, km = 0;
  sets.forEach(r => { if (onlyDone && !r.done) return; min += num(r.min); km += num(r.km); });
  return { min, km };
}
function paceText(min, km) {
  if (!(min > 0 && km > 0)) return "";
  const speed = km / (min / 60);
  const pace = min / km;
  const pm = Math.floor(pace), ps = Math.round((pace - pm) * 60);
  return `${fmtNum(speed)} km/s • ${pm}:${String(ps === 60 ? 59 : ps).padStart(2, "0")} /km`;
}
function sessionSummary(sess) {
  const sets = sess.sets || [];
  if (sess.kind === "cardio") {
    const t = cardioTotals(sets, false);
    return `${fmtNum(t.min)} dk` + (t.km > 0 ? ` • ${fmtNum(t.km)} km` : "");
  }
  if (sess.kind === "time") return sets.map(s => `${num(s.sec)} sn`).join(" · ");
  return sets.map(s => `${fmtKg(num(s.kg))}×${num(s.reps)}`).join(" · ");
}

// ---------------------------------------------------------------------------
// ANTRENMAN RENDER
// ---------------------------------------------------------------------------
function exRightHtml(ex) {
  if (ex.kind === "cardio") {
    const t = cardioTotals(ex.sets, false);
    const pace = paceText(t.min, t.km);
    return `<div class="text-xs font-semibold text-sky-300">${fmtNum(t.min)} dk${t.km > 0 ? " • " + fmtNum(t.km) + " km" : ""}</div>${pace ? `<div class="text-[11px] text-slate-400">${pace}</div>` : ""}`;
  }
  if (ex.kind === "time") {
    const total = ex.sets.reduce((a, s) => a + num(s.sec), 0);
    return `<div class="text-xs font-semibold text-sky-300">Toplam: ${total} sn</div>${ex.rest ? `<div class="text-[11px] text-slate-400">Dinlenme: ${ex.rest} sn</div>` : ""}`;
  }
  let vol = 0, best = 0;
  ex.sets.forEach(s => { vol += num(s.kg) * num(s.reps); best = Math.max(best, e1rm(s.kg, s.reps)); });
  return `<div class="text-xs font-semibold text-amber-400">1RM: ~${Math.round(best)} kg</div><div class="text-[11px] text-slate-400">Tonaj: ${Math.round(vol)} kg</div>`;
}

function updateGymHeader() {
  let doneSets = 0, totalSets = 0, vol = 0, cMin = 0, cKm = 0, hasCardio = false;
  activeDay().exercises.forEach(ex => ex.sets.forEach(s => {
    totalSets++;
    if (ex.kind === "cardio") hasCardio = true;
    if (!s.done) return;
    doneSets++;
    if (ex.kind === "weight") vol += num(s.kg) * num(s.reps);
    if (ex.kind === "cardio") { cMin += num(s.min); cKm += num(s.km); }
  }));
  $("gymDoneSets").textContent = doneSets;
  $("gymTotalSets").textContent = totalSets;
  $("gymTotalVolume").textContent = Math.round(vol).toLocaleString("tr-TR");
  const cs = $("gymCardioSummary");
  cs.classList.toggle("hidden", !hasCardio);
  cs.textContent = hasCardio ? `🏃 ${fmtNum(cMin)} dk${cKm > 0 ? " • " + fmtNum(cKm) + " km" : ""}` : "";
  updateActiveProgress();
}

function selectWorkoutDay(idx) { state.activeWorkoutDayIdx = idx; renderAll(); }

function updateSetData(exIdx, sIdx, field, val) {
  const s = activeDay().exercises[exIdx].sets[sIdx];
  if (field === "lvl") s.lvl = String(val).trim();
  else if (field === "km") s.km = String(val).trim() === "" ? "" : Math.max(0, Math.round(num(val) * 100) / 100);
  else if (field === "reps" || field === "sec") s[field] = Math.max(0, Math.round(num(val)));
  else if (field === "kg") s.kg = Math.max(0, round2(num(val)));
  else s[field] = Math.max(0, round1(num(val)));
  const ex = activeDay().exercises[exIdx];
  const rEl = $("exRight_" + exIdx);
  if (rEl) rEl.textContent = exRightText(ex);
  updateGymHeader();
  saveState();
}

function toggleSetDone(exIdx, sIdx) {
  const ex = activeDay().exercises[exIdx];
  const s = ex.sets[sIdx];
  s.done = !s.done;
  s.pr = false;
  if (!s.done) delete s.e;
  if (s.done && !state.workoutStartedAt) state.workoutStartedAt = Date.now();
  if (!s.done && !workoutInProgress()) state.workoutStartedAt = 0;
  if (s.done) {
    if (ex.kind === "weight") {
      const cur = e1rm(s.kg, s.reps);
      const hasHist = historyFor(ex.name).length > 0;
      if (hasHist && cur > 0) {
        let best = bestHistE1RM(ex.name);
        ex.sets.forEach((o, i) => { if (i !== sIdx && o.done) best = Math.max(best, e1rm(o.kg, o.reps)); });
        if (cur > best + 0.01) {
          s.pr = true;
          toast(`🏆 YENİ REKOR! ${ex.name}: ${fmtKg(num(s.kg))} kg × ${num(s.reps)} (1RM ~${Math.round(cur)} kg)`, "pr");
        }
      }
    }
    if (ex.kind !== "cardio") {
      const hasNext = ex.sets.some(o => !o.done) || activeDay().exercises.some((o, i) => i > exIdx && o.sets.some(x => !x.done));
      if (hasNext) startTimer(ex.rest ?? state.settings.restSec, "Dinlenme • " + ex.name);
    }
  }
  renderAll();
  if (s.done && ex.sets.every(x => x.done)) {
    const day = activeDay();
    const j = day.exercises.findIndex((o, i) => i > exIdx && o.sets.some(x => !x.done));
    if (j >= 0) scrollToExercise(j);
  }
}

function updateExerciseNote(exIdx, val) { activeDay().exercises[exIdx].note = val; saveState(); }

function addSetToExercise(exIdx) {
  const ex = activeDay().exercises[exIdx];
  const last = ex.sets[ex.sets.length - 1];
  if (ex.kind === "cardio") ex.sets.push(makeCardioRow(last ? last.min : 10, "", last ? last.lvl : ""));
  else if (ex.kind === "time") ex.sets.push({ sec: last ? last.sec : 45, target: (last ? last.sec : 45) + " sn", done: false });
  else ex.sets.push({ kg: last ? last.kg : 0, reps: last ? last.reps : 10, target: last ? last.target : "8–12", done: false });
  if (ex.kind !== "cardio") ex.targetInfo = ex.targetInfo.replace(/^\d+x/, ex.sets.length + "x");
  renderAll();
}

function removeLastSetFromExercise(exIdx) {
  const ex = activeDay().exercises[exIdx];
  if (ex.sets.length <= 1) return;
  ex.sets.pop();
  if (ex.kind !== "cardio") ex.targetInfo = ex.targetInfo.replace(/^\d+x/, ex.sets.length + "x");
  renderAll();
}

function moveExercise(exIdx, dir) {
  const arr = activeDay().exercises;
  const j = exIdx + dir;
  if (j < 0 || j >= arr.length) return;
  [arr[exIdx], arr[j]] = [arr[j], arr[exIdx]];
  renderAll();
}

function removeExercise(exIdx) {
  const ex = activeDay().exercises[exIdx];
  snapshot();
  activeDay().exercises.splice(exIdx, 1);
  if (!workoutInProgress()) state.workoutStartedAt = 0;
  renderAll();
  offerUndo(`🗑️ "${ex.name}" kaldırıldı`);
}

async function addWorkoutDay() {
  const name = await uiAsk({ title: "Yeni antrenman günü", message: "Günün adını yaz.", input: { value: `${state.workoutDays.length + 1}. GÜN: `, placeholder: "Örn: 5. GÜN: Kol" }, ok: "Ekle" });
  if (!name || !name.trim()) return;
  state.workoutDays.push({ id: "day_" + Date.now(), name: name.trim(), exercises: [] });
  state.activeWorkoutDayIdx = state.workoutDays.length - 1;
  renderAll();
}
async function renameWorkoutDay() {
  const d = activeDay();
  const n = await uiAsk({ title: "Günü adlandır", message: "Günün yeni adını yaz.", input: { value: d.name }, ok: "Kaydet" });
  if (n && n.trim()) { d.name = n.trim(); renderAll(); }
}
async function deleteWorkoutDay() {
  if (state.workoutDays.length <= 1) { uiAlert("Gün silinemiyor", "En az bir antrenman günü kalmalı."); return; }
  const d = activeDay();
  if (!(await uiAsk({ title: "Gün silinsin mi?", message: `"${d.name}" ve içindeki tüm hareketler silinecek. 6 saniye içinde geri alabilirsin.`, ok: "Sil", danger: true }))) return;
  if (activeDay() !== d) return;
  snapshot();
  state.workoutDays.splice(state.activeWorkoutDayIdx, 1);
  state.activeWorkoutDayIdx = Math.max(0, state.activeWorkoutDayIdx - 1);
  renderAll();
  offerUndo(`🗑️ "${d.name}" silindi`);
}
function uncheckAllSets() {
  activeDay().exercises.forEach(ex => ex.sets.forEach(s => { s.done = false; s.pr = false; }));
  if (!workoutInProgress()) state.workoutStartedAt = 0;
  renderAll();
}

async function finishAndLogWorkout() {
  const day = activeDay();
  let doneSets = 0, vol = 0, cMin = 0, cKm = 0, prs = 0;
  day.exercises.forEach(ex => ex.sets.forEach(s => {
    if (!s.done) return;
    doneSets++;
    if (ex.kind === "weight") { vol += num(s.kg) * num(s.reps); if (s.pr) prs++; }
    if (ex.kind === "cardio") { cMin += num(s.min); cKm += num(s.km); }
  }));
  if (doneSets === 0) { uiAlert("Henüz tamamlanan set yok", "Kaydetmek için en az 1 setin yanındaki onay kutusunu işaretlemelisin."); return; }
  if (!(await uiAsk({ title: "Antrenman kaydedilsin mi?", message: `${day.name} · ${doneSets} set tamamlandı`, ok: "Kaydet" }))) return;
  if (activeDay() !== day) return;

  const ts = Date.now();
  const logId = "w" + ts;
  day.exercises.forEach(ex => {
    const done = ex.sets.filter(s => s.done);
    if (!done.length) return;
    const key = exKey(ex.name);
    const arr = state.exerciseHistory[key] || (state.exerciseHistory[key] = []);
    const sets = done.map(s => ex.kind === "cardio" ? { min: num(s.min), km: num(s.km), lvl: s.lvl || "" }
      : ex.kind === "time" ? { sec: num(s.sec) } : (EFFORT_LABELS[s.e] ? { kg: num(s.kg), reps: num(s.reps), e: s.e } : { kg: num(s.kg), reps: num(s.reps) }));
    const sess = { ts, logId, kind: ex.kind, name: ex.name, sets };
    const mg = muscleOf(ex);
    if (mg) sess.muscle = mg;
    arr.push(sess);
    if (arr.length > 60) arr.splice(0, arr.length - 60);
  });

  const startedAt = num(state.workoutStartedAt, 0);
  const durMin = startedAt ? Math.round((ts - startedAt) / 60000) : 0;
  state.workoutLogs.push({
    id: logId, ts, date: fmtDate(ts, true), dayId: day.id, dayName: day.name, sets: doneSets,
    durationMin: durMin >= 1 && durMin <= MAX_WORKOUT_MIN ? durMin : 0,
    volume: Math.round(vol), cardioMin: round1(cMin), cardioKm: Math.round(cKm * 100) / 100, prs,
    summary: `${day.exercises.length} Hareket`
  });
  if (state.workoutLogs.length > 400) state.workoutLogs.splice(0, state.workoutLogs.length - 400);

  day.exercises.forEach(ex => ex.sets.forEach(s => { s.done = false; s.pr = false; delete s.e; }));
  if (!workoutInProgress()) state.workoutStartedAt = 0;
  state.gymActive = false;
  stopTimer();
  window.scrollTo(0, 0);
  renderAll();
  const li = state.workoutLogs.length - 1;
  const dTxt = state.workoutLogs[li].durationMin ? `${fmtMinutes(state.workoutLogs[li].durationMin)}, ` : "";
  toast(`🎉 Tebrikler! ${dTxt}${Math.round(vol).toLocaleString("tr-TR")} kg tonaj${cMin > 0 ? `, ${fmtNum(cMin)} dk kardiyo` : ""}${prs ? `, ${prs} rekor` : ""} kaydedildi`, prs ? "pr" : "ok", { label: "📤 Paylaş", fn: () => openShareCard(li) });
}

function deleteWorkoutLog(idx) {
  const l = state.workoutLogs[idx];
  if (!l) return;
  snapshot();
  if (l.id) {
    Object.keys(state.exerciseHistory).forEach(k => {
      state.exerciseHistory[k] = state.exerciseHistory[k].filter(s => s.logId !== l.id);
      if (!state.exerciseHistory[k].length) delete state.exerciseHistory[k];
    });
  }
  state.workoutLogs.splice(idx, 1);
  renderAll();
  offerUndo("🗑️ Antrenman kaydı silindi");
}

// ---------------------------------------------------------------------------
// MOBİLİTE
// ---------------------------------------------------------------------------
function renderMobility() {
  const r = state.mobilityRoutine;
  const item = (type, it, idx, accent) => {
    const sec = num(it.timerSec, 30) || 30;
    return `
      <div class="p-3 rounded-xl border ${it.done ? "set-done" : "bg-slate-900/90 border-slate-800"}">
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-start gap-2.5 flex-1 min-w-0">
            <button onclick="toggleMobilityDone('${type}', ${idx})" class="mt-0.5 w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${it.done ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-400 border border-slate-700"}">✓</button>
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <span class="font-bold text-sm ${it.done ? "line-through text-emerald-300" : "text-white"}">${idx + 1}. ${esc(it.name)}</span>
                ${type === "static" ? `<button onclick="startTimer(${sec}, ${esc(JSON.stringify(it.name.slice(0, 40)))})" class="text-[11px] bg-sky-900/70 text-sky-200 border border-sky-700/50 px-2 py-0.5 rounded-md font-semibold shrink-0">⏱️ ${sec} sn</button>` : ""}
              </div>
              <div class="flex flex-wrap items-center gap-2 mt-1">
                <input type="text" data-fk="mp-${type}-${idx}" value="${esc(it.prescription)}" onchange="updateMobilityField('${type}', ${idx}, 'prescription', this.value)"
                  class="text-xs font-semibold ${accent} rounded px-2 py-0.5 w-full sm:w-56" />
                <input type="text" data-fk="mn-${type}-${idx}" value="${esc(it.note || "")}" placeholder="Not ekle..." onchange="updateMobilityField('${type}', ${idx}, 'note', this.value)"
                  class="text-xs text-slate-400 border-0 border-b border-slate-700 focus:outline-none flex-1 min-w-[120px]" style="background:transparent;border-left:0;border-right:0;border-top:0;" />
              </div>
            </div>
          </div>
          <button onclick="removeMobilityItem('${type}', ${idx})" class="text-rose-400 text-lg leading-none px-1 font-bold">&times;</button>
        </div>
      </div>`;
  };
  $("dynamicMobilityList").innerHTML = r.dynamic.map((it, i) => item("dynamic", it, i, "text-emerald-400")).join("") || `<div class="text-xs text-slate-500 italic">Liste boş.</div>`;
  $("staticMobilityList").innerHTML = r.static.map((it, i) => item("static", it, i, "text-sky-400")).join("") || `<div class="text-xs text-slate-500 italic">Liste boş.</div>`;
  $("mobDynamicDone").textContent = r.dynamic.filter(i => i.done).length;
  $("mobDynamicTotal").textContent = r.dynamic.length;
  $("mobStaticDone").textContent = r.static.filter(i => i.done).length;
  $("mobStaticTotal").textContent = r.static.length;
}

function toggleMobilityDone(type, idx) { const it = state.mobilityRoutine[type][idx]; it.done = !it.done; renderAll(); }
function updateMobilityField(type, idx, field, val) {
  const it = state.mobilityRoutine[type][idx];
  it[field] = val;
  if (field === "prescription") {
    const m = String(val).match(/(\d+)\s*(sn|saniye|sec|s\b)/i);
    if (m) it.timerSec = Math.max(5, parseInt(m[1]));
  }
  renderAll();
}
function removeMobilityItem(type, idx) {
  snapshot();
  const it = state.mobilityRoutine[type].splice(idx, 1)[0];
  renderAll();
  offerUndo(`🗑️ ${it ? it.name : "Hareket"} kaldırıldı`);
}
function resetMobilityChecks() {
  state.mobilityRoutine.dynamic.forEach(i => { i.done = false; });
  state.mobilityRoutine.static.forEach(i => { i.done = false; });
  renderAll();
}
function addCustomMobilityPrompt() {
  const type = $("mobilityTargetType").value;
  const name = prompt("Eklemek istediğin mobilite veya esneme hareketinin adını yaz:");
  if (!name || !name.trim()) return;
  const def = type === "dynamic" ? "1 Set x 8–10 Tekrar" : "2 Set x 30 sn";
  const prescription = prompt("Uygulama (set / tekrar / saniye):", def) || def;
  const m = prescription.match(/(\d+)\s*(sn|saniye|sec)/i);
  state.mobilityRoutine[type].push({ name: name.trim(), prescription, timerSec: m ? Math.max(5, parseInt(m[1])) : 30, note: "", done: false });
  renderAll();
}

// ---------------------------------------------------------------------------
// GRAFİK (SVG)
// ---------------------------------------------------------------------------
function lineChart(points, color, unit) {
  if (points.length < 2) {
    return `<div class="text-xs text-slate-500 text-center py-8 bg-slate-900/60 rounded-xl border border-slate-800">Grafik için en az 2 kayıt gerekli.${points.length === 1 ? ` (Şu an: ${fmtNum(points[0].y)} ${unit})` : ""}</div>`;
  }
  const W = 340, H = 150, pl = 34, pr = 10, pt = 14, pb = 24;
  const ys = points.map(p => p.y);
  let min = Math.min(...ys), max = Math.max(...ys);
  if (max - min < 1e-9) { min -= 1; max += 1; }
  const pad = (max - min) * 0.12;
  min -= pad; max += pad;
  const x = i => pl + (i * (W - pl - pr)) / (points.length - 1);
  const y = v => pt + (H - pt - pb) * (1 - (v - min) / (max - min));
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join(" ");
  const area = `${path} L${x(points.length - 1).toFixed(1)},${H - pb} L${pl},${H - pb} Z`;
  const grid = [0, 0.5, 1].map(f => {
    const v = min + (max - min) * (1 - f);
    const yy = pt + (H - pt - pb) * f;
    return `<line x1="${pl}" x2="${W - pr}" y1="${yy}" y2="${yy}" stroke="#334155" stroke-dasharray="3 3"/><text x="${pl - 4}" y="${yy + 3}" text-anchor="end" font-size="9" fill="#94a3b8">${(max - min) < 8 ? fmtNum(v) : Math.round(v)}</text>`;
  }).join("");
  const showIdx = new Set([0, points.length - 1, Math.floor((points.length - 1) / 2)]);
  const labels = points.map((p, i) => showIdx.has(i) ? `<text x="${x(i)}" y="${H - 6}" text-anchor="${i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}" font-size="9" fill="#94a3b8">${esc(p.label)}</text>` : "").join("");
  const dots = points.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.y).toFixed(1)}" r="${points.length > 30 ? 1.5 : 3}" fill="${color}"/>`).join("");
  const lastP = points[points.length - 1];
  return `<svg viewBox="0 0 ${W} ${H}" class="w-full h-auto" role="img">
    ${grid}
    <path d="${area}" fill="${color}" opacity="0.12"/>
    <path d="${path}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
    ${dots}${labels}
    <text x="${Math.min(x(points.length - 1), W - pr)}" y="${Math.max(10, y(lastP.y) - 7)}" text-anchor="end" font-size="10" font-weight="700" fill="${color}">${fmtNum(lastP.y)} ${esc(unit)}</text>
  </svg>`;
}

function exerciseSeries(name) {
  const hist = historyFor(name);
  if (!hist.length) return { points: [], unit: "", color: "#10b981", metric: "" };
  const kind = hist[hist.length - 1].kind;
  const sameKind = hist.filter(h => h.kind === kind);
  if (kind === "cardio") {
    const useKm = sameKind.some(h => cardioTotals(h.sets, false).km > 0);
    return {
      points: sameKind.map(h => { const t = cardioTotals(h.sets, false); return { label: fmtDate(h.ts), y: useKm ? t.km : t.min }; }),
      unit: useKm ? "km" : "dk", color: "#38bdf8", metric: useKm ? "Toplam mesafe" : "Toplam süre"
    };
  }
  if (kind === "time") {
    return { points: sameKind.map(h => ({ label: fmtDate(h.ts), y: Math.max(...h.sets.map(s => num(s.sec))) })), unit: "sn", color: "#38bdf8", metric: "En uzun set" };
  }
  return { points: sameKind.map(h => ({ label: fmtDate(h.ts), y: round1(Math.max(...h.sets.map(s => e1rm(s.kg, s.reps)))) })), unit: "kg", color: "#f59e0b", metric: "Tahmini 1RM" };
}

function exerciseChartHtml(name, accent) {
  const ser = exerciseSeries(name);
  if (accent) ser.color = accent;
  const hist = historyFor(name);
  if (!hist.length) return `<div class="text-xs text-slate-500 text-center py-8">Bu hareket için henüz kayıt yok. Antrenmanı bitirip kaydettikçe grafik oluşur.</div>`;
  const rows = hist.slice().reverse().slice(0, 8).map(h => `
    <div class="flex justify-between gap-2 text-xs bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-1.5">
      <span class="text-slate-400 shrink-0">${fmtDate(h.ts)}</span><span class="text-slate-200 text-right truncate">${esc(sessionSummary(h))}</span>
    </div>`).join("");
  return `<div class="text-[11px] text-slate-400 mb-1">${ser.metric}</div>${lineChart(ser.points.slice(-30), ser.color, ser.unit)}
    <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wide mt-3 mb-1.5">Son kayıtlar</div><div class="space-y-1">${rows}</div>`;
}

function openExerciseChart(exIdx) {
  const ex = activeDay().exercises[exIdx];
  $("chartTitle").textContent = ex.name;
  $("chartBody").innerHTML = exerciseChartHtml(ex.name, "#1FD1C1");
  openModal("chartModal");
}
function openChartByKey(key) {
  const h = state.exerciseHistory[key];
  if (!h || !h.length) return;
  const name = h[h.length - 1].name || key;
  $("chartTitle").textContent = "📈 " + name;
  $("chartBody").innerHTML = exerciseChartHtml(name);
  openModal("chartModal");
}

// ---------------------------------------------------------------------------
// İLERLEME SEKMESİ
// ---------------------------------------------------------------------------
function renderProgress() {
  const ws = weekStart();
  const weekLogs = state.workoutLogs.filter(l => l.ts && l.ts >= ws);
  const wVol = weekLogs.reduce((a, l) => a + num(l.volume), 0);
  const wMin = weekLogs.reduce((a, l) => a + num(l.cardioMin), 0);
  const wKm = weekLogs.reduce((a, l) => a + num(l.cardioKm), 0);
  const wPr = weekLogs.reduce((a, l) => a + num(l.prs), 0);
  const waterDays = Object.keys(state.dailyLogs).filter(k => new Date(k + "T00:00:00").getTime() >= ws).map(k => num(state.dailyLogs[k].water));
  waterDays.push(state.waterLiters || 0);
  const avgWater = waterDays.reduce((a, b) => a + b, 0) / waterDays.length;

  const stat = (label, value, cls, sub = "") => `
    <div class="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 min-w-0">
      <div class="text-[11px] text-slate-400 truncate">${label}</div>
      <div class="text-lg font-bold ${cls} truncate">${value}</div>
      ${sub ? `<div class="text-[10px] text-slate-500 truncate">${sub}</div>` : ""}
    </div>`;

  // Kilo
  const wl = state.weightLogs.filter(l => num(l.weight) > 0);
  const wPoints = wl.slice(-40).map(l => ({ label: l.ts ? fmtDate(l.ts) : String(l.date || ""), y: num(l.weight) }));
  const first = wl[0], lastW = wl[wl.length - 1];
  const change = first ? state.weight - num(first.weight) : 0;
  const tgt = num(state.settings.targetWeight, 82);
  const comp = bodyComp(state.weight, validBf(state.settings.bodyFat));
  const weightRows = wl.map((l, i) => ({ l, i })).reverse().slice(0, 6).map(({ l, i }) => `
    <div class="flex items-center justify-between text-xs bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-1.5">
      <span class="text-slate-400">${esc(l.ts ? fmtDate(l.ts) : l.date)}</span>
      <span class="flex items-center gap-2">${l.bf ? `<span class="text-slate-400">%${fmtNum(num(l.bf))} yağ</span>` : ""}<span class="font-bold text-emerald-400">${fmtNum(num(l.weight))} kg</span>
      <button onclick="deleteWeightLog(${state.weightLogs.indexOf(l)})" class="text-slate-500 text-base leading-none">&times;</button></span>
    </div>`).join("");

  // Takvim (son 5 hafta)
  const daysWithWorkout = {};
  state.workoutLogs.forEach(l => { if (l.ts) { const k = todayStr(new Date(l.ts)); daysWithWorkout[k] = (daysWithWorkout[k] || 0) + 1; } });
  const calStart = ws - 4 * 7 * DAY_MS;
  const tKey = todayStr();
  let cal = "";
  ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"].forEach(d => { cal += `<div class="text-[10px] text-slate-500 text-center">${d}</div>`; });
  for (let i = 0; i < 35; i++) {
    const d = new Date(calStart + i * DAY_MS + 12 * 3600000);
    const k = todayStr(d);
    const has = daysWithWorkout[k];
    const future = d.getTime() > Date.now() + DAY_MS / 2;
    cal += `<div class="aspect-square rounded-md flex items-center justify-center text-[10px] font-semibold
      ${has ? "bg-emerald-600 text-white" : future ? "bg-slate-900/40 text-slate-700" : "bg-slate-800/80 text-slate-500"}
      ${k === tKey ? "ring-2 ring-amber-400" : ""}">${d.getDate()}</div>`;
  }
  const last28 = Object.keys(daysWithWorkout).filter(k => new Date(k + "T12:00:00").getTime() >= Date.now() - 28 * DAY_MS).length;

  // Rekorlar
  const prs = [];
  Object.keys(state.exerciseHistory).forEach(k => {
    const h = state.exerciseHistory[k];
    if (!h.length || h[h.length - 1].kind !== "weight") return;
    let best = null;
    h.forEach(sess => (sess.sets || []).forEach(s => {
      const v = e1rm(s.kg, s.reps);
      if (v > 0 && (!best || v > best.v)) best = { v, kg: num(s.kg), reps: num(s.reps), ts: sess.ts };
    }));
    if (best) prs.push({ k, name: h[h.length - 1].name || k, ...best });
  });
  prs.sort((a, b) => b.ts - a.ts);
  const prRows = prs.slice(0, 12).map(p => `
    <button onclick="openChartByKey(${esc(JSON.stringify(p.k))})" class="w-full flex items-center justify-between gap-2 text-left text-xs bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-2">
      <span class="min-w-0"><span class="block font-semibold text-slate-200 truncate">${esc(p.name)}</span><span class="text-slate-500">${fmtDate(p.ts)} • ${fmtNum(p.kg)} kg × ${p.reps}</span></span>
      <span class="font-bold text-amber-400 shrink-0">~${Math.round(p.v)} kg 📈</span>
    </button>`).join("");

  // Hareket ilerleme seçici
  const keys = Object.keys(state.exerciseHistory).filter(k => state.exerciseHistory[k].length)
    .sort((a, b) => state.exerciseHistory[b].slice(-1)[0].ts - state.exerciseHistory[a].slice(-1)[0].ts);
  if (!progressSel || !state.exerciseHistory[progressSel]) progressSel = keys[0] || "";
  const opts = keys.map(k => { const h = state.exerciseHistory[k]; return `<option value="${esc(k)}" ${k === progressSel ? "selected" : ""}>${esc(h[h.length - 1].name || k)} (${h.length} kayıt)</option>`; }).join("");
  const selName = progressSel ? (state.exerciseHistory[progressSel].slice(-1)[0].name || progressSel) : "";

  $("progressContent").innerHTML = coachCardHtml() + `
    <div class="card p-4 space-y-3">
      <div class="flex justify-between items-center"><h3 class="font-bold text-base text-white">📅 Bu Hafta</h3><span class="text-[11px] text-slate-500">Pazartesiden beri</span></div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
        ${stat("🏋️ Antrenman", weekLogs.length, "text-emerald-400", wPr ? `🏆 ${wPr} rekor` : "")}
        ${stat("⚡ Toplam Tonaj", Math.round(wVol).toLocaleString("tr-TR") + " kg", "text-amber-400")}
        ${stat("🏃 Kardiyo", fmtNum(wMin) + " dk", "text-sky-400", wKm > 0 ? fmtNum(wKm) + " km" : "")}
        ${stat("💧 Ort. Su", fmtNum(avgWater) + " L", "text-sky-300", "Hedef " + fmtNum(waterTargetL()) + " L")}
      </div>
    </div>

    ${muscleCardHtml()}

    <div class="card p-4 space-y-3">
      <div class="flex justify-between items-center gap-2">
        <h3 class="font-bold text-base text-white">⚖️ Kilo Takibi</h3>
        <button onclick="logCurrentWeight()" class="text-[11px] bg-emerald-900/70 text-emerald-200 px-2 py-1 rounded border border-emerald-700/50">📌 ${fmtNum(state.weight)} kg kaydet</button>
      </div>
      <div class="grid grid-cols-3 gap-2">
        ${stat("Şu an", fmtNum(state.weight) + " kg", "text-emerald-400", lastW ? "Son tartı " + fmtNum(num(lastW.weight)) + " kg" : "")}
        ${stat("Değişim", (change > 0 ? "+" : "") + fmtNum(change) + " kg", change <= 0 ? "text-emerald-400" : "text-rose-400")}
        ${stat("Hedefe", fmtNum(Math.max(0, state.weight - tgt)) + " kg", "text-amber-400", "Hedef " + fmtNum(tgt) + " kg")}
      </div>
      ${comp ? `<div class="grid grid-cols-3 gap-2">
        ${stat("Yağ Oranı", "%" + fmtNum(comp.bf), "text-rose-400", validBf(state.settings.targetBodyFat) ? "Hedef %" + fmtNum(validBf(state.settings.targetBodyFat)) : "")}
        ${stat("Yağsız Kütle", fmtNum(comp.leanKg) + " kg", "text-emerald-400")}
        ${stat("Yağ Kütlesi", fmtNum(comp.fatKg) + " kg", "text-rose-400")}
      </div>` : `<button onclick="openSettings()" class="w-full text-xs text-slate-400 bg-slate-900/60 border border-dashed border-slate-700 rounded-xl py-2">+ Yağ oranını Ayarlar'dan girersen yağsız kütle ve yağ kütlen burada görünür</button>`}
      ${lineChart(wPoints, "#10b981", "kg")}
      <div class="space-y-1">${weightRows}</div>
    </div>

    ${measureCardHtml()}

    <div class="card p-4 space-y-3">
      <div class="flex justify-between items-center"><h3 class="font-bold text-base text-white">🗓️ Antrenman Takvimi</h3><span class="text-[11px] text-slate-400">Son 4 hafta: <b class="text-emerald-400">${last28}</b> gün</span></div>
      <div class="grid grid-cols-7 gap-1.5">${cal}</div>
    </div>

    <div class="card p-4 space-y-3">
      <h3 class="font-bold text-base text-white">📈 Hareket İlerlemesi</h3>
      ${keys.length ? `
        <select onchange="progressSel = this.value; renderProgress();" class="w-full text-sm rounded-lg px-3 py-2">${opts}</select>
        <div>${exerciseChartHtml(selName)}</div>` : `<div class="text-xs text-slate-500">Antrenmanlarını kaydettikçe her hareketin ilerleme grafiği burada oluşur.</div>`}
    </div>

    <div class="card p-4 space-y-3">
      <h3 class="font-bold text-base text-white">🏆 Kişisel Rekorlar</h3>
      ${prRows ? `<div class="space-y-1.5">${prRows}</div>` : `<div class="text-xs text-slate-500">Henüz rekor yok. Antrenman kaydettikçe her hareketin en iyi seti (tahmini 1RM) burada listelenir.</div>`}
    </div>

    ${historyCardHtml()}`;
}

// ---------------------------------------------------------------------------
// AYARLAR
// ---------------------------------------------------------------------------
// Profil sayfası (eski Ayarlar penceresinin yerini aldı). Alan kimlikleri (setAge, setBf, ...) aynı kaldı.
const PF_FIELDS = ["setSex", "setAge", "setHeight", "pfWeight", "setTarget", "setWater", "setWaterAuto", "setBf", "setTargetBf", "setRest", "setSound", "setAwake", "setSplash", "setDayStart"];
let pfSnap = "";
function profileIsOpen() { const el = $("profilePage"); return !!el && !el.classList.contains("hidden"); }
function pfValues() { return JSON.stringify(PF_FIELDS.map(id => { const el = $(id); return el.type === "checkbox" ? el.checked : el.value; })); }
function fillProfileFields() {
  const st = state.settings;
  $("setSex").value = st.sex;
  $("setAge").value = st.age;
  $("setHeight").value = st.height;
  $("pfWeight").value = fmtNum(num(state.weight, 0));
  $("setTarget").value = fmtNum(num(st.targetWeight, 82));
  $("setWater").value = fmtNum(num(st.waterTarget, 3.5));
  $("setWaterAuto").checked = st.waterAuto !== false;
  updateWaterAutoHint();
  $("setBf").value = validBf(st.bodyFat) ? fmtNum(validBf(st.bodyFat)) : "";
  $("setTargetBf").value = validBf(st.targetBodyFat) ? fmtNum(validBf(st.targetBodyFat)) : "";
  $("setRest").value = st.restSec;
  $("setSound").checked = !!st.sound;
  $("setAwake").checked = !!st.keepAwake;
  $("setSplash").checked = st.splash !== false;
  $("setDayStart").value = String(dayStartHour());
  updateBfHint();
  pfSnap = pfValues();
}
function openProfile() {
  fillProfileFields();
  $("backupText").value = JSON.stringify(state);
  renderProfile();
  const el = $("profilePage");
  el.classList.remove("hidden"); el.classList.add("flex");
  document.body.classList.add("pf-open");
  $("pfScroll").scrollTop = 0;
}
const openSettings = openProfile;
function hideProfile() {
  const el = $("profilePage");
  el.classList.add("hidden"); el.classList.remove("flex");
  document.body.classList.remove("pf-open");
}
async function closeProfile() {
  if (profileIsOpen() && pfValues() !== pfSnap) {
    const r = await uiAsk({ title: "Değişiklikler kaydedilmedi", message: "Profilde yaptığın değişiklikler kaydedilsin mi?", ok: "Kaydet", cancel: "Kaydetmeden çık", dismissable: false });
    if (r) { saveSettings(); return; }
  }
  hideProfile();
}
function closeSettings() { hideProfile(); }

function renderProfile() {
  renderMissList();
  // Kilo kayıtları
  const wl = state.weightLogs.filter(l => num(l.weight) > 0);
  const lastW = wl[wl.length - 1], firstW = wl[0];
  const tW = num(state.settings.targetWeight, 0);
  const left = round1(num(state.weight) - tW);
  let wh = "";
  if (wl.length) {
    const d = round1(num(lastW.weight) - num(firstW.weight));
    wh += `<div class="grid grid-cols-3 gap-2">
      <div class="bg-[#1E1E21] rounded-2xl px-3 py-2.5"><div class="text-[12px] t-muted">Son tartı</div><div class="t-display text-[22px]">${fmtNum(num(lastW.weight))}<span class="t-dim text-sm"> kg</span></div><div class="text-[11px] t-dim">${esc(lastW.ts ? fmtDate(lastW.ts) : lastW.date || "")}</div></div>
      <div class="bg-[#1E1E21] rounded-2xl px-3 py-2.5"><div class="text-[12px] t-muted">Değişim</div><div class="t-display text-[22px] ${d < 0 ? "t-accent" : ""}">${d > 0 ? "+" : ""}${fmtNum(d)}<span class="t-dim text-sm"> kg</span></div><div class="text-[11px] t-dim">${wl.length} kayıt</div></div>
      <div class="bg-[#1E1E21] rounded-2xl px-3 py-2.5"><div class="text-[12px] t-muted">Hedefe</div><div class="t-display text-[22px]">${tW ? fmtNum(Math.abs(left)) : "—"}<span class="t-dim text-sm"> kg</span></div><div class="text-[11px] t-dim">${!tW ? "hedef yok" : left > 0 ? "verilecek" : left < 0 ? "alınacak" : "hedeftesin"}</div></div>
    </div>`;
    const rows = wl.slice(-4).reverse().map(l => `<div class="flex items-center justify-between min-h-[40px] border-t border-[#2A2A2E] first:border-t-0 text-[14px]"><span class="t-muted">${esc(l.ts ? fmtDate(l.ts, true) : l.date || "")}</span><span class="font-semibold">${fmtNum(num(l.weight))} kg${validBf(l.bf) ? ` <span class="t-dim text-[12px]">· %${fmtNum(validBf(l.bf))} yağ</span>` : ""}</span></div>`).join("");
    wh += `<div class="mt-2">${rows}</div>`;
  } else {
    wh = `<p class="text-[13px] t-dim">Henüz tartı kaydın yok. Kilonu yazıp "Tartıyı kaydet"e dokun; ilerlemen İlerleme sekmesinde grafiğe dönüşür.</p>`;
  }
  $("pfWeightBox").innerHTML = wh;
  // Günlük hedefler (hesaplanan)
  const t = getTargets();
  $("pfTargetsBox").innerHTML = `<div class="grid grid-cols-4 gap-1.5 text-center">
    ${[["Kalori", Math.round(t.calTarget), "kcal"], ["Protein", Math.round(t.proTarget), "g"], ["Karb", Math.round(t.carbTarget), "g"], ["Yağ", Math.round(t.fatTarget), "g"]].map(([l, v, u]) => `<div class="bg-[#1E1E21] rounded-2xl px-1 py-2.5"><div class="text-[11px] t-muted">${l}</div><div class="t-display text-[19px] leading-tight">${isFinite(v) ? v : "—"}</div><div class="text-[10px] t-dim">${u}</div></div>`).join("")}
  </div><p class="text-[12px] t-dim mt-2">Bugünün hedefleri: bu bilgilerden, gün tipinden (antrenman/dinlenme) ve Beslenme sekmesindeki açık ayarından hesaplanır.</p>`;
  // Vücut ölçüleri
  const ms = state.measurements;
  const lastOf = k => { for (let i = ms.length - 1; i >= 0; i--) if (ms[i][k] != null) return ms[i]; return null; };
  const firstOf = k => ms.find(m => m[k] != null);
  const cells = MEASURES.map(([k, n, lowerBetter]) => {
    const l = lastOf(k);
    if (!l) return "";
    const d = round1(l[k] - firstOf(k)[k]);
    const good = d === 0 ? null : (lowerBetter ? d < 0 : d > 0);
    return `<div class="bg-[#141416] border border-[#2A2A2E] rounded-2xl px-3 py-2.5 min-w-0">
      <div class="text-[12px] t-muted truncate">${n}</div>
      <div class="t-display text-[22px]">${fmtNum(l[k])}<span class="t-dim text-sm"> cm</span></div>
      <div class="text-[11px] ${good == null ? "t-dim" : good ? "t-accent" : "text-[#FF8A8A]"}">${d === 0 ? "değişim yok" : (d > 0 ? "+" : "") + fmtNum(d) + " cm"}</div>
    </div>`;
  }).join("");
  const lastM = ms[ms.length - 1];
  $("pfMeasureBox").innerHTML = cells
    ? `<div class="grid grid-cols-3 gap-2">${cells}</div><p class="text-[12px] t-dim mt-2">Son ölçüm: ${esc(fmtDate(lastM.ts, true))} · Değişim ilk ölçüne göre. Grafik İlerleme sekmesinde.</p>`
    : `<div class="t-card rounded-[22px] p-4 text-[13px] t-dim">Henüz ölçü eklemedin. Kilo yerinde sayarken belin inceliyorsa yağ yakıp kas kazanıyorsun demektir. İlk ölçünü eklemek için "+ Ölçü ekle"ye dokun.</div>`;
  $("lastBackupText").textContent = state.lastBackupAt
    ? `Son yedek: ${fmtDate(state.lastBackupAt, true)} (${Math.floor((Date.now() - state.lastBackupAt) / DAY_MS)} gün önce)`
    : "Henüz yedek alınmadı. Verilerin sadece bu telefonda duruyor; düzenli yedek almanı öneririm.";
}

// v24: "Su hedefi kiloya göre" açıkken elle hedef kutusu pasif, hesap açıklamada
function updateWaterAutoHint() {
  const on = $("setWaterAuto").checked, a = waterAutoInfo(readProfileWeight() || state.weight);
  $("setWater").disabled = on && !!a;
  $("setWater").classList.toggle("opacity-50", on && !!a);
  $("setWaterHint").textContent = on
    ? (a ? `${fmtNum(a.w)} kg × 35 ml = ${fmtNum(a.base)} L${a.cr ? " + 0,5 L kreatin" : ""} → ${fmtNum(a.total)} L` : "Kilo girilince hesaplanır; şimdilik elle yazdığın hedef kullanılır.")
    : "Kapalı: yukarıda elle yazdığın hedef kullanılır.";
}
function readProfileWeight() {
  const raw = $("pfWeight").value.trim();
  const w = round1(num(raw, 0));
  return w >= 30 && w <= 300 ? w : 0;
}
function profileLogWeight() {
  const w = readProfileWeight();
  if (!w) { uiAlert("Kilo geçersiz", "Kilonu 30 ile 300 kg arasında yaz (örn: 98,4)."); return; }
  state.weight = w;
  logCurrentWeight();
  $("pfWeight").value = fmtNum(w);
  pfSnap = pfValues();
}

function saveSettings() {
  const st = state.settings;
  const bfRaw = $("setBf").value.trim(), tbfRaw = $("setTargetBf").value.trim();
  if ((bfRaw && !validBf(bfRaw)) || (tbfRaw && !validBf(tbfRaw))) { uiAlert("Yağ oranı geçersiz", "Yağ oranı %3 ile %60 arasında olmalı (bilmiyorsan boş bırak)."); return; }
  const wRaw = $("pfWeight").value.trim();
  const w = readProfileWeight();
  if (wRaw && !w) { uiAlert("Kilo geçersiz", "Kilonu 30 ile 300 kg arasında yaz (örn: 98,4)."); return; }
  st.sex = $("setSex").value === "female" ? "female" : "male";
  st.age = Math.max(12, Math.min(99, Math.round(num($("setAge").value, st.age))));
  st.height = Math.max(120, Math.min(230, Math.round(num($("setHeight").value, st.height))));
  st.targetWeight = Math.max(30, Math.min(250, round1(num($("setTarget").value, st.targetWeight))));
  st.waterTarget = Math.max(0.5, Math.min(10, round1(num($("setWater").value, st.waterTarget))));
  st.waterAuto = $("setWaterAuto").checked;
  st.restSec = Math.max(10, Math.min(900, Math.round(num($("setRest").value, st.restSec))));
  st.bodyFat = bfRaw ? round1(validBf(bfRaw)) : "";
  st.targetBodyFat = tbfRaw ? round1(validBf(tbfRaw)) : "";
  st.sound = $("setSound").checked;
  st.keepAwake = $("setAwake").checked;
  st.splash = $("setSplash").checked;
  st.dayStartHour = Math.max(0, Math.min(5, parseInt($("setDayStart").value, 10) || 0));
  if (w) state.weight = w;
  if (!timer.running) resetTimerUI();
  pfSnap = pfValues();
  hideProfile();
  toast("✓ Profil kaydedildi");
  renderAll();
  updateWakeLock();
}

// Bağlama göre onay: profil/antrenman ekranında temalı pencere, diğer yerlerde sistem kutusu.
async function askConfirm(title, message, ok = "Devam et", danger = false) {
  if (trainCtx() || nutriCtx()) return !!(await uiAsk({ title, message, ok, danger }));
  return confirm(message);
}

// ---------------------------------------------------------------------------
// YEDEKLEME
// ---------------------------------------------------------------------------
function markBackup() { state.lastBackupAt = Date.now(); state.backupSnoozeUntil = 0; saveState(); renderBanner(); }

async function exportBackupFile() {
  const json = JSON.stringify(state);
  const name = `AYK-yedek-${todayStr()}.json`;
  let file = null;
  try { file = new File([json], name, { type: "application/json" }); } catch (e) { file = null; }
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "AYK+ Yedek" });
      markBackup();
      toast("💾 Yedek paylaşıldı. 'Dosyalar'a Kaydet'i seçtiysen güvende.");
      return;
    } catch (e) {
      if (e && e.name === "AbortError") return;
    }
  }
  try {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    markBackup();
    toast("💾 Yedek dosyası indirildi");
  } catch (e) {
    toast("Dosya oluşturulamadı. Ayarlar > Yedek kodu ile kopyala.", "error");
  }
}

async function restoreFromText(text) {
  let parsed;
  try { parsed = JSON.parse(String(text || "").trim()); } catch (e) { sayAlert("Geçersiz yedek", "Geçersiz yedek! Dosya veya kod bozuk görünüyor."); return false; }
  if (parsed && parsed.state && (parsed.state.meals || parsed.state.workoutDays)) parsed = parsed.state;
  if (!parsed || typeof parsed !== "object" || !(parsed.meals || parsed.workoutDays)) { sayAlert("Yedek tanınmadı", "Bu bir AYK+ yedeği değil."); return false; }
  if (!(await askConfirm("Yedek geri yüklensin mi?", "Mevcut tüm verilerin bu yedekle DEĞİŞTİRİLECEK. Devam edilsin mi?", "Geri yükle", true))) return false;
  let next;
  try { next = normalizeState(parsed); } catch (e) { console.error(e); sayAlert("Yedek okunamadı", "Yedek dosyası bozuk görünüyor; mevcut verilerin değiştirilmedi."); return false; }
  state = next;
  state.lastBackupAt = state.lastBackupAt || Date.now();
  checkNewDay();
  closeSettings();
  renderAll();
  toast("✓ Yedek başarıyla geri yüklendi");
  return true;
}

function importBackupFile(event) {
  const file = event.target.files[0];
  event.target.value = "";
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => restoreFromText(e.target.result);
  reader.onerror = () => sayAlert("Dosya okunamadı", "Dosya okunamadı.");
  reader.readAsText(file);
}

async function copyBackup() {
  const txt = $("backupText");
  txt.value = JSON.stringify(state);
  let ok = false;
  try { await navigator.clipboard.writeText(txt.value); ok = true; } catch (e) {
    try { txt.focus(); txt.select(); ok = document.execCommand("copy"); } catch (e2) { ok = false; }
  }
  if (ok) { markBackup(); toast("📋 Yedek kodu kopyalandı. Notlar'a yapıştırıp sakla."); }
  else toast("Kopyalanamadı. Kutudaki metni elle seçip kopyala.", "error");
}

function restoreBackupFromText() { restoreFromText($("backupText").value); }

async function resetToDefaults() {
  if (!(await askConfirm("Fabrika ayarlarına sıfırla", "TÜM veriler silinip başlangıç ayarlarına dönülecek. Emin misin?", "Devam et", true))) return;
  if (!(await askConfirm("Son onay", "Bu işlem geri alınamaz. Önce yedek almanı öneririm. Sıfırlansın mı?", "Sıfırla", true))) return;
  state = normalizeState({});
  state.today = logicalToday();
  closeSettings();
  stopTimer();
  renderAll();
  toast("↺ Uygulama sıfırlandı");
}

function hasMeaningfulData() {
  return state.workoutLogs.length > 0 || state.weightLogs.length > 1 || Object.keys(state.customFoods).length > 0 || Object.keys(state.dailyLogs).length > 2;
}
function renderBanner() {
  const ref = state.lastBackupAt || state.createdAt || Date.now();
  const days = Math.floor((Date.now() - ref) / DAY_MS);
  const need = hasMeaningfulData() && days >= 7 && Date.now() > (state.backupSnoozeUntil || 0);
  $("backupBanner").classList.toggle("hidden", !need);
  $("backupDot").classList.toggle("hidden", !(hasMeaningfulData() && days >= 7));
  if (need) $("backupBannerText").textContent = state.lastBackupAt ? `💾 Son yedeğin ${days} gün önce. Verilerini korumak için yedekle.` : "💾 Henüz hiç yedek almadın. Verilerin sadece bu telefonda.";
}
function snoozeBackup() { state.backupSnoozeUntil = Date.now() + 3 * DAY_MS; saveState(); renderBanner(); }

// ============================================================================
// v7 — KAS GRUBU, PROGRESİF YÜKLENME, PLAKA/ISINMA, KALORİ KOÇU
// ============================================================================

const MUSCLES = ["Göğüs", "Sırt", "Omuz", "Ön Bacak", "Arka Bacak & Kalça", "Kalf", "Biceps", "Triceps", "Karın"];
const LIB_CAT_MUSCLE = [0, 1, 1, 2, 3, 4, 5, 6, 7, 8, null]; // EXERCISE_LIBRARY kategori sırası → kas grubu

// Kütüphanedeki isimlerin kas grubu haritası (tam eşleşme)
const LIB_MUSCLE_MAP = (() => {
  const m = {};
  Object.keys(EXERCISE_LIBRARY).forEach((cat, ci) => {
    const g = LIB_CAT_MUSCLE[ci];
    EXERCISE_LIBRARY[cat].forEach(n => { m[exKey(n)] = g == null ? null : MUSCLES[g]; });
  });
  return m;
})();

// Sıralama önemli: önce özel durumlar (leg curl → arka bacak, reverse pec → omuz gibi)
const MUSCLE_RULES = [
  ["Karın", /crunch|leg raise|knee raise|plank|ab wheel|rollout|sit-?up|russian twist|pallof|woodchop|deadbug|dead bug|bird-?dog|vacuum|karın|mekik/],
  ["Kalf", /calf|kalf|tibialis|baldır/],
  ["Arka Bacak & Kalça", /leg curl|hamstring|nordic|\brdl\b|romanian|stiff|hip thrust|glute|abduct|adduct|pull-?through|kalça|good morning/],
  ["Ön Bacak", /squat|leg press|lunge|leg extension|step-?up|hack|sissy|ön bacak/],
  ["Omuz", /shoulder|military|overhead press|arnold|lateral raise|front raise|rear delt|reverse pec|reverse fly|face pull|upright row|shrug|landmine (shoulder )?press|omuz/],
  ["Triceps", /tricep|overhead.*extension|pushdown|skull|jm press|close-?grip (barbell )?bench|bench dips|dip machine|kickback|diamond|arka kol/],
  ["Biceps", /curl|bicep|ön kol/],
  ["Sırt", /pull-?up|chin-?up|pulldown|row|deadlift|rack pull|pullover|hyperextension|back extension|\blat\b|barfiks|sırt/],
  ["Göğüs", /bench|chest|pec|fly|crossover|push-?up|dip|svend|şınav|göğüs|\bpress\b/]
];

function autoMuscle(name) {
  const k = exKey(name);
  if (Object.prototype.hasOwnProperty.call(LIB_MUSCLE_MAP, k)) return LIB_MUSCLE_MAP[k];
  for (const [g, re] of MUSCLE_RULES) if (re.test(k)) return g;
  return null;
}
function muscleOf(ex) {
  if (ex.kind === "cardio") return null;
  return ex.muscle && MUSCLES.includes(ex.muscle) ? ex.muscle : autoMuscle(ex.name);
}

// Varsayılan kilo artış adımı
function autoInc(name) {
  const k = exKey(name);
  if (/dumbbell|dambıl|\bdb\b/.test(k)) return 2;
  if (/squat|deadlift|leg press|hip thrust|hack|rack pull|calf|glute drive|pendulum|belt squat/.test(k)) return 5;
  return 2.5;
}
function incOf(ex) { const v = num(ex.inc, 0); return v > 0 ? v : autoInc(ex.name); }
function roundTo(x, step) { return step > 0 ? Math.round(x / step) * step : x; }

function parseRepRange(ex) {
  const src = String((ex.sets[0] && ex.sets[0].target) || ex.targetInfo || "").replace(/^\d+\s*x\s*/i, "");
  const m = src.match(/(\d+)\s*[–\-]\s*(\d+)/);
  if (m) { const lo = parseInt(m[1], 10), hi = parseInt(m[2], 10); return lo <= hi ? { lo, hi } : { lo: hi, hi: lo }; }
  const one = src.match(/(\d+)/);
  if (one) { const v = parseInt(one[1], 10); return { lo: v, hi: v }; }
  return null;
}

// ---------------------------------------------------------------------------
// PROGRESİF YÜKLENME ASİSTANI
// Son kaydedilen antrenmana bakar: tüm setlerde hedef aralığın üstüne çıktıysan
// kilo artırmayı, setlerin yarısında alt sınırın altında kaldıysan azaltmayı önerir.
// ---------------------------------------------------------------------------
function overloadSuggestion(ex) {
  if (ex.kind !== "weight") return null;
  if (ex.sets.some(s => s.done)) return null;
  const range = parseRepRange(ex);
  if (!range) return null;
  const hist = historyFor(ex.name).filter(h => h.kind === "weight");
  const last = hist[hist.length - 1];
  if (!last || !last.sets || !last.sets.length) return null;
  if (ex.sugDismiss === last.ts) return null;

  const sets = last.sets;
  const maxKg = Math.max(...sets.map(s => num(s.kg)));
  const curMax = Math.max(...ex.sets.map(s => num(s.kg)));
  const inc = incOf(ex);
  const allHit = sets.length >= ex.sets.length && sets.every(s => num(s.reps) >= range.hi);
  const misses = sets.filter(s => num(s.reps) < range.lo).length;

  // v23: set zorluğu. Tüm setler hedefe ulaştı ama son set "Tükeniş" (ya da puanlananların çoğu Zor/Tükeniş) → artırma, aynı kiloda kal.
  const rated = sets.filter(s => EFFORT_LABELS[s.e]);
  const lastE = num(sets[sets.length - 1].e, 0);
  const hardShare = rated.length ? rated.filter(s => s.e >= 3).length / rated.length : 0;
  const tooHard = lastE === 4 || (rated.length >= 2 && hardShare > 0.5);
  const allEasy = rated.length === sets.length && sets.length >= 2 && sets.every(s => s.e === 1) && misses === 0;
  if (allHit && tooHard && maxKg > 0) {
    if (curMax !== maxKg) return null;
    return {
      type: "hold", ts: last.ts, kg: maxKg, reps: range.hi,
      text: `Geçen sefer tüm setlerde ${range.hi}+ tekrar yaptın ama setler çok zor geçti${lastE === 4 ? " (son sette tükeniş)" : ""}. ${fmtKg(maxKg)} kg'da bir seans daha kal; rahatlayınca artır.`
    };
  }
  if (!allHit && allEasy && maxKg > 0 && curMax <= maxKg) {
    const next = nextLevel(ex, maxKg);
    return {
      type: "up", ts: last.ts, kg: next, reps: range.lo,
      text: `Geçen sefer tüm setleri "Kolay" işaretledin. Kiloyu ${fmtKg(maxKg)} → ${fmtKg(next)} kg'a çıkarmayı dene, ${range.lo} tekrardan başla.`
    };
  }
  if (allHit) {
    if (curMax > maxKg) return null; // zaten artırılmış
    const next = nextLevel(ex, maxKg);
    return {
      type: "up", ts: last.ts, kg: next, reps: range.lo,
      text: maxKg > 0
        ? `Geçen sefer tüm setlerde ${range.hi}+ tekrar yaptın. Kiloyu ${fmtKg(maxKg)} → ${fmtKg(next)} kg'a çıkar, ${range.lo} tekrardan başla.`
        : `Geçen sefer tüm setlerde ${range.hi}+ tekrar yaptın. ${fmtKg(next)} kg ek ağırlık dene veya daha zor bir varyasyona geç.`
    };
  }
  if (maxKg > 0 && misses * 2 >= sets.length) {
    if (curMax < maxKg) return null; // zaten düşürülmüş
    const next = prevLevel(ex, maxKg);
    return {
      type: "down", ts: last.ts, kg: next, reps: range.lo,
      text: `Geçen sefer setlerin çoğunda ${range.lo} tekrarın altında kaldın. Aynı kiloyla devam edebilir ya da ${fmtKg(next)} kg'a düşüp formu sağlamlaştırabilirsin.`
    };
  }
  return null;
}

// v23: Dinlenme haftası (deload) notu. Son 21 günde en az 3 seans var, bu seansların en iyi tahmini 1RM'i öncekilerin en iyisini
// geçmedi ve puanlanan setlerin çoğu (en az %70, en az 3 set) Zor/Tükeniş → yalnızca not; programı değiştirmez.
const DELOAD_WINDOW_MS = 21 * 24 * 3600000;
function deloadInfo(ex) {
  if (ex.kind !== "weight") return null;
  const hist = historyFor(ex.name).filter(h => h.kind === "weight" && h.sets && h.sets.length);
  if (!hist.length) return null;
  const now = Date.now(), from = now - DELOAD_WINDOW_MS;
  const win = hist.filter(h => h.ts >= from), before = hist.filter(h => h.ts < from);
  if (win.length < 3 || !before.length) return null;
  const best = hs => Math.max(...hs.map(h => Math.max(...h.sets.map(s => e1rm(s.kg, s.reps)))));
  const bWin = best(win), bBefore = best(before);
  if (!(bBefore > 0) || bWin > bBefore + 0.01) return null;
  const rated = [].concat(...win.map(h => h.sets.filter(s => EFFORT_LABELS[s.e])));
  if (rated.length < 3 || rated.filter(s => s.e >= 3).length / rated.length < 0.7) return null;
  const lastTs = win[win.length - 1].ts;
  if (ex.deloadDismiss === lastTs) return null;
  return { ts: lastTs, best: Math.round(bBefore), sessions: win.length };
}
function deloadHtml(ex, exIdx) {
  if (ex.sets.some(s => s.done)) return "";
  const d = deloadInfo(ex);
  if (!d) return "";
  return `<div class="bg-[#2A1F0B] border border-[#6B4E16] rounded-2xl pl-3 pr-2 py-2 space-y-1.5" data-deload="${exIdx}">
      <div class="flex items-start gap-2.5"><span style="color:#FBBF24" class="pt-0.5">${svgI("down", 20, 2.2)}</span>
        <span class="text-[13px] leading-snug text-amber-100">Son 3 haftada ${d.sessions} seansta tahmini 1RM'in ~${d.best} kg'ı geçmedi ve setler çoğunlukla zor geçti. Bu hareket için bir hafta kiloyu ~%10 hafifletmeyi (dinlenme haftası) düşünebilirsin.</span></div>
      <div class="flex justify-end"><button onclick="dismissDeload(${exIdx})" class="text-[12px] t-muted h-11 px-3">Anladım</button></div>
    </div>`;
}
function dismissDeload(exIdx) {
  const ex = activeDay().exercises[exIdx];
  const d = ex && deloadInfo(ex);
  if (!d) return;
  ex.deloadDismiss = d.ts;
  renderAll();
}
function suggestionHtml(ex, exIdx) {
  const sg = overloadSuggestion(ex);
  if (!sg) return deloadHtml(ex, exIdx);
  if (sg.type === "hold") return `${deloadHtml(ex, exIdx)}
    <div class="t-panel rounded-2xl pl-3 pr-2 py-2 space-y-1.5" data-hold="${exIdx}">
      <div class="flex items-start gap-2.5"><span style="color:#1FD1C1" class="pt-0.5">${svgI("check", 20, 2.2)}</span><span class="text-[13px] leading-snug text-[#CCF5F0]">${esc(sg.text)}</span></div>
      <div class="flex justify-end"><button onclick="dismissSuggestion(${exIdx})" class="text-[12px] t-muted h-11 px-3">Anladım</button></div>
    </div>`;
  const up = sg.type === "up";
  const noLv = usesLevels(ex) && !ex.levels && !inferLevels(ex);
  return `
    <div class="${up ? "t-panel" : "bg-[#2A1F0B] border border-[#6B4E16]"} rounded-2xl pl-3 pr-2 py-2 space-y-2">
      <div class="flex items-center justify-between gap-2.5">
        <span class="flex items-center gap-2.5 min-w-0">
          <span style="color:${up ? "#1FD1C1" : "#FBBF24"}">${svgI(up ? "up" : "down", 20, 2.2)}</span>
          <span class="text-[13px] leading-snug ${up ? "text-[#CCF5F0]" : "text-amber-100"}">${esc(sg.text)}</span>
        </span>
        <span class="flex flex-col gap-1.5 shrink-0">
          <button onclick="applySuggestion(${exIdx})" class="${up ? "t-btn" : "bg-amber-500 text-black font-extrabold"} h-11 px-3.5 rounded-xl text-[13px]">${fmtKg(sg.kg)} kg</button>
        </span>
      </div>
      <div class="flex items-center justify-between gap-2">
        ${noLv ? `<button onclick="openEditExercise(${exIdx})" class="text-[12px] text-amber-200 underline text-left">Makine kademelerini tanımla, doğru kiloyu önereyim</button>` : "<span></span>"}
        <button onclick="dismissSuggestion(${exIdx})" class="text-[12px] t-muted h-9 px-2">Şimdi değil</button>
      </div>
    </div>`;
}

function applySuggestion(exIdx) {
  const ex = activeDay().exercises[exIdx];
  const s = overloadSuggestion(ex);
  if (!s) return;
  ex.sets.forEach(x => { x.kg = s.kg; x.reps = s.reps; x.pr = false; });
  ex.sugDismiss = s.ts;
  toast(`✓ ${ex.name}: ${fmtKg(s.kg)} kg × ${s.reps}`);
  renderAll();
}
function dismissSuggestion(exIdx) {
  const ex = activeDay().exercises[exIdx];
  const s = overloadSuggestion(ex);
  if (s) ex.sugDismiss = s.ts;
  renderAll();
}

// ---------------------------------------------------------------------------
// HAFTALIK KAS GRUBU SET SAYISI
// ---------------------------------------------------------------------------
function weeklyMuscleSets(fromTs) {
  const counts = {};
  MUSCLES.forEach(m => { counts[m] = 0; });
  Object.keys(state.exerciseHistory).forEach(k => {
    state.exerciseHistory[k].forEach(sess => {
      if (sess.ts < fromTs || sess.kind === "cardio") return;
      const g = sess.muscle && MUSCLES.includes(sess.muscle) ? sess.muscle : autoMuscle(sess.name || k);
      if (g) counts[g] += (sess.sets || []).length;
    });
  });
  return counts;
}

function muscleCardHtml() {
  const counts = weeklyMuscleSets(weekStart());
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const scale = Math.max(22, ...Object.values(counts));
  const rows = MUSCLES.map(m => {
    const c = counts[m];
    const pct = Math.min(100, (c / scale) * 100);
    const lo = (10 / scale) * 100, hi = (20 / scale) * 100;
    const color = c === 0 ? "bg-slate-700" : c < 10 ? "bg-amber-500" : c <= 20 ? "bg-emerald-500" : "bg-sky-500";
    const tag = c === 0 ? "" : c < 10 ? "az" : c <= 20 ? "ideal" : "yüksek";
    return `
      <div class="flex items-center gap-2 text-xs">
        <span class="w-24 shrink-0 text-slate-300 truncate">${m}</span>
        <div class="relative flex-1 h-3 bg-slate-950 rounded-full overflow-hidden">
          <div class="absolute inset-y-0 bg-emerald-500/10 border-x border-emerald-500/40" style="left:${lo}%;width:${hi - lo}%"></div>
          <div class="relative h-full ${color} rounded-full" style="width:${pct}%"></div>
        </div>
        <span class="w-16 shrink-0 text-right"><b class="text-slate-100">${c}</b> <span class="text-[10px] text-slate-500">${tag}</span></span>
      </div>`;
  }).join("");
  return `
    <div class="card p-4 space-y-3">
      <div class="flex justify-between items-center gap-2"><h3 class="font-bold text-base text-white">💪 Haftalık Kas Grubu Setleri</h3><span class="text-[11px] text-slate-400">Toplam ${total} set</span></div>
      ${total ? `<div class="space-y-2">${rows}</div>` : `<div class="text-xs text-slate-500">Bu hafta kaydedilmiş antrenman yok. Antrenmanı bitirip kaydettikçe her kas grubunun set sayısı burada birikir.</div>`}
      <p class="text-[11px] text-slate-500">Yeşil bant: kas gelişimi için genel öneri olan haftada 10–20 set. Her set, hareketin ana çalıştırdığı kas grubuna sayılır. Kas grubunu hareketi düzenlerken (✎) değiştirebilirsin.</p>
    </div>`;
}

// ---------------------------------------------------------------------------
// PLAKA & ISINMA HESAPLAYICI
// ---------------------------------------------------------------------------
const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
const PLATE_CLS = { 25: "bg-rose-600 text-white", 20: "bg-sky-600 text-white", 15: "bg-amber-500 text-slate-950", 10: "bg-emerald-600 text-white", 5: "bg-slate-100 text-slate-900", 2.5: "bg-slate-600 text-white", 1.25: "bg-slate-500 text-white" };
let plateCtx = { name: "" };

function platesFor(total, bar) {
  const perSide = (total - bar) / 2;
  if (perSide < -1e-9) return { ok: false, reason: "light" };
  let rem = Math.round(perSide * 100) / 100;
  const list = [];
  PLATES.forEach(p => { while (rem + 1e-9 >= p) { list.push(p); rem = Math.round((rem - p) * 100) / 100; } });
  return { ok: rem < 0.01, list, rem, perSide, achieved: bar + 2 * list.reduce((a, b) => a + b, 0) };
}

function plateChips(list) {
  if (!list.length) return `<span class="text-slate-500">Plaka yok (sadece bar)</span>`;
  return list.map(p => `<span class="inline-flex items-center justify-center min-w-[2.25rem] px-1.5 py-1 rounded-md text-[11px] font-bold ${PLATE_CLS[p]}">${fmtKg(p)}</span>`).join("");
}

function warmupSets(W, bar) {
  if (!(W > 0)) return [];
  const step = bar > 0 ? 2.5 : 1;
  const out = [];
  if (bar > 0 && W >= bar + 20) out.push({ kg: bar, reps: 10, label: "Boş bar" });
  const steps = [[0.4, 8], [0.6, 5], [0.8, 3]];
  if (W >= 100) steps.push([0.9, 1]);
  steps.forEach(([pct, reps]) => {
    const kg = roundTo(W * pct, step);
    const prev = out.length ? out[out.length - 1].kg : 0;
    if (kg > prev && kg < W && (bar === 0 || kg >= bar)) out.push({ kg, reps, label: `%${Math.round(pct * 100)}` });
  });
  return out;
}

function openPlateTool(exIdx) {
  const ex = activeDay().exercises[exIdx];
  const next = ex.sets.find(s => !s.done) || ex.sets[0];
  const W = num(next && next.kg) || Math.max(...ex.sets.map(s => num(s.kg)), 0);
  const lv = usesLevels(ex);
  plateCtx = { name: ex.name, exIdx, levels: lv ? levelListOf(ex) : null, lv };
  $("chartTitle").textContent = ex.name;
  const bar = num(state.settings.barKg, 20);
  if (lv && !plateCtx.levels) {
    $("chartBody").innerHTML = `<div class="text-sm text-slate-300 space-y-3">
      <p>Bu hareket için ${equipOf(ex) === "dumbbell" ? "dambıl" : "makine"} kademeleri tanımlı değil. Kademeleri girersen ısınma setlerini ve kilo artırma önerilerini makinede gerçekten seçebileceğin kilolara göre hesaplarım.</p>
      <button onclick="closeModal('chartModal'); openEditExercise(${exIdx})" class="w-full bg-emerald-600 text-white text-sm font-semibold py-2.5 rounded-lg">Kademeleri tanımla</button></div>`;
    openModal("chartModal");
    return;
  }
  $("chartBody").innerHTML = `
    <div class="grid ${lv ? "grid-cols-1" : "grid-cols-2"} gap-2 text-xs">
      <div><label class="block text-slate-400 mb-1">Çalışma kilosu (kg)</label>
        <input id="ptKg" type="text" inputmode="decimal" value="${esc(fmtKg(W))}" oninput="renderPlateTool()" class="w-full p-2 rounded-lg text-base text-center font-bold" /></div>
      ${lv ? "" : `<div><label class="block text-slate-400 mb-1">Bar ağırlığı</label>
        <select id="ptBar" onchange="state.settings.barKg = num(this.value, 20); saveState(); renderPlateTool();" class="w-full p-2 rounded-lg text-sm">
          ${[[20, "20 kg Olimpik bar"], [15, "15 kg Bar"], [10, "10 kg EZ / kısa bar"], [0, "Bar yok / plakalı makine"]].map(([v, l]) => `<option value="${v}" ${v === bar ? "selected" : ""}>${l}</option>`).join("")}
        </select></div>`}
    </div>
    <div id="ptOut" class="mt-3 space-y-3"></div>`;
  renderPlateTool();
  openModal("chartModal");
}

function renderLevelTool() {
  const out = $("ptOut");
  const list = plateCtx.levels;
  const W = Math.max(0, num($("ptKg").value, 0));
  if (W <= 0) {
    out.innerHTML = `<div class="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
      <div class="text-[11px] text-slate-400 mb-1.5">Bu makinenin kademeleri:</div>
      <div class="flex flex-wrap gap-1.5">${list.slice(0, 12).map(v => `<span class="inline-flex items-center justify-center min-w-[3rem] px-2 py-1.5 rounded-lg text-[12px] font-bold bg-slate-800 text-slate-200">${fmtKg(v)}</span>`).join("")}${list.length > 12 ? '<span class="text-slate-500 text-xs self-center">…</span>' : ""}</div>
      <div class="text-[11px] text-slate-500 mt-2">Isınma setlerini görmek için çalışma kilonu yaz.</div></div>`;
    return;
  }
  const near = nearestLevelBelow(list, W);
  const idx = list.indexOf(near);
  const around = list.slice(Math.max(0, idx - 3), idx + 4);
  const chips = around.map(v => `<span class="inline-flex items-center justify-center min-w-[3rem] px-2 py-1.5 rounded-lg text-[12px] font-bold ${Math.abs(v - W) < 0.01 ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-200"}">${fmtKg(v)}</span>`).join("");
  const exact = list.some(v => Math.abs(v - W) < 0.01);
  const steps = [[0.5, 10], [0.7, 6], [0.85, 3]];
  const wu = [];
  steps.forEach(([p, r]) => {
    const kg = nearestLevelBelow(list, W * p);
    if (kg < W - 0.01 && (!wu.length || kg > wu[wu.length - 1].kg)) wu.push({ kg, reps: r, label: "%" + Math.round(p * 100) });
  });
  out.innerHTML = `
    <div class="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
      <div class="text-[11px] text-slate-400 mb-1.5">Bu kiloya yakın kademeler:</div>
      <div class="flex flex-wrap gap-1.5">${chips}</div>
      ${exact ? "" : `<div class="text-[11px] text-amber-300 mt-2">${fmtKg(W)} kg bu makinede yok; en yakın alt kademe <b>${fmtKg(near)} kg</b>.</div>`}
    </div>
    <div>
      <div class="text-[11px] font-bold text-slate-500 tracking-wide mb-1.5">ISINMA SETLERİ</div>
      ${wu.length ? `<div class="space-y-1">${wu.map(w => `<div class="flex items-center justify-between gap-2 text-xs bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-1.5"><span class="text-slate-400 w-14">${w.label}</span><span class="font-bold text-slate-100">${fmtKg(w.kg)} kg × ${w.reps}</span><span></span></div>`).join("")}
        <div class="flex items-center justify-between gap-2 text-xs bg-emerald-950/60 border border-emerald-700/60 rounded-lg px-2.5 py-1.5"><span class="text-emerald-300 w-14">Çalışma</span><span class="font-bold text-emerald-200">${fmtKg(W)} kg</span><span></span></div></div>
        <p class="text-[11px] text-slate-500 mt-1.5">Isınma kiloları makinede var olan kademelere yuvarlandı. Tonaja ve set sayısına dahil edilmez.</p>`
      : `<div class="text-xs text-slate-500">Bu kiloda ayrı ısınma setine gerek yok.</div>`}
    </div>`;
}

function renderPlateTool() {
  const out = $("ptOut");
  if (!out) return;
  if (plateCtx.lv && plateCtx.levels) { renderLevelTool(); return; }
  const W = Math.max(0, num($("ptKg").value, 0));
  const bar = num($("ptBar").value, 20);
  let html = "";
  if (bar > 0) {
    const r = platesFor(W, bar);
    if (!r.ok && r.reason === "light") {
      html += `<div class="text-xs text-amber-300 bg-amber-950/50 border border-amber-800/60 rounded-lg px-3 py-2">Bu kilo ${fmtKg(bar)} kg'lık bardan hafif.</div>`;
    } else {
      html += `<div class="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
        <div class="text-[11px] text-slate-400 mb-1.5">Barın HER İKİ tarafına takılacak plakalar (${fmtKg(r.perSide)} kg / taraf):</div>
        <div class="flex flex-wrap gap-1.5">${plateChips(r.list)}</div>
        ${r.ok ? "" : `<div class="text-[11px] text-amber-300 mt-2">Elindeki plakalarla tam ${fmtKg(W)} kg yapılamıyor; en yakın: <b>${fmtKg(r.achieved)} kg</b></div>`}
      </div>`;
    }
  }
  const wu = warmupSets(W, bar);
  html += `<div>
    <div class="text-[11px] font-bold text-slate-500 tracking-wide mb-1.5">ISINMA SETLERİ</div>
    ${wu.length ? `<div class="space-y-1">${wu.map(w => {
      const pr = bar > 0 ? platesFor(w.kg, bar) : null;
      return `<div class="flex items-center justify-between gap-2 text-xs bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-1.5">
        <span class="text-slate-400 w-14 shrink-0">${w.label}</span>
        <span class="font-bold text-slate-100">${fmtKg(w.kg)} kg × ${w.reps}</span>
        <span class="text-[10px] text-slate-500 text-right truncate">${pr && pr.ok && pr.list.length ? "taraf: " + pr.list.map(fmtKg).join("+") : ""}</span>
      </div>`;
    }).join("")}
    <div class="flex items-center justify-between gap-2 text-xs bg-emerald-950/60 border border-emerald-700/60 rounded-lg px-2.5 py-1.5">
      <span class="text-emerald-300 w-14 shrink-0">Çalışma</span><span class="font-bold text-emerald-200">${fmtKg(W)} kg</span><span></span>
    </div></div>
    <p class="text-[11px] text-slate-500 mt-1.5">Isınma setleri yorulmadan yapılır, aralarında 1–2 dk dinlen. Tonaja ve set sayısına dahil edilmez.</p>`
    : `<div class="text-xs text-slate-500">Isınma önerisi için çalışma kilosu gir (hafif kilolarda ayrı ısınma gerekmez).</div>`}
  </div>`;
  out.innerHTML = html;
}

// ---------------------------------------------------------------------------
// PLANLANAN / YENEN
// ---------------------------------------------------------------------------
function eatenTotals() {
  let p = 0, c = 0, f = 0, cal = 0;
  dayMeals().forEach(m => { if (!m.done) return; m.items.forEach(i => { const x = calcItemMacros(i); p += x.p; c += x.c; f += x.f; cal += x.cal; }); });
  return { p, c, f, cal };
}
function setMacroView(v) { state.settings.macroView = v === "plan" ? "plan" : "eaten"; renderAll(); }

// ---------------------------------------------------------------------------
// AKILLI KALORİ KOÇU
// Tartı trendi (doğrusal regresyon) + günlük alınan kalori ortalamasından gerçek
// enerji harcamanı (TDEE) tahmin eder ve hedef kalorine düzeltme önerir.
// ---------------------------------------------------------------------------
const COACH_WINDOW_DAYS = 28;
const COACH_MAX_STEP = 250; // tek seferde en fazla ±250 kcal (kademeli düzeltme)

function coachAnalysis() {
  const now = Date.now();
  const from = now - COACH_WINDOW_DAYS * DAY_MS;
  const pts = state.weightLogs.filter(l => l.ts && l.ts >= from && num(l.weight) > 0).map(l => ({ t: l.ts, w: num(l.weight) }));
  const res = { ready: false, n: pts.length, spanDays: 0 };
  if (pts.length >= 2) res.spanDays = (pts[pts.length - 1].t - pts[0].t) / DAY_MS;
  if (pts.length < 4 || res.spanDays < 10) return res;

  // Doğrusal regresyon: kg/gün
  const t0 = pts[0].t;
  const xs = pts.map(p => (p.t - t0) / DAY_MS), ys = pts.map(p => p.w);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let sxy = 0, sxx = 0;
  xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) * (x - mx); });
  if (sxx <= 0) return res;
  const slope = sxy / sxx;
  const weekly = slope * 7;

  // Bu aralıktaki günlük kalori ortalaması (öğün tiki varsa yenen, yoksa plan)
  const fromKey = todayStr(new Date(pts[0].t));
  const intakes = Object.keys(state.dailyLogs).filter(k => k >= fromKey).map(k => {
    const d = state.dailyLogs[k];
    return num(d.mealsDone) > 0 && num(d.eatenKcal) > 0 ? num(d.eatenKcal) : num(d.kcal);
  }).filter(v => v > 0);
  const targets = getTargets();
  const intakeAssumed = intakes.length < 5;
  const avgIntake = intakeAssumed ? targets.calTarget : intakes.reduce((a, b) => a + b, 0) / intakes.length;

  const tdeeEst = Math.round(avgIntake - (weekly * 7700) / 7);
  const female = state.settings.sex === "female";
  const floor = female ? 1400 : 1750;
  const desired = Math.max(floor, tdeeEst - state.deficit);
  const fullDelta = Math.round((desired - targets.calTarget) / 50) * 50;
  let delta = Math.max(-COACH_MAX_STEP, Math.min(COACH_MAX_STEP, fullDelta));
  const adj = num(state.settings.calAdjust, 0);
  if (adj + delta > 1000) delta = 1000 - adj;
  if (adj + delta < -1000) delta = -1000 - adj;

  const expectedWeekly = -(state.deficit * 7) / 7700;
  const pctPerWeek = (weekly / state.weight) * 100;
  return {
    ready: true, n: pts.length, spanDays: res.spanDays, weekly, expectedWeekly, pctPerWeek,
    avgIntake: Math.round(avgIntake), intakeDays: intakes.length, intakeAssumed,
    tdeeEst, tdeeFormula: targets.tdee, desired, delta, fullDelta, newTarget: targets.calTarget + delta, calTarget: targets.calTarget,
    tooFast: pctPerWeek < -1.0, gaining: weekly > 0.1 && state.deficit > 0
  };
}

function coachCardHtml() {
  const a = coachAnalysis();
  const adj = num(state.settings.calAdjust, 0);
  const adjLine = adj !== 0
    ? `<div class="flex items-center justify-between gap-2 text-xs bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-1.5">
        <span class="text-slate-300">Uygulanan koç düzeltmesi: <b class="${adj > 0 ? "text-emerald-400" : "text-amber-400"}">${adj > 0 ? "+" : ""}${adj} kcal</b>${state.settings.coachAppliedAt ? ` <span class="text-slate-500">(${fmtDate(state.settings.coachAppliedAt)})</span>` : ""}</span>
        <button onclick="resetCoachAdjust()" class="text-slate-400 underline shrink-0">Sıfırla</button>
      </div>` : "";

  if (!a.ready) {
    return `
      <div class="card p-4 space-y-3">
        <h3 class="font-bold text-base text-white">🧠 Akıllı Kalori Koçu</h3>
        <div class="text-xs text-slate-300 bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-1.5">
          <div>Koçun senin gerçek metabolizmanı hesaplayabilmesi için son 4 haftada <b>en az 4 tartı</b> ve ilk ile son tartı arasında <b>en az 10 gün</b> olmalı.</div>
          <div class="text-slate-400">Şu an: ${a.n} tartı${a.n >= 2 ? `, ${Math.floor(a.spanDays)} gün aralık` : ""}.</div>
        </div>
        <p class="text-[11px] text-slate-500">İpucu: Haftada 3–4 kez, sabah tuvaletten sonra ve aç karnına tartılıp 📌 Tartıyı Kaydet'e bas. Öğünlerini ✓ ile işaretlersen tahmin daha da isabetli olur.</p>
        ${adjLine}
      </div>`;
  }

  const sinceApply = state.settings.coachAppliedAt ? Math.floor((Date.now() - state.settings.coachAppliedAt) / DAY_MS) : null;
  const fresh = sinceApply != null && sinceApply < 7;
  const fmtW = v => (v > 0 ? "+" : "") + v.toFixed(2).replace(".", ",");
  let verdict, cls, showApply = false;
  const stepNote = Math.abs(a.fullDelta) > Math.abs(a.delta)
    ? `<div class="mt-1.5 opacity-90">Tam düzeltme ${a.fullDelta > 0 ? "+" : ""}${a.fullDelta} kcal olurdu; enerjin ve antrenman performansın düşmesin diye bunu kademeli yapıyoruz. Bir hafta sonra koç kalanını yeniden değerlendirir.</div>` : "";
  if (Math.abs(a.delta) < 100) {
    verdict = "✅ Doğru yoldasın. Kilo değişimin hedeflediğin hıza yakın; kalorinde değişiklik gerekmiyor.";
    cls = "bg-emerald-950/60 border-emerald-700/60 text-emerald-100";
  } else if (a.delta < 0) {
    verdict = `📉 Beklediğinden yavaş ilerliyorsun. Hedef kalorini <b>${Math.abs(a.delta)} kcal</b> azaltıp <b>${a.newTarget} kcal</b> yapmanı öneriyorum.` + stepNote;
    cls = "bg-amber-950/60 border-amber-700/60 text-amber-100"; showApply = true;
  } else {
    verdict = `📈 Beklediğinden hızlı veriyorsun. Kas kaybını önlemek için hedef kalorini <b>+${a.delta} kcal</b> artırıp <b>${a.newTarget} kcal</b> yapmanı öneriyorum.` + stepNote;
    cls = "bg-sky-950/60 border-sky-700/60 text-sky-100"; showApply = true;
  }
  if (a.tooFast) verdict += `<div class="mt-1.5">⚠️ Haftada vücut ağırlığının %${fmtNum(Math.abs(a.pctPerWeek))}'ini kaybediyorsun; %1'in üstü kas kaybı riskini artırır.</div>`;
  if (a.gaining) verdict += `<div class="mt-1.5">Açık verdiğin halde kilo alıyorsun. Porsiyonları tartarak girmeyi ve öğün tiklerini kontrol etmeyi öneririm.</div>`;

  const row = (l, v) => `<div class="flex justify-between gap-2"><span class="text-slate-400">${l}</span><span class="text-slate-100 font-semibold text-right">${v}</span></div>`;
  return `
    <div class="card p-4 space-y-3">
      <div class="flex justify-between items-center gap-2"><h3 class="font-bold text-base text-white">🧠 Akıllı Kalori Koçu</h3><span class="text-[11px] text-slate-500">${a.n} tartı • ${Math.floor(a.spanDays)} gün</span></div>
      <div class="text-xs bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-1.5">
        ${row("Gerçek kilo değişimi", fmtW(a.weekly) + " kg/hafta")}
        ${row("Hedeflenen değişim", fmtW(a.expectedWeekly) + " kg/hafta")}
        ${row("Ortalama kalori alımı", a.avgIntake + " kcal" + (a.intakeAssumed ? " *" : ` (${a.intakeDays} gün)`))}
        ${row("Tahmini gerçek harcaman (TDEE)", a.tdeeEst + " kcal")}
        ${row("Formülün tahmini", a.tdeeFormula + " kcal")}
      </div>
      <div class="text-xs border rounded-xl px-3 py-2.5 ${cls}">${verdict}</div>
      ${showApply ? (fresh
        ? `<div class="text-[11px] text-slate-400">Son ayardan bu yana ${sinceApply} gün geçti. Vücudun yeni kaloriye uyum sağlasın diye bir sonraki düzeltme için en az 7 gün beklemeni öneririm.</div>
           <button onclick="applyCoach()" class="w-full bg-slate-800 border border-slate-600 text-slate-200 text-xs font-semibold py-2 rounded-lg">Yine de uygula (${a.delta > 0 ? "+" : ""}${a.delta} kcal)</button>`
        : `<button onclick="applyCoach()" class="w-full bg-emerald-600 text-white text-xs font-semibold py-2.5 rounded-lg">✓ Öneriyi uygula (${a.delta > 0 ? "+" : ""}${a.delta} kcal → ${a.newTarget} kcal)</button>`) : ""}
      ${adjLine}
      <p class="text-[11px] text-slate-500">${a.intakeAssumed ? "* Yeterli günlük kayıt olmadığı için planladığın kaloriyi yediğin varsayıldı. " : ""}İlk 1–2 hafta su kaybı nedeniyle kilo hızlı düşebilir; koçun önerileri 3–4 hafta veriyle en isabetli hale gelir.</p>
    </div>`;
}

function applyCoach() {
  const a = coachAnalysis();
  if (!a.ready || a.delta === 0) return;
  state.settings.calAdjust = num(state.settings.calAdjust, 0) + a.delta;
  state.settings.coachAppliedAt = Date.now();
  toast(`🧠 Hedef kalori ${a.delta > 0 ? "+" : ""}${a.delta} kcal ayarlandı`);
  renderAll();
}
async function resetCoachAdjust() {
  if (!(await askConfirm("Koç düzeltmesi sıfırlansın mı?", "Hedef kalorin formülün hesapladığı değere döner.", "Sıfırla"))) return;
  state.settings.calAdjust = 0;
  state.settings.coachAppliedAt = 0;
  renderAll();
}
function coachHintText() {
  const a = coachAnalysis();
  if (!a.ready || Math.abs(a.delta) < 100) return "";
  const applied = num(state.settings.coachAppliedAt, 0);
  if (applied && Date.now() - applied < 7 * DAY_MS) return "";
  return `🧠 Koç önerisi: hedef kalorini ${Math.abs(a.delta)} kcal ${a.delta > 0 ? "artır" : "azalt"} → İlerleme`;
}

// ============================================================================
// v8 — GERİ AL, SIRADAKİ GÜN, AKTİF ANTRENMAN, ÖĞÜN PLANLARI, TAKVİYELER,
//       VÜCUT ÖLÇÜLERİ, ANTRENMAN SÜRESİ, PAYLAŞILABİLİR ÖZET KARTI
// ============================================================================

// ---------------------------------------------------------------------------
// GERİ AL
// ---------------------------------------------------------------------------
let undoSnap = null;
function snapshot() { undoSnap = JSON.stringify(state); }
function offerUndo(msg) { toast(msg, "ok", { label: "↶ Geri al", fn: doUndo }); }
function doUndo() {
  if (!undoSnap) return;
  state = normalizeState(JSON.parse(undoSnap));
  undoSnap = null;
  renderAll();
  toast("↶ Geri alındı");
}

// ---------------------------------------------------------------------------
// SIRADAKİ ANTRENMAN GÜNÜ
// ---------------------------------------------------------------------------
function nextDayIdx() {
  const logs = state.workoutLogs;
  if (!logs.length || !state.workoutDays.length) return null;
  const last = logs[logs.length - 1];
  let i = last.dayId ? state.workoutDays.findIndex(d => d.id === last.dayId) : -1;
  if (i < 0) i = state.workoutDays.findIndex(d => d.name === last.dayName);
  if (i < 0) return null;
  return (i + 1) % state.workoutDays.length;
}
function workoutInProgress() {
  return state.workoutDays.some(d => d.exercises.some(e => e.sets.some(s => s.done)));
}
function autoSelectNextDay() {
  if (workoutInProgress()) return;
  const n = nextDayIdx();
  if (n != null) state.activeWorkoutDayIdx = n;
}

// Aktif antrenman: sıradaki yapılmamış set
function nextSetPtr(day) {
  for (let e = 0; e < day.exercises.length; e++) {
    const s = day.exercises[e].sets.findIndex(x => !x.done);
    if (s >= 0) return { e, s };
  }
  return null;
}
function scrollToExercise(idx) {
  requestAnimationFrame(() => {
    const el = $("exCard_" + idx);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

// ---------------------------------------------------------------------------
// ANTRENMAN SÜRESİ
// ---------------------------------------------------------------------------
const MAX_WORKOUT_MIN = 300; // 5 saati aşan süre "unutulmuş" sayılır, kaydedilmez
function fmtDuration(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600), m = Math.floor((totalSec % 3600) / 60), s = totalSec % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
function fmtMinutes(min) {
  min = Math.round(min);
  return min >= 60 ? `${Math.floor(min / 60)} sa ${min % 60} dk` : `${min} dk`;
}
function updateDurationUI() {
  const el = $("gymDuration");
  if (!el) return;
  const st = state.workoutStartedAt;
  el.classList.toggle("hidden", !st);
  if (st) el.textContent = "⏱ " + fmtDuration(Date.now() - st);
}
setInterval(() => { if (state.workoutStartedAt && state.activeTab === "gym" && document.visibilityState === "visible") updateDurationUI(); }, 1000);

// ---------------------------------------------------------------------------
// ÖĞÜN PLANLARI (Antrenman / Dinlenme günü ayrı menü)
// ---------------------------------------------------------------------------
function curMeals() {
  return state.settings.separatePlans && state.dayType === "rest" ? state.restMeals : state.meals;
}
function otherMeals() {
  return curMeals() === state.meals ? state.restMeals : state.meals;
}
function toggleSeparatePlans(on) {
  if (on && (!Array.isArray(state.restMeals) || !state.restMeals.length)) {
    state.restMeals = clone(state.meals).map(m => ({ ...m, id: (m.id || "meal") + "_rest", done: false }));
    toast("🛋️ Dinlenme günü menüsü, mevcut menünün kopyası olarak oluşturuldu. Artık ayrı düzenleyebilirsin.");
  }
  state.settings.separatePlans = !!on;
  renderAll();
}
async function addMeal() {
  const meals = curMeals();
  const t = await askText("Yeni öğünün adı", `${meals.length + 1}. Öğün: `);
  if (!t || !t.trim()) return;
  meals.push({ id: "meal_" + Date.now(), title: t.trim(), targetNote: "", done: false, items: [] });
  renderAll();
  setTimeout(() => { const c = $("mealsContainer"); if (c.lastElementChild) c.lastElementChild.scrollIntoView({ behavior: "smooth", block: "center" }); }, 60);
}
async function editMeal(mIdx) {
  const m = curMeals()[mIdx];
  if (!m) return;
  const t = await askText("Öğün adı", m.title);
  if (t === null) return;
  if (t.trim()) m.title = t.trim();
  const n = await askText("Kısa not", m.targetNote || "", "örn: Hedef 50 g protein", "Boş bırakabilirsin.");
  if (n !== null) m.targetNote = n.trim();
  renderAll();
}
function deleteMeal(mIdx) {
  const meals = curMeals();
  snapshot();
  const t = meals[mIdx].title;
  meals.splice(mIdx, 1);
  renderAll();
  offerUndo(`🗑️ "${t}" silindi`);
}
function moveMeal(mIdx, dir) {
  const meals = curMeals();
  const j = mIdx + dir;
  if (j < 0 || j >= meals.length) return;
  [meals[mIdx], meals[j]] = [meals[j], meals[mIdx]];
  renderAll();
}
function copyMeal(mIdx) {
  const src = curMeals()[mIdx];
  const copy = { ...clone(src), id: "meal_" + Date.now(), done: false };
  if (state.settings.separatePlans) {
    otherMeals().push(copy);
    toast(`⧉ "${src.title}" ${curMeals() === state.meals ? "dinlenme" : "antrenman"} günü menüsüne kopyalandı`);
  } else {
    copy.title = src.title + " (kopya)";
    curMeals().splice(mIdx + 1, 0, copy);
    toast("⧉ Öğün kopyalandı");
  }
  renderAll();
}

// ---------------------------------------------------------------------------
// TAKVİYELER (düzenlenebilir liste)
// ---------------------------------------------------------------------------
let suppEdit = false;
// v17: takviye zamanlama etiketleri
const SUPP_TIMES = [["morning", "Sabah tok"], ["pre", "Antrenman öncesi"], ["post", "Antrenman sonrası"], ["bed", "Yatmadan önce"], ["custom", "Özel"]];
// v24: Bugün'de 3 ana grup (zaman → grup); özel etiketler kendi başlığıyla, zamansızlar "Diğer"
const SUPP_GROUPS = [["İlk öğünle", "sun", ["morning"]], ["Antrenman / Gün içi", "zap", ["pre", "post"]], ["Akşam / Uyku öncesi", "moon", ["bed"]]];
function normalizeSuppDose(x) {
  if (x.note !== undefined) { x.note = String(x.note || "").slice(0, 40); if (!x.note) delete x.note; }
  if (x.preset !== undefined && !SUPP_PRESETS.some(p => p.key === x.preset)) delete x.preset;
  const d = num(x.dose, 0);
  if (!(d > 0)) { SUPP_DOSE_KEYS.forEach(k => delete x[k]); return; }
  x.dose = r2(d);
  x.unit = String(x.unit || "").slice(0, 16);
  x.step = num(x.step, 0) > 0 ? r2(num(x.step)) : 1;
  x.min = num(x.min, 0) > 0 ? Math.min(r2(num(x.min)), x.dose) : Math.min(x.step, x.dose);
  x.max = num(x.max, 0) >= x.dose ? r2(num(x.max)) : Math.max(x.dose, x.step * 10);
}
// Elle yazılan doz için mantıklı adım ve sınırlar
function suppDoseDefaults(dose, unit) {
  const u = normSearch(unit);
  let step = /olcek|scoop/.test(u) ? 0.5 : /^(mcg|µg|ug|iu)$/.test(u) ? (dose >= 1000 ? 500 : dose >= 100 ? 50 : 5)
    : u === "mg" ? (dose >= 100 ? 50 : 5) : dose >= 100 ? 50 : dose >= 20 ? 5 : dose % 1 ? 0.5 : 1;
  step = Math.min(step, dose);
  return { step, min: step, max: r2(Math.max(dose * 4, step * 10)) };
}
function suppTimeLabel(s) {
  if (s.time === "custom") return s.timeLabel || "Özel";
  const t = SUPP_TIMES.find(x => x[0] === s.time);
  return t ? t[1] : "";
}
function suppDoseText(s) { return s.dose ? `${fmtDose(s.dose)} ${s.unit || ""}`.trim() : ""; }
function suppPillHtml(s) {
  const on = !!state.supplements[s.id], sid = esc(JSON.stringify(s.id));
  const sub = [s.dose ? `<b>${esc(suppDoseText(s))}</b>` : "", esc(s.note || (s.time === "pre" || s.time === "post" ? suppTimeLabel(s) : ""))].filter(Boolean).join(" · ");
  const stepper = s.dose ? `<div class="n-step">
      <button onclick="changeSuppDose(${sid}, -1)" ${s.dose - s.step < s.min - 1e-9 ? "disabled" : ""} aria-label="${esc(s.name)} dozunu azalt">${svgI("minus", 18, 2.5)}</button>
      <button onclick="changeSuppDose(${sid}, 1)" ${s.dose + s.step > s.max + 1e-9 ? "disabled" : ""} aria-label="${esc(s.name)} dozunu artır">${svgI("plus", 18, 2.5)}</button>
    </div>` : "";
  return `<div class="n-pill ${on ? "taken" : ""}" data-supp-pill="${esc(s.id)}">
    <button onclick="toggleSupp(${sid})" class="n-pill-main" aria-pressed="${on ? "true" : "false"}">
      <span class="n-pill-check">${svgI("check", 14, 3)}</span>
      <span class="min-w-0"><span class="n-pill-name">${esc(s.name)}</span>${sub ? `<span class="n-pill-dose">${sub}</span>` : ""}</span>
    </button>${stepper}
  </div>`;
}
function renderSupps() {
  const list = state.supplementList;
  const done = list.filter(s => state.supplements[s.id]).length;
  $("suppCounter").textContent = `${done} / ${list.length} Tamamlandı`;
  $("suppCounter").classList.toggle("hidden", !list.length);
  $("suppBarWrap").classList.toggle("hidden", !list.length);
  $("suppBar").style.width = (list.length ? Math.round(done / list.length * 100) : 0) + "%";
  $("suppCard").classList.toggle("all-done", list.length > 0 && done === list.length);
  let html;
  if (suppEdit) {
    html = `<div class="w-full space-y-2" id="suppEditList">${list.map((s, i) => `<div class="n-pill-edit space-y-1.5" data-supp-row="${i}">
        <div class="flex items-center gap-2 min-h-[44px]">
          <span class="flex-1 min-w-0 text-[14px] font-semibold pl-1 n-text" style="overflow-wrap:anywhere">${esc(s.name)}</span>
          <button onclick="removeSupp(${i})" class="w-11 h-11 shrink-0 rounded-full flex items-center justify-center n-over" aria-label="${esc(s.name)} sil">${svgI("trash", 18)}</button>
        </div>
        <div class="flex items-center gap-2">
          <select onchange="setSuppTime(${i}, this.value)" class="n-in h-11 flex-1 min-w-0" aria-label="${esc(s.name)} ne zaman alınır?">
            <option value="" ${!s.time ? "selected" : ""}>Zaman seç</option>
            ${SUPP_TIMES.map(([k, l]) => `<option value="${k}" ${s.time === k ? "selected" : ""}>${k === "custom" && s.time === "custom" ? esc(suppTimeLabel(s)) : l}</option>`).join("")}
          </select>
          <button onclick="editSuppDose(${i})" class="n-chip shrink-0" data-supp-dose="${i}" aria-label="${esc(s.name)} dozu">${s.dose ? "Doz: " + esc(suppDoseText(s)) : "+ Doz"}</button>
        </div>
      </div>`).join("")}</div>`;
    const presets = SUPP_PRESETS.filter(p => !list.some(s => s.preset === p.key || p.m.test(normSearch(s.name))));
    if (presets.length) html += `<div class="n-sgroup">Hazır takviyeler</div><div class="flex flex-wrap gap-2" id="suppPresets">${presets.map(p =>
      `<button onclick="addPresetSupp('${p.key}')" class="n-chip add">+ ${esc(p.name)}</button>`).join("")}</div>`;
    html += `<div class="flex flex-wrap gap-2 pt-1"><button onclick="addSupp()" class="n-chip add">+ Ekle</button>
      <button onclick="suppEdit = false; renderAll();" class="n-chip on">${svgI("check", 14, 3)}Bitti</button></div>`;
  } else {
    const groups = SUPP_GROUPS.map(([l, ic, times]) => [l, ic, times.flatMap(t => list.filter(s => s.time === t))]);
    [...new Set(list.filter(s => s.time === "custom").map(suppTimeLabel))]
      .forEach(l => groups.push([l, "clock", list.filter(s => s.time === "custom" && suppTimeLabel(s) === l)]));
    const untimed = list.filter(s => !suppTimeLabel(s));
    const anyTimed = groups.some(g => g[2].length);
    if (untimed.length) groups.push([anyTimed ? "Diğer" : "", "", untimed]);
    html = groups.filter(g => g[2].length).map(([l, ic, ss]) =>
      (l ? `<div class="n-sgroup" data-supp-group="${esc(l)}">${ic ? svgI(ic, 15) : ""}${esc(l)}</div>` : "")
      + `<div class="n-pills">${ss.map(suppPillHtml).join("")}</div>`).join("");
    if (!list.length) html = `<p class="text-[13px] n-dim">Takviye listen boş. Düzenle'den ekleyebilirsin.</p>`;
    html += `<div class="pt-1"><button onclick="suppEdit = true; renderAll();" class="n-chip" aria-label="Takviyeleri düzenle">${svgI("edit", 14)}Düzenle</button></div>`;
  }
  $("suppList").innerHTML = html;
}
function changeSuppDose(id, dir) {
  const s = state.supplementList.find(x => x.id === id);
  if (!s || !s.dose) return;
  const nd = r2(s.dose + dir * s.step);
  if (nd < s.min - 1e-9 || nd > s.max + 1e-9) return;
  s.dose = nd;
  renderAll();
}
async function editSuppDose(i) {
  const s = state.supplementList[i];
  if (!s) return;
  const v = await askText("Doz ve birim", suppDoseText(s), "örn: 5 g · 2 softjel · 1 ölçek", "Boş bırakırsan doz gösterilmez.", "Kaydet");
  if (v === null) return;
  const t = String(v).trim();
  if (!t) {   // v26: doz silme Geri al'lı
    if (!SUPP_DOSE_KEYS.some(k => s[k] != null)) return;
    snapshot(); SUPP_DOSE_KEYS.forEach(k => delete s[k]); renderAll(); offerUndo(`${s.name}: doz kaldırıldı`); return;
  }
  const m = t.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  const d = m ? r2(num(m[1], 0)) : 0;
  if (!(d > 0) || d > 100000) { sayAlert("Doz anlaşılamadı", "Önce sayı, sonra birim yaz (örn: 5 g veya 2 softjel)."); return; }
  const unit = m[2].trim().slice(0, 16);
  if (s.dose && d >= s.min && d <= s.max && normSearch(unit) === normSearch(s.unit)) s.dose = d;   // aynı birim: adım/sınır korunur
  else Object.assign(s, { dose: d, unit }, suppDoseDefaults(d, unit));
  renderAll();
}
function addPresetSupp(key) {
  const p = SUPP_PRESETS.find(x => x.key === key);
  if (!p) return;
  const { m, key: k, ...rest } = p;
  state.supplementList.push({ id: "sup_" + k + "_" + Date.now(), preset: k, ...clone(rest) });
  renderAll();
}
async function setSuppTime(i, v) {
  const s = state.supplementList[i];
  if (!s) return;
  if (v === "custom") {
    const l = await askText("Özel zaman etiketi", s.time === "custom" ? s.timeLabel || "" : "", "örn: Öğle yemeğiyle");
    if (l === null) { renderAll(); return; }
    s.time = "custom";
    s.timeLabel = l.trim().slice(0, 24) || "Özel";
  } else if (SUPP_TIMES.some(x => x[0] === v)) { s.time = v; delete s.timeLabel; }
  else { delete s.time; delete s.timeLabel; }
  renderAll();
}
async function addSupp() {
  const n = await askText("Takviye adı", "", "örn: D3 Vitamini", "", "Ekle");
  if (!n || !n.trim()) return;
  state.supplementList.push({ id: "sup_" + Date.now(), name: n.trim().slice(0, 40) });
  renderAll();
}
function removeSupp(i) {
  snapshot();
  const s = state.supplementList.splice(i, 1)[0];
  if (s) delete state.supplements[s.id];
  renderAll();
  offerUndo(`🗑️ ${s ? s.name : "Takviye"} kaldırıldı`);
}

// ---------------------------------------------------------------------------
// VÜCUT ÖLÇÜLERİ
// ---------------------------------------------------------------------------
// [anahtar, ad, azalması mı iyi]
const MEASURES = [["bel", "Bel", true], ["kalca", "Kalça", true], ["gogus", "Göğüs", false], ["kol", "Kol (pazı)", false], ["bacak", "Bacak (üst)", false], ["boyun", "Boyun", true]];
let measureSel = "bel";

function openMeasureModal() {
  const last = state.measurements[state.measurements.length - 1] || {};
  $("chartTitle").textContent = "📏 Ölçü Ekle (cm)";
  $("chartBody").innerHTML = `
    <div class="grid grid-cols-2 gap-2 text-xs">
      ${MEASURES.map(([k, n]) => `<div><label class="block text-slate-400 mb-1">${n}</label>
        <input id="ms_${k}" type="text" inputmode="decimal" placeholder="—" value="${last[k] ? esc(fmtNum(last[k])) : ""}" class="w-full p-2 rounded-lg text-base text-center" /></div>`).join("")}
    </div>
    <p class="text-[11px] text-slate-500 mt-2">İpucu: Haftada veya iki haftada bir, sabah aç karnına ve mezurayı sıkmadan ölç. Bel: göbek deliği hizası. Kol ve bacak: hep aynı tarafı, en kalın yerinden. Ölçmediğin alanı boş bırakabilirsin.</p>
    <div class="flex justify-end gap-2 mt-3">
      <button onclick="closeModal('chartModal')" class="bg-slate-800 text-slate-300 text-xs px-3 py-2 rounded-lg">İptal</button>
      <button onclick="saveMeasurement()" class="bg-emerald-600 text-white text-xs px-4 py-2 rounded-lg font-semibold">Kaydet</button>
    </div>`;
  openModal("chartModal");
}
function saveMeasurement() {
  const now = Date.now();
  const entry = { ts: now };
  let any = false;
  MEASURES.forEach(([k]) => {
    const raw = $("ms_" + k).value.trim();
    if (!raw) return;
    const v = num(raw, 0);
    if (v >= 10 && v <= 250) { entry[k] = round1(v); any = true; }
  });
  if (!any) { sayAlert("Ölçü girilmedi", "En az bir ölçüyü 10–250 cm arasında gir."); return; }
  const last = state.measurements[state.measurements.length - 1];
  if (last && todayStr(new Date(last.ts)) === todayStr()) state.measurements[state.measurements.length - 1] = entry;
  else state.measurements.push(entry);
  closeModal("chartModal");
  toast("📏 Ölçüler kaydedildi");
  renderAll();
}
function deleteMeasurement(i) {
  snapshot();
  state.measurements.splice(i, 1);
  renderAll();
  offerUndo("🗑️ Ölçü kaydı silindi");
}

function measureCardHtml() {
  const ms = state.measurements;
  if (!ms.length) {
    return `
      <div class="card p-4 space-y-3">
        <div class="flex justify-between items-center gap-2"><h3 class="font-bold text-base text-white">📏 Vücut Ölçüleri</h3>
          <button onclick="openMeasureModal()" class="text-[11px] bg-emerald-900/70 text-emerald-200 px-2 py-1 rounded border border-emerald-700/50">+ Ölçü Ekle</button></div>
        <div class="text-xs text-slate-500">Kilo yerinde sayarken belin inceliyorsa yağ yakıp kas kazanıyorsun demektir. İlk ölçünü ekle, değişimi burada takip et.</div>
      </div>`;
  }
  const firstOf = k => ms.find(m => m[k] != null);
  const lastOf = k => { for (let i = ms.length - 1; i >= 0; i--) if (ms[i][k] != null) return ms[i]; return null; };
  const cells = MEASURES.map(([k, n, lowerBetter]) => {
    const l = lastOf(k);
    if (!l) return "";
    const f = firstOf(k);
    const d = round1(l[k] - f[k]);
    const good = d === 0 ? null : (lowerBetter ? d < 0 : d > 0);
    return `<button onclick="measureSel='${k}'; renderProgress();" class="text-left bg-slate-900/80 border ${measureSel === k ? "border-emerald-500" : "border-slate-800"} rounded-xl p-2.5 min-w-0">
      <div class="text-[11px] text-slate-400 truncate">${n}</div>
      <div class="text-base font-bold text-slate-100">${fmtNum(l[k])} <span class="text-[10px] font-normal text-slate-500">cm</span></div>
      <div class="text-[10px] ${good == null ? "text-slate-500" : good ? "text-emerald-400" : "text-rose-400"}">${d === 0 ? "değişim yok" : (d > 0 ? "+" : "") + fmtNum(d) + " cm"}</div>
    </button>`;
  }).join("");
  if (!MEASURES.some(([k]) => k === measureSel && lastOf(k))) { const f = MEASURES.find(([k]) => lastOf(k)); if (f) measureSel = f[0]; }
  const selName = (MEASURES.find(([k]) => k === measureSel) || ["", ""])[1];
  const pts = ms.filter(m => m[measureSel] != null).slice(-30).map(m => ({ label: fmtDate(m.ts), y: m[measureSel] }));
  const rows = ms.map((m, i) => ({ m, i })).reverse().slice(0, 4).map(({ m, i }) => `
    <div class="flex items-center justify-between gap-2 text-xs bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-1.5">
      <span class="text-slate-400 shrink-0">${fmtDate(m.ts)}</span>
      <span class="text-slate-300 truncate text-right">${MEASURES.filter(([k]) => m[k] != null).map(([k, n]) => `${n.split(" ")[0]} ${fmtNum(m[k])}`).join(" • ")}</span>
      <button onclick="deleteMeasurement(${i})" class="text-slate-500 text-base leading-none shrink-0">&times;</button>
    </div>`).join("");
  return `
    <div class="card p-4 space-y-3">
      <div class="flex justify-between items-center gap-2"><h3 class="font-bold text-base text-white">📏 Vücut Ölçüleri</h3>
        <button onclick="openMeasureModal()" class="text-[11px] bg-emerald-900/70 text-emerald-200 px-2 py-1 rounded border border-emerald-700/50">+ Ölçü Ekle</button></div>
      <div class="grid grid-cols-3 gap-2">${cells}</div>
      <div class="text-[11px] text-slate-400">${esc(selName)} değişimi (kutulara dokunarak grafiği değiştir)</div>
      ${lineChart(pts, "#a78bfa", "cm")}
      <div class="space-y-1">${rows}</div>
    </div>`;
}

// ---------------------------------------------------------------------------
// PAYLAŞILABİLİR ANTRENMAN ÖZET KARTI (1080×1350 PNG)
// ---------------------------------------------------------------------------
let shareFile = null;

function logExerciseLines(log) {
  if (!log.id) return [];
  const out = [];
  Object.keys(state.exerciseHistory).forEach(k => state.exerciseHistory[k].forEach(sess => {
    if (sess.logId !== log.id) return;
    let txt;
    if (sess.kind === "cardio") { const t = cardioTotals(sess.sets, false); txt = `${fmtNum(t.min)} dk` + (t.km > 0 ? ` • ${fmtNum(t.km)} km` : ""); }
    else if (sess.kind === "time") txt = `${sess.sets.length} × ${Math.max(...sess.sets.map(s => num(s.sec)))} sn`;
    else {
      const best = sess.sets.reduce((b, s) => (e1rm(s.kg, s.reps) > e1rm(b.kg, b.reps) ? s : b), sess.sets[0]);
      txt = num(best.kg) > 0 ? `${sess.sets.length} set • en iyi ${fmtKg(num(best.kg))}×${num(best.reps)}` : `${sess.sets.length} set • ${num(best.reps)} tekrar`;
    }
    out.push({ name: sess.name || k, txt, order: out.length });
  }));
  return out;
}

function fitText(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxW) t = t.slice(0, -1);
  return t + "…";
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

async function buildShareCanvas(log) {
  const W = 1080, H = 1350;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");
  const F = '-apple-system, "SF Pro Display", "Segoe UI", Roboto, sans-serif';

  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#0b1120"); g.addColorStop(1, "#14223d");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W - 120, 120, 10, W - 120, 120, 520);
  glow.addColorStop(0, "rgba(16,185,129,0.28)"); glow.addColorStop(1, "rgba(16,185,129,0)");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

  try {
    const img = new Image();
    img.src = "icon.png";
    await img.decode();
    ctx.save(); roundRect(ctx, 72, 72, 120, 120, 28); ctx.clip(); ctx.drawImage(img, 72, 72, 120, 120); ctx.restore();
  } catch (e) { /* logo yüklenemezse atla */ }
  ctx.fillStyle = "#f8fafc"; ctx.font = `800 64px ${F}`; ctx.textBaseline = "middle";
  ctx.fillText("AYK", 220, 132);
  const aw = ctx.measureText("AYK").width;
  ctx.fillStyle = "#34d399"; ctx.fillText("+", 220 + aw, 132);
  ctx.fillStyle = "#94a3b8"; ctx.font = `500 32px ${F}`; ctx.textAlign = "right";
  ctx.fillText(log.ts ? new Date(log.ts).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }) : (log.date || ""), W - 72, 132);
  ctx.textAlign = "left";

  ctx.fillStyle = "#34d399"; ctx.font = `700 30px ${F}`; ctx.fillText("ANTRENMAN TAMAMLANDI 💪", 72, 290);
  ctx.fillStyle = "#ffffff"; ctx.font = `800 64px ${F}`; ctx.fillText(fitText(ctx, log.dayName || "Antrenman", W - 144), 72, 360);

  const stats = [];
  if (num(log.durationMin) > 0) stats.push(["⏱ SÜRE", fmtMinutes(num(log.durationMin)), "#f8fafc"]);
  stats.push(["⚡ TONAJ", Math.round(num(log.volume)).toLocaleString("tr-TR") + " kg", "#fbbf24"]);
  if (num(log.prs) > 0) stats.push(["🏆 REKOR", String(num(log.prs)), "#fbbf24"]);
  if (num(log.cardioMin) > 0) stats.push(["🏃 KARDİYO", fmtNum(num(log.cardioMin)) + " dk" + (num(log.cardioKm) > 0 ? " • " + fmtNum(num(log.cardioKm)) + " km" : ""), "#7dd3fc"]);
  stats.push(["✅ SET", String(num(log.sets)), "#38bdf8"]);
  const exLines = logExerciseLines(log);
  if (exLines.length) stats.push(["🏋️ HAREKET", String(exLines.length), "#a78bfa"]);
  const shown = stats.slice(0, 4);
  const cardW = (W - 144 - 24) / 2, cardH = 180;
  shown.forEach((s, i) => {
    const x = 72 + (i % 2) * (cardW + 24), y = 430 + Math.floor(i / 2) * (cardH + 24);
    const w = (i === shown.length - 1 && shown.length % 2 === 1) ? W - 144 : cardW;
    ctx.fillStyle = "rgba(30,41,59,0.92)"; roundRect(ctx, x, y, w, cardH, 32); ctx.fill();
    ctx.strokeStyle = "#334155"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "#94a3b8"; ctx.font = `600 28px ${F}`; ctx.fillText(s[0], x + 32, y + 52);
    ctx.fillStyle = s[2]; ctx.font = `800 58px ${F}`; ctx.fillText(fitText(ctx, s[1], w - 64), x + 32, y + 122);
  });

  const lines = exLines.slice(0, 7);
  let y = 430 + Math.ceil(shown.length / 2) * (cardH + 24) + 40;
  if (lines.length) {
    ctx.fillStyle = "#64748b"; ctx.font = `700 26px ${F}`; ctx.fillText("HAREKETLER", 72, y); y += 52;
    lines.forEach(l => {
      ctx.fillStyle = "#e2e8f0"; ctx.font = `600 32px ${F}`;
      ctx.fillText(fitText(ctx, l.name, 560), 72, y);
      ctx.fillStyle = "#34d399"; ctx.font = `600 28px ${F}`; ctx.textAlign = "right";
      ctx.fillText(fitText(ctx, l.txt, 380), W - 72, y);
      ctx.textAlign = "left";
      y += 50;
    });
  }
  ctx.fillStyle = "#475569"; ctx.font = `500 26px ${F}`; ctx.textAlign = "center";
  ctx.fillText("AYK+ ile kaydedildi", W / 2, H - 56);
  ctx.textAlign = "left";
  return cv;
}

async function openShareCard(logIdx) {
  const log = state.workoutLogs[logIdx];
  if (!log) return;
  $("chartTitle").textContent = "Antrenman Özeti";
  $("chartBody").innerHTML = `<div class="text-xs text-slate-400 text-center py-10">Kart hazırlanıyor...</div>`;
  openModal("chartModal");
  try {
    const cv = await buildShareCanvas(log);
    const blob = await new Promise(res => cv.toBlob(res, "image/png"));
    if (!blob) throw new Error("blob");
    const name = `AYK-antrenman-${log.ts ? todayStr(new Date(log.ts)) : "ozet"}.png`;
    try { shareFile = new File([blob], name, { type: "image/png" }); } catch (e) { shareFile = blob; shareFile.name = name; }
    const url = URL.createObjectURL(blob);
    $("chartBody").innerHTML = `
      <img src="${url}" alt="Antrenman özeti" class="w-full rounded-xl border border-slate-700" />
      <button onclick="shareWorkoutCard()" class="w-full mt-3 bg-emerald-600 text-white text-sm font-semibold py-2.5 rounded-lg">Paylaş / Fotoğraflara Kaydet</button>
      <p class="text-[11px] text-slate-500 mt-2 text-center">Paylaş menüsünden Instagram, WhatsApp veya "Görüntüyü Kaydet"i seçebilirsin.</p>`;
  } catch (e) {
    $("chartBody").innerHTML = `<div class="text-xs text-rose-300 text-center py-8">Kart oluşturulamadı.</div>`;
  }
}

async function shareWorkoutCard() {
  if (!shareFile) return;
  const file = shareFile;
  if (navigator.canShare && file instanceof File && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: "AYK+ Antrenman" }); return; }
    catch (e) { if (e && e.name === "AbortError") return; }
  }
  try {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url; a.download = file.name || "AYK-antrenman.png";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast("🖼️ Görsel indirildi");
  } catch (e) { toast("Paylaşılamadı. Görsele basılı tutup kaydedebilirsin.", "error"); }
}

// ============================================================================
// v9 — SU & BESLENME GEÇMİŞİ GRAFİKLERİ
// ============================================================================
let histRange = 14;

// Arşivlenmiş bir günün alınan kalori/proteini: öğün tiki varsa "yenen", yoksa "plan"
function dayIntake(d) {
  if (num(d.mealsDone) > 0 && d.eatenKcal != null && num(d.eatenKcal) > 0) return { kcal: num(d.eatenKcal), p: num(d.eatenP), eaten: true };
  return { kcal: num(d.kcal), p: num(d.p), eaten: false };
}

function historySeries(n) {
  const out = [];
  const today = logicalNow();
  const tKey = todayStr(today);
  const tg = getTargets();
  for (let i = n - 1; i >= 0; i--) {
    const dt = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i, 12);
    const key = todayStr(dt);
    const label = dt.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
    if (key === tKey) {
      const e = eatenTotals();
      out.push({ key, label, live: true, water: state.waterLiters || 0, kcal: Math.round(e.cal), p: Math.round(e.p), eaten: true, calT: tg.calTarget, proT: tg.proTarget });
      continue;
    }
    const d = state.dailyLogs[key];
    if (!d) { out.push({ key, label, empty: true }); continue; }
    const it = dayIntake(d);
    out.push({ key, label, water: num(d.water), kcal: it.kcal, p: it.p, eaten: it.eaten, calT: num(d.calTarget) || tg.calTarget, proT: num(d.proTarget) || tg.proTarget, raw: d });
  }
  return out;
}

// Çubuk grafik (SVG). items: [{label, v|null, color, ghost}]
function barChart(items, target, unit) {
  const W = 340, H = 150, pl = 30, pr = 6, pt = 14, pb = 22;
  const vals = items.filter(i => i.v != null).map(i => i.v);
  const rawMax = Math.max(target || 0, ...vals, 1) * 1.08;
  const niceStep = [0.25, 0.5, 1, 2, 5, 10, 25, 50, 100, 250, 500, 1000].find(st => rawMax / st <= 8) || 1000;
  const maxV = Math.ceil(rawMax / niceStep) * niceStep;
  const n = items.length;
  const slot = (W - pl - pr) / n;
  const bw = Math.max(3, Math.min(22, slot * 0.66));
  const y = v => pt + (H - pt - pb) * (1 - v / maxV);
  const step = n <= 7 ? 1 : n <= 14 ? 2 : 5;
  let svg = "";
  [0, 0.5, 1].forEach(f => {
    const v = maxV * (1 - f), yy = pt + (H - pt - pb) * f;
    svg += `<line x1="${pl}" x2="${W - pr}" y1="${yy}" y2="${yy}" stroke="#1e293b"/><text x="${pl - 4}" y="${yy + 3}" text-anchor="end" font-size="9" fill="#64748b">${maxV < 20 ? fmtNum(v) : Math.round(v)}</text>`;
  });
  items.forEach((it, i) => {
    const cx = pl + slot * i + slot / 2;
    if (it.v == null) {
      svg += `<line x1="${cx - bw / 2}" x2="${cx + bw / 2}" y1="${H - pb - 1}" y2="${H - pb - 1}" stroke="#334155" stroke-width="2"/>`;
    } else {
      const yy = y(Math.max(0, it.v));
      const h = Math.max(1.5, H - pb - yy);
      svg += `<rect x="${(cx - bw / 2).toFixed(1)}" y="${(H - pb - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(3, bw / 3).toFixed(1)}" fill="${it.color}" opacity="${it.ghost ? 0.4 : 1}"${it.live ? ' stroke="#f8fafc" stroke-width="1" stroke-dasharray="2 2"' : ""}/>`;
    }
    if ((n - 1 - i) % step === 0) {
      const lastLbl = i === n - 1;
      svg += `<text x="${lastLbl ? Math.min(cx + slot / 2, W - pr) : cx}" y="${H - 7}" text-anchor="${lastLbl ? "end" : "middle"}" font-size="8.5" fill="${it.live ? "#fbbf24" : "#94a3b8"}">${esc(it.live ? "Bugün" : it.label)}</text>`;
    }
  });
  if (target > 0) {
    const ty = y(target);
    svg += `<line x1="${pl}" x2="${W - pr}" y1="${ty}" y2="${ty}" stroke="#f8fafc" stroke-width="1.2" stroke-dasharray="5 4" opacity="0.7"/>
      <text x="${W - pr}" y="${ty - 4}" text-anchor="end" font-size="9" font-weight="700" fill="#e2e8f0">hedef ${maxV < 20 ? fmtNum(target) : Math.round(target)}${unit ? " " + esc(unit) : ""}</text>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" class="w-full h-auto" role="img">${svg}</svg>`;
}

function setHistRange(n) { histRange = n; renderProgress(); }

function historyCardHtml() {
  const hasAny = Object.keys(state.dailyLogs).length > 0;
  const chip = n => `<button onclick="setHistRange(${n})" class="flex-1 text-[11px] whitespace-nowrap px-2.5 py-1 rounded-full border ${histRange === n ? "bg-emerald-600 border-emerald-500 text-white font-semibold" : "bg-slate-800 border-slate-700 text-slate-300"}">${n} gün</button>`;
  const head = `<h3 class="font-bold text-base text-white">📊 Su & Beslenme Geçmişi</h3><div class="flex gap-1.5">${chip(7)}${chip(14)}${chip(30)}</div>`;
  if (!hasAny) {
    return `<div class="card p-4 space-y-3">${head}
      <div class="text-xs text-slate-500 bg-slate-900/60 border border-slate-800 rounded-xl p-3">Uygulama her gece yarısı o günün su ve beslenme özetini kaydeder. İlk günün yarın burada görünecek; günler biriktikçe grafikler dolar.</div></div>`;
  }

  const ser = historySeries(histRange);
  const waterT = waterTargetL();
  const past = ser.filter(s => !s.empty && !s.live);

  // Özet istatistikler (bugün hariç, sadece veri olan günler)
  const avgWater = past.length ? past.reduce((a, s) => a + s.water, 0) / past.length : 0;
  const waterHit = past.filter(s => s.water >= waterT).length;
  const proHit = past.filter(s => s.p >= s.proT * 0.95).length;
  const eatenDays = past.filter(s => s.eaten);
  const avgKcal = eatenDays.length ? Math.round(eatenDays.reduce((a, s) => a + s.kcal, 0) / eatenDays.length) : null;

  const waterItems = ser.map(s => ({
    label: s.label, live: s.live,
    v: s.empty ? null : s.water,
    color: s.empty ? "#334155" : s.water >= waterT ? "#10b981" : s.water >= waterT * 0.7 ? "#38bdf8" : "#f59e0b"
  }));
  const calT = getTargets().calTarget;
  const kcalItems = ser.map(s => {
    if (s.empty) return { label: s.label, v: null };
    const r = s.calT > 0 ? s.kcal / s.calT : 1;
    const color = r > 1.1 ? "#f43f5e" : r < 0.9 ? "#f59e0b" : "#10b981";
    return { label: s.label, live: s.live, v: s.kcal, color, ghost: !s.eaten };
  });

  const stat = (l, v, cls, sub) => `<div class="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 min-w-0">
    <div class="text-[11px] text-slate-400 truncate">${l}</div><div class="text-base font-bold ${cls} truncate">${v}</div>${sub ? `<div class="text-[10px] text-slate-500 truncate">${sub}</div>` : ""}</div>`;
  const pct = (a, b) => b ? Math.round((a / b) * 100) : 0;

  const rows = past.slice().reverse().map(s => `
    <div class="grid grid-cols-4 gap-1 text-xs bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-1.5">
      <span class="text-slate-400">${esc(s.label)}</span>
      <span class="${s.eaten ? "text-emerald-400" : "text-slate-500"} font-semibold text-right">${s.kcal} kcal${s.eaten ? "" : "*"}</span>
      <span class="text-sky-400 text-right">${fmtNum(s.water)} L</span>
      <span class="text-slate-300 text-right">${num(s.raw.mealsDone)}/${num(s.raw.mealsTotal)} öğün</span>
    </div>`).join("");

  return `
    <div class="card p-4 space-y-3">
      ${head}
      <div class="grid grid-cols-3 gap-2">
        ${stat("Ortalama su", fmtNum(avgWater) + " L", "text-sky-400", "hedef " + fmtNum(waterT) + " L")}
        ${stat("Su ✓", `${waterHit}/${past.length} gün`, pct(waterHit, past.length) >= 70 ? "text-emerald-400" : "text-amber-400", "%" + pct(waterHit, past.length) + " başarı")}
        ${stat("Protein ✓", `${proHit}/${past.length} gün`, pct(proHit, past.length) >= 70 ? "text-emerald-400" : "text-amber-400", "%" + pct(proHit, past.length) + " başarı")}
      </div>

      <div>
        <div class="flex justify-between items-baseline text-xs mb-1"><span class="font-semibold text-slate-200">💧 Günlük Su</span><span class="text-[10px] text-slate-500">yeşil: hedef ✓ • mavi: yakın • turuncu: az</span></div>
        ${barChart(waterItems, waterT, "L")}
      </div>

      <div>
        <div class="flex justify-between items-baseline text-xs mb-1"><span class="font-semibold text-slate-200">🔥 Günlük Kalori</span><span class="text-[10px] text-slate-500">${avgKcal != null ? "ort. " + avgKcal + " kcal" : ""}</span></div>
        ${barChart(kcalItems, calT, "kcal")}
        <div class="text-[10px] text-slate-500 mt-1">Yeşil: hedefin ±%10'u • Turuncu: altında • Kırmızı: üstünde • Soluk: öğün işaretlenmediği için plan değeri • Bugün: şu ana kadar yenen</div>
      </div>

      ${rows ? `<details class="bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-xs">
        <summary class="text-slate-300 cursor-pointer">📋 Gün gün liste</summary>
        <div class="space-y-1 mt-2">${rows}</div>
        <div class="text-[10px] text-slate-500 mt-1.5">* Öğün işaretlenmemiş gün: planlanan kalori gösterilir.</div>
      </details>` : ""}
    </div>`;
}

// ============================================================================
// v10 — EKİPMAN & KADEMELER, YENİ ANTRENMAN ARAYÜZÜ, ÖĞÜN SIRALAMA,
//        ÖZEL BESİN DÜZENLEME
// ============================================================================

// ---------------------------------------------------------------------------
// EKİPMAN TİPİ & KİLO KADEMELERİ
// ---------------------------------------------------------------------------
const EQUIP_LABEL = { plates: "Plakalı (bar / plaka)", stack: "Ağırlık yığını (makine / kablo)", dumbbell: "Dambıl", bodyweight: "Vücut ağırlığı" };
const EQUIP_SHORT = { plates: "Plakalı", stack: "Makine", dumbbell: "Dambıl", bodyweight: "Vücut ağ." };

function autoEquip(name) {
  const k = exKey(name);
  if (/dumbbell|dambıl|\bdb\b/.test(k)) return "dumbbell";
  if (/pull-?up|chin-?up|barfiks|push-?up|şınav|\bdips?\b|hanging|inverted row|nordic|sissy|back extension|hyperextension/.test(k)) return "bodyweight";
  if (/cable|kablo|pulldown|pushdown|pec deck|leg extension|leg curl|crossover|machine|makine|chest press|abduction|adduction|crunch machine|seated row|face pull|assisted|rope/.test(k)) return "stack";
  return "plates";
}
function equipOf(ex) {
  if (ex.kind !== "weight") return null;
  return ex.equip && EQUIP_LABEL[ex.equip] ? ex.equip : autoEquip(ex.name);
}
function usesLevels(ex) { const e = equipOf(ex); return e === "stack" || e === "dumbbell"; }

// Tanımlı kademelerden sıralı kilo listesi üretir
function levelsToList(L) {
  if (!L) return null;
  let base = [];
  if (L.mode === "list") base = (L.list || []).map(v => round2(num(v, -1))).filter(v => v >= 0);
  else {
    const st = num(L.start, 0), sp = num(L.step, 0);
    if (sp > 0) for (let v = st; v <= 500 && base.length < 250; v = round2(v + sp)) base.push(round2(v));
  }
  const add = num(L.addon, 0);
  let all = base.slice();
  if (add > 0) base.forEach(v => all.push(round2(v + add)));
  all = [...new Set(all)].sort((a, b) => a - b);
  return all.length >= 2 ? all : null;
}

// Geçmişte girilen kilolardan makinenin kademe aralığını tahmin eder
function inferLevels(ex) {
  if (!usesLevels(ex)) return null;
  const vals = new Set();
  historyFor(ex.name).forEach(h => (h.sets || []).forEach(s => { const v = round2(num(s.kg)); if (v > 0) vals.add(v); }));
  ex.sets.forEach(s => { const v = round2(num(s.kg)); if (v > 0) vals.add(v); });
  const arr = [...vals].sort((a, b) => a - b);
  if (arr.length < 3) return null;
  const diffs = arr.slice(1).map((v, i) => round2(v - arr[i]));
  const d = Math.min(...diffs);
  if (d < 1 || d > 25) return null;
  if (!diffs.every(x => Math.abs(x / d - Math.round(x / d)) < 0.02)) return null;
  let start = round2(arr[0] - Math.floor(arr[0] / d + 1e-9) * d);
  if (start <= 0) start = d;
  return { mode: "step", start, step: d, addon: 0 };
}
function levelListOf(ex) {
  if (!usesLevels(ex)) return null;
  return levelsToList(ex.levels) || levelsToList(inferLevels(ex));
}
function nextLevel(ex, kg) {
  const list = levelListOf(ex);
  if (list) { const n = list.find(v => v > kg + 0.01); if (n != null) return n; }
  return round2(kg + incOf(ex));
}
function prevLevel(ex, kg) {
  const list = levelListOf(ex);
  if (list) { const p = list.filter(v => v < kg - 0.01).pop(); if (p != null) return p; }
  return Math.max(0, round2(kg - incOf(ex)));
}
function nearestLevelBelow(list, kg) {
  const p = list.filter(v => v <= kg + 0.01).pop();
  return p != null ? p : list[0];
}
function levelsSummary(ex) {
  const L = ex.levels;
  if (L && L.mode === "step" && num(L.step) > 0) return `${fmtKg(num(L.step))} kg arayla${num(L.addon) > 0 ? ` (+${fmtKg(num(L.addon))} ek plaka)` : ""}`;
  if (L && L.mode === "list") return `${(L.list || []).length} kademe${num(L.addon) > 0 ? ` (+${fmtKg(num(L.addon))} ek)` : ""}`;
  return "";
}

// "Bu makinenin kademeleri ... mi?" bandı
function levelsAskHtml(ex, exIdx) {
  if (!usesLevels(ex) || ex.levels || ex.levelsAskDismiss) return "";
  const inf = inferLevels(ex);
  if (!inf) return "";
  const list = levelsToList(inf);
  const around = list.filter(v => v >= num(ex.sets[0] && ex.sets[0].kg) - inf.step * 2).slice(0, 5).map(fmtKg).join(" · ");
  return `
    <div class="t-panel rounded-2xl px-3 py-2.5 text-[13px] space-y-2">
      <div class="text-slate-200">Bu ${equipOf(ex) === "dumbbell" ? "dambılların" : "makinenin"} kademeleri <b class="text-white">${fmtKg(inf.step)} kg</b> arayla mı gidiyor? <span class="t-dim">(${around} …)</span></div>
      <div class="flex gap-2">
        <button onclick="confirmInferredLevels(${exIdx})" class="t-btn h-11 px-4 rounded-xl text-[13px]">Evet, kaydet</button>
        <button onclick="openEditExercise(${exIdx})" class="t-btn-ghost h-11 px-4 rounded-xl text-[13px]">Düzenle</button>
        <button onclick="dismissLevelsAsk(${exIdx})" class="t-btn-ghost h-11 w-11 rounded-xl" aria-label="Kapat">&times;</button>
      </div>
    </div>`;
}
function confirmInferredLevels(exIdx) {
  const ex = activeDay().exercises[exIdx];
  const inf = inferLevels(ex);
  if (!inf) return;
  ex.levels = inf;
  toast(`✓ Kademeler kaydedildi: ${fmtKg(inf.step)} kg arayla`);
  renderAll();
}
function dismissLevelsAsk(exIdx) { activeDay().exercises[exIdx].levelsAskDismiss = true; renderAll(); }

// ---------------------------------------------------------------------------
// HAREKET MODALI: EKİPMAN & KADEMELER
// ---------------------------------------------------------------------------
let exLevelsMode = "step";
function setExLevelsMode(m) {
  exLevelsMode = m === "list" ? "list" : "step";
  $("exLvModeStep").classList.toggle("on", exLevelsMode === "step");
  $("exLvModeList").classList.toggle("on", exLevelsMode === "list");
  $("exLvStepWrap").classList.toggle("hidden", exLevelsMode !== "step");
  $("exLvStepWrap").classList.toggle("grid", exLevelsMode === "step");
  $("exLvListWrap").classList.toggle("hidden", exLevelsMode !== "list");
}
function updateExEquipUI() {
  const kind = exModal.kind;
  const sel = $("exEquip").value;
  const eq = sel === "auto" ? autoEquip($("exName").value) : sel;
  $("exEquip").options[0].textContent = "Otomatik (" + EQUIP_SHORT[autoEquip($("exName").value)] + ")";
  const lv = kind === "weight" && (eq === "stack" || eq === "dumbbell");
  $("exEquipWrap").classList.toggle("hidden", kind !== "weight");
  $("exLevelsWrap").classList.toggle("hidden", !lv);
  $("exIncWrap").classList.toggle("hidden", !(kind === "weight" && !lv));
  const incShown = kind === "weight" && !lv;
  $("exExtraWrap").classList.toggle("grid-cols-2", incShown);
  $("exExtraWrap").classList.toggle("grid-cols-1", !incShown);
  $("exLvTitle").textContent = eq === "dumbbell" ? "Salonundaki dambıl kiloları" : "Makinenin kilo kademeleri";
}
function fillExLevels(v) {
  $("exEquip").value = v.equip && EQUIP_LABEL[v.equip] ? v.equip : "auto";
  const L = v.levels || null;
  $("exLvStart").value = L && L.mode === "step" ? fmtKg(num(L.start)) : "";
  $("exLvStep").value = L && L.mode === "step" ? fmtKg(num(L.step)) : "";
  $("exLvList").value = L && L.mode === "list" ? (L.list || []).map(fmtKg).join("; ") : "";
  $("exLvAddon").value = L && num(L.addon) > 0 ? fmtKg(num(L.addon)) : "";
  setExLevelsMode(L && L.mode === "list" ? "list" : "step");
  updateExEquipUI();
}
function readExLevels() {
  const sel = $("exEquip").value;
  const equip = EQUIP_LABEL[sel] ? sel : "";
  const addon = Math.max(0, round2(num($("exLvAddon").value, 0)));
  let levels = null;
  if (exLevelsMode === "step") {
    const step = round2(num($("exLvStep").value, 0));
    const start = round2(num($("exLvStart").value, 0));
    if (step > 0) levels = { mode: "step", start: start > 0 ? start : step, step, addon };
  } else {
    const list = String($("exLvList").value).split(/[;\s]+/).filter(Boolean).map(t => round2(num(t.trim(), -1))).filter(v => v >= 0);
    const uniq = [...new Set(list)].sort((a, b) => a - b);
    if (uniq.length >= 2) levels = { mode: "list", list: uniq, addon };
  }
  return { equip, levels };
}

// ---------------------------------------------------------------------------
// YENİ ANTRENMAN ARAYÜZÜ
// ---------------------------------------------------------------------------
const GYM_VIEWS = [["today", "Bugün"], ["program", "Programım"], ["library", "Hareketler"], ["history", "Geçmiş"]];
const ICON = {
  chevL: "M15 6l-6 6 6 6", chevR: "M9 6l6 6-6 6", check: "M5 12.5l4.5 4.5L19 7.5", plus: "M12 5v14M5 12h14",
  chart: "M4 20V11M10 20V5M16 20v-6M2 20h20", calc: "M5 3h14v18H5zM8 7h8M8 11h2M12 11h2M8 15h2M12 15h2M16 11v4",
  edit: "M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4", up: "M12 19V5M5 12l7-7 7 7", down: "M12 5v14M19 12l-7 7-7-7",
  minus: "M5 12h14", trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13", play: "M7 4.5v15l12.5-7.5z", share: "M12 3v12M7 8l5-5 5 5M5 14v6h14v-6",
  search: "M11 4.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM20 20l-4-4",
  grip: "M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01", user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5c1.2-3.6 4.1-5.5 7.5-5.5s6.3 1.9 7.5 5.5",
  x: "M6 6l12 12M18 6L6 18", copy: "M9 9h11v11H9zM15 9V4H4v11h5", chevD: "M6 9l6 6 6-6",
  // v15
  star: "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z",
  cart: "M3 4h2.2l2.3 10.5h10.3l2.1-7.5H6.4M9.5 20a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4zM17 20a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4z",
  pot: "M4 10h16v5.5a4.5 4.5 0 0 1-4.5 4.5h-7A4.5 4.5 0 0 1 4 15.5zM2 10h20M9 6.5c0-1.2 1.2-1.3 1.2-2.5M14 6.5c0-1.2 1.2-1.3 1.2-2.5",
  repeat: "M17 2.5l3 3-3 3M4 11.5v-2a4 4 0 0 1 4-4h12M7 21.5l-3-3 3-3M20 12.5v2a4 4 0 0 1-4 4H4",
  sun: "M12 2.5v2M12 19.5v2M4.6 4.6L6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z",
  zap: "M13 2.5L4.5 13.5H11l-1 8 8.5-11H12z",
  moon: "M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7.5V12l3 2"
};
function svgI(name, size = 20, sw = 2) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICON[name]}"></path></svg>`;
}

function setGymView(v) {
  state.gymView = GYM_VIEWS.some(x => x[0] === v) ? v : "today";
  window.scrollTo(0, 0);
  renderAll();
}
function startWorkout() {
  state.gymActive = true;
  state.gymView = "today";
  if (!state.workoutStartedAt) state.workoutStartedAt = Date.now();
  window.scrollTo(0, 0);
  renderAll();
}
function exitActiveWorkout() { state.gymActive = false; window.scrollTo(0, 0); renderAll(); }

function gymSubNav() {
  return `<nav class="flex gap-5 border-b border-[#2A2A2E] -mx-0.5 px-0.5 overflow-x-auto no-scrollbar" aria-label="Antrenman bölümleri">
    ${GYM_VIEWS.map(([k, l]) => `<button onclick="setGymView('${k}')" class="shrink-0 h-11 text-[15px] ${state.gymView === k ? "font-bold text-white border-b-2 border-[#1FD1C1] -mb-px" : "font-medium t-muted"}">${l}</button>`).join("")}
  </nav>`;
}

function estimateMinutes(day) {
  let sec = 0;
  day.exercises.forEach(ex => {
    if (ex.kind === "cardio") ex.sets.forEach(r => { sec += num(r.min) * 60; });
    else ex.sets.forEach(() => { sec += 40 + num(ex.rest ?? state.settings.restSec, 90); });
  });
  return Math.max(5, Math.round(sec / 60 / 5) * 5);
}

function gymTodayHtml() {
  const day = activeDay();
  const nIdx = nextDayIdx();
  const ws = weekStart();
  const tKey = todayStr();
  const doneDays = {};
  state.workoutLogs.forEach(l => { if (l.ts) doneDays[todayStr(new Date(l.ts))] = true; });
  const names = ["PZT", "SAL", "ÇAR", "PER", "CUM", "CMT", "PAZ"];
  const strip = names.map((n, i) => {
    const d = new Date(ws + i * DAY_MS + 12 * 3600000);
    const k = todayStr(d), today = k === tKey, done = doneDays[k];
    return `<div class="h-16 rounded-2xl flex flex-col items-center justify-center gap-0.5 ${today ? "bg-[#1FD1C1] text-[#00201D]" : "bg-[#141416] " + (done ? "text-white" : "t-muted")}">
      <span class="text-[11px] font-semibold tracking-wide">${n}</span>
      <span class="t-display text-xl leading-none">${d.getDate()}</span>
      <span class="w-1.5 h-1.5 rounded-full ${today ? (done ? "bg-[#00201D]" : "") : (done ? "bg-[#1FD1C1]" : "")}"></span>
    </div>`;
  }).join("");

  const sets = day.exercises.reduce((a, e) => a + e.sets.length, 0);
  const muscles = [...new Set(day.exercises.map(muscleOf).filter(Boolean))].slice(0, 4);
  const inProg = workoutInProgress();
  const weekLogs = state.workoutLogs.filter(l => l.ts && l.ts >= ws);
  const wVol = weekLogs.reduce((a, l) => a + num(l.volume), 0);
  const wMin = weekLogs.reduce((a, l) => a + num(l.durationMin), 0);
  const last = state.workoutLogs[state.workoutLogs.length - 1];
  const dayChips = state.workoutDays.map((d, i) => `<button onclick="selectWorkoutDay(${i})" class="shrink-0 h-10 px-3.5 rounded-full text-[13px] ${i === state.activeWorkoutDayIdx ? "bg-white text-black font-bold" : "bg-[#1E1E21] text-slate-200 font-semibold"}">${esc(d.name.split(":")[0])}${i === nIdx ? ' <span class="t-accent">•</span>' : ""}</button>`).join("");

  return `
    <div class="grid grid-cols-7 gap-1.5">${strip}</div>
    <div class="t-card rounded-[22px] p-5 space-y-3.5">
      <div class="t-label ${inProg ? "" : "t-accent"}" style="${inProg ? "" : "color:#1FD1C1"}">${inProg ? "DEVAM EDEN ANTRENMAN" : state.activeWorkoutDayIdx === nIdx ? "SIRADAKİ ANTRENMAN" : "SEÇİLİ ANTRENMAN"}</div>
      <div class="t-display text-[34px] leading-none uppercase">${esc(day.name)}</div>
      <div class="flex gap-4 t-muted text-sm">
        <span><b class="text-white">${day.exercises.length}</b> hareket</span><span><b class="text-white">${sets}</b> set</span><span>~<b class="text-white">${estimateMinutes(day)}</b> dk</span>
      </div>
      ${muscles.length ? `<div class="flex flex-wrap gap-1.5">${muscles.map(m => `<span class="t-chip">${esc(m)}</span>`).join("")}</div>` : ""}
      ${state.workoutDays.length > 1 && !inProg ? `<div class="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">${dayChips}</div>` : ""}
      <button onclick="startWorkout()" ${day.exercises.length ? "" : "disabled"} class="t-btn w-full h-14 rounded-2xl text-[17px] flex items-center justify-center gap-2.5 ${day.exercises.length ? "" : "opacity-40"}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${ICON.play}"></path></svg>${inProg ? "Antrenmana Devam Et" : "Antrenmanı Başlat"}
      </button>
      ${day.exercises.length ? "" : `<button onclick="setGymView('program')" class="t-btn-ghost w-full h-11 rounded-xl text-sm">Bu güne hareket ekle</button>`}
    </div>
    <div class="space-y-2.5">
      <div class="t-label">BU HAFTA</div>
      <div class="grid grid-cols-3 gap-2">
        <div class="t-card-flat rounded-2xl px-3.5 py-3"><div class="text-xs t-muted">Antrenman</div><div class="t-display text-[26px]">${weekLogs.length}<span class="t-dim text-lg">/${state.workoutDays.length}</span></div></div>
        <div class="t-card-flat rounded-2xl px-3.5 py-3"><div class="text-xs t-muted">Tonaj</div><div class="t-display text-[26px]">${fmtNum(wVol / 1000)}<span class="t-dim text-lg"> t</span></div></div>
        <div class="t-card-flat rounded-2xl px-3.5 py-3"><div class="text-xs t-muted">Süre</div><div class="t-display text-[26px]">${Math.floor(wMin / 60)}:${String(Math.round(wMin % 60)).padStart(2, "0")}<span class="t-dim text-lg"> sa</span></div></div>
      </div>
      ${last ? `<button onclick="setGymView('history')" class="t-card-flat w-full min-h-[60px] rounded-2xl px-3.5 flex items-center justify-between text-left">
        <span class="flex flex-col gap-0.5"><span class="text-xs t-muted">Son antrenman · ${esc(last.ts ? fmtDate(last.ts) : last.date)}</span><span class="text-[15px] font-semibold">${esc(last.dayName)}${num(last.durationMin) ? " · " + fmtMinutes(num(last.durationMin)) : ""}</span></span>
        <span class="t-dim">${svgI("chevR")}</span></button>` : ""}
    </div>`;
}

// v23: Set zorluğu (isteğe bağlı). 1 Kolay · 2 Orta · 3 Zor · 4 Tükeniş (son tekrarda başka tekrar kalmadı)
function setEffort(exIdx, sIdx, v) {
  const ex = activeDay().exercises[exIdx];
  const s = ex && ex.sets[sIdx];
  if (!s || !s.done || !EFFORT_LABELS[v]) return;
  if (s.e === v) delete s.e; else s.e = v;
  renderAll();
}
function effortRowHtml(exIdx, s, i) {
  return `<div class="px-1 pt-1 pb-1.5 space-y-1.5" data-effort-row="${exIdx}-${i}">
      <div class="text-[12px] t-muted">${i + 1}. set nasıl geçti? <span class="t-dim">(isteğe bağlı)</span></div>
      <div class="grid grid-cols-4 gap-1.5" role="group" aria-label="${i + 1}. set zorluğu">
        ${[1, 2, 3, 4].map(v => `<button onclick="setEffort(${exIdx}, ${i}, ${v})" aria-pressed="${s.e === v}" class="h-11 rounded-xl text-[13px] ${s.e === v ? "font-extrabold text-black" : "font-semibold bg-[#1E1E21] text-slate-200"}" ${s.e === v ? `style="background:${EFFORT_COLORS[v]}"` : ""}>${EFFORT_LABELS[v]}</button>`).join("")}
      </div>
    </div>`;
}
// Set satırları
function setRowHtml(ex, exIdx, s, i, ptr, prev) {
  const isNext = ptr && ptr.e === exIdx && ptr.s === i;
  const rowCls = s.done ? "bg-[#0B2624]" : isNext ? "bg-[#1A1A1D] ring-[1.5px] ring-[#1FD1C1] ring-inset" : "";
  const check = `<button onclick="toggleSetDone(${exIdx}, ${i})" aria-label="Seti tamamla" class="w-11 h-11 rounded-xl flex items-center justify-center ${s.done ? "bg-[#1FD1C1] text-[#00201D]" : "border-[1.5px] border-[#3A3A40] t-muted"}">${svgI("check", 22, 2.6)}</button>`;
  if (ex.kind === "cardio") {
    return `<div class="rounded-2xl p-2.5 space-y-2 ${rowCls}">
      <div class="flex items-center justify-between"><span class="text-xs font-bold t-muted">${ex.sets.length > 1 ? (i + 1) + ". BÖLÜM" : "KARDİYO"}</span>${check}</div>
      <div class="grid grid-cols-3 gap-2">
        <label class="block"><span class="block text-[11px] t-muted mb-1">Süre (dk)</span><input type="text" inputmode="decimal" data-fk="c-${exIdx}-${i}-min" value="${esc(s.min === "" ? "" : fmtNum(num(s.min)))}" onchange="updateSetData(${exIdx}, ${i}, 'min', this.value)" class="t-input w-full" /></label>
        <label class="block"><span class="block text-[11px] t-muted mb-1">Mesafe (km)</span><input type="text" inputmode="decimal" placeholder="—" data-fk="c-${exIdx}-${i}-km" value="${esc(s.km === "" || s.km == null ? "" : fmtNum(num(s.km)))}" onchange="updateSetData(${exIdx}, ${i}, 'km', this.value)" class="t-input w-full" /></label>
        <label class="block"><span class="block text-[11px] t-muted mb-1">Eğim/Seviye</span><input type="text" placeholder="—" data-fk="c-${exIdx}-${i}-lvl" value="${esc(s.lvl || "")}" onchange="updateSetData(${exIdx}, ${i}, 'lvl', this.value)" class="t-input w-full" /></label>
      </div>
    </div>`;
  }
  if (ex.kind === "time") {
    return `<div class="grid items-center gap-2 h-14 px-1 rounded-2xl ${rowCls}" style="grid-template-columns: 40px minmax(0,1fr) 84px 44px">
      <span class="t-display text-[22px] text-center ${s.done || isNext ? "text-white" : "t-dim"}">${i + 1}</span>
      <span class="flex items-center gap-1.5"><input type="text" inputmode="numeric" data-fk="t-${exIdx}-${i}" value="${num(s.sec)}" onchange="updateSetData(${exIdx}, ${i}, 'sec', this.value)" class="t-input w-20" /><span class="text-xs t-muted">sn</span></span>
      <button onclick="startTimer(${num(s.sec)}, ${esc(JSON.stringify(ex.name.slice(0, 40)))})" class="t-btn-ghost h-11 rounded-xl text-[13px] flex items-center justify-center gap-1">${svgI("play", 14)}Başlat</button>
      ${check}
    </div>`;
  }
  let lastDone = -1;
  ex.sets.forEach((x, j) => { if (x.done) lastDone = j; });
  const effLbl = s.done && EFFORT_LABELS[s.e] ? `<span class="block font-sans text-[10px] font-bold leading-none mt-0.5" style="color:${EFFORT_COLORS[s.e]}">${EFFORT_LABELS[s.e]}</span>` : "";
  return `<div class="rounded-2xl ${rowCls}"><div class="grid items-center gap-2 h-14 px-1" style="grid-template-columns: 36px minmax(0,1fr) 78px 60px 44px">
    <span class="t-display text-[22px] text-center leading-none ${s.done || isNext ? "text-white" : "t-dim"}">${i + 1}${s.pr ? '<span class="text-amber-400 text-sm">★</span>' : ""}${effLbl}</span>
    <span class="text-[13px] t-dim truncate">${prev}</span>
    <input type="text" inputmode="decimal" aria-label="${i + 1}. set kilo" data-fk="w-${exIdx}-${i}-kg" value="${esc(fmtKg(num(s.kg)))}" onchange="updateSetData(${exIdx}, ${i}, 'kg', this.value)" class="t-input w-full" />
    <input type="text" inputmode="numeric" aria-label="${i + 1}. set tekrar" data-fk="w-${exIdx}-${i}-reps" value="${num(s.reps)}" onchange="updateSetData(${exIdx}, ${i}, 'reps', this.value)" class="t-input w-full" />
    ${check}
  </div>${s.done && i === lastDone ? effortRowHtml(exIdx, s, i) : ""}</div>`;
}

function gymActiveHtml() {
  const day = activeDay();
  const ptr = nextSetPtr(day);
  const total = day.exercises.length;
  const cards = day.exercises.map((ex, exIdx) => {
    const hist = historyFor(ex.name);
    const last = hist[hist.length - 1];
    const eq = equipOf(ex);
    const allDone = ex.sets.length && ex.sets.every(s => s.done);
    const prevOf = i => {
      const ps = last && last.kind === "weight" && last.sets[i];
      return ps ? `${fmtKg(num(ps.kg))}×${num(ps.reps)}` : "—";
    };
    const head = ex.kind === "weight"
      ? `<div class="grid gap-2 px-1 text-[11px] font-bold tracking-wider t-dim" style="grid-template-columns: 36px minmax(0,1fr) 78px 60px 44px"><span class="text-center">SET</span><span class="truncate">ÖNCEKİ</span><span class="text-center">KG</span><span class="text-center">TEKRAR</span><span></span></div>`
      : ex.kind === "time" ? `<div class="grid gap-2 px-1 text-[11px] font-bold tracking-wider t-dim" style="grid-template-columns: 40px minmax(0,1fr) 84px 44px"><span class="text-center">SET</span><span>SÜRE</span><span></span><span></span></div>` : "";
    return `
      <div id="exCard_${exIdx}" class="t-card rounded-[22px] p-4 space-y-3" style="scroll-margin-top: 9rem;">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0 space-y-1.5">
            <div class="t-label">HAREKET ${exIdx + 1} / ${total}${allDone ? ' <span class="t-accent" style="color:#1FD1C1">· TAMAMLANDI</span>' : ""}</div>
            <div class="text-[21px] font-bold leading-tight">${esc(ex.name)}</div>
            <div class="flex flex-wrap gap-1.5">
              ${ex.targetInfo ? `<span class="t-chip-accent">${esc(ex.targetInfo)}</span>` : ""}
              ${muscleOf(ex) ? `<span class="t-chip">${esc(muscleOf(ex))}</span>` : ""}
              ${eq && eq !== "plates" ? `<span class="t-chip">${EQUIP_SHORT[eq]}</span>` : ""}
              ${ex.kind !== "weight" ? `<span class="t-chip">${ex.kind === "cardio" ? "Kardiyo" : "Süreli"}</span>` : ""}
            </div>
          </div>
          <button onclick="openExSheet(${exIdx})" aria-label="Hareket seçenekleri" class="w-11 h-11 shrink-0 rounded-[14px] bg-[#1E1E21] flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.9"></circle><circle cx="12" cy="12" r="1.9"></circle><circle cx="19" cy="12" r="1.9"></circle></svg>
          </button>
        </div>
        ${last ? `<div class="text-[13px] t-muted">Geçen sefer (${fmtDate(last.ts)}): <span class="text-slate-200 font-semibold">${esc(sessionSummary(last))}</span></div>` : ""}
        <div id="exRight_${exIdx}" class="text-[12px] t-dim">${exRightText(ex)}</div>
        ${levelsAskHtml(ex, exIdx)}
        ${suggestionHtml(ex, exIdx)}
        <input type="text" value="${esc(ex.note || "")}" placeholder="Not ekle (koltuk ayarı, tutuş...)" onchange="updateExerciseNote(${exIdx}, this.value)" class="t-note w-full text-[13px]" />
        ${head}
        <div class="space-y-1.5">${ex.sets.map((s, i) => setRowHtml(ex, exIdx, s, i, ptr, prevOf(i))).join("")}</div>
        <button onclick="addSetToExercise(${exIdx})" class="w-full h-11 rounded-[14px] border-[1.5px] border-dashed border-[#2A2A2E] t-muted text-sm font-semibold">+ ${ex.kind === "cardio" ? "Bölüm" : "Set"} ekle</button>
      </div>`;
  }).join("");

  return `
    <div class="flex items-center justify-between gap-2">
      <button onclick="exitActiveWorkout()" aria-label="Antrenman özetine dön" class="w-11 h-11 rounded-full bg-[#141416] flex items-center justify-center">${svgI("chevL", 22)}</button>
      <div class="flex flex-col items-center min-w-0">
        <div class="t-display text-xl leading-none uppercase truncate max-w-[220px]">${esc(day.name)}</div>
        <div class="text-xs t-muted tabular-nums mt-1"><span id="gymElapsed">00:00</span> · <span id="gymProgText">0/0 set</span></div>
      </div>
      <button onclick="finishAndLogWorkout()" class="t-btn-outline h-11 px-4 rounded-full text-sm">Bitir</button>
    </div>
    <div class="h-1 rounded-full bg-[#1E1E21] overflow-hidden"><div id="gymProgBar" class="h-full bg-[#1FD1C1] transition-all duration-300" style="width:0%"></div></div>
    ${cards || `<div class="t-card rounded-[22px] p-6 text-center text-sm t-muted">Bu günde hareket yok. <button onclick="exitActiveWorkout(); setGymView('program')" class="t-accent font-semibold underline" style="color:#1FD1C1">Programım</button> sekmesinden ekleyebilirsin.</div>`}
    <button onclick="finishAndLogWorkout()" class="t-btn w-full h-14 rounded-2xl text-[16px]">✓ Antrenmanı Bitir ve Kaydet</button>
    <button onclick="uncheckAllSets()" class="t-btn-ghost w-full h-11 rounded-xl text-sm">Tikleri sıfırla</button>`;
}
function exRightText(ex) {
  if (ex.kind === "cardio") {
    const t = cardioTotals(ex.sets, false);
    const pace = paceText(t.min, t.km);
    return `Toplam ${fmtNum(t.min)} dk${t.km > 0 ? " · " + fmtNum(t.km) + " km" : ""}${pace ? " · " + pace : ""}`;
  }
  if (ex.kind === "time") return `Toplam ${ex.sets.reduce((a, s) => a + num(s.sec), 0)} sn${ex.rest ? " · dinlenme " + ex.rest + " sn" : ""}`;
  let vol = 0, best = 0;
  ex.sets.forEach(s => { vol += num(s.kg) * num(s.reps); best = Math.max(best, e1rm(s.kg, s.reps)); });
  const lv = usesLevels(ex) ? levelsSummary(ex) : "";
  return `Tahmini 1RM ~${Math.round(best)} kg · Tonaj ${Math.round(vol).toLocaleString("tr-TR")} kg${lv ? " · Kademe: " + lv : ""}`;
}

function gymProgramHtml() {
  const day = activeDay();
  const nIdx = nextDayIdx();
  const chips = state.workoutDays.map((d, i) => `<button onclick="selectWorkoutDay(${i})" class="shrink-0 h-11 px-4 rounded-full text-[13px] ${i === state.activeWorkoutDayIdx ? "bg-white text-black font-bold" : "bg-[#141416] border border-[#2A2A2E] text-slate-200 font-semibold"}">${esc(d.name)}${i === nIdx ? ' <span class="text-[10px] font-bold" style="color:#1FD1C1">SIRADA</span>' : ""}</button>`).join("");
  const rows = day.exercises.map((ex, i) => {
    const eq = equipOf(ex);
    const meta = [ex.targetInfo, muscleOf(ex), eq ? EQUIP_SHORT[eq] : (ex.kind === "cardio" ? "Kardiyo" : "Süreli")].filter(Boolean).join(" · ");
    const lvWarn = usesLevels(ex) && !ex.levels ? `<span class="text-[11px] text-amber-300">Kademe tanımlı değil</span>` : usesLevels(ex) ? `<span class="text-[11px] t-dim">Kademe: ${esc(levelsSummary(ex))}</span>` : "";
    return `<div data-ex-row="${i}" class="t-card-flat rounded-2xl min-h-[64px] pl-1 pr-1.5 py-2 flex items-center gap-2">
      ${day.exercises.length > 1 ? `<button class="drag-handle w-11 h-11 shrink-0 rounded-xl flex items-center justify-center t-dim" data-exidx="${i}" aria-label="${esc(ex.name)} hareketini sürükleyerek taşı" style="touch-action: none; cursor: grab;">${svgI("grip", 22, 2.4)}</button>` : `<span class="w-3"></span>`}
      <span class="t-display text-xl t-dim w-6 text-center">${i + 1}</span>
      <span class="flex-1 min-w-0 flex flex-col gap-0.5"><span class="text-[15px] font-semibold truncate">${esc(ex.name)}</span><span class="text-xs t-muted truncate">${esc(meta)}</span>${lvWarn}</span>
      <button onclick="openExSheet(${i})" aria-label="${esc(ex.name)} seçenekleri" class="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center t-muted">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.9"></circle><circle cx="12" cy="12" r="1.9"></circle><circle cx="19" cy="12" r="1.9"></circle></svg>
      </button>
    </div>`;
  }).join("");
  return `
    <div class="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">${chips}</div>
    <div class="grid grid-cols-3 gap-2">
      <button onclick="addWorkoutDay()" class="t-btn-ghost h-11 rounded-xl text-[13px]">+ Yeni gün</button>
      <button onclick="renameWorkoutDay()" class="t-btn-ghost h-11 rounded-xl text-[13px]">Adlandır</button>
      <button onclick="deleteWorkoutDay()" class="t-btn-ghost h-11 rounded-xl text-[13px]" style="color:#FF8A8A">Günü sil</button>
    </div>
    <div class="space-y-2">
      <div class="flex items-baseline justify-between"><span class="t-label">HAREKETLER</span><span class="text-xs t-dim">${day.exercises.length} hareket · ~${estimateMinutes(day)} dk</span></div>
      ${day.exercises.length > 1 ? `<div class="text-xs t-dim">Sırayı değiştirmek için soldaki tutamacı basılı tutup sürükle.</div>` : ""}
      <div id="progExList" class="space-y-2">${rows || `<div class="t-card-flat rounded-2xl p-6 text-center text-sm t-muted">Bu günde henüz hareket yok.</div>`}</div>
    </div>
    <div class="grid grid-cols-2 gap-2">
      <button onclick="openExercisePicker()" class="t-btn h-12 rounded-xl text-[14px]">+ Kütüphaneden ekle</button>
      <button onclick="openExerciseModal({ name: '', kind: 'weight' })" class="t-btn-outline h-12 rounded-xl text-[14px]">Özel hareket</button>
    </div>
    ${day.exercises.length ? `<button onclick="startWorkout()" class="t-btn-ghost w-full h-12 rounded-xl text-[14px] flex items-center justify-center gap-2">${svgI("play", 16)} Bu antrenmanı başlat</button>` : ""}`;
}

// --- Vücut haritası ---
const BODY_POLYS = {
  "Göğüs": ["112,182 150,174 195,180 197,252 160,264 125,252 112,225", "200,180 245,174 284,182 284,225 270,252 236,264 200,252"],
  "Omuz": ["68,178 108,166 118,190 108,238 74,242 60,210", "288,166 328,178 336,210 322,242 288,238 278,190", "450,180 502,166 520,198 502,240 462,242 446,210", "644,166 696,180 700,210 684,242 644,240 626,198"],
  "Biceps": ["58,244 100,244 100,296 84,330 58,322 48,282", "296,244 338,244 348,282 338,322 312,330 296,296"],
  "Karın": ["156,262 240,262 242,360 236,438 198,482 160,438 154,360", "116,262 152,266 156,396 122,398 116,330", "244,266 280,262 280,330 276,398 242,396"],
  "Ön Bacak": ["116,406 160,420 194,482 186,560 178,640 152,662 122,632 108,520", "280,406 236,420 202,482 210,560 218,640 244,662 274,632 288,520"],
  "Kalf": ["106,702 150,692 148,800 140,872 118,872 104,790", "246,692 290,702 292,790 278,872 256,872 248,800", "500,668 560,668 566,740 556,802 516,802 500,740", "586,668 646,668 646,740 630,802 590,802 580,740"],
  "Sırt": ["505,150 642,150 624,198 600,246 573,318 546,246 522,198", "522,200 558,250 566,330 560,386 518,388 500,330 496,270 506,232", "624,200 588,250 580,330 586,386 628,388 646,330 650,270 640,232"],
  "Triceps": ["442,244 482,244 480,300 466,332 442,322 432,282", "664,244 704,244 714,282 704,322 680,332 666,300"],
  "Arka Bacak & Kalça": ["500,392 570,410 576,460 562,496 522,500 500,472 494,430", "576,410 646,392 652,430 646,472 624,500 584,496 570,460", "498,502 568,506 568,600 556,662 516,666 500,600", "578,506 648,502 646,600 630,666 590,662 578,600"]
};
function heatColor(n) { return n === 0 ? "transparent" : n < 10 ? "#3E8F88" : n <= 20 ? "#14D9C6" : "#00FFE5"; }
function todayMuscleSets() {
  const counts = {};
  MUSCLES.forEach(m => { counts[m] = 0; });
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  const fromHist = weeklyMuscleSets(t0.getTime());
  MUSCLES.forEach(m => { counts[m] += fromHist[m] || 0; });
  activeDay().exercises.forEach(ex => {
    const g = muscleOf(ex);
    if (g) counts[g] += ex.sets.filter(s => s.done).length;
  });
  return counts;
}
// Programın haftalık etkisi: tüm antrenman günlerindeki planlanan setler (her gün haftada bir kez yapılır varsayımıyla).
function programMuscleSets() {
  const counts = {};
  MUSCLES.forEach(m => { counts[m] = 0; });
  state.workoutDays.forEach(d => d.exercises.forEach(ex => {
    if (ex.kind === "cardio") return;
    const g = muscleOf(ex);
    if (g && counts[g] != null) counts[g] += ex.sets.length;
  }));
  return counts;
}
function selectMuscle(m) { state.libMuscle = MUSCLES.includes(m) ? m : null; libSearchQ = ""; renderAll(); }
function setLibRange(r) { state.libRange = r === "today" || r === "program" ? r : "week"; renderAll(); }
let libSearchQ = "";

function libExerciseItems(muscle, q) {
  const seen = new Set();
  const out = [];
  const add = name => {
    const k = exKey(name);
    if (seen.has(k)) return;
    seen.add(k);
    out.push(name.trim());
  };
  const words = normSearch(q).split(/\s+/).filter(Boolean);
  const match = name => words.length ? words.every(w => normSearch(name).includes(w)) : autoMuscle(name) === muscle;
  activeDay().exercises.forEach(ex => { if (ex.kind === "weight" && match(ex.name) && (words.length || muscleOf(ex) === muscle)) add(ex.name); });
  Object.keys(EXERCISE_LIBRARY).forEach(c => EXERCISE_LIBRARY[c].forEach(n => { if (match(n)) add(n); }));
  return out.slice(0, 40);
}
function libListHtml() {
  const q = libSearchQ.trim();
  const m = state.libMuscle;
  if (!q && !m) return `<div class="text-sm t-muted text-center py-4">Hareketleri görmek için haritada bir kasa dokun ya da yukarıdan ara.</div>`;
  const items = libExerciseItems(m, q);
  const inDay = new Set(activeDay().exercises.map(e => exKey(e.name)));
  if (!items.length) return `<div class="text-sm t-muted text-center py-4">Sonuç bulunamadı.</div>`;
  return items.map(n => {
    const h = historyFor(n);
    const last = h[h.length - 1];
    const meta = last ? `Son: ${sessionSummary(last)} · ${fmtDate(last.ts)}` : "Henüz yapılmadı";
    return `<div class="t-card-flat rounded-2xl min-h-[72px] pl-3.5 pr-2 py-2 flex items-center gap-3">
      <span class="flex-1 min-w-0 flex flex-col gap-1">
        <span class="text-[15px] font-bold">${esc(n)}</span>
        <span class="text-xs t-muted truncate">${esc(meta)}</span>
        ${inDay.has(exKey(n)) ? `<span class="self-start text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#1B5E58] bg-[#0B2624]" style="color:#1FD1C1">PROGRAMDA</span>` : ""}
      </span>
      <button onclick="openExerciseModal({ name: ${esc(JSON.stringify(n))}, kind: detectKind(${esc(JSON.stringify(n))}) })" aria-label="${esc(n)} hareketini ${esc(activeDay().name)} gününe ekle" class="t-btn-outline w-11 h-11 rounded-xl flex items-center justify-center">${svgI("plus", 20, 2.4)}</button>
    </div>`;
  }).join("");
}
function onLibSearch(v) { libSearchQ = v; $("libList").innerHTML = libListHtml(); }

function gymLibraryHtml() {
  const range = state.libRange === "today" || state.libRange === "program" ? state.libRange : "week";
  const counts = range === "today" ? todayMuscleSets() : range === "program" ? programMuscleSets() : weeklyMuscleSets(weekStart());
  const sel = state.libMuscle;
  let polys = "", sels = "";
  Object.keys(BODY_POLYS).forEach(m => {
    const c = heatColor(counts[m] || 0);
    BODY_POLYS[m].forEach(p => {
      polys += `<polygon points="${p}" fill="${c}" onclick="selectMuscle('${m}')" style="cursor:pointer"></polygon>`;
      if (m === sel) sels += `<polygon points="${p}" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-dasharray="7 5" stroke-linejoin="round"></polygon>`;
    });
  });
  const n = sel ? counts[sel] || 0 : 0;
  const tag = n === 0 ? "henüz çalışılmadı" : n < 10 ? "az" : n <= 20 ? "ideal aralıkta" : "yüksek hacim";
  const rangeBtn = (k, l) => `<button onclick="setLibRange('${k}')" aria-pressed="${range === k}" class="h-11 rounded-[11px] text-[13px] ${range === k ? "bg-white text-black font-bold" : "t-muted font-semibold"}">${l}</button>`;
  const rangeTxt = range === "today" ? "Bugünkü set sayısına göre" : range === "program" ? "Programının bir haftada verdiği set sayısı" : "Bu haftaki set sayısına göre";
  const rangeWord = range === "today" ? "Bugün" : range === "program" ? "Programında haftada" : "Bu hafta";
  const pTotal = range !== "today" ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;
  const pRows = range !== "today" ? MUSCLES.map(m => {
    const c = counts[m] || 0;
    const tg = c === 0 ? "yok" : c < 10 ? "az" : c <= 20 ? "ideal" : "yüksek";
    const col = c === 0 ? "#3A3A40" : c < 10 ? "#3E8F88" : c <= 20 ? "#14D9C6" : "#00FFE5";
    return `<button onclick="selectMuscle(${esc(JSON.stringify(m))})" class="w-full min-h-[44px] flex items-center gap-2.5 text-left">
      <span class="w-[132px] shrink-0 text-[13px] ${m === sel ? "text-white font-bold" : "text-slate-200"} truncate">${esc(m)}</span>
      <span class="relative flex-1 h-2.5 rounded-full bg-[#1E1E21] overflow-hidden"><span class="absolute inset-y-0 left-0 rounded-full" style="width:${Math.min(100, c / 24 * 100)}%;background:${col}"></span></span>
      <span class="w-[68px] shrink-0 text-right text-[13px]"><b class="text-white">${c}</b> <span class="t-dim text-[11px]">${tg}</span></span>
    </button>`;
  }).join("") : "";
  return `
    <div class="flex items-center justify-between">
      <div class="flex flex-col"><span class="t-label">KAS YÜKÜ</span><span class="text-[13px] text-slate-200">${rangeTxt}</span></div>
    </div>
    <div class="grid grid-cols-3 gap-0.5 bg-[#141416] border border-[#2A2A2E] rounded-[14px] p-0.5">${rangeBtn("week", "Bu hafta")}${rangeBtn("today", "Bugün")}${rangeBtn("program", "Programım")}</div>
    <div class="flex justify-center">
      <div class="relative" style="width: min(100%, 340px); aspect-ratio: 765 / 1024;">
        <img src="anatomy.jpg" alt="Önden ve arkadan kas anatomisi" class="absolute inset-0 w-full h-full select-none" draggable="false" />
        <svg viewBox="0 0 765 1024" class="absolute inset-0 w-full h-full" role="img" aria-label="Kas grupları set sayısına göre renklendi; renklenmiş bir kasa dokunarak seç">
          <g style="mix-blend-mode: color">${polys}</g>
          <g style="pointer-events:none">${sels}</g>
        </svg>
        <span class="absolute left-1.5 bottom-1 text-[11px] font-bold tracking-widest t-muted">ÖN</span>
        <span class="absolute right-1.5 bottom-1 text-[11px] font-bold tracking-widest t-muted">ARKA</span>
      </div>
    </div>
    <div class="flex items-center justify-center gap-3.5 text-[11px] t-muted">
      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-[#9A9AA0]"></span>0</span>
      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-[#6FA39E]"></span>1–9</span>
      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-[#2FC4B6]"></span>10–20</span>
      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-[#4DF2E1]"></span>20+ set</span>
    </div>
    ${range === "program" ? `<div class="t-card rounded-[18px] px-4 py-3 space-y-0.5">
      <div class="flex items-baseline justify-between pb-1"><span class="t-label">PROGRAMIN HAFTALIK ETKİSİ</span><span class="text-xs t-dim">${state.workoutDays.length} gün · ${pTotal} set</span></div>
      ${pRows}
      <p class="text-[12px] t-dim pt-1.5">Her gün haftada bir kez yapılırsa. Kas gelişimi için genel öneri haftada 10–20 set. Her set hareketin ana kasına sayılır.</p>
    </div>` : range === "week" && pTotal ? `<div class="t-card rounded-[18px] px-4 py-3 space-y-0.5" data-week-muscles>
      <div class="flex items-baseline justify-between pb-1"><span class="t-label">BU HAFTA · KAS BAŞINA SET</span><span class="text-xs t-dim">${pTotal} set</span></div>
      ${pRows}
      <p class="text-[12px] t-dim pt-1.5">Pazartesiden bu yana kaydedilen setler. Kas gelişimi için genel öneri haftada 10–20 set.</p>
    </div>` : ""}
    ${sel ? `<div class="t-card rounded-[18px] min-h-[64px] px-4 flex items-center justify-between gap-2">
      <span class="flex flex-col gap-0.5"><span class="text-base font-bold">${esc(sel)}</span><span class="text-[13px] t-muted">${rangeWord} <b class="text-white">${n} set</b> · ${range === "program" && n === 0 ? "programında yok" : tag}</span></span>
      <button onclick="selectMuscle(null)" class="t-btn-ghost h-11 px-3 rounded-xl text-[13px]">Temizle</button>
    </div>` : ""}
    <label class="flex items-center gap-2.5 h-12 rounded-[14px] bg-[#141416] border border-[#2A2A2E] px-3.5 t-muted">
      ${svgI("search", 18)}
      <span class="sr-only">Hareket ara</span>
      <input type="text" value="${esc(libSearchQ)}" oninput="onLibSearch(this.value)" placeholder="135+ hareket içinde ara" class="t-search flex-1 min-w-0" />
    </label>
    <div id="libList" class="space-y-2">${libListHtml()}</div>`;
}

function gymHistoryHtml() {
  const ws = weekStart();
  const weekLogs = state.workoutLogs.filter(l => l.ts && l.ts >= ws);
  const logs = state.workoutLogs.map((l, i) => ({ l, i })).reverse().slice(0, 30);
  const rows = logs.map(({ l, i }) => `
    <div class="t-card-flat rounded-2xl pl-3.5 pr-1.5 py-2.5 flex items-center gap-2">
      <div class="flex-1 min-w-0">
        <div class="text-xs t-muted">${esc(l.ts ? fmtDate(l.ts, true) : l.date)}</div>
        <div class="text-[15px] font-semibold truncate">${esc(l.dayName)}</div>
        <div class="text-xs t-muted mt-0.5">${l.sets} set · ${num(l.volume).toLocaleString("tr-TR")} kg${num(l.durationMin) ? " · " + fmtMinutes(num(l.durationMin)) : ""}${num(l.cardioMin) ? " · " + fmtNum(num(l.cardioMin)) + " dk kardiyo" : ""}${num(l.prs) ? ` · <span class="text-amber-300">${l.prs} rekor</span>` : ""}</div>
      </div>
      <button onclick="openShareCard(${i})" aria-label="Paylaş" class="w-11 h-11 rounded-xl flex items-center justify-center t-muted">${svgI("share", 20)}</button>
      <button onclick="deleteWorkoutLog(${i})" aria-label="Kaydı sil" class="w-11 h-11 rounded-xl flex items-center justify-center t-dim">${svgI("trash", 19)}</button>
    </div>`).join("");
  return `
    <div class="grid grid-cols-3 gap-2">
      <div class="t-card-flat rounded-2xl px-3.5 py-3"><div class="text-xs t-muted">Bu hafta</div><div class="t-display text-[26px]">${weekLogs.length}<span class="t-dim text-lg"> antr.</span></div></div>
      <div class="t-card-flat rounded-2xl px-3.5 py-3"><div class="text-xs t-muted">Tonaj</div><div class="t-display text-[26px]">${fmtNum(weekLogs.reduce((a, l) => a + num(l.volume), 0) / 1000)}<span class="t-dim text-lg"> t</span></div></div>
      <div class="t-card-flat rounded-2xl px-3.5 py-3"><div class="text-xs t-muted">Toplam</div><div class="t-display text-[26px]">${state.workoutLogs.length}<span class="t-dim text-lg"> antr.</span></div></div>
    </div>
    <div id="workoutHistoryList" class="space-y-2">${rows || `<div class="t-card-flat rounded-2xl p-6 text-center text-sm t-muted">Henüz kaydedilmiş antrenman yok.</div>`}</div>
    <button onclick="switchTab('progress')" class="t-btn-ghost w-full h-11 rounded-xl text-sm">Grafikler ve rekorlar için İlerleme sekmesi →</button>`;
}

function renderGym() {
  if (!GYM_VIEWS.some(x => x[0] === state.gymView)) state.gymView = "today";
  const active = state.gymView === "today" && state.gymActive;
  let html = active ? gymActiveHtml()
    : gymSubNav() + (state.gymView === "program" ? gymProgramHtml() : state.gymView === "library" ? gymLibraryHtml() : state.gymView === "history" ? gymHistoryHtml() : gymTodayHtml());
  $("gymRoot").innerHTML = html;
  updateGymHeader();
  updateDurationUI();
  updateActiveProgress();
}
function updateActiveProgress() {
  const t = $("gymProgText");
  if (!t) return;
  let d = 0, n = 0;
  activeDay().exercises.forEach(ex => ex.sets.forEach(s => { n++; if (s.done) d++; }));
  t.textContent = `${d}/${n} set`;
  $("gymProgBar").style.width = (n ? Math.round(d / n * 100) : 0) + "%";
  const el = $("gymElapsed");
  if (el) el.textContent = state.workoutStartedAt ? fmtDuration(Date.now() - state.workoutStartedAt) : "00:00";
}
setInterval(() => { if (state.activeTab === "gym" && state.gymActive && document.visibilityState === "visible") { const el = $("gymElapsed"); if (el && state.workoutStartedAt) el.textContent = fmtDuration(Date.now() - state.workoutStartedAt); } }, 1000);

// --- Hareket menüsü (alttan açılan) ---
let sheetIdx = -1;
function openExSheet(exIdx) {
  const ex = activeDay().exercises[exIdx];
  if (!ex) return;
  sheetIdx = exIdx;
  const eq = equipOf(ex);
  const last = exIdx === activeDay().exercises.length - 1;
  const W = Math.max(0, ...ex.sets.map(s => num(s.kg)));
  let plateSub = "";
  if (ex.kind === "weight" && eq === "plates" && W > 0) {
    const r = platesFor(W, num(state.settings.barKg, 20));
    plateSub = r.ok && r.list.length ? `${fmtKg(W)} kg: her tarafa ${r.list.map(fmtKg).join(" + ")}` : "Isınma setleri ve plaka dağılımı";
  } else if (ex.kind === "weight" && usesLevels(ex)) plateSub = levelListOf(ex) ? "Isınma setleri ve makine kademeleri" : "Önce kademeleri tanımla";
  const item = (fn, icon, label, sub, extra = "") => `<button onclick="closeModal('exSheet'); ${fn}" class="w-full min-h-[60px] rounded-2xl px-2.5 flex items-center gap-3.5 bg-[#1A1A1D] text-left ${extra}">
      <span class="w-10 h-10 shrink-0 rounded-xl bg-[#26262A] flex items-center justify-center" style="color:#1FD1C1">${svgI(icon, 20, 1.9)}</span>
      <span class="flex-1 min-w-0 flex flex-col gap-0.5"><span class="text-[15px] font-semibold">${label}</span>${sub ? `<span class="text-xs t-muted truncate">${esc(sub)}</span>` : ""}</span>
      <span class="t-dim">${svgI("chevR", 18)}</span></button>`;
  $("exSheetBody").innerHTML = `
    <div class="px-1 pb-2"><div class="text-xl font-bold">${esc(ex.name)}</div>
      <div class="text-[13px] t-muted">${esc([muscleOf(ex), ex.targetInfo, ex.kind !== "cardio" ? "Dinlenme " + (ex.rest ?? state.settings.restSec) + " sn" : ""].filter(Boolean).join(" · "))}</div></div>
    ${item(`openExerciseChart(${exIdx})`, "chart", "İlerleme grafiği", "Tahmini 1RM ve son kayıtlar")}
    ${ex.kind === "weight" && eq !== "bodyweight" ? item(`openPlateTool(${exIdx})`, "calc", eq === "plates" ? "Plaka ve ısınma" : "Kademe ve ısınma", plateSub) : ""}
    ${item(`openEditExercise(${exIdx})`, "edit", "Hareketi düzenle", ex.kind === "weight" ? "Set, tekrar, ekipman, kademeler, kas grubu" : "Set, süre, dinlenme")}
    <div class="grid grid-cols-2 gap-1.5">
      <button onclick="closeModal('exSheet'); moveExercise(${exIdx}, -1)" ${exIdx === 0 ? "disabled" : ""} class="min-h-[52px] rounded-2xl bg-[#1A1A1D] flex items-center justify-center gap-2 text-[14px] font-semibold ${exIdx === 0 ? "opacity-30" : ""}">${svgI("up", 18)} Yukarı taşı</button>
      <button onclick="closeModal('exSheet'); moveExercise(${exIdx}, 1)" ${last ? "disabled" : ""} class="min-h-[52px] rounded-2xl bg-[#1A1A1D] flex items-center justify-center gap-2 text-[14px] font-semibold ${last ? "opacity-30" : ""}">${svgI("down", 18)} Aşağı taşı</button>
    </div>
    ${ex.sets.length > 1 ? item(`removeLastSetFromExercise(${exIdx})`, "minus", ex.kind === "cardio" ? "Son bölümü sil" : "Son seti sil", `${ex.sets.length} → ${ex.sets.length - 1}`) : ""}
    <button onclick="closeModal('exSheet'); removeExercise(${exIdx})" class="w-full min-h-[60px] rounded-2xl px-2.5 flex items-center gap-3.5 bg-[#1A1A1D] text-left mt-1" style="color:#FF8A8A">
      <span class="w-10 h-10 shrink-0 rounded-xl bg-[#2A1517] flex items-center justify-center">${svgI("trash", 20, 1.9)}</span>
      <span class="flex-1 flex flex-col gap-0.5"><span class="text-[15px] font-semibold">Hareketi kaldır</span><span class="text-xs t-muted">6 saniye içinde geri alınabilir</span></span></button>
    <button onclick="closeModal('exSheet')" class="w-full h-[52px] rounded-2xl bg-[#26262A] font-bold text-[15px] mt-2">Kapat</button>`;
  openModal("exSheet");
}

// ---------------------------------------------------------------------------
// ÖĞÜNLER: SAAT, MODAL, SIRALAMA, SÜRÜKLE-BIRAK
// ---------------------------------------------------------------------------
let mealEditIdx = -1;
function openMealModal(mIdx) {
  mealEditIdx = mIdx == null ? -1 : mIdx;
  const m = mealEditIdx >= 0 ? curMeals()[mealEditIdx] : null;
  $("mealModalTitle").textContent = m ? "Öğünü Düzenle" : (state.dayType === "rest" ? "Dinlenme Günü Menüsüne Öğün Ekle" : "Antrenman Günü Menüsüne Öğün Ekle");
  $("mmName").value = m ? m.title : `${curMeals().length + 1}. Öğün: `;
  $("mmTime").value = m && m.time ? m.time : "";
  $("mmNote").value = m ? (m.targetNote || "") : "";
  openModal("mealModal");
}
// Saatli öğünü, kendisinden geç saatli ilk öğünün önüne yerleştirir; diğer öğünlerin sırası korunur
function placeByTime(meals, meal) {
  const i0 = meals.indexOf(meal);
  if (i0 >= 0) meals.splice(i0, 1);
  let idx = meals.findIndex(x => x.time && x.time > meal.time);
  if (idx < 0) {
    let last = -1;
    meals.forEach((x, i) => { if (x.time && x.time <= meal.time) last = i; });
    idx = last >= 0 ? last + 1 : meals.length;
  }
  meals.splice(idx, 0, meal);
}
function saveMealModal() {
  const title = $("mmName").value.trim();
  if (!title) { sayAlert("Ad eksik", "Öğün adını yaz."); return; }
  const time = /^\d{2}:\d{2}$/.test($("mmTime").value) ? $("mmTime").value : "";
  const note = $("mmNote").value.trim();
  const meals = curMeals();
  let target;
  if (mealEditIdx >= 0) {
    target = meals[mealEditIdx];
    target.title = title; target.targetNote = note;
    if (time) target.time = time; else delete target.time;
  } else {
    target = { id: "meal_" + Date.now(), title, targetNote: note, done: false, items: [] };
    if (time) target.time = time;
    meals.push(target);
  }
  if (time) placeByTime(meals, target);
  closeModal("mealModal");
  renderAll();
  const idx = curMeals().indexOf(target);
  if (mealEditIdx < 0) setTimeout(() => { const el = document.querySelector(`[data-meal-card="${idx}"]`); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); }, 60);
  toast(mealEditIdx >= 0 ? "✓ Öğün güncellendi" : `✓ "${title}" eklendi${time ? " (" + time + ")" : ""}`);
}

let mealDrag = null;
// Sürükle-bırak: öğün kartları (data-midx) ve Programım'daki hareket satırları (data-exidx) aynı mantığı kullanır.
document.addEventListener("pointerdown", e => {
  const h = e.target && e.target.closest ? e.target.closest(".drag-handle") : null;
  if (!h) return;
  const isEx = h.dataset.exidx != null;
  const cards = [...document.querySelectorAll(isEx ? "#progExList [data-ex-row]" : "#mealsContainer [data-meal-card]")];
  const from = parseInt(isEx ? h.dataset.exidx : h.dataset.midx, 10);
  const card = cards[from];
  if (!card || cards.length < 2) return;
  e.preventDefault();
  const sy = window.scrollY;
  mealDrag = {
    kind: isEx ? "ex" : "meal", dayIdx: state.activeWorkoutDayIdx,
    from, to: from, card, cards, startX: e.clientX, startY: e.clientY + sy,
    centers: cards.map(c => { const r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + sy + r.height / 2 }; })
  };
  card.style.transition = "none";
  card.style.position = "relative";
  card.style.zIndex = "30";
  card.style.boxShadow = "0 18px 40px rgba(0,0,0,.55)";
  try { h.setPointerCapture(e.pointerId); } catch (err) { /* yoksay */ }
});
document.addEventListener("pointermove", e => {
  if (!mealDrag) return;
  const sy = window.scrollY;
  if (e.clientY < 140) window.scrollBy(0, -14);
  else if (e.clientY > window.innerHeight - 150) window.scrollBy(0, 14);
  const isEx = mealDrag.kind === "ex";
  const dx = isEx ? 0 : e.clientX - mealDrag.startX, dy = e.clientY + sy - mealDrag.startY;
  mealDrag.card.style.transform = `translate(${dx}px, ${dy}px) scale(1.02)`;
  const c0 = mealDrag.centers[mealDrag.from];
  const cx = c0.x + dx, cy = c0.y + dy;
  let best = mealDrag.from, bd = Infinity;
  mealDrag.centers.forEach((c, i) => { const d = Math.hypot(c.x - cx, c.y - cy); if (d < bd) { bd = d; best = i; } });
  if (best !== mealDrag.to) {
    if (mealDrag.cards[mealDrag.to] && mealDrag.to !== mealDrag.from) mealDrag.cards[mealDrag.to].style.outline = "";
    mealDrag.to = best;
    if (best !== mealDrag.from) mealDrag.cards[best].style.outline = isEx ? "2px dashed #1FD1C1" : "2px dashed #22C55E";
  }
});
function endMealDrag() {
  if (!mealDrag) return;
  const { from, to, card, cards, kind, dayIdx } = mealDrag;
  mealDrag = null;
  card.style.transform = ""; card.style.zIndex = ""; card.style.boxShadow = ""; card.style.position = "";
  cards.forEach(c => { c.style.outline = ""; });
  if (to === from) return;
  if (kind === "ex") {
    const day = state.workoutDays[dayIdx];
    if (!day || dayIdx !== state.activeWorkoutDayIdx) { renderAll(); return; }
    const [x] = day.exercises.splice(from, 1);
    day.exercises.splice(to, 0, x);
    renderAll();
    toast("↕ Hareket taşındı");
    return;
  }
  const meals = curMeals();
  const [m] = meals.splice(from, 1);
  meals.splice(to, 0, m);
  renderAll();
  toast("↕ Öğün taşındı");
}
document.addEventListener("pointerup", endMealDrag);
document.addEventListener("pointercancel", endMealDrag);

// ---------------------------------------------------------------------------
// ÖZEL BESİN DÜZENLE / SİL
// ---------------------------------------------------------------------------
let cfEditId = null;
function editCustomFood(id) {
  const f = state.customFoods[id];
  if (!f) return;
  if (f.recipe) { openRecipeModal(id); return; }
  closeModal("pickerModal");
  cfEditId = id;
  $("cfTitle").textContent = "✎ Özel Besini Düzenle";
  $("cfName").value = String(f.name || "").replace(/^⭐\s*/, "");
  $("cfHint").classList.add("hidden");
  const gram = f.unit === "g" || f.unit === "ml";
  const serv = gram && num(f.serv, 0) > 0;
  const base = !gram ? 1 : serv ? num(f.serv) : 100;
  $("cfUnit").value = !gram ? "1adet" : serv ? "serv" : "100g";
  $("cfDef").value = fmtNum(serv ? num(f.serv) : num(f.def, gram ? 100 : 1));
  $("cfP").value = fmtNum(f.p * base);
  $("cfC").value = fmtNum(f.c * base);
  $("cfF").value = fmtNum(f.f * base);
  $("cfK").value = f.kcal != null ? fmtNum(f.kcal * base) : "";
  cfUnitChanged();
  openModal("customFoodModal");
}
function customFoodUses(id) {
  let n = 0;
  allMealLists().forEach(ms => ms.forEach(m => m.items.forEach(i => { if (i.foodId === id) n++; })));
  (state.combos || []).forEach(c => c.items.forEach(i => { if (i.foodId === id) n++; }));
  return n;
}
async function deleteCustomFood(id) {
  const f = state.customFoods[id];
  if (!f) return;
  const uses = customFoodUses(id);
  if (uses > 0 && !(await askConfirm(`${stripEmoji(f.name).replace(/^⭐\s*/, "")} silinsin mi?`, `${uses} öğün/komboda kullanılıyor. Silersen oralardan da çıkarılacak.`, "Sil", true))) return;
  snapshot();
  delete state.customFoods[id];
  invalidateFoodDB();
  allMealLists().forEach(ms => ms.forEach(m => { m.items = m.items.filter(i => i.foodId !== id); }));
  state.combos.forEach(c => { c.items = c.items.filter(i => i.foodId !== id); });
  state.combos = state.combos.filter(c => c.items.length);
  state.recentFoods = state.recentFoods.filter(x => x !== id);
  closeModal("pickerModal");
  renderAll();
  offerUndo(`🗑️ ${f.name} silindi`);
}

// ============================================================================
// v15 — MUTFAK: kombo, tarif, dünkü öğünü tekrarla, haftalık alışveriş listesi
// ============================================================================

// Öğeleri bir öğüne ekler; aynı besin zaten varsa miktarları toplar (ham/saklanan miktar)
function mergeItems(meal, items) {
  const db = getFoodDB();
  items.forEach(it => {
    if (it.est) { meal.items.push(clone(it)); return; }
    if (!db[it.foodId]) return;
    const ex = meal.items.find(i => !i.est && i.foodId === it.foodId);
    if (ex) ex.amount = round1(num(ex.amount) + num(it.amount));
    else meal.items.push({ foodId: it.foodId, amount: num(it.amount) });
  });
}
function itemsTotals(items) {
  let p = 0, c = 0, f = 0, cal = 0;
  items.forEach(i => { if (!i.est && !getFoodDB()[i.foodId]) return; const x = calcItemMacros(i); p += x.p; c += x.c; f += x.f; cal += x.cal; });
  return { p, c, f, cal };
}
// "2. Öğün: Öğle Yemeği" → "Öğle Yemeği"
function mealTitleBody(m) {
  const t = String(m.title || "");
  const i = t.indexOf(":");
  return (i > 0 && i <= 16 ? t.slice(i + 1) : t).trim() || t;
}

// ---------------------------------------------------------------------------
// KOMBO: bir öğünün besinleri "Favori Kase" gibi kaydedilir, tek dokunuşla eklenir
// ---------------------------------------------------------------------------
async function saveMealAsCombo(mIdx, dest) {
  const list = dest === "day" ? dayMeals() : curMeals();
  const m = list[mIdx];
  if (!m) return;
  const db = getFoodDB();
  const items = m.items.filter(i => !i.est && db[i.foodId]).map(i => ({ foodId: i.foodId, amount: num(i.amount) }));
  if (!items.length) { sayAlert("Kombo kaydedilemedi", "Bu öğünde kombo olarak kaydedilecek besin yok."); return; }
  const name = await askText("Kombonun adı", mealTitleBody(m).slice(0, 40), "örn: Favori Kase");
  if (name === null) return;
  const nm = name.trim().slice(0, 40) || "Kombo";
  state.combos.push({ id: "combo_" + Date.now().toString(36), name: nm, items });
  renderAll();
  toast(`★ "${nm}" kombo olarak kaydedildi (Besinler → Komboların)`);
}
function selectCombo(id) {
  foodUI.sel = "combo:" + id;
  renderFoodHead();
  renderFoodList();
  const el = $("comboSelCard");
  if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
}
function addComboToMeal(id) {
  const c = state.combos.find(x => x.id === id);
  const tIdx = foodTargetIdx();
  if (!c || tIdx < 0) return;
  const day = foodUI.dest !== "menu";
  const list = day ? ensureDayCopy() : curMeals();
  const meal = list[tIdx];
  mergeItems(meal, c.items);
  foodUI.sel = null;
  renderAll();
  const mid = meal.id;
  toast(`✓ ${c.name} → ${meal.title}${day ? " (yalnızca bugün)" : " (menüne, her gün)"}`, "ok", day ? { label: "Menüye de kaydet", fn: () => {
    const mm = curMeals().find(x => x.id === mid);
    if (!mm) { toast("Bu öğün menüde bulunamadı", "error"); return; }
    mergeItems(mm, c.items);
    renderAll();
    toast(`✓ Menüdeki "${mm.title}" öğününe de eklendi`);
  } } : null);
}
function deleteCombo(id) {
  const i = state.combos.findIndex(c => c.id === id);
  if (i < 0) return;
  snapshot();
  const c = state.combos.splice(i, 1)[0];
  foodUI.sel = null;
  renderAll();
  offerUndo(`🗑️ "${c.name}" kombosu silindi`);
}
function comboRowHtml(c) {
  const db = getFoodDB();
  const t = itemsTotals(c.items);
  const names = c.items.filter(i => db[i.foodId]).map(i => stripEmoji(db[i.foodId].name).replace(/^⭐\s*/, "")).join(", ");
  if (foodUI.sel === "combo:" + c.id) {
    const rows = c.items.map(i => {
      const f = db[i.foodId];
      if (!f) return "";
      return `<div class="flex items-center justify-between gap-2 py-1.5 text-[14px]"><span class="min-w-0 truncate">${esc(f.name)}</span><span class="n-muted whitespace-nowrap tabular-nums">${fmtNum(effAmount(i))} ${esc(f.unit)} · ${Math.round(calcItemMacros(i).cal)} kcal</span></div>`;
    }).join("");
    const tIdx = foodTargetIdx();
    return `<div class="n-elev n-sel rounded-[24px] p-4 space-y-3 my-2" id="comboSelCard" data-combo="${esc(c.id)}">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0"><h3 class="text-[17px] font-extrabold leading-snug break-words">${esc(c.name)}</h3><div class="text-[12px] n-muted">Kombo · ${c.items.length} besin</div></div>
          <div class="text-right shrink-0 whitespace-nowrap"><span class="t-display text-[28px] leading-none tabular-nums">${fmtInt(t.cal)}</span><span class="text-[12px] n-muted ml-1">kcal</span>
            <div class="text-[12px] font-semibold tabular-nums">${macroLine(t.p, t.c, t.f)}</div></div>
        </div>
        <div class="n-div">${rows}</div>
        <button id="comboAddBtn" onclick='addComboToMeal(${esc(JSON.stringify(c.id))})' class="n-btn w-full h-[52px] rounded-full text-[15px]" ${tIdx < 0 ? "disabled" : ""}>${tIdx < 0 ? "Önce bir öğün oluştur" : `Öğüne ekle · ${fmtInt(t.cal)} kcal`}</button>
        <div class="flex justify-end pt-1 n-bt">
          <button onclick='deleteCombo(${esc(JSON.stringify(c.id))})' class="n-btn-ghost h-11 px-4 rounded-full text-[13px] flex items-center gap-1.5 n-over">${svgI("trash", 16)}Komboyu sil</button>
        </div>
      </div>`;
  }
  return `<button onclick='selectCombo(${esc(JSON.stringify(c.id))})' class="w-full min-h-[64px] flex items-center justify-between gap-3 py-2.5 text-left n-bb" data-combo="${esc(c.id)}">
      <span class="min-w-0"><span class="flex items-center gap-1.5 text-[15px] font-bold leading-snug"><span class="n-accent shrink-0">${svgI("star", 16, 2)}</span><span class="truncate">${esc(c.name)}</span></span>
        <span class="block text-[12px] n-muted mt-0.5 truncate">${fmtInt(t.cal)} kcal · ${Math.round(t.p)} g protein · ${esc(names)}</span></span>
      <span class="w-10 h-10 rounded-full n-btn flex items-center justify-center shrink-0" aria-hidden="true">${svgI("plus", 20, 2.4)}</span>
    </button>`;
}

// ---------------------------------------------------------------------------
// TARİF: malzemeler + pişmiş toplam ağırlık → 100 g makroları; tek besin olarak kaydedilir
// ---------------------------------------------------------------------------
let rcp = { id: null, items: [] };
function openRecipeModal(editId) {
  const f = editId && state.customFoods[editId];
  const isRec = !!(f && f.recipe);
  rcp = { id: isRec ? editId : null, items: isRec ? clone(f.recipe.items) : [] };
  $("rcTitle").textContent = isRec ? "Tarifi düzenle" : "Yeni tarif";
  $("rcName").value = isRec ? stripEmoji(f.name) : "";
  $("rcCooked").value = isRec ? fmtNum(f.recipe.cooked) : "";
  closeModal("pickerModal");
  renderRecipe();
  openModal("recipeModal");
}
function recipeTotals() {
  const db = getFoodDB();
  let p = 0, c = 0, f = 0, cal = 0, raw = 0;
  rcp.items.forEach(i => {
    const fd = db[i.foodId];
    if (!fd) return;
    const a = num(i.amount, 0);
    p += fd.p * a; c += fd.c * a; f += fd.f * a; cal += kcalPerUnit(fd) * a;
    if (isScalable(fd)) raw += a;
  });
  return { p, c, f, cal, raw };
}
function renderRecipe() {
  const db = getFoodDB();
  $("rcItems").innerHTML = rcp.items.map((it, i) => {
    const fd = db[it.foodId];
    if (!fd) return "";
    return `<div class="flex items-center gap-1.5 py-1.5" data-rc-item="${i}">
        <div class="flex-1 min-w-0"><div class="text-[14px] font-semibold truncate">${esc(fd.name)}</div><div id="rcK${i}" class="text-[12px] n-muted tabular-nums">${Math.round(kcalPerUnit(fd) * num(it.amount))} kcal</div></div>
        <input type="text" inputmode="decimal" data-fk="rc-${i}" value="${esc(fmtNum(it.amount))}" oninput="rcAmount(${i}, this.value)" class="n-amt shrink-0" aria-label="${esc(fd.name)} miktarı" />
        <span class="text-[11px] n-muted w-10 min-w-0 truncate">${esc(fd.unit)}</span>
        <button onclick="rcRemove(${i})" class="w-11 h-11 shrink-0 rounded-full flex items-center justify-center n-over" aria-label="${esc(fd.name)} çıkar">${svgI("x", 18, 2.2)}</button>
      </div>`;
  }).join("") || `<p class="text-[13px] n-dim py-2">Henüz malzeme yok. Aşağıdan ekle.</p>`;
  updateRecipeSummary();
}
function rcAmount(i, v) {
  const it = rcp.items[i];
  if (!it) return;
  it.amount = Math.max(0, num(v, 0));
  const fd = getFoodDB()[it.foodId];
  if (fd && $("rcK" + i)) $("rcK" + i).textContent = `${Math.round(kcalPerUnit(fd) * it.amount)} kcal`;
  updateRecipeSummary();
}
function rcRemove(i) { rcp.items.splice(i, 1); renderRecipe(); }
function updateRecipeSummary() {
  const t = recipeTotals();
  const cooked = num($("rcCooked").value, 0);
  $("rcCooked").placeholder = t.raw > 0 ? `çiğ malzemeler toplam ${fmtInt(t.raw)} g` : "örn: 1200";
  const per = cooked > 0 ? 100 / cooked : 0;
  $("rcSum").innerHTML = `<div class="flex items-baseline justify-between gap-2"><span class="n-muted">Tarifin tamamı</span><strong class="tabular-nums">${fmtInt(t.cal)} kcal · ${macroLine(t.p, t.c, t.f)}</strong></div>`
    + (cooked > 0
      ? `<div class="flex items-baseline justify-between gap-2 mt-1"><span class="n-muted">Pişmiş 100 g</span><strong class="tabular-nums n-accent">${fmtInt(t.cal * per)} kcal</strong></div>
         <div class="text-right text-[12px] font-semibold tabular-nums">${macroLine(t.p * per, t.c * per, t.f * per, true)}</div>`
      : `<div class="text-[12px] n-dim mt-1">100 g değerlerini hesaplamam için pişmiş toplam ağırlığı yaz.</div>`);
}
function rcAddIngredient() {
  const db = getFoodDB();
  const cats = {};
  Object.keys(db).forEach(id => {
    if (id === rcp.id) return;
    const f = db[id];
    if (isHiddenFood(f)) return;
    const cat = stripEmoji(f.cat || "Diğer");
    (cats[cat] = cats[cat] || []).push({ id, label: f.name, sub: `${fmtNum(f.def)} ${f.unit} · ${Math.round(kcalPerUnit(f) * num(f.def, 1))} kcal` });
  });
  const groups = Object.keys(cats).map(c => ({ label: c, short: c.replace(/\s*[&/].*$/, ""), items: cats[c] }));
  // Seçici, tarif penceresinin üstünde açılır; seçince tarif penceresi yerinde kalır
  openPicker("Malzeme ekle", groups, it => {
    const f = getFoodDB()[it.id];
    const ex = rcp.items.find(x => x.foodId === it.id);
    if (ex) ex.amount = round1(num(ex.amount) + num(f.def, 1)); else rcp.items.push({ foodId: it.id, amount: num(f.def, 1) });
    renderRecipe();
  });
}
function saveRecipe() {
  const name = $("rcName").value.trim().slice(0, 50);
  if (!name) { sayAlert("Ad eksik", "Lütfen tarifin adını yaz."); return; }
  if (!rcp.items.length) { sayAlert("Malzeme yok", "En az bir malzeme ekle."); return; }
  const cooked = num($("rcCooked").value, 0);
  if (!(cooked > 0) || cooked > 30000) { sayAlert("Pişmiş ağırlık eksik", "Pişmiş toplam ağırlığı gram olarak yaz (tencereyi tartıp boş tencerenin ağırlığını düş)."); return; }
  const t = recipeTotals();
  const id = rcp.id || "custom_recipe_" + Date.now().toString(36);
  const editing = !!rcp.id;
  state.customFoods[id] = {
    name: "🍲 " + name, cat: "🍲 Tariflerim", unit: "g", step: 10, def: Math.max(10, Math.min(250, Math.round(cooked))),
    p: t.p / cooked, c: t.c / cooked, f: t.f / cooked, kcal: t.cal / cooked,
    recipe: { items: rcp.items.filter(i => num(i.amount) > 0).map(i => ({ foodId: i.foodId, amount: num(i.amount) })), cooked }
  };
  invalidateFoodDB();
  closeModal("recipeModal");
  toast(editing ? `✓ ${name} tarifi güncellendi` : `🍲 ${name} tarifi besin listene eklendi`);
  renderAll();
  if (!editing && state.activeTab === "nutrition" && state.nutriView === "foods") { foodUI.cat = "recipes"; renderFoods(); selectFood(id); }
}

// ---------------------------------------------------------------------------
// DÜNKÜ ÖĞÜNÜ TEKRARLA: son arşivlenen günde aynı öğünün içeriğini bugüne kopyalar
// ---------------------------------------------------------------------------
function lastDayMealFor(meal) {
  const keys = Object.keys(state.dailyLogs).filter(k => k < dayKey() && Array.isArray(state.dailyLogs[k].meals)).sort().reverse();
  if (!keys.length) return null;
  const k = keys[0];
  const ms = state.dailyLogs[k].meals;
  const m = ms.find(x => x.id === meal.id) || ms.find(x => x.title === meal.title);
  if (!m || !Array.isArray(m.items)) return null;
  const db = getFoodDB();
  const items = m.items.filter(i => i && (i.est || db[i.foodId]));
  return items.length ? { key: k, items } : null;
}
function dayLabelShort(k) {
  const y = logicalNow(); y.setDate(y.getDate() - 1);   // v25: gün geçiş saatine göre "dün"
  if (k === todayStr(y)) return "Dünkü";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(k);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }) + " günkü" : "Önceki";
}
function repeatLastMeal(mIdx) {
  const cur = dayMeals()[mIdx];
  const r = cur && lastDayMealFor(cur);
  if (!r) return;
  snapshot();
  const c = ensureDayCopy();
  const m = c[mIdx];
  m.items = clone(r.items);
  openEditMeals.delete(m.id);
  renderAll();
  offerUndo(`↻ ${shortMealTitle(m)}: ${dayLabelShort(r.key).toLocaleLowerCase("tr")} öğün tekrarlandı (yalnızca bugün)`);
}

// ---------------------------------------------------------------------------
// HAFTALIK ALIŞVERİŞ LİSTESİ: antrenman menüsü × antrenman günü + dinlenme menüsü × kalan günler
// Tarifler malzemelerine açılır. Gösterilen miktarlar kiloya göre gramaj dahil (yediğin kadar).
// ---------------------------------------------------------------------------
function shopTrainDays() {
  const n = state.shopTrainDays;
  return Number.isInteger(n) && n >= 0 && n <= 7 ? n : Math.max(0, Math.min(7, state.workoutDays.length));
}
function shopList() {
  const db = getFoodDB();
  const acc = {};
  const expand = (id, amt, depth) => {
    const f = db[id];
    if (!f || !(amt > 0)) return;
    if (f.recipe && depth < 4 && num(f.recipe.cooked, 0) > 0) {
      const k = amt / num(f.recipe.cooked);
      f.recipe.items.forEach(ri => expand(ri.foodId, num(ri.amount) * k, depth + 1));
      return;
    }
    acc[id] = (acc[id] || 0) + amt;
  };
  const nT = shopTrainDays(), nR = 7 - nT;
  [[state.meals, nT], [state.restMeals, nR]].forEach(([ms, n]) => {
    if (!n) return;
    ms.forEach(m => m.items.forEach(i => { if (!i.est) expand(i.foodId, effAmount(i) * n, 0); }));
  });
  return Object.keys(acc).map(id => ({ id, f: db[id], amt: acc[id] }))
    .sort((a, b) => stripEmoji(a.f.cat || "").localeCompare(stripEmoji(b.f.cat || ""), "tr") || stripEmoji(a.f.name).localeCompare(stripEmoji(b.f.name), "tr"));
}
function fmtShopAmt(f, a) {
  if (f.unit === "g") return a >= 1000 ? fmtKg(round2(a / 1000)) + " kg" : (Math.ceil(a / 10) * 10) + " g";
  if (f.unit === "ml") return a >= 1000 ? fmtKg(round2(a / 1000)) + " L" : (Math.ceil(a / 10) * 10) + " ml";
  if (f.unit === "adet") return Math.ceil(a - 1e-9) + " adet";
  return fmtNum(Math.ceil(a * 2 - 1e-9) / 2) + " " + f.unit;
}
function shopName(f) { return stripEmoji(f.name).replace(/^⭐\s*/, ""); }
function openShopList() { renderShopList(); openModal("shopModal"); }
function setShopDays(d) {
  state.shopTrainDays = Math.max(0, Math.min(7, shopTrainDays() + d));
  renderAll();
  renderShopList();
}
function toggleShop(id) {
  if (state.shopChecked[id]) delete state.shopChecked[id]; else state.shopChecked[id] = true;
  saveState();
  renderShopList();
}
function clearShopChecks() {   // v26: Geri al
  snapshot(); state.shopChecked = {}; saveState(); renderShopList();
  toast("İşaretler temizlendi", "ok", { label: "↶ Geri al", fn: () => { doUndo(); renderShopList(); } });
}
function renderShopList() {
  const list = shopList();
  const nT = shopTrainDays();
  $("shopDays").innerHTML = `<div class="flex items-center justify-between gap-2">
      <div class="min-w-0"><div class="text-[14px] font-bold">Antrenman günü</div><div class="text-[12px] n-muted">Haftanın kalan ${7 - nT} günü dinlenme menüsü</div></div>
      <div class="flex items-center gap-1 shrink-0">
        <button onclick="setShopDays(-1)" class="n-btn-ghost w-11 h-11 rounded-full flex items-center justify-center" aria-label="Antrenman gününü azalt">${svgI("minus", 18, 2.4)}</button>
        <span id="shopDaysVal" class="t-display text-[24px] w-8 text-center tabular-nums">${nT}</span>
        <button onclick="setShopDays(1)" class="n-btn-ghost w-11 h-11 rounded-full flex items-center justify-center" aria-label="Antrenman gününü artır">${svgI("plus", 18, 2.4)}</button>
      </div>
    </div>`;
  let lastCat = null;
  $("shopItems").innerHTML = list.length ? list.map(r => {
    const cat = stripEmoji(r.f.cat || "Diğer");
    const on = !!state.shopChecked[r.id];
    const head = cat !== lastCat ? `<div class="n-label pt-3 pb-1">${esc(cat.toLocaleUpperCase("tr"))}</div>` : "";
    lastCat = cat;
    return head + `<label class="flex items-center gap-3 min-h-[48px] py-1 cursor-pointer n-bb" data-shop="${esc(r.id)}">
        <input type="checkbox" class="n-check shrink-0" ${on ? "checked" : ""} onchange='toggleShop(${esc(JSON.stringify(r.id))})' aria-label="${esc(shopName(r.f))} alındı" />
        <span class="flex-1 min-w-0 text-[15px] font-semibold ${on ? "line-through n-dim" : ""}">${esc(shopName(r.f))}</span>
        <span class="shrink-0 text-[14px] font-bold tabular-nums ${on ? "line-through n-dim" : ""}">${esc(fmtShopAmt(r.f, r.amt))}</span>
      </label>`;
  }).join("") : `<p class="text-[14px] n-muted text-center py-6">Menülerinde besin yok.</p>`;
  const left = list.filter(r => !state.shopChecked[r.id]).length;
  $("shopCount").textContent = list.length ? `${left} / ${list.length} ürün alınacak` : "";
}
function shopText() {
  const list = shopList();
  const left = list.filter(r => !state.shopChecked[r.id]);
  const rows = (left.length ? left : list).map(r => `• ${shopName(r.f)} — ${fmtShopAmt(r.f, r.amt)}`);
  const nT = shopTrainDays();
  return `AYK+ alışveriş listesi (7 gün: ${nT} antrenman, ${7 - nT} dinlenme)\n` + rows.join("\n");
}
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; }
  catch (e) {
    const ta = document.createElement("textarea");
    ta.value = t; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e2) { ok = false; }
    ta.remove();
    return ok;
  }
}
async function copyShopList() {
  const ok = await copyText(shopText());
  toast(ok ? "📋 Liste kopyalandı. Notlar'ı açıp yapıştırabilirsin." : "Kopyalanamadı; Paylaş düğmesini dene.", ok ? "ok" : "error");
}
async function shareShopList() {
  try { await navigator.share({ title: "Alışveriş listesi", text: shopText() }); }
  catch (e) { if (e && e.name !== "AbortError") copyShopList(); }
}

// ============================================================================
// v16 — AKILLI: kalan makroya göre tamamla, haftalık görünüm (Geçmiş)
// ============================================================================

// ---------------------------------------------------------------------------
// KALAN HEDEFİ KAPATAN SEÇENEKLER: yalnızca kullanıcının sık yediği/kayıtlı besinlerden,
// önce kalan protein, sonra kalan kalori hedeflenir.
// ---------------------------------------------------------------------------
// v26: arama her harfte yeniden saymasın (besin tablosu sürümü değişince yenilenir)
let _freqC = null;
function frequentFoodsCached(limit) {
  if (!_freqC || _freqC.ver !== foodDbVer || _freqC.limit !== limit) _freqC = { ver: foodDbVer, limit, ids: frequentFoods(limit) };
  return _freqC.ids;
}
// v26: arama kutusu: yazmayı ~150 ms bırakınca aranır (boşaltınca hemen)
let _fsTimer = null;
function foodSearchInput() {
  clearTimeout(_fsTimer);
  const run = () => { _fsTimer = null; foodUI.limit = 0; renderFoodList(); };
  if (!$("foodSearch").value.trim()) run(); else _fsTimer = setTimeout(run, 150);
}
function frequentFoods(limit = 30) {
  const db = getFoodDB();
  const cnt = {};
  const bump = (id, w) => { if (id && id !== "_est" && db[id] && !isHiddenFood(db[id])) cnt[id] = (cnt[id] || 0) + w; };
  allMealLists().forEach(ms => ms.forEach(m => m.items.forEach(i => bump(i.foodId, 1))));
  (state.combos || []).forEach(c => c.items.forEach(i => bump(i.foodId, 1)));
  state.recentFoods.forEach((id, i) => bump(id, 2 - i * 0.1));
  Object.keys(state.dailyLogs).forEach(k => {
    const ms = state.dailyLogs[k].meals;
    if (Array.isArray(ms)) ms.forEach(m => (m.items || []).forEach(i => bump(i.foodId, 0.5)));
  });
  return Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]).slice(0, limit);
}
// Ekranda gösterilecek "makul" miktar: gram/ml 10'ar, diğerleri adım (en az 0,5)
// Gerçekçi olsun diye bir besinden en fazla porsiyonunun 2,5 katı önerilir (40 g zeytinyağı gibi miktarlar çıkmaz)
function maxSuggestAmt(f) {
  const def = num(f.def, isScalable(f) ? 100 : 1);
  return isScalable(f) ? Math.min(500, Math.max(30, def * 2.5)) : Math.min(6, Math.max(1, def * 2.5));
}
function niceAmt(f, a) {
  const cap = maxSuggestAmt(f);
  if (isScalable(f)) return Math.max(10, Math.min(Math.floor(cap / 10) * 10 || 10, Math.round(a / 10) * 10));
  const st = Math.max(0.5, num(f.step, 1));
  return Math.max(st, Math.min(Math.floor(cap / st) * st || st, Math.round(a / st) * st));
}
function fillSuggestions(remP, remK) {
  const db = getFoodDB();
  const ids = frequentFoods(30);
  const macro = (id, a) => { const f = db[id]; return { p: f.p * a, k: kcalPerUnit(f) * a }; };
  const score = (P, K) => Math.abs(P - remP) * 8 + (K > remK ? (K - remK) * 2 : remK - K);
  const out = [];
  // Tek besin: proteini kapatacak kadar
  ids.forEach(id => {
    const f = db[id];
    if (!(f.p > 0)) return;
    const a = niceAmt(f, remP / f.p);
    const m = macro(id, a);
    if (m.k > remK + 80) return;
    out.push({ parts: [{ id, a }], P: m.p, K: m.k, s: score(m.p, m.k) });
  });
  // İki besin: A proteini, B kalan kaloriyi kapatır
  ids.forEach(A => {
    const fa = db[A];
    if (!(fa.p > 0) || (fa.p * 4) / Math.max(1e-9, kcalPerUnit(fa)) < 0.25) return;   // A protein kaynağı olmalı
    ids.forEach(B => {
      if (A === B) return;
      const fb = db[B];
      const kb = kcalPerUnit(fb);
      if (!(kb > 0)) return;
      const a = niceAmt(fa, remP / fa.p);
      const ma = macro(A, a);
      const leftK = remK - ma.k;
      if (leftK < 60) return;
      const b = niceAmt(fb, leftK / kb);
      const mb = macro(B, b);
      const P = ma.p + mb.p, K = ma.k + mb.k;
      if (K > remK + 80) return;
      out.push({ parts: [{ id: A, a }, { id: B, a: b }], P, K, s: score(P, K) });
    });
  });
  out.sort((x, y) => x.s - y.s);
  // Çeşitlilik: aynı besin kümesi bir kez; aynı ana protein kaynağı en fazla iki seçenekte
  const seen = new Set(), used = {}, pick = [];
  for (const o of out) {
    const key = o.parts.map(p => p.id).sort().join("+");
    const a0 = o.parts[0].id;
    if (seen.has(key) || (used[a0] || 0) >= 2) continue;
    seen.add(key);
    used[a0] = (used[a0] || 0) + 1;
    pick.push(o);
    if (pick.length >= 3) break;
  }
  return pick;
}
let foodSuggestCache = [];
function renderFoodSuggest() {
  const el = $("foodSuggest");
  if (!el) return;
  const tIdx = foodTargetIdx();
  const t = getTargets();
  const tot = nutritionTotals(foodMeals());
  const remP = t.proTarget - tot.p, remK = t.calTarget - tot.cal;
  foodSuggestCache = tIdx >= 0 && remK >= 80 && remP >= 8 ? fillSuggestions(remP, remK) : [];
  if (!foodSuggestCache.length) { el.innerHTML = ""; el.classList.add("hidden"); return; }
  const db = getFoodDB();
  el.classList.remove("hidden");
  el.innerHTML = `<div class="n-label mb-2">KALAN HEDEFİNİ KAPATAN SEÇENEKLER</div>
    <p class="text-[12px] n-muted mb-2">Kalan: <strong class="n-text tabular-nums">${fmtInt(remK)} kcal</strong> · <strong class="n-p tabular-nums">${fmtInt(remP)} g protein</strong>. Sık yediğin besinlerden:</p>
    <div class="space-y-2">${foodSuggestCache.map((o, i) => {
      const label = o.parts.map(p => `${fmtNum(p.a)} ${db[p.id].unit} ${stripEmoji(db[p.id].name).replace(/^⭐\s*/, "")}`).join(" + ");
      const lk = Math.round(remK - o.K), lp = Math.round(remP - o.P);
      const kTxt = lk >= 0 ? `${fmtInt(lk)} kcal kalır` : `${fmtInt(-lk)} kcal aşar`;
      const pTxt = lp > 0 ? `${fmtInt(lp)} g P kalır` : "protein tamam";
      return `<button onclick="addSuggestion(${i})" class="w-full min-h-[56px] n-card rounded-2xl px-3.5 py-2.5 text-left flex items-center justify-between gap-3" data-suggest="${i}">
          <span class="min-w-0"><span class="block text-[14px] font-bold leading-snug">${esc(label)}</span>
            <span class="block text-[12px] n-muted tabular-nums mt-0.5">${fmtInt(o.K)} kcal · ${fmtInt(o.P)} g protein → ${kTxt}, ${pTxt}</span></span>
          <span class="w-10 h-10 rounded-full n-btn flex items-center justify-center shrink-0" aria-hidden="true">${svgI("plus", 20, 2.4)}</span>
        </button>`;
    }).join("")}</div>`;
}
function addSuggestion(i) {
  const o = foodSuggestCache[i];
  const tIdx = foodTargetIdx();
  if (!o || tIdx < 0) return;
  const day = foodUI.dest !== "menu";
  const list = day ? ensureDayCopy() : curMeals();
  const meal = list[tIdx];
  const db = getFoodDB();
  const items = o.parts.map(p => ({ foodId: p.id, amount: rawFromEff(db[p.id], p.a) }));
  mergeItems(meal, items);
  o.parts.forEach(p => { state.recentFoods = [p.id, ...state.recentFoods.filter(x => x !== p.id)].slice(0, 8); });
  renderAll();
  const mid = meal.id;
  toast(`✓ ${o.parts.length} besin → ${meal.title}${day ? " (yalnızca bugün)" : " (menüne, her gün)"}`, "ok", day ? { label: "Menüye de kaydet", fn: () => {
    const mm = curMeals().find(x => x.id === mid);
    if (!mm) { toast("Bu öğün menüde bulunamadı", "error"); return; }
    mergeItems(mm, items);
    renderAll();
    toast(`✓ Menüdeki "${mm.title}" öğününe de eklendi`);
  } } : null);
}

// ---------------------------------------------------------------------------
// HAFTALIK GÖRÜNÜM (Geçmiş): 7 günlük ortalama, hedef tutturma takvimi (7/30 gün),
// haftalık kalori bütçesi, 7 günlük hareketli kilo ortalaması
// ---------------------------------------------------------------------------
// Bir günün alınan kalorisi/proteini: öğün tiki varsa yenen, yoksa plan (kalori koçuyla aynı kural)
function logIntake(d) {
  if (!d) return null;
  const eaten = num(d.mealsDone) > 0 && num(d.eatenKcal) > 0;
  const k = eaten ? num(d.eatenKcal) : num(d.kcal);
  if (!(k > 0)) return null;
  return { k, p: eaten ? num(d.eatenP) : num(d.p, num(d.eatenP)), t: num(d.calTarget, 0), eaten };
}
function dateKeyOffset(n) { const d = logicalNow(); d.setDate(d.getDate() + n); return todayStr(d); }
function keyToDate(k) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(k); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
// Hedefe yakınlık: yeşil ±%5 (en az 50 kcal), sarı ±%15, kırmızı daha uzak
function hitClass(k, t) {
  if (!(t > 0)) return "none";
  const d = Math.abs(k - t);
  if (d <= Math.max(50, t * 0.05)) return "ok";
  if (d <= t * 0.15) return "near";
  return "far";
}
function weekStats() {
  const days7 = [];
  for (let i = 7; i >= 1; i--) { const k = dateKeyOffset(-i); const x = logIntake(state.dailyLogs[k]); if (x) days7.push(x); }
  const avgK = days7.length ? days7.reduce((a, b) => a + b.k, 0) / days7.length : 0;
  const avgP = days7.length ? days7.reduce((a, b) => a + b.p, 0) / days7.length : 0;
  // Bu hafta (Pazartesi–Pazar)
  const t = getTargets().calTarget;
  const ws = new Date(weekStart(logicalNow()));
  let total = 0, taken = 0, daysLeft = 0;
  const today = dayKey();
  for (let i = 0; i < 7; i++) {
    const d = new Date(ws); d.setDate(ws.getDate() + i);
    const k = todayStr(d);
    if (k < today) {
      const x = logIntake(state.dailyLogs[k]);
      total += x && x.t > 0 ? x.t : t;
      if (x) taken += x.k;
    } else {
      total += t;
      if (k === today) taken += eatenTotals().cal;
      daysLeft++;
    }
  }
  return { n7: days7.length, avgK, avgP, total, taken, left: total - taken, daysLeft };
}
function weightAvg7() {
  const from = Date.now() - 7 * DAY_MS;
  const ws = state.weightLogs.filter(l => l.ts && l.ts >= from && num(l.weight) > 0).map(l => num(l.weight));
  return ws.length ? { avg: ws.reduce((a, b) => a + b, 0) / ws.length, n: ws.length } : null;
}
function setNutriHistRange(r) { state.nutriHistRange = r === "30" ? "30" : "7"; renderAll(); }
function heatHtml(n) {
  const cells = [];
  const start = keyToDate(dateKeyOffset(-n + 1));
  const lead = (start.getDay() + 6) % 7;   // Pazartesi başlangıçlı ızgara
  for (let i = 0; i < lead; i++) cells.push(`<span aria-hidden="true"></span>`);
  for (let i = n - 1; i >= 0; i--) {
    const k = dateKeyOffset(-i);
    const isToday = k === dayKey();
    const x = isToday ? null : logIntake(state.dailyLogs[k]);
    const cls = isToday ? "today" : x ? hitClass(x.k, x.t) : "none";
    const d = keyToDate(k);
    const lbl = d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
    const tip = isToday ? `${lbl}: bugün (devam ediyor)` : x ? `${lbl}: ${fmtInt(x.k)} / ${fmtInt(x.t)} kcal` : `${lbl}: kayıt yok`;
    cells.push(`<span class="n-heat ${cls}" data-heat="${k}" data-cls="${cls}" role="img" aria-label="${esc(tip)}" title="${esc(tip)}">${d.getDate()}</span>`);
  }
  const wd = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"].map(x => `<span class="text-[11px] n-dim text-center">${x}</span>`).join("");
  return `<div class="grid grid-cols-7 gap-1.5">${wd}${cells.join("")}</div>`;
}
function weekCardHtml() {
  const w = weekStats();
  const wa = weightAvg7();
  const lastLog = state.weightLogs.reduce((m, l) => (!m || num(l.ts, 0) >= num(m.ts, 0) ? l : m), null);
  const last = lastLog ? num(lastLog.weight) : 0;
  const range = state.nutriHistRange === "30" ? "30" : "7";
  const perDay = w.daysLeft > 0 ? Math.round(w.left / w.daysLeft) : 0;
  return `<section id="weekCard" class="n-card rounded-[22px] p-4 space-y-4" aria-label="Haftalık görünüm">
      <div class="flex items-baseline justify-between gap-2"><span class="n-label">SON 7 GÜN</span><span class="text-[12px] n-dim">${w.n7} gün kayıt</span></div>
      <div class="grid grid-cols-2 gap-3">
        <div><div class="text-[12px] n-muted">Ortalama kalori</div><div class="t-display text-[26px] leading-none tabular-nums mt-1" id="avgKcal">${w.n7 ? fmtInt(w.avgK) : "—"}</div><div class="text-[11px] n-dim">kcal / gün</div></div>
        <div><div class="text-[12px] n-muted">Ortalama protein</div><div class="t-display text-[26px] leading-none tabular-nums mt-1 n-p" id="avgPro">${w.n7 ? fmtInt(w.avgP) : "—"}</div><div class="text-[11px] n-dim">g / gün</div></div>
      </div>
      <div class="pt-3 n-bt space-y-2.5">
        <div class="flex items-center justify-between gap-2">
          <span class="n-label">HEDEF TUTTURMA</span>
          <div class="n-seg grid-cols-2 w-[150px]" aria-label="Takvim aralığı">
            <button onclick="setNutriHistRange('7')" class="${range === "7" ? "on" : ""}" aria-pressed="${range === "7"}">7 gün</button>
            <button onclick="setNutriHistRange('30')" class="${range === "30" ? "on" : ""}" aria-pressed="${range === "30"}">30 gün</button>
          </div>
        </div>
        <div id="heatGrid">${heatHtml(range === "30" ? 30 : 7)}</div>
        <div class="flex flex-wrap gap-x-3 gap-y-1 text-[11px] n-muted">
          <span class="flex items-center gap-1"><i class="n-heat-dot ok"></i>Hedefte (±%5)</span>
          <span class="flex items-center gap-1"><i class="n-heat-dot near"></i>Yakın (±%15)</span>
          <span class="flex items-center gap-1"><i class="n-heat-dot far"></i>Uzak</span>
          <span class="flex items-center gap-1"><i class="n-heat-dot none"></i>Kayıt yok</span>
        </div>
      </div>
      <div class="pt-3 n-bt space-y-1.5" id="weekBudget">
        <span class="n-label">BU HAFTANIN KALORİ BÜTÇESİ</span>
        <div class="flex justify-between gap-2 text-[14px]"><span class="n-muted">Haftalık hedef</span><strong class="tabular-nums">${fmtInt(w.total)} kcal</strong></div>
        <div class="flex justify-between gap-2 text-[14px]"><span class="n-muted">Şu ana kadar alınan</span><strong class="tabular-nums">${fmtInt(w.taken)} kcal</strong></div>
        <div class="flex justify-between gap-2 text-[14px]"><span class="n-muted">Kalan</span><strong class="tabular-nums ${w.left < 0 ? "n-over" : "n-accent"}">${fmtInt(w.left)} kcal</strong></div>
        ${w.daysLeft > 0 ? `<p class="text-[12px] n-dim">Kalan ${w.daysLeft} günde (bugün dahil) günde ortalama ~${fmtInt(perDay)} kcal. Geçmiş günlerde öğün tiki yoksa planlanan kalori sayılır.</p>` : ""}
      </div>
      <div class="pt-3 n-bt flex items-center justify-between gap-2 text-[14px]" id="weightAvgRow">
        <span class="n-muted">Kilo${last ? ` · son tartı <strong class="n-text">${fmtNum(last)} kg</strong>` : ""}</span>
        <span>${wa ? `7 günlük ort. <strong class="tabular-nums">${fmtNum(wa.avg)} kg</strong> <span class="text-[11px] n-dim">(${wa.n} tartı)</span>` : `<span class="n-dim text-[12px]">Son 7 günde tartı yok</span>`}</span>
      </div>
    </section>`;
}

// ============================================================================
// v18 — BESİN VERİTABANI: USDA (foods.js), akıllı arama, porsiyonlar, bulunamayan aramalar
// ============================================================================
const FOOD_PAGE = 60;   // listede bir seferde gösterilen sonuç
// Aramada eş anlamlı / pişirme kelimeleri (normalleştirilmiş yazımla)
const SEARCH_SYN = {
  pismis: ["pismis", "izgara", "haslanmis", "firinda", "kizartilmis", "tavada", "kavrulmus", "pisirilmis"],
  haslama: ["haslanmis", "haslama"], haslanmis: ["haslanmis", "haslama"],
  kizartma: ["kizartilmis", "kizartma"], kizarmis: ["kizartilmis", "kizarmis"],
  firin: ["firinda", "firin"], izgara: ["izgara"], cig: ["cig"],
  pilic: ["tavuk", "pilic"], tavuk: ["tavuk", "pilic"], dana: ["dana", "sigir"], sigir: ["dana", "sigir"],
  kuzu: ["kuzu"], koyun: ["kuzu", "koyun"], yagsiz: ["yagsiz", "az yagli", "light"], light: ["light", "yagsiz", "az yagli"],
  ekmek: ["ekmek", "ekmegi"], peynir: ["peynir", "peyniri"], yogurt: ["yogurt", "yogurdu"], sut: ["sut", "sutu"],
  corba: ["corba", "corbasi"], pilav: ["pilav", "pilavi"], salata: ["salata", "salatasi"], tatli: ["tatli", "tatlisi"]
};
// Kısa Damerau–Levenshtein (yazım hatası toleransı için)
function editDist(a, b) {
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 2) return 3;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    const c = a[i - 1] === b[j - 1] ? 0 : 1;
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[m][n];
}
let _sIdx = null, _sIdxDb = null;
const _sEntry = new WeakMap();   // v26: besin nesnesi başına hazır arama kaydı (her renderAll'da yeniden hesaplanmasın)
function searchIndex() {
  const db = getFoodDB();
  if (_sIdx && _sIdxDb === db) return _sIdx;
  _sIdx = {};
  Object.keys(db).forEach(id => {
    const f = db[id];
    if (isHiddenFood(f)) return;
    const src = f.name + "|" + (f.cat || "") + "|" + (f.aliases || []).join(" ");
    const old = _sEntry.get(f);
    if (old && old.src === src) { _sIdx[id] = old; return; }   // özel besin yerinde düzenlenirse src değişir → yeniden hesaplanır
    const name = normSearch(stripEmoji(f.name).replace(/^⭐\s*/, ""));
    const extra = normSearch((f.aliases || []).join(" ") + " " + stripEmoji(f.cat || ""));
    const tokens = (name + " " + extra).split(/[^a-z0-9%]+/).filter(t => t.length > 1);
    const e = { src, name, nameTok: name.split(/[^a-z0-9%]+/).filter(Boolean), extra, tokens };
    _sEntry.set(f, e);
    _sIdx[id] = e;
  });
  _sIdxDb = db;
  return _sIdx;
}
// Tek kelimenin bir besine uyum puanı (0 = uymuyor). fuzzy = yazım hatası taraması (yavaş; v26'dan beri yalnızca az sonuçta)
function wordScore(w, e, fuzzy = true) {
  const alts = SEARCH_SYN[w] || [w];
  let best = 0;
  for (const a of alts) {
    if (e.nameTok.some(t => t.startsWith(a))) best = Math.max(best, 150);
    else if (e.name.includes(a)) best = Math.max(best, 100);
    else if (e.extra.includes(a)) best = Math.max(best, 60);
  }
  if (best || !fuzzy || w.length < 4) return best;
  for (const t of e.tokens) if (fuzzyTokHit(w, t)) return 25;
  return 0;
}
// v26: kelime–token yazım hatası sonucu hatırlanır (aynı token yüzlerce besinde geçiyor)
const _fzMemo = new Map();
function fuzzyTokHit(w, t) {
  const key = w + "|" + t;
  let r = _fzMemo.get(key);
  if (r !== undefined) return r;
  r = false;
  const k = w.length >= 7 ? 2 : 1;
  for (const L of [w.length - 1, w.length, w.length + 1]) {
    if (L < 3 || L > t.length) continue;
    if (editDist(w, t.slice(0, L)) <= k) { r = true; break; }
  }
  if (_fzMemo.size > 200000) _fzMemo.clear();
  _fzMemo.set(key, r);
  return r;
}
// Sıralama: sık kullanılanlar > tam eşleşme > kelimeyle başlayan > içinde geçen (> eş anlamlı > yazım hatası)
const FUZZY_MIN = 10;   // v26: normal eşleşme bundan azsa yazım hatası taraması da yapılır
function searchFoods(ids, q) {
  const r = searchFoodsPass(ids, q, false);
  if (r.length >= FUZZY_MIN || !q.split(/\s+/).some(w => w.length >= 4)) return r;
  return searchFoodsPass(ids, q, true);
}
function searchFoodsPass(ids, q, fuzzy) {
  const idx = searchIndex();
  const words = q.split(/\s+/).filter(Boolean);
  const freq = new Set(frequentFoodsCached(40));
  const out = [];
  ids.forEach(id => {
    const e = idx[id];
    if (!e) return;
    let sc = 0, inName = true;
    for (const w of words) { const s = wordScore(w, e, fuzzy); if (!s) return; sc += s; if (s < 100) inName = false; }
    if (e.name === q) sc += 600;
    else if (e.name.startsWith(q)) sc += 300;
    if (freq.has(id) && inName) sc += 1000;   // sık kullanılan önceliği yalnızca adı eşleşince (kategori/eş anlamlıyla değil)
    if (!USDA_DB[id]) sc += 40;            // uygulamanın kendi listesi ve özel besinler önce
    sc -= e.name.length * 0.3;
    out.push([id, sc]);
  });
  return out.sort((a, b) => b[1] - a[1]).map(x => x[0]);
}
// Arama yokken "Tümü": sık kullanılanlar, sonra uygulamanın kendi listesi, sonra veritabanı
function rankBrowse(ids) {
  const freq = frequentFoods(40);
  const fs = new Set(freq);
  const custom = ids.filter(id => !fs.has(id) && state.customFoods[id]);
  const own = ids.filter(id => !fs.has(id) && !USDA_DB[id] && !state.customFoods[id]);
  const usda = ids.filter(id => !fs.has(id) && USDA_DB[id]);
  return [...freq.filter(id => ids.includes(id)), ...custom, ...own, ...usda];
}
function noResultHtml(q) {
  if (!q) return `<div class="text-[14px] n-muted text-center py-8">Bu kategoride besin yok.</div>`;
  return `<div id="noResult" class="text-center py-5 space-y-3">
      <p class="text-[14px] n-muted">"${esc(q)}" bulunamadı. Şunlardan birini dene:</p>
      <div class="grid gap-2">
        <button onclick="openBarcode()" class="n-btn-outline h-12 rounded-full text-[14px]">Barkod okut</button>
        <button onclick="newFoodFromSearch()" class="n-btn-outline h-12 rounded-full text-[14px]">Özel besin oluştur</button>
        <button onclick="newRecipeFromSearch()" class="n-btn-outline h-12 rounded-full text-[14px]">Tarif oluştur</button>
      </div>
    </div>`;
}
function newFoodFromSearch() { const q = $("foodSearch").value.trim(); openCustomFoodModal(); $("cfName").value = q.slice(0, 50); }
function newRecipeFromSearch() { const q = $("foodSearch").value.trim(); openRecipeModal(); $("rcName").value = q.slice(0, 50); }

// Bulunamayan aramalar: yazmayı bıraktıktan 1,5 sn sonra hâlâ sonuç yoksa kaydedilir (yalnızca bu telefonda)
let missTimer = null;
function noteMissSearch(raw) {
  clearTimeout(missTimer);
  const q = String(raw || "").trim();
  if (q.length < 3) return;
  missTimer = setTimeout(() => {
    if ($("foodSearch").value.trim() !== q) return;
    const k = normSearch(q);
    const ex = state.missSearches.find(x => normSearch(x.q) === k);
    if (ex) { ex.n = num(ex.n, 1) + 1; ex.ts = Date.now(); }
    else state.missSearches.unshift({ q: q.slice(0, 40), n: 1, ts: Date.now() });
    state.missSearches = state.missSearches.slice(0, 50);
    saveState();
  }, 1500);
}
function cancelMissSearch() { clearTimeout(missTimer); }
function clearMissSearches() {   // v26: Geri al
  snapshot(); state.missSearches = []; saveState(); renderMissList();
  toast("Bulunamayan aramalar temizlendi", "ok", { label: "↶ Geri al", fn: () => { doUndo(); renderMissList(); } });
}
function renderMissList() {
  const el = $("missList");
  if (!el) return;
  const l = state.missSearches || [];
  el.innerHTML = l.length
    ? l.map(x => `<span class="px-3 py-2 rounded-full bg-[#1E1E21] text-[13px]" data-miss="${esc(x.q)}">${esc(x.q)}${num(x.n, 1) > 1 ? ` <span class="text-[#8B8B93]">×${num(x.n, 1)}</span>` : ""}</span>`).join("")
    : `<span class="text-[13px] text-[#8B8B93]">Henüz yok.</span>`;
  $("missClear").classList.toggle("hidden", !l.length);
}
// Besin kartındaki kaynak satırı
function foodSourceText(f) {
  if (f.src === "tarif") return "Tarif hesaplaması (yaklaşık), USDA malzemeleriyle";
  if (typeof f.src === "number") return `USDA FoodData Central · ${f.src}`;
  return "";
}

// ---------------------------------------------------------------------------
// GENEL RENDER
// ---------------------------------------------------------------------------
// Bir kutuya yazıp başka bir kutuya dokunduğunda, sayfa yenilense bile
// dokunulan kutu odakta kalsın (klavye kapanmasın).
let pendingFocus = { key: "", at: 0 };
document.addEventListener("pointerdown", e => {
  const el = e.target && e.target.closest ? e.target.closest("[data-fk]") : null;
  pendingFocus = el ? { key: el.dataset.fk, at: Date.now() } : { key: "", at: 0 };
}, { capture: true, passive: true });

function restorePendingFocus() {
  if (!pendingFocus.key || Date.now() - pendingFocus.at > 800) return;
  const el = document.querySelector(`[data-fk="${pendingFocus.key}"]`);
  if (el && document.activeElement !== el) {
    el.focus();
    try { const v = el.value || ""; el.setSelectionRange(v.length, v.length); } catch (e) { /* yoksay */ }
  }
}

function renderAll() {
  invalidateFoodDB();
  refreshFoodSnaps();
  applyCustomIcon();
  applyTabVisibility();
  renderNutrition();
  renderGym();
  renderMobility();
  if (state.activeTab === "progress") renderProgress();
  if (profileIsOpen()) renderProfile();
  renderBanner();
  saveState();
  restorePendingFocus();
}

// ---------------------------------------------------------------------------
// BAŞLAT
// ---------------------------------------------------------------------------
(function hideSplash() {
  const sp = document.getElementById("splash");
  if (!sp) return;
  if (state.settings.splash === false) { sp.remove(); return; }
  setTimeout(() => { if (sp.parentNode) sp.remove(); }, 1300);
})();
checkNewDay();
autoSelectNextDay();
if (workoutInProgress()) { state.gymActive = true; state.gymView = "today"; }
resetTimerUI();
renderAll();
updateWakeLock();
setTimeout(checkFoodHealth, 1500);
if (loadFailed) setTimeout(() => toast("⚠️ Kayıtlı veriler okunamadı. Eski verilerin bir kopyası telefonda saklandı; yeni veri girmeden önce yedeğini geri yükle veya yardım iste.", "error"), 300);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    if (checkNewDay()) { autoSelectNextDay(); renderAll(); }
    if (timer.running) tickTimer();
    updateWakeLock();
  }
});

try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* yoksay */ }
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
