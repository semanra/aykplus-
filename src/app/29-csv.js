
// ============================================================================
// v61: TABLOYA AKTAR (CSV) — Profil → Veri ve yedekleme
// Excel / Numbers / Google E-Tablolar için üç dosya: antrenman (her set bir satır), kilo ve ölçüler, beslenme (gün özeti).
// Yedek yerine geçmez (geri yüklenemez). Türkçede ayırıcı ";" ve ondalık virgül (Türkçe Excel böyle bekler),
// İngilizcede "," ve nokta. Kilo / ölçü o anki birimde (kg ya da lb, cm ya da in). Başta BOM: Excel Türkçe harfleri doğru okur.
// Kullanıcı metni "=", "+", "-", "@" ile başlıyorsa başına ' eklenir (tablo formülü olarak çalışmasın).
// ============================================================================
function csvSep() { return curLang() === "en" ? "," : ";"; }
function csvNum(v, dec = 2) {
  const n = Number(v);
  if (!isFinite(n)) return "";
  const s = String(Math.round(n * Math.pow(10, dec)) / Math.pow(10, dec));
  return curLang() === "en" ? s : s.replace(".", ",");
}
function csvText(v) {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return s;
}
function csvCell(v) {
  const s = typeof v === "number" ? csvNum(v) : csvText(v);
  return s.includes(csvSep()) || /["\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function csvBuild(head, rows) {
  const sep = csvSep();
  return String.fromCharCode(0xFEFF) + [head, ...rows].map(r => r.map(csvCell).join(sep)).join("\r\n") + "\r\n";
}
function csvDate(ts) { return ts ? todayStr(new Date(ts)) : ""; }
function csvTime(ts) { if (!ts) return ""; const d = new Date(ts); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }

// Antrenman: her tamamlanan set bir satır
function csvWorkouts() {
  const dayOf = {};
  (state.workoutLogs || []).forEach(l => { if (l && l.id) dayOf[l.id] = l.dayName || ""; });
  const sess = [];
  Object.values(state.exerciseHistory || {}).forEach(arr => (Array.isArray(arr) ? arr : []).forEach(s => { if (isObj(s) && Array.isArray(s.sets)) sess.push(s); }));
  sess.sort((a, b) => num(a.ts) - num(b.ts) || String(a.name).localeCompare(String(b.name)));
  const head = [t("Tarih"), t("Saat"), t("Antrenman günü|sütun"), t("Hareket"), t("Kas grubu"), t("Set|sütun"), wTxt(t("Kilo (kg)")), t("Tekrar"), t("Zorluk"), t("Süre (sn)"), t("Kardiyo (dk)"), t("Mesafe (km)"), t("Seviye")];
  const rows = [];
  sess.forEach(s => s.sets.forEach((x, i) => {
    if (!isObj(x)) return;
    const kind = s.kind || "weight";
    rows.push([csvDate(s.ts), csvTime(s.ts), dayOf[s.logId] || "", exNameL(String(s.name || "")), s.muscle ? muscleL(s.muscle) : "", i + 1,
      kind === "weight" ? kgToDisp(num(x.kg)) : "", kind === "weight" ? num(x.reps) : "",
      kind === "weight" && EFFORT_LABELS[x.e] ? effortL(x.e) : "",
      kind === "time" ? num(x.sec) : "", kind === "cardio" ? num(x.min) : "", kind === "cardio" && num(x.km) > 0 ? num(x.km) : "",
      kind === "cardio" ? (x.lvl || "") : ""]);
  }));
  return { head, rows };
}

// Kilo ve ölçüler: aynı gün tek satır (tartı + ölçü)
function csvBody() {
  const by = {};
  const row = k => by[k] || (by[k] = { date: k, w: "", m: {} });
  (state.weightLogs || []).filter(l => num(l.weight) > 0).forEach(l => { const k = l.ts ? csvDate(l.ts) : String(l.date || ""); if (k) row(k).w = bodyKgToDisp(num(l.weight)); });
  (state.measurements || []).forEach(m => { const k = csvDate(m.ts); if (!k) return; MEASURES.forEach(([id]) => { if (num(m[id]) > 0) row(k).m[id] = cmToDisp(num(m[id])); }); });
  const keys = Object.keys(by).sort();
  const head = [t("Tarih"), wTxt(t("Kilo (kg)")), ...MEASURES.map(([, l]) => lenTxt(t(l) + " (cm)"))];
  const rows = keys.map(k => [k, by[k].w === "" ? "" : by[k].w, ...MEASURES.map(([id]) => by[k].m[id] != null ? by[k].m[id] : "")]);
  return { head, rows };
}

// Beslenme: gün sonu özetleri (dailyLogs)
function csvNutrition() {
  const logs = state.dailyLogs || {};
  const head = [t("Tarih"), t("Gün tipi"), t("Yenen kalori (kcal)"), t("Yenen protein (g)"), t("Hedef kalori (kcal)"), t("Hedef protein (g)"), t("Su (L)"), t("Yenen öğün"), t("Toplam öğün"), t("Alınan takviye")];
  const rows = Object.keys(logs).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k) && isObj(logs[k])).sort().map(k => {
    const d = logs[k];
    const dt = d.dayType === "rest" ? t("Dinlenme günü") : d.dayType === "train" ? t("Antrenman günü") : "";
    const v = x => (x == null || x === "" || !isFinite(Number(x))) ? "" : Number(x);
    return [k, dt, v(d.eatenKcal), v(d.eatenP), v(d.calTarget != null ? d.calTarget : d.kcal), v(d.proTarget != null ? d.proTarget : d.p), v(d.water), v(d.mealsDone), v(d.mealsTotal), v(d.supps)];
  });
  return { head, rows };
}

