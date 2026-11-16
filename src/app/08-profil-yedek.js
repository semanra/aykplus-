// ---------------------------------------------------------------------------
// AYARLAR
// ---------------------------------------------------------------------------
// Profil sayfası (eski Ayarlar penceresinin yerini aldı). Alan kimlikleri (setAge, setBf, ...) aynı kaldı.
const PF_FIELDS = ["setSex", "setAge", "setHeight", "pfWeight", "setTarget", "setActivity", "setProtein", "setWater", "setWaterAuto", "setBf", "setTargetBf", "setRest", "setSound", "setAwake", "setWarmup", "setMobVoice", "setSplash", "setDayStart"];
function profileIsOpen() { const el = $("profilePage"); return !!el && !el.classList.contains("hidden"); }
function fillProfileFields() {
  const st = state.settings;
  $("setSex").value = st.sex;
  $("setAge").value = st.age;
  $("setHeight").value = st.height;
  $("pfWeight").value = fmtNum(num(state.weight, 0));
  $("setTarget").value = fmtNum(num(st.targetWeight, 82));
  $("setActivity").value = ["low", "mid", "high"].includes(st.activity) ? st.activity : "mid";
  $("setProtein").value = st.proteinHigh === true ? "high" : "std";
  $("setWater").value = fmtNum(num(st.waterTarget, 3.5));
  $("setWaterAuto").checked = st.waterAuto !== false;
  updateWaterAutoHint();
  $("setBf").value = validBf(st.bodyFat) ? fmtNum(validBf(st.bodyFat)) : "";
  $("setTargetBf").value = validBf(st.targetBodyFat) ? fmtNum(validBf(st.targetBodyFat)) : "";
  $("setRest").value = st.restSec;
  $("setSound").checked = !!st.sound;
  $("setAwake").checked = !!st.keepAwake;
  $("setWarmup").checked = st.warmupCard !== false;
  $("setMobVoice").checked = st.mobVoice === true;
  $("setSplash").checked = st.splash !== false;
  $("setDayStart").value = String(dayStartHour());
  updateBfHint();
}
const PRIVACY_NOTE = "Verilerin yalnızca bu telefonda. Barkod okuttuğunda yalnızca barkod numarası Open Food Facts'e gönderilir.";
const LICENSES = ["Barlow Condensed (SIL OFL 1.1)", "@zxing/library (Apache-2.0)", "Open Food Facts verisi (ODbL; ürün verisi katkıcılara ait)", "USDA FoodData Central (kamu malı / CC0)", "Tailwind CSS (MIT)", "Vücut haritası görseli (uygulama sahibinin kendi görseli)"];
const METHOD_SOURCES = ["Mifflin ve ark. (1990), Mifflin-St Jeor denklemi", "Katch-McArdle denklemi (yağsız kütleye dayalı)", "Morton ve ark. 2018, Br J Sports Med (protein ve kas)", "Nunes ve ark. 2022, J Cachexia Sarcopenia Muscle (protein ve kas)", "ISSN Pozisyon Bildirisi 2017 (Jäger ve ark.)", "Helms ve ark. 2014 (kilo verirken protein)", "Iraki ve ark. 2019 (kilo alırken beslenme)", "Joslin Klinik Beslenme Rehberi", "AMDR: yağ kalorinin %20–35'i", "Whittaker ve Wu 2021 (bazal metabolizma denklemleri)"];
function renderAbout() {
  const en = curLang() === "en";
  const dec = (n, d) => n.toFixed(d).replace(".", en ? "." : ",");   // ondalık ayırıcı dile göre (Türkçe "1,55", İngilizce "1.55")
  const A = ACTIVITY_MULT, G = GAIN_PACE;
  const li = x => "<li>" + esc(t(x)) + "</li>";
  $("pfAboutHealth").textContent = t(HEALTH_NOTE);
  $("pfAboutPrivacy").textContent = t(PRIVACY_NOTE);
  $("pfMethodBody").innerHTML = [
    "<p><b>" + t("Günlük harcama.") + "</b> " + t("Dinlenirken harcadığın enerji Mifflin-St Jeor denklemiyle bulunur. Yağ oranını girdiysen bunun yerine yağsız kütleye dayalı Katch-McArdle denklemi kullanılır. Sonra hareketlilik çarpanıyla çarpılır.") + "</p>",
    "<p><b>" + t("Hareketlilik çarpanları") + "</b> " + t("(antrenman günü · dinlenme günü): az hareketli {l0} · {l1}, orta {m0} · {m1}, çok hareketli {h0} · {h1}.", {
      l0: dec(A.low[0], 2), l1: dec(A.low[1], 2), m0: dec(A.mid[0], 2), m1: dec(A.mid[1], 2), h0: dec(A.high[0], 2), h1: dec(A.high[1], 2) }) + "</p>",
    "<p><b>" + t("Hedef kalori.") + "</b> " + t("Kilo verirken seçtiğin açık kadar düşülür. Kilo alırken harcamanın %{s} (yavaş), %{m} (orta) ya da %{f} (hızlı) kadarı eklenir. Korurken harcamana eşittir. Hedef kalori güvenli alt sınırın altına inmez: kadında {kadin}, erkekte {erkek} kcal.", {
      s: String(Math.round(G.slow * 100)), m: String(Math.round(G.mid * 100)), f: String(Math.round(G.fast * 100)), kadin: en ? "1,400" : "1.400", erkek: en ? "1,750" : "1.750" }) + "</p>",
    "<p><b>" + t("Protein.") + "</b> " + t("Kilo başına hesaplanır. Hesapta kullanılan kilo, mevcut kilonla hedef kilonun küçüğüdür; böylece kilolu biri gereğinden fazla protein almaz.") + "</p>",
    "<ul class=\"list-disc pl-4 space-y-1\"><li>" + t("Kilo verirken: yağ oranın biliniyorsa yağsız kütlenin her kilosu için {a} g, bilinmiyorsa {b} g.", { a: dec(2.5, 1), b: dec(2.2, 1) }) + "</li><li>"
      + t("Kilo korurken: {a} g.", { a: dec(1.6, 1) }) + "</li><li>" + t("Kilo alırken: {a} g.", { a: dec(1.8, 1) }) + "</li></ul>",
    "<p>" + t("Toplam, mevcut kilonun {a} katını geçmez. \"Yüksek\" seçeneğini açarsan en az mevcut kilonun 2 katı olur.", { a: dec(2.2, 1) }) + "</p>",
    "<p><b>" + t("Yağ ve karbonhidrat.") + "</b> " + t("Yağ kalorinin %25'i, karbonhidrat kalan kaloridir; en az 60 g olur.") + "</p>",
    "<p>" + t("Bunlar ortalama kişiler için tahminlerdir; kendi sonuçlarına göre ayarla.") + "</p>",
    "<p class=\"font-semibold text-[var(--t-text)]\">" + t("Kaynaklar") + "</p>",
    "<ul class=\"list-disc pl-4 space-y-1\">" + METHOD_SOURCES.map(li).join("") + "</ul>"
  ].join("");
  $("pfLicList").innerHTML = LICENSES.map(li).join("");
}
function openProfile() {
  fillProfileFields();
  renderAbout();
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
// v42: Profil otomatik kaydeder (alan kutudan çıkınca); "Kaydet" düğmesi ve "kaydedilmedi" uyarısı yok.
async function closeProfile() {
  const a = document.activeElement;
  if (a && a.blur && $("profilePage").contains(a)) a.blur();   // yazılmakta olan alan önce kaydedilsin
  hideProfile();
}
function closeSettings() { hideProfile(); }

function renderProfile() {
  $("pfRescue").classList.toggle("hidden", !rescueText());   // v35
  renderStorageMeter();   // v36
  document.querySelectorAll("[data-theme-opt]").forEach(b => { const on = b.dataset.themeOpt === state.settings.theme; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
  const lr = $("pfLang"); if (lr) lr.classList.toggle("hidden", !langAvailable());   // v46
  document.querySelectorAll("[data-lang-opt]").forEach(b => { const on = b.dataset.langOpt === curLang(); b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
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
      <div class="bg-[var(--t-elev)] rounded-2xl px-3 py-2.5"><div class="text-[12px] t-muted">${t("Son tartı")}</div><div class="t-display text-[22px]">${fmtNum(num(lastW.weight))}<span class="t-dim text-sm"> kg</span></div><div class="text-[12px] t-dim">${esc(lastW.ts ? fmtDate(lastW.ts) : logDateLabel(lastW.date || ""))}</div></div>
      <div class="bg-[var(--t-elev)] rounded-2xl px-3 py-2.5"><div class="text-[12px] t-muted">${t("Değişim")}</div><div class="t-display text-[22px] ${d < 0 ? "t-accent" : ""}">${d > 0 ? "+" : ""}${fmtNum(d)}<span class="t-dim text-sm"> kg</span></div><div class="text-[12px] t-dim">${tn(wl.length, "{n} kayıt")}</div></div>
      <div class="bg-[var(--t-elev)] rounded-2xl px-3 py-2.5"><div class="text-[12px] t-muted">${t("Hedefe")}</div><div class="t-display text-[22px]">${tW ? fmtNum(Math.abs(left)) : "—"}<span class="t-dim text-sm"> kg</span></div><div class="text-[12px] t-dim">${!tW ? t("hedef yok") : left > 0 ? t("verilecek") : left < 0 ? t("alınacak") : t("hedeftesin")}</div></div>
    </div>`;
    const rows = wl.slice(-4).reverse().map(l => `<div class="flex items-center justify-between min-h-[40px] border-t border-[var(--t-line)] first:border-t-0 text-[14px]"><span class="t-muted">${esc(l.ts ? fmtDate(l.ts, true) : logDateLabel(l.date || ""))}</span><span class="font-semibold">${fmtNum(num(l.weight))} kg${validBf(l.bf) ? ` <span class="t-dim text-[12px]">${t("· %{p} yağ", { p: fmtNum(validBf(l.bf)) })}</span>` : ""}</span></div>`).join("");
    wh += `<div class="mt-2">${rows}</div>`;
  } else {
    wh = `<p class="text-[13px] t-dim">${t("Henüz tartı kaydın yok. Kilonu yazıp \"Tartıyı kaydet\"e dokun; ilerlemen İlerleme sekmesinde grafiğe dönüşür.")}</p>`;
  }
  $("pfWeightBox").innerHTML = wh;
  // Günlük hedefler (hesaplanan)
  const tg = getTargets();
  $("pfTargetsBox").innerHTML = `<div class="grid grid-cols-4 gap-1.5 text-center">
    ${[["Kalori", Math.round(tg.calTarget), "kcal", true], ["Protein", Math.round(tg.proTarget), "g"], ["Karb", Math.round(tg.carbTarget), "g"], ["Yağ", Math.round(tg.fatTarget), "g"]].map(([l, v, u, loc]) => `<div class="bg-[var(--t-elev)] rounded-2xl px-1 py-2.5"><div class="text-[12px] t-muted">${t(l)}</div><div class="t-display text-[19px] leading-tight">${isFinite(v) ? (loc ? v.toLocaleString(locale()) : v) : "—"}</div><div class="text-[11px] t-dim">${u}</div></div>`).join("")}
  </div><p class="text-[12px] t-dim mt-2">${t("Bugünün hedefleri: bu bilgilerden, gün tipinden (antrenman/dinlenme), hedefinden (Ver/Koru/Al), hareketlilik ve protein seçiminden hesaplanır.")}</p>`;
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
      <div class="text-[12px] t-muted truncate">${t(n)}</div>
      <div class="t-display text-[22px]">${fmtNum(l[k])}<span class="t-dim text-sm"> cm</span></div>
      <div class="text-[12px] ${good == null ? "t-dim" : good ? "t-accent" : "text-[var(--t-danger-text)]"}">${d === 0 ? t("değişim yok") : (d > 0 ? "+" : "") + fmtNum(d) + " cm"}</div>
    </div>`;
  }).join("");
  const lastM = ms[ms.length - 1];
  $("pfMeasureBox").innerHTML = cells
    ? `<div class="grid grid-cols-3 gap-2">${cells}</div><p class="text-[12px] t-dim mt-2">${esc(t("Son ölçüm: {d} · Değişim ilk ölçüne göre. Grafik İlerleme sekmesinde.", { d: fmtDate(lastM.ts, true) }))}</p>`
    : `<div class="t-card rounded-[22px] p-4 text-[13px] t-dim">${t("Henüz ölçü eklemedin. Kilo yerinde sayarken belin inceliyorsa yağ yakıp kas kazanıyorsun demektir. İlk ölçünü eklemek için \"+ Ölçü ekle\"ye dokun.")}</div>`;
  $("lastBackupText").textContent = state.lastBackupAt
    ? tn(Math.floor((Date.now() - state.lastBackupAt) / DAY_MS), "Son yedek: {d} ({n} gün önce)", { d: fmtDate(state.lastBackupAt, true) })
    : t("Henüz yedek alınmadı. Verilerin sadece bu telefonda duruyor; düzenli yedek almanı öneririm.");
}

// v24: "Su hedefi kiloya göre" açıkken elle hedef kutusu pasif, hesap açıklamada
function updateWaterAutoHint() {
  const on = $("setWaterAuto").checked, a = waterAutoInfo(readProfileWeight() || state.weight);
  $("setWater").disabled = on && !!a;
  $("setWater").classList.toggle("opacity-50", on && !!a);
  $("setWaterHint").textContent = on
    ? (a ? t(a.cr ? "{w} kg × 35 ml = {b} L + 0,5 L kreatin → {tot} L" : "{w} kg × 35 ml = {b} L → {tot} L", { w: fmtNum(a.w), b: fmtNum(a.base), tot: fmtNum(a.total) }) : t("Kilo girilince hesaplanır; şimdilik elle yazdığın hedef kullanılır."))
    : t("Kapalı: yukarıda elle yazdığın hedef kullanılır.");
}
function readProfileWeight() {
  const raw = $("pfWeight").value.trim();
  const w = round1(num(raw, 0));
  return w >= 30 && w <= 300 ? w : 0;
}
function profileLogWeight() {
  const w = readProfileWeight();
  if (!w) { uiAlert(t("Kilo geçersiz"), t("Kilonu 30 ile 300 kg arasında yaz (örn: 98,4).")); return; }
  state.weight = w;
  logCurrentWeight();
  $("pfWeight").value = fmtNum(w);
}

// v42: OTOMATİK KAYIT. Alan değişince (yazı kutusunda kutudan çıkınca; anahtar/seçimde hemen) bütün profil alanları
// doğrulanıp kaydedilir. Sınırlar eskisi gibi (yaş 12–99, boy 120–230 …). Geçersiz yağ oranı / kilo kaydedilmez, eski değer
// geri yazılır (kilo kutusu olduğu gibi kalır, kaydedilmez). Her kayıtta "Kaydedildi · Geri al". Kilo kutusu yalnızca güncel kiloyu değiştirir; tartı geçmişine ayrı düğme yazar.
function profileAutoSaveInit() {
  const det = $("pfSnaps") && $("pfSnaps").closest("details");   // v41: iç yedek listesi yalnızca açılınca okunur
  if (det && !det.dataset.snapInit) { det.dataset.snapInit = "1"; det.addEventListener("toggle", () => { if (det.open) renderSnapList(); }); }
  PF_FIELDS.forEach(id => { const el = $(id); if (el && !el.dataset.autosave) { el.dataset.autosave = "1"; el.addEventListener("change", () => applyProfileFields(id)); } });
}
function applyProfileFields(changedId) {
  const st = state.settings;
  const bfRaw = $("setBf").value.trim(), tbfRaw = $("setTargetBf").value.trim();
  if ((bfRaw && !validBf(bfRaw)) || (tbfRaw && !validBf(tbfRaw))) {
    $("setBf").value = validBf(st.bodyFat) ? fmtNum(validBf(st.bodyFat)) : "";
    $("setTargetBf").value = validBf(st.targetBodyFat) ? fmtNum(validBf(st.targetBodyFat)) : "";
    updateBfHint();
    toast(t("Yağ oranı %3 ile %60 arasında olmalı; eski değer geri geldi."), "error");
    return false;
  }
  const wRaw = $("pfWeight").value.trim(), w = readProfileWeight();
  if (wRaw && !w) {   // kutu olduğu gibi kalır ("Tartıyı kaydet" de bu değeri reddeder); kayıtlı kilo değişmez
    toast(t("Kilo 30 ile 300 kg arasında olmalı; kaydedilmedi."), "error");
    return false;
  }
  const before = JSON.stringify([state.settings, state.weight]);
  const undo = JSON.stringify(state);
  st.sex = $("setSex").value === "female" ? "female" : "male";
  st.age = Math.max(12, Math.min(99, Math.round(num($("setAge").value, st.age))));
  st.height = Math.max(120, Math.min(230, Math.round(num($("setHeight").value, st.height))));
  st.targetWeight = Math.max(30, Math.min(250, round1(num($("setTarget").value, st.targetWeight))));
  st.activity = ["low", "mid", "high"].includes($("setActivity").value) ? $("setActivity").value : "mid";
  st.proteinHigh = $("setProtein").value === "high";
  st.waterTarget = Math.max(0.5, Math.min(10, round1(num($("setWater").value, st.waterTarget))));
  st.waterAuto = $("setWaterAuto").checked;
  st.restSec = Math.max(10, Math.min(900, Math.round(num($("setRest").value, st.restSec))));
  st.bodyFat = bfRaw ? round1(validBf(bfRaw)) : "";
  st.targetBodyFat = tbfRaw ? round1(validBf(tbfRaw)) : "";
  st.sound = $("setSound").checked;
  st.keepAwake = $("setAwake").checked;
  st.warmupCard = $("setWarmup").checked;
  st.mobVoice = $("setMobVoice").checked;
  st.splash = $("setSplash").checked;
  st.dayStartHour = Math.max(0, Math.min(5, parseInt($("setDayStart").value, 10) || 0));
  if (w) state.weight = w;
  if (JSON.stringify([state.settings, state.weight]) === before) { fillProfileFields(); return true; }
  undoSnap = undo;   // Geri al bu değişiklikten önceki hâle döner
  if (!timer.running) resetTimerUI();
  renderAll();
  fillProfileFields();   // sınırlanan değerler kutuda düzgün görünsün
  updateWakeLock();
  offerUndo(t("Kaydedildi"));
  return true;
}
// Eski adı (testler ve eski çağrılar): bekleyen alanı kaydeder; profili kapatmaz.
function saveSettings() {
  const a = document.activeElement;
  if (a && a.blur && $("profilePage").contains(a)) a.blur();
  applyProfileFields();
}

// Bağlama göre onay: profil/antrenman ekranında temalı pencere, diğer yerlerde sistem kutusu.
async function askConfirm(title, message, ok = t("Devam et"), danger = false) {
  if (trainCtx() || nutriCtx()) return !!(await uiAsk({ title, message, ok, danger }));
  return confirm(message);
}

// ---------------------------------------------------------------------------
// YEDEKLEME
// ---------------------------------------------------------------------------
function markBackup() { state.lastBackupAt = Date.now(); state.backupSnoozeUntil = 0; saveState(); renderBanner(); }

// v35: metni dosya olarak paylaş (iPhone: Dosyalar'a Kaydet) veya indir — yedek ve kurtarma kopyası ortak
async function saveTextFile(text, name, title) {
  let file = null;
  try { file = new File([text], name, { type: "application/json" }); } catch (e) { file = null; }
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title }); return "shared"; }
    catch (e) { if (e && e.name === "AbortError") return "aborted"; }
  }
  try {
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return "downloaded";
  } catch (e) { return "failed"; }
}
async function exportBackupFile() {
  const r = await saveTextFile(JSON.stringify(state), t("AYK-yedek-{d}.json", { d: todayStr() }), t("AYK+ Yedek"));
  if (r === "shared") { markBackup(); toast(t("Yedek paylaşıldı. 'Dosyalar'a Kaydet'i seçtiysen güvende.")); }
  else if (r === "downloaded") { markBackup(); toast(t("Yedek dosyası indirildi")); }
  else if (r === "failed") toast(t("Dosya oluşturulamadı. Ayarlar > Yedek kodu ile kopyala."), "error");
}

