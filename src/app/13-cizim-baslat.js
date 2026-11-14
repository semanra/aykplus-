// ---------------------------------------------------------------------------
// GENEL RENDER
// ---------------------------------------------------------------------------
// Bir kutuya yazıp başka bir kutuya dokunduğunda, sayfa yenilense bile
// dokunulan kutu odakta kalsın (klavye kapanmasın).
let pendingFocus = { key: "", at: 0 };
document.addEventListener("pointerdown", e => {
  const el = e.target && e.target.closest ? e.target.closest("[data-fk]") : null;
  pendingFocus = el ? { key: el.dataset.fk, at: Date.now() } : { key: "", at: 0 };
}, { capture: true, passive: true });

function restorePendingFocus() {
  if (!pendingFocus.key || Date.now() - pendingFocus.at > 800) return;
  const el = document.querySelector(`[data-fk="${pendingFocus.key}"]`);
  if (el && document.activeElement !== el) {
    el.focus();
    try { const v = el.value || ""; el.setSelectionRange(v.length, v.length); } catch (e) { /* yoksay */ }
  }
}

function renderAll() {
  invalidateFoodDB();
  refreshFoodSnaps();
  applyCustomIcon();
  applyTabVisibility();
  // v34: yalnızca açık sekme çizilir (sekme değişimi switchTab → renderAll ile yeni sekmeyi çizer)
  const tab = state.activeTab;
  if (tab === "nutrition") renderNutrition();
  else if (tab === "gym") renderGym();
  else if (tab === "mobility") renderMobility();
  else if (tab === "progress") renderProgress();
  if (profileIsOpen()) renderProfile();
  renderBanner();
  saveState();
  restorePendingFocus();
}

// ---------------------------------------------------------------------------
// BAŞLAT
// ---------------------------------------------------------------------------
(function hideSplash() {
  const sp = document.getElementById("splash");
  if (!sp) return;
  if (state.settings.splash === false) { sp.remove(); return; }
  setTimeout(() => { if (sp.parentNode) sp.remove(); }, 1300);
})();
checkNewDay();
autoSelectNextDay();
if (workoutInProgress()) { state.gymActive = true; state.gymView = "today"; }
resetTimerUI();
resumeTimer();   // v36
renderAll();
updateWakeLock();
setTimeout(checkFoodHealth, 1500);
setTimeout(checkStorageWarn, 2500);   // v36
if (loadFailed) setTimeout(() => toast("Kayıtlı veriler okunamadı. Okunamayan hâli saklandı: Profil → Yedekleme'den indirebilir veya geri yüklemeyi deneyebilirsin.", "error"), 300);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    if (checkNewDay()) { autoSelectNextDay(); renderAll(); }
    if (timer.running) tickTimer();
    if (mobT) mobTimerTick();
    updateWakeLock();
  }
});

// v36: uygulama gece yarısı ekranda açık kalırsa da gün değişsin (eskiden yalnızca açılışta / uygulamaya dönüşte bakılıyordu;
// 00:05'te içilen su önceki güne yazılıyordu). Yarım dakikada bir, yalnızca ekran görünürken.
setInterval(() => { if (document.visibilityState === "visible" && checkNewDay()) { autoSelectNextDay(); renderAll(); } }, 30000);

try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* yoksay */ }
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
