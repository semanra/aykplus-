// ---------------------------------------------------------------------------
// AYARLAR
// ---------------------------------------------------------------------------
// Profil sayfası (eski Ayarlar penceresinin yerini aldı). Alan kimlikleri (setAge, setBf, ...) aynı kaldı.
const PF_FIELDS = ["setSex", "setAge", "setHeight", "setHeightFt", "setHeightIn", "pfWeight", "setTarget", "setActivity", "setProtein", "setWater", "setWaterAuto", "setBf", "setTargetBf", "setRest", "setSound", "setAwake", "setWarmup", "setMobSuggest", "setMobVoice", "setSplash", "setAnim", "setDayStart"];
function profileIsOpen() { const el = $("profilePage"); return !!el && !el.classList.contains("hidden"); }
// v58: yazı kutularının kayıttan gösterilen değerleri (fillProfileFields ve yazarken kayıt denetimi ortak kullanır)
function pfTextVals() {
  const st = state.settings, o = {
    setAge: String(st.age), setHeight: fmtNum(st.height),
    pfWeight: fmtNum(num(bodyKgToDisp(num(state.weight, 0)))),
    setTarget: fmtNum(num(bodyKgToDisp(num(st.targetWeight, 82)))),
    setWater: fmtNum(num(st.waterTarget, 3.5)),
    setBf: validBf(st.bodyFat) ? fmtNum(validBf(st.bodyFat)) : "",
    setTargetBf: validBf(st.targetBodyFat) ? fmtNum(validBf(st.targetBodyFat)) : "",
    setRest: String(st.restSec) };
  if (isImperial()) { const [f, i] = cmToFtIn(st.height); o.setHeightFt = String(f); o.setHeightIn = String(i); }   // v53
  return o;
}
// skipId: yazılmakta olan kutu (v58 yazarken kayıt) yeniden yazılmaz, imleç ve yazı yerinde kalır
function fillProfileFields(skipId) {
  const st = state.settings, v = pfTextVals();
  Object.keys(v).forEach(id => { if (id !== skipId) $(id).value = v[id]; });
  $("setSex").value = st.sex;
  profileUnitUI();
  $("setActivity").value = ["low", "mid", "high"].includes(st.activity) ? st.activity : "mid";
  $("setProtein").value = st.proteinHigh === true ? "high" : "std";
  $("setWaterAuto").checked = st.waterAuto !== false;
  updateWaterAutoHint();
  $("setSound").checked = !!st.sound;
  $("setAwake").checked = !!st.keepAwake;
  $("setWarmup").checked = st.warmupCard !== false;
  $("setMobSuggest").checked = st.mobSuggest !== false;   // v71
  $("setMobVoice").checked = st.mobVoice === true;
  $("setSplash").checked = st.splash !== false;
  $("setAnim").checked = st.anim !== false;   // v55
  $("setDayStart").value = String(dayStartHour());
  updateBfHint();
}
const PRIVACY_NOTE = "Verilerin yalnızca bu telefonda; uygulamanın bir sunucusu yok. Barkod okuttuğunda barkod numarası Open Food Facts'e gönderilir; bu istekle telefonun internet adresi (IP) de onlara ulaşır.";   // v58
const LICENSES = ["Barlow Condensed (SIL OFL 1.1)", "@zxing/library (Apache-2.0)", "Open Food Facts verisi (ODbL; ürün verisi katkıcılara ait)", "USDA FoodData Central (kamu malı / CC0)", "Tailwind CSS (MIT)", "Vücut haritası görseli (uygulama sahibinin kendi görseli)"];
const METHOD_SOURCES = ["Mifflin ve ark. (1990), Mifflin-St Jeor denklemi", "Katch-McArdle denklemi (yağsız kütleye dayalı)", "Morton ve ark. 2018, Br J Sports Med (protein ve kas)", "Nunes ve ark. 2022, J Cachexia Sarcopenia Muscle (protein ve kas)", "ISSN Pozisyon Bildirisi 2017 (Jäger ve ark.)", "Helms ve ark. 2014 (kilo verirken protein)", "Iraki ve ark. 2019 (kilo alırken beslenme)", "Joslin Klinik Beslenme Rehberi", "AMDR: yağ kalorinin %20–35'i", "Whittaker ve Wu 2021 (az yağlı beslenme ve testosteron)"];
// v60: kaynaklara tıklanabilir bağlantı (Apple 1.4.1: sağlık hesabında kaynaklar kolay bulunmalı). Hepsi PubMed / DOI / yayıncı;
// Katch-McArdle tek bir makale değil (ders kitabı denklemi), bağlantısız kalır.
const METHOD_LINKS = {
  "Mifflin ve ark. (1990), Mifflin-St Jeor denklemi": "https://pubmed.ncbi.nlm.nih.gov/2305711/",
  "Morton ve ark. 2018, Br J Sports Med (protein ve kas)": "https://pubmed.ncbi.nlm.nih.gov/28698222/",
  "Nunes ve ark. 2022, J Cachexia Sarcopenia Muscle (protein ve kas)": "https://pubmed.ncbi.nlm.nih.gov/35187864/",
  "ISSN Pozisyon Bildirisi 2017 (Jäger ve ark.)": "https://pubmed.ncbi.nlm.nih.gov/28642676/",
  "Helms ve ark. 2014 (kilo verirken protein)": "https://pubmed.ncbi.nlm.nih.gov/24092765/",
  "Iraki ve ark. 2019 (kilo alırken beslenme)": "https://pubmed.ncbi.nlm.nih.gov/31247944/",
  "Joslin Klinik Beslenme Rehberi": "https://joslin.org/-/media/files/joslin/joslin-clinical-nutrition-guideline-for-overweight-and-obese-adults.pdf",
  "AMDR: yağ kalorinin %20–35'i": "https://doi.org/10.17226/10490",
  "Whittaker ve Wu 2021 (az yağlı beslenme ve testosteron)": "https://doi.org/10.1016/j.jsbmb.2021.105878"
};
function renderAbout() {
  const en = curLang() === "en";
  const dec = (n, d) => n.toFixed(d).replace(".", en ? "." : ",");   // ondalık ayırıcı dile göre (Türkçe "1,55", İngilizce "1.55")
  const A = ACTIVITY_MULT, G = GAIN_PACE;
  const li = x => "<li>" + esc(t(x)) + "</li>";
  $("pfAboutHealth").textContent = t(HEALTH_NOTE);
  $("pfAboutPrivacy").textContent = t(PRIVACY_NOTE);
  $("pfPrivacyLink").setAttribute("href", en ? "privacy.html#en" : "privacy.html");   // v61: gizlilik / destek sayfaları (depoda, GitHub Pages)
  $("pfSupportLink").setAttribute("href", en ? "support.html#en" : "support.html");
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
    "<ul class=\"list-disc pl-4 space-y-1\">" + METHOD_SOURCES.map(x => METHOD_LINKS[x]
      ? "<li><a href=\"" + esc(METHOD_LINKS[x]) + "\" target=\"_blank\" rel=\"noopener\" class=\"underline underline-offset-2 inline-flex items-center min-h-[44px] py-1\" data-method-link>" + esc(t(x)) + "</a></li>"
      : li(x)).join("") + "</ul>"
  ].join("");
  $("pfLicList").innerHTML = LICENSES.map(li).join("");
}
// v59: PROFİL ANA EKRANI + ALT SAYFALAR. Ana ekran: özet kartı, ayar arama, 7 bölüm. Bölüm açılınca yalnızca o bölüm görünür,
// başlık bölüm adını yazar, Geri ana ekrana döner. Alan kimlikleri ve otomatik kayıt değişmedi. window.AYK_PF_FLAT (yalnız
// testler): bütün bölümler eskisi gibi alt alta (eski testler alanları doğrudan doldurur).
let pfSec = "";
const PF_SEC_KEYS = ["me", "body", "app", "train", "nutri", "data", "about"];
function pfSecTitle(k) {
  return ({ me: t("Kişisel bilgiler"), body: t("Kilo ve hedefler"), app: t("Görünüm ve dil"), train: t("Antrenman ve mobilite"),
    nutri: t("Beslenme"), data: t("Veri ve yedekleme"), about: t("Hakkında") })[k] || "";
}
function pfFlat() { return window.AYK_PF_FLAT === true; }
function pfApplyView() {
  const el = $("profilePage"); if (!el) return;
  const v = pfFlat() ? "flat" : pfSec ? "sec" : "home";
  if (el.dataset.pfView !== v) el.dataset.pfView = v;
  el.querySelectorAll("[data-pf-sec]").forEach(x => x.classList.toggle("pf-on", x.dataset.pfSec === pfSec));
  const tt = v === "sec" ? pfSecTitle(pfSec) : t("Profil");
  if ($("pfTitle").textContent !== tt) $("pfTitle").textContent = tt;
}
function pfOpen(k) {
  if (!PF_SEC_KEYS.includes(k)) return;
  pfSec = k; pfApplyView();
  if (pfFlat()) { const x = document.querySelector('#profilePage [data-pf-sec="' + k + '"]'); if (x) x.scrollIntoView({ block: "start" }); return; }
  $("pfScroll").scrollTop = 0;
}
function pfHome() { pfSec = ""; pfApplyView(); $("pfScroll").scrollTop = 0; }
function pfBack() {
  if (!pfSec || pfFlat()) { closeProfile(); return; }
  const a = document.activeElement;
  if (a && a.blur && $("profilePage").contains(a)) a.blur();   // yazılmakta olan alan önce kaydedilsin
  pfHome();
}
// Ayar arama: bölümlerdeki [data-pf-row] satırlarının (o anki dildeki) metninde, kelime sırası serbest
function pfRows() { return [...document.querySelectorAll("#profilePage [data-pf-sec] [data-pf-row]")]; }
function pfRowTitle(row) {
  const el = row.querySelector("[data-pf-title]") || row.querySelector(".t-field") || row.querySelector(".font-semibold") || row.querySelector("summary");
  let x = (el ? el.textContent : row.textContent).trim().replace(/\s+/g, " ");
  if (el && el.classList.contains("t-label")) x = x.charAt(0) + lowerL(x.slice(1));   // bölüm etiketi büyük harfle yazılı (CSS cümle düzenine çevirir)
  return x.length > 48 ? x.slice(0, 46) + "…" : x;
}
function pfSearchInput() {
  const inp = $("pfSearch"), res = $("pfSearchRes"), nav = $("pfNav"); if (!inp) return;
  const words = normSearch(inp.value.trim()).split(/\s+/).filter(Boolean);
  if (!words.length) { res.classList.add("hidden"); res.innerHTML = ""; nav.classList.remove("hidden"); return; }
  const hits = [];
  pfRows().forEach((row, i) => {
    if (row.closest(".hidden")) return;
    const txt = normSearch(row.textContent);
    if (words.every(w => txt.includes(w))) hits.push(i);
  });
  const rows = pfRows();
  res.innerHTML = hits.length ? hits.slice(0, 12).map(i => `<button type="button" class="pf-row" data-pf-hit onclick="pfGo(${i})">
      <span class="min-w-0 flex-1"><b>${esc(pfRowTitle(rows[i]))}</b><small>${esc(pfSecTitle(rows[i].closest("[data-pf-sec]").dataset.pfSec))}</small></span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 text-[var(--t-dim)]" aria-hidden="true"><path d="M9 6l6 6-6 6"></path></svg></button>`).join("")
    : `<p class="px-4 py-4 text-[14px] text-[var(--t-dim)]">${t("Sonuç yok. Başka bir kelime dene.")}</p>`;
  res.classList.remove("hidden"); nav.classList.add("hidden");
}
function pfGo(i) {
  const row = pfRows()[i]; if (!row) return;
  pfOpen(row.closest("[data-pf-sec]").dataset.pfSec);
  const det = row.tagName === "DETAILS" ? row : row.closest("details"); if (det) det.open = true;
  requestAnimationFrame(() => {
    row.scrollIntoView({ block: "center" });
    row.classList.remove("pf-flash"); void row.offsetWidth; row.classList.add("pf-flash");
    setTimeout(() => row.classList.remove("pf-flash"), 1700);
  });
}
// Özet kartı: fotoğraf, hedef, kilo → hedef kilo, bugünün kalori/protein hedefi, yedek durumu
function renderProfileSummary() {
  const box = $("pfSummary"); if (!box) return;
  const st = state.settings, g = st.goal === "gain" || st.goal === "keep" ? st.goal : "lose", tg = getTargets(), src = state.customIconDataUrl || "";
  const gl = g === "gain" ? t("Kilo almak") : g === "keep" ? t("Kilomu korumak") : t("Kilo vermek");
  const w = num(state.weight, 0), tw = num(st.targetWeight, 0);
  const wl = w ? (g !== "keep" && tw ? fmtW(w, { body: true }) + " → " + fmtW(tw, { body: true }) : fmtW(w, { body: true })) : "";
  const d = backupAgeDays();
  const bk = d < 0 ? t("Telefon dışına hiç yedek alınmadı") : d === 0 ? t("Son yedek: bugün") : tn(d, "Son yedek: {n} gün önce");
  const kcal = isFinite(tg.calTarget) ? Math.round(tg.calTarget).toLocaleString(locale()) : "—", pro = isFinite(tg.proTarget) ? String(Math.round(tg.proTarget)) : "—";
  const av = src ? `<img src="${esc(src)}" alt="" class="w-full h-full object-cover" />`
    : `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5c1.2-3.6 4.1-5.5 7.5-5.5s6.3 1.9 7.5 5.5"></path></svg>`;
  const html = `<div class="flex items-center gap-3.5">
      <button type="button" onclick="pfOpen('me')" aria-label="${esc(t("Kişisel bilgiler"))}" class="w-16 h-16 shrink-0 rounded-full bg-[var(--t-elev)] border border-[var(--t-line)] overflow-hidden flex items-center justify-center text-[var(--t-dim)]">${av}</button>
      <button type="button" data-pf-sum-goal onclick="pfOpen('body')" class="flex-1 min-w-0 text-left min-h-[44px]">
        <span class="block t-display text-[24px] leading-none uppercase">${esc(gl)}</span>
        ${wl ? `<span class="block text-[14px] font-semibold text-[var(--t-text2)] mt-1.5">${esc(wl)}</span>` : ""}
        <span class="block text-[13px] text-[var(--t-dim)] mt-0.5">${esc(t("Bugünkü hedef: {k} kcal · {p} g protein", { k: kcal, p: pro }))}</span>
      </button>
    </div>
    <button type="button" data-pf-sum-backup onclick="pfOpen('data')" class="mt-3 w-full flex items-center gap-2.5 min-h-[44px] rounded-xl bg-[var(--t-elev)] px-3.5 text-left">
      <i class="w-2.5 h-2.5 rounded-full shrink-0 ${BK_DOT[backupLevel()]}" aria-hidden="true"></i><span class="flex-1 min-w-0 text-[13px] font-semibold text-[var(--t-text2)]">${esc(bk)}</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 text-[var(--t-dim)]" aria-hidden="true"><path d="M9 6l6 6-6 6"></path></svg>
    </button>`;
  if (box.dataset.h !== html) { box.innerHTML = html; box.dataset.h = html; }
  const dot = $("pfNavBkDot"); if (dot) dot.className = "w-2.5 h-2.5 rounded-full shrink-0 " + BK_DOT[backupLevel()];
}
// Hedef kartı (Menülerim'deki Ver/Koru/Al ve hız ile aynı ayar; aynı fonksiyonlar)
function renderPfGoal() {
  const st = state.settings, g = st.goal === "gain" || st.goal === "keep" ? st.goal : "lose";
  document.querySelectorAll("[data-pf-goal]").forEach(b => { const on = b.dataset.pfGoal === g; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
  document.querySelectorAll("[data-pf-pace]").forEach(b => { const on = b.dataset.pfPace === (st.gainPace || "mid"); b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
  $("pfLoseBox").classList.toggle("hidden", g !== "lose");
  $("pfGainBox").classList.toggle("hidden", g !== "gain");
  $("pfDeficitVal").textContent = String(Math.round(num(state.deficit, 0)));
}
function pfDeficit(d) {
  state.deficit = Math.max(50, Math.min(1000, Math.round((num(state.deficit, 500) + d) / 50) * 50));
  renderAll();
}
function openProfile(sec) {
  pfSec = PF_SEC_KEYS.includes(sec) ? sec : "";
  if ($("pfSearch")) { $("pfSearch").value = ""; pfSearchInput(); }
  fillProfileFields();
  renderAbout();
  $("backupText").value = "";   // v58: bütün kaydı metne çevirmek Profil'i yavaşlatıyordu; kod yalnızca "Kodu kopyala"da üretilir
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
// v60: Profil → Kilom "Tüm tartı geçmişi" → İlerleme sekmesi, Kilo görünümü
function pfGoWeightHistory() {
  closeProfile();
  state.progressView = "kilo";
  switchTab("progress");
}

// v53: Profil kutuları birime göre — imperial'de boy iki kutu (ft, in), kilo etiketleri lb. Metrikte DOM'a dokunulmaz
// (etiket metni zaten aynıysa yazılmaz; boy kutuları gizli kalır).
function profileUnitUI() {
  const imp = isImperial();
  [$("setHeight"), document.querySelector('label[for="setHeight"]')].forEach(el => { if (el && (el.style.display === "none") !== imp) el.style.display = imp ? "none" : ""; });   // .t-field display:block .hidden'ı ezer
  const hi = $("pfHeightImp"); if (hi && hi.classList.contains("hidden") === imp) hi.classList.toggle("hidden", !imp);
  [["pfWeight", t("Güncel kilo (kg)")], ["setTarget", t("Hedef kilo (kg)")]].forEach(([id, tk]) => {
    const lb = document.querySelector('label[for="' + id + '"]'), want = wTxt(tk);
    if (lb && lb.textContent !== want) lb.textContent = want;
  });
}
function renderProfile() {
  pfApplyView();   // v59
  renderProfileSummary();
  renderPfGoal();
  profileUnitUI();
  $("pfRescue").classList.toggle("hidden", !rescueText());   // v35
  renderStorageMeter();   // v36
  document.querySelectorAll("[data-theme-opt]").forEach(b => { const on = b.dataset.themeOpt === state.settings.theme; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
  const lr = $("pfLang"); if (lr) lr.classList.toggle("hidden", !langAvailable());   // v46
  document.querySelectorAll("[data-lang-opt]").forEach(b => { const on = b.dataset.langOpt === curLang(); b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
  document.querySelectorAll("#pfUnits [data-units-opt]").forEach(b => { const on = b.dataset.unitsOpt === state.settings.units; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });   // v53
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
      <div class="bg-[var(--t-elev)] rounded-2xl px-3 py-2.5"><div class="text-[12px] t-muted">${t("Son tartı")}</div><div class="t-display text-[22px]">${fmtWNum(num(lastW.weight), { body: true })}<span class="t-dim text-sm"> ${wUnit()}</span></div><div class="text-[12px] t-dim">${esc(lastW.ts ? fmtDate(lastW.ts) : logDateLabel(lastW.date || ""))}</div></div>
      <div class="bg-[var(--t-elev)] rounded-2xl px-3 py-2.5"><div class="text-[12px] t-muted">${t("Değişim")}</div><div class="t-display text-[22px] ${d < 0 ? "t-accent" : ""}">${d > 0 ? "+" : ""}${fmtWNum(d, { body: true })}<span class="t-dim text-sm"> ${wUnit()}</span></div><div class="text-[12px] t-dim">${tn(wl.length, "{n} kayıt")}</div></div>
      <div class="bg-[var(--t-elev)] rounded-2xl px-3 py-2.5"><div class="text-[12px] t-muted">${t("Hedefe")}</div><div class="t-display text-[22px]">${tW ? fmtWNum(Math.abs(left), { body: true }) : "—"}<span class="t-dim text-sm"> ${wUnit()}</span></div><div class="text-[12px] t-dim">${!tW ? t("hedef yok") : left > 0 ? t("verilecek") : left < 0 ? t("alınacak") : t("hedeftesin")}</div></div>
    </div>`;
    // v60: son 4 tartı listesi yerine İlerleme → Kilo bağlantısı (bütün geçmiş ve grafik orada)
    wh += `<button type="button" onclick="pfGoWeightHistory()" data-pf-weight-hist class="mt-2 w-full min-h-[44px] flex items-center justify-between gap-2 px-1 text-[14px] text-left">
      <span class="font-semibold">${t("Tüm tartı geçmişi")}</span>
      <span class="flex items-center gap-1 t-muted">${t("İlerleme")}<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></span>
    </button>`;
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
      <div class="t-display text-[22px]">${fmtLen(l[k])}<span class="t-dim text-sm"> ${lenUnit()}</span></div>
      <div class="text-[12px] ${good == null ? "t-dim" : good ? "t-accent" : "text-[var(--t-danger-text)]"}">${d === 0 ? t("değişim yok") : (d > 0 ? "+" : "") + fmtLen(d) + " " + lenUnit()}</div>
    </div>`;
  }).join("");
  const lastM = ms[ms.length - 1];
  $("pfMeasureBox").innerHTML = cells
    ? `<div class="grid grid-cols-3 gap-2">${cells}</div><p class="text-[12px] t-dim mt-2">${esc(t("Son ölçüm: {d} · Değişim ilk ölçüne göre. Grafik İlerleme sekmesinde.", { d: fmtDate(lastM.ts, true) }))}</p>`
    : `<div class="t-card rounded-[22px] p-4 text-[13px] t-dim">${t("Henüz ölçü eklemedin. Kilo yerinde sayarken belin inceliyorsa yağ yakıp kas kazanıyorsun demektir. İlk ölçünü eklemek için \"+ Ölçü ekle\"ye dokun.")}</div>`;
  renderBackupStatus();   // v58
  $("lastBackupText").textContent = state.lastBackupAt
    ? tn(Math.floor((Date.now() - state.lastBackupAt) / DAY_MS), "Son yedek: {d} ({n} gün önce)", { d: fmtDate(state.lastBackupAt, true) })
    : t("Henüz yedek alınmadı. Verilerin sadece bu telefonda duruyor; düzenli yedek almanı öneririm.");
  $("lastBackupText").classList.toggle("hidden", !state.lastBackupAt);   // v59: yedek yokken durum satırı ("Hiç alınmadı") yeterli
}

// v24: "Su hedefi kiloya göre" açıkken elle hedef kutusu pasif, hesap açıklamada
function updateWaterAutoHint() {
  const on = $("setWaterAuto").checked, a = waterAutoInfo(readProfileWeight() || state.weight), wb = $("setWater");
  // v58: otomatikken kutu kullanılan hedefi (hesaplanan) gösterir ve kilitlidir; kapatınca elle yazılan hedef geri gelir
  if (on && a) { wb.value = fmtNum(a.total); wb.dataset.auto = "1"; }
  else if (wb.dataset.auto === "1") { wb.value = fmtNum(num(state.settings.waterTarget, 3.5)); wb.dataset.auto = ""; }
  wb.disabled = on && !!a;
  wb.classList.toggle("opacity-50", on && !!a);
  $("setWaterHint").textContent = on
    ? (a ? (isImperial()   // v53: imperial'de kilo lb olarak, formül (kg × 35 ml) yazılmaz
        ? t(a.cr ? "Kilona göre ({w} lb): {b} L + 0,5 L kreatin → {tot} L" : "Kilona göre ({w} lb): {b} L", { w: fmtNum(num(bodyKgToDisp(a.w))), b: fmtNum(a.base), tot: fmtNum(a.total) })
        : t(a.cr ? "{w} kg × 35 ml = {b} L + 0,5 L kreatin → {tot} L" : "{w} kg × 35 ml = {b} L → {tot} L", { w: fmtNum(a.w), b: fmtNum(a.base), tot: fmtNum(a.total) }))
      : t("Kilo girilince hesaplanır; şimdilik elle yazdığın hedef kullanılır."))
    : t("Kapalı: yukarıda elle yazdığın hedef kullanılır.");
}
// Kutudaki kilo → kg (geçersizse 0). v53: imperial'de lb; gösterilen değer yeniden yazılırsa kayıttaki kg aynen (round1 YOK)
function readProfileWeight() {
  const raw = $("pfWeight").value.trim();
  let w = isImperial() ? num(keepBodyKg(num(raw, 0), state.weight), 0) : round1(num(raw, 0));
  if (!isImperial() && w === round1(num(state.weight))) w = num(state.weight);   // lb'de girilmiş 79,832 metrikte 79,8'e yuvarlanmasın
  return w >= 30 && w <= 300 ? w : 0;
}
function profileLogWeight() {
  const w = readProfileWeight();
  if (!w) { uiAlert(t("Kilo geçersiz"), isImperial() ? t("Kilonu {a} ile {b} arasında yaz (örn: {ex}).", { a: fmtW(30, { body: true }), b: fmtW(300, { body: true }), ex: fmtNum(216.9) }) : t("Kilonu 30 ile 300 kg arasında yaz (örn: 98,4).")); return; }
  state.weight = w;
  logCurrentWeight();
  $("pfWeight").value = fmtNum(num(bodyKgToDisp(w)));
}

// v42: OTOMATİK KAYIT. Alan değişince (yazı kutusunda kutudan çıkınca; anahtar/seçimde hemen) bütün profil alanları
// doğrulanıp kaydedilir. Sınırlar eskisi gibi (yaş 12–99, boy 120–230 …). Geçersiz yağ oranı / kilo kaydedilmez, eski değer
// geri yazılır (kilo kutusu olduğu gibi kalır, kaydedilmez). Her kayıtta "Kaydedildi · Geri al". Kilo kutusu yalnızca güncel kiloyu değiştirir; tartı geçmişine ayrı düğme yazar.
function profileAutoSaveInit() {
  const det = $("pfSnaps") && $("pfSnaps").closest("details");   // v41: iç yedek listesi yalnızca açılınca okunur
  if (det && !det.dataset.snapInit) { det.dataset.snapInit = "1"; det.addEventListener("toggle", () => { if (det.open) renderSnapList(); }); }
  PF_FIELDS.forEach(id => { const el = $(id); if (el && !el.dataset.autosave) {
    el.dataset.autosave = "1";
    el.addEventListener("change", () => { clearTimeout(pfLiveTimer); pfLiveTimer = 0; applyProfileFields(id); });
    // v58: iPhone'da kutunun dışına dokunmak klavyeyi kapatmaz ("change" gelmez); uygulamadan çıkılırsa yazılan kaybolurdu.
    // Artık yazmayı bırakınca (0,9 sn) da sessizce kaydedilir; kutudan çıkınca "Kaydedildi · Geri al" yine çıkar.
    if (el.tagName === "INPUT" && el.type === "text") el.addEventListener("input", () => { clearTimeout(pfLiveTimer); pfLiveTimer = setTimeout(() => pfLiveSave(id), 900); });
  } });
  if (!document.body.dataset.pfFlush) {
    document.body.dataset.pfFlush = "1";
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && profileIsOpen()) pfFlushField(); });
    window.addEventListener("pagehide", () => { if (profileIsOpen()) pfFlushField(); });
  }
}
let pfLiveTimer = 0, pfLiveSaved = "";
function pfLiveSave(id) { pfLiveTimer = 0; const a = document.activeElement; if (a && a.id === id) applyProfileFields(id, { live: true }); }
// Uygulama arka plana geçerken odaktaki alanı kaydet (kutudan çıkılmış gibi)
function pfFlushField() {
  clearTimeout(pfLiveTimer); pfLiveTimer = 0;
  const a = document.activeElement;
  if (a && PF_FIELDS.includes(a.id)) applyProfileFields(a.id);
}
// opts.live (v58, yazarken): geçersiz / yarım değer sessizce atlanır (bildirim yok, kutuya dokunulmaz); sınıra kırpılacak
// ya da yuvarlanacak değer (yaş "3" → 12) kaydedilmez, kutudan çıkınca normal yoldan kaydedilir.
function applyProfileFields(changedId, opts = {}) {
  const live = !!opts.live;
  const st = state.settings;
  const bfRaw = $("setBf").value.trim(), tbfRaw = $("setTargetBf").value.trim();
  if ((bfRaw && !validBf(bfRaw)) || (tbfRaw && !validBf(tbfRaw))) {
    if (live) return false;
    $("setBf").value = validBf(st.bodyFat) ? fmtNum(validBf(st.bodyFat)) : "";
    $("setTargetBf").value = validBf(st.targetBodyFat) ? fmtNum(validBf(st.targetBodyFat)) : "";
    updateBfHint();
    toast(t("Yağ oranı %3 ile %60 arasında olmalı; eski değer geri geldi."), "error");
    return false;
  }
  const wRaw = $("pfWeight").value.trim(), w = readProfileWeight();
  if (wRaw && !w) {
    if (live) return false;   // kutu olduğu gibi kalır ("Tartıyı kaydet" de bu değeri reddeder); kayıtlı kilo değişmez
    toast(isImperial() ? t("Kilo {a} ile {b} arasında olmalı; kaydedilmedi.", { a: fmtW(30, { body: true }), b: fmtW(300, { body: true }) }) : t("Kilo 30 ile 300 kg arasında olmalı; kaydedilmedi."), "error");
    return false;
  }
  // v53: imperial boy iki kutu (ft tam sayı, in 0–11; boş in = 0). Biçim bozuksa kaydedilmez, kutular eski boya döner.
  let hImp = null;
  if (isImperial()) {
    const fr = $("setHeightFt").value.trim(), ir = $("setHeightIn").value.trim();
    const f = num(fr, NaN), i = ir === "" ? 0 : num(ir, NaN), [f0, i0] = cmToFtIn(st.height);
    if (fr !== "" && !(Number.isInteger(f) && f >= 0 && i >= 0 && i < 12)) {
      if (live) return false;
      $("setHeightFt").value = f0; $("setHeightIn").value = i0;
      toast(t("Boyda ft tam sayı, in 0 ile 11 arasında olmalı."), "error");
      return false;
    }
    hImp = fr === "" || (f === f0 && i === i0) ? st.height : Math.max(120, Math.min(230, ftInToCm(f, i)));   // ft / in değişmediyse boy aynen (175,3 → 175 olmaz)
  }
  const before = JSON.stringify([state.settings, state.weight]);
  const undo = JSON.stringify(state), oldSt = JSON.stringify(st), oldW = state.weight;
  st.sex = $("setSex").value === "female" ? "female" : "male";
  st.age = Math.max(12, Math.min(99, Math.round(num($("setAge").value, st.age))));
  if (hImp !== null) st.height = hImp;
  else if (!(round1(num($("setHeight").value, NaN)) === round1(st.height) && st.height >= 120 && st.height <= 230)) st.height = Math.max(120, Math.min(230, Math.round(num($("setHeight").value, st.height))));   // v53: kutudaki değer aynıysa (175,3) yuvarlanmaz
  if (isImperial()) { const tk = num(keepBodyKg($("setTarget").value, st.targetWeight), NaN); if (isFinite(tk)) st.targetWeight = Math.max(30, Math.min(250, tk)); }   // v53: lb; kg 3 ondalık, round1 YOK
  else { const tw = round1(num($("setTarget").value, st.targetWeight)); if (tw !== round1(num(st.targetWeight)) || !(st.targetWeight >= 30 && st.targetWeight <= 250)) st.targetWeight = Math.max(30, Math.min(250, tw)); }
  st.activity = ["low", "mid", "high"].includes($("setActivity").value) ? $("setActivity").value : "mid";
  st.proteinHigh = $("setProtein").value === "high";
  if (!$("setWater").disabled) st.waterTarget = Math.max(0.5, Math.min(10, round1(num($("setWater").value, st.waterTarget))));   // v58: kilitliyken kutuda hesaplanan değer var
  st.waterAuto = $("setWaterAuto").checked;
  st.restSec = Math.max(10, Math.min(900, Math.round(num($("setRest").value, st.restSec))));
  st.bodyFat = bfRaw ? round1(validBf(bfRaw)) : "";
  st.targetBodyFat = tbfRaw ? round1(validBf(tbfRaw)) : "";
  st.sound = $("setSound").checked;
  st.keepAwake = $("setAwake").checked;
  st.warmupCard = $("setWarmup").checked;
  st.mobSuggest = $("setMobSuggest").checked;   // v71
  st.mobVoice = $("setMobVoice").checked;
  st.splash = $("setSplash").checked;
  st.anim = $("setAnim").checked;   // v55
  st.dayStartHour = Math.max(0, Math.min(5, parseInt($("setDayStart").value, 10) || 0));
  if (w) state.weight = w;
  if (live && changedId) {   // kutuda yazılan, kayda girecek değerle aynı değilse (kırpma / yuvarlama) şimdilik kaydetme
    const raw = $(changedId).value.trim(), shown = pfTextVals()[changedId];
    if (shown != null && raw !== "" && num(raw, NaN) !== num(shown, NaN)) { state.settings = JSON.parse(oldSt); state.weight = oldW; return false; }
  }
  if (JSON.stringify([state.settings, state.weight]) === before) {
    fillProfileFields(live ? changedId : undefined);
    if (!live && pfLiveSaved) { pfLiveSaved = ""; offerUndo(t("Kaydedildi")); }   // yazarken sessizce kaydedilmişti: kutudan çıkınca bildir
    return true;
  }
  if (!(live && pfLiveSaved)) undoSnap = undo;   // Geri al bu alana yazmaya başlamadan önceki hâle döner
  if (!timer.running) resetTimerUI();
  renderAll();
  fillProfileFields(live ? changedId : undefined);   // sınırlanan değerler kutuda düzgün görünsün (yazılan kutu hariç)
  updateWakeLock();
  if (live) { pfLiveSaved = changedId; return true; }
  pfLiveSaved = "";
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
async function saveTextFile(text, name, title, type = "application/json") {   // v61: CSV için tür
  let file = null;
  try { file = new File([text], name, { type }); } catch (e) { file = null; }
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title }); return "shared"; }
    catch (e) { if (e && e.name === "AbortError") return "aborted"; }
  }
  try {
    const url = URL.createObjectURL(new Blob([text], { type }));
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
  loadFoodsEn();   // v52: dil İngilizceyse besin adları dosyası
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
  loadFoodsEn();   // v52: dil İngilizceyse besin adları dosyası
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
  loadFoodsEn();   // v52: dil İngilizceyse besin adları dosyası
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
// v58: YEDEK DURUMU — telefon dışı kopya (yedek dosyası / kodu) ve otomatik iç yedek ayrı ayrı, renkli noktayla.
function backupAgeDays() { return state.lastBackupAt ? Math.max(0, Math.floor((Date.now() - state.lastBackupAt) / DAY_MS)) : -1; }
function backupLevel() { const d = backupAgeDays(); return d < 0 ? "bad" : d < 7 ? "ok" : d < 30 ? "warn" : "bad"; }
const BK_DOT = { ok: "bg-[var(--d-gr)]", warn: "bg-[var(--t-warn-icon)]", bad: "bg-[var(--t-danger)]", none: "bg-[var(--t-line2)]" };
function bkRow(id, lvl, title, val) {
  return `<div class="flex items-center gap-3 min-h-[44px]"><i class="w-2.5 h-2.5 rounded-full shrink-0 ${BK_DOT[lvl]}" aria-hidden="true"></i>
    <span class="flex-1 min-w-0 text-[14px] font-semibold text-[var(--t-text)]">${title}</span><span id="${id}" class="text-[13px] text-[var(--t-muted)] text-right">${val}</span></div>`;
}
function renderBackupStatus() {
  const box = $("pfBackupStatus"); if (!box) return;
  const d = backupAgeDays();
  const off = d < 0 ? t("Hiç alınmadı") : d === 0 ? t("Bugün") : tn(d, "{n} gün önce");
  const idb = storeMode === "idb" && !!aykDB;
  box.innerHTML = bkRow("pfBkOff", backupLevel(), t("Telefon dışı yedek (dosya)"), off)
    + bkRow("pfBkAuto", idb ? "none" : "bad", t("Otomatik iç yedek"), idb ? "…" : t("Bu cihazda yok"));
  if (!idb) return;
  const day = logicalToday(), yday = todayStr(new Date(new Date(day + "T12:00:00").getTime() - DAY_MS));
  Promise.all([idbGet("snaps", "day-" + day), idbGet("snaps", "day-" + yday)]).then(([a, b]) => {
    const el = $("pfBkAuto"); if (!el) return;
    el.textContent = a ? t("Bugün alındı") : b ? t("Dün alındı") : t("İlk açılışta oluşur");
    el.parentElement.querySelector("i").className = "w-2.5 h-2.5 rounded-full shrink-0 " + BK_DOT[a || b ? "ok" : "warn"];
  }).catch(() => {});
}
function snoozeBackup() { state.backupSnoozeUntil = Date.now() + 3 * DAY_MS; saveState(); renderBanner(); }

