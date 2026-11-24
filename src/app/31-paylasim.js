// v67: paylaşım kartı kodu 09-kas-plaka-koc-takviye.js'den buraya taşındı (içerik aynı).
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
    if (sess.kind === "cardio") { const ct = cardioTotals(sess.sets, false); txt = t("{m} dk", { m: ct.min }) + (ct.km > 0 ? ` • ${fmtNum(ct.km)} km` : ""); }
    else if (sess.kind === "time") txt = t("{c} × {s} sn|kart", { c: String(sess.sets.length), s: String(Math.max(...sess.sets.map(s => num(s.sec)))) });
    else {
      const best = sess.sets.reduce((b, s) => (e1rm(s.kg, s.reps) > e1rm(b.kg, b.reps) ? s : b), sess.sets[0]);
      txt = num(best.kg) > 0 ? tn(sess.sets.length, "{n} set • en iyi {kg}×{r}", { kg: fmtWNum(num(best.kg)), r: String(num(best.reps)) }) : tn(sess.sets.length, "{n} set • {r} tekrar", { r: String(num(best.reps)) });
    }
    out.push({ name: exNameL(sess.name || k), txt, order: out.length, key: k, sess });   // v67: key/sess paylaşım verisi için
  }));
  return out;
}

function fitText(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(s + "…").width > maxW) s = s.slice(0, -1);
  return s + "…";
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

async function buildShareCanvas(log) {
  // v33: uygulamanın Antrenman temasıyla aynı dil (siyah zemin, turkuaz vurgu, AYKDisplay başlık, emojisiz). Paylaşılan görsel her zaman koyu.
  const W = 1080, H = 1350, ACC = "#1FD1C1";
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");
  const F = '-apple-system, "SF Pro Display", "Segoe UI", Roboto, sans-serif';
  const D = 'italic 800 {s}px AYKDisplay, "Barlow Condensed", ' + F;
  const disp = s => D.replace("{s}", s);
  try { await document.fonts.load(disp(64)); } catch (e) { /* yazı tipi yüklenemezse yedek yazı tipi */ }

  ctx.fillStyle = "#000000"; ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W - 140, 140, 10, W - 140, 140, 560);
  glow.addColorStop(0, "rgba(31,209,193,0.22)"); glow.addColorStop(1, "rgba(31,209,193,0)");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

  try {
    const img = new Image();
    img.src = "icon.png";
    await img.decode();
    ctx.save(); roundRect(ctx, 72, 72, 112, 112, 28); ctx.clip(); ctx.drawImage(img, 72, 72, 112, 112); ctx.restore();
  } catch (e) { /* logo yüklenemezse atla */ }
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#FFFFFF"; ctx.font = disp(72); ctx.fillText("AYK", 212, 130);
  const aw = ctx.measureText("AYK").width;
  ctx.fillStyle = ACC; ctx.fillText("+", 212 + aw + 2, 130);
  ctx.fillStyle = "#A1A1AA"; ctx.font = `500 32px ${F}`; ctx.textAlign = "right";
  ctx.fillText(log.ts ? fmtDay(new Date(log.ts), { day: "numeric", month: "long", year: "numeric" }) : (log.date || ""), W - 72, 130);
  ctx.textAlign = "left";

  ctx.fillStyle = ACC; ctx.font = `700 32px ${F}`; ctx.fillText(t("Antrenman tamamlandı"), 72, 286);
  ctx.fillStyle = "#FFFFFF"; ctx.font = disp(104); ctx.fillText(fitText(ctx, upperL(log.dayName || t("Antrenman|kart")), W - 144), 68, 372);

  const stats = [];
  if (num(log.durationMin) > 0) stats.push([t("Süre|kart"), fmtMinutes(num(log.durationMin)), "#FFFFFF"]);
  stats.push([t("Tonaj|kart"), Math.round(wRaw(num(log.volume))).toLocaleString(locale()) + " " + wUnit(), "#FFFFFF"]);
  if (num(log.prs) > 0) stats.push([t("Rekor|kart"), String(num(log.prs)), ACC]);
  if (num(log.cardioMin) > 0) stats.push([t("Kardiyo|kart"), t("{m} dk", { m: num(log.cardioMin) }) + (num(log.cardioKm) > 0 ? " · " + fmtNum(num(log.cardioKm)) + " km" : ""), "#FFFFFF"]);
  stats.push([t("Set|kart"), String(num(log.sets)), "#FFFFFF"]);
  const exLines = logExerciseLines(log);
  if (exLines.length) stats.push([t("Hareket|kart"), String(exLines.length), "#FFFFFF"]);
  const shown = stats.slice(0, 4);
  const cardW = (W - 144 - 24) / 2, cardH = 184;
  shown.forEach((s, i) => {
    const x = 72 + (i % 2) * (cardW + 24), y = 452 + Math.floor(i / 2) * (cardH + 24);
    const w = (i === shown.length - 1 && shown.length % 2 === 1) ? W - 144 : cardW;
    ctx.fillStyle = "#141416"; roundRect(ctx, x, y, w, cardH, 36); ctx.fill();
    ctx.strokeStyle = "#2A2A2E"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "#A1A1AA"; ctx.font = `600 30px ${F}`; ctx.fillText(s[0], x + 36, y + 54);
    ctx.fillStyle = s[2]; ctx.font = disp(76); ctx.fillText(fitText(ctx, s[1], w - 72), x + 32, y + 126);
  });

  const lines = exLines.slice(0, 7);
  let y = 452 + Math.ceil(shown.length / 2) * (cardH + 24) + 44;
  if (lines.length) {
    ctx.fillStyle = "#8B8B93"; ctx.font = `700 28px ${F}`; ctx.fillText(t("Hareketler|kart"), 72, y); y += 56;
    lines.forEach(l => {
      ctx.fillStyle = "#E4E4E7"; ctx.font = `600 32px ${F}`;
      ctx.fillText(fitText(ctx, l.name, 560), 72, y);
      ctx.fillStyle = ACC; ctx.font = `600 28px ${F}`; ctx.textAlign = "right";
      ctx.fillText(fitText(ctx, l.txt, 380), W - 72, y);
      ctx.textAlign = "left";
      y += 52;
    });
  }
  ctx.fillStyle = "#52525B"; ctx.font = `500 26px ${F}`; ctx.textAlign = "center";
  ctx.fillText(t("AYK+ ile kaydedildi"), W / 2, H - 56);
  ctx.textAlign = "left";
  return cv;
}

