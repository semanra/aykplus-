// ============================================================================
// v55 — UYGULAMA İÇİ ANİMASYONLAR (halkalar, sayılar, set tiki, rekor parıltısı, dinlenme nabzı, tema geçişi)
// Kurallar: yalnızca transform / opacity / clip-path / stroke; renderAll süresini artırmaz (iş rAF'te);
// animOK() false iken (Hareketi azalt, Profil → Animasyonlar kapalı, testlerde window.AYK_NO_ANIM) her şey anında
// son hâlde görünür: geçiş sınıfı (html.anim-on) yok, rAF yok. Her animasyon ayrı, "v55 ANİM: <ad>" etiketli blok;
// bir blok silinirse çağrı yeri typeof denetimiyle sessizce son hâli gösterir. CSS karşılıkları src/markup.html
// "v55 ANİMASYONLAR" bloğunda.
// ============================================================================
const ANIM_RM = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
function animOK() {
  if (window.AYK_NO_ANIM === true) return false;
  if (ANIM_RM && ANIM_RM.matches) return false;
  return !(state && state.settings && state.settings.anim === false);
}
// html.anim-on: CSS geçişleri (halkalar, çubuklar) yalnızca bu sınıf varken çalışır
function syncAnimClass() {
  const on = animOK();
  const root = document.documentElement;
  if (root.classList.contains("anim-on") !== on) root.classList.toggle("anim-on", on);
}

/* v55 ANİM: halka */
// Halka (kalori, su): stroke-dashoffset CSS geçişiyle önceki değerden yeniye (aynı değer → geçiş yok).
// İlk görünüş 0'dan: işaretlemede halka boş başlar; açılış ekranı (splash) üstteyse ilk dolum o kalkınca oynar.
const animRingPending = {};
function animRing(el, offset) {
  if (!el) return;
  const v = String(offset);
  const id = el.id;
  if (!animOK() || !id) { delete animRingPending[id]; el.style.strokeDashoffset = v; return; }
  if (id in animRingPending) { animRingPending[id] = v; return; }
  if (!el.dataset.animSeen && document.getElementById("splash")) {
    animRingPending[id] = v;
    const started = Date.now();
    const wait = () => {
      if (document.getElementById("splash") && Date.now() - started < 4000) { setTimeout(wait, 100); return; }
      const val = animRingPending[id]; delete animRingPending[id];
      const cur = document.getElementById(id);
      if (cur && val != null) { cur.dataset.animSeen = "1"; requestAnimationFrame(() => { cur.style.strokeDashoffset = val; }); }
    };
    setTimeout(wait, 100);
    return;
  }
  el.dataset.animSeen = "1";
  if (el.style.strokeDashoffset !== v) el.style.strokeDashoffset = v;
}

/* v55 ANİM: sayı */
// Sayının sayarak değişmesi. Çizim son metni ZATEN yazmıştır (o metin doğrudur); animasyon yalnız ara kareleri
// yazar ve sonunda çizimin yazdığı metni BİREBİR geri koyar. Öğe her karede kimliğiyle aranır (innerHTML ile
// yeniden çizilen kutularda eski öğeye yazılmaz). Aynı değer tekrar çizilirse yeniden oynamaz.
const animNums = {};
function countTo(el, from, to, fmt) {
  if (!el || !el.id) return;
  const id = el.id;
  const st = animNums[id] || (animNums[id] = { val: undefined, cur: 0, raf: 0, final: "" });
  st.final = el.textContent;
  st.val = to;
  if (!animOK() || !isFinite(from) || !isFinite(to) || from === to) {
    if (st.raf) { cancelAnimationFrame(st.raf); st.raf = 0; }
    st.cur = to;
    return;
  }
  if (st.raf) cancelAnimationFrame(st.raf);
  const t0 = performance.now(), dur = 450;
  const step = now => {
    const node = document.getElementById(id);
    const k = Math.min(1, (now - t0) / dur);
    if (!node) { st.raf = 0; st.cur = to; return; }
    if (k >= 1) { st.raf = 0; st.cur = to; if (node.textContent !== st.final) node.textContent = st.final; return; }
    const e = 1 - Math.pow(1 - k, 3);
    st.cur = from + (to - from) * e;
    node.textContent = fmt(st.cur);
    st.raf = requestAnimationFrame(step);
  };
  el.textContent = fmt(from);
  st.cur = from;
  st.raf = requestAnimationFrame(step);
}
// Çizimden çağrılır: o anki gösterilen değerden (ilk açılışta 0'dan) yeni değere sayar.
function animNum(id, value, fmt, signed) {
  const el = document.getElementById(id);
  if (!el) return;
  const st = animNums[id];
  if (st && st.val === value) { st.final = el.textContent; return; }   // aynı değer: oynamaz (sürüyorsa son metin güncellenir)
  const from = st ? (st.raf ? st.cur : st.val) : 0;
  // İşaret değişiminde (Kalan ↔ Aşım) ara kareler yanlış işaret/biçim gösterir: sayma, son metin kalsın.
  if (signed && st && (from < -0.5) !== (value < -0.5)) {
    if (st.raf) { cancelAnimationFrame(st.raf); st.raf = 0; }
    st.val = value; st.cur = value; st.final = el.textContent;
    return;
  }
  countTo(el, from, value, fmt);
}

