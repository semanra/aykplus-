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

// v67: paylaşım şablonları (tasarım: tasarimlar/_uret_paylasim.py A3_*; spec docs/superpowers/specs/2026-11-24-paylasim-gorselleri-design.md)
const SHARE_TPLS = ["map", "pr", "photo", "sticker", "list"];
const SHARE_STAT_KEYS = ["dur", "vol", "sets", "prs", "cardio"];
function shareTplsFor(data) {
  return SHARE_TPLS.filter(k => (k !== "pr" || data.prs.length) && (k !== "list" || data.rows.length));
}
const SHARE_PAL = {
  dark: { bg: "#000000", tx: "#FFFFFF", mu: "#A1A1AA", acc: "#1FD1C1", rgb: "31,209,193", panel: "rgba(20,20,22,0.88)", foot: "#52525B", line: "#1E1E21", row: "#E4E4E7", map: "dark" },
  light: { bg: "#F4F4F5", tx: "#09090B", mu: "#52525B", acc: "#0E7C72", rgb: "14,124,114", panel: "rgba(255,255,255,0.92)", foot: "#71717A", line: "#E4E4E7", row: "#18181B", map: "light" }
};
const SH_F = '-apple-system, "SF Pro Display", "Segoe UI", Roboto, sans-serif';
function shDisp(s) { return 'italic 800 ' + s + 'px AYKDisplay, "Barlow Condensed", ' + SH_F; }
function shSans(s, w, it) { return (it ? "italic " : "") + (w || 500) + " " + s + "px " + SH_F; }
const SH_SKEW = Math.tan(-8 * Math.PI / 180);

// "AYK" + turkuaz "+"; align: left | center
function drawWordmark(ctx, x, y, size, c, align) {
  ctx.save(); ctx.font = shDisp(size); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  const a = ctx.measureText("AYK").width, p = ctx.measureText("+").width;
  const x0 = align === "center" ? x - (a + 2 + p) / 2 : x;
  ctx.fillStyle = c.tx; ctx.fillText("AYK", x0, y);
  ctx.fillStyle = c.acc; ctx.fillText("+", x0 + a + 2, y);
  ctx.restore();
}
// Eğik turkuaz çubuk + italik etiket (y = orta çizgi)
function drawTag(ctx, x, y, text, c, size) {
  size = size || 32;
  ctx.save(); ctx.fillStyle = c.acc;
  ctx.translate(x + 6, y); ctx.transform(1, 0, Math.tan(-14 * Math.PI / 180), 1, 0, 0);
  roundRect(ctx, -6, -size * 0.6, 12, size * 1.2, 2); ctx.fill(); ctx.restore();
  ctx.save(); ctx.font = shSans(size, 700, true); ctx.fillStyle = c.acc; ctx.textBaseline = "middle"; ctx.textAlign = "left";
  ctx.fillText(fitText(ctx, text, 1080 - x - 72 - 28), x + 28, y); ctx.restore();
}
// Büyük başlık: sığana dek küçülür (en az 64 px), sonra "…"; altına solan turkuaz çizgi (lineW > 0 ise)
function drawTitle(ctx, x, base, text, c, maxSize, maxW, lineW, align) {
  ctx.save(); ctx.textBaseline = "alphabetic"; ctx.textAlign = align === "center" ? "center" : "left"; ctx.fillStyle = c.tx;
  let s = maxSize; ctx.font = shDisp(s);
  while (s > 64 && ctx.measureText(text).width > maxW) { s -= 4; ctx.font = shDisp(s); }
  ctx.fillText(fitText(ctx, text, maxW), x, base);
  ctx.restore();
  if (lineW) {
    const g = ctx.createLinearGradient(x, 0, x + lineW, 0);
    g.addColorStop(0, c.acc); g.addColorStop(1, "rgba(" + c.rgb + ",0)");
    ctx.save(); ctx.fillStyle = g; roundRect(ctx, x, base + 22, lineW, 6, 3); ctx.fill(); ctx.restore();
  }
}
// Görünür istatistikler (açık + değeri olan), sıra sabit
function shareVisStats(data, stats) { return data.stats.filter(s => s.has && (!stats || stats[s.key] !== false)); }
// Eğik istatistik paneli (kutu −8° eğik, yazılar düz). Döner: yükseklik (0 = çizilmedi)
function drawStatPanel(ctx, x, y, w, items, cols, c, o) {
  if (!items.length) return 0;
  o = Object.assign({ vsize: 72, px: 44, py: 34, gap: 26 }, o || {});
  cols = Math.max(1, Math.min(cols, items.length));
  const rows = Math.ceil(items.length / cols), rowH = 28 + 12 + o.vsize * 0.82;
  const h = o.py * 2 + rows * rowH + (rows - 1) * o.gap;
  ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.transform(1, 0, SH_SKEW, 1, 0, 0);
  roundRect(ctx, -w / 2, -h / 2, w, h, 34);
  ctx.shadowColor = "rgba(" + c.rgb + ",0.22)"; ctx.shadowBlur = 46; ctx.fillStyle = c.panel; ctx.fill();
  ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.lineWidth = 3; ctx.strokeStyle = "rgba(" + c.rgb + ",0.75)"; ctx.stroke();
  ctx.restore();
  const cw = (w - o.px * 2) / cols;
  items.forEach((s, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const cx = x + o.px + col * cw + (col ? 24 : 0), ty = y + o.py + row * (rowH + o.gap);
    if (col) { ctx.save(); ctx.fillStyle = "rgba(" + c.rgb + ",0.35)"; ctx.fillRect(cx - 24, ty, 3, rowH); ctx.restore(); }
    ctx.save(); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.font = shSans(28, 600, true); ctx.fillStyle = c.mu; ctx.fillText(fitText(ctx, s.label, cw - 30), cx, ty + 26);
    ctx.font = shDisp(o.vsize); ctx.fillStyle = s.key === "prs" ? c.acc : c.tx;
    ctx.fillText(fitText(ctx, s.value, cw - 30), cx, ty + 38 + o.vsize * 0.82);
    ctx.restore();
  });
  return h;
}
// Haritanın arkasında ışık + üst-sağdan solan yay
function drawStage(ctx, cx, cy, w, c) {
  ctx.save();
  const r = w * 0.625, g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, "rgba(" + c.rgb + ",0.16)"); g.addColorStop(0.62, "rgba(" + c.rgb + ",0)"); g.addColorStop(1, "rgba(" + c.rgb + ",0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  const rr = w * 0.56, lg = ctx.createLinearGradient(cx + rr * 0.4, cy - rr, cx - rr * 0.5, cy + rr * 0.6);
  lg.addColorStop(0, "rgba(" + c.rgb + ",0.45)"); lg.addColorStop(0.5, "rgba(" + c.rgb + ",0.22)"); lg.addColorStop(1, "rgba(" + c.rgb + ",0)");
  ctx.strokeStyle = lg; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}
