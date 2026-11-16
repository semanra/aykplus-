// ---------------------------------------------------------------------------
// ARAMALI SEÇİCİ
// ---------------------------------------------------------------------------
let picker = null;

function openPicker(title, groups, onPick, extra) {
  picker = { groups, onPick, extra: extra || null, cat: "all", flat: [] };
  $("pickerTitle").textContent = title;
  $("pickerSearch").value = "";
  $("pickerSearch").placeholder = t("Ara...");
  $("pickerExtraWrap").classList.toggle("hidden", !extra);
  if (extra) $("pickerExtraBtn").textContent = extra.label;
  renderPickerChips();
  renderPickerList();
  openModal("pickerModal");
  $("pickerList").scrollTop = 0;
}

function renderPickerChips() {
  const chip = (key, label) => {
    const on = picker.cat === key;
    return `<button onclick="setPickerCat('${key}')" class="shrink-0 text-[12px] px-2.5 py-1 rounded-full border ${on ? "w-btn font-semibold" : "bg-[var(--w-elev)] border-[var(--w-line)] text-[var(--w-muted)]"}">${esc(label)}</button>`;
  };
  $("pickerChips").innerHTML = chip("all", t("Tümü")) + picker.groups.map((g, i) => chip(String(i), g.short || g.label)).join("");
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
    html += `<div class="text-[12px] font-bold text-[var(--w-dim)] tracking-wide pt-2">${esc(g.label)}</div>`;
    items.forEach(it => {
      if (shown >= 150) { hidden++; return; }
      shown++;
      const idx = picker.flat.push(it) - 1;
      const main = `<button onclick="pickerChoose(${idx})" class="flex-1 min-w-0 text-left px-3 py-2.5">
        <div class="text-sm font-medium text-[var(--w-text1)]">${esc(it.label)}</div>
        ${it.sub ? `<div class="text-[12px] text-[var(--w-muted)] mt-0.5">${esc(it.sub)}</div>` : ""}
      </button>`;
      html += `<div class="bg-[var(--w-elev)] border border-[var(--w-line)] rounded-xl active:bg-[var(--w-elev2)] flex">${main}</div>`;
    });
  });
  if (hidden) html += `<div class="text-[12px] text-[var(--w-dim)] text-center py-3">${tn(hidden, "{n} sonuç daha var; aramayı daralt.")}</div>`;
  $("pickerList").innerHTML = html || `<div class="text-sm text-[var(--w-dim)] text-center py-8">${t("Sonuç bulunamadı.")}</div>`;
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


