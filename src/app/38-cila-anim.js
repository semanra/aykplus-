// ============================================================================
// v80 — CİLA ANİMASYONLARI (v73–v79'da eklenen özellikler için)
// 27-animasyon.js ile aynı kurallar: animOK() false ise hiçbir şey oynamaz (son hâl anında); yalnız transform / opacity;
// Web Animations API (bitince öğede stil kalmaz). Her blok "v80 ANİM: <ad>" etiketli; çağrı yerleri typeof denetimli.
// ============================================================================

/* v80 ANİM: yıldız */
// Favori yıldızına dokununca yeniden çizilen yıldız kısa bir "pıt" ile büyüyüp oturur.
function animStarPop(key) {
  if (!animOK() || !key) return;
  requestAnimationFrame(() => {
    document.querySelectorAll(`[data-fav-key="${CSS && CSS.escape ? CSS.escape(key) : key}"]`).forEach(el => {
      animPlay(el, [{ transform: "scale(.6)" }, { transform: "scale(1.25)", offset: 0.55 }, { transform: "none" }], { duration: 320, easing: "ease-out" });
    });
  });
}

/* v80 ANİM: vurgu */
// Değiştirilen / eklenen / süpersete bağlanan hareket ve yeni eklenen set satırı: kısa "belirme" (ölçek + saydamlık),
// gözün değişen yeri bulması için. sel: CSS seçicileri (bulunamayan atlanır).
function animFlash(sels) {
  if (!animOK()) return;
  requestAnimationFrame(() => {
    (Array.isArray(sels) ? sels : [sels]).forEach(sel => {
      const el = typeof sel === "string" ? document.querySelector(sel) : sel;
      if (el) animPlay(el, [{ opacity: 0.35, transform: "scale(.96)" }, { opacity: 1, transform: "scale(1.015)", offset: 0.6 }, { opacity: 1, transform: "none" }], { duration: 360, easing: ANIM_EASE });
    });
  });
}
// Antrenman sürerken kart, değilse Programım satırı
function animFlashEx(idxs) {
  const list = (Array.isArray(idxs) ? idxs : [idxs]).map(i => state.gymView === "today" && state.gymActive ? `#exCard_${i}` : `[data-ex-row="${i}"]`);
  animFlash(list);
}
// Yeni eklenen set satırı (son set)
function animNewSet(exIdx) {
  if (!animOK()) return;
  const ex = activeDay().exercises[exIdx];
  if (!ex) return;
  requestAnimationFrame(() => {
    const btn = document.querySelector(`#gymRoot button[onclick="toggleSetDone(${exIdx}, ${ex.sets.length - 1})"]`);
    const row = btn && btn.closest(".rounded-2xl");
    if (row) animPlay(row, [{ opacity: 0, transform: "translateY(-6px)" }, { opacity: 1, transform: "none" }], { duration: 220, easing: "ease-out" });
  });
}

/* v80 ANİM: liste geçişi */
// Kütüphanede bölüm / ekipman değişince ve seçicide çip değişince liste yumuşakça belirir (aramada oynamaz).
function animListIn(id) {
  if (!animOK()) return;
  const el = document.getElementById(id);
  if (el) animPlay(el, [{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 170, easing: "ease-out" });
}

/* v80 ANİM: takvim ay geçişi */
// Önceki / sonraki aya geçerken ızgara geldiği yönden kayarak belirir.
function animCalSlide(dir) {
  if (!animOK()) return;
  const el = document.querySelector("#calBody .cal-grid");
  if (el) animPlay(el, [{ opacity: 0, transform: `translateX(${dir > 0 ? 18 : -18}px)` }, { opacity: 1, transform: "none" }], { duration: 220, easing: ANIM_EASE });
}

/* v80 ANİM: özet */
// Özet açılınca ve dönem değişince kutular sırayla belirir; tam sayılar 0'dan sayarak gelir.
function animRecapIn() {
  if (!animOK()) return;
  const tiles = [...document.querySelectorAll("#recapBody .grid > div")];
  tiles.forEach((el, i) => animPlay(el, [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 240, delay: i * 40, easing: "ease-out", fill: "backwards" }));
  document.querySelectorAll("#recapBody section").forEach((el, i) => animPlay(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: 200 + i * 60, easing: "ease-out", fill: "backwards" }));
  tiles.forEach(tile => {
    const el = tile.querySelector(".t-display");
    if (!el || !/^\d+$/.test(el.textContent.trim())) return;   // yalnız tam sayılar (ondalıklı ve binlik ayraçlı metin olduğu gibi)
    const to = +el.textContent.trim();
    if (to < 2) return;
    const t0 = performance.now(), dur = 520;
    const step = now => {
      if (!el.isConnected) return;
      const p = Math.min(1, (now - t0) / dur), v = Math.round(to * (1 - Math.pow(1 - p, 3)));
      el.textContent = String(v);
      if (p < 1) requestAnimationFrame(step); else el.textContent = String(to);
    };
    el.textContent = "0";
    requestAnimationFrame(step);
  });
}