function drawMapImg(ctx, map, x, y, w) {
  if (!map) return 0;
  const h = w * map.height / map.width;
  ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high"; ctx.drawImage(map, x, y, w, h); ctx.restore();
  return h;
}
function drawFooter(ctx, H, c, month) {
  ctx.save(); ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  if (month) { ctx.font = shSans(28, 500, true); ctx.fillStyle = c.mu; ctx.fillText(month, 540, H - 128); }
  ctx.font = shSans(26, 500, true); ctx.fillStyle = c.foot;
  const txt = t("AYK+ ile kaydedildi"), tw = ctx.measureText(txt).width, y = H - 70;
  ctx.fillText(txt, 540, y);
  [[540 - tw / 2 - 24 - 140, true], [540 + tw / 2 + 24, false]].forEach(([lx, rev]) => {
    const g = ctx.createLinearGradient(lx, 0, lx + 140, 0);
    g.addColorStop(rev ? 0 : 1, "rgba(" + c.rgb + ",0)"); g.addColorStop(rev ? 1 : 0, c.foot);
    ctx.fillStyle = g; ctx.fillRect(lx, y - 10, 140, 2);
  });
  ctx.restore();
}
function drawHeader(ctx, y, c, date) {
  drawWordmark(ctx, 72, y, 60, c);
  ctx.save(); ctx.font = shSans(30, 500); ctx.fillStyle = c.mu; ctx.textAlign = "right"; ctx.textBaseline = "alphabetic";
  ctx.fillText(fitText(ctx, date, 600), 1008, y - 6); ctx.restore();
}
function drawStar(ctx, x, y, r, col) {
  ctx.save(); ctx.fillStyle = col; ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx[i ? "lineTo" : "moveTo"](x + rr * Math.cos(a), y + rr * Math.sin(a)); }
  ctx.closePath(); ctx.fill(); ctx.restore();
}
// "Çalışan kaslar: Göğüs • Omuz • Triceps" ortalı
function drawWorked(ctx, y, data, c) {
  const names = MUSCLES.filter(m => data.muscles[m] > 0).map(m => muscleL(m));
  if (!names.length) return;
  const parts = [[t("Çalışan kaslar:") + " ", shSans(32, 500, true), c.mu]];
  names.forEach((n, i) => { if (i) parts.push([" • ", shSans(32, 700, true), c.acc]); parts.push([n, shSans(32, 700, true), c.tx]); });
  ctx.save(); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  const ws = parts.map(p => { ctx.font = p[1]; return ctx.measureText(p[0]).width; });
  const total = ws.reduce((a, b) => a + b, 0);
  if (total > 936) {
    ctx.font = shSans(32, 700, true); ctx.fillStyle = c.tx; ctx.textAlign = "center";
    ctx.fillText(fitText(ctx, parts.map(p => p[0]).join(""), 936), 540, y); ctx.restore(); return;
  }
  let x = 540 - total / 2;
  parts.forEach((p, i) => { ctx.font = p[1]; ctx.fillStyle = p[2]; ctx.fillText(p[0], x, y); x += ws[i]; });
  ctx.restore();
}
function coverImage(ctx, img, W, H) {
  const iw = img.width || img.naturalWidth, ih = img.height || img.naturalHeight;
  if (!(iw > 0 && ih > 0)) return;
  const s = Math.max(W / iw, H / ih), dw = iw * s, dh = ih * s;
  ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
}
// Panel sütunu: n ≤ 3 tek satır, 4 → 2×2, 5 → 3 + 2
function statCols(n) { return n <= 3 ? n : n === 4 ? 2 : 3; }

