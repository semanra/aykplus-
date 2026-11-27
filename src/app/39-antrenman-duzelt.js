// ============================================================================
// v85 — BİTMİŞ ANTRENMANI DÜZELT
// Antrenman → Geçmiş'te kalem düğmesi. Kaydın seansları exerciseHistory'de logId ile bulunur; kilo/tekrar (kardiyoda
// dk/km, sürelide sn) düzeltilir, set silinebilir. Kaydet: seanslar yazılır, kaydın set/tonaj/kardiyo/rekor sayısı
// yeniden hesaplanır. Rekor kuralı canlı kuralla aynı: setin tahmini 1RM'i, aynı hareketin bu kayıttan ÖNCEKİ
// seanslarındaki ve bu seansın önceki setlerindeki en iyiyi geçerse (önceki seans yoksa rekor sayılmaz).
// İlerleme grafikleri exerciseHistory'den okunduğu için kendiliğinden güncellenir. Taslak kaydedilene kadar kayda yazılmaz.
// ============================================================================
let elDraft = null;   // { li, logId, list: [{ key, idx, kind, name, sets }] }

function logSessions(log) {
  const out = [];
  if (!log || !log.id) return out;
  Object.keys(state.exerciseHistory).forEach(key => {
    const arr = exHist(key);
    if (!arr) return;
    arr.forEach((s, idx) => { if (isObj(s) && s.logId === log.id && Array.isArray(s.sets)) out.push({ key, idx, s }); });
  });
  return out;
}

function openEditLog(li) {
  const log = state.workoutLogs[li];
  if (!log) return;
  const ss = logSessions(log);
  elDraft = { li, logId: log.id || null, list: ss.map(x => ({ key: x.key, idx: x.idx, kind: x.s.kind || "weight", name: x.s.name || x.key, sets: clone(x.s.sets).filter(isObj) })) };
  renderEditLog();
  openModal("editLogModal");
}

function elSetRow(e, si, st) {
  const del = `<button onclick="elRemoveSet(${e}, ${si})" aria-label="${esc(t("{n}. seti sil", { n: si + 1 }))}" class="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-[var(--w-dim)]">${svgI("x", 18, 2.2)}</button>`;
  const inp = (field, val, label, w) => `<input type="text" inputmode="decimal" value="${esc(val)}" oninput="elSetField(${e}, ${si}, '${field}', this.value)" aria-label="${esc(label)}" data-el-in="${e}-${si}-${field}" class="t-in text-center font-bold h-11 px-1 ${w}" />`;
  const no = `<span class="w-6 shrink-0 text-center t-display text-[18px] text-[var(--w-dim)]">${si + 1}</span>`;
  const kind = elDraft.list[e].kind;
  if (kind === "cardio") return `<div class="flex items-center gap-1.5" data-el-set>${no}${inp("min", fmtNum(num(st.min)), t("Süre (dk)"), "w-[72px]")}<span class="text-[12px] text-[var(--w-muted)]">${t("dk")}</span>${inp("km", st.km === "" || st.km == null ? "" : fmtNum(num(st.km)), t("Mesafe (km)"), "w-[72px]")}<span class="text-[12px] text-[var(--w-muted)] flex-1">km</span>${del}</div>`;
  if (kind === "time") return `<div class="flex items-center gap-1.5" data-el-set>${no}${inp("sec", String(num(st.sec)), t("Süre (sn)"), "w-[80px]")}<span class="text-[12px] text-[var(--w-muted)] flex-1">${t("sn")}</span>${del}</div>`;
  return `<div class="flex items-center gap-1.5" data-el-set>${no}${inp("kg", fmtWNum(num(st.kg)), wTxt(t("Kilo (kg)")), "w-[80px]")}<span class="text-[12px] text-[var(--w-muted)] whitespace-nowrap">${wUnit()}</span>${inp("reps", String(num(st.reps)), t("Tekrar"), "w-[64px]")}<span class="text-[12px] text-[var(--w-muted)] flex-1">${t("tekrar")}</span>${del}</div>`;
}

