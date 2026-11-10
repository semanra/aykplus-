// ============================================================================
// AYK+ v10 — UYGULAMA MANTIĞI
// ============================================================================

const DEFAULT_SETTINGS = {
  sex: "male", height: 180, age: 26, targetWeight: 82,
  waterTarget: 3.5, restSec: 90, sound: true, keepAwake: true,
  bodyFat: "", targetBodyFat: "",
  macroView: "plan", calAdjust: 0, coachAppliedAt: 0, barKg: 20, separatePlans: false, splash: true,
  nutriLight: false, scaleOn: false, scaleBase: 0
};
const DEFAULT_SUPPS = [
  { id: "creatine", name: "⚡ Kreatin (5g)" },
  { id: "greens", name: "🥬 Greens" },
  { id: "omega", name: "🐟 Omega/Vit" }
];
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
  ex.sets.forEach(s => { s.done = !!s.done; });
  if (ex.note == null) ex.note = "";
  return ex;
}

function normalizeState(raw) {
  const s = { ...clone(DEFAULT_STATE), ...(raw || {}) };
  s.settings = { ...DEFAULT_SETTINGS, ...((raw && raw.settings) || {}) };
  if (!Array.isArray(s.meals) || s.meals.length === 0) s.meals = clone(DEFAULT_STATE.meals);
  s.meals.forEach(m => { if (!Array.isArray(m.items)) m.items = []; });
  if (!Array.isArray(s.workoutDays) || s.workoutDays.length === 0) s.workoutDays = clone(DEFAULT_STATE.workoutDays);
  s.workoutDays.forEach(day => {
    if (!Array.isArray(day.exercises)) day.exercises = [];
    day.exercises.forEach(normalizeExercise);
  });
  if (!s.mobilityRoutine) s.mobilityRoutine = clone(DEFAULT_STATE.mobilityRoutine);
  if (!Array.isArray(s.mobilityRoutine.dynamic)) s.mobilityRoutine.dynamic = [];
  if (!Array.isArray(s.mobilityRoutine.static)) s.mobilityRoutine.static = [];
  if (!Array.isArray(s.workoutLogs)) s.workoutLogs = [];
  if (!Array.isArray(s.weightLogs)) s.weightLogs = [];
  if (!s.exerciseHistory || typeof s.exerciseHistory !== "object") s.exerciseHistory = {};
  if (!s.dailyLogs || typeof s.dailyLogs !== "object") s.dailyLogs = {};
  if (!Array.isArray(s.recentFoods)) s.recentFoods = [];
  if (!s.customFoods || typeof s.customFoods !== "object") s.customFoods = {};
  if (!s.supplements || typeof s.supplements !== "object") s.supplements = {};
  if (!Array.isArray(s.supplementList)) s.supplementList = clone(DEFAULT_SUPPS);
  if (!Array.isArray(s.restMeals)) s.restMeals = [];
  s.restMeals.forEach(m => { if (!Array.isArray(m.items)) m.items = []; });
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
  if (!["today", "program", "library", "history"].includes(s.gymView)) s.gymView = "today";
  if (!["today", "menus", "foods", "history"].includes(s.nutriView)) s.nutriView = "today";
  s.settings.nutriLight = !!s.settings.nutriLight;
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
  } catch (e) { console.error(e); }
  return normalizeState({});
}

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

function getFoodDB() { return { ...BASE_FOOD_DB, ...(state.customFoods || {}) }; }
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
    : nm ? "bg-[#0E1210] border-[#166534] text-white" : "bg-slate-900 border-emerald-600/70 text-slate-100";
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
  if (t && t.id && ["customFoodModal", "pickerModal", "exerciseModal", "chartModal", "settingsModal", "exSheet", "mealModal"].includes(t.id)) closeModal(t.id);
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
    $("uiDlgOk").className = danger ? "h-[52px] rounded-2xl text-[15px] font-extrabold bg-[#FF5A5F] text-white" : "t-btn h-[52px] rounded-2xl text-[15px]";
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
function sayAlert(title, message) { if (trainCtx()) return uiAlert(title, message); alert(message); return Promise.resolve(true); }

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
function nutritionTotals() {
  let p = 0, c = 0, f = 0, cal = 0;
  curMeals().forEach(m => m.items.forEach(i => { const x = calcItemMacros(i); p += x.p; c += x.c; f += x.f; cal += x.cal; }));
  return { p, c, f, cal };
}

function archiveDay(dateKey) {
  if (!dateKey) return;
  const t = nutritionTotals();
  const e = eatenTotals();
  const sup = state.supplements || {};
  state.dailyLogs[dateKey] = {
    kcal: Math.round(t.cal), p: Math.round(t.p), c: Math.round(t.c), f: Math.round(t.f),
    eatenKcal: Math.round(e.cal), eatenP: Math.round(e.p),
    water: state.waterLiters || 0,
    mealsDone: curMeals().filter(m => m.done).length, mealsTotal: curMeals().length,
    supps: state.supplementList.filter(x => sup[x.id]).length, dayType: state.dayType,
    calTarget: getTargets().calTarget, proTarget: getTargets().proTarget
  };
  const keys = Object.keys(state.dailyLogs).sort();
  while (keys.length > 180) delete state.dailyLogs[keys.shift()];
}

function resetDaily() {
  state.waterLiters = 0;
  state.supplements = {};
  state.meals.forEach(m => { m.done = false; });
  state.restMeals.forEach(m => { m.done = false; });
  state.mobilityRoutine.dynamic.forEach(i => { i.done = false; });
  state.mobilityRoutine.static.forEach(i => { i.done = false; });
}

function checkNewDay() {
  const t = todayStr();
  if (!state.today) { state.today = t; return false; }
  if (state.today !== t) {
    archiveDay(state.today);
    resetDaily();
    state.today = t;
    toast("🌅 Yeni gün! Su, takviye, öğün ve mobilite tikleri sıfırlandı.");
    return true;
  }
  return false;
}

