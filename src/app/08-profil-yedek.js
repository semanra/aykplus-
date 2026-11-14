// ---------------------------------------------------------------------------
// AYARLAR
// ---------------------------------------------------------------------------
// Profil sayfası (eski Ayarlar penceresinin yerini aldı). Alan kimlikleri (setAge, setBf, ...) aynı kaldı.
const PF_FIELDS = ["setSex", "setAge", "setHeight", "pfWeight", "setTarget", "setWater", "setWaterAuto", "setBf", "setTargetBf", "setRest", "setSound", "setAwake", "setSplash", "setDayStart"];
let pfSnap = "";
function profileIsOpen() { const el = $("profilePage"); return !!el && !el.classList.contains("hidden"); }
function pfValues() { return JSON.stringify(PF_FIELDS.map(id => { const el = $(id); return el.type === "checkbox" ? el.checked : el.value; })); }
function fillProfileFields() {
  const st = state.settings;
  $("setSex").value = st.sex;
  $("setAge").value = st.age;
  $("setHeight").value = st.height;
  $("pfWeight").value = fmtNum(num(state.weight, 0));
  $("setTarget").value = fmtNum(num(st.targetWeight, 82));
  $("setWater").value = fmtNum(num(st.waterTarget, 3.5));
  $("setWaterAuto").checked = st.waterAuto !== false;
  updateWaterAutoHint();
  $("setBf").value = validBf(st.bodyFat) ? fmtNum(validBf(st.bodyFat)) : "";
  $("setTargetBf").value = validBf(st.targetBodyFat) ? fmtNum(validBf(st.targetBodyFat)) : "";
  $("setRest").value = st.restSec;
  $("setSound").checked = !!st.sound;
  $("setAwake").checked = !!st.keepAwake;
  $("setSplash").checked = st.splash !== false;
  $("setDayStart").value = String(dayStartHour());
  updateBfHint();
  pfSnap = pfValues();
}
function openProfile() {
  fillProfileFields();
  $("backupText").value = JSON.stringify(state);
  renderProfile();
  const el = $("profilePage");
  el.classList.remove("hidden"); el.classList.add("flex");
  document.body.classList.add("pf-open", "pf-page");
  $("pfScroll").scrollTop = 0;
}
const openSettings = openProfile;
function hideProfile() {
  const el = $("profilePage");
  el.classList.add("hidden"); el.classList.remove("flex");
  document.body.classList.remove("pf-open", "pf-page");
}
async function closeProfile() {
  if (profileIsOpen() && pfValues() !== pfSnap) {
    const r = await uiAsk({ title: "Değişiklikler kaydedilmedi", message: "Profilde yaptığın değişiklikler kaydedilsin mi?", ok: "Kaydet", cancel: "Kaydetmeden çık", dismissable: false });
    if (r) { saveSettings(); return; }
  }
  hideProfile();
}
function closeSettings() { hideProfile(); }

