// ============================================================================
// v76 — ANTRENMAN TAKVİMİ (isteğe bağlı, düğmeyle açılır)
// Ay ay gezilen takvim: gün rengi o günkü set sayısına göre (az / orta / çok), mobilite alt çizgi.
// Güne dokununca o günün antrenmanları (hareketler, set, tonaj, süre, rekor) ve mobilitesi.
// Giriş: Antrenman → Geçmiş "Takvim" düğmesi ve İlerleme → Güç takvim kartındaki "Tüm takvim".
// Yalnız okur; kayıt değişmez.
// ============================================================================
let calView = { y: 0, m: 0, sel: null };

function calDayStats() {   // { "YYYY-AA-GG": { n, sets, vol, logs: [index] } }
  const m = {};
  state.workoutLogs.forEach((l, i) => {
    if (!l || !l.ts) return;
    const k = todayStr(new Date(l.ts));
    const d = m[k] || (m[k] = { n: 0, sets: 0, vol: 0, logs: [] });
    d.n++; d.sets += num(l.sets); d.vol += num(l.volume); d.logs.push(i);
  });
  return m;
}
function calLevel(d) { if (!d) return 0; return d.sets >= 20 ? 3 : d.sets >= 10 ? 2 : 1; }

function openWorkoutCalendar() {
  const now = logicalNow();
  calView = { y: now.getFullYear(), m: now.getMonth(), sel: null };
  renderCalendar();
  openModal("calModal");
}
function calMove(dir) {
  let { y, m } = calView;
  m += dir;
  if (m < 0) { m = 11; y--; } else if (m > 11) { m = 0; y++; }
  const now = logicalNow();
  if (y > now.getFullYear() || (y === now.getFullYear() && m > now.getMonth())) return;
  calView = { y, m, sel: null };
  renderCalendar();
  if (typeof animCalSlide === "function") animCalSlide(dir);   /* v80 ANİM: takvim ay geçişi */
}
function calSelect(k) { calView.sel = calView.sel === k ? null : k; renderCalendar(); }