function manualNewDay() {
  if (!confirm("Su, takviye, öğün ve mobilite tikleri sıfırlansın mı? (Bugünün özeti İlerleme sekmesine kaydedilir.)")) return;
  archiveDay(state.today || todayStr());
  resetDaily();
  state.today = todayStr();
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
  const f = getFoodDB()[item.foodId];
  if (!f) return { p: 0, c: 0, f: 0, cal: 0 };
  const a = effAmount(item);
  const p = f.p * a, c = f.c * a, fat = f.f * a;
  return { p, c, f: fat, cal: (p * 4) + (c * 4) + (fat * 9) };
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
function kcalPerUnit(f) { return f ? (f.p * 4) + (f.c * 4) + (f.f * 9) : 0; }
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
  toast(on ? `Gramajlar artık ${fmtNum(state.weight)} kg'a göre ayarlanacak` : "Kiloya göre gramaj kapatıldı; menü eski gramajlarına döndü");
}
function resetScaleBase() {
  const k = scaleK();
  // Şu an görünen gramajlar yeni referans olsun: saklanan miktarları sabitle
  if (k !== 1) [state.meals, state.restMeals].forEach(ms => ms.forEach(m => m.items.forEach(i => {
    const f = getFoodDB()[i.foodId];
    if (isScalable(f)) i.amount = Math.max(1, Math.round(i.amount * k));
  })));
  state.settings.scaleBase = state.weight;
  renderAll();
  toast(`Referans kilo ${fmtNum(state.weight)} kg yapıldı; gramajlar olduğu gibi kaldı`);
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
function swapGroup(foodId) { return SWAP_GROUPS.find(g => g.includes(foodId)) || null; }
function swapOptions(item) {
  const db = getFoodDB();
  const g = swapGroup(item.foodId);
  const f0 = db[item.foodId];
  if (!g || !f0) return [];
  const kcal0 = kcalPerUnit(f0) * effAmount(item);
  return g.filter(id => id !== item.foodId && db[id]).map(id => {
    const f = db[id];
    const eff = Math.max(5, Math.round(kcal0 / kcalPerUnit(f) / 5) * 5);
    return { id, f, eff, kcal: Math.round(kcalPerUnit(f) * eff), p: f.p * eff, c: f.c * eff, fat: f.f * eff };
  });
}
function openSwap(mIdx, iIdx) {
  const item = curMeals()[mIdx] && curMeals()[mIdx].items[iIdx];
  if (!item) return;
  const f0 = getFoodDB()[item.foodId];
  const opts = swapOptions(item);
  if (!opts.length) return;
  const items = opts.map(o => ({ id: o.id, eff: o.eff, label: o.f.name, sub: `${fmtNum(o.eff)} ${o.f.unit} · ${o.kcal} kcal · ${Math.round(o.p)}P ${Math.round(o.c)}K ${Math.round(o.fat)}Y` }));
  openPicker(`${f0.name} yerine`, [{ label: `Şu an: ${fmtNum(effAmount(item))} ${f0.unit} · ${Math.round(kcalPerUnit(f0) * effAmount(item))} kcal`, short: "Alternatifler", items }], it => {
    const cur = curMeals()[mIdx] && curMeals()[mIdx].items[iIdx];
    if (!cur) return;
    const nf = getFoodDB()[it.id];
    snapshot();
    cur.foodId = it.id;
    cur.amount = rawFromEff(nf, it.eff);
    renderAll();
    offerUndo(`⇄ ${f0.name} → ${nf.name} (${fmtNum(it.eff)} ${nf.unit})`);
  });
}

// ---------------------------------------------------------------------------
// GENEL BESLENME ÇİZİMİ
// ---------------------------------------------------------------------------
const openDoneMeals = new Set();   // Bugün: açılmış "yenmiş" öğünler (kaydedilmez)
const openMenuMeals = new Set();   // Menülerim: açılmış öğünler (kaydedilmez)
function toggleMealOpen(mIdx) {
  const m = curMeals()[mIdx];
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
  meal.items.forEach(i => { if (!getFoodDB()[i.foodId]) return; const x = calcItemMacros(i); p += x.p; c += x.c; f += x.f; cal += x.cal; n++; });
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
  const target = num(st.targetWeight, 82);
  const diffKg = state.weight - target;
  const weeklyLoss = (state.deficit * 7) / 7700;
  $("timelineInfo").textContent = diffKg <= 0 ? `${fmtNum(target)} kg hedefine ulaştın!`
    : weeklyLoss > 0 ? `Haftalık ~${weeklyLoss.toFixed(2).replace(".", ",")} kg kayıp → ${fmtNum(target)} kg hedefine ~${Math.ceil(diffKg / weeklyLoss)} hafta`
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
  const view = state.settings.macroView === "eaten" ? "eaten" : "plan";
  const shown = view === "eaten" ? eaten : plan;
  updateMacroCard("cal", shown.cal, targets.calTarget, "kcal");
  updateMacroCard("pro", shown.p, targets.proTarget, "g");
  updateMacroCard("carb", shown.c, targets.carbTarget, "g");
  updateMacroCard("fat", shown.f, targets.fatTarget, "g");
  const meals = curMeals();
  $("mmPlanVal").textContent = fmtInt(plan.cal);
  $("mmEatenVal").textContent = fmtInt(eaten.cal);
  $("mmEatenMeals").textContent = `${meals.filter(m => m.done).length}/${meals.length}`;
  $("mmPlan").className = view === "plan" ? "on" : "";
  $("mmEaten").className = view === "eaten" ? "on" : "";
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

// Su: her bardak 0,5 L; hedef kadar bardak çizilir, kısmen dolanlar kısmen boyanır
function renderWater() {
  const wt = num(state.settings.waterTarget, 3.5);
  const w = state.waterLiters || 0;
  $("waterVal").textContent = w.toFixed(2).replace(".", ",");
  $("waterTarget").textContent = fmtNum(wt);
  const cups = Math.max(4, Math.min(10, Math.ceil(wt / 0.5)));
  let h = "";
  for (let i = 0; i < cups; i++) {
    const fill = Math.max(0, Math.min(1, (w - i * 0.5) / 0.5));
    h += `<span class="n-cup ${fill >= 1 ? "full" : ""}"><i style="height:${Math.round(fill * 100)}%"></i></span>`;
  }
  $("waterCups").innerHTML = h;
}

// ---------------------------------------------------------------------------
// BUGÜN: zaman çizelgesi
// ---------------------------------------------------------------------------
function renderTodayMeals() {
  const db = getFoodDB();
  const meals = curMeals();
  const nextIdx = meals.findIndex(m => !m.done);
  if (!meals.length) {
    $("todayMeals").innerHTML = `<div class="n-card rounded-[22px] p-5 text-center space-y-3"><p class="text-[14px] n-muted">Bu menüde henüz öğün yok.</p>
      <button onclick="setNutriView('menus')" class="n-btn h-12 px-6 rounded-full text-[14px]">Menülerim'e git</button></div>`;
    return;
  }
  $("todayMeals").innerHTML = meals.map((meal, mIdx) => {
    const t = mealTotals(meal);
    const isNext = mIdx === nextIdx;
    const last = mIdx === meals.length - 1;
    const collapsed = meal.done && !openDoneMeals.has(meal.id);
    const rail = `<div class="flex flex-col items-center w-11 shrink-0">
        <label class="w-11 h-11 flex items-center justify-center cursor-pointer"><input type="checkbox" ${meal.done ? "checked" : ""} onchange="toggleMealDone(${mIdx})" class="n-check" aria-label="${esc(meal.title)}: yedim" /></label>
        ${last ? "" : '<div class="w-[1.5px] flex-1 n-rail my-1 rounded-full"></div>'}
      </div>`;
    const time = meal.time ? esc(meal.time) : "";
    if (collapsed) {
      return `<div class="flex gap-2" data-today-meal="${mIdx}">${rail}
        <button onclick="toggleMealOpen(${mIdx})" class="flex-1 min-w-0 min-h-[52px] mb-3 flex items-center justify-between gap-3 text-left" aria-expanded="false" aria-label="${esc(meal.title)} öğününü aç">
          <div class="min-w-0"><div class="text-[12px] font-semibold n-muted">${time ? time + " · " : ""}yendi</div><div class="text-[16px] font-bold n-muted truncate">${esc(meal.title)}</div></div>
          <div class="text-[14px] font-semibold n-muted whitespace-nowrap shrink-0">${fmtInt(t.cal)} kcal</div>
        </button></div>`;
    }
    const status = meal.done ? "TAMAMLANDI" : isNext ? "SIRADAKİ" : "";
    const label = [time, status].filter(Boolean).join(" · ");
    const items = meal.items.map((item, iIdx) => {
      const f = db[item.foodId];
      if (!f) return "";
      const mac = calcItemMacros(item);
      const canSwap = !!swapGroup(item.foodId);
      return `<div class="flex items-center justify-between gap-2 min-h-[44px] py-1">
          <div class="min-w-0 flex-1 text-[14px] leading-snug"><span class="font-semibold">${esc(f.name)}</span> <span class="n-muted whitespace-nowrap">· ${fmtNum(effAmount(item))} ${esc(f.unit)}</span></div>
          ${canSwap ? `<button onclick="openSwap(${mIdx}, ${iIdx})" class="n-chip swap text-[12px]" aria-label="${esc(f.name)} için ikame seç">⇄ İkame</button>` : ""}
          <span class="text-[13px] font-semibold n-muted tabular-nums w-10 text-right shrink-0">${Math.round(mac.cal)}</span>
        </div>`;
    }).join("");
    return `<div class="flex gap-2" data-today-meal="${mIdx}">${rail}
      <div class="flex-1 min-w-0 pb-3">
        <div class="n-card ${isNext ? "n-next" : ""} rounded-[22px] p-4 space-y-2">
          ${meal.done
            ? `<button onclick="toggleMealOpen(${mIdx})" class="w-full flex items-start justify-between gap-3 text-left min-h-[44px]" aria-expanded="true" aria-label="${esc(meal.title)} öğününü kapat">`
            : `<div class="flex items-start justify-between gap-3">`}
            <div class="min-w-0">
              ${label ? `<div class="text-[11px] font-bold tracking-wide n-accent">${label}</div>` : ""}
              <h3 class="text-[18px] font-extrabold leading-tight mt-0.5 break-words">${esc(meal.title)}</h3>
              ${meal.targetNote ? `<div class="text-[12px] n-muted mt-0.5">${esc(meal.targetNote)}</div>` : ""}
            </div>
            <div class="text-right shrink-0 whitespace-nowrap"><span class="t-display text-[24px] leading-none tabular-nums">${fmtInt(t.cal)}</span><span class="text-[12px] n-muted ml-0.5">kcal</span>
              <div class="text-[11px] font-semibold tabular-nums mt-0.5">${macroLine(t.p, t.c, t.f)}</div></div>
          ${meal.done ? "</button>" : "</div>"}
          <div class="n-div">${items || '<div class="text-[13px] n-dim py-2">Bu öğünde henüz besin yok.</div>'}</div>
          <div class="grid grid-cols-2 gap-2 pt-1">
            <button onclick="toggleMealDone(${mIdx})" class="${meal.done ? "n-btn-ghost" : "n-btn"} h-12 rounded-full text-[14px] flex items-center justify-center gap-1.5">${meal.done ? svgI("check", 18, 2.6) + "Yendi" : "Yedim"}</button>
            <button onclick="goAddFood(${mIdx})" class="n-btn-outline h-12 rounded-full text-[14px] flex items-center justify-center gap-1.5">${svgI("plus", 18, 2.4)}Besin</button>
          </div>
        </div>
      </div></div>`;
  }).join("");
}

// ---------------------------------------------------------------------------
// MENÜLERİM
// ---------------------------------------------------------------------------
function renderMenus() {
  const db = getFoodDB();
  const targets = getTargets();
  const plan = nutritionTotals();
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
    </div>`;

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
        <div class="flex items-center justify-between gap-2 text-[14px]"><span class="n-muted">Referans kilo</span><strong>${fmtNum(num(st.scaleBase, state.weight))} kg</strong></div>
        <div class="flex items-center justify-between gap-2 text-[14px]"><span class="n-muted">Şimdiki kilo</span><strong>${fmtNum(state.weight)} kg</strong></div>
        <div class="flex items-center justify-between gap-2 text-[14px]"><span class="n-muted">Gramaj oranı</span><strong class="n-accent">%${Math.round(k * 100)}</strong></div>
      </div>
      <button onclick="resetScaleBase()" class="n-btn-outline w-full h-11 rounded-full text-[13px]">Şimdiki gramajları sabitle (referansı ${fmtNum(state.weight)} kg yap)</button>
      <p class="text-[12px] n-dim">Yalnızca gram ve ml ile ölçülen besinler değişir (tavuk, pirinç, yulaf...). Adet, kase, ölçek gibi besinler aynı kalır. Oran en fazla %70–%130 arasında uygulanır. Ayarı kapatırsan menü ilk gramajlarına döner.</p>` : ""}`;

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
        <button onclick="goAddFood(${mIdx})" class="n-btn w-full h-12 rounded-full text-[14px] flex items-center justify-center gap-1.5">${svgI("plus", 18, 2.4)}Besin ekle</button>
        <div class="flex gap-2 overflow-x-auto no-scrollbar -mx-0.5 px-0.5">
          <button onclick="quickAdd(${mIdx}, 'whey_shake', 1)" class="n-chip">+1 Shake</button>
          <button onclick="quickAdd(${mIdx}, 'yesil_salata', 1)" class="n-chip">+ Salata</button>
          <button onclick="quickAdd(${mIdx}, 'ceviz', 20)" class="n-chip">+20 g Ceviz</button>
        </div>
        <div class="flex items-center justify-end gap-1.5 pt-2 n-bt">
          <button onclick="openMealModal(${mIdx})" class="n-btn-ghost w-11 h-11 shrink-0 rounded-full flex items-center justify-center" aria-label="${esc(meal.title)} öğününü düzenle">${svgI("edit", 18)}</button>
          <button onclick="copyMeal(${mIdx})" class="n-btn-ghost h-11 px-4 shrink-0 whitespace-nowrap rounded-full text-[13px] flex items-center gap-1.5">${svgI("copy", 16)}${copyLabel}</button>
          <button onclick="deleteMeal(${mIdx})" class="n-btn-ghost w-11 h-11 shrink-0 rounded-full flex items-center justify-center n-over" aria-label="${esc(meal.title)} öğününü sil">${svgI("trash", 18)}</button>
        </div>
      </div>`;
  }).join("");
  html += `<button onclick="openMealModal()" class="w-full min-h-[60px] rounded-[20px] border-[1.5px] border-dashed n-accent flex items-center justify-center gap-2 font-bold text-[14px]" style="border-color: var(--n-accent)">
    ${svgI("plus", 20, 2.4)}Yeni öğün ekle</button>`;
  $("mealsContainer").innerHTML = html;
}