function renderProfile() {
  document.querySelectorAll("[data-theme-opt]").forEach(b => { const on = b.dataset.themeOpt === state.settings.theme; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
  renderMissList();
  // Kilo kayıtları
  const wl = state.weightLogs.filter(l => num(l.weight) > 0);
  const lastW = wl[wl.length - 1], firstW = wl[0];
  const tW = num(state.settings.targetWeight, 0);
  const left = round1(num(state.weight) - tW);
  let wh = "";
  if (wl.length) {
    const d = round1(num(lastW.weight) - num(firstW.weight));
    wh += `<div class="grid grid-cols-3 gap-2">
      <div class="bg-[var(--t-elev)] rounded-2xl px-3 py-2.5"><div class="text-[12px] t-muted">Son tartı</div><div class="t-display text-[22px]">${fmtNum(num(lastW.weight))}<span class="t-dim text-sm"> kg</span></div><div class="text-[12px] t-dim">${esc(lastW.ts ? fmtDate(lastW.ts) : lastW.date || "")}</div></div>
      <div class="bg-[var(--t-elev)] rounded-2xl px-3 py-2.5"><div class="text-[12px] t-muted">Değişim</div><div class="t-display text-[22px] ${d < 0 ? "t-accent" : ""}">${d > 0 ? "+" : ""}${fmtNum(d)}<span class="t-dim text-sm"> kg</span></div><div class="text-[12px] t-dim">${wl.length} kayıt</div></div>
      <div class="bg-[var(--t-elev)] rounded-2xl px-3 py-2.5"><div class="text-[12px] t-muted">Hedefe</div><div class="t-display text-[22px]">${tW ? fmtNum(Math.abs(left)) : "—"}<span class="t-dim text-sm"> kg</span></div><div class="text-[12px] t-dim">${!tW ? "hedef yok" : left > 0 ? "verilecek" : left < 0 ? "alınacak" : "hedeftesin"}</div></div>
    </div>`;
    const rows = wl.slice(-4).reverse().map(l => `<div class="flex items-center justify-between min-h-[40px] border-t border-[var(--t-line)] first:border-t-0 text-[14px]"><span class="t-muted">${esc(l.ts ? fmtDate(l.ts, true) : l.date || "")}</span><span class="font-semibold">${fmtNum(num(l.weight))} kg${validBf(l.bf) ? ` <span class="t-dim text-[12px]">· %${fmtNum(validBf(l.bf))} yağ</span>` : ""}</span></div>`).join("");
    wh += `<div class="mt-2">${rows}</div>`;
  } else {
    wh = `<p class="text-[13px] t-dim">Henüz tartı kaydın yok. Kilonu yazıp "Tartıyı kaydet"e dokun; ilerlemen İlerleme sekmesinde grafiğe dönüşür.</p>`;
  }
  $("pfWeightBox").innerHTML = wh;
  // Günlük hedefler (hesaplanan)
  const t = getTargets();
  $("pfTargetsBox").innerHTML = `<div class="grid grid-cols-4 gap-1.5 text-center">
    ${[["Kalori", Math.round(t.calTarget).toLocaleString("tr-TR"), "kcal"], ["Protein", Math.round(t.proTarget), "g"], ["Karb", Math.round(t.carbTarget), "g"], ["Yağ", Math.round(t.fatTarget), "g"]].map(([l, v, u]) => `<div class="bg-[var(--t-elev)] rounded-2xl px-1 py-2.5"><div class="text-[12px] t-muted">${l}</div><div class="t-display text-[19px] leading-tight">${isFinite(v) ? v : "—"}</div><div class="text-[10px] t-dim">${u}</div></div>`).join("")}
  </div><p class="text-[12px] t-dim mt-2">Bugünün hedefleri: bu bilgilerden, gün tipinden (antrenman/dinlenme) ve Beslenme sekmesindeki açık ayarından hesaplanır.</p>`;
  // Vücut ölçüleri
  const ms = state.measurements;
  const lastOf = k => { for (let i = ms.length - 1; i >= 0; i--) if (ms[i][k] != null) return ms[i]; return null; };
  const firstOf = k => ms.find(m => m[k] != null);
  const cells = MEASURES.map(([k, n, lowerBetter]) => {
    const l = lastOf(k);
    if (!l) return "";
    const d = round1(l[k] - firstOf(k)[k]);
    const good = d === 0 ? null : (lowerBetter ? d < 0 : d > 0);
    return `<div class="bg-[var(--t-surface)] border border-[var(--t-line)] rounded-2xl px-3 py-2.5 min-w-0">
      <div class="text-[12px] t-muted truncate">${n}</div>
      <div class="t-display text-[22px]">${fmtNum(l[k])}<span class="t-dim text-sm"> cm</span></div>
      <div class="text-[12px] ${good == null ? "t-dim" : good ? "t-accent" : "text-[var(--t-danger-text)]"}">${d === 0 ? "değişim yok" : (d > 0 ? "+" : "") + fmtNum(d) + " cm"}</div>
    </div>`;
  }).join("");
  const lastM = ms[ms.length - 1];
  $("pfMeasureBox").innerHTML = cells
    ? `<div class="grid grid-cols-3 gap-2">${cells}</div><p class="text-[12px] t-dim mt-2">Son ölçüm: ${esc(fmtDate(lastM.ts, true))} · Değişim ilk ölçüne göre. Grafik İlerleme sekmesinde.</p>`
    : `<div class="t-card rounded-[22px] p-4 text-[13px] t-dim">Henüz ölçü eklemedin. Kilo yerinde sayarken belin inceliyorsa yağ yakıp kas kazanıyorsun demektir. İlk ölçünü eklemek için "+ Ölçü ekle"ye dokun.</div>`;
  $("lastBackupText").textContent = state.lastBackupAt
    ? `Son yedek: ${fmtDate(state.lastBackupAt, true)} (${Math.floor((Date.now() - state.lastBackupAt) / DAY_MS)} gün önce)`
    : "Henüz yedek alınmadı. Verilerin sadece bu telefonda duruyor; düzenli yedek almanı öneririm.";
}

// v24: "Su hedefi kiloya göre" açıkken elle hedef kutusu pasif, hesap açıklamada
function updateWaterAutoHint() {
  const on = $("setWaterAuto").checked, a = waterAutoInfo(readProfileWeight() || state.weight);
  $("setWater").disabled = on && !!a;
  $("setWater").classList.toggle("opacity-50", on && !!a);
  $("setWaterHint").textContent = on
    ? (a ? `${fmtNum(a.w)} kg × 35 ml = ${fmtNum(a.base)} L${a.cr ? " + 0,5 L kreatin" : ""} → ${fmtNum(a.total)} L` : "Kilo girilince hesaplanır; şimdilik elle yazdığın hedef kullanılır.")
    : "Kapalı: yukarıda elle yazdığın hedef kullanılır.";
}
function readProfileWeight() {
  const raw = $("pfWeight").value.trim();
  const w = round1(num(raw, 0));
  return w >= 30 && w <= 300 ? w : 0;
}
function profileLogWeight() {
  const w = readProfileWeight();
  if (!w) { uiAlert("Kilo geçersiz", "Kilonu 30 ile 300 kg arasında yaz (örn: 98,4)."); return; }
  state.weight = w;
  logCurrentWeight();
  $("pfWeight").value = fmtNum(w);
  pfSnap = pfValues();
}

function saveSettings() {
  const st = state.settings;
  const bfRaw = $("setBf").value.trim(), tbfRaw = $("setTargetBf").value.trim();
  if ((bfRaw && !validBf(bfRaw)) || (tbfRaw && !validBf(tbfRaw))) { uiAlert("Yağ oranı geçersiz", "Yağ oranı %3 ile %60 arasında olmalı (bilmiyorsan boş bırak)."); return; }
  const wRaw = $("pfWeight").value.trim();
  const w = readProfileWeight();
  if (wRaw && !w) { uiAlert("Kilo geçersiz", "Kilonu 30 ile 300 kg arasında yaz (örn: 98,4)."); return; }
  st.sex = $("setSex").value === "female" ? "female" : "male";
  st.age = Math.max(12, Math.min(99, Math.round(num($("setAge").value, st.age))));
  st.height = Math.max(120, Math.min(230, Math.round(num($("setHeight").value, st.height))));
  st.targetWeight = Math.max(30, Math.min(250, round1(num($("setTarget").value, st.targetWeight))));
  st.waterTarget = Math.max(0.5, Math.min(10, round1(num($("setWater").value, st.waterTarget))));
  st.waterAuto = $("setWaterAuto").checked;
  st.restSec = Math.max(10, Math.min(900, Math.round(num($("setRest").value, st.restSec))));
  st.bodyFat = bfRaw ? round1(validBf(bfRaw)) : "";
  st.targetBodyFat = tbfRaw ? round1(validBf(tbfRaw)) : "";
  st.sound = $("setSound").checked;
  st.keepAwake = $("setAwake").checked;
  st.splash = $("setSplash").checked;
  st.dayStartHour = Math.max(0, Math.min(5, parseInt($("setDayStart").value, 10) || 0));
  if (w) state.weight = w;
  if (!timer.running) resetTimerUI();
  pfSnap = pfValues();
  hideProfile();
  toast("Profil kaydedildi");
  renderAll();
  updateWakeLock();
}

// Bağlama göre onay: profil/antrenman ekranında temalı pencere, diğer yerlerde sistem kutusu.
async function askConfirm(title, message, ok = "Devam et", danger = false) {
  if (trainCtx() || nutriCtx()) return !!(await uiAsk({ title, message, ok, danger }));
  return confirm(message);
}

// ---------------------------------------------------------------------------
// YEDEKLEME
// ---------------------------------------------------------------------------
function markBackup() { state.lastBackupAt = Date.now(); state.backupSnoozeUntil = 0; saveState(); renderBanner(); }

async function exportBackupFile() {
  const json = JSON.stringify(state);
  const name = `AYK-yedek-${todayStr()}.json`;
  let file = null;
  try { file = new File([json], name, { type: "application/json" }); } catch (e) { file = null; }
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "AYK+ Yedek" });
      markBackup();
      toast("Yedek paylaşıldı. 'Dosyalar'a Kaydet'i seçtiysen güvende.");
      return;
    } catch (e) {
      if (e && e.name === "AbortError") return;
    }
  }
  try {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    markBackup();
    toast("Yedek dosyası indirildi");
  } catch (e) {
    toast("Dosya oluşturulamadı. Ayarlar > Yedek kodu ile kopyala.", "error");
  }
}

