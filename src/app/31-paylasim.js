// v67: paylaşım kartı kodu 09-kas-plaka-koc-takviye.js'den buraya taşındı (içerik aynı).
// ---------------------------------------------------------------------------
// PAYLAŞILABİLİR ANTRENMAN ÖZET KARTI (1080×1350 PNG)
// ---------------------------------------------------------------------------

function logExerciseLines(log) {
  if (!log.id) return [];
  const out = [];
  Object.keys(state.exerciseHistory).forEach(k => state.exerciseHistory[k].forEach(sess => {
    if (sess.logId !== log.id) return;
    if (!Array.isArray(sess.sets) || !sess.sets.length) return;   // v67: seti olmayan oturum satır üretmez
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
// "Çalışan kaslar: Göğüs • Omuz • Triceps" ortalı; sığmazsa iki satır (y = iki satırın ortası)
function drawWorked(ctx, y, data, c) {
  // v68: 13 kas grubu → en çok set yapılanlar önde; iki satıra sığmayanlar "+N" (kırpılmış ad yok)
  const ms = MUSCLES.filter(m => data.muscles[m] > 0).sort((a, b) => data.muscles[b] - data.muscles[a]);
  const names = ms.map(m => muscleL(m));
  if (!names.length) return;
  const FL = shSans(32, 500, true), FB = shSans(32, 700, true), MAXW = 936;
  ctx.save(); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  const wOf = (txt, f) => { ctx.font = f; return ctx.measureText(txt).width; };
  const lines = [[[t("Çalışan kaslar:") + " ", FL, c.mu]]], lw = [wOf(t("Çalışan kaslar:") + " ", FL)];
  const sepW = wOf(" • ", FB), moreW = k => sepW + wOf("+" + k, FB);
  for (let i = 0; i < names.length; i++) {
    const n = names[i], sep = i && lines[lines.length - 1].length ? " • " : "", add = (sep ? sepW : 0) + wOf(n, FB);
    let L = lines.length - 1;
    const left = names.length - i - 1, need = add + (left && L === 1 ? moreW(left) : 0);
    if (lw[L] + need > MAXW) {
      if (L === 0) { lines.push([]); lw.push(0); L = 1; i--; continue; }
      const k = names.length - i;   // sığmayanlar
      lines[L].push([" • ", FB, c.acc], ["+" + k, FB, c.mu]); lw[L] += moreW(k);
      break;
    }
    if (sep) { lines[L].push([sep, FB, c.acc]); lw[L] += sepW; }
    lines[L].push([n, FB, c.tx]); lw[L] += wOf(n, FB);
  }
  const y0 = lines.length > 1 ? y - 22 : y;
  lines.forEach((segs, li) => {
    let x = 540 - Math.min(lw[li], MAXW) / 2;
    segs.forEach(([txt, f, col]) => {
      ctx.font = f; ctx.fillStyle = col;
      const room = 540 + MAXW / 2 - x, out = ctx.measureText(txt).width > room ? fitText(ctx, txt, room) : txt;   // 2. satır da taşarsa son parça kısalır
      ctx.fillText(out, x, y0 + li * 44); x += ctx.measureText(out).width;
    });
  });
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
  const map = await paintMuscleMap3d(data.muscles, { theme: onDark ? "clear" : c.map, scale: "session" });   // v68: 3D harita (32-kas-harita.js)

  if (tpl === "sticker") {   // tamamen şeffaf zemin; yazılara gölge
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 18; ctx.shadowOffsetY = 4;
    c.panel = "rgba(0,0,0,0.5)";
    const top = post ? 230 : 520;
    drawWordmark(ctx, 540, top + 48, 54, c, "center");
    drawTitle(ctx, 540, top + 160, day, c, 96, 936, 0, "center");
    const ph = drawStatPanel(ctx, 90, top + 200, 900, vis.slice(0, 3), 3, c, { vsize: 60, px: 34, py: 26 });
    drawMapImg(ctx, map, 400, top + 200 + ph + 60, 280);   // v68: eğik panelin ışıması başa değmesin
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
    { key: "vol", label: t("Tonaj|kart"), value: Math.round(wRaw(num(log.volume))).toLocaleString(locale()) + " " + wUnit(), has: num(log.volume) > 0 },   // yalnız kardiyoda "0 kg" yazmasın
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
    monthTxt: log.ts ? t("{ay} ayının {n}. antrenmanı", { ay, n: curLang() === "en" ? monthOrdinalEn(monthNo) : monthNo }) : ""   // tarihi olmayan eski kayıtta ay bilinmez
  };
}

// ============================================================================
// v67 — PAYLAŞIM PENCERESİ (#shareModal): şablon kaydırma, boyut, tema, istatistik, fotoğraf, paylaş / kopyala
// Fotoğraf YALNIZ bellekte (sharePhoto); kayda, önbelleğe, yedeğe girmez; pencere kapanınca bırakılır.
// ============================================================================
let sharePhoto = null, sharePhotoId = 0;
let shareCtx = null;   // { li, log, data, tpls, tpl, urls: {tpl: objectURL}, full: {key, blob}, gen }
const SHARE_TPL_NAMES = { map: () => t("Kas haritası"), pr: () => t("Rekor|şablon"), photo: () => t("Fotoğraf|şablon"), sticker: () => t("Çıkartma"), list: () => t("Hareket listesi") };
const SHARE_CHIP_KEYS = ["dur", "vol", "sets", "prs", "cardio", "month"];
function shareSettings() { return state.settings.share; }
function shareOpts(tpl) {
  const s = shareSettings();
  return { tpl, size: s.size, theme: s.theme, stats: s.stats, photo: tpl === "photo" ? sharePhoto : null };
}
function shareKey(tpl) { const s = shareSettings(); return [tpl, s.size, s.theme, JSON.stringify(s.stats), tpl === "photo" ? sharePhotoId : 0].join("|"); }
function shareCanBlob(cv) { return new Promise(res => cv.toBlob(res, "image/png")); }

async function openShareCard(logIdx) {
  const log = state.workoutLogs[logIdx];
  if (!log) return;
  shareClearPhoto();
  const data = shareData(log), tpls = shareTplsFor(data), saved = shareSettings().tpl;
  let tpl = tpls.includes(saved) && saved !== "photo" ? saved : "map";
  if (tpl === "map" && !Object.keys(data.muscles).length && tpls.includes("list")) tpl = "list";
  shareCtx = { li: logIdx, log, data, tpls, tpl, urls: {}, full: null, gen: 0 };
  const sizeBtn = (k, l) => `<button data-share-size="${k}" onclick="setShareOpt('size','${k}')" class="h-11 rounded-[11px] text-[13px] font-bold">${l}</button>`;
  const themeBtn = (k, l) => `<button data-share-theme="${k}" onclick="setShareOpt('theme','${k}')" class="h-11 rounded-[11px] text-[13px] font-bold">${l}</button>`;
  const chips = SHARE_CHIP_KEYS.map(k => {
    const st = data.stats.find(s => s.key === k), has = k === "month" ? true : !!(st && st.has);
    const label = k === "month" ? t("Ay sırası") : st.label;
    return `<button data-share-stat="${k}" onclick="toggleShareStat('${k}')" ${has ? "" : "disabled"} class="min-h-[44px] px-3.5 rounded-full border text-[13px] font-semibold disabled:opacity-35">${esc(label)}</button>`;
  }).join("");
  $("shareBody").innerHTML = `
    <div class="w-10 h-1.5 rounded-full bg-[var(--w-line)] mx-auto mb-3"></div>
    <div class="flex items-center gap-3">
      <h3 id="shareTitle" class="flex-1 text-[21px] font-extrabold leading-tight text-[var(--w-text)]">${t("Paylaş")}</h3>
      <button id="shareClose" onclick="closeShare()" aria-label="${t("Kapat")}" class="w-11 h-11 shrink-0 rounded-full bg-[var(--w-elev)] text-[var(--w-muted)] flex items-center justify-center">${svgI("x", 20, 2.2)}</button>
    </div>
    <div id="shareTrack" onscroll="shareOnScroll()" onpointerdown="shareUserScroll()" ontouchstart="shareUserScroll()" class="share-track mt-3 flex overflow-x-auto snap-x snap-mandatory">
      ${tpls.map(k => `<div data-share-tpl="${k}" class="snap-center shrink-0 w-full flex justify-center"><div class="share-prev ${k === "sticker" ? "share-checker" : ""} rounded-2xl overflow-hidden border border-[var(--w-line)]"><img alt="${esc(SHARE_TPL_NAMES[k]())}" class="block h-full w-auto" /></div></div>`).join("")}
    </div>
    <div id="shareDots" class="flex justify-center mt-1">${tpls.map(k => `<button data-share-dot="${k}" onclick="setShareTpl('${k}', true)" aria-label="${esc(SHARE_TPL_NAMES[k]())}" class="w-11 h-11 flex items-center justify-center"><span class="block w-2 h-2 rounded-full"></span></button>`).join("")}</div>
    <div id="shareTplName" class="text-center text-[14px] font-bold text-[var(--w-text)] -mt-1"></div>
    <div class="grid grid-cols-2 gap-2 mt-3">
      <div id="shareSize" class="grid grid-cols-2 gap-0.5 bg-[var(--w-elev)] rounded-[14px] p-0.5">${sizeBtn("story", t("Hikâye"))}${sizeBtn("post", t("Gönderi"))}</div>
      <div id="shareTheme" class="grid grid-cols-2 gap-0.5 bg-[var(--w-elev)] rounded-[14px] p-0.5">${themeBtn("dark", t("Koyu"))}${themeBtn("light", t("Aydınlık"))}</div>
    </div>
    <div id="shareStats" class="flex flex-wrap gap-2 mt-3">${chips}</div>
    <button id="sharePhotoBtn" onclick="$('sharePhotoInput').click()" class="hidden w-full mt-3 h-12 rounded-2xl bg-[var(--w-elev)] text-[var(--w-text)] text-[15px] font-bold">${t("Fotoğraf seç")}</button>
    <input id="sharePhotoInput" type="file" accept="image/*" class="hidden" onchange="sharePickPhoto(this)" />
    <div class="flex gap-2.5 mt-4">
      <button id="shareGo" onclick="shareGo()" class="w-btn flex-1 h-[52px] rounded-2xl text-[15px] disabled:opacity-40">${t("Paylaş")}</button>
      <button id="shareCopy" onclick="shareCopy()" class="hidden h-[52px] px-5 rounded-2xl bg-[var(--w-elev)] text-[var(--w-text)] text-[15px] font-bold">${t("Kopyala")}</button>
    </div>`;
  openModal("shareModal");
  shareSyncUi();
  if (typeof animShareIn === "function") animShareIn();   // v68 ANİM: önizleme girişi
  requestAnimationFrame(() => { shareScrollTo(tpl, false); shareRenderAll(); });
}
function shareCopyOk() { return !!(navigator.clipboard && navigator.clipboard.write && window.ClipboardItem); }
function shareSyncUi() {
  if (!shareCtx) return;
  const s = shareSettings(), tpl = shareCtx.tpl, m = $("shareModal");
  m.dataset.tpl = tpl;
  document.querySelectorAll("[data-share-dot]").forEach(b => { const on = b.dataset.shareDot === tpl; b.setAttribute("aria-pressed", on); b.firstElementChild.className = "block w-2 h-2 rounded-full " + (on ? "bg-[var(--w-acc)]" : "bg-[var(--w-line)]"); });
  document.querySelectorAll("[data-share-size]").forEach(b => { const on = b.dataset.shareSize === s.size; b.setAttribute("aria-pressed", on); b.className = "h-11 rounded-[11px] text-[13px] font-bold " + (on ? "bg-[var(--w-text)] text-[var(--w-sheet)]" : "text-[var(--w-muted)]"); });
  document.querySelectorAll("[data-share-theme]").forEach(b => { const on = b.dataset.shareTheme === s.theme; b.setAttribute("aria-pressed", on); b.className = "h-11 rounded-[11px] text-[13px] font-bold " + (on ? "bg-[var(--w-text)] text-[var(--w-sheet)]" : "text-[var(--w-muted)]"); });
  document.querySelectorAll("[data-share-stat]").forEach(b => { const on = s.stats[b.dataset.shareStat] !== false; b.setAttribute("aria-pressed", on); b.className = "min-h-[44px] px-3.5 rounded-full border text-[13px] font-semibold disabled:opacity-35 " + (on && !b.disabled ? "border-[var(--w-acc)] text-[var(--w-acc)] bg-[rgba(var(--t-acc-rgb),0.12)]" : "border-[var(--w-line)] text-[var(--w-muted)]"); });
  $("shareTplName").textContent = SHARE_TPL_NAMES[tpl]();
  $("shareTheme").classList.toggle("hidden", tpl === "photo" || tpl === "sticker");
  $("sharePhotoBtn").classList.toggle("hidden", tpl !== "photo");
  if (tpl === "photo") $("sharePhotoBtn").textContent = sharePhoto ? t("Başka fotoğraf seç") : t("Fotoğraf seç");
  $("shareCopy").classList.toggle("hidden", tpl !== "sticker" || !shareCopyOk());
  $("shareGo").disabled = tpl === "photo" && !sharePhoto;
}
// Kaydırma: şablon, kaydırma DURUNCA seçilir (ara konumdan yanlış şablon seçilmesin); düğmeyle kaydırırken hedef belli
function shareScrollTo(tpl, smooth) {
  const tr = $("shareTrack"), i = shareCtx.tpls.indexOf(tpl);
  if (!tr || i < 0) return;
  const left = i * tr.clientWidth;
  shareCtx.target = smooth && Math.abs(tr.scrollLeft - left) > 2 ? tpl : null;   // anında atlamada olay gelmeyebilir: hedef bekleme
  clearTimeout(shareCtx.targetT);
  if (shareCtx.target) shareCtx.targetT = setTimeout(() => { if (shareCtx) shareCtx.target = null; }, 900);   // kaydırma yarıda kesilirse takılı kalmasın
  tr.scrollTo({ left, behavior: smooth ? "smooth" : "auto" });
}
function shareUserScroll() { if (shareCtx) shareCtx.target = null; }   // parmak değdi: hedef beklemesi biter
function shareOnScroll() {
  if (!shareCtx) return;
  clearTimeout(shareCtx.scrollT);
  shareCtx.scrollT = setTimeout(() => {
    if (!shareCtx) return;
    const tr = $("shareTrack"), i = Math.round(tr.scrollLeft / Math.max(1, tr.clientWidth));
    const k = shareCtx.tpls[Math.max(0, Math.min(shareCtx.tpls.length - 1, i))];
    if (shareCtx.target) { if (k === shareCtx.target) shareCtx.target = null; return; }
    if (k && k !== shareCtx.tpl) setShareTpl(k, false);
  }, 140);
}
function setShareTpl(k, scroll) {
  if (!shareCtx || !shareCtx.tpls.includes(k)) return;
  shareCtx.tpl = k;
  if (k !== "photo") { state.settings.share.tpl = k; saveState(); }   // fotoğraf şablonu hatırlanmaz
  if (scroll) shareScrollTo(k, true);
  shareSyncUi();
  if (k === "pr" && shareCtx.urls.pr) sharePrShine();   // önizlemesi hazırsa hemen
  shareRender(k);
}
// v68: rekor kartı parıltısı pencere başına bir kez (animasyon 27-animasyon.js animSharePr)
function sharePrShine() {
  if (!shareCtx || shareCtx.prShone || typeof animSharePr !== "function") return;
  const el = document.querySelector('[data-share-tpl="pr"] .share-prev');
  if (el && animSharePr(el)) shareCtx.prShone = true;
}
// Görünen şablonun tam boy dosyası arka planda hazırlanır: iOS'ta Paylaş dokunuşu içinde uzun çizim olmasın
async function shareEnsureFull() {
  const ctxRef = shareCtx;
  if (!ctxRef) return;
  const tpl = ctxRef.tpl, key = shareKey(tpl);
  if ((ctxRef.full && ctxRef.full.key === key) || ctxRef.fullBusy === key || (tpl === "photo" && !sharePhoto)) return;
  ctxRef.fullBusy = key;
  try {
    const cv = await buildShareCanvas(ctxRef.log, shareOpts(tpl));
    const b = await shareCanBlob(cv);
    cv.width = cv.height = 0;   // iPhone tuval belleği: hemen bırak
    if (shareCtx === ctxRef && b && shareKey(ctxRef.tpl) === key) ctxRef.full = { key, blob: b };
  } catch (e) { /* önizleme yine görünür; Paylaş gerekirse yeniden çizer */ }
  finally { if (ctxRef.fullBusy === key) ctxRef.fullBusy = null; }
}
function setShareOpt(key, v) {
  if (!shareCtx) return;
  state.settings.share[key] = v; saveState();
  shareSyncUi(); shareRenderAll();
}
function toggleShareStat(k) {
  if (!shareCtx) return;
  const s = state.settings.share.stats;
  if (s[k] !== false) {
    const onCount = SHARE_CHIP_KEYS.filter(x => s[x] !== false && !(document.querySelector('[data-share-stat="' + x + '"]') || {}).disabled).length;
    if (onCount <= 1) { toast(t("En az bir bilgi açık kalmalı")); return; }
    s[k] = false;
  } else s[k] = true;
  saveState(); shareSyncUi(); shareRenderAll();
}
// Önizleme: tam boy çiz → küçült → <img>; o anki şablonun tam boy dosyası paylaşım için saklanır (iOS dokunuş süresi)
async function shareRender(tpl) {
  if (!shareCtx) return;
  const ctxRef = shareCtx, key = shareKey(tpl);
  if (ctxRef.keys && ctxRef.keys[tpl] === key) { if (tpl === ctxRef.tpl) shareEnsureFull(); return; }
  let cv = null, sm = null;
  try {
    cv = await buildShareCanvas(ctxRef.log, shareOpts(tpl));
    if (shareCtx !== ctxRef || shareKey(tpl) !== key) return;
    sm = document.createElement("canvas"); const sw = 360;
    sm.width = sw; sm.height = Math.round(cv.height * sw / cv.width);
    const sx = sm.getContext("2d"); sx.imageSmoothingQuality = "high"; sx.drawImage(cv, 0, 0, sm.width, sm.height);
    const blob = await shareCanBlob(sm);
    if (!blob || shareCtx !== ctxRef) return;
    if (ctxRef.urls[tpl]) URL.revokeObjectURL(ctxRef.urls[tpl]);
    ctxRef.urls[tpl] = URL.createObjectURL(blob);
    (ctxRef.keys = ctxRef.keys || {})[tpl] = key;
    const img = document.querySelector('[data-share-tpl="' + tpl + '"] img');
    if (img) img.src = ctxRef.urls[tpl];
    if (tpl === "pr" && ctxRef.tpl === "pr") sharePrShine();   // v68 ANİM: rekor kartı ilk gösterimde parlar
    if (tpl === ctxRef.tpl && !(ctxRef.full && ctxRef.full.key === key)) {
      const b = await shareCanBlob(cv);
      if (shareCtx === ctxRef && b && shareKey(tpl) === key) ctxRef.full = { key, blob: b };
    }
  } catch (e) { /* çizilemedi (ör. iPhone tuval belleği): önceki önizleme kalır, Paylaş yeniden dener */ }
  finally { if (cv) cv.width = cv.height = 0; if (sm) sm.width = sm.height = 0; }   // iPhone tuval belleği
}
async function shareRenderAll() {
  if (!shareCtx) return;
  const ctxRef = shareCtx;
  await shareRender(ctxRef.tpl);
  for (const k of ctxRef.tpls) { if (shareCtx !== ctxRef) return; if (k !== ctxRef.tpl) await shareRender(k); }
}
async function shareBlob() {
  const ctxRef = shareCtx, key = shareKey(ctxRef.tpl);
  if (ctxRef.full && ctxRef.full.key === key) return ctxRef.full.blob;
  return shareCanBlob(await buildShareCanvas(ctxRef.log, shareOpts(ctxRef.tpl)));
}
function shareFileName() {
  const log = shareCtx.log;
  return "AYK-" + shareCtx.tpl + "-" + (log.ts ? todayStr(new Date(log.ts)) : "antrenman") + ".png";
}
async function shareGo() {
  if (!shareCtx || $("shareGo").disabled || shareCtx.busy) return;   // çift dokunuş: tek paylaşım
  const ctxRef = shareCtx; ctxRef.busy = true;
  try {
    const blob = await shareBlob();
    if (!blob) throw new Error("blob");
    let file;
    try { file = new File([blob], shareFileName(), { type: "image/png" }); } catch (e) { file = blob; file.name = shareFileName(); }
    await shareFileOut(file);
  } catch (e) { toast(t("Kart oluşturulamadı."), "error"); }
  finally { ctxRef.busy = false; }
}
async function shareFileOut(file) {
  if (navigator.canShare && file instanceof File && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: t("AYK+ Antrenman") }); return; }
    catch (e) {
      if (e && e.name === "AbortError") return;
      if (e && e.name === "NotAllowedError") { toast(t("Hazır. Paylaş'a bir kez daha dokun.")); return; }   // iOS: dokunuş süresi geçti; dosya artık hazır
    }
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
async function shareCopy() {
  if (!shareCtx || !shareCopyOk()) return;
  try {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": shareBlob() })]);   // iOS: Promise ile, dokunuş anında
    toast(t("Kopyalandı. Instagram hikâyesinde yapıştır."));
  } catch (e) { toast(t("Kopyalanamadı. Paylaş'ı kullan."), "error"); }
}
async function sharePickPhoto(input) {
  const f = input.files && input.files[0];
  input.value = "";
  if (!f || !shareCtx) return;
  const ctxRef = shareCtx;
  let img = null;
  try { img = await createImageBitmap(f, { imageOrientation: "from-image" }); }
  catch (e) {
    try {
      const url = URL.createObjectURL(f);
      img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = url; });
      img._url = url;
    } catch (e2) { toast(t("Fotoğraf açılamadı."), "error"); return; }
  }
  // iPhone belleği: en uzun kenar 2160 px (hikâye 1920 px için yeterli)
  const iw = img.width || img.naturalWidth, ih = img.height || img.naturalHeight, sc = Math.min(1, 2160 / Math.max(iw, ih, 1));
  if (sc < 1) {
    const cv = document.createElement("canvas"); cv.width = Math.round(iw * sc); cv.height = Math.round(ih * sc);
    cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
    try { if (img.close) img.close(); } catch (e) { /* bırakıldı */ }
    if (img._url) URL.revokeObjectURL(img._url);
    img = cv;
  }
  if (shareCtx !== ctxRef) {   // çözülürken pencere kapandı / yeniden açıldı: fotoğraf yeni pencereye geçmez
    try { if (img.close) img.close(); } catch (e) { /* bırakıldı */ }
    if (img._url) URL.revokeObjectURL(img._url);
    if (img instanceof HTMLCanvasElement) img.width = img.height = 0;
    return;
  }
  shareClearPhoto();
  sharePhoto = img; sharePhotoId++;
  shareSyncUi(); shareRender("photo");
}
function shareClearPhoto() {
  if (sharePhoto) {
    try { if (sharePhoto.close) sharePhoto.close(); } catch (e) { /* zaten bırakıldı */ }
    if (sharePhoto instanceof HTMLCanvasElement) sharePhoto.width = sharePhoto.height = 0;
    if (sharePhoto._url) URL.revokeObjectURL(sharePhoto._url);
  }
  sharePhoto = null;
}
function closeShare() {
  closeModal("shareModal");
  shareClearPhoto();
  if (shareCtx) Object.values(shareCtx.urls).forEach(u => URL.revokeObjectURL(u));
  shareCtx = null;
  const b = $("shareBody"); if (b) b.innerHTML = "";
}
document.addEventListener("click", e => { if (e.target && e.target.id === "shareModal") closeShare(); });