// ---------------------------------------------------------------------------
// BESİNLER (arama, kategori, gramaj, hazır porsiyon, canlı kalan)
// ---------------------------------------------------------------------------
const foodUI = { meal: null, cat: "all", sel: null, amt: 0 };
function foodTargetIdx() {
  const meals = curMeals();
  if (!meals.length) return -1;
  if (foodUI.meal != null && foodUI.meal >= 0 && foodUI.meal < meals.length) return foodUI.meal;
  const nx = meals.findIndex(m => !m.done);
  return nx >= 0 ? nx : 0;
}
function goAddFood(mIdx) {
  foodUI.meal = mIdx;
  foodUI.sel = null;
  state.nutriView = "foods";
  window.scrollTo(0, 0);
  renderAll();
}
function setFoodMeal(i) { foodUI.meal = i; renderAll(); }
function setFoodCat(c) { foodUI.cat = c; foodUI.sel = null; renderFoods(); }
function foodCatKey(cat) { return "c:" + String(cat || "Diğer"); }

function renderFoods() {
  const meals = curMeals();
  const tIdx = foodTargetIdx();
  $("foodMealChips").innerHTML = meals.map((m, i) => `<button onclick="setFoodMeal(${i})" class="n-chip ${i === tIdx ? "solid" : ""} max-w-[220px]" aria-pressed="${i === tIdx}"><span class="truncate">${esc(m.time ? m.time + " · " + m.title : m.title)}</span></button>`).join("");
  const db = getFoodDB();
  const cats = [];
  if (state.recentFoods.some(id => db[id])) cats.push(["recent", "Son kullanılanlar"]);
  if (Object.keys(state.customFoods).length) cats.push(["custom", "Özel eklediklerim"]);
  [...new Set(Object.values(BASE_FOOD_DB).map(f => f.cat || "Diğer"))].forEach(c => cats.push([foodCatKey(c), stripEmoji(c)]));
  if (!cats.some(c => c[0] === foodUI.cat)) foodUI.cat = "all";
  $("foodCats").innerHTML = [["all", "Tümü"], ...cats].map(([k, l]) => `<button onclick='setFoodCat(${esc(JSON.stringify(k))})' class="n-chip ${foodUI.cat === k ? "solid" : ""}">${esc(l)}</button>`).join("");
  renderFoodHead();
  renderFoodList();
}