// v36: KAYIT ALANI — bütün veri tek localStorage kaydında. iPhone Safari'nin sınırı kesin bilinmiyor; temkinli tahmin
// ~2,5 milyon karakter (5 MB). Ölçüm: yoğun kullanımla 5 yılda ~2,1 milyon. %70'te uyarı (açılışta en fazla haftada bir).
const STORAGE_LIMIT_CHARS = 2500000;
function storagePct() {   // eski mod (localStorage) için; IndexedDB modunda storageEstimate()
  let n = 0;
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); n += k.length + (localStorage.getItem(k) || "").length; } } catch (e) { return 0; }
  return Math.min(100, Math.round(n / STORAGE_LIMIT_CHARS * 100));
}
// v41: IndexedDB modunda tarayıcının ayırdığı alana göre (navigator.storage.estimate); yoksa kayıt boyutundan.
async function storageEstimate() {
  if (storeMode !== "idb") return { pct: storagePct(), mb: null };
  let usage = 0, quota = 0;
  try { if (navigator.storage && navigator.storage.estimate) { const e = await navigator.storage.estimate(); usage = e.usage || 0; quota = e.quota || 0; } } catch (e) {}
  if (!usage) usage = JSON.stringify(state).length * 2;
  return { pct: quota ? Math.min(100, Math.round(usage / quota * 100)) : 0, mb: usage / 1048576 };
}
function renderStorageMeter() {
  storageEstimate().then(({ pct, mb }) => {
    if (!$("pfStorageTxt")) return;
    const hi = pct >= 70;
    $("pfStorageTxt").textContent = t("%{p} dolu", { p: pct }) + (mb != null ? ` · ${fmtNum(mb)} MB` : "");
    $("pfStorageBar").style.width = Math.max(2, pct) + "%";
    $("pfStorageBar").style.background = hi ? "var(--t-warn-icon)" : "";
    $("pfStorageWarn").classList.toggle("hidden", !hi);
    if (hi) $("pfStorageWarn").textContent = t("Alan dolmak üzere. Hemen yedek dosyası kaydet; kayıt dolarsa yeni bilgiler kaydedilemez.");
  });
}
async function checkStorageWarn() {
  const { pct } = await storageEstimate();
  if (pct < 70 || Date.now() - num(state.storageWarnAt, 0) < 7 * DAY_MS) return;
  state.storageWarnAt = Date.now(); saveState();
  toast(t("Telefondaki kayıt alanının %{p}'i dolu. Yedek dosyası kaydet (Profil → Yedekleme).", { p: pct }), "error");
}