/* v55 ANİM: set tiki */
// Set tamamlanınca onay işareti "pıt" (0,6 → 1,12 → 1) ve satırda kısa vurgu parıltısı. Kayda dokunmaz.
function animSetTick(exIdx, sIdx, isPr) {
  if (!animOK()) return;
  const btn = document.querySelector(`#gymRoot button[onclick="toggleSetDone(${exIdx}, ${sIdx})"]`);
  if (!btn) return;
  btn.classList.remove("ayk-tick"); void btn.offsetWidth; btn.classList.add("ayk-tick");
  const row = btn.closest(".rounded-2xl");
  if (row) { row.classList.remove("ayk-glow"); void row.offsetWidth; row.classList.add("ayk-glow"); }
  setTimeout(() => { btn.classList.remove("ayk-tick"); if (row) row.classList.remove("ayk-glow"); }, 560);
  if (isPr && typeof animPrBurst === "function") animPrBurst(btn);
}

/* v55 ANİM: rekor parıltısı */
// Yeni rekorda onay düğmesinin çevresinde kısa CSS parçacık patlaması (≤ 900 ms), sonra DOM'dan kalkar.
function animPrBurst(anchor) {
  if (!animOK() || !anchor) return;
  const r = anchor.getBoundingClientRect();
  const wrap = document.createElement("div");
  wrap.className = "ayk-burst";
  wrap.setAttribute("aria-hidden", "true");
  wrap.style.left = Math.round(r.left + r.width / 2) + "px";
  wrap.style.top = Math.round(r.top + r.height / 2) + "px";
  let html = "";
  for (let i = 0; i < 10; i++) html += `<i style="--a:${i * 36}deg;--d:${i % 2 ? 30 : 42}px"></i>`;
  wrap.innerHTML = html + "<b></b>";
  document.body.appendChild(wrap);
  setTimeout(() => wrap.remove(), 900);
}

/* v55 ANİM: dinlenme nabzı */
// Dinlenme sayacının son 3 saniyesinde hafif nabız; 0'da (bitti) durur.
function animRestPulse(rem) {
  const el = document.getElementById("restPillInner");
  if (!el) return;
  const on = animOK() && rem > 0 && rem <= 3;
  if (el.classList.contains("ayk-pulse") !== on) el.classList.toggle("ayk-pulse", on);
}

