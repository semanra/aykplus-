// ============================================================================
// v68 — 3D KAS HARİTASI (paylaşım kartı, Antrenman "KAS YÜKÜ", bitiş özeti)
// img/kas-3d-etiket.png: her pikselin kası (palet rengi gri indeks × 17; 0 zemin, 1 gövde, 2.. = MUSCLES sırası)
// img/kas-3d-isik.webp:  gri ışık (0…255 → 0…1,15). Üretim: scripts/gorsel/kas_3d.py
// Renk, set yoğunluğu, tema, seçim ve ışıma çalışma anında canvas'ta hesaplanır. ctx.filter KULLANILMAZ (eski iOS);
// ışıma ve gölge shadowBlur ile. Sonuç son 4 anahtar için önbellekte (Antrenman her çizimde yeniden hesaplamasın).
// ============================================================================

let muscleMapRatio = 1210 / 900;   // yüklenince gerçek oran
let muscleMapP = null;
function loadMapImg(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement("canvas"); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
      const ctx = cv.getContext("2d"); ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
      cv.width = cv.height = 0;
      res({ w: img.naturalWidth, h: img.naturalHeight, d });
    };
    img.onerror = () => rej(new Error(src));
    img.src = src;
  });
}
// → {w, h, lab: Uint8Array, shade: Float32Array} veya null (yüklenemedi; sonraki çağrı yeniden dener)
function loadMuscleMap() {
  if (!muscleMapP) {
    muscleMapP = Promise.all([loadMapImg("img/kas-3d-etiket.png"), loadMapImg("img/kas-3d-isik.webp")]).then(([L, S]) => {
      if (L.w !== S.w || L.h !== S.h) throw new Error("kas-3d boyut");
      const n = L.w * L.h, lab = new Uint8Array(n), shade = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const v = Math.round(L.d[i * 4] / 17);
        lab[i] = L.d[i * 4 + 3] < 128 || v > MUSCLES.length + 1 ? 0 : v;
        shade[i] = S.d[i * 4] / 255 * 1.15;
      }
      muscleMapRatio = L.h / L.w;
      return { w: L.w, h: L.h, lab, shade };
    }).catch(() => { muscleMapP = null; return null; });
  }
  return muscleMapP;
}

// Set → 0…1. session: 1 set = 0, 8+ = 1 (tek antrenman). week: 20+ = 1 (haftalık 10–20 öneri). 0 set → −1 (çalışılmadı)
function muscleLevel(sets, scale) {
  const n = num(sets);
  if (!(n > 0)) return -1;
  return Math.max(0, Math.min(1, (n - 1) / (scale === "week" ? 19 : 7)));
}

// Renkler 0–255 (onaylanan önizleme tasarimlar/paylasim-3d-tur3.png). a = gövde/boşta saydamlığı
const MAP_THEMES = {
  dark: { body: [56, 56, 64], idle: [87, 87, 97], a: 1, lo: [6, 112, 104], hi: [24, 236, 214], hl: [185, 255, 248], glow: [24, 236, 214], glowK: 1, sel: [255, 255, 255] },
  light: { body: [230, 230, 235], idle: [184, 184, 196], a: 1, lo: [0, 110, 100], hi: [0, 196, 178], hl: [120, 245, 232], glow: [0, 196, 178], glowK: 0.6, sel: [24, 24, 27], outline: [140, 140, 153], shadow: 0.22 },
  clear: { body: [255, 255, 255], idle: [255, 255, 255], a: 0.27, aIdle: 0.47, lo: [6, 112, 104], hi: [24, 236, 214], hl: [185, 255, 248], glow: [24, 236, 214], glowK: 1, sel: [255, 255, 255] }
};

// Görsel koordinatında kas adı; gövde/zemindeyse r yarıçapında en yakın kas; yoksa null
function muscleAt(M, x, y, r) {
  if (!M) return null;
  const id = (xx, yy) => (xx < 0 || yy < 0 || xx >= M.w || yy >= M.h) ? 0 : M.lab[yy * M.w + xx];
  const x0 = Math.round(x), y0 = Math.round(y);
  if (id(x0, y0) >= 2) return MUSCLES[id(x0, y0) - 2];
  let best = 0, bd = Infinity;
  const R = Math.round(r || 0);
  for (let dy = -R; dy <= R; dy += 2) for (let dx = -R; dx <= R; dx += 2) {
    const d = dx * dx + dy * dy;
    if (d > R * R || d >= bd) continue;
    const v = id(x0 + dx, y0 + dy);
    if (v >= 2) { best = v; bd = d; }
  }
  return best ? MUSCLES[best - 2] : null;
}