async function restoreFromText(text) {
  let parsed;
  try { parsed = JSON.parse(String(text || "").trim()); } catch (e) { sayAlert("Geçersiz yedek", "Geçersiz yedek! Dosya veya kod bozuk görünüyor."); return false; }
  if (parsed && parsed.state && (parsed.state.meals || parsed.state.workoutDays)) parsed = parsed.state;
  if (!parsed || typeof parsed !== "object" || !(parsed.meals || parsed.workoutDays)) { sayAlert("Yedek tanınmadı", "Bu bir AYK+ yedeği değil."); return false; }
  if (!(await askConfirm("Yedek geri yüklensin mi?", "Mevcut tüm verilerin bu yedekle DEĞİŞTİRİLECEK. Devam edilsin mi?", "Geri yükle", true))) return false;
  let next;
  try { next = normalizeState(parsed); } catch (e) { console.error(e); sayAlert("Yedek okunamadı", "Yedek dosyası bozuk görünüyor; mevcut verilerin değiştirilmedi."); return false; }
  state = next;
  state.lastBackupAt = state.lastBackupAt || Date.now();
  checkNewDay();
  closeSettings();
  renderAll();
  toast("Yedek başarıyla geri yüklendi");
  return true;
}

function importBackupFile(event) {
  const file = event.target.files[0];
  event.target.value = "";
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => restoreFromText(e.target.result);
  reader.onerror = () => sayAlert("Dosya okunamadı", "Dosya okunamadı.");
  reader.readAsText(file);
}

