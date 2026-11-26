// ============================================================================
// v77 — AYLIK / YILLIK ÖZET (isteğe bağlı, düğmeyle açılır)
// Dönem: bu ay, geçen ay, bu yıl, geçen yıl. Antrenman, süre, set, tonaj, kardiyo, rekor,
// en uzun haftalık seri, en çok yapılan hareketler, en çok çalışılan kaslar (3D harita),
// mobilite, beslenme ortalaması, kilo değişimi. Yalnız okur; kayıt değişmez.
// Giriş: İlerleme → Genel "Aylık / yıllık özet" ve takvim penceresi.
// ============================================================================
let recapPeriod = "month";
const RECAP_PERIODS = ["month", "lastMonth", "year", "lastYear"];

function recapRange(p) {
  const now = logicalNow(), y = now.getFullYear(), m = now.getMonth();
  if (p === "lastMonth") { const a = new Date(y, m - 1, 1), b = new Date(y, m, 1); return { a: a.getTime(), b: b.getTime(), label: fmtDay(a, { month: "long", year: "numeric" }) }; }
  if (p === "year") return { a: new Date(y, 0, 1).getTime(), b: new Date(y + 1, 0, 1).getTime(), label: String(y) };
  if (p === "lastYear") return { a: new Date(y - 1, 0, 1).getTime(), b: new Date(y, 0, 1).getTime(), label: String(y - 1) };
  const a = new Date(y, m, 1);
  return { a: a.getTime(), b: new Date(y, m + 1, 1).getTime(), label: fmtDay(a, { month: "long", year: "numeric" }) };
}
function recapPeriodL(p) { return p === "lastMonth" ? t("Geçen ay") : p === "year" ? t("Bu yıl") : p === "lastYear" ? t("Geçen yıl") : t("Bu ay"); }

function recapData(p) {
  const { a, b, label } = recapRange(p);
  const inR = ts => ts >= a && ts < b;
  const keyIn = k => { const ts = new Date(k + "T12:00:00").getTime(); return inR(ts); };
  const logs = state.workoutLogs.filter(l => l && l.ts && inR(l.ts));
  const r = { label, a, b, n: logs.length, min: 0, sets: 0, vol: 0, cMin: 0, cKm: 0, prs: 0, days: 0, streak: 0, ex: [], mus: {}, mob: 0, nut: null, w: null };
  const days = new Set();
  logs.forEach(l => { r.min += num(l.durationMin); r.sets += num(l.sets); r.vol += num(l.volume); r.cMin += num(l.cardioMin); r.cKm += num(l.cardioKm); r.prs += num(l.prs); days.add(todayStr(new Date(l.ts))); });
  r.days = days.size;
  // en uzun haftalık seri (art arda en az bir antrenmanlı hafta, Pazartesi başlangıç)
  const wk = ts => { const d = new Date(ts); d.setHours(12, 0, 0, 0); const dow = (d.getDay() + 6) % 7; return Math.round((d.getTime() - dow * DAY_MS) / (7 * DAY_MS)); };
  const weeks = [...new Set(logs.map(l => wk(l.ts)))].sort((x, y) => x - y);
  let run = 0, prev = null;
  weeks.forEach(w => { run = prev != null && w === prev + 1 ? run + 1 : 1; prev = w; r.streak = Math.max(r.streak, run); });
  // hareketler ve kaslar (dönemdeki oturumlardan; yardımcı kaslar yarım set)
  const exCount = {};
  MUSCLES.forEach(m => { r.mus[m] = 0; });
  Object.keys(state.exerciseHistory || {}).forEach(k => (state.exerciseHistory[k] || []).forEach(s => {
    if (!isObj(s) || !inR(num(s.ts, 0))) return;
    const name = s.name || k;
    const e = exCount[k] || (exCount[k] = { name, n: 0, sets: 0 });
    e.n++; e.sets += Array.isArray(s.sets) ? s.sets.length : 0;
    if (s.kind !== "cardio" && Array.isArray(s.sets)) addMuscleSets(r.mus, libMuscleHint(name) || autoMuscle(name), name, s.sets.length);
  }));
  r.ex = Object.values(exCount).sort((x, y) => y.n - x.n || y.sets - x.sets).slice(0, 3);
  r.mob = Object.keys(state.mobilityLog || {}).filter(k => keyIn(k) && (state.mobilityLog[k] || []).length).length;
  // beslenme: kaydı olan günlerin ortalaması ve hedefi tutturduğu gün (v82: İlerleme ile aynı kural — kalori hitClass, protein ≥ %95)
  const nd = Object.keys(state.dailyLogs || {}).filter(keyIn).map(k => state.dailyLogs[k]).filter(d => isObj(d) && num(d.eatenKcal) > 0);
  if (nd.length) {
    const hit = nd.filter(d => hitClass(num(d.eatenKcal), num(d.calTarget)) === "ok").length;
    const pro = nd.filter(d => num(d.proTarget) > 0 && num(d.eatenP) >= num(d.proTarget) * 0.95).length;
    r.nut = { days: nd.length, kcal: Math.round(nd.reduce((s, d) => s + num(d.eatenKcal), 0) / nd.length), p: Math.round(nd.reduce((s, d) => s + num(d.eatenP), 0) / nd.length), hit, pro };
  }
  const wl = (state.weightLogs || []).filter(x => x && x.ts && inR(x.ts) && num(x.weight) > 0).sort((x, y) => x.ts - y.ts);
  if (wl.length >= 2) r.w = { from: num(wl[0].weight), to: num(wl[wl.length - 1].weight) };
  return r;
}

