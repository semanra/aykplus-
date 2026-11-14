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
      <div class="text-[var(--t-text2)]">Bu ${equipOf(ex) === "dumbbell" ? "dambılların" : "makinenin"} kademeleri <b class="text-[var(--t-text)]">${fmtKg(inf.step)} kg</b> arayla mı gidiyor? <span class="t-dim">(${around} …)</span></div>
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
  toast(`Kademeler kaydedildi: ${fmtKg(inf.step)} kg arayla`);
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

// ---------------------------------------------------------------------------
// YENİ ANTRENMAN ARAYÜZÜ
// ---------------------------------------------------------------------------
const GYM_VIEWS = [["today", "Bugün"], ["program", "Programım"], ["library", "Hareketler"], ["history", "Geçmiş"]];
const ICON = {
  undo: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5", vol: "M11 5L6 9H3v6h3l5 4V5zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13",
  volOff: "M11 5L6 9H3v6h3l5 4V5zM16 9.5l5 5M21 9.5l-5 5",
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
  return `<nav class="gym-subnav flex gap-5 border-b border-[var(--t-line)] -mx-0.5 px-0.5 overflow-x-auto no-scrollbar" aria-label="Antrenman bölümleri">
    ${GYM_VIEWS.map(([k, l]) => `<button onclick="setGymView('${k}')" class="shrink-0 h-11 text-[15px] ${state.gymView === k ? "font-bold text-[var(--t-text)] border-b-2 border-[var(--t-acc-text)] -mb-px" : "font-medium t-muted"}">${l}</button>`).join("")}
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
    return `<div class="h-16 rounded-2xl flex flex-col items-center justify-center gap-0.5 ${today ? "bg-[var(--t-acc)] text-[var(--t-on-acc)]" : "bg-[var(--t-surface)] " + (done ? "text-[var(--t-text)]" : "t-muted")}">
      <span class="text-[12px] font-semibold tracking-wide">${n}</span>
      <span class="t-display text-xl leading-none">${d.getDate()}</span>
      <span class="w-1.5 h-1.5 rounded-full ${today ? (done ? "bg-[var(--t-on-acc)]" : "") : (done ? "bg-[var(--t-acc)]" : "")}"></span>
    </div>`;
  }).join("");

  const sets = day.exercises.reduce((a, e) => a + e.sets.length, 0);
  const muscles = [...new Set(day.exercises.map(muscleOf).filter(Boolean))].slice(0, 4);
  const inProg = workoutInProgress();
  const weekLogs = state.workoutLogs.filter(l => l.ts && l.ts >= ws);
  const wVol = weekLogs.reduce((a, l) => a + num(l.volume), 0);
  const wMin = weekLogs.reduce((a, l) => a + num(l.durationMin), 0);
  const last = state.workoutLogs[state.workoutLogs.length - 1];
  const dayChips = state.workoutDays.map((d, i) => `<button onclick="selectWorkoutDay(${i})" class="shrink-0 h-11 px-3.5 rounded-full text-[13px] ${i === state.activeWorkoutDayIdx ? "bg-[var(--t-text)] text-[var(--t-bg)] font-bold" : "bg-[var(--t-elev)] text-[var(--t-text2)] font-semibold"}">${esc(d.name.split(":")[0])}${i === nIdx ? ' <span class="t-accent">•</span>' : ""}</button>`).join("");

  return `
    <div class="grid grid-cols-7 gap-1.5">${strip}</div>
    <div class="t-card rounded-[22px] p-5 space-y-3.5">
      <div class="t-label ${inProg ? "" : "t-accent"}" style="${inProg ? "" : "color:var(--t-acc-text)"}">${inProg ? "DEVAM EDEN ANTRENMAN" : state.activeWorkoutDayIdx === nIdx ? "SIRADAKİ ANTRENMAN" : "SEÇİLİ ANTRENMAN"}</div>
      <div class="t-display text-[34px] leading-none uppercase">${esc(day.name)}</div>
      <div class="flex gap-4 t-muted text-sm">
        <span><b class="text-[var(--t-text)]">${day.exercises.length}</b> hareket</span><span><b class="text-[var(--t-text)]">${sets}</b> set</span><span>~<b class="text-[var(--t-text)]">${estimateMinutes(day)}</b> dk</span>
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
        ${[1, 2, 3, 4].map(v => `<button onclick="setEffort(${exIdx}, ${i}, ${v})" aria-pressed="${s.e === v}" class="h-11 rounded-xl text-[13px] ${s.e === v ? "font-extrabold text-black" : "font-semibold bg-[var(--t-elev)] text-[var(--t-text2)]"}" ${s.e === v ? `style="background:${EFFORT_COLORS[v]}"` : ""}>${EFFORT_LABELS[v]}</button>`).join("")}
      </div>
    </div>`;
}
// Set satırları
function setRowHtml(ex, exIdx, s, i, ptr, prev) {
  const isNext = ptr && ptr.e === exIdx && ptr.s === i;
  const rowCls = s.done ? "bg-[var(--t-panel)]" : isNext ? "bg-[var(--t-elev0)] ring-[1.5px] ring-[var(--t-acc-text)] ring-inset" : "";
  const check = `<button onclick="toggleSetDone(${exIdx}, ${i})" aria-label="Seti tamamla" class="w-11 h-11 rounded-xl flex items-center justify-center ${s.done ? "bg-[var(--t-acc)] text-[var(--t-on-acc)]" : "border-[1.5px] border-[var(--t-faint)] t-muted"}">${svgI("check", 22, 2.6)}</button>`;
  if (ex.kind === "cardio") {
    return `<div class="rounded-2xl p-2.5 space-y-2 ${rowCls}">
      <div class="flex items-center justify-between"><span class="text-xs font-bold t-muted">${ex.sets.length > 1 ? (i + 1) + ". BÖLÜM" : "KARDİYO"}</span>${check}</div>
      <div class="grid grid-cols-3 gap-2">
        <label class="block"><span class="block text-[12px] t-muted mb-1">Süre (dk)</span><input type="text" inputmode="decimal" data-fk="c-${exIdx}-${i}-min" value="${esc(s.min === "" ? "" : fmtNum(num(s.min)))}" onchange="updateSetData(${exIdx}, ${i}, 'min', this.value)" class="t-input w-full" /></label>
        <label class="block"><span class="block text-[12px] t-muted mb-1">Mesafe (km)</span><input type="text" inputmode="decimal" placeholder="—" data-fk="c-${exIdx}-${i}-km" value="${esc(s.km === "" || s.km == null ? "" : fmtNum(num(s.km)))}" onchange="updateSetData(${exIdx}, ${i}, 'km', this.value)" class="t-input w-full" /></label>
        <label class="block"><span class="block text-[12px] t-muted mb-1">Eğim/Seviye</span><input type="text" placeholder="—" data-fk="c-${exIdx}-${i}-lvl" value="${esc(s.lvl || "")}" onchange="updateSetData(${exIdx}, ${i}, 'lvl', this.value)" class="t-input w-full" /></label>
      </div>
    </div>`;
  }
  if (ex.kind === "time") {
    return `<div class="grid items-center gap-2 h-14 px-1 rounded-2xl ${rowCls}" style="grid-template-columns: 40px minmax(0,1fr) 84px 44px">
      <span class="t-display text-[22px] text-center ${s.done || isNext ? "text-[var(--t-text)]" : "t-dim"}">${i + 1}</span>
      <span class="flex items-center gap-1.5"><input type="text" inputmode="numeric" data-fk="t-${exIdx}-${i}" value="${num(s.sec)}" onchange="updateSetData(${exIdx}, ${i}, 'sec', this.value)" class="t-input w-20" /><span class="text-xs t-muted">sn</span></span>
      <button onclick="startTimer(${num(s.sec)}, ${esc(JSON.stringify(ex.name.slice(0, 40)))})" class="t-btn-ghost h-11 rounded-xl text-[13px] flex items-center justify-center gap-1">${svgI("play", 14)}Başlat</button>
      ${check}
    </div>`;
  }
  let lastDone = -1;
  ex.sets.forEach((x, j) => { if (x.done) lastDone = j; });
  const effLbl = s.done && EFFORT_LABELS[s.e] ? `<span class="block font-sans text-[11px] font-bold leading-none mt-0.5" style="color:${EFFORT_COLORS[s.e]}">${EFFORT_LABELS[s.e]}</span>` : "";
  return `<div class="rounded-2xl ${rowCls}"><div class="grid items-center gap-2 h-14 px-1" style="grid-template-columns: 36px minmax(0,1fr) 78px 60px 44px">
    <span class="t-display text-[22px] text-center leading-none ${s.done || isNext ? "text-[var(--t-text)]" : "t-dim"}">${i + 1}${s.pr ? '<span class="text-[var(--t-warn-icon)] text-sm">★</span>' : ""}${effLbl}</span>
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
      ? `<div class="grid gap-2 px-1 text-[12px] font-bold tracking-wider t-dim" style="grid-template-columns: 36px minmax(0,1fr) 78px 60px 44px"><span class="text-center">SET</span><span class="truncate">ÖNCEKİ</span><span class="text-center">KG</span><span class="text-center">TEKRAR</span><span></span></div>`
      : ex.kind === "time" ? `<div class="grid gap-2 px-1 text-[12px] font-bold tracking-wider t-dim" style="grid-template-columns: 40px minmax(0,1fr) 84px 44px"><span class="text-center">SET</span><span>SÜRE</span><span></span><span></span></div>` : "";
    return `
      <div id="exCard_${exIdx}" class="t-card rounded-[22px] p-4 space-y-3" style="scroll-margin-top: 9rem;">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0 space-y-1.5">
            <div class="t-label">HAREKET ${exIdx + 1} / ${total}${allDone ? ' <span class="t-accent">· TAMAMLANDI</span>' : ""}</div>
            <div class="text-[21px] font-bold leading-tight">${esc(ex.name)}</div>
            <div class="flex flex-wrap gap-1.5">
              ${ex.targetInfo ? `<span class="t-chip-accent">${esc(ex.targetInfo)}</span>` : ""}
              ${muscleOf(ex) ? `<span class="t-chip">${esc(muscleOf(ex))}</span>` : ""}
              ${eq && eq !== "plates" ? `<span class="t-chip">${EQUIP_SHORT[eq]}</span>` : ""}
              ${ex.kind !== "weight" ? `<span class="t-chip">${ex.kind === "cardio" ? "Kardiyo" : "Süreli"}</span>` : ""}
            </div>
          </div>
          <button onclick="openExSheet(${exIdx})" aria-label="Hareket seçenekleri" class="w-11 h-11 shrink-0 rounded-[14px] bg-[var(--t-elev)] flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.9"></circle><circle cx="12" cy="12" r="1.9"></circle><circle cx="19" cy="12" r="1.9"></circle></svg>
          </button>
        </div>
        ${last ? `<div class="text-[13px] t-muted">Geçen sefer (${fmtDate(last.ts)}): <span class="text-[var(--t-text2)] font-semibold">${esc(sessionSummary(last))}</span></div>` : ""}
        <div id="exRight_${exIdx}" class="text-[12px] t-dim">${exRightText(ex)}</div>
        ${levelsAskHtml(ex, exIdx)}
        ${suggestionHtml(ex, exIdx)}
        <input type="text" value="${esc(ex.note || "")}" placeholder="Not ekle (koltuk ayarı, tutuş...)" onchange="updateExerciseNote(${exIdx}, this.value)" class="t-note w-full text-[13px]" />
        ${head}
        <div class="space-y-1.5">${ex.sets.map((s, i) => setRowHtml(ex, exIdx, s, i, ptr, prevOf(i))).join("")}</div>
        <button onclick="addSetToExercise(${exIdx})" class="w-full h-11 rounded-[14px] border-[1.5px] border-dashed border-[var(--t-line)] t-muted text-sm font-semibold">+ ${ex.kind === "cardio" ? "Bölüm" : "Set"} ekle</button>
      </div>`;
  }).join("");

  return `
    <div class="flex items-center justify-between gap-2">
      <button onclick="exitActiveWorkout()" aria-label="Antrenman özetine dön" class="w-11 h-11 rounded-full bg-[var(--t-surface)] flex items-center justify-center">${svgI("chevL", 22)}</button>
      <div class="flex flex-col items-center min-w-0">
        <div class="t-display text-xl leading-none uppercase truncate max-w-[220px]">${esc(day.name)}</div>
        <div class="text-xs t-muted tabular-nums mt-1"><span id="gymElapsed">00:00</span> · <span id="gymProgText">0/0 set</span></div>
      </div>
      <button onclick="finishAndLogWorkout()" class="t-btn-outline h-11 px-4 rounded-full text-sm">Bitir</button>
    </div>
    <div class="h-1 rounded-full bg-[var(--t-elev)] overflow-hidden"><div id="gymProgBar" class="h-full bg-[var(--t-acc)] transition-all duration-300" style="width:0%"></div></div>
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
  if (best <= 0 && vol <= 0) return lv ? "Kademe: " + lv : "";   // v32: kilo girilmeden "~0 kg" gösterme
  return `Tahmini 1RM ~${Math.round(best)} kg · Tonaj ${Math.round(vol).toLocaleString("tr-TR")} kg${lv ? " · Kademe: " + lv : ""}`;
}

function gymProgramHtml() {
  const day = activeDay();
  const nIdx = nextDayIdx();
  const chips = state.workoutDays.map((d, i) => `<button onclick="selectWorkoutDay(${i})" class="shrink-0 h-11 px-4 rounded-full text-[13px] ${i === state.activeWorkoutDayIdx ? "bg-[var(--t-text)] text-[var(--t-bg)] font-bold" : "bg-[var(--t-surface)] border border-[var(--t-line)] text-[var(--t-text2)] font-semibold"}">${esc(d.name)}${i === nIdx ? ' <span class="text-[11px] font-bold" style="color:#1FD1C1">SIRADA</span>' : ""}</button>`).join("");
  const rows = day.exercises.map((ex, i) => {
    const eq = equipOf(ex);
    const meta = [ex.targetInfo, muscleOf(ex), eq ? EQUIP_SHORT[eq] : (ex.kind === "cardio" ? "Kardiyo" : "Süreli")].filter(Boolean).join(" · ");
    const lvWarn = usesLevels(ex) && !ex.levels ? `<span class="text-[12px] text-[var(--t-warn-mid)]">Kademe tanımlı değil</span>` : usesLevels(ex) ? `<span class="text-[12px] t-dim">Kademe: ${esc(levelsSummary(ex))}</span>` : "";
    return `<div data-ex-row="${i}" class="t-card-flat rounded-2xl min-h-[64px] pl-1 pr-1.5 py-2 flex items-center gap-2">
      ${day.exercises.length > 1 ? `<button class="drag-handle w-11 h-11 shrink-0 rounded-xl flex items-center justify-center t-dim" data-exidx="${i}" aria-label="${esc(ex.name)} hareketini sürükleyerek taşı" style="touch-action: none; cursor: grab;">${svgI("grip", 22, 2.4)}</button>` : `<span class="w-3"></span>`}
      <span class="t-display text-xl t-dim w-6 text-center">${i + 1}</span>
      <span class="flex-1 min-w-0 flex flex-col gap-0.5"><span class="text-[15px] font-semibold line-clamp-2 leading-snug">${esc(ex.name)}</span><span class="text-xs t-muted truncate">${esc(meta)}</span>${lvWarn}</span>
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
      <button onclick="deleteWorkoutDay()" class="t-btn-ghost h-11 rounded-xl text-[13px]" style="color:var(--t-danger-text)">Günü sil</button>
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
        ${inDay.has(exKey(n)) ? `<span class="self-start text-[11px] font-bold px-2 py-0.5 rounded-full border border-[var(--t-panel-line)] bg-[var(--t-panel)]" style="color:#1FD1C1">PROGRAMDA</span>` : ""}
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
  const rangeBtn = (k, l) => `<button onclick="setLibRange('${k}')" aria-pressed="${range === k}" class="h-11 rounded-[11px] text-[13px] ${range === k ? "bg-[var(--t-text)] text-[var(--t-bg)] font-bold" : "t-muted font-semibold"}">${l}</button>`;
  const rangeTxt = range === "today" ? "Bugünkü set sayısına göre" : range === "program" ? "Programının bir haftada verdiği set sayısı" : "Bu haftaki set sayısına göre";
  const rangeWord = range === "today" ? "Bugün" : range === "program" ? "Programında haftada" : "Bu hafta";
  const pTotal = range !== "today" ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;
  const pRows = range !== "today" ? MUSCLES.map(m => {
    const c = counts[m] || 0;
    const tg = c === 0 ? "yok" : c < 10 ? "az" : c <= 20 ? "ideal" : "yüksek";
    const col = c === 0 ? "#3A3A40" : c < 10 ? "#3E8F88" : c <= 20 ? "#14D9C6" : "#00FFE5";
    return `<button onclick="selectMuscle(${esc(JSON.stringify(m))})" class="w-full min-h-[44px] flex items-center gap-2.5 text-left">
      <span class="w-[132px] shrink-0 text-[13px] ${m === sel ? "text-[var(--t-text)] font-bold" : "text-[var(--t-text2)]"} truncate">${esc(m)}</span>
      <span class="relative flex-1 h-2.5 rounded-full bg-[var(--t-elev)] overflow-hidden"><span class="absolute inset-y-0 left-0 rounded-full" style="width:${Math.min(100, c / 24 * 100)}%;background:${col}"></span></span>
      <span class="w-[68px] shrink-0 text-right text-[13px]"><b class="text-[var(--t-text)]">${c}</b> <span class="t-dim text-[12px]">${tg}</span></span>
    </button>`;
  }).join("") : "";
  return `
    <div class="flex items-center justify-between">
      <div class="flex flex-col"><span class="t-label">KAS YÜKÜ</span><span class="text-[13px] text-[var(--t-text2)]">${rangeTxt}</span></div>
    </div>
    <div class="grid grid-cols-3 gap-0.5 bg-[var(--t-surface)] border border-[var(--t-line)] rounded-[14px] p-0.5">${rangeBtn("week", "Bu hafta")}${rangeBtn("today", "Bugün")}${rangeBtn("program", "Programım")}</div>
    <div class="flex justify-center">
      <div class="relative t-bodymap" style="width: min(100%, 340px); aspect-ratio: 765 / 1024;">
        <img src="anatomy.jpg" alt="Önden ve arkadan kas anatomisi" class="absolute inset-0 w-full h-full select-none" draggable="false" />
        <svg viewBox="0 0 765 1024" class="absolute inset-0 w-full h-full" role="img" aria-label="Kas grupları set sayısına göre renklendi; renklenmiş bir kasa dokunarak seç">
          <g style="mix-blend-mode: color">${polys}</g>
          <g style="pointer-events:none">${sels}</g>
        </svg>
        <span class="absolute left-1.5 bottom-1 text-[12px] font-bold tracking-widest t-muted">ÖN</span>
        <span class="absolute right-1.5 bottom-1 text-[12px] font-bold tracking-widest t-muted">ARKA</span>
      </div>
    </div>
    <div class="flex items-center justify-center gap-3.5 text-[12px] t-muted">
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
      <span class="flex flex-col gap-0.5"><span class="text-base font-bold">${esc(sel)}</span><span class="text-[13px] t-muted">${rangeWord} <b class="text-[var(--t-text)]">${n} set</b> · ${range === "program" && n === 0 ? "programında yok" : tag}</span></span>
      <button onclick="selectMuscle(null)" class="t-btn-ghost h-11 px-3 rounded-xl text-[13px]">Temizle</button>
    </div>` : ""}
    <label class="flex items-center gap-2.5 h-12 rounded-[14px] bg-[var(--t-surface)] border border-[var(--t-line)] px-3.5 t-muted">
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
        <div class="text-xs t-muted mt-0.5">${num(l.sets)} set · ${num(l.volume).toLocaleString("tr-TR")} kg${num(l.durationMin) ? " · " + fmtMinutes(num(l.durationMin)) : ""}${num(l.cardioMin) ? " · " + fmtNum(num(l.cardioMin)) + " dk kardiyo" : ""}${num(l.prs) ? ` · <span class="text-[var(--t-warn-mid)]">${l.prs} rekor</span>` : ""}</div>
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
    <div id="workoutHistoryList" class="space-y-2">${rows || `<div class="t-card-flat rounded-2xl p-6 text-center space-y-3"><p class="text-sm t-muted">Henüz kaydedilmiş antrenman yok. Antrenmanı bitirip kaydettiğinde burada listelenir.</p><button onclick="setGymView('today')" class="t-btn h-12 px-5 rounded-2xl text-[15px]">Bugünün antrenmanına git</button></div>`}</div>
    <button onclick="switchTab('progress')" class="t-btn-ghost w-full min-h-11 px-4 py-2 rounded-xl text-sm">Grafikler ve rekorlar: İlerleme sekmesi</button>`;
}

function renderGym() {
  if (!GYM_VIEWS.some(x => x[0] === state.gymView)) state.gymView = "today";
  const active = state.gymView === "today" && state.gymActive;
  let html = active ? gymActiveHtml()
    : gymSubNav() + (state.gymView === "program" ? gymProgramHtml() : state.gymView === "library" ? gymLibraryHtml() : state.gymView === "history" ? gymHistoryHtml() : gymTodayHtml());
  $("gymRoot").innerHTML = html;
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
  const item = (fn, icon, label, sub, extra = "") => `<button onclick="closeModal('exSheet'); ${fn}" class="w-full min-h-[60px] rounded-2xl px-2.5 flex items-center gap-3.5 bg-[var(--t-elev0)] text-left ${extra}">
      <span class="w-10 h-10 shrink-0 rounded-xl bg-[var(--t-elev2)] flex items-center justify-center" style="color:#1FD1C1">${svgI(icon, 20, 1.9)}</span>
      <span class="flex-1 min-w-0 flex flex-col gap-0.5"><span class="text-[15px] font-semibold">${label}</span>${sub ? `<span class="text-xs t-muted truncate">${esc(sub)}</span>` : ""}</span>
      <span class="t-dim">${svgI("chevR", 18)}</span></button>`;
  $("exSheetBody").innerHTML = `
    <div class="px-1 pb-2"><div class="text-xl font-bold">${esc(ex.name)}</div>
      <div class="text-[13px] t-muted">${esc([muscleOf(ex), ex.targetInfo, ex.kind !== "cardio" ? "Dinlenme " + (ex.rest ?? state.settings.restSec) + " sn" : ""].filter(Boolean).join(" · "))}</div></div>
    ${item(`openExerciseChart(${exIdx})`, "chart", "İlerleme grafiği", "Tahmini 1RM ve son kayıtlar")}
    ${ex.kind === "weight" && eq !== "bodyweight" ? item(`openPlateTool(${exIdx})`, "calc", eq === "plates" ? "Plaka ve ısınma" : "Kademe ve ısınma", plateSub) : ""}
    ${item(`openEditExercise(${exIdx})`, "edit", "Hareketi düzenle", ex.kind === "weight" ? "Set, tekrar, ekipman, kademeler, kas grubu" : "Set, süre, dinlenme")}
    <div class="grid grid-cols-2 gap-1.5">
      <button onclick="closeModal('exSheet'); moveExercise(${exIdx}, -1)" ${exIdx === 0 ? "disabled" : ""} class="min-h-[52px] rounded-2xl bg-[var(--t-elev0)] flex items-center justify-center gap-2 text-[14px] font-semibold ${exIdx === 0 ? "opacity-30" : ""}">${svgI("up", 18)} Yukarı taşı</button>
      <button onclick="closeModal('exSheet'); moveExercise(${exIdx}, 1)" ${last ? "disabled" : ""} class="min-h-[52px] rounded-2xl bg-[var(--t-elev0)] flex items-center justify-center gap-2 text-[14px] font-semibold ${last ? "opacity-30" : ""}">${svgI("down", 18)} Aşağı taşı</button>
    </div>
    ${ex.sets.length > 1 ? item(`removeLastSetFromExercise(${exIdx})`, "minus", ex.kind === "cardio" ? "Son bölümü sil" : "Son seti sil", `${ex.sets.length} → ${ex.sets.length - 1}`) : ""}
    <button onclick="closeModal('exSheet'); removeExercise(${exIdx})" class="w-full min-h-[60px] rounded-2xl px-2.5 flex items-center gap-3.5 bg-[var(--t-elev0)] text-left mt-1" style="color:#FF8A8A">
      <span class="w-10 h-10 shrink-0 rounded-xl bg-[var(--t-danger-bg)] flex items-center justify-center">${svgI("trash", 20, 1.9)}</span>
      <span class="flex-1 flex flex-col gap-0.5"><span class="text-[15px] font-semibold">Hareketi kaldır</span><span class="text-xs t-muted">6 saniye içinde geri alınabilir</span></span></button>
    <button onclick="closeModal('exSheet')" class="w-full h-[52px] rounded-2xl bg-[var(--t-elev2)] font-bold text-[15px] mt-2">Kapat</button>`;
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
  toast(mealEditIdx >= 0 ? "Öğün güncellendi" : `"${title}" eklendi${time ? " (" + time + ")" : ""}`);
}

let mealDrag = null;
// Sürükle-bırak: öğün kartları (data-midx) ve Programım'daki hareket satırları (data-exidx) aynı mantığı kullanır.
document.addEventListener("pointerdown", e => {
  const h = e.target && e.target.closest ? e.target.closest(".drag-handle") : null;
  if (!h) return;
  const isEx = h.dataset.exidx != null, isMob = h.dataset.mobidx != null;
  const cards = [...document.querySelectorAll(isMob ? "#mobList [data-mob-row]" : isEx ? "#progExList [data-ex-row]" : "#mealsContainer [data-meal-card]")];
  const from = parseInt(isMob ? h.dataset.mobidx : isEx ? h.dataset.exidx : h.dataset.midx, 10);
  const card = cards[from];
  if (!card || cards.length < 2) return;
  e.preventDefault();
  const sy = window.scrollY;
  mealDrag = {
    kind: isMob ? "mob" : isEx ? "ex" : "meal", dayIdx: state.activeWorkoutDayIdx,
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
  const isEx = mealDrag.kind !== "meal";
  const dx = isEx ? 0 : e.clientX - mealDrag.startX, dy = e.clientY + sy - mealDrag.startY;
  mealDrag.card.style.transform = `translate(${dx}px, ${dy}px) scale(1.02)`;
  const c0 = mealDrag.centers[mealDrag.from];
  const cx = c0.x + dx, cy = c0.y + dy;
  let best = mealDrag.from, bd = Infinity;
  mealDrag.centers.forEach((c, i) => { const d = Math.hypot(c.x - cx, c.y - cy); if (d < bd) { bd = d; best = i; } });
  if (best !== mealDrag.to) {
    if (mealDrag.cards[mealDrag.to] && mealDrag.to !== mealDrag.from) mealDrag.cards[mealDrag.to].style.outline = "";
    mealDrag.to = best;
    if (best !== mealDrag.from) mealDrag.cards[best].style.outline = mealDrag.kind === "mob" ? "2px dashed var(--t-acc-text)" : isEx ? "2px dashed var(--t-acc-text)" : "2px dashed #22C55E";
  }
});
function endMealDrag() {
  if (!mealDrag) return;
  const { from, to, card, cards, kind, dayIdx } = mealDrag;
  mealDrag = null;
  card.style.transform = ""; card.style.zIndex = ""; card.style.boxShadow = ""; card.style.position = "";
  cards.forEach(c => { c.style.outline = ""; });
  if (to === from) return;
  if (kind === "mob") {
    const list = mobItems();
    if (!list[from]) { renderAll(); return; }
    const [x] = list.splice(from, 1);
    list.splice(to, 0, x);
    renderAll();
    toast("Hareket taşındı");
    return;
  }
  if (kind === "ex") {
    const day = state.workoutDays[dayIdx];
    if (!day || dayIdx !== state.activeWorkoutDayIdx) { renderAll(); return; }
    const [x] = day.exercises.splice(from, 1);
    day.exercises.splice(to, 0, x);
    renderAll();
    toast("Hareket taşındı");
    return;
  }
  const meals = curMeals();
  const [m] = meals.splice(from, 1);
  meals.splice(to, 0, m);
  renderAll();
  toast("Öğün taşındı");
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
  $("cfTitle").textContent = "Özel besini düzenle";
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
  offerUndo(`${f.name} silindi`);
}

