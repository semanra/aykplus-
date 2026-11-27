// ============================================================================
// v86 (Aşama B) — iPhone uygulaması (Capacitor) yardımcıları.
// Web uygulamasında (GitHub Pages / ana ekran) isNative() false; buradaki her şey etkisiz kalır.
// Eklentilere npm/bundler olmadan erişilir: uygulamada window.Capacitor yerel köprü tarafından sayfaya eklenir.
// Testler window.Capacitor taklidiyle dener (tests/test_v86_uygulama.py).
// ============================================================================
function isNative() {
  try { return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); }
  catch (e) { return false; }
}
function capPlugin(name) {
  const C = window.Capacitor;
  if (!C) return null;
  if (C.Plugins && C.Plugins[name]) return C.Plugins[name];
  try { return C.registerPlugin ? C.registerPlugin(name) : null; } catch (e) { return null; }
}
// Uygulamanın içinden açılan sayfalar (gizlilik, destek) web adresinden Safari'de açılır; yerel dosyaya gidilirse geri dönüş yok
const WEB_BASE = "https://semanra.github.io/aykplus-/";
function appPageUrl(page) { return isNative() ? WEB_BASE + page : page; }

// ---------------------------------------------------------------------------
// Dosya paylaşma (yedek, CSV, paylaşım kartı): WKWebView'da <a download> çalışmaz →
// dosya önbellek klasörüne yazılır, iPhone'un paylaş menüsü açılır ("Dosyalar'a Kaydet", AirDrop…).
// Dönüş: "shared" | "aborted" | "failed" (saveTextFile ile aynı sözleşme)
// ---------------------------------------------------------------------------
function nativeSafeName(name) { return String(name || "AYK").replace(/[\/\\:*?"<>|]/g, "-").slice(0, 120); }
async function nativeShareFile(name, data, { base64 = false, title = "" } = {}) {
  const FS = capPlugin("Filesystem"), SH = capPlugin("Share");
  if (!FS || !SH) return "failed";
  let uri;
  try {
    const opts = { path: nativeSafeName(name), data, directory: "CACHE" };
    if (!base64) opts.encoding = "utf8";
    uri = (await FS.writeFile(opts)).uri;
  } catch (e) { diagLog("dosya-yaz", e); return "failed"; }
  try { await SH.share({ title, files: [uri] }); return "shared"; }
  catch (e) {
    if (/cancel/i.test(String((e && e.message) || e))) return "aborted";
    diagLog("paylas", e); return "failed";
  }
}
async function nativeShareText(title, text) {
  const SH = capPlugin("Share");
  if (!SH) return "failed";
  try { await SH.share({ title, text }); return "shared"; }
  catch (e) { return /cancel/i.test(String((e && e.message) || e)) ? "aborted" : "failed"; }
}
function blobToBase64(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => { const s = String(r.result || ""); res(s.slice(s.indexOf(",") + 1)); };
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });
}

// ---------------------------------------------------------------------------
// Durum çubuğu: aydınlık temada koyu yazı, koyu temada açık yazı (web'de theme-color meta'sı yapıyor)
// ---------------------------------------------------------------------------
let nativeSbLight = null;
function nativeStatusBar(light) {
  if (!isNative() || nativeSbLight === light) return;
  const SB = capPlugin("StatusBar");
  if (!SB) return;
  nativeSbLight = light;
  try { Promise.resolve(SB.setStyle({ style: light ? "LIGHT" : "DARK" })).catch(() => {}); } catch (e) { /* yoksay */ }
}

// ---------------------------------------------------------------------------
// Parmakla yakınlaştırma (Profil → Ayarlar, settings.zoom; varsayılan kapalı).
// Çift dokunuş yakınlaştırması her durumda kapalı (body { touch-action: manipulation }).
// ---------------------------------------------------------------------------
function zoomViewport(on) {
  return "width=device-width, initial-scale=1.0, " + (on ? "maximum-scale=5.0" : "maximum-scale=1.0, user-scalable=no") + ", viewport-fit=cover";
}
function applyZoom() {
  const m = document.querySelector('meta[name="viewport"]');
  if (!m) return;
  const c = zoomViewport(!!(state && state.settings && state.settings.zoom));
  if (m.getAttribute("content") !== c) m.setAttribute("content", c);
}

// ---------------------------------------------------------------------------
// Tanılama günlüğü: Mac olmadan uygulamanın içini izleyemediğimiz için son hatalar telefonda tutulur
// (ayrı anahtar, en fazla 30 satır; kullanıcı verisine dokunmaz). Profil → Hakkında → "Tanılama bilgisi".
// ---------------------------------------------------------------------------
const DIAG_KEY = "ayk_tani";
const DIAG_MAX = 30;
function diagRead() {
  try { const a = JSON.parse(localStorage.getItem(DIAG_KEY) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; }
}
function diagLog(where, err) {
  try {
    const a = diagRead();
    // Safari'de err.stack mesajı içermez → mesaj + yığın birlikte (Chromium'da yığın mesajla başlar, tekrar yazılmaz)
    let m = String(err);
    if (err && typeof err === "object" && (err.message || err.stack)) {
      const msg = String(err.message || ""), st = String(err.stack || "");
      m = st.includes(msg) ? st : msg + (st ? " | " + st : "");
    }
    a.push({ t: Date.now(), w: String(where).slice(0, 40), m: String(m).slice(0, 400) });
    while (a.length > DIAG_MAX) a.shift();
    localStorage.setItem(DIAG_KEY, JSON.stringify(a));
  } catch (e) { /* yoksay */ }
}
window.addEventListener("error", e => diagLog("hata", (e && e.error) || (e && (e.message + " @" + (e.filename || "") + ":" + (e.lineno || 0)))));
window.addEventListener("unhandledrejection", e => diagLog("promise", e && e.reason));
function diagText() {
  const v = (document.querySelector("#pfFoot span") || {}).textContent || "";
  let head = [v, isNative() ? "app" : "web", "store:" + (typeof storeMode !== "undefined" ? storeMode : "?"), navigator.userAgent].join(" | ");
  head += "\n" + diagPerf();
  const lines = diagRead().map(x => new Date(x.t).toISOString().slice(0, 19) + " " + x.w + ": " + x.m.replace(/\s+/g, " "));
  return head + "\n" + (lines.length ? lines.join("\n") : "-");
}
// B12: besin listesinin (foods.js, ~1 MB) yüklenme süresi ve açılış süresi; iPhone'da ölçmek için
function diagPerf() {
  try {
    const f = performance.getEntriesByType("resource").find(e => /foods\.js/.test(e.name));
    const nav = performance.getEntriesByType("navigation")[0];
    const ms = x => (x > 0 ? Math.round(x) + " ms" : "?");
    return "foods.js: " + ms(f ? f.responseEnd - f.startTime : 0) + " | DOM: " + ms(nav ? nav.domContentLoadedEventEnd : 0) + " | boot: " + ms(window.aykBootMs || 0);
  } catch (e) { return "perf: ?"; }
}
async function openDiag() {
  const n = diagRead().length;
  const ok = await uiAsk({
    title: t("Tanılama bilgisi"),
    message: (n ? tn(n, "Son {n} hata kaydı var.") : t("Hata kaydı yok.")) + " " + t("Kopyalayıp sorunu anlatırken gönderebilirsin. Kişisel verin içinde yok."),
    ok: t("Kopyala|metin"), cancel: t("Kapat")
  });
  if (!ok) return;
  const done = await copyText(diagText());
  toast(done ? t("Kopyalandı") : t("Kopyalanamadı"), done ? "ok" : "error");
}