function openRecap(p) {
  recapPeriod = RECAP_PERIODS.includes(p) ? p : "month";
  renderRecap();
  openModal("recapModal");
  if (typeof animRecapIn === "function") animRecapIn();   /* v80 ANİM: özet */
}
function setRecapPeriod(p) { recapPeriod = RECAP_PERIODS.includes(p) ? p : "month"; renderRecap(); if (typeof animRecapIn === "function") animRecapIn(); }   /* v80 ANİM: özet */
let recapMapGen = 0;
function renderRecap() {
  const body = $("recapBody");
  if (!body) return;
  const r = recapData(recapPeriod);
  const firstTs = state.workoutLogs.reduce((m, l) => l && l.ts ? Math.min(m, l.ts) : m, Infinity);
  const avail = RECAP_PERIODS.filter(p => p === "month" || p === "year" || recapRange(p).b > firstTs);
  const chip = p => `<button onclick="setRecapPeriod('${p}')" data-recap-p="${p}" aria-pressed="${recapPeriod === p}" class="shrink-0 min-h-[44px] px-4 rounded-full text-[13px] ${recapPeriod === p ? "bg-[var(--t-text)] text-[var(--t-bg)] font-bold" : "bg-[var(--t-elev)] text-[var(--t-text2)] font-semibold"}">${recapPeriodL(p)}</button>`;
  const tile = (v, label, key) => `<div class="rounded-2xl bg-[var(--t-elev0)] px-3 py-2.5" data-recap-${key}><div class="t-display text-[26px] leading-none">${v}</div><div class="text-[12px] t-muted mt-1">${label}</div></div>`;
  const hours = r.min / 60;
  const volTxt = isImperial() ? fmtNum(round1(wRaw(r.vol) / 1000)) : fmtNum(round1(r.vol / 1000));
  const topMus = MUSCLES.filter(m => r.mus[m] > 0).sort((x, y) => r.mus[y] - r.mus[x]);
  const maxM = topMus.length ? r.mus[topMus[0]] : 0;
  const head = `<div class="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">${avail.map(chip).join("")}</div>
    <div class="text-[22px] font-extrabold" data-recap-title>${esc(r.label)}</div>`;
  if (!r.n && !r.mob && !r.nut) {
    body.innerHTML = head + `<p class="text-sm t-muted py-6 text-center">${t("Bu dönemde kayıt yok. Antrenman, mobilite ve beslenme kaydettikçe özetin burada birikir.")}</p>`;
    return;
  }
  const exRows = r.ex.map((e, i) => `<li class="flex items-center gap-3 min-h-[44px]"><span class="t-display text-[20px] t-dim w-5">${i + 1}</span><span class="flex-1 min-w-0 truncate text-[15px] font-semibold">${esc(exNameL(e.name))}</span><span class="text-[13px] t-muted shrink-0">${tn(e.n, "{n} kez")}</span></li>`).join("");
  const musRows = topMus.slice(0, 5).map(m => `<li class="flex items-center gap-2.5 min-h-[32px]"><span class="w-[120px] shrink-0 text-[13px] truncate">${esc(muscleL(m))}</span><span class="relative flex-1 h-2.5 rounded-full bg-[var(--t-elev)] overflow-hidden"><span class="absolute inset-y-0 left-0 rounded-full" style="width:${(r.mus[m] / maxM * 100).toFixed(1)}%;background:var(--d-tq)"></span></span><span class="w-12 text-right text-[13px] font-bold">${fmtNum(r.mus[m])}</span></li>`).join("");
  const sec = (title, inner, key) => `<section class="rounded-[18px] bg-[var(--t-elev0)] p-3.5 space-y-2" data-recap-${key}><div class="t-label">${title}</div>${inner}</section>`;
  body.innerHTML = head + `
    <div class="grid grid-cols-3 gap-2">
      ${tile(r.n, tn(r.n, "antrenman|takvim"), "n")}
      ${tile(fmtNum(round1(hours)), t("saat"), "h")}
      ${tile(r.sets, tn(r.sets, "set|takvim"), "sets")}
      ${tile(volTxt, isImperial() ? t("bin lb") : t("ton"), "vol")}
      ${tile(r.prs, tn(r.prs, "rekor|özet"), "prs")}
      ${tile(r.streak, tn(r.streak, "hafta seri"), "streak")}
    </div>
    ${r.cMin > 0 ? `<p class="text-[13px] t-muted" data-recap-cardio>${t("Kardiyo: {m} dk", { m: Math.round(r.cMin) })}${r.cKm > 0 ? " · " + fmtNum(round1(r.cKm)) + " km" : ""}</p>` : ""}
    ${exRows ? sec(t("EN ÇOK YAPTIĞIN HAREKETLER"), `<ol>${exRows}</ol>`, "ex") : ""}
    ${musRows ? sec(t("EN ÇOK ÇALIŞAN KASLAR"), `<div class="flex justify-center"><canvas id="recapMap" class="max-w-full" style="height:150px" role="img" aria-label="${esc(t("Kas haritası. Çalışan kaslar: {m}", { m: topMus.map(muscleL).join(", ") }))}"></canvas></div><ul>${musRows}</ul><p class="text-[12px] t-dim">${t("Set sayısı; yardımcı kaslara yarım set sayılır.")}</p>`, "mus") : ""}
    ${r.mob ? sec(t("MOBİLİTE"), `<p class="text-[15px]">${tn(r.mob, "{n} gün esneme / mobilite")}</p>`, "mob") : ""}
    ${r.nut ? sec(t("BESLENME"), `<p class="text-[15px]">${t("Ortalama {k} kcal · {p} g protein", { k: r.nut.kcal.toLocaleString(locale()), p: r.nut.p })}</p><p class="text-[13px] t-muted">${t("Kayıtlı {d} günün {h} gününde kalori hedefine (±%5), {pr} gününde protein hedefine ulaştın.", { d: r.nut.days, h: r.nut.hit, pr: r.nut.pro })}</p>`, "nut") : ""}
    ${r.w ? sec(t("KİLO"), `<p class="text-[15px]">${esc(fmtW(r.w.from, { body: true }))} → ${esc(fmtW(r.w.to, { body: true }))} <span class="t-muted">(${r.w.to - r.w.from > 0 ? "+" : ""}${esc(fmtW(r.w.to - r.w.from, { body: true }))})</span></p>`, "w") : ""}`;
  if (musRows) drawRecapMap(r.mus, maxM);
}
async function drawRecapMap(mus, maxM) {
  const gen = ++recapMapGen;
  const levels = {};
  MUSCLES.forEach(m => { if (mus[m] > 0) levels[m] = 0.25 + 0.75 * mus[m] / maxM; });
  let map = null;
  try { map = await paintMuscleMap3d(mus, { theme: themeIsLight() ? "light" : "dark", levels }); } catch (e) { map = null; }
  const cv = $("recapMap");
  if (gen !== recapMapGen || !cv) return;
  if (!map) { cv.remove(); return; }
  const H = Math.round(150 * Math.min(3, window.devicePixelRatio || 1)), W = Math.round(H * map.width / map.height);
  cv.width = W; cv.height = H;
  /* v80 ANİM: kas haritası — özet açılınca kaslar sırayla yanar */
  try { if (typeof animFinishMap === "function" && await animFinishMap(mus, themeIsLight() ? "light" : "dark", cv, map)) return; } catch (e) { /* son hâl aşağıda */ }
  try { cv.getContext("2d").drawImage(map, 0, 0, W, H); } catch (e) { /* tuval belleği: boş kalır */ }
}