async function buildShareCanvas(log, opts) {
  opts = Object.assign({ tpl: "map", size: "story", theme: "dark", stats: {} }, opts || {});
  const st = opts.stats || {};
  const W = 1080, H = opts.size === "post" ? 1350 : 1920, post = H === 1350;
  const data = shareData(log);
  const tpl = shareTplsFor(data).includes(opts.tpl) ? opts.tpl : "map";
  const onDark = tpl === "photo" || tpl === "sticker";
  const c = Object.assign({}, SHARE_PAL[!onDark && opts.theme === "light" ? "light" : "dark"]);
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");
  try { await document.fonts.load(shDisp(64)); } catch (e) { /* yazı tipi yüklenemezse yedek yazı tipi */ }
  const vis = shareVisStats(data, st);
  const month = st.month === false ? null : data.monthTxt;
  const day = upperL(data.day);
  const map = await paintMuscleMap(data.muscles, onDark ? "clear" : c.map);

  if (tpl === "sticker") {   // tamamen şeffaf zemin; yazılara gölge
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 18; ctx.shadowOffsetY = 4;
    c.panel = "rgba(0,0,0,0.5)";
    const top = post ? 230 : 520;
    drawWordmark(ctx, 540, top + 48, 54, c, "center");
    drawTitle(ctx, 540, top + 160, day, c, 96, 936, 0, "center");
    const ph = drawStatPanel(ctx, 90, top + 200, 900, vis.slice(0, 3), 3, c, { vsize: 60, px: 34, py: 26 });
    drawMapImg(ctx, map, 400, top + 200 + ph + 36, 280);
    ctx.restore();
    return cv;
  }
  if (tpl === "photo") {
    ctx.fillStyle = "#0B0B0C"; ctx.fillRect(0, 0, W, H);
    if (opts.photo) coverImage(ctx, opts.photo, W, H);
    else {
      ctx.save(); ctx.strokeStyle = "rgba(" + c.rgb + ",0.6)"; ctx.lineWidth = 4; ctx.setLineDash([18, 14]);
      const bt = post ? 170 : 270, bh = post ? 230 : 300;   // yer tutucu haritanın üstünde kalır
      roundRect(ctx, 270, bt, 540, bh, 40); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = shSans(40, 600); ctx.fillStyle = c.mu;
      ctx.fillText(t("Fotoğraf seç"), 540, bt + bh / 2); ctx.restore();
    }
    const gh = post ? 900 : 1150, g = ctx.createLinearGradient(0, H - gh, 0, H);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.55, "rgba(0,0,0,0.85)"); g.addColorStop(1, "rgba(0,0,0,0.85)");
    ctx.fillStyle = g; ctx.fillRect(0, H - gh, W, gh);
    c.panel = "rgba(0,0,0,0.55)";
    drawWordmark(ctx, 72, post ? 112 : 148, 60, c);
    const mw = post ? 220 : 300;
    drawMapImg(ctx, map, W - 56 - mw, post ? 420 : 771, mw);
    drawTag(ctx, 72, post ? 780 : 1121, t("Antrenman tamamlandı"), c);
    drawTitle(ctx, 72, post ? 890 : 1281, day, c, post ? 104 : 124, 936, 520);
    drawStatPanel(ctx, 96, post ? 960 : 1450, 888, vis, statCols(vis.length), c, post ? { vsize: 54, py: 24, gap: 18 } : {});
    const mus = MUSCLES.filter(m => data.muscles[m] > 0).map(m => muscleL(m)).join(" · ");
    ctx.save(); ctx.textAlign = "center"; ctx.font = shSans(28, 500, true); ctx.fillStyle = "#D4D4D8";
    ctx.fillText(fitText(ctx, data.dateTxt + (mus ? " · " + mus : ""), 936), 540, H - (post ? 46 : 90)); ctx.restore();
    return cv;
  }

  ctx.fillStyle = c.bg; ctx.fillRect(0, 0, W, H);
  drawHeader(ctx, post ? 112 : 148, c, data.dateTxt);

  if (tpl === "map") {
    drawTag(ctx, 72, post ? 169 : 249, t("Antrenman tamamlandı"), c, post ? 30 : 32);
    drawTitle(ctx, 72, post ? 290 : 392, day, c, post ? 104 : 128, 936, post ? 460 : 600);
    if (post) {
      const mw = 556;
      drawStage(ctx, 30 + mw / 2, 450 + 360, mw, c); drawMapImg(ctx, map, 30, 450, mw);
      drawStatPanel(ctx, 616, 540, 392, vis, 1, c, { vsize: 60, px: 40, py: 30, gap: 20 });
    } else {
      const mw = 587;
      drawStage(ctx, 540, 520 + 380, mw, c); drawMapImg(ctx, map, (W - mw) / 2, 520, mw);
      drawWorked(ctx, 1345, data, c);
      drawStatPanel(ctx, 96, 1410, 888, vis, statCols(vis.length), c);
    }
    drawFooter(ctx, H, c, month);
    return cv;
  }
  if (tpl === "pr") {
    const pr = data.prs[0];
    drawTag(ctx, 72, post ? 169 : 249, t("YENİ REKOR"), c, post ? 30 : 32);
    drawTitle(ctx, 72, post ? 290 : 392, upperL(pr.name), c, post ? 96 : 120, 936, post ? 460 : 600);
    ctx.save(); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    const val = fmtW(pr.kg) + " × " + pr.reps;
    let s = post ? 150 : 190; ctx.font = shDisp(s);
    while (s > 80 && ctx.measureText(val).width > 936) { s -= 6; ctx.font = shDisp(s); }
    ctx.fillStyle = c.acc; ctx.fillText(fitText(ctx, val, 936), 72, post ? 470 : 620);
    ctx.font = shSans(post ? 32 : 36, 600, true); ctx.fillStyle = c.mu;
    ctx.fillText(fitText(ctx, t("Tahmini 1RM ~{v} · önceki en iyiden +{d}", { v: fmtW(Math.round(pr.e1rm)), d: fmtW(round1(pr.e1rm - pr.prev)) }), 936), 72, post ? 530 : 700);
    if (data.prs.length > 1) {
      ctx.font = shSans(post ? 28 : 30, 500, true);
      ctx.fillText(fitText(ctx, tn(data.prs.length - 1, "+{n} rekor daha") + ": " + data.prs.slice(1).map(p => p.name).join(", "), 936), 72, post ? 580 : 760);
    }
    ctx.restore();
    if (post) {
      const mw = 300;
      drawStage(ctx, 700 + mw / 2, 640 + 195, mw, c); drawMapImg(ctx, map, 700, 640, mw);
      drawStatPanel(ctx, 72, 680, 580, vis, vis.length <= 2 ? vis.length : 2, c, { vsize: 60 });
    } else {
      const mw = 380;
      drawStage(ctx, 540, 830 + 246, mw, c); drawMapImg(ctx, map, (W - mw) / 2, 830, mw);
      drawStatPanel(ctx, 96, 1380, 888, vis, statCols(vis.length), c);
    }
    drawFooter(ctx, H, c, month);
    return cv;
  }
  // list: hareket az, altta boşluk çoksa harita alttaki boşlukta büyük; değilse sağ üstte küçük
  const n = vis.length, panelH = n ? 52 + 40 + (n <= 3 ? 60 : n === 4 ? 50 : 42) * 0.82 : 0;
  const step = post ? 80 : 92, limit = H - (month ? 180 : 130);
  const lay = py0 => {   // panel yüksekliğine göre satırlar ve alttaki boşluk
    const y = py0 + panelH + (panelH ? 70 : 0), maxRows = Math.max(1, Math.floor((limit - y - 16) / step));
    const rows = data.rows.length > maxRows ? data.rows.slice(0, maxRows - 1) : data.rows;
    const used = (rows.length + (rows.length < data.rows.length ? 1 : 0)) * step;
    return { py0, y, rows, used, free: limit - (y + 16 + used) };
  };
  let L = lay(post ? 400 : 640);
  const bigMap = map && !post && L.free >= 520;
  if (bigMap) L = lay(480);   // harita altta: sağ üstte yer açmaya gerek yok, liste yukarı
  const py0 = L.py0, rows = L.rows, used = L.used, free = L.free;
  let y = L.y;
  if (map && !bigMap) {
    const mw = post ? 190 : 300, my = post ? 140 : 200;
    drawStage(ctx, W - 40 - mw / 2, my + mw * 0.65, mw, c); drawMapImg(ctx, map, W - 40 - mw, my, mw);
  }
  if (bigMap) {
    const mh = Math.min(free - 60, 640), mw = Math.round(mh * map.width / map.height), my = y + 16 + used + (free - mh) / 2;
    drawStage(ctx, 540, my + mh / 2, mw, c); drawMapImg(ctx, map, (W - mw) / 2, my, mw);
  }
  drawTag(ctx, 72, post ? 169 : 269, t("Antrenman tamamlandı"), c, post ? 30 : 32);
  drawTitle(ctx, 72, post ? 290 : 398, day, c, post ? 96 : 112, map && !bigMap ? 640 : 936, post ? 420 : 500);
  drawStatPanel(ctx, 96, py0, 888, vis, n, c, { vsize: n <= 3 ? 60 : n === 4 ? 50 : 42, px: 30, py: 26 });
  ctx.save(); ctx.textBaseline = "alphabetic";
  ctx.font = shSans(28, 700); ctx.fillStyle = c.mu; ctx.textAlign = "left"; ctx.fillText(t("HAREKETLER"), 72, y); y += 16;
  rows.forEach(r => {
    const by = y + step - 28;
    ctx.textAlign = "right"; ctx.font = shSans(post ? 30 : 34, 600); ctx.fillStyle = r.pr ? c.acc : c.mu;
    const vt = fitText(ctx, r.txt, 400), vw = ctx.measureText(vt).width; ctx.fillText(vt, 1008, by);
    ctx.textAlign = "left"; ctx.font = shSans(post ? 34 : 38, 600); ctx.fillStyle = c.row;
    const nt = fitText(ctx, r.name, 936 - vw - 40 - (r.pr ? 48 : 0)); ctx.fillText(nt, 72, by);
    if (r.pr) drawStar(ctx, 72 + ctx.measureText(nt).width + 30, by - 13, 16, c.acc);
    ctx.fillStyle = c.line; ctx.fillRect(72, y + step - 2, 936, 2);
    y += step;
  });
  if (rows.length < data.rows.length) {
    ctx.font = shSans(post ? 30 : 34, 600, true); ctx.fillStyle = c.mu; ctx.textAlign = "left";
    ctx.fillText(tn(data.rows.length - rows.length, "+{n} hareket daha"), 72, y + step - 28);
  }
  ctx.restore();
  drawFooter(ctx, H, c, month);
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