const CSV_KINDS = {
  workouts: [csvWorkouts, "AYK-antrenman-{d}.csv"],
  body: [csvBody, "AYK-kilo-olcu-{d}.csv"],
  nutrition: [csvNutrition, "AYK-beslenme-{d}.csv"],
};
async function exportCsv(kind) {
  const k = CSV_KINDS[kind];
  if (!k) return;
  const { head, rows } = k[0]();
  if (!rows.length) { toast(t("Bu bölümde henüz kayıt yok")); return; }
  const r = await saveTextFile(csvBuild(head, rows), t(k[1], { d: todayStr() }), t("AYK+ tablo"), "text/csv");
  if (r === "shared" || r === "downloaded") toast(tn(rows.length, "Tablo hazır · {n} satır"));
  else if (r === "failed") toast(t("Dosya oluşturulamadı"), "error");
}

Object.assign(EN, {
  "Tabloya aktar (CSV)": "Export to spreadsheet (CSV)",
  "Excel, Numbers ya da Google E-Tablolar'da açılır. Yedek yerine geçmez; geri yüklenemez.": "Opens in Excel, Numbers or Google Sheets. Not a backup; it can't be restored.",
  "Kilo ve ölçü": "Weight and sizes",
  "Tarih": "Date", "Saat": "Time", "Antrenman günü|sütun": "Workout day", "Hareket": "Exercise", "Kas grubu": "Muscle group", "Set|sütun": "Set",
  "Kilo (kg)": "Weight (kg)", "Tekrar": "Reps", "Zorluk": "Effort", "Kardiyo (dk)": "Cardio (min)", "Mesafe (km)": "Distance (km)", "Seviye": "Level",
  "Gün tipi": "Day type", "Yenen kalori (kcal)": "Calories eaten (kcal)", "Yenen protein (g)": "Protein eaten (g)", "Hedef kalori (kcal)": "Calorie target (kcal)",
  "Hedef protein (g)": "Protein target (g)", "Su (L)": "Water (L)", "Yenen öğün": "Meals eaten", "Toplam öğün": "Total meals", "Alınan takviye": "Supplements taken",
  "Dinlenme günü": "Rest day",
  "AYK-antrenman-{d}.csv": "AYK-workouts-{d}.csv", "AYK-kilo-olcu-{d}.csv": "AYK-weight-sizes-{d}.csv", "AYK-beslenme-{d}.csv": "AYK-nutrition-{d}.csv",
  "AYK+ tablo": "AYK+ spreadsheet",
  "Bu bölümde henüz kayıt yok": "Nothing recorded here yet",
  "Tablo hazır · {n} satır": { one: "Spreadsheet ready · {n} row", other: "Spreadsheet ready · {n} rows" },
  "Dosya oluşturulamadı": "Couldn't create the file",
});