/* v55 ANİM: tema geçişi */
// Başlıktaki güneş/ay düğmesi: View Transitions varsa (Safari 18+) düğmeden dairesel açılış, yoksa kısa çapraz solma.
function animThemeSwitch(apply, origin) {
  if (!animOK()) { apply(); return; }
  const btn = origin || document.getElementById("nutriThemeBtn");
  const root = document.documentElement;
  if (typeof document.startViewTransition === "function" && document.visibilityState === "visible") {
    const r = btn ? btn.getBoundingClientRect() : { left: innerWidth - 40, top: 20, width: 0, height: 0 };
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    let vt;
    try { vt = document.startViewTransition(() => { apply(); }); } catch (e) { apply(); return; }
    vt.ready.then(() => {
      try {
        root.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${rad}px at ${x}px ${y}px)`] },
          { duration: 400, easing: "cubic-bezier(.22, 1, .36, 1)", pseudoElement: "::view-transition-new(root)" });
      } catch (e) { /* yoksay: tarayıcı varsayılan solmasını yapar */ }
    }).catch(() => {});
    return;
  }
  root.classList.add("theme-fade");
  apply();
  clearTimeout(animThemeSwitch.tm);
  animThemeSwitch.tm = setTimeout(() => root.classList.remove("theme-fade"), 300);
}
// Tema düğmesindeki simge değişince hafif döner (ilk çizimde değil).
function animThemeIcon(btn) {
  if (!animOK() || !btn || !btn.dataset.animIcon) { if (btn) btn.dataset.animIcon = "1"; return; }
  const svg = btn.querySelector("svg");
  if (svg) svg.classList.add("ayk-spin");
}

// ============================================================================
// v57 — ANİMASYONLAR 2. TUR (Beslenme + genel). Kurallar v55 ile aynı: animOK() false iken hiçbir şey oynamaz,
// DOM son hâlde kalır. Tam yeniden çizim (renderAll) DOM'u yenilediği için giriş/çıkış efektleri kimlikle
// (öğün dizini, öğün kimliği + besin, yapısal yol) bir kerelik işaretlenip çizimden SONRA uygulanır.
// Hepsi Web Animations API (el.animate) ile: bitince öğede stil/sınıf kalmaz. Yalnız transform / opacity / clip-path.
// ============================================================================
const ANIM_EASE = "cubic-bezier(.22, 1, .36, 1)";
function animPlay(el, frames, opts) {
  if (!el || typeof el.animate !== "function") return null;
  try { return el.animate(frames, opts); } catch (e) { return null; }
}

/* v57 ANİM: öğün yendi */
// Bugün'de öğün "yendi" işaretlenince kart tek satıra kapanır, açılınca açılır (FLIP): çizimden önce satırların yeri
// ölçülür, çizimden sonra aradaki fark transform ile kapatılır; açılan kart clip-path ile eski yüksekliğinden açılır.
function animMealFlip(mIdx, render) {
  const box = document.getElementById("todayMeals");
  if (!animOK() || !box || state.activeTab !== "nutrition" || state.nutriView !== "today" || box.offsetParent === null) { render(); return; }
  const before = {};
  box.querySelectorAll("[data-today-meal]").forEach(el => { const r = el.getBoundingClientRect(); before[el.dataset.todayMeal] = { top: r.top, h: r.height }; });
  render();
  const D = 300;
  box.querySelectorAll("[data-today-meal]").forEach(el => {
    const b = before[el.dataset.todayMeal];
    if (!b) return;
    const r = el.getBoundingClientRect();
    const dy = Math.round(b.top - r.top), dh = Math.round(r.height - b.h);
    if (String(mIdx) === el.dataset.todayMeal && Math.abs(dh) > 1) {
      if (dh > 0) animPlay(el, [{ clipPath: `inset(0 0 ${dh}px 0)`, transform: `translateY(${dy}px)` }, { clipPath: "inset(0 0 0px 0)", transform: "none" }], { duration: D, easing: ANIM_EASE });
      else animPlay(el, [{ opacity: 0.35, transform: `translateY(${dy}px)` }, { opacity: 1, transform: "none" }], { duration: D, easing: ANIM_EASE });
    } else if (Math.abs(dy) > 0.5) animPlay(el, [{ transform: `translateY(${dy}px)` }, { transform: "none" }], { duration: D, easing: ANIM_EASE });
  });
}

/* v57 ANİM: su damlası */
// Su eklenince halkanın (yeni) ucunda küçük damla + dalga; halka dolumu (.6 sn) bitmeye yakın, toplam ≤ 600 ms.
function animWaterDrop() {
  const ring = document.getElementById("waterRing");
  if (!animOK() || !ring || ring.getBoundingClientRect().width === 0) return;
  const svg = ring.ownerSVGElement;
  const wt = waterTargetL(), w = state.waterLiters || 0;
  const pct = wt > 0 ? Math.min(100, Math.round(w / wt * 100)) : 0;
  const a = 2 * Math.PI * pct / 100;
  const cx = (70 + 58 * Math.cos(a)).toFixed(1), cy = (70 + 58 * Math.sin(a)).toFixed(1);
  const NS = "http://www.w3.org/2000/svg";
  const g = document.createElementNS(NS, "g");
  g.setAttribute("class", "ayk-wdrop");
  g.innerHTML = `<circle class="d" cx="${cx}" cy="${cy}" r="5"></circle><circle class="w" cx="${cx}" cy="${cy}" r="7"></circle>`;
  svg.appendChild(g);
  const dot = g.children[0], wave = g.children[1];
  animPlay(dot, [{ opacity: 0, transform: "scale(.2)" }, { opacity: 1, transform: "scale(1.15)", offset: 0.55 }, { opacity: 0, transform: "scale(.6)" }], { duration: 380, delay: 200, easing: "ease-out", fill: "both" });
  animPlay(wave, [{ opacity: 0.85, transform: "scale(.6)" }, { opacity: 0, transform: "scale(2.3)" }], { duration: 340, delay: 260, easing: "ease-out", fill: "both" });
  setTimeout(() => g.remove(), 620);
}

/* v57 ANİM: hedef tamam */
// Günlük kalori veya protein hedefine (yenen) o gün İLK ulaşıldığında halka / çubuk bir kez parlar. Oturum içi işaret:
// günün ilk çiziminde hedef zaten tamamsa parlamaz (o an ulaşılmadı); gün başına her hedef en fazla bir kez.
const animGoal = { day: null, prev: {}, fired: {} };
function animGoalCheck(eaten, targets, view) {
  const day = dayKey();
  const now = { cal: targets.calTarget > 0 && Math.round(eaten.cal) >= targets.calTarget, pro: targets.proTarget > 0 && Math.round(eaten.p) >= targets.proTarget };
  if (animGoal.day !== day) { animGoal.day = day; animGoal.prev = now; animGoal.fired = {}; return; }
  ["cal", "pro"].forEach(k => {
    if (now[k] && !animGoal.prev[k] && !animGoal.fired[k]) {
      animGoal.fired[k] = true;
      if (animOK() && view === "eaten") animGoalGlow(k);
    }
  });
  animGoal.prev = now;
}
function animGoalGlow(k) {
  if (k === "cal") {
    const ring = document.getElementById("calRing");
    const host = ring && ring.closest("div.relative");
    if (!host) return;
    const s = document.createElement("span");
    s.className = "ayk-goal-ring"; s.setAttribute("aria-hidden", "true");
    host.appendChild(s);
    animPlay(s, [{ opacity: 0, transform: "scale(.86)" }, { opacity: 1, transform: "scale(1)", offset: 0.35 }, { opacity: 0, transform: "scale(1.14)" }], { duration: 900, delay: 350, easing: "ease-out", fill: "both" });
    setTimeout(() => s.remove(), 1300);
    return;
  }
  const bar = document.getElementById("proBar");
  if (!bar) return;
  const s = document.createElement("span");
  s.className = "ayk-goal-bar"; s.setAttribute("aria-hidden", "true");
  bar.appendChild(s);
  animPlay(s, [{ transform: "translateX(-100%)", opacity: 0 }, { opacity: 1, offset: 0.3 }, { transform: "translateX(100%)", opacity: 0 }], { duration: 800, delay: 400, easing: "ease-in-out", fill: "both" });
  setTimeout(() => s.remove(), 1250);
}

/* v57 ANİM: besin ekleme */
// Öğüne / menüye eklenen kalem bir sonraki çizimde (Bugün veya Menülerim, hangisi önce görünürse) kayarak gelir ve kısa
// vurgulanır. İşaret öğün kimliği + besin kimliğiyle tutulur; 60 sn içinde görünmezse düşer.
let animItemMarks = [];
function animMarkItem(meal, foodId) {
  if (!animOK() || !meal || !meal.id) return;
  animItemMarks = animItemMarks.filter(m => !(m.mealId === meal.id && m.foodId === foodId));
  animItemMarks.push({ mealId: meal.id, foodId, ts: Date.now() });
}
function animApplyItemMarks(view) {
  if (!animItemMarks.length) return;
  const nowMs = Date.now();
  animItemMarks = animItemMarks.filter(m => nowMs - m.ts < 60000);
  if (!animOK()) { animItemMarks = []; return; }
  if (view !== "today" && view !== "menus") return;
  const db = getFoodDB();
  const meals = view === "today" ? dayMeals() : curMeals();
  animItemMarks = animItemMarks.filter(m => {
    const mIdx = meals.findIndex(x => x.id === m.mealId);
    if (mIdx < 0) return true;
    const items = meals[mIdx].items;
    const iIdx = items.findIndex(i => i.foodId === m.foodId && !i.est);
    if (iIdx < 0) return true;
    const card = document.querySelector(view === "today" ? `#todayMeals [data-today-meal="${mIdx}"]` : `#mealsContainer [data-meal-card="${mIdx}"]`);
    const list = card && card.querySelector(".n-div");
    if (!list) return true;
    let k = 0;
    for (let i = 0; i < iIdx; i++) if ((view === "today" && items[i].est) || (!items[i].est && db[items[i].foodId])) k++;
    const row = list.children[k];
    if (!row) return true;
    animPlay(row, [{ opacity: 0, transform: "translateX(-14px)" }, { opacity: 1, transform: "none" }], { duration: 280, easing: ANIM_EASE });
    row.classList.add("ayk-new");
    setTimeout(() => row.classList.remove("ayk-new"), 1100);
    return false;
  });
}

/* v57 ANİM: pencereler */
// Alttan açılan pencereler (.sheet) yay eğrisiyle aşağıdan gelir, ortadaki kartlar hafif büyüyerek belirir; arka plan
// solarak gelir. Tutamaç / üst bölgeden (içerik en üstteyken) aşağı kaydırınca pencere parmağı izler; ~80 px veya hızlı
// fiske kapanır (mevcut kapatma yoluyla: X düğmesi ya da arka plan dokunuşu), değilse yerine yaylanır.
const SHEET_EASE = "cubic-bezier(.32, .72, 0, 1)";
function animSheetIn(overlay) {
  if (!animOK() || !overlay) return;
  const box = overlay.firstElementChild;
  animPlay(overlay, [{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: "ease-out" });
  if (!box) return;
  if (box.classList.contains("sheet") && box.getBoundingClientRect().bottom >= innerHeight - 2) {
    animPlay(box, [{ transform: "translateY(100%)" }, { transform: "none" }], { duration: 360, easing: SHEET_EASE });
  } else {
    animPlay(box, [{ opacity: 0, transform: "translateY(8px) scale(.95)" }, { opacity: 1, transform: "none" }], { duration: 260, easing: "cubic-bezier(.34, 1.3, .64, 1)" });
  }
}
const SHEET_CLOSE_RX = /^\s*close(Modal\('\w+'\)|Barcode\(\))\s*;?\s*$/;
function sheetCloseVia(overlay) {
  if (overlay.id === "uiDialog") { if (uiDlg && uiDlg.dismissable) uiDialogDone(false); return; }
  const x = [...overlay.querySelectorAll("button[onclick]")].find(b => SHEET_CLOSE_RX.test(b.getAttribute("onclick")));
  const sw = sheetDrag.swallow;
  sheetDrag.swallow = 0;   // kendi kapatma tıklamamız yutulmasın
  if (x) x.click();
  else overlay.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  sheetDrag.swallow = sw;
}
function sheetIsOpen(overlay) { return !!overlay && !overlay.classList.contains("hidden"); }
const sheetDrag = { on: false, pend: false, sheet: null, ov: null, tg: null, x0: 0, y0: 0, dy: 0, pts: [], swallow: 0 };
function sheetScrolled(from, sheet) {
  for (let n = from; n; n = n.parentElement) { if (n.scrollTop > 0) return true; if (n === sheet) break; }
  return false;
}
function sheetTouchStart(e) {
  sheetDrag.pend = false; sheetDrag.on = false;
  if (e.touches.length !== 1) return;
  const tg = e.target instanceof Element ? e.target : null;
  const sheet = tg && tg.closest(".sheet");
  const ov = sheet && sheet.parentElement;
  if (!sheet || !ov || !ov.id || !sheetIsOpen(ov)) return;
  if (tg.closest("input, textarea, select, [contenteditable], .drag-handle")) return;
  if (sheet.getBoundingClientRect().bottom < innerHeight - 2) return;   // ortada duran (geniş ekran) pencere
  if (sheetScrolled(tg, sheet)) return;
  const p = e.touches[0];
  Object.assign(sheetDrag, { pend: true, sheet, ov, tg, x0: p.clientX, y0: p.clientY, dy: 0, pts: [[performance.now(), 0]] });
}
function sheetTouchMove(e) {
  if (!sheetDrag.pend && !sheetDrag.on) return;
  const p = e.touches[0];
  const dx = p.clientX - sheetDrag.x0, dy = p.clientY - sheetDrag.y0;
  if (sheetDrag.pend) {
    if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) { sheetDrag.pend = false; return; }   // yatay kaydırma
    if (dy < -8) { sheetDrag.pend = false; return; }                                             // içeriği yukarı kaydırma
    if (!(dy > 8 && dy > Math.abs(dx))) return;
    if (sheetScrolled(sheetDrag.tg, sheetDrag.sheet)) { sheetDrag.pend = false; return; }
    sheetDrag.pend = false; sheetDrag.on = true; sheetDrag.y0 = p.clientY;
    sheetDrag.sheet.style.transition = "none";
  }
  if (e.cancelable) e.preventDefault();
  const d = Math.max(0, p.clientY - sheetDrag.y0);
  sheetDrag.dy = d;
  sheetDrag.pts.push([performance.now(), d]);
  if (sheetDrag.pts.length > 6) sheetDrag.pts.shift();
  sheetDrag.sheet.style.transform = d ? `translateY(${d}px)` : "";
}
function sheetReset(sheet) { sheet.style.transition = ""; sheet.style.transform = ""; }
function sheetSnapBack(sheet, anim) {
  if (!anim) { sheetReset(sheet); return; }
  sheet.style.transition = "transform .28s " + SHEET_EASE;
  sheet.style.transform = "";
  setTimeout(() => { if (!sheetDrag.on) sheet.style.transition = ""; }, 300);
}
function sheetTouchEnd() {
  sheetDrag.pend = false;
  if (!sheetDrag.on) return;
  sheetDrag.on = false;
  sheetDrag.swallow = Date.now() + 400;
  const sheet = sheetDrag.sheet, ov = sheetDrag.ov, dy = sheetDrag.dy, pts = sheetDrag.pts;
  const nowMs = performance.now();
  const ref = pts.find(q => nowMs - q[0] <= 90) || pts[pts.length - 1];
  const v = nowMs > ref[0] ? (dy - ref[1]) / (nowMs - ref[0]) : 0;   // px / ms
  const close = dy > 80 || (v > 0.5 && dy > 20);
  const anim = animOK();
  if (!close) { sheetSnapBack(sheet, anim); return; }
  const done = () => { sheetCloseVia(ov); if (sheetIsOpen(ov)) sheetSnapBack(sheet, anim); else sheetReset(sheet); };
  if (!anim) { done(); return; }
  sheet.style.transition = "transform .2s cubic-bezier(.4, 0, 1, 1)";
  sheet.style.transform = `translateY(${Math.round(sheet.getBoundingClientRect().height + 40)}px)`;
  setTimeout(done, 200);
}
document.addEventListener("touchstart", sheetTouchStart, { passive: true });
document.addEventListener("touchmove", sheetTouchMove, { passive: false });
document.addEventListener("touchend", sheetTouchEnd, { passive: true });
document.addEventListener("touchcancel", () => { sheetDrag.pend = false; if (sheetDrag.on) { sheetDrag.on = false; sheetSnapBack(sheetDrag.sheet, animOK()); } }, { passive: true });
document.addEventListener("click", e => { if (Date.now() < sheetDrag.swallow) { sheetDrag.swallow = 0; e.preventDefault(); e.stopPropagation(); } }, true);

/* v57 ANİM: sekme geçişi */
// Sekme ve alt görünüm değişince içerik ~160 ms'de belirir (+ 6 px yukarı kayma). Yalnızca değişimde, her çizimde değil.
function animViewIn(els) {
  if (!animOK()) return;
  (Array.isArray(els) ? els : [els]).forEach(el => {
    if (el) animPlay(el, [{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 160, easing: "ease-out" });
  });
}
function animTabIn(tab) { animViewIn(document.getElementById({ nutrition: "tabNutrition", gym: "tabGym", mobility: "tabMobility", progress: "tabProgress" }[tab])); }
function animGymViewIn() { const r = document.getElementById("gymRoot"); if (r) animViewIn([...r.children].filter(c => c.tagName !== "NAV")); }

/* v57 ANİM: silme ve geri al */
// Geri al'lı (offerUndo) anında silmelerde satır önce ~180 ms sola kayarak kaybolur, sonra mevcut silme akışı aynen
// çalışır. "Geri al" ile geri gelen satır aynı yoldan girer (yapısal yol: kimlikli en yakın atadan çocuk sıraları;
// geri alınan durum silmeden önceki durumla aynı olduğu için aynı yer). Onay soran silmeler kapsam dışı.
const ANIM_DEL_ROWS = {
  dayRemoveItem: ".n-div > *", removeItem: ".n-div > *", removeSupp: "[data-supp-row]",
  deleteWeightLog: ".p-row", deleteMeasurement: ".p-row", mobRemoveItem: "[data-mob-row]"
};
let animDelBusy = false, animDelRet = null;
function animPath(el) {
  const p = [];
  let n = el;
  while (n && !n.id && n.parentElement) { p.unshift([...n.parentElement.children].indexOf(n)); n = n.parentElement; }
  return n && n.id ? { root: n.id, p } : null;
}
function animFromPath(path) {
  let el = document.getElementById(path.root);
  for (const i of path.p) { if (!el) return null; el = el.children[i]; }
  return el || null;
}
document.addEventListener("click", e => {
  const btn = e.target instanceof Element ? e.target.closest("button[onclick]") : null;
  if (!btn) return;
  const m = /^\s*(\w+)\(/.exec(btn.getAttribute("onclick") || "");
  const sel = m && ANIM_DEL_ROWS[m[1]];
  if (!sel || !animOK()) return;
  const row = btn.closest(sel);
  if (!row) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (animDelBusy) return;   // aynı anda ikinci silme (eski dizinlerle) yanlış satırı silmesin
  animDelBusy = true;
  const path = animPath(row), tab = state.activeTab;
  const a = animPlay(row, [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateX(-40%)" }], { duration: 180, easing: "cubic-bezier(.4, 0, 1, 1)", fill: "forwards" });
  setTimeout(() => {
    animDelBusy = false;
    const snapBefore = undoSnap;
    try { btn.onclick.call(btn, e); }
    finally {
      if (row.isConnected && a) a.cancel();   // silme gerçekleşmediyse satır geri görünür
      animDelRet = path && undoSnap && undoSnap !== snapBefore ? { path, sel, tab, snap: undoSnap } : null;
    }
  }, 180);
}, true);
function animUndoReturn(snap) {
  const r = animDelRet;
  animDelRet = null;
  if (!r || r.snap !== snap || !animOK() || state.activeTab !== r.tab) return;
  const el = animFromPath(r.path);
  if (!el || !el.matches(r.sel)) return;
  animPlay(el, [{ opacity: 0, transform: "translateX(-40%)" }, { opacity: 1, transform: "none" }], { duration: 240, easing: ANIM_EASE });
}