/* v80 ANİM: hareket kartı geçişi */
// Antrenmanda sıradaki harekete (hareket bitince / süperset sırası) kaydırılınca kart kaydırma bitince hafifçe öne çıkar
// ve kenarında kısa bir turkuaz parıltı (ayk-glow) oynar.
function animNextCard(idx) {
  if (!animOK()) return;
  setTimeout(() => {
    const el = document.getElementById("exCard_" + idx);
    if (!el) return;
    animPlay(el, [{ transform: "scale(.985)", opacity: 0.75 }, { transform: "scale(1.012)", opacity: 1, offset: 0.55 }, { transform: "none", opacity: 1 }], { duration: 420, easing: ANIM_EASE });
    el.classList.remove("ayk-glow"); void el.offsetWidth; el.classList.add("ayk-glow");
    setTimeout(() => el.classList.remove("ayk-glow"), 560);
  }, 380);
}

/* v80 ANİM: kas haritası */
// Antrenman → Hareketler KAS YÜKÜ haritası (görünüme girince / aralık değişince) ve aylık özet haritası: çalışan kaslar
// set çoktan aza sırayla boştaki griden kendi rengine geçer (bitiş özetindeki v68 animasyonu animFinishMap ile aynı).
let animBodyMapArm = false;
function animBodyMapArmNext() { animBodyMapArm = true; }

/* v80 ANİM: makro çubukları */
// Protein / karb / yağ değeri ARTINCA (besin eklendi, öğün yendi) çubuk kayarak dolarken ucu kısa bir "nabız" atar;
// hedefe ilk ulaşıldığında çubuk bir kez parlar. İlk çizimde ve azalırken oynamaz.
const animMacroPrev = {};
function animMacroBar(prefix, val, target) {
  const prev = animMacroPrev[prefix];
  animMacroPrev[prefix] = val;
  if (prev == null || val <= prev || !animOK()) return;
  const bar = document.getElementById(prefix + "Bar");
  if (!bar) return;
  const reached = target > 0 && prev < target && val >= target;
  animPlay(bar, reached
    ? [{ opacity: 1 }, { opacity: 0.45, offset: 0.3 }, { opacity: 1, offset: 0.6 }, { opacity: 0.6, offset: 0.8 }, { opacity: 1 }]
    : [{ transform: "scaleY(1)" }, { transform: "scaleY(1.9)", offset: 0.4 }, { transform: "scaleY(1)" }], { duration: reached ? 900 : 480, delay: 120, easing: "ease-out" });
}

/* v80 ANİM: seri */
// Mobilite ana ekranındaki "gün üst üste" ve "gün bu hafta" sayısı ARTINCA (ör. bugün seans bitti) sayı önceki değerden
// sayarak gelir ve "pıt" yapar. Son görülen değer bu cihazda hatırlanır (yalnız görsel kolaylık; kayıt değil).
const ANIM_SERI_KEY = "ayk_anim_seri";
function animSeriGrow() {
  let seen = {};
  try { seen = JSON.parse(localStorage.getItem(ANIM_SERI_KEY) || "{}") || {}; } catch (e) { seen = {}; }
  const now = {};
  document.querySelectorAll("[data-seri]").forEach(el => {
    const k = el.getAttribute("data-seri"), v = +el.textContent.trim();
    if (!Number.isFinite(v)) return;
    now[k] = v;
    const from = seen[k];
    if (from == null || v <= from || !animOK()) return;
    let t0 = 0;
    const dur = 520;
    const step = ts => {
      if (!el.isConnected) return;
      if (!t0) t0 = ts;
      const p = Math.min(1, (ts - t0) / dur);
      el.textContent = String(Math.round(from + (v - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step); else el.textContent = String(v);
    };
    el.textContent = String(from);
    requestAnimationFrame(step);
    animPlay(el, [{ transform: "scale(.7)" }, { transform: "scale(1.25)", offset: 0.6 }, { transform: "none" }], { duration: 480, delay: 380, easing: "ease-out" });
  });
  if (Object.keys(now).length) { try { localStorage.setItem(ANIM_SERI_KEY, JSON.stringify(Object.assign(seen, now))); } catch (e) { /* özel pencere */ } }
}

/* v80 ANİM: boş ekran */
// "Menün henüz boş", "Bu günde henüz hareket yok" gibi boş kartlar EKRANA YENİ GELDİĞİNDE bir kez yukarı kayarak belirir,
// ana düğmesi iki kez hafifçe "buraya dokun" der. Her çizimde değil: önceki çizimde de görünen kart oynamaz.
let animEmptyPrev = new Set();
function animEmptyIn() {
  const els = [...document.querySelectorAll("[data-empty-menu], [data-empty-day]")].filter(el => el.offsetParent !== null);
  const keys = new Set(els.map(el => (el.hasAttribute("data-empty-menu") ? "menu" : "day") + ":" + state.activeTab));
  const fresh = els.filter(el => !animEmptyPrev.has((el.hasAttribute("data-empty-menu") ? "menu" : "day") + ":" + state.activeTab));
  animEmptyPrev = keys;
  if (!animOK()) return;
  fresh.forEach(el => {
    animPlay(el, [{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: 320, easing: ANIM_EASE, fill: "backwards" });
    const btn = el.querySelector("button");
    if (btn) animPlay(btn, [{ transform: "none" }, { transform: "scale(1.05)", offset: 0.25 }, { transform: "none", offset: 0.5 }, { transform: "scale(1.05)", offset: 0.75 }, { transform: "none" }], { duration: 1100, delay: 450, easing: "ease-in-out" });
  });
}
