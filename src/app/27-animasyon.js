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
function animNum(id, value, fmt) {
  const el = document.getElementById(id);
  if (!el) return;
  const st = animNums[id];
  if (st && st.val === value) { st.final = el.textContent; return; }   // aynı değer: oynamaz (sürüyorsa son metin güncellenir)
  const from = st ? (st.raf ? st.cur : st.val) : 0;
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
function animThemeSwitch(apply) {
  if (!animOK()) { apply(); return; }
  const btn = document.getElementById("nutriThemeBtn");
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