// v41: OTOMATİK İÇ YEDEKLER — her gün ilk açılışta bütün verinin kopyası (son 7 gece + son 4 hafta + "Geçiş öncesi").
const SNAP_KIND_LABEL = { day: "Gece yedeği", week: "Haftalık yedek", pre: "Geçiş öncesi", import: "İçe alma öncesi", safe: "Değişiklik öncesi" };
function renderSnapList() {
  const box = $("pfSnaps"); if (!box) return;
  if (storeMode !== "idb") { box.innerHTML = `<p class="text-[13px] text-[var(--t-dim)]">${t("Otomatik iç yedek bu cihazda kullanılamıyor; yedek dosyası kaydet.")}</p>`; return; }
  aykSnapList().then(list => {
    if (!$("pfSnaps")) return;
    box.innerHTML = list.length ? list.map(x => `<div data-snap="${esc(x.key)}" class="flex items-center justify-between gap-3 min-h-[52px] border-t border-[var(--t-line)] first:border-t-0">
        <span class="min-w-0"><span class="block text-[14px] font-semibold text-[var(--t-text)]">${esc(fmtDate(new Date(x.date + "T12:00:00").getTime()))}</span>
          <span class="block text-[12px] text-[var(--t-dim)]">${esc(t(SNAP_KIND_LABEL[x.kind] || "Yedek"))} · ${fmtNum(x.size / 1048576 * 2)} MB</span></span>
        <button data-snap-restore onclick='aykSnapRestore(${esc(JSON.stringify(x.key))})' class="t-btn-ghost h-11 px-3.5 rounded-xl text-[13px] shrink-0">${t("Bu hâle dön")}</button>
      </div>`).join("") : `<p class="text-[13px] text-[var(--t-dim)]">${t("İlk iç yedek yarın oluşacak.")}</p>`;
  });
}
async function aykSnapRestore(key) {
  const json = await aykSnapJson(key); if (!json) return;
  let next;
  try { next = normalizeState(JSON.parse(json)); } catch (e) { sayAlert(t("Yedek okunamadı"), t("Bu iç yedek okunamadı; mevcut verilerin değişmedi.")); return; }
  if (!(await askConfirm(t("Bu hâle dönülsün mü?"), t("Bütün verilerin bu yedekteki hâline döner. İstersen hemen ardından Geri al ile vazgeçebilirsin."), t("Bu hâle dön"), true))) return;
  await storageSnapshotNow();   // dönmeden önceki hâl de iç yedekte kalsın
  snapshot();
  state = next;
  checkNewDay();
  renderAll();
  renderSnapList();
  offerUndo(t("Yedekteki hâle dönüldü"));
}