// ============================================================================
// v67 — KAS HARİTASI (img/kas-harita.png: her kas grubu ayrı anahtar renk; scripts/gorsel/kas_harita.py)
// ============================================================================
// Sıra ve renkler kas_harita.py KEYS ile aynı. Ad = MUSCLES kayıt adı (gösterimde muscleL).
const MAP_KEYS = [
  { name: "bosluk", rgb: [0, 0, 0] }, { name: "govde", rgb: [128, 128, 128] },
  { name: MUSCLES[0], rgb: [255, 0, 0] }, { name: MUSCLES[2], rgb: [255, 255, 0] }, { name: MUSCLES[6], rgb: [0, 0, 255] },
  { name: MUSCLES[7], rgb: [255, 0, 255] }, { name: MUSCLES[8], rgb: [255, 128, 0] }, { name: MUSCLES[3], rgb: [0, 255, 0] },
  { name: MUSCLES[1], rgb: [0, 255, 255] }, { name: MUSCLES[4], rgb: [128, 0, 255] }, { name: MUSCLES[5], rgb: [128, 64, 0] }
];
// Boya takımları: gövde, boş kas, çalışan kas (az set → çok set); [r, g, b, a]
const MAP_PALS = {
  dark: { body: [40, 40, 45, 255], idle: [64, 64, 72, 255], lo: [24, 140, 130, 255], hi: [31, 209, 193, 255] },
  light: { body: [212, 212, 216, 255], idle: [186, 186, 194, 255], lo: [70, 160, 150, 255], hi: [14, 124, 114, 255] },
  clear: { body: [255, 255, 255, 70], idle: [255, 255, 255, 120], lo: [31, 209, 193, 200], hi: [31, 209, 193, 255] }
};
let muscleLabelsP = null;
function loadMuscleLabels() {
  if (!muscleLabelsP) {
    muscleLabelsP = new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => {
        const cv = document.createElement("canvas"); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
        const ctx = cv.getContext("2d"); ctx.drawImage(img, 0, 0);
        const px = ctx.getImageData(0, 0, cv.width, cv.height).data;
        const lab = new Uint8Array(cv.width * cv.height);
        for (let i = 0; i < lab.length; i++) {
          const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
          let best = 0, bd = Infinity;
          MAP_KEYS.forEach((k, j) => { const d = (r - k.rgb[0]) ** 2 + (g - k.rgb[1]) ** 2 + (b - k.rgb[2]) ** 2; if (d < bd) { bd = d; best = j; } });
          lab[i] = best;
        }
        res({ w: cv.width, h: cv.height, lab });
      };
      img.onerror = () => rej(new Error("kas-harita"));
      img.src = "img/kas-harita.png";
    }).catch(e => { muscleLabelsP = null; throw e; });   // yüklenemediyse bir sonraki paylaşımda yeniden dene
  }
  return muscleLabelsP;
}
// muscles: { kas adı: set sayısı }; pal: dark | light | clear → tam boy canvas (yüklenemezse null)
async function paintMuscleMap(muscles, pal) {
  let L;
  try { L = await loadMuscleLabels(); } catch (e) { return null; }
  const P = MAP_PALS[pal] || MAP_PALS.dark;
  const mx = Math.max(1, ...Object.values(muscles || {}).map(v => num(v)));
  const cols = MAP_KEYS.map((k, i) => {
    if (i === 0) return [0, 0, 0, 0];
    if (i === 1) return P.body;
    const n = num((muscles || {})[k.name]);
    if (!(n > 0)) return P.idle;
    const f = 0.55 + 0.45 * n / mx;   // 0,55 … 1: koyu turkuazdan parlak turkuaza
    const tt = (f - 0.55) / 0.45;
    return P.lo.map((v, c) => Math.round(v + (P.hi[c] - v) * tt));
  });
  const cv = document.createElement("canvas"); cv.width = L.w; cv.height = L.h;
  const ctx = cv.getContext("2d");
  const im = ctx.createImageData(L.w, L.h);
  for (let i = 0; i < L.lab.length; i++) { const c = cols[L.lab[i]]; im.data[i * 4] = c[0]; im.data[i * 4 + 1] = c[1]; im.data[i * 4 + 2] = c[2]; im.data[i * 4 + 3] = c[3]; }
  ctx.putImageData(im, 0, 0);
  return cv;
}
