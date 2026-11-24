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
const SHEET_NOSWIPE = new Set(["recipeModal", "freeMealModal"]);   // dışına dokununca da kapanmayan, kaydedilmemiş giriş tutan pencereler
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
  if (SHEET_NOSWIPE.has(ov.id) || ov.hasAttribute("data-noswipe")) return;   // v57 inceleme: yazılmış ama kaydedilmemiş form kaybolmasın
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
    // v57 inceleme: bu arada ekran yeniden çizildiyse (Geri al, gün dönümü, başka silme) düğmedeki dizin eskimiş
    // olabilir → yanlış satır silinmesin, hiçbir şey yapma
    if (!btn.isConnected) { if (a) try { a.cancel(); } catch (er) {} return; }
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

// ============================================================================
// v57 — ANİMASYONLAR 2. TUR (Antrenman, Mobilite, İlerleme). Kurallar aynı: animOK() false → hiçbir şey eklenmez.
// ============================================================================

/* v57 ANİM: antrenman özeti */
// Bitiş penceresinde istatistik kutuları sırayla belirir, sayılar 0'dan sayar (animNum; son metin çizimin yazdığı
// metin), rekor satırlarının yıldızı "pıt" eder. Pencere animasyonsuz da açılır (işlev); burada yalnız süs.
function animFinishIn(stats) {
  const box = document.getElementById("finBody");
  if (!animOK() || !box) return;
  box.classList.add("ayk-fin-in");
  const ic = box.querySelector("[data-fin-icon]");
  animPlay(ic, [{ opacity: 0, transform: "scale(.4)" }, { opacity: 1, transform: "scale(1.12)", offset: 0.6 }, { opacity: 1, transform: "scale(1)" }], { duration: 420, delay: 120, easing: "ease-out", fill: "backwards" });
  const tiles = [...box.querySelectorAll("[data-fin-stat]")];
  tiles.forEach((el, i) => {
    const d = 200 + i * 110;
    animPlay(el, [{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: 300, delay: d, easing: ANIM_EASE, fill: "backwards" });
    const x = stats && stats[i], b = x && document.getElementById(x.id);
    if (b && x.v > 0) setTimeout(() => { if (!b.isConnected) return; delete animNums[x.id]; animNum(x.id, x.v, x.fmt); }, d);
  });
  const base = 200 + tiles.length * 110;
  box.querySelectorAll("[data-fin-pr]").forEach((row, i) => {
    animPlay(row, [{ opacity: 0, transform: "translateX(-12px)" }, { opacity: 1, transform: "none" }], { duration: 280, delay: base + i * 90, easing: ANIM_EASE, fill: "backwards" });
    animPlay(row.querySelector("[data-fin-star]"), [{ transform: "scale(.3) rotate(-40deg)" }, { transform: "scale(1.35) rotate(8deg)", offset: 0.6 }, { transform: "none" }], { duration: 420, delay: base + i * 90 + 80, easing: "ease-out", fill: "backwards" });
  });
  setTimeout(() => box.classList.remove("ayk-fin-in"), base + 900);
}

/* v68 ANİM: bitiş özeti kas haritası */
// Çalışan kaslar set çoktan aza sırayla boştaki griden kendi rengine geçer (her biri 350 ms, en çok 160 ms arayla,
// toplam ≤ 1,5 sn). Boyama BİR KEZ: boş figür (önbellekte) + son hâlden ekran çözünürlüğünde kas başına katman;
// kareler yalnız saydamlıkla üst üste çizilir (kare başına piksel döngüsü / büyük tuval yok). Son karede son hâl
// (ışımalı). Hata olursa (tuval belleği) son hâl çizilir. true = oynatıyor.
async function animFinishMap(mus, theme, cv, fin) {
  if (!animOK() || !muscleMapData) return false;
  const base = await paintMuscleMap3d({}, { theme, scale: "session" });
  if (!base || !cv.isConnected) return false;
  const M = muscleMapData, W = cv.width, H = cv.height, x = cv.getContext("2d");
  const order = Object.keys(mus).filter(m => num(mus[m]) > 0 && MUSCLES.includes(m)).sort((a, b) => mus[b] - mus[a]);
  if (!order.length) return false;
  const slot = {}; order.forEach((m, i) => { slot[MUSCLES.indexOf(m) + 2] = i; });
  const small = document.createElement("canvas"); small.width = W; small.height = H;
  const sctx = small.getContext("2d"); sctx.drawImage(fin, 0, 0, W, H);
  const fd = sctx.getImageData(0, 0, W, H).data;
  small.width = small.height = 0;
  const layers = order.map(() => { const c = document.createElement("canvas"); c.width = W; c.height = H; return c; });
  const imgs = layers.map(c => c.getContext("2d").createImageData(W, H));
  for (let y = 0; y < H; y++) {
    const row = Math.min(M.h - 1, Math.floor(y * M.h / H)) * M.w;
    for (let xx = 0; xx < W; xx++) {
      const k = slot[M.lab[row + Math.min(M.w - 1, Math.floor(xx * M.w / W))]];
      if (k === undefined) continue;
      const j = (y * W + xx) * 4, o = imgs[k].data;
      o[j] = fd[j]; o[j + 1] = fd[j + 1]; o[j + 2] = fd[j + 2]; o[j + 3] = fd[j + 3];
    }
  }
  layers.forEach((c, i) => c.getContext("2d").putImageData(imgs[i], 0, 0));
  const stag = order.length > 1 ? Math.min(160, (1500 - 350) / (order.length - 1)) : 0, total = (order.length - 1) * stag + 350, t0 = performance.now();
  const free = () => layers.forEach(c => { c.width = c.height = 0; });
  const last = () => { try { x.globalAlpha = 1; x.clearRect(0, 0, W, H); x.drawImage(fin, 0, 0, W, H); } catch (e) { /* boş kalır */ } };
  const frame = () => {
    try {
      if (!cv.isConnected) { free(); return; }
      const el = performance.now() - t0;
      if (el >= total) { last(); free(); return; }
      x.clearRect(0, 0, W, H); x.drawImage(base, 0, 0, W, H);
      layers.forEach((c, i) => { const p = Math.max(0, Math.min(1, (el - i * stag) / 350)); if (p > 0) { x.globalAlpha = p; x.drawImage(c, 0, 0); } });
      x.globalAlpha = 1;
      requestAnimationFrame(frame);
    } catch (e) { free(); last(); }
  };
  requestAnimationFrame(frame);
  return true;
}

/* v68 ANİM: paylaşım penceresi */
// Önizleme kaydırıcısı açılırken 0,96 → 1 ölçek + saydamlık (220 ms); rekor şablonu ilk gösterildiğinde önizlemenin
// üstünden bir kez ışık şeridi geçer (~700 ms). Yalnız ekrandaki önizleme; paylaşılan görsel (canvas) değişmez.
function animShareIn() {
  const tr = document.getElementById("shareTrack");
  if (!animOK() || !tr) return;
  tr.classList.add("ayk-share-in");
  setTimeout(() => tr.classList.remove("ayk-share-in"), 300);
}
function animSharePr(el) {
  if (!animOK() || !el) return false;
  el.classList.add("ayk-pr-shine");
  setTimeout(() => el.classList.remove("ayk-pr-shine"), 760);
  return true;
}

/* v57 ANİM: hareket tamam */
// Hareketin son seti tiklenince kart başlığındaki "· tamamlandı" kısa turkuaz parlamayla belirir (CSS ::after + ölçek).
function animExDone(exIdx) {
  if (!animOK()) return;
  const el = document.querySelector(`#exCard_${exIdx} [data-ex-done]`);
  if (!el) return;
  el.classList.add("ayk-done");
  animPlay(el, [{ opacity: 0, transform: "scale(.7)" }, { opacity: 1, transform: "scale(1.1)", offset: 0.55 }, { opacity: 1, transform: "none" }], { duration: 380, easing: "ease-out" });
  setTimeout(() => el.classList.remove("ayk-done"), 950);
}

/* v57 ANİM: kilo önerisi */
// Kilo artırma / aynı kiloda kal / dinlenme haftası notu İLK göründüğünde hafif aşağı kayarak belirir. Görülen öneri
// (tür + hareket adı + metin) oturum içinde hatırlanır; aynı öneri yeniden çizilince oynamaz.
const animSuggSeen = new Set();
function animSuggIn() {
  const root = document.getElementById("gymRoot");
  if (!root) return;
  const exs = activeDay().exercises;
  root.querySelectorAll("[data-hold], [data-deload], [data-sugg]").forEach(el => {
    const kind = el.hasAttribute("data-hold") ? "h" : el.hasAttribute("data-deload") ? "d" : "s";
    const idx = +(el.dataset.hold || el.dataset.deload || el.dataset.sugg);
    const key = kind + "|" + ((exs[idx] && exs[idx].name) || idx) + "|" + el.textContent.replace(/\s+/g, " ").trim();
    if (animSuggSeen.has(key)) return;
    animSuggSeen.add(key);
    if (!animOK()) return;
    el.classList.add("ayk-sugg-in");
    animPlay(el, [{ opacity: 0, transform: "translateY(-8px)" }, { opacity: 1, transform: "none" }], { duration: 320, easing: ANIM_EASE });
    setTimeout(() => el.classList.remove("ayk-sugg-in"), 340);
  });
}

/* v57 ANİM: mobilite seansı */
// Seansta hareket değişince başlık + daire/tekrar + rehber yana kayar (ileri: sağdan sola, geri: soldan sağa).
// Bitiş özeti kısa kutlamayla açılır (daire "pıt" + parçacıklar + satırlar sırayla); seans başına bir kez.
const animMob = { dir: 0, fin: 0 };
function animMobMark(from, to) { animMob.dir = to > from ? 1 : to < from ? -1 : 0; }
function animMobApply() {
  const dir = animMob.dir;
  animMob.dir = 0;
  if (!dir || !animOK()) return;
  const title = document.getElementById("mobTTitle");
  const reps = document.getElementById("mobTReps");
  const els = [title && title.parentElement, document.getElementById("mobTCircle") || (reps && reps.parentElement), document.getElementById("mobTGuide")].filter(Boolean);
  els.forEach((el, i) => {
    el.classList.add("ayk-slide");
    animPlay(el, [{ opacity: 0, transform: `translateX(${dir * 48}px)` }, { opacity: 1, transform: "none" }], { duration: 300, delay: i * 30, easing: ANIM_EASE, fill: "backwards" });
    setTimeout(() => el.classList.remove("ayk-slide"), 360 + i * 30);
  });
}
function animMobFin() {
  const fin = document.getElementById("mobTFin");
  const ses = mobT && mobT.ses;
  if (!fin || !ses || animMob.fin === ses.t0) return;
  animMob.fin = ses.t0;
  if (!animOK()) return;
  fin.classList.add("ayk-fin");
  const kids = [...fin.children];
  const circle = kids[0];
  animPlay(circle, [{ opacity: 0, transform: "scale(.3)" }, { opacity: 1, transform: "scale(1.14)", offset: 0.6 }, { opacity: 1, transform: "none" }], { duration: 480, easing: "ease-out", fill: "backwards" });
  kids.slice(1).forEach((el, i) => animPlay(el, [{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }], { duration: 320, delay: 220 + i * 70, easing: ANIM_EASE, fill: "backwards" }));
  setTimeout(() => { if (circle.isConnected) animPrBurst(circle); }, 260);
  setTimeout(() => fin.classList.remove("ayk-fin"), 1100);
}

/* v57 ANİM: grafikler */
// İlerleme: pLine çizgisi soldan sağa çizilir (stroke-dashoffset), pBars çubukları alttan yükselir. Yalnızca alt sekme,
// aralık (kilo / beslenme), hareket ya da ölçü seçimi değişince ve sekmeye her girişte; diğer çizimlerde oynamaz.
let animChartKey = null;
function animChartReset() { animChartKey = null; }
function animCharts(view) {
  const key = [view, progUI.wRange, histRange, progressSel, measureSel].join("|");
  if (key === animChartKey) return;
  animChartKey = key;
  if (!animOK()) return;
  document.querySelectorAll("#progressContent svg.p-chart").forEach(svg => {
    svg.classList.add("ayk-chart-in");
    svg.querySelectorAll("polyline").forEach(pl => {
      let len = 0;
      try { len = pl.getTotalLength(); } catch (e) { return; }
      if (!(len > 0)) return;
      pl.style.strokeDasharray = String(len);
      const a = animPlay(pl, [{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: 700, easing: ANIM_EASE, fill: "backwards" });
      const done = () => { pl.style.strokeDasharray = ""; };
      if (a) { a.onfinish = done; a.oncancel = done; } else done();
    });
    const lineChart = !!svg.querySelector("polyline");
    svg.querySelectorAll(":scope > circle").forEach(c => animPlay(c, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: lineChart ? 450 : 0, easing: "ease-out", fill: "backwards" }));
    [...svg.querySelectorAll(":scope > path")].forEach((p, i) => {
      p.style.transformBox = "fill-box"; p.style.transformOrigin = "50% 100%";
      const a = animPlay(p, [{ transform: "scaleY(0)" }, { transform: "none" }], { duration: 460, delay: Math.min(i * 22, 400), easing: ANIM_EASE, fill: "backwards" });
      const done = () => { p.style.transformBox = ""; p.style.transformOrigin = ""; };
      if (a) { a.onfinish = done; a.oncancel = done; } else done();
    });
    svg.querySelectorAll(":scope > text.p-bv, :scope > text.p-vl").forEach(x => animPlay(x, [{ opacity: 0 }, { opacity: 1 }], { duration: 240, delay: 420, easing: "ease-out", fill: "backwards" }));
    setTimeout(() => svg.classList.remove("ayk-chart-in"), 1000);
  });
}

/* v57 ANİM: seri */
// "Bu hafta, gün gün" şeridi (İlerleme → Genel) ve Mobilite haftası: bugün antrenman / mobilite ilk kez tamamlanınca
// o günün kutusu bir kez "pıt" ile dolar. Gün başında (günün ilk çiziminde) zaten tamamsa oynamaz. Oturum içi işaret.
const animStreak = { day: null, base: {}, popped: {}, pend: {} };
function animStreakNow() {
  const k = todayStr();
  let tq = false;
  for (let i = state.workoutLogs.length - 1; i >= 0 && !tq; i--) { const l = state.workoutLogs[i]; if (l && l.ts && todayStr(new Date(l.ts)) === k) tq = true; }
  return { tq, lv: mobAllItems().some(i => i.done) };
}
function animStreakBase() {
  const day = todayStr(logicalNow());
  if (animStreak.day === day) return;
  animStreak.day = day; animStreak.popped = {};
  animStreak.base = animStreakNow();
}
function animStreakPop(where) {
  // Bir sonraki karede, o anki (son) DOM'a göre: aynı anda art arda gelen çizimler (ör. seans kapanınca ana ekran, hemen
  // ardından rutin) görünmeyen bir çizimde işareti harcamasın. Seans / sayaç ya da Profil üstteyken de harcanmaz.
  if (animStreak.day === null || animStreak.pend[where]) return;
  animStreak.pend[where] = true;
  requestAnimationFrame(() => { animStreak.pend[where] = false; animStreakPopNow(where); });
}
function animStreakPopNow(where) {
  if (mobT || (typeof profileIsOpen === "function" && profileIsOpen())) return;
  if (where === "m" ? !(state.activeTab === "mobility" && mobUI.view === "home") : !(state.activeTab === "progress" && state.progressView === "genel")) return;
  const now = animStreakNow();
  (where === "p" ? ["tq", "lv"] : ["lv"]).forEach(k => {
    const mark = where + k;
    if (!now[k] || animStreak.base[k] || animStreak.popped[mark]) return;
    let cell = null;
    if (where === "m") cell = document.querySelector("#mobHome .m-days i.t");
    else {
      const key = k === "tq" ? todayStr() : todayStr(logicalNow());
      const di = progWeekDays().findIndex(d => todayStr(d) === key);
      const row = document.querySelectorAll("#pStrip .p-sr:not(.hdr)")[k === "tq" ? 0 : 2];
      cell = di >= 0 && row ? row.querySelectorAll(".p-sd")[di] : null;
    }
    if (!cell) return;
    animStreak.popped[mark] = true;
    if (!animOK()) return;
    cell.classList.add("ayk-pop");
    animPlay(cell, [{ transform: "scale(.35)", opacity: 0.4 }, { transform: "scale(1.2)", opacity: 1, offset: 0.6 }, { transform: "none", opacity: 1 }], { duration: 440, delay: 120, easing: "ease-out", fill: "backwards" });
    setTimeout(() => cell.classList.remove("ayk-pop"), 650);
  });
}