// v35: KURTARMA KOPYASI — açılışta okunamayan kaydın ham hâli (RESCUE_KEY). Önceden yalnızca saklanıyordu,
// telefondan ulaşılamıyordu; artık Profil → Yedekleme'den indirilebilir, geri yüklenmeye çalışılabilir, silinebilir.
function rescueText() { try { return localStorage.getItem(RESCUE_KEY) || ""; } catch (e) { return ""; } }
async function downloadRescue() {
  const txt = rescueText(); if (!txt) return;
  const r = await saveTextFile(txt, t("AYK-kurtarma-{d}.json", { d: todayStr() }), t("AYK+ kurtarma kopyası"));
  if (r === "shared" || r === "downloaded") toast(t("Kurtarma kopyası kaydedildi"));
  else if (r === "failed") toast(t("Dosya oluşturulamadı."), "error");
}
async function restoreRescue() { const txt = rescueText(); if (txt) await restoreFromText(txt); }
async function deleteRescue() {
  if (!(await askConfirm(t("Kurtarma kopyası silinsin mi?"), t("Okunamayan eski verinin kopyası telefondan silinir. Önce indirdiysen dosyan güvende."), t("Sil"), true))) return;
  try { localStorage.removeItem(RESCUE_KEY); } catch (e) { /* yok sayılır */ }
  renderProfile();
  toast(t("Kurtarma kopyası silindi"));
}