function foodRemainingText(extraCal, extraP) {
  const targets = getTargets();
  const plan = nutritionTotals();
  const rc = targets.calTarget - Math.round(plan.cal + extraCal);
  const rp = targets.proTarget - Math.round(plan.p + extraP);
  const c = rc >= 0 ? `<strong class="tabular-nums">${fmtInt(rc)} kcal</strong> kalır` : `<strong class="tabular-nums n-over">${fmtInt(-rc)} kcal</strong> aşar`;
  const p = rp >= 0 ? `<strong class="n-p tabular-nums">${fmtInt(rp)} g</strong> protein kalır` : `protein hedefi <strong class="n-p">${fmtInt(-rp)} g</strong> aşılır`;
  return `${c} · ${p}`;
}
function renderFoodHead() {
  const meals = curMeals();
  const tIdx = foodTargetIdx();
  if (tIdx < 0) {
    $("foodHead").innerHTML = `<div class="n-card rounded-[20px] p-4 text-[14px] n-muted">Besin eklemek için önce Menülerim'den bir öğün oluştur.</div>`;
    return;
  }
  const sel = foodSelMacros();
  $("foodHead").innerHTML = `<div class="flex items-start justify-between gap-2">
      <div class="min-w-0"><div class="n-label">HANGİ ÖĞÜNE?</div>
        <h2 class="text-[20px] font-extrabold leading-tight mt-0.5 break-words">${esc(meals[tIdx].title)}</h2></div>
    </div>
    <p id="foodRemain" class="text-[13px] n-muted mt-1">${sel ? "Ekledikten sonra menüde " : "Menüde "}${foodRemainingText(sel ? sel.cal : 0, sel ? sel.p : 0)}</p>`;
}