function openExercisePicker() {
  const groups = Object.keys(EXERCISE_LIBRARY).map(g => ({
    label: libCatL(g),
    short: t(g.replace(/^\d+\.\s*/, "").replace(/\s*\(.*$/, "") + "|kategori"),   // v48: kısa çip adı (Türkçede bağlam atılır, metin aynı)
    items: EXERCISE_LIBRARY[g].map(n => n.trim()).map(n => ({ id: n, label: exNameL(n), sub: detectKind(n) !== "weight" ? kindL(detectKind(n)) : "" }))
  }));
  openPicker(t("Hareket Kütüphanesi"), groups, it => openExerciseModal({ name: it.id, kind: detectKind(it.id) }),
    { label: t("Listede yok mu? Özel hareket yaz"), onClick: () => openExerciseModal({ name: "", kind: "weight" }) });
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
  $("exStartKg").value = fmtWNum(v.kg ?? 0);
  $("exTimeSetCount").value = v.tcount ?? 3;
  $("exTimeSec").value = v.sec ?? 45;
  $("exCardioMin").value = v.min ?? 30;
  $("exCardioKm").value = v.km ?? "";
  $("exCardioLvl").value = v.lvl ?? "";
  $("exRest").value = v.rest ?? state.settings.restSec;
  $("exMuscle").value = v.muscle && MUSCLES.includes(v.muscle) ? v.muscle : "auto";
  $("exInc").value = v.inc ? fmtKg(incDisp(v.inc)) : "";
  // v53: imperial'de etiketlerde "kg" → "lb" (metrikte metin aynen kalır, DOM'a dokunulmaz)
  ["exStartKg", "exInc", "exLvStart", "exLvStep", "exLvAddon"].forEach(id => {
    const lb = document.querySelector(`label[for="${id}"]`);
    if (lb && lb.dataset.t) { const v2 = wTxt(t(lb.dataset.t)); if (lb.textContent !== v2) lb.textContent = v2; }
  });
  updateExMuscleAuto();
  fillExLevels(v);
}

function updateExMuscleAuto() {
  const name = $("exName").value;
  const g = autoMuscle(name);
  $("exMuscle").options[0].textContent = g ? t("Otomatik ({e})", { e: muscleL(g) }) : t("Otomatik (belirlenemedi)");
  for (let i = 1; i < $("exMuscle").options.length; i++) $("exMuscle").options[i].textContent = muscleL($("exMuscle").options[i].value);   // v48: değer Türkçe kalır
  $("exInc").placeholder = t("{n} (otomatik)", { n: fmtNum(incDisp(autoInc(name))) });
}

function openExerciseModal(opts) {
  exModal = { mode: "add", idx: -1, kind: opts.kind || "weight", orig: null };
  $("exModalTitle").textContent = t("Hareket Ekle");
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
  $("exModalTitle").textContent = t("Hareketi Düzenle");
  fillExModalFields(vals);
  setExModalKind(ex.kind);
  openModal("exerciseModal");
}

// v53: kutudaki kilo → kayıt kg. Metrikte round2 (eskisi gibi); imperial'de lb → kg. Gösterilen değer aynen
// yeniden yazıldıysa eski kg korunur (düzenleme penceresi açıp kaydetmek kaydı kaydırmaz; lb'de girilmiş
// 3 ondalıklı kg metrikte de 2 ondalığa yuvarlanmaz).
function sameKgOrig(orig) { return orig !== undefined && orig !== null && orig !== "" && isFinite(num(orig, NaN)); }
function exKgIn(val, orig, def) {
  const n = num(val, def);
  if (n < 0) return round2(n);
  if (isImperial()) return keepKg(n, orig);
  const r = round2(n);
  return sameKgOrig(orig) && round2(num(orig)) === r ? num(orig) : r;
}
function readExLevels() {
  const sel = $("exEquip").value;
  const equip = EQUIP_LABEL[sel] ? sel : "";
  const oL = (exModal.orig && exModal.orig.levels) || {};
  const addon = Math.max(0, exKgIn($("exLvAddon").value, oL.addon, 0));
  let levels = null;
  if (exLevelsMode === "step") {
    const step = exKgIn($("exLvStep").value, oL.mode === "step" ? oL.step : null, 0);
    const start = exKgIn($("exLvStart").value, oL.mode === "step" ? oL.start : null, 0);
    if (step > 0) levels = { mode: "step", start: start > 0 ? start : step, step, addon };
  } else {
    const oList = oL.mode === "list" && Array.isArray(oL.list) ? oL.list : [];
    const listIn = tok => {
      const n = num(tok, -1);
      if (n < 0) return round2(n);
      const o = oList.find(v => (isImperial() ? num(kgToDisp(num(v))) === n : round2(num(v)) === round2(n)));
      return o !== undefined ? num(o) : isImperial() ? dispToKg(n) : round2(n);
    };
    const list = String($("exLvList").value).split(/[;\s]+/).filter(Boolean).map(tok => listIn(tok.trim())).filter(v => v >= 0);
    const uniq = [...new Set(list)].sort((a, b) => a - b);
    if (uniq.length >= 2) levels = { mode: "list", list: uniq, addon };
  }
  return { equip, levels };
}
function readExModal() {
  return {
    name: $("exName").value.trim(),
    count: Math.max(1, Math.min(12, Math.round(num($("exSetCount").value, 3)))),
    target: $("exRepRange").value.trim().replace(/-/g, "–") || "8–12",
    kg: Math.max(0, exKgIn($("exStartKg").value, exModal.orig ? exModal.orig.kg : null, 0)),
    tcount: Math.max(1, Math.min(12, Math.round(num($("exTimeSetCount").value, 3)))),
    sec: Math.max(5, Math.round(num($("exTimeSec").value, 45))),
    min: Math.max(0, round1(num($("exCardioMin").value, 30))),
    km: $("exCardioKm").value.trim() === "" ? "" : Math.max(0, Math.round(num($("exCardioKm").value, 0) * 100) / 100),
    lvl: $("exCardioLvl").value.trim(),
    rest: Math.max(0, Math.min(900, Math.round(num($("exRest").value, state.settings.restSec)))),
    muscle: MUSCLES.includes($("exMuscle").value) ? $("exMuscle").value : "",
    inc: $("exInc").value.trim() === "" ? 0 : Math.max(0, Math.min(50, exIncIn($("exInc").value))),
    ...readExLevels()
  };
}

// v53: artış adımı kutusu. Imperial'de gösterilen adım (incDisp) aynen yazıldıysa eski kayıt korunur.
function exIncIn(val) {
  const n = num(val, 0), o = exModal.orig ? exModal.orig.inc : "";
  if (!isImperial()) return num(o, 0) > 0 && round2(num(o)) === round2(n) ? num(o) : round2(n);
  if (num(o, 0) > 0 && incDisp(num(o)) === n) return num(o);
  return dispToKg(n);
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
  return `${fmtNumTr(v.min)} dk` + (v.km !== "" && v.km > 0 ? ` • ${fmtNumTr(v.km)} km` : "");
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
  if (!v.name) { uiAlert(t("Hareket adı eksik"), t("Lütfen hareket adını yaz.")); return; }
  const kind = exModal.kind;

  if (exModal.mode === "add") {
    const ex = { name: v.name, kind, targetInfo: "", note: "", sets: buildSets(kind, v) };
    if (kind !== "cardio") ex.rest = v.rest;
    applyExExtras(ex, v);
    ex.targetInfo = targetInfoFor(kind, v, null);
    activeDay().exercises.push(ex);
    closeModal("exerciseModal");
    toast(t("{name} eklendi", { name: v.name }));
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
  toast(t("Hareket güncellendi"));
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
  return t("{speed} km/s • {pm}:{ps} /km", { speed, pm: String(pm), ps: String(ps === 60 ? 59 : ps).padStart(2, "0") });
}
function sessionSummary(sess) {
  const sets = sess.sets || [];
  if (sess.kind === "cardio") {
    const ct = cardioTotals(sets, false);
    return t("{n} dk", { n: ct.min }) + (ct.km > 0 ? ` • ${fmtNum(ct.km)} km` : "");
  }
  if (sess.kind === "time") return sets.map(s => t("{n} sn", { n: String(num(s.sec)) })).join(" · ");
  return sets.map(s => `${fmtWNum(num(s.kg))}×${num(s.reps)}`).join(" · ");
}

// ---------------------------------------------------------------------------
// ANTRENMAN RENDER
// ---------------------------------------------------------------------------


function selectWorkoutDay(idx) { state.activeWorkoutDayIdx = idx; renderAll(); }

function updateSetData(exIdx, sIdx, field, val) {
  const s = activeDay().exercises[exIdx].sets[sIdx];
  if (field === "lvl") s.lvl = String(val).trim();
  else if (field === "km") s.km = String(val).trim() === "" ? "" : Math.max(0, Math.round(num(val) * 100) / 100);
  else if (field === "reps" || field === "sec") s[field] = Math.max(0, Math.round(num(val)));
  else if (field === "kg") s.kg = Math.max(0, exKgIn(val, s.kg, 0));   // v53: lb girişi; gösterilen değer yeniden yazılınca kayıt kaymaz
  else s[field] = Math.max(0, round1(num(val)));
  const ex = activeDay().exercises[exIdx];
  const rEl = $("exRight_" + exIdx);
  if (rEl) rEl.textContent = exRightText(ex);
  updateActiveProgress();
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
          toast(trFill(wTxt(t("YENİ REKOR! {name}: {kg} kg × {reps} (1RM ~{rm} kg)", { kg: fmtWNum(num(s.kg)), reps: String(num(s.reps)), rm: String(Math.round(wRaw(cur))) })), { name: exNameL(ex.name) }), "pr");
        }
      }
    }
    if (ex.kind !== "cardio") {
      const hasNext = ex.sets.some(o => !o.done) || activeDay().exercises.some((o, i) => i > exIdx && o.sets.some(x => !x.done));
      if (hasNext) startTimer(ex.rest ?? state.settings.restSec, "Dinlenme • " + ex.name);
    }
  }
  renderAll();
  if (s.done && typeof animSetTick === "function") animSetTick(exIdx, sIdx, !!s.pr);   // v55 ANİM: set tiki (+ rekor parıltısı)
  if (s.done && ex.sets.every(x => x.done) && typeof animExDone === "function") animExDone(exIdx);   // v57 ANİM: hareket tamam
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
  offerUndo(t("\"{name}\" kaldırıldı", { name: exNameL(ex.name) }));
}