async function copyBackup() {
  const txt = $("backupText");
  txt.value = JSON.stringify(state);
  let ok = false;
  try { await navigator.clipboard.writeText(txt.value); ok = true; } catch (e) {
    try { txt.focus(); txt.select(); ok = document.execCommand("copy"); } catch (e2) { ok = false; }
  }
  if (ok) { markBackup(); toast("Yedek kodu kopyalandı. Notlar'a yapıştırıp sakla."); }
  else toast("Kopyalanamadı. Kutudaki metni elle seçip kopyala.", "error");
}

function restoreBackupFromText() { restoreFromText($("backupText").value); }

async function resetToDefaults() {
  if (!(await askConfirm("Fabrika ayarlarına sıfırla", "TÜM veriler silinip başlangıç ayarlarına dönülecek. Emin misin?", "Devam et", true))) return;
  if (!(await askConfirm("Son onay", "Bu işlem geri alınamaz. Önce yedek almanı öneririm. Sıfırlansın mı?", "Sıfırla", true))) return;
  state = normalizeState({});
  state.today = logicalToday();
  closeSettings();
  stopTimer();
  renderAll();
  toast("Uygulama sıfırlandı");
}

function hasMeaningfulData() {
  return state.workoutLogs.length > 0 || state.weightLogs.length > 1 || Object.keys(state.customFoods).length > 0 || Object.keys(state.dailyLogs).length > 2;
}
function renderBanner() {
  const ref = state.lastBackupAt || state.createdAt || Date.now();
  const days = Math.floor((Date.now() - ref) / DAY_MS);
  const need = hasMeaningfulData() && days >= 7 && Date.now() > (state.backupSnoozeUntil || 0);
  $("backupBanner").classList.toggle("hidden", !need);
  $("backupDot").classList.toggle("hidden", !(hasMeaningfulData() && days >= 7));
  if (need) $("backupBannerText").textContent = state.lastBackupAt ? `Son yedeğin ${days} gün önce. Verilerini korumak için yedekle.` : "Henüz hiç yedek almadın. Verilerin sadece bu telefonda.";
}
function snoozeBackup() { state.backupSnoozeUntil = Date.now() + 3 * DAY_MS; saveState(); renderBanner(); }