function renderCalendar() {
  const body = $("calBody");
  if (!body) return;
  const st = calDayStats(), mob = progMobDays();
  const { y, m } = calView;
  const first = new Date(y, m, 1, 12), days = new Date(y, m + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;   // Pazartesi başlangıç
  const tKey = todayStr(logicalNow());
  const now = logicalNow(), isNow = y === now.getFullYear() && m === now.getMonth();
  // v82: geri gitme antrenman VE mobilite kayıtlarına bakar (yalnız mobilite yapılan aya da gidilebilsin)
  const firstKey = todayStr(first);
  const canBack = Object.keys(st).some(k => k < firstKey) || Object.keys(mob).some(k => k < firstKey);
  let grid = dayShort().map(d => `<div class="p-cal-h">${d}</div>`).join("");
  for (let i = 0; i < lead; i++) grid += `<div></div>`;
  let mN = 0, mSets = 0, mVol = 0, mMob = 0;
  for (let d = 1; d <= days; d++) {
    const dt = new Date(y, m, d, 12), k = todayStr(dt), s = st[k], lv = calLevel(s), fut = k > tKey;
    if (s) { mN += s.n; mSets += s.sets; mVol += s.vol; }
    if (mob[k]) mMob++;
    const aria = `${d} ${fmtDay(dt, { month: "long" })}${s ? ", " + tn(s.n, "{n} antrenman") + ", " + tn(s.sets, "{n} set") : ""}${mob[k] ? t(", mobilite") : ""}`;
    grid += `<button ${fut ? "disabled" : `onclick="calSelect('${k}')"`} data-cal-day="${k}" data-lv="${lv}" aria-label="${esc(aria)}" aria-pressed="${calView.sel === k}" class="p-cal-d cal-l${lv} ${fut ? "fut" : ""} ${k === tKey ? "today" : ""} ${calView.sel === k ? "cal-sel" : ""}"><span>${d}</span>${mob[k] ? "<u></u>" : ""}</button>`;
  }
  const yearN = state.workoutLogs.filter(l => l && l.ts && new Date(l.ts).getFullYear() === y).length;
  const navBtn = (dir, ok, label, path) => `<button onclick="calMove(${dir})" ${ok ? "" : "disabled"} aria-label="${label}" class="w-11 h-11 rounded-xl bg-[var(--t-elev)] flex items-center justify-center ${ok ? "" : "opacity-30"}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg></button>`;
  const monthTitle = fmtDay(first, { month: "long", year: "numeric" });
  let detail = "";
  if (calView.sel) {
    const s = st[calView.sel], dt = new Date(calView.sel + "T12:00:00");
    const logs = s ? s.logs.map(i => ({ i, l: state.workoutLogs[i] })) : [];
    const rows = logs.map(({ i, l }) => {
      const lines = logExerciseLines(l).map(x => `<li class="flex justify-between gap-3"><span class="truncate">${esc(x.name)}</span><span class="t-muted shrink-0">${esc(x.txt)}</span></li>`).join("");
      const meta = [tn(num(l.sets), "{n} set"), num(l.volume) ? (isImperial() ? Math.round(wRaw(num(l.volume))).toLocaleString(locale()) : num(l.volume).toLocaleString(locale())) + " " + wUnit() : "", num(l.durationMin) ? fmtMinutes(num(l.durationMin)) : "", num(l.prs) ? tn(num(l.prs), "{n} rekor") : ""].filter(Boolean).join(" · ");
      return `<div class="rounded-2xl bg-[var(--t-elev0)] p-3 space-y-2" data-cal-log>
        <div class="flex items-start justify-between gap-2"><span class="flex flex-col"><span class="text-[15px] font-bold">${esc(l.dayName || t("Antrenman"))}</span><span class="text-xs t-muted">${esc(fmtDate(l.ts, true))} · ${meta}</span></span>
          <button onclick="closeModal('calModal'); openShareCard(${i})" aria-label="${t("Paylaş")}" class="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center t-muted">${svgI("share", 20)}</button></div>
        ${lines ? `<ul class="text-[13px] space-y-1">${lines}</ul>` : ""}</div>`;
    }).join("");
    const mobN = (state.mobilityLog[calView.sel] || []).length;
    detail = `<div class="space-y-2" data-cal-detail>
      <div class="text-[15px] font-bold pt-1">${esc(fmtDay(dt, { day: "numeric", month: "long", weekday: "long" }))}</div>
      ${rows || `<p class="text-sm t-muted">${t("Bu gün antrenman kaydı yok.")}</p>`}
      ${mobN ? `<p class="text-[13px]" style="color:var(--d-lv)">${tn(mobN, "Mobilite: {n} hareket")}</p>` : ""}</div>`;
  }
  body.innerHTML = `
    <div class="flex items-center justify-between gap-2">
      ${navBtn(-1, canBack, t("Önceki ay"), "M15 6l-6 6 6 6")}
      <span class="text-[17px] font-bold" data-cal-title>${esc(monthTitle)}</span>
      ${navBtn(1, !isNow, t("Sonraki ay"), "M9 6l6 6-6 6")}
    </div>
    <div class="grid grid-cols-3 gap-2 text-center" data-cal-sum>
      <div class="rounded-2xl bg-[var(--t-elev0)] py-2"><div class="t-display text-[22px]">${mN}</div><div class="text-[12px] t-muted">${tn(mN, "antrenman|takvim")}</div></div>
      <div class="rounded-2xl bg-[var(--t-elev0)] py-2"><div class="t-display text-[22px]">${mSets}</div><div class="text-[12px] t-muted">${tn(mSets, "set|takvim")}</div></div>
      <div class="rounded-2xl bg-[var(--t-elev0)] py-2"><div class="t-display text-[22px]">${mMob}</div><div class="text-[12px] t-muted">${t("mobilite günü")}</div></div>
    </div>
    <div class="p-cal cal-grid">${grid}</div>
    ${pLegend([[`<i class="cal-lg cal-l1"></i>`, t("1–9 set")], [`<i class="cal-lg cal-l2"></i>`, t("10–19 set")], [`<i class="cal-lg cal-l3"></i>`, t("20+ set")], [`<i class="p-lg-m"></i>`, t("Mobilite")]])}
    <button onclick="closeModal('calModal'); openRecap('${isNow ? "month" : "year"}')" data-open-recap class="t-btn-ghost w-full h-11 rounded-xl text-sm">${t("Aylık / yıllık özet")}</button>
    <p class="text-[12px] t-dim">${tn(yearN, "{y} yılında {n} antrenman", { y: String(y) })} · ${t("Ayrıntı için bir güne dokun.")}</p>
    ${detail}`;
}
