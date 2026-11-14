// ---------------------------------------------------------------------------
// BİLDİRİM (TOAST)
// ---------------------------------------------------------------------------
function toast(msg, type = "ok", action = null) {
  const wrap = $("toastWrap");
  const el = document.createElement("div");
  // v33: bildirim metinleri kaynakta emojisiz; renkler tema değişkenleriyle (Beslenme'de .n-toast)
  const nm = !trainCtx() && nutriCtx();
  const color = type === "error" ? "bg-[var(--t-danger-bg)] border-[var(--t-danger)] text-[var(--t-danger-text)]"
    : type === "pr" ? "bg-[var(--t-warn-bg)] border-[var(--t-warn-icon)] text-[var(--t-warn-hi)]"
    : nm ? "n-toast" : "bg-[var(--t-surface)] border-[var(--t-panel-line)] text-[var(--t-text)]";
  el.className = "toast max-w-sm w-full text-center text-sm font-semibold border px-4 py-2.5 shadow-2xl rounded-2xl " + color;
  el.textContent = msg;
  if (action) {
    el.textContent = "";
    el.classList.add("flex", "items-center", "justify-between", "gap-3", "text-left");
    el.style.pointerEvents = "auto";
    const sp = document.createElement("span");
    sp.textContent = msg;
    const b = document.createElement("button");
    b.textContent = action.label;
    b.className = nm ? "n-btn shrink-0 h-11 px-4 rounded-full text-[13px]" : "t-btn shrink-0 h-11 px-4 rounded-xl text-[13px]";
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

window.addEventListener("error", e => { toast("Hata: " + (e.message || "bilinmeyen"), "error"); });

// ---------------------------------------------------------------------------
// MODAL YÖNETİMİ
// ---------------------------------------------------------------------------
// Antrenman sekmesinden veya Profil ekranından açılan ortak pencereler yeni (siyah) temada görünür.
function trainCtx() { try { return state.activeTab === "gym" || state.activeTab === "mobility" || state.activeTab === "progress" || profileIsOpen(); } catch (e) { return false; } }
// Beslenme sekmesinden a\u00E7\u0131lan ortak pencereler beslenme temas\u0131nda (.nm) g\u00F6r\u00FCn\u00FCr.
function nutriCtx() { try { return !trainCtx() && state.activeTab === "nutrition"; } catch (e) { return false; } }
const EMOJI_LEAD = /^(?:[\p{Extended_Pictographic}\u2190-\u21FF\u2700-\u27BF\uFE0F\u200D]+\s*)+/u;
function openModal(id) {
  const m = $(id);
  const tm = trainCtx();
  const nm = !tm && nutriCtx();
  m.classList.toggle("tm", tm);
  m.classList.toggle("nm", nm);
  m.classList.remove("hidden"); m.classList.add("flex");
}
function closeModal(id) { const m = $(id); m.classList.add("hidden"); m.classList.remove("flex"); }
document.addEventListener("click", e => {
  const t = e.target;
  if (t && t.id && ["customFoodModal", "pickerModal", "exerciseModal", "chartModal", "exSheet", "mealModal", "shopModal"].includes(t.id)) closeModal(t.id);
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
      ? (nd ? "h-[52px] rounded-full text-[15px] font-extrabold n-danger-btn" : "h-[52px] rounded-2xl text-[15px] font-extrabold bg-[var(--t-danger)] text-white")
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

// force: Mobilite sayacı kendi ses ayarını (settings.mobSound) kullanır
function beep(force) {
  if ((!force && !state.settings.sound) || !audioCtx) return;
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
  const want = state.settings.keepAwake && (state.activeTab === "gym" || !!mobT) && document.visibilityState === "visible";
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
// v36: çalışan sayaç ayrı bir küçük kayıtta tutulur; iOS arka plandaki uygulamayı kapatırsa açılışta kaldığı yerden sürer
const TIMER_KEY = "ayk_timer";
function timerPersist() {
  try { if (timer.running) localStorage.setItem(TIMER_KEY, JSON.stringify({ endAt: timer.endAt, label: timer.label })); else localStorage.removeItem(TIMER_KEY); } catch (e) { /* yok sayılır */ }
}
function resumeTimer() {
  let t = null;
  try { t = JSON.parse(localStorage.getItem(TIMER_KEY) || "null"); } catch (e) { t = null; }
  const left = t ? num(t.endAt, 0) - Date.now() : 0;
  if (left <= 0 || left > 3600000) { timer.running = false; timerPersist(); return; }
  timer.endAt = num(t.endAt, 0); timer.label = typeof t.label === "string" ? t.label.slice(0, 40) : "Dinlenme";
  timer.running = true; timer.finishedAt = 0;
  clearInterval(timer.iv); timer.iv = setInterval(tickTimer, 250);
  tickTimer();
}

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
  timerPersist();
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
  timerPersist();
  beep();
  try { if (navigator.vibrate) navigator.vibrate([300, 150, 300]); } catch (e) { /* yoksay */ }
  $("restPillTime").textContent = "BİTTİ!";
  $("restPillTime").className = "t-display text-[30px] leading-none tabular-nums text-[var(--d-over)]";
  $("restPillInner").classList.add("timer-flash");
  toast("" + timer.label + " bitti!");
  setTimeout(() => { if (!timer.running) resetTimerUI(); }, 4500);
}

function adjustTimer(delta) {
  if (!timer.running) return;
  timer.endAt += delta * 1000;
  timerPersist();
  tickTimer();
}

function stopTimer() {
  timer.running = false;
  clearInterval(timer.iv);
  timerPersist();
  resetTimerUI();
}

function renderTimerUI(rem) {
  $("restPill").classList.remove("hidden");
  $("restPillLabel").textContent = timer.label;
  $("restPillTime").textContent = fmtClock(rem);
  $("restPillTime").className = "t-display text-[30px] leading-none tabular-nums " + (rem <= 10 ? "text-[var(--d-over)]" : "text-[var(--t-acc-text)]");
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
  const prevMob = Array.isArray(state.mobilityLog[dateKey]) ? state.mobilityLog[dateKey] : [];
  if (mobDone.length) state.mobilityLog[dateKey] = [...new Set([...prevMob, ...mobDone])];
  const t = nutritionTotals();
  const e = eatenTotals();
  const sup = state.supplements || {};
  const dm = dayMeals();
  const log = {
    kcal: Math.round(t.cal), p: Math.round(t.p), c: Math.round(t.c), f: Math.round(t.f),
    eatenKcal: Math.round(e.cal), eatenP: Math.round(e.p),
    water: state.waterLiters || 0,
    mealsDone: dm.filter(m => m.done).length, mealsTotal: dm.length,
    supps: state.supplementList.filter(x => sup[x.id]).length, dayType: state.dayType,
    calTarget: getTargets().calTarget, proTarget: getTargets().proTarget,
    // v15: "Dünkü öğünü tekrarla" için öğünlerin içeriği (yalnızca son 7 gün saklanır)
    meals: dm.map(m => ({ id: m.id, title: m.title, items: clone(m.items) }))
  };
  // v36: aynı gün "Yeni gün" düğmesiyle daha önce arşivlendiyse (manual) yeni özet eskisini EZMEZ: her sayaçta büyük olan
  // tutulur (çift sayım yok, kayıp yok). Eskiden gün içinde düğmeye basınca gece yarısı günün özeti sıfırlarla eziliyordu.
  const old = state.dailyLogs[dateKey], cur = state.dailyLogs[dateKey] = log;
  if (old && old.manual) {
    ["eatenKcal", "eatenP", "water", "mealsDone", "supps"].forEach(k => { cur[k] = Math.max(num(old[k], 0), num(cur[k], 0)); });
    if (num(old.mealsDone, 0) > dm.filter(m => m.done).length && Array.isArray(old.meals)) cur.meals = old.meals;
    cur.manual = true;
  }
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
  // v35: telefonun saati ileri alınmışken kaydedilen tarih bugünden en az 2 gün ilerideyse bugüne çekilir (tikler silinmez,
  // arşiv yazılmaz); eskiden gün geçişi o tarihe kadar hiç çalışmıyordu. 1 günlük geri gidiş meşrudur (Gün geçişi saati
  // ileri alınınca mantıksal gün bir gün geri gider) — o durumda dokunulmaz, yoksa dünün arşivi bugünün verisiyle ezilirdi.
  if (state.today > t && (Date.parse(state.today) - Date.parse(t)) / DAY_MS >= 2) {
    state.today = t;
    if (state.dailyLogs[t]) state.dailyLogs[t].manual = true;   // v36: saat ileriyken bugün zaten arşivlendiyse o özet ezilmesin
    return true;   // v36: çağıran yeniden çizip kaydetsin (eskiden düzeltme bir sonraki dokunuşa kadar kaydedilmiyordu)
  }
  if (t > state.today) {   // yalnızca ileri gidince (gün geçişi saati ileri alınınca aynı gün tekrar arşivlenmez)
    archiveDay(state.today);
    resetDaily();
    state.today = t;
    toast("Yeni gün! Su, takviye, öğün ve mobilite tikleri sıfırlandı.");
    return true;
  }
  return false;
}

async function manualNewDay() {
  if (!(await askConfirm("Yeni güne geçilsin mi?", "Su, takviye, öğün ve mobilite tikleri sıfırlanır. Bugünün özeti Beslenme → Geçmiş'e kaydedilir.", "Yeni güne geç"))) return;
  const key = state.today || logicalToday();
  archiveDay(key);
  if (state.dailyLogs[key]) state.dailyLogs[key].manual = true;   // v36: gece yarısı bu özet ezilmesin (archiveDay)
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
    gym: ["tabGym", null, "navBtnGym", "grid"],
    mobility: ["tabMobility", null, "navBtnMobility", "grid"],
    progress: ["tabProgress", "progressHeaderBar", "navBtnProgress", "block"]
  };
  const activeCls = "nav-btn flex flex-col items-center justify-center gap-1 h-14 font-bold text-[12px] " + (state.activeTab === "gym" ? "text-[var(--t-acc-text)]" : state.activeTab === "nutrition" ? "text-[#22C55E]" : state.activeTab === "mobility" ? "text-[var(--t-acc-text)]" : "text-[var(--t-text1)]");
  const idleCls = "nav-btn flex flex-col items-center justify-center gap-1 h-14 font-semibold text-[12px] text-[var(--t-dim)]";
  document.body.classList.toggle("theme-train", state.activeTab === "gym");
  document.body.classList.toggle("theme-mob", state.activeTab === "mobility");
  document.body.classList.toggle("theme-prog", state.activeTab === "progress");
  const nutri = state.activeTab === "nutrition";
  document.body.classList.toggle("theme-nutri", nutri);
  applyTheme();
  // v31: güneş/ay düğmesi her sekmede; tüm uygulamanın temasını değiştirir
  const tb = $("nutriThemeBtn");
  tb.classList.remove("hidden"); tb.classList.add("flex");
  const light = themeIsLight();
  const want = light ? "moon" : "sun";
  if (tb.dataset.icon !== want) {
    tb.dataset.icon = want;
    tb.innerHTML = light
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"></path></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path></svg>';
    tb.setAttribute("aria-label", light ? "Koyu temaya geç" : "Aydınlık temaya geç");
  }
  const tt = $("tabTitle");
  const title = TAB_TITLES[state.activeTab] || "AYK+";
  if (tt.textContent !== title) tt.textContent = title;
  Object.keys(map).forEach(k => {
    const [tabId, headId, btnId, disp] = map[k];
    const on = k === state.activeTab;
    $(tabId).classList.toggle("hidden", !on);
    if (headId) { $(headId).classList.toggle("hidden", !on); $(headId).classList.toggle(disp, on); }
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
// v37: dosya yerine kayıtlı fotoğrafın metni (data:image...) de verilebilir.
function shrinkPhoto(file) {
  return new Promise((resolve, reject) => {
    const isUrl = typeof file === "string";
    const url = isUrl ? file : URL.createObjectURL(file);
    const done = () => { if (!isUrl) URL.revokeObjectURL(url); };
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
      } catch (e) { reject(e); } finally { done(); }
    };
    img.onerror = () => { done(); reject(new Error("okunamadı")); };
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
// v37: v12'den önce (logo alanıyken) fotoğraf küçültülmeden kaydediliyordu; telefondan seçilen tek fotoğraf
// kayıt alanının neredeyse tamamını tutabiliyordu. Açılışta ve yedek geri yüklenince büyük fotoğraf sessizce
// 320×320'ye küçültülür. Açılamazsa fotoğrafa dokunulmaz (silinmez).
const PHOTO_MAX_CHARS = 150000;
async function slimOldPhoto() {
  const src = state.customIconDataUrl;
  if (typeof src !== "string" || src.length <= PHOTO_MAX_CHARS || !src.startsWith("data:image")) return false;
  try {
    const small = await shrinkPhoto(src);
    if (state.customIconDataUrl !== src || !small || small.length >= src.length) return false;
    state.customIconDataUrl = small;
    saveState();
    applyCustomIcon();
    if ($("pfStorageTxt")) renderStorageMeter();
    return true;
  } catch (e) { return false; }
}
function removeCustomIcon() {
  if (!state.customIconDataUrl) return;
  snapshot();
  state.customIconDataUrl = "";
  renderAll();
  offerUndo("Profil fotoğrafı kaldırıldı");
}