function renderEditLog() {
  const d = elDraft;
  if (!d) return;
  const log = state.workoutLogs[d.li];
  const blocks = d.list.map((x, e) => x.sets.length ? `<div class="rounded-2xl bg-[var(--w-elev)] px-3 py-2.5 space-y-1.5" data-el-ex="${e}">
      <div class="text-[15px] font-bold text-[var(--w-text)] truncate">${esc(exNameL(x.name))}</div>
      ${x.sets.map((st, si) => elSetRow(e, si, st)).join("")}
    </div>` : "").join("");
  const empty = !d.logId || !d.list.length
    ? `<p class="text-[14px] text-[var(--w-muted)] rounded-2xl bg-[var(--w-elev)] px-4 py-3">${t("Bu eski kayıtta set ayrıntısı yok; düzeltilecek bir şey bulunamadı.")}</p>` : "";
  $("elBody").innerHTML = `
    <div class="w-10 h-1.5 rounded-full bg-[var(--w-line)] mx-auto mb-3"></div>
    <div class="flex items-center gap-3">
      <div class="flex-1 min-w-0">
        <h3 id="elTitle" class="text-[20px] font-extrabold leading-tight text-[var(--w-text)]">${t("Antrenmanı düzelt")}</h3>
        <div class="text-[13px] text-[var(--w-muted)] truncate">${esc([log && log.dayName, log && log.ts ? fmtDate(log.ts, true) : ""].filter(Boolean).join(" · "))}</div>
      </div>
      <button onclick="closeModal('editLogModal')" aria-label="${t("Kapat")}" class="w-11 h-11 shrink-0 rounded-full bg-[var(--w-elev)] text-[var(--w-muted)] flex items-center justify-center">${svgI("x", 20, 2.2)}</button>
    </div>
    <p class="text-[13px] text-[var(--w-muted)] mt-2">${t("Yanlış girdiğin kilo ya da tekrarı düzelt. Rekorlar ve grafikler yeniden hesaplanır.")}</p>
    <div id="elList" class="space-y-2 mt-3">${empty || blocks}</div>
    <div class="grid grid-cols-2 gap-2.5 mt-5">
      <button onclick="closeModal('editLogModal')" class="h-[52px] rounded-2xl bg-[var(--w-elev)] text-[var(--w-text)] text-[15px] font-bold">${t("Vazgeç")}</button>
      <button id="elSave" onclick="saveEditLog()" ${empty ? "disabled" : ""} class="w-btn h-[52px] rounded-2xl text-[15px] ${empty ? "opacity-40" : ""}">${t("Kaydet")}</button>
    </div>`;
}

function elSetField(e, si, field, val) {
  const x = elDraft && elDraft.list[e], st = x && x.sets[si];
  if (!st) return;
  if (field === "kg") st._kgIn = val;            // kaydederken çevrilir (birim, kayma yok kuralı)
  else st["_" + field + "In"] = val;
}
function elRemoveSet(e, si) {
  const x = elDraft && elDraft.list[e];
  if (!x) return;
  elReadInputs();
  x.sets.splice(si, 1);
  renderEditLog();
}
// Yazılmış ama kaydedilmemiş değerleri taslağa işler (geçersiz değer null → kaydetmede uyarı)
function elReadInputs() {
  (elDraft ? elDraft.list : []).forEach(x => x.sets.forEach(st => {
    if (st._kgIn != null) { const n = num(st._kgIn, NaN); st.kg = isFinite(n) && n >= 0 ? exKgIn(st._kgIn, st.kg, 0) : null; delete st._kgIn; }
    if (st._repsIn != null) { const n = num(st._repsIn, NaN); st.reps = isFinite(n) && n >= 0 ? Math.round(n) : null; delete st._repsIn; }
    if (st._secIn != null) { const n = num(st._secIn, NaN); st.sec = isFinite(n) && n >= 0 ? Math.round(n) : null; delete st._secIn; }
    if (st._minIn != null) { const n = num(st._minIn, NaN); st.min = isFinite(n) && n >= 0 ? round1(n) : null; delete st._minIn; }
    if (st._kmIn != null) { const v = String(st._kmIn).trim(), n = num(v, NaN); st.km = v === "" ? "" : isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null; delete st._kmIn; }
  }));
}