async function addWorkoutDay() {
  const name = await uiAsk({ title: t("Yeni antrenman günü"), message: t("Günün adını yaz."), input: { value: curLang() === "en" ? `DAY ${state.workoutDays.length + 1}: ` : `${state.workoutDays.length + 1}. GÜN: `, placeholder: t("Örn: 5. GÜN: Kol") }, ok: t("Ekle") });
  if (!name || !name.trim()) return;
  state.workoutDays.push({ id: "day_" + Date.now(), name: name.trim(), exercises: [] });
  state.activeWorkoutDayIdx = state.workoutDays.length - 1;
  renderAll();
}
async function renameWorkoutDay() {
  const d = activeDay();
  const n = await uiAsk({ title: t("Günü adlandır"), message: t("Günün yeni adını yaz."), input: { value: d.name }, ok: t("Kaydet") });
  if (n && n.trim()) { d.name = n.trim(); renderAll(); }
}
async function deleteWorkoutDay() {
  if (state.workoutDays.length <= 1) { uiAlert(t("Gün silinemiyor"), t("En az bir antrenman günü kalmalı.")); return; }
  const d = activeDay();
  if (!(await uiAsk({ title: t("Gün silinsin mi?"), message: t("\"{name}\" ve içindeki tüm hareketler silinecek. 6 saniye içinde geri alabilirsin.", { name: d.name }), ok: t("Sil"), danger: true }))) return;
  if (activeDay() !== d) return;
  snapshot();
  state.workoutDays.splice(state.activeWorkoutDayIdx, 1);
  state.activeWorkoutDayIdx = Math.max(0, state.activeWorkoutDayIdx - 1);
  renderAll();
  offerUndo(t("\"{name}\" silindi", { name: d.name }));
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
  if (doneSets === 0) { uiAlert(t("Henüz tamamlanan set yok"), t("Kaydetmek için en az 1 setin yanındaki onay kutusunu işaretlemelisin.")); return; }
  if (!(await uiAsk({ title: t("Antrenman kaydedilsin mi?"), message: tn(doneSets, "{name} · {n} set tamamlandı", { name: day.name }), ok: t("Kaydet") }))) return;
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
    arr.push(sess);   // v36: eskiden hareket başına son 60 seans tutuluyordu (eskiler siliniyordu); artık hiç silinmez
  });

  const startedAt = num(state.workoutStartedAt, 0);
  const durMin = startedAt ? Math.round((ts - startedAt) / 60000) : 0;
  state.workoutLogs.push({
    id: logId, ts, date: fmtDateStore(ts, true), dayId: day.id, dayName: day.name, sets: doneSets,
    durationMin: durMin >= 1 && durMin <= MAX_WORKOUT_MIN ? durMin : 0,
    volume: Math.round(vol), cardioMin: round1(cMin), cardioKm: Math.round(cKm * 100) / 100, prs,
    summary: `${day.exercises.length} Hareket`
  });
  // v36: eskiden son 400 antrenman tutuluyordu; artık hiç silinmez (Profil → Yedekleme'de kayıt alanı göstergesi)
  // v57: özet penceresi için rekor hareketleri (her hareketin en iyi rekor seti; kayda yazılmaz)
  const prList = [];
  day.exercises.forEach(ex => {
    if (ex.kind !== "weight") return;
    const ps = ex.sets.filter(s => s.done && s.pr);
    if (!ps.length) return;
    const b = ps.reduce((a, s) => e1rm(s.kg, s.reps) > e1rm(a.kg, a.reps) ? s : a);
    prList.push({ name: ex.name, kg: num(b.kg), reps: num(b.reps) });
  });

  day.exercises.forEach(ex => ex.sets.forEach(s => { s.done = false; s.pr = false; delete s.e; }));
  if (!workoutInProgress()) state.workoutStartedAt = 0;
  state.gymActive = false;
  stopTimer();
  window.scrollTo(0, 0);
  renderAll();
  const li = state.workoutLogs.length - 1;
  // v57: kısa bildirim yerine "Antrenman tamamlandı" özet penceresi (Paylaş → paylaşım kartı). finishToastText kalıpları duruyor.
  openFinishSummary(li, prList);
}

