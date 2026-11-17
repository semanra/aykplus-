
// ============================================================================
// v61: YAZI BOYUTU (Profil → Görünüm ve Dil → Yazı boyutu)
// settings.textSize = "system" | "normal" | "large" | "xlarge" (varsayılan "system").
// Derleme (scripts/build.mjs) bütün font-size / line-height değerlerini calc(… * var(--fs)) yapar; burada yalnızca
// --fs ayarlanır. Büyük başlık ve sayılar (≥ 24 px) yarı oranda büyür (--fs-d), taşmasınlar diye.
// "Sistem": iPhone Ayarlar → Ekran → Metin Boyutu. iOS Safari "-apple-system-body" yazı tipini o ayara göre verir
// (varsayılan 17 px). Oran 1 … 1,3 arasında tutulur (küçük ayar uygulamayı küçültmez). Başka tarayıcıda 1.
// ============================================================================
const TEXT_SIZES = { normal: 1, large: 1.12, xlarge: 1.24 };
const TEXT_SIZE_MAX = 1.3;
let sysTextScale = null;

function systemTextScale() {
  if (sysTextScale != null) return sysTextScale;
  let r = 1;
  try {
    const el = document.createElement("span");
    el.setAttribute("aria-hidden", "true");
    el.style.cssText = "position:absolute;visibility:hidden;font-size:17px;";
    el.style.font = "-apple-system-body";   // tanınmazsa 17 px kalır → oran 1
    document.documentElement.appendChild(el);
    const px = parseFloat(getComputedStyle(el).fontSize);
    el.remove();
    if (px > 0) r = px / 17;
  } catch (e) { r = 1; }
  r = Math.min(TEXT_SIZE_MAX, Math.max(1, r));
  sysTextScale = Math.round(r * 100) / 100;
  return sysTextScale;
}

function textScale() {
  const s = state && state.settings ? state.settings.textSize : "system";
  return s === "system" || !TEXT_SIZES[s] ? systemTextScale() : TEXT_SIZES[s];
}

function applyTextSize() {
  const f = textScale(), root = document.documentElement;
  const v = String(f);
  if (root.style.getPropertyValue("--fs") !== v) root.style.setProperty("--fs", v);
  try { if (localStorage.getItem("ayk_fs") !== v) localStorage.setItem("ayk_fs", v); } catch (e) {}   // açılışta yanıp sönmesin (markup <head>)
  document.querySelectorAll("[data-fs-opt]").forEach(b => { const on = b.dataset.fsOpt === (state.settings.textSize || "system"); b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
}

function setTextSize(k) {
  state.settings.textSize = k === "system" || TEXT_SIZES[k] ? k : "system";
  applyTextSize();
  renderAll();
}

// iPhone'un yazı ayarı uygulama arka plandayken değişebilir: dönüşte yeniden ölç
function onSystemTextSize() { sysTextScale = null; try { if (storeReady) applyTextSize(); } catch (e) {} }
document.addEventListener("visibilitychange", () => { if (!document.hidden) onSystemTextSize(); });
window.addEventListener("pageshow", onSystemTextSize);

Object.assign(EN, {
  "Yazı boyutu": "Text size",
  "Sistem: iPhone'daki Metin Boyutu ayarına uyar.": "System: follows your iPhone's Text Size setting.",
  "Normal": "Normal", "Büyük": "Large",
  "En büyük": "Largest",
});