const muscleMapCache = [];   // [{key, cv}] en fazla 4
// muscles: {kas: set}; opts: {theme: dark|light|clear, scale: session|week, selected?, levels?: {kas: 0…1}} → canvas | null
async function paintMuscleMap3d(muscles, opts) {
  opts = opts || {};
  const M = await loadMuscleMap();
  if (!M) return null;
  const T = MAP_THEMES[opts.theme] || MAP_THEMES.dark;
  const scale = opts.scale === "week" ? "week" : "session";
  const sel = MUSCLES.includes(opts.selected) ? opts.selected : null;
  const key = opts.levels ? null : JSON.stringify([Object.keys(muscles || {}).sort().map(k => [k, num(muscles[k])]), opts.theme, scale, sel]);
  if (key) { const hit = muscleMapCache.find(e => e.key === key); if (hit) return hit.cv; }
  // kas indeksi → seviye (−1 çalışılmadı)
  const lev = new Float32Array(MUSCLES.length + 2).fill(-1);
  MUSCLES.forEach((m, i) => {
    const v = opts.levels ? (opts.levels[m] == null ? -1 : num(opts.levels[m], -1)) : muscleLevel((muscles || {})[m], scale);
    lev[i + 2] = v < 0 ? -1 : Math.min(1, v);
  });
  const selId = sel ? MUSCLES.indexOf(sel) + 2 : -1;
  const { w, h, lab, shade } = M;
  const fig = document.createElement("canvas"); fig.width = w; fig.height = h;
  const fctx = fig.getContext("2d");
  const im = fctx.createImageData(w, h), o = im.data;
  const glowCv = document.createElement("canvas"); glowCv.width = w; glowCv.height = h;
  const gctx = glowCv.getContext("2d"), gim = gctx.createImageData(w, h), go = gim.data;
  let anyGlow = false;
  const cl = v => v < 0 ? 0 : v > 1 ? 1 : v;
  for (let i = 0, n = w * h; i < n; i++) {
    const id = lab[i];
    if (!id) continue;
    const L = shade[i], j = i * 4;
    const lv = id >= 2 ? lev[id] : -1;
    if (id === selId && (lab[i - 1] !== id || lab[i + 1] !== id || lab[i - w] !== id || lab[i + w] !== id || lab[i - 2] !== id || lab[i + 2] !== id || lab[i - 2 * w] !== id || lab[i + 2 * w] !== id)) {
      o[j] = T.sel[0]; o[j + 1] = T.sel[1]; o[j + 2] = T.sel[2]; o[j + 3] = 255; continue;   // seçili kas konturu (~3 px)
    }
    if (lv < 0) {
      const c = id === 1 ? T.body : T.idle, k = Math.min(L, 1.15);
      o[j] = c[0] * k; o[j + 1] = c[1] * k; o[j + 2] = c[2] * k;
      o[j + 3] = 255 * (id === 1 ? T.a : (T.aIdle || T.a));
      continue;
    }
    const f = (0.86 + 0.24 * L) * (1 - 0.75 * cl((0.62 - L) / 0.32));   // hacim + yarık koyultma (kas çizgileri kaybolmasın)
    const sp = cl((L - 0.84) / 0.30) * (0.30 + 0.35 * lv);             // ışık vurgusu rengin açık tonuna (beyaza değil)
    for (let c = 0; c < 3; c++) {
      const base = (T.lo[c] + (T.hi[c] - T.lo[c]) * lv) * f;
      o[j + c] = base * (1 - sp) + T.hl[c] * sp;
    }
    o[j + 3] = 255;
    go[j] = T.glow[0]; go[j + 1] = T.glow[1]; go[j + 2] = T.glow[2]; go[j + 3] = 255 * (0.35 + 0.65 * lv); anyGlow = true;
  }
  fctx.putImageData(im, 0, 0);
  const out = document.createElement("canvas"); out.width = w; out.height = h;
  const ctx = out.getContext("2d");
  const OFF = w * 3;   // gölgeyi tek başına çizmek için şekli tuvalin dışına kaydır
  const shadowOnly = (src, color, blur, times) => {
    ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = blur; ctx.shadowOffsetX = OFF;
    for (let k = 0; k < times; k++) ctx.drawImage(src, -OFF, 0);
    ctx.restore();
  };
  let sil = null;
  if (T.outline || T.shadow) {   // figür silüeti (aydınlık zeminde kontur + yumuşak gölge)
    sil = document.createElement("canvas"); sil.width = w; sil.height = h;
    const sctx = sil.getContext("2d"), sim = sctx.createImageData(w, h), so = sim.data, oc = T.outline || [0, 0, 0];
    for (let i = 0, n = w * h; i < n; i++) if (lab[i]) { so[i * 4] = oc[0]; so[i * 4 + 1] = oc[1]; so[i * 4 + 2] = oc[2]; so[i * 4 + 3] = 255; }
    sctx.putImageData(sim, 0, 0);
  }
  if (sil && T.shadow) shadowOnly(sil, "rgba(0,0,0," + T.shadow + ")", h / 90, 1);
  if (anyGlow && T.glowK > 0) {
    gctx.putImageData(gim, 0, 0);
    shadowOnly(glowCv, "rgba(" + T.glow.join(",") + "," + Math.min(1, 0.8 * T.glowK) + ")", h / 60, 2);
  }
  if (sil && T.outline) {
    const d = Math.max(2, Math.round(w / 225));   // ~4 px (900 px genişlikte)
    [[-d, 0], [d, 0], [0, -d], [0, d], [-d, -d], [d, d], [-d, d], [d, -d]].forEach(([dx, dy]) => ctx.drawImage(sil, dx, dy));
  }
  ctx.drawImage(fig, 0, 0);
  fig.width = fig.height = glowCv.width = glowCv.height = 0;
  if (sil) sil.width = sil.height = 0;
  if (key) { muscleMapCache.push({ key, cv: out }); if (muscleMapCache.length > 4) muscleMapCache.shift(); }
  return out;
}