function saveEditLog() {
  const d = elDraft;
  if (!d || !d.logId) return;
  const log = state.workoutLogs[d.li];
  if (!log || log.id !== d.logId) { closeModal("editLogModal"); return; }
  elReadInputs();
  const bad = d.list.some(x => x.sets.some(st => ["kg", "reps", "sec", "min", "km"].some(k => st[k] === null) || (x.kind === "weight" && num(st.kg) > 1000) || (x.kind === "weight" && num(st.reps) > 500)));
  if (bad) { sayAlert(t("Değer hatalı"), t("Lütfen kilo ve tekrarı sayı olarak yaz.")); return; }
  if (!d.list.some(x => x.sets.length)) { sayAlert(t("Hiç set kalmadı"), t("Bütün kaydı silmek istiyorsan Geçmiş'teki çöp kutusunu kullan.")); return; }
  snapshot();
  // 1) seansları yaz (setsiz kalan seans silinir); dizinler kayarsın diye sondan başa
  const byKey = {};
  d.list.forEach(x => { (byKey[x.key] = byKey[x.key] || []).push(x); });
  Object.keys(byKey).forEach(key => {
    const arr = exHist(key);
    if (!arr) return;
    byKey[key].sort((a, b) => b.idx - a.idx).forEach(x => {
      const s = arr[x.idx];
      if (!s || s.logId !== d.logId) return;
      if (!x.sets.length) { arr.splice(x.idx, 1); return; }
      s.sets = x.sets.map(st => x.kind === "cardio" ? { min: num(st.min), km: st.km === "" ? 0 : num(st.km), lvl: st.lvl || "" }
        : x.kind === "time" ? { sec: num(st.sec) }
        : (EFFORT_LABELS[st.e] ? { kg: num(st.kg), reps: num(st.reps), e: st.e } : { kg: num(st.kg), reps: num(st.reps) }));
    });
    if (!arr.length) delete state.exerciseHistory[key];
  });
  // 2) kaydın özetini yeniden hesapla
  recalcLogSummary(log);
  markPartDirty("exerciseHistory"); markPartDirty("workoutLogs");
  closeModal("editLogModal");
  elDraft = null;
  renderAll();
  offerUndo(t("Antrenman düzeltildi"));
}

function recalcLogSummary(log) {
  let sets = 0, vol = 0, cMin = 0, cKm = 0, prs = 0;
  logSessions(log).forEach(({ key, idx, s }) => {
    const kind = s.kind || "weight";
    let best = 0, hadPrev = false;
    if (kind === "weight") (exHist(key) || []).forEach((o, j) => {
      if (j === idx || !isObj(o) || !Array.isArray(o.sets)) return;
      if (num(o.ts) < num(s.ts) || (num(o.ts) === num(s.ts) && j < idx)) { hadPrev = true; o.sets.forEach(x => { best = Math.max(best, e1rm(x && x.kg, x && x.reps)); }); }
    });
    s.sets.forEach(x => {
      sets++;
      if (kind === "weight") {
        vol += num(x.kg) * num(x.reps);
        const v = e1rm(x.kg, x.reps);
        if (hadPrev && v > 0 && v > best + 0.01) prs++;
        best = Math.max(best, v);
      }
      if (kind === "cardio") { cMin += num(x.min); cKm += num(x.km); }
    });
  });
  log.sets = sets;
  log.volume = Math.round(vol);
  log.cardioMin = round1(cMin);
  log.cardioKm = Math.round(cKm * 100) / 100;
  log.prs = prs;
}