// v48: bitiş bildirimi tek cümle kalıplarıyla (süre / kardiyo / rekor var-yok birleşimleri; rekor sayısı tn)
function finishToastText(durMin, vol, cMin, prs) { return wTxt(finishToastTextKg(durMin, vol, cMin, prs)); }   // v53: imperial'de lb
function finishToastTextKg(durMin, vol, cMin, prs) {
  const v = { dur: durMin ? fmtMinutes(durMin) : "", vol: Math.round(wRaw(vol)).toLocaleString(locale()), cmin: cMin };
  if (durMin) {
    if (cMin > 0) return prs ? tn(prs, "Tebrikler! {dur}, {vol} kg tonaj, {cmin} dk kardiyo, {n} rekor kaydedildi", v) : t("Tebrikler! {dur}, {vol} kg tonaj, {cmin} dk kardiyo kaydedildi", v);
    return prs ? tn(prs, "Tebrikler! {dur}, {vol} kg tonaj, {n} rekor kaydedildi", v) : t("Tebrikler! {dur}, {vol} kg tonaj kaydedildi", v);
  }
  if (cMin > 0) return prs ? tn(prs, "Tebrikler! {vol} kg tonaj, {cmin} dk kardiyo, {n} rekor kaydedildi", v) : t("Tebrikler! {vol} kg tonaj, {cmin} dk kardiyo kaydedildi", v);
  return prs ? tn(prs, "Tebrikler! {vol} kg tonaj, {n} rekor kaydedildi", v) : t("Tebrikler! {vol} kg tonaj kaydedildi", v);
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
  offerUndo(t("Antrenman kaydı silindi"));
}