async function openShareCard(logIdx) {
  const log = state.workoutLogs[logIdx];
  if (!log) return;
  $("chartTitle").textContent = t("Antrenman Özeti");
  $("chartBody").innerHTML = `<div class="text-xs text-[var(--w-muted)] text-center py-10">${t("Kart hazırlanıyor...")}</div>`;
  openModal("chartModal");
  try {
    const cv = await buildShareCanvas(log);
    const blob = await new Promise(res => cv.toBlob(res, "image/png"));
    if (!blob) throw new Error("blob");
    const name = `AYK-antrenman-${log.ts ? todayStr(new Date(log.ts)) : "ozet"}.png`;
    try { shareFile = new File([blob], name, { type: "image/png" }); } catch (e) { shareFile = blob; shareFile.name = name; }
    const url = URL.createObjectURL(blob);
    $("chartBody").innerHTML = `
      <img src="${url}" alt="${t("Antrenman özeti")}" class="w-full rounded-xl border border-[var(--w-line)]" />
      <button onclick="shareWorkoutCard()" class="w-full mt-3 w-btn text-sm font-semibold py-2.5 rounded-lg">${t("Paylaş / Fotoğraflara Kaydet")}</button>
      <p class="text-[12px] text-[var(--w-dim)] mt-2 text-center">${t("Paylaş menüsünden Instagram, WhatsApp veya \"Görüntüyü Kaydet\"i seçebilirsin.")}</p>`;
  } catch (e) {
    $("chartBody").innerHTML = `<div class="text-xs text-[var(--w-over)] text-center py-8">${t("Kart oluşturulamadı.")}</div>`;
  }
}