// v44: opts.onboarding = kurulum ekranından (kaybedilecek veri yok → onay sorulmaz). Başarılı geri yükleme kurulumu kapatır.
async function restoreFromText(text, opts = {}) {
  let parsed;
  try { parsed = JSON.parse(String(text || "").trim()); } catch (e) { sayAlert(t("Geçersiz yedek"), t("Geçersiz yedek! Dosya veya kod bozuk görünüyor.")); return false; }
  if (parsed && parsed.state && (parsed.state.meals || parsed.state.workoutDays)) parsed = parsed.state;
  if (!parsed || typeof parsed !== "object" || !(parsed.meals || parsed.workoutDays)) { sayAlert(t("Yedek tanınmadı"), t("Bu bir AYK+ yedeği değil.")); return false; }
  if (!opts.onboarding && !(await askConfirm(t("Yedek geri yüklensin mi?"), t("Mevcut tüm verilerin bu yedekle DEĞİŞTİRİLECEK. Devam edilsin mi?"), t("Geri yükle"), true))) return false;
  let next;
  try { next = normalizeState(parsed); } catch (e) { console.error(e); sayAlert(t("Yedek okunamadı"), t("Yedek dosyası bozuk görünüyor; mevcut verilerin değiştirilmedi.")); return false; }
  await storageSnapshotNow();   // v41: geri yüklemeden önceki hâl iç yedekte
  next.settings.onboarded = true;   // v44: yedekten dönen kullanıcı kurulumu görmez (renderAll → syncOnboarding kapatır)
  state = next;
  state.lastBackupAt = state.lastBackupAt || Date.now();
  checkNewDay();
  closeSettings();
  renderAll();
  slimOldPhoto();   // v37: eski yedekteki küçültülmemiş fotoğraf
  toast(t("Yedek başarıyla geri yüklendi"));
  return true;
}