function foodSelMacros() {
  const f = foodUI.sel && getFoodDB()[foodUI.sel];
  if (!f) return null;
  const a = num(foodUI.amt, 0);
  return { f, a, p: f.p * a, c: f.c * a, fat: f.f * a, cal: kcalPerUnit(f) * a };
}

function foodPresets(f) {
  const def = num(f.def, 1);
  let vals;
  if (f.unit === "g") vals = [def, 50, 100, 150, 200];
  else if (f.unit === "ml") vals = [def, 100, 200, 250, 330];
  else vals = [def, 0.5, 1, 2, 3].filter(v => v >= num(f.step, 1) || v === def);
  vals = [...new Set(vals.map(v => round1(v)))].filter(v => v > 0).sort((a, b) => a - b);
  const plus = f.unit === "g" || f.unit === "ml" ? 50 : num(f.step, 1);
  return { vals, plus };
}

function renderFoodList() {
  const db = getFoodDB();
  const q = normSearch($("foodSearch").value).trim();
  const words = q.split(/\s+/).filter(Boolean);
  let ids;
  if (foodUI.cat === "recent") ids = state.recentFoods.filter(id => db[id]);
  else if (foodUI.cat === "custom") ids = Object.keys(state.customFoods).filter(id => db[id]);
  else if (foodUI.cat.startsWith("c:")) ids = Object.keys(db).filter(id => foodCatKey(db[id].cat) === foodUI.cat);
  else ids = Object.keys(db);
  if (words.length) ids = ids.filter(id => { const hay = normSearch(db[id].name + " " + (db[id].cat || "")); return words.every(w => hay.includes(w)); });
  const tIdx = foodTargetIdx();
  const html = ids.map(id => {
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
            <div class="text-[12px] n-muted mt-0.5">${esc(stripEmoji(f.cat || ""))}${f.barcode ? " · barkod " + esc(f.barcode) : ""}</div></div>
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
        <div class="flex items-center justify-center gap-2 flex-wrap" aria-label="Hazır porsiyonlar">
          ${pr.vals.map(v => `<button onclick="foodPreset(${v})" class="n-chip ${round1(num(foodUI.amt)) === v ? "on" : ""}" data-preset="${v}">${fmtNum(v)} ${esc(f.unit)}${v === round1(num(f.def, 1)) ? " · porsiyon" : ""}</button>`).join("")}
          <button onclick="foodPreset(null, ${pr.plus})" class="n-chip">+${fmtNum(pr.plus)} ${esc(f.unit)}</button>
        </div>
        <div class="grid grid-cols-3 gap-2 text-center text-[13px] font-extrabold">
          <div id="foodSelP" class="py-2 rounded-full n-p" style="background: color-mix(in srgb, var(--n-p) 14%, transparent)"></div>
          <div id="foodSelC" class="py-2 rounded-full n-k" style="background: color-mix(in srgb, var(--n-k) 14%, transparent)"></div>
          <div id="foodSelF" class="py-2 rounded-full n-y" style="background: color-mix(in srgb, var(--n-y) 14%, transparent)"></div>
        </div>
        <button id="foodAddBtn" onclick="addSelectedFood()" class="n-btn w-full h-[52px] rounded-full text-[15px]" ${tIdx < 0 ? "disabled" : ""}></button>
        ${custom ? `<div class="flex justify-end gap-2 pt-1 n-bt">
            <button onclick='editCustomFood(${esc(JSON.stringify(id))})' class="n-btn-ghost h-11 px-4 rounded-full text-[13px] flex items-center gap-1.5">${svgI("edit", 16)}Düzenle</button>
            <button onclick='deleteCustomFood(${esc(JSON.stringify(id))})' class="n-btn-ghost h-11 px-4 rounded-full text-[13px] flex items-center gap-1.5 n-over">${svgI("trash", 16)}Sil</button>
          </div>` : ""}
      </div>`;
  }).join("");
  $("foodList").innerHTML = html || `<div class="text-[14px] n-muted text-center py-8">Sonuç bulunamadı. Barkod okutabilir ya da özel besin tanımlayabilirsin.</div>`;
  updateFoodSelUI();
}

// Seçili besinin canlı değerleri (tam yeniden çizim yapmadan; iPhone'da klavye kapanmasın)
function updateFoodSelUI() {
  const s = foodSelMacros();
  if (s && $("foodSelKcal")) {
    const tIdx = foodTargetIdx();
    $("foodSelKcal").textContent = fmtInt(s.cal);
    $("foodSelP").textContent = `${fmtNum(s.p)} g P`;
    $("foodSelC").textContent = `${fmtNum(s.c)} g K`;
    $("foodSelF").textContent = `${fmtNum(s.fat)} g Y`;
    $("foodAddBtn").textContent = tIdx >= 0 ? `Öğüne ekle · ${fmtInt(s.cal)} kcal` : "Önce bir öğün oluştur";
    $("foodAddBtn").disabled = tIdx < 0 || !(s.a > 0);
    document.querySelectorAll("#foodSelCard [data-preset]").forEach(b => b.classList.toggle("on", num(b.dataset.preset) === round1(s.a)));
  }
  const r = $("foodRemain");
  if (r) r.innerHTML = (s ? "Ekledikten sonra menüde " : "Menüde ") + foodRemainingText(s ? s.cal : 0, s ? s.p : 0);
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
  const mealTitle = curMeals()[tIdx].title;
  quickAdd(tIdx, foodUI.sel, s.a);
  toast(`✓ ${fmtNum(s.a)} ${s.f.unit} ${s.f.name} → ${mealTitle}`);
  foodUI.sel = null;
  renderFoods();
}

// ---------------------------------------------------------------------------
// GEÇMİŞ
// ---------------------------------------------------------------------------
function renderNutriHistory() {
  const t = getTargets();
  const plan = nutritionTotals();
  const eaten = eatenTotals();
  const meals = curMeals();
  const sup = state.supplements || {};
  const rows = [{
    key: state.today || todayStr(), live: true, dayType: state.dayType,
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
  $("nutriHistory").innerHTML = rows.map(card).join("")
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
    bcStatus(`${code} veritabanında bulunamadı.`);
    bcManualButton(code, "");
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
  bc.found = { code, name, brand, unit, p: pr, c: cb, f: ft, def: serving > 0 && serving <= 1000 ? Math.round(serving) : 100 };
  bcStatus(complete ? "Ürün bulundu." : "Ürün bulundu ama besin değerleri eksik.");
  $("bcResult").innerHTML = `<div class="n-elev rounded-[20px] p-4 space-y-2.5">
      <div><div class="text-[16px] font-bold leading-snug break-words">${esc(name)}</div><div class="text-[12px] n-muted">${brand ? esc(brand) + " · " : ""}${code}</div></div>
      ${complete
        ? `<div class="text-[13px]"><span class="n-muted">100 ${unit}:</span> <strong>${Math.round(isFinite(kcal) ? kcal : pr * 4 + cb * 4 + ft * 9)} kcal</strong> · <span class="n-p">${fmtNum(pr)} g P</span> · <span class="n-k">${fmtNum(cb)} g K</span> · <span class="n-y">${fmtNum(ft)} g Y</span></div>
           <button onclick="addBarcodeFood()" class="n-btn w-full h-12 rounded-full text-[15px]">Listeme ekle ve seç</button>`
        : `<p class="text-[13px] n-muted">Paketin üzerindeki 100 ${unit} değerleriyle elle ekleyebilirsin.</p>
           <button onclick="barcodeManualFood()" class="n-btn w-full h-12 rounded-full text-[15px]">Elle ekle</button>`}
    </div>`;
}
function bcManualButton(code, name) {
  bc.found = { code, name };
  $("bcResult").innerHTML = `<button onclick="barcodeManualFood()" class="n-btn-outline w-full h-12 rounded-full text-[15px]">Besini elle ekle</button>`;
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
  closeBarcode();
  pickFoodInFoods(id);
  toast(`✓ ${nm} listene eklendi; miktarı seçip öğüne ekle`);
}
function barcodeManualFood() {
  const b = bc.found || {};
  closeBarcode();
  openCustomFoodModal();
  if (b.name) $("cfName").value = b.name;
  cfPendingBarcode = b.code || null;
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
  const m = curMeals()[mIdx];
  if (!m) return;
  m.done = !m.done;
  openDoneMeals.delete(m.id);
  renderAll();
}
function setDayType(type) { state.dayType = type; renderAll(); }
function renameMeal(mIdx) {
  const m = curMeals()[mIdx];
  const t = prompt("Öğün adı:", m.title);
  if (t && t.trim()) { m.title = t.trim(); renderAll(); }
}

// Ekranda görünen miktar (kiloya göre gramaj açıksa ölçeklenmiş hâli) üzerinden çalışır
function changeAmount(mIdx, iIdx, dir) {
  const item = curMeals()[mIdx].items[iIdx];
  const f = getFoodDB()[item.foodId];
  const step = f ? num(f.step, 1) : 1;
  const next = Math.max(0, round1(effAmount(item) + dir * step));
  if (next === 0) curMeals()[mIdx].items.splice(iIdx, 1);
  else item.amount = rawFromEff(f, next);
  renderAll();
}
function setAmount(mIdx, iIdx, val) {
  const n = num(val, NaN);
  const item = curMeals()[mIdx].items[iIdx];
  if (!isFinite(n) || n <= 0) curMeals()[mIdx].items.splice(iIdx, 1);
  else item.amount = rawFromEff(getFoodDB()[item.foodId], round1(n));
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
function quickAdd(mIdx, foodId, amount) {
  const f = getFoodDB()[foodId];
  if (!f || !curMeals()[mIdx]) return;
  const raw = rawFromEff(f, amount);
  const existing = curMeals()[mIdx].items.find(i => i.foodId === foodId);
  if (existing) existing.amount = isScalable(f) && scaleK() !== 1 ? existing.amount + raw : round1(existing.amount + raw);
  else curMeals()[mIdx].items.push({ foodId, amount: raw });
  state.recentFoods = [foodId, ...state.recentFoods.filter(id => id !== foodId)].slice(0, 8);
  renderAll();
}

function autoBalanceCarbs() {
  const targets = getTargets();
  const calDiff = targets.calTarget - nutritionTotals().cal;
  const carbIds = ["pirinc", "basmati", "makarna_tam", "bulgur", "yulaf", "patates", "tatli_patates"];
  const carbItems = [];
  curMeals().forEach(m => m.items.forEach(i => { if (carbIds.includes(i.foodId)) carbItems.push(i); }));
  if (carbItems.length === 0) { toast("Dengelemek için öğünlerinde pirinç, makarna, bulgur, yulaf veya patates olmalı.", "error"); return; }
  const db = getFoodDB();
  const per = calDiff / carbItems.length;
  carbItems.forEach(item => {
    const f = db[item.foodId];
    const calPerUnit = (f.p * 4) + (f.c * 4) + (f.f * 9);
    const eff = Math.max(20, Math.round((effAmount(item) + per / calPerUnit) / 5) * 5);
    item.amount = rawFromEff(f, eff);
  });
  toast("⚖️ Karbonhidratlar kalan kaloriye göre dengelendi");
  renderAll();
}

function openCustomFoodModal() {
  cfEditId = null;
  cfPendingBarcode = null;
  $("cfTitle").textContent = "➕ Kendi Özel Besinini Tanımla";
  $("cfName").value = ""; $("cfUnit").value = "100g"; $("cfDef").value = "100";
  $("cfP").value = "20"; $("cfC").value = "10"; $("cfF").value = "5";
  openModal("customFoodModal");
}
function openFoodModalFromPicker() { closeModal("pickerModal"); openCustomFoodModal(); }
function saveCustomFood() {
  const name = $("cfName").value.trim();
  if (!name) { alert("Lütfen besin adını gir."); return; }
  const unitMode = $("cfUnit").value;
  const def = num($("cfDef").value, 100) || 100;
  const p = num($("cfP").value), c = num($("cfC").value), f = num($("cfF").value);
  const editing = cfEditId && state.customFoods[cfEditId];
  const prev = editing ? state.customFoods[cfEditId] : null;
  const barcode = prev && prev.barcode ? prev.barcode : cfPendingBarcode;
  const id = editing ? cfEditId : barcode ? "custom_bc_" + barcode : "custom_" + Date.now();
  cfEditId = null;
  cfPendingBarcode = null;
  const food = unitMode === "100g"
    ? { name: "⭐ " + name, cat: "⭐ Özel Eklediklerim", unit: prev && prev.unit === "ml" ? "ml" : "g", step: 10, def, p: p / 100, c: c / 100, f: f / 100 }
    : { name: "⭐ " + name, cat: "⭐ Özel Eklediklerim", unit: "adet", step: 1, def, p, c, f };
  if (barcode) food.barcode = barcode;
  state.customFoods[id] = food;
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
  picker.groups.forEach((g, gi) => {
    if (picker.cat !== "all" && picker.cat !== String(gi)) return;
    const items = g.items.filter(it => {
      if (!words.length) return true;
      const hay = normSearch(it.label + " " + (it.sub || "") + " " + g.label);
      return words.every(w => hay.includes(w));
    });
    if (!items.length) return;
    html += `<div class="text-[11px] font-bold text-slate-500 tracking-wide pt-2">${esc(g.label)}</div>`;
    items.forEach(it => {
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
    return `${fmtNum(f.def)} ${f.unit} • ${Math.round(p * 4 + c * 4 + fat * 9)} kcal • ${Math.round(p)}P ${Math.round(c)}K ${Math.round(fat)}Y`;
  };
  const cats = {};
  Object.keys(db).forEach(id => {
    const f = db[id];
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
      : ex.kind === "time" ? { sec: num(s.sec) } : { kg: num(s.kg), reps: num(s.reps) });
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

  day.exercises.forEach(ex => ex.sets.forEach(s => { s.done = false; s.pr = false; }));
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
        ${stat("💧 Ort. Su", fmtNum(avgWater) + " L", "text-sky-300", "Hedef " + fmtNum(num(state.settings.waterTarget, 3.5)) + " L")}
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
const PF_FIELDS = ["setSex", "setAge", "setHeight", "pfWeight", "setTarget", "setWater", "setBf", "setTargetBf", "setRest", "setSound", "setAwake", "setSplash"];
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
  $("setBf").value = validBf(st.bodyFat) ? fmtNum(validBf(st.bodyFat)) : "";
  $("setTargetBf").value = validBf(st.targetBodyFat) ? fmtNum(validBf(st.targetBodyFat)) : "";
  $("setRest").value = st.restSec;
  $("setSound").checked = !!st.sound;
  $("setAwake").checked = !!st.keepAwake;
  $("setSplash").checked = st.splash !== false;
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
  st.restSec = Math.max(10, Math.min(900, Math.round(num($("setRest").value, st.restSec))));
  st.bodyFat = bfRaw ? round1(validBf(bfRaw)) : "";
  st.targetBodyFat = tbfRaw ? round1(validBf(tbfRaw)) : "";
  st.sound = $("setSound").checked;
  st.keepAwake = $("setAwake").checked;
  st.splash = $("setSplash").checked;
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
  if (trainCtx()) return !!(await uiAsk({ title, message, ok, danger }));
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
  state = normalizeState(parsed);
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
  state.today = todayStr();
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

function suggestionHtml(ex, exIdx) {
  const sg = overloadSuggestion(ex);
  if (!sg) return "";
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
  curMeals().forEach(m => { if (!m.done) return; m.items.forEach(i => { const x = calcItemMacros(i); p += x.p; c += x.c; f += x.f; cal += x.cal; }); });
  return { p, c, f, cal };
}
function setMacroView(v) { state.settings.macroView = v === "eaten" ? "eaten" : "plan"; renderAll(); }

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
function resetCoachAdjust() {
  if (!confirm("Koç düzeltmesi sıfırlansın mı? Hedef kalorin formülün hesapladığı değere döner.")) return;
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
function addMeal() {
  const meals = curMeals();
  const t = prompt("Yeni öğünün adı:", `${meals.length + 1}. Öğün: `);
  if (!t || !t.trim()) return;
  meals.push({ id: "meal_" + Date.now(), title: t.trim(), targetNote: "", done: false, items: [] });
  renderAll();
  setTimeout(() => { const c = $("mealsContainer"); if (c.lastElementChild) c.lastElementChild.scrollIntoView({ behavior: "smooth", block: "center" }); }, 60);
}
function editMeal(mIdx) {
  const m = curMeals()[mIdx];
  const t = prompt("Öğün adı:", m.title);
  if (t === null) return;
  if (t.trim()) m.title = t.trim();
  const n = prompt("Kısa not (örn: Hedef 50g protein) — boş bırakabilirsin:", m.targetNote || "");
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
function renderSupps() {
  let html = state.supplementList.map((s, i) => suppEdit
    ? `<button onclick="removeSupp(${i})" class="n-chip del" aria-label="${esc(s.name)} sil">${esc(s.name)} ${svgI("x", 14, 2.4)}</button>`
    : `<button onclick="toggleSupp(${esc(JSON.stringify(s.id))})" class="n-chip ${state.supplements[s.id] ? "on" : ""}" aria-pressed="${state.supplements[s.id] ? "true" : "false"}">${state.supplements[s.id] ? svgI("check", 14, 3) : ""}${esc(s.name)}</button>`).join("");
  if (suppEdit) html += `<button onclick="addSupp()" class="n-chip add">+ Ekle</button>`;
  html += suppEdit
    ? `<button onclick="suppEdit = false; renderAll();" class="n-chip on">${svgI("check", 14, 3)}Bitti</button>`
    : `<button onclick="suppEdit = true; renderAll();" class="n-chip" aria-label="Takviyeleri düzenle">${svgI("edit", 14)}Düzenle</button>`;
  if (!state.supplementList.length && !suppEdit) html = `<span class="text-[13px] n-dim self-center">Takviye listen boş.</span>` + html;
  $("suppList").innerHTML = html;
}
function addSupp() {
  const n = prompt("Takviye adı (başına emoji ekleyebilirsin, örn: 💊 D3 Vitamini):");
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
  const today = new Date();
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
  const waterT = num(state.settings.waterTarget, 3.5);
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
  x: "M6 6l12 12M18 6L6 18", copy: "M9 9h11v11H9zM15 9V4H4v11h5", chevD: "M6 9l6 6 6-6"
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
  return `<div class="grid items-center gap-2 h-14 px-1 rounded-2xl ${rowCls}" style="grid-template-columns: 36px minmax(0,1fr) 78px 60px 44px">
    <span class="t-display text-[22px] text-center ${s.done || isNext ? "text-white" : "t-dim"}">${i + 1}${s.pr ? '<span class="text-amber-400 text-sm">★</span>' : ""}</span>
    <span class="text-[13px] t-dim truncate">${prev}</span>
    <input type="text" inputmode="decimal" aria-label="${i + 1}. set kilo" data-fk="w-${exIdx}-${i}-kg" value="${esc(fmtKg(num(s.kg)))}" onchange="updateSetData(${exIdx}, ${i}, 'kg', this.value)" class="t-input w-full" />
    <input type="text" inputmode="numeric" aria-label="${i + 1}. set tekrar" data-fk="w-${exIdx}-${i}-reps" value="${num(s.reps)}" onchange="updateSetData(${exIdx}, ${i}, 'reps', this.value)" class="t-input w-full" />
    ${check}
  </div>`;
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
      ? `<div class="grid gap-2 px-1 text-[11px] font-bold tracking-wider t-dim" style="grid-template-columns: 36px minmax(0,1fr) 78px 60px 44px"><span class="text-center">SET</span><span>ÖNCEKİ</span><span class="text-center">KG</span><span class="text-center">TEKRAR</span><span></span></div>`
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
  const pTotal = range === "program" ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;
  const pRows = range === "program" ? MUSCLES.map(m => {
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
  if (!title) { alert("Öğün adını yaz."); return; }
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
  closeModal("pickerModal");
  cfEditId = id;
  $("cfTitle").textContent = "✎ Özel Besini Düzenle";
  $("cfName").value = String(f.name || "").replace(/^⭐\s*/, "");
  const per100 = f.unit === "g";
  $("cfUnit").value = per100 ? "100g" : "1adet";
  $("cfDef").value = fmtNum(num(f.def, per100 ? 100 : 1));
  $("cfP").value = fmtNum(per100 ? f.p * 100 : f.p);
  $("cfC").value = fmtNum(per100 ? f.c * 100 : f.c);
  $("cfF").value = fmtNum(per100 ? f.f * 100 : f.f);
  openModal("customFoodModal");
}
function customFoodUses(id) {
  let n = 0;
  [state.meals, state.restMeals].forEach(ms => ms.forEach(m => m.items.forEach(i => { if (i.foodId === id) n++; })));
  return n;
}
function deleteCustomFood(id) {
  const f = state.customFoods[id];
  if (!f) return;
  const uses = customFoodUses(id);
  if (uses > 0 && !confirm(`"${f.name}" ${uses} öğünde kullanılıyor. Silersen o öğünlerden de çıkarılacak. Devam edilsin mi?`)) return;
  snapshot();
  delete state.customFoods[id];
  [state.meals, state.restMeals].forEach(ms => ms.forEach(m => { m.items = m.items.filter(i => i.foodId !== id); }));
  state.recentFoods = state.recentFoods.filter(x => x !== id);
  closeModal("pickerModal");
  renderAll();
  offerUndo(`🗑️ ${f.name} silindi`);
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