async function shareWorkoutCard() {
  if (!shareFile) return;
  const file = shareFile;
  if (navigator.canShare && file instanceof File && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: t("AYK+ Antrenman") }); return; }
    catch (e) { if (e && e.name === "AbortError") return; }
  }
  try {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url; a.download = file.name || "AYK-antrenman.png";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast(t("Görsel indirildi"));
  } catch (e) { toast(t("Paylaşılamadı. Görsele basılı tutup kaydedebilirsin."), "error"); }
}


// ============================================================================
// v67 — PAYLAŞIM VERİSİ (saf; hiçbir kaydı değiştirmez)
// ============================================================================
// İngilizce sıra eki: 1st, 2nd, 3rd, 4th … 11th–13th, 21st
function monthOrdinalEn(n) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return n + "th";
  return n + ({ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th");
}
function bestSetOf(sets) {
  return (sets || []).reduce((b, s) => (!b || e1rm(s.kg, s.reps) > e1rm(b.kg, b.reps) ? s : b), null);
}
// Bir ağırlık oturumu rekor mu: en iyi e1rm, aynı hareketin bu antrenmandan ÖNCEKİ bütün oturumlarını geçiyor mu
function sessionPr(key, sess, beforeTs) {
  if (sess.kind !== "weight") return null;
  const best = bestSetOf(sess.sets);
  if (!best || !(num(best.kg) > 0)) return null;
  const cur = e1rm(best.kg, best.reps);
  let prev = 0;
  (state.exerciseHistory[key] || []).forEach(o => {
    if (o === sess || o.kind !== "weight" || !(num(o.ts) < beforeTs)) return;
    (o.sets || []).forEach(s => { prev = Math.max(prev, e1rm(s.kg, s.reps)); });
  });
  if (!(prev > 0) || !(cur > prev)) return null;
  return { kg: num(best.kg), reps: num(best.reps), e1rm: cur, prev, pct: (cur - prev) / prev };
}
function shareData(log) {
  const ts = num(log.ts, Date.now());
  const lines = logExerciseLines(log);
  const muscles = {};
  lines.forEach(l => {
    if (l.sess.kind === "cardio") return;
    const g = l.sess.muscle && MUSCLES.includes(l.sess.muscle) ? l.sess.muscle : autoMuscle(l.sess.name || l.key);
    if (g) muscles[g] = (muscles[g] || 0) + (l.sess.sets || []).length;
  });
  const prOk = num(log.prs) > 0;
  const prs = [];
  const rows = lines.map(l => {
    const pr = prOk ? sessionPr(l.key, l.sess, ts) : null;
    if (pr) prs.push(Object.assign({ name: l.name }, pr));
    return { name: l.name, txt: l.txt, pr: !!pr };
  });
  prs.sort((a, b) => b.pct - a.pct);
  const cMin = num(log.cardioMin), cKm = num(log.cardioKm);
  const stats = [
    { key: "dur", label: t("Süre|kart"), value: fmtMinutes(num(log.durationMin)), has: num(log.durationMin) > 0 },
    { key: "vol", label: t("Tonaj|kart"), value: Math.round(wRaw(num(log.volume))).toLocaleString(locale()) + " " + wUnit(), has: true },
    { key: "sets", label: t("Set|kart"), value: String(num(log.sets)), has: true },
    { key: "prs", label: t("Rekor|kart"), value: String(num(log.prs)), has: prOk },
    { key: "cardio", label: t("Kardiyo|kart"), value: t("{m} dk", { m: cMin }) + (cKm > 0 ? " · " + fmtNum(cKm) + " km" : ""), has: cMin > 0 }
  ];
  const d = new Date(ts);
  const monthNo = state.workoutLogs.filter(w => { const x = new Date(num(w.ts)); return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth() && num(w.ts) <= ts; }).length || 1;
  const ay = fmtDay(d, { month: "long" });
  return {
    day: String(log.dayName || t("Antrenman|kart")),
    dateTxt: log.ts ? fmtDay(d, { day: "numeric", month: "long", year: "numeric" }) : String(log.date || ""),
    stats, muscles, rows, prs, monthNo,
    monthTxt: t("{ay} ayının {n}. antrenmanı", { ay, n: curLang() === "en" ? monthOrdinalEn(monthNo) : monthNo })
  };
}
