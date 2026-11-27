// ============================================================================
// v85 — KENDİ MAKRO HEDEFİM (Profil → Kilom ve hedeflerim → "KENDİ HEDEFİM")
// settings.manualTarget = { on, kcal, p, c, f } (normManualTarget). Açıkken getTargets() bu değerleri döner (iki gün
// tipinde aynı; karb/yağ boşsa otomatik). Koç öneri yapmaz. Alanlar kutudan çıkınca kaydedilir; geçersiz değer yazılmaz.
// ============================================================================
function fillManualFields() {
  const m = state.settings.manualTarget || {};
  $("manOn").checked = !!m.on;
  [["manKcal", m.kcal], ["manP", m.p], ["manC", m.c], ["manF", m.f]].forEach(([id, v]) => { if (document.activeElement !== $(id)) $(id).value = v > 0 ? String(v) : ""; });
  renderManualNote();
}
function manualTargetChanged() {
  const rd = id => { const v = String($(id).value || "").trim(); return v === "" ? 0 : num(v, NaN); };
  const kcal = rd("manKcal"), p = rd("manP"), c = rd("manC"), f = rd("manF");
  const ok = (v, lo, hi) => v === 0 || (isFinite(v) && v >= lo && v <= hi);
  const prev = clone(state.settings.manualTarget || {});
  const next = {
    on: $("manOn").checked,
    kcal: ok(kcal, 800, 6000) ? Math.round(kcal) : num(prev.kcal, 0),
    p: ok(p, 1, 500) ? Math.round(p) : num(prev.p, 0),
    c: ok(c, 1, 1000) ? Math.round(c) : num(prev.c, 0),
    f: ok(f, 1, 400) ? Math.round(f) : num(prev.f, 0)
  };
  const bad = !ok(kcal, 800, 6000) || !ok(p, 1, 500) || !ok(c, 1, 1000) || !ok(f, 1, 400);
  state.settings.manualTarget = normManualTarget(next);
  renderAll();
  renderManualNote(bad);
  if (bad) toast(t("Değer aralık dışında: kalori 800–6000, protein 1–500 g, karb 1–1000 g, yağ 1–400 g."), "error");
}
function renderManualNote(bad) {
  const m = state.settings.manualTarget || {};
  const want = $("manOn").checked;
  $("manBox").classList.toggle("hidden", !want);
  const el = $("manNote");
  if (!want) { el.textContent = ""; return; }
  if (!(m.on && m.kcal > 0 && m.p > 0)) { el.textContent = t("Kalori ve proteini yazınca hedefin bu değerlere geçer."); return; }
  const tg = getTargets();
  let s = t("Geçerli hedef: {k} kcal · protein {p} g · karb {c} g · yağ {f} g", { k: fmtInt(tg.calTarget), p: String(tg.proTarget), c: String(tg.carbTarget), f: String(tg.fatTarget) });
  const sum = tg.proTarget * 4 + tg.carbTarget * 4 + tg.fatTarget * 9;
  if (m.c > 0 && m.f > 0 && Math.abs(sum - tg.calTarget) > tg.calTarget * 0.1) s += " · " + t("Makroların toplamı {n} kcal ediyor; kalori hedefinle uyuşmuyor.", { n: fmtInt(sum) });
  else if (tg.macroOver > 0) s += " · " + t("Protein ve yağ kalorinin tamamını dolduruyor; karbonhidrata yer kalmadı.");
  if (tg.belowFloor) s += " · " + t("Bu kalori önerilen alt sınırın ({n} kcal) altında; bir uzmanın verdiği hedef değilse dikkat et.", { n: fmtInt(tg.floor) });
  el.textContent = s;
}