function importBackupFile(event, opts = {}) {
  const file = event.target.files[0];
  event.target.value = "";
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => restoreFromText(e.target.result, opts);
  reader.onerror = () => sayAlert(t("Dosya okunamadı"), t("Dosya okunamadı."));
  reader.readAsText(file);
}

async function copyBackup() {
  const txt = $("backupText");
  txt.value = JSON.stringify(state);
  let ok = false;
  try { await navigator.clipboard.writeText(txt.value); ok = true; } catch (e) {
    try { txt.focus(); txt.select(); ok = document.execCommand("copy"); } catch (e2) { ok = false; }
  }
  if (ok) { markBackup(); toast(t("Yedek kodu kopyalandı. Notlar'a yapıştırıp sakla.")); }
  else toast(t("Kopyalanamadı. Kutudaki metni elle seçip kopyala."), "error");
}

function restoreBackupFromText() { restoreFromText($("backupText").value); }

async function resetToDefaults() {
  if (!(await askConfirm(t("Fabrika ayarlarına sıfırla"), t("TÜM veriler silinip başlangıç ayarlarına dönülecek. Emin misin?"), t("Devam et"), true))) return;
  if (!(await askConfirm(t("Son onay"), t("Bu işlem geri alınamaz. Önce yedek almanı öneririm. Sıfırlansın mı?"), t("Sıfırla|tüm veri"), true))) return;
  await storageSnapshotNow();   // v41: sıfırlamadan önceki hâl iç yedekte (Profil → Otomatik iç yedekler)
  state = freshState();   // v44: kurulum ekranı yeniden açılır
  state.today = logicalToday();
  closeSettings();
  stopTimer();
  renderAll();
  toast(t("Uygulama sıfırlandı"));
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
  if (need) $("backupBannerText").textContent = state.lastBackupAt ? tn(days, "Son yedeğin {n} gün önce. Verilerini korumak için yedekle.") : t("Henüz hiç yedek almadın. Verilerin sadece bu telefonda.");
}
function snoozeBackup() { state.backupSnoozeUntil = Date.now() + 3 * DAY_MS; saveState(); renderBanner(); }

