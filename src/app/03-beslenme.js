// ---------------------------------------------------------------------------
// BESLENME HESAPLAMALARI
// ---------------------------------------------------------------------------
function getTargets() {
  const st = state.settings;
  const female = st.sex === "female";
  const bf = validBf(st.bodyFat);
  // Yağ oranı biliniyorsa yağsız kütleye dayalı Katch-McArdle, bilinmiyorsa Mifflin-St Jeor
  const bmr = bf
    ? 370 + 21.6 * state.weight * (1 - bf / 100)
    : (10 * state.weight) + (6.25 * num(st.height, 180)) - (5 * num(st.age, 26)) + (female ? -161 : 5);
  const mult = state.dayType === "train" ? 1.55 : 1.43;
  const tdee = Math.round(bmr * mult);
  const calTarget = Math.max(female ? 1400 : 1750, tdee + Math.round(num(st.calAdjust, 0)) - state.deficit);
  const proTarget = Math.round((num(st.targetWeight, 82) * 2.0) + (state.weight * 0.35));
  const fatTarget = Math.max(female ? 45 : 55, Math.round(state.weight * 0.72));
  const carbTarget = Math.max(60, Math.round((calTarget - (proTarget * 4) - (fatTarget * 9)) / 4));
  return { calTarget, proTarget, carbTarget, fatTarget, tdee };
}

function validBf(v) {
  if (v === "" || v == null) return 0;
  const n = num(v, 0);
  return n >= 3 && n <= 60 ? n : 0;
}
function bodyComp(weight, bf) {
  if (!bf) return null;
  const fatKg = weight * bf / 100;
  return { bf, fatKg, leanKg: weight - fatKg };
}
function updateBfHint() {
  const bf = validBf($("setBf").value);
  const tbf = validBf($("setTargetBf").value);
  const el = $("setBfHint");
  if (!bf) { el.classList.add("hidden"); return; }
  const c = bodyComp(state.weight, bf);
  let html = `Yağsız kütlen: <b class="text-[var(--w-acc)]">${fmtNum(c.leanKg)} kg</b> • Yağ kütlen: <b class="text-[var(--w-over)]">${fmtNum(c.fatKg)} kg</b>`;
  if (tbf && tbf < bf) {
    const suggest = round1(c.leanKg / (1 - tbf / 100));
    html += `<div class="mt-1.5">Kas kütleni koruyarak %${fmtNum(tbf)} yağ oranına inersen tahmini kilon: <b class="text-[var(--w-k)]">${fmtNum(suggest)} kg</b></div>
      <button onclick="$('setTarget').value='${fmtNum(suggest)}'; toast('Hedef kilo ${fmtNum(suggest)} kg olarak dolduruldu, kaydetmeyi unutma');" class="t-btn-outline mt-2.5 w-full h-11 rounded-xl text-[14px]">Bunu hedef kilom yap</button>`;
  }
  html += `<div class="mt-1.5 text-[var(--w-dim)]">Yağ oranı girildiği için kalori hesabı yağsız kütleye göre yapılıyor. Ölçüm değiştikçe (ayda bir gibi) güncelle.</div>`;
  el.innerHTML = html;
  el.classList.remove("hidden");
}

function calcItemMacros(item) {
  if (item.est) {   // v14: "Dışarıda yedim" tahmini girişi
    const e = item.est;
    return { p: num(e.p, 0), c: num(e.c, 0), f: num(e.f, 0), cal: num(e.cal, 0) };
  }
  const f = getFoodDB()[item.foodId];
  if (!f) return { p: 0, c: 0, f: 0, cal: 0 };
  const a = effAmount(item);
  const p = f.p * a, c = f.c * a, fat = f.f * a;
  return { p, c, f: fat, cal: kcalPerUnit(f) * a };
}

// ---------------------------------------------------------------------------
// BESLENME RENDER
// ---------------------------------------------------------------------------
// ============================================================================
// v13 — BESLENME: Bugün / Menülerim / Besinler / Geçmiş, ikame, hazır porsiyon,
//        kiloya göre gramaj, gündüz teması, barkod
// ============================================================================
const NUTRI_VIEWS = [["today", "Bugün"], ["menus", "Menülerim"], ["foods", "Besinler"], ["history", "Geçmiş"]];
function setNutriView(v) {
  state.nutriView = NUTRI_VIEWS.some(x => x[0] === v) ? v : "today";
  window.scrollTo(0, 0);
  renderAll();
}
// v31: Görünüm (Sistem / Koyu / Aydınlık). Etkin tema html.light sınıfıyla uygulanır; Beslenme'de nutri-light.
// Açılışta yanıp sönmesin diye <head> içindeki betik "ayk_theme" aynasını okur (asıl kayıt state.settings.theme).
const THEME_MQ = window.matchMedia ? window.matchMedia("(prefers-color-scheme: light)") : null;
function themeIsLight() { const t = state.settings.theme; return t === "light" || (t !== "dark" && !!(THEME_MQ && THEME_MQ.matches)); }
function applyTheme() {
  const light = themeIsLight();
  document.documentElement.classList.toggle("light", light);
  document.body.classList.toggle("nutri-light", state.activeTab === "nutrition" && light);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) { const bg = getComputedStyle(document.body).backgroundColor; if (bg && meta.getAttribute("content") !== bg) meta.setAttribute("content", bg); }
  try { if (localStorage.getItem("ayk_theme") !== state.settings.theme) localStorage.setItem("ayk_theme", state.settings.theme); } catch (e) {}
}
function setTheme(t) { state.settings.theme = ["system", "dark", "light"].includes(t) ? t : "system"; renderAll(); }
function toggleTheme() { setTheme(themeIsLight() ? "dark" : "light"); }
const toggleNutriLight = toggleTheme;   // eski ad (başlıktaki düğme)
// Sistem teması değişince: olay + yedek olarak uygulamaya dönüşte yeniden bak (iOS arka plandayken olayı kaçırabilir)
function onSystemTheme() { try { if (state.settings.theme === "system" && themeIsLight() !== document.documentElement.classList.contains("light")) applyTabVisibility(); } catch (e) {} }
if (THEME_MQ) { if (THEME_MQ.addEventListener) THEME_MQ.addEventListener("change", onSystemTheme); else if (THEME_MQ.addListener) THEME_MQ.addListener(onSystemTheme); }
document.addEventListener("visibilitychange", () => { if (!document.hidden) onSystemTheme(); });
window.addEventListener("focus", onSystemTheme);
window.addEventListener("pageshow", onSystemTheme);

// Tam sayıyı Türkçe binlik ayırıcıyla yazar: 2478 → "2.478"
function fmtInt(n) { return Math.round(num(n, 0)).toLocaleString("tr-TR"); }
// Etiketten girilen kalori (f.kcal) varsa o kullanılır; yoksa 4P + 4K + 9Y
function kcalPerUnit(f) {
  if (!f) return 0;
  if (f.kcal != null && isFinite(f.kcal) && f.kcal >= 0) return f.kcal;
  return (f.p * 4) + (f.c * 4) + (f.f * 9);
}
// Baştaki emojiyi (bayraklar dahil) kaldırır: "🇹🇷 Türk Mutfağı" → "Türk Mutfağı"
function stripEmoji(s) { return String(s || "").replace(/^(?:[\u{1F1E6}-\u{1F1FF}]+\s*)+/u, "").replace(EMOJI_LEAD, ""); }

// ---------------------------------------------------------------------------
// Kiloya göre gramaj: menü, açıldığı andaki kiloya (referans) göre saklanır;
// kilo değişince yalnızca gram/ml ile ölçülen besinler orantılı gösterilir ve hesaplanır.
// Saklanan miktar değişmez; ayar kapatılınca menü eski hâline döner.
// ---------------------------------------------------------------------------
function scaleK() {
  const st = state.settings;
  if (!st.scaleOn || !(num(st.scaleBase, 0) > 0)) return 1;
  return Math.max(0.7, Math.min(1.3, state.weight / num(st.scaleBase, state.weight)));
}
function isScalable(f) { return !!f && (f.unit === "g" || f.unit === "ml"); }
function effAmount(item) {
  const f = getFoodDB()[item.foodId];
  const k = scaleK();
  if (k === 1 || !isScalable(f)) return item.amount;
  return Math.max(1, Math.round(item.amount * k));
}
// Ekranda görünen (ölçeklenmiş) miktarı saklanacak miktara çevirir
function rawFromEff(f, eff) {
  const k = scaleK();
  // 0,1 hassasiyet: oran en fazla 1,3 olduğundan ekranda yazılan gram aynen geri görünür
  return k !== 1 && isScalable(f) ? round1(eff / k) : round1(eff);
}
function toggleWeightScale(on) {
  state.settings.scaleOn = !!on;
  if (on) state.settings.scaleBase = state.weight;
  renderAll();
  toast(on ? `Gramajlar artık ${fmtNum(state.weight)} kg'a göre ayarlanacak` : "Kiloya göre gramaj kapatıldı; menü son başlangıç gramajlarına döndü");
}
function resetScaleBase() {
  snapshot();   // v26: Geri al
  const k = scaleK();
  // Şu an görünen gramajlar yeni referans olsun: saklanan miktarları sabitle
  if (k !== 1) allMealLists().forEach(ms => ms.forEach(m => m.items.forEach(i => {
    if (i.est) return;
    const f = getFoodDB()[i.foodId];
    if (isScalable(f)) i.amount = Math.max(1, Math.round(i.amount * k));
  })));
  state.settings.scaleBase = state.weight;
  renderAll();
  offerUndo(`Gramajlar ${fmtNum(state.weight)} kg için yeni başlangıç oldu`);
}

// ---------------------------------------------------------------------------
// İkame: aynı gruptaki besinle, kalori aynı kalacak şekilde değiştir
// ---------------------------------------------------------------------------
const SWAP_GROUPS = [
  ["pirinc", "basmati", "bulgur", "makarna_tam", "yulaf", "pirinc_unu"],
  ["patates", "tatli_patates"],
  ["tr_pirinc_pilavi", "tr_bulgur_pilavi"],
  ["tavuk_gogsu", "hindi_gogsu", "dana_kiyma", "tavuk_incik", "somon"],
  ["suzme_yogurt", "lor_peyniri"],
  ["badem", "ceviz", "findik", "kaju", "yer_fistigi", "kabak_cekirdegi", "fistik_ezmesi"],
  ["brokoli_karnabahar", "ispanak_kabak", "domates_salatalik"]
];
// v20: gizlenen eski kayıt yerine listede kalan karşılığı (data.js "replace") kullanılır
function swapVisibleId(id) {
  const db = getFoodDB(), f = db[id];
  return f && f.hidden && f.replace && db[f.replace] && !isHiddenFood(db[f.replace]) ? f.replace : id;
}
function swapGroup(foodId) { return SWAP_GROUPS.find(g => g.includes(foodId) || g.some(id => swapVisibleId(id) === foodId)) || null; }
function swapOptions(item) {
  const db = getFoodDB();
  const g = swapGroup(item.foodId);
  const f0 = db[item.foodId];
  if (!g || !f0) return [];
  const kcal0 = kcalPerUnit(f0) * effAmount(item);
  const self = swapVisibleId(item.foodId);
  return [...new Set(g.map(swapVisibleId))].filter(id => id !== item.foodId && id !== self && db[id] && !isHiddenFood(db[id])).map(id => {
    const f = db[id];
    const eff = Math.max(5, Math.round(kcal0 / kcalPerUnit(f) / 5) * 5);
    return { id, f, eff, kcal: Math.round(kcalPerUnit(f) * eff), p: f.p * eff, c: f.c * eff, fat: f.f * eff };
  });
}
// dest: "menu" (Menülerim) veya "day" (Bugün: yalnızca bugünü değiştirir)
function openSwap(mIdx, iIdx, dest) {
  const list = dest === "day" ? dayMeals() : curMeals();
  const item = list[mIdx] && list[mIdx].items[iIdx];
  if (!item || item.est) return;
  const f0 = getFoodDB()[item.foodId];
  const opts = swapOptions(item);
  if (!opts.length) return;
  const items = opts.map(o => ({ id: o.id, eff: o.eff, label: o.f.name, sub: `${fmtNum(o.eff)} ${o.f.unit} · ${o.kcal} kcal · ${Math.round(o.p)}P ${Math.round(o.c)}K ${Math.round(o.fat)}Y` }));
  openPicker(`${f0.name} yerine`, [{ label: `Şu an: ${fmtNum(effAmount(item))} ${f0.unit} · ${Math.round(kcalPerUnit(f0) * effAmount(item))} kcal`, short: "Alternatifler", items }], it => {
    snapshot();
    const l2 = dest === "day" ? ensureDayCopy() : curMeals();
    const cur = l2[mIdx] && l2[mIdx].items[iIdx];
    if (!cur) return;
    const nf = getFoodDB()[it.id];
    cur.foodId = it.id;
    cur.amount = rawFromEff(nf, it.eff);
    renderAll();
    offerUndo(`${f0.name} → ${nf.name} (${fmtNum(it.eff)} ${nf.unit})${dest === "day" ? " · yalnızca bugün" : ""}`);
  });
}

// ---------------------------------------------------------------------------
// GENEL BESLENME ÇİZİMİ
// ---------------------------------------------------------------------------
const openDoneMeals = new Set();   // Bugün: açılmış "yenmiş" öğünler (kaydedilmez)
const openMenuMeals = new Set();   // Menülerim: açılmış öğünler (kaydedilmez)
function toggleMealOpen(mIdx) {
  const m = dayMeals()[mIdx];
  if (!m) return;
  if (openDoneMeals.has(m.id)) openDoneMeals.delete(m.id); else openDoneMeals.add(m.id);
  renderAll();
}
function toggleMenuMeal(mIdx) {
  const m = curMeals()[mIdx];
  if (!m) return;
  if (openMenuMeals.has(m.id)) openMenuMeals.delete(m.id); else openMenuMeals.add(m.id);
  renderAll();
}

function mealTotals(meal) {
  let p = 0, c = 0, f = 0, cal = 0, n = 0;
  meal.items.forEach(i => { if (!i.est && !getFoodDB()[i.foodId]) return; const x = calcItemMacros(i); p += x.p; c += x.c; f += x.f; cal += x.cal; n++; });
  return { p, c, f, cal, n };
}
function macroLine(p, c, f, dec) {
  const v = x => dec ? fmtNum(x) : Math.round(x);
  return `<span class="n-p">${v(p)}P</span> <span class="n-k">${v(c)}K</span> <span class="n-y">${v(f)}Y</span>`;
}

function renderNutrition() {
  const st = state.settings;
  const view = NUTRI_VIEWS.some(x => x[0] === state.nutriView) ? state.nutriView : "today";
  $("nutriNav").innerHTML = NUTRI_VIEWS.map(([k, l]) => `<button onclick="setNutriView('${k}')" class="n-tab ${view === k ? "on" : ""}" ${view === k ? 'aria-current="page"' : ""}>${l}</button>`).join("");
  [["today", "nvToday"], ["menus", "nvMenus"], ["foods", "nvFoods"], ["history", "nvHistory"]].forEach(([k, id]) => $(id).classList.toggle("hidden", k !== view));

  // v34: yalnızca açık alt ekran çizilir (gizli ekranlar açıldıklarında setNutriView → renderAll ile güncellenir)
  if (view === "menus") renderWeightBlock(st);

  const isRest = state.dayType === "rest";
  ["btnTrain", "mnTrain"].forEach(id => { $(id).className = isRest ? "" : "on"; });
  ["btnRest", "mnRest"].forEach(id => { $(id).className = isRest ? "on" : ""; });
  $("planSub").textContent = `${isRest ? "Dinlenme" : "Antrenman"} menüsü · hedef ${fmtInt(getTargets().calTarget)} kcal`;

  if (view === "today") { renderWater(); renderSupps(); renderHero(); renderTodayMeals(); }
  else if (view === "menus") renderMenus();
  else if (view === "foods") renderFoods();
  else renderNutriHistory();
}
// Menülerim: güncel kilo, kalori açığı, koç ipucu
function renderWeightBlock(st) {
  const logged = state.weightLogs.map(l => num(l.weight, 0)).filter(w => w > 0);
  const minW = Math.floor(Math.min(num(st.targetWeight, 82) - 5, ...logged.map(w => w - 5), state.weight));
  const maxW = Math.ceil(Math.max(...logged.map(w => w + 10), state.weight + 10, num(st.targetWeight, 82) + 10));
  const slider = $("weightSlider");
  slider.min = minW; slider.max = maxW; slider.value = state.weight;
  $("weightVal").textContent = fmtNum(state.weight);
  $("deficitSlider").value = state.deficit;
  $("deficitVal").textContent = state.deficit;
  $("weightHistoryText").textContent = state.weightLogs.length > 0
    ? state.weightLogs.slice(-3).map(l => `${fmtNum(num(l.weight))} kg (${l.date})`).join(" → ")
    : `Hedef: ${fmtNum(num(st.targetWeight, 82))} kg`;
  const wa7 = weightAvg7();
  $("weightAvgText").textContent = wa7 ? `7 günlük ortalama: ${fmtNum(wa7.avg)} kg (${wa7.n} tartı)` : "";
  $("weightAvgText").classList.toggle("hidden", !wa7);
  const target = num(st.targetWeight, 82);
  const diffKg = state.weight - target;
  const weeklyLoss = (state.deficit * 7) / 7700;
  $("timelineInfo").textContent = diffKg <= 0 ? `${fmtNum(target)} kg hedefine ulaştın!`
    : weeklyLoss > 0 ? `Haftalık ~${fmtKg(weeklyLoss)} kg kayıp → ${fmtNum(target)} kg hedefine ~${Math.ceil(diffKg / weeklyLoss)} hafta`
    : "Kalori açığı yok: kilo koruma modu";
  const hint = coachHintText();
  $("coachHint").classList.toggle("hidden", !hint);
  $("coachHint").textContent = hint;
}

function renderHero() {
  const targets = getTargets();
  const plan = nutritionTotals();
  const eaten = eatenTotals();
  const view = state.settings.macroView === "plan" ? "plan" : "eaten";
  const shown = view === "eaten" ? eaten : plan;
  updateMacroCard("cal", shown.cal, targets.calTarget, "kcal");
  updateMacroCard("pro", shown.p, targets.proTarget, "g");
  updateMacroCard("carb", shown.c, targets.carbTarget, "g");
  updateMacroCard("fat", shown.f, targets.fatTarget, "g");
  const meals = dayMeals();
  $("mmPlanVal").textContent = fmtInt(plan.cal);
  $("mmEatenVal").textContent = fmtInt(eaten.cal);
  $("mmEatenMeals").textContent = `${meals.filter(m => m.done).length}/${meals.length}`;
  $("mmPlan").className = view === "plan" ? "on" : "";
  $("mmEaten").className = view === "eaten" ? "on" : "";
  renderMicroLine(view);
}

function updateMacroCard(prefix, consumed, target, unit) {
  const cRound = Math.round(consumed);
  const diff = target - cRound;
  const over = diff < 0;
  const pct = target > 0 ? Math.min(100, Math.round((cRound / target) * 100)) : 0;
  $(`${prefix}Consumed`).textContent = fmtInt(cRound);
  $(`${prefix}Target`).textContent = fmtInt(target);
  const st = $(`${prefix}Status`);
  if (prefix === "cal") {
    st.innerHTML = `<div class="text-[12px] font-semibold ${over ? "text-[#FB7185]" : "text-white/70"}">${over ? "Aşım" : "Kalan"}</div>
      <div class="flex items-baseline gap-1 whitespace-nowrap"><span class="t-display text-[34px] leading-none tabular-nums ${over ? "text-[#FB7185]" : "text-white"}">${over ? "+" : ""}${fmtInt(Math.abs(diff))}</span><span class="text-[12px] font-semibold text-white/80">kcal</span></div>`;
    const ring = $("calRing");
    const C = 301.59;
    ring.style.strokeDashoffset = String(C - (C * pct) / 100);
    ring.setAttribute("stroke", over ? "#FB7185" : "#22C55E");
    return;
  }
  st.textContent = over ? `+${Math.abs(diff)} ${unit} aşım` : `${diff} ${unit} kaldı`;
  st.className = "text-[12px] mt-0.5 font-semibold " + (over ? "text-[#FB7185]" : "text-white/60");
  $(`${prefix}Bar`).style.width = `${pct}%`;
}

// v24: Su hedefi. Açıkken kilo × 35 ml (+0,5 L listede kreatin varsa), kapalıyken Profil'de elle yazılan değer.
function hasCreatine() { return state.supplementList.some(x => /kreatin|creatine/.test(normSearch(x.name))); }
function waterAutoInfo(weight) {
  const w = num(weight === undefined ? state.weight : weight, 0);
  if (!(w >= 30 && w <= 300)) return null;
  const base = Math.round(w * 0.035 * 10) / 10, cr = hasCreatine();
  return { w, base, cr, total: Math.round((base + (cr ? 0.5 : 0)) * 10) / 10 };
}
function waterTargetL() {
  if (state.settings.waterAuto !== false) { const a = waterAutoInfo(); if (a) return a.total; }
  return num(state.settings.waterTarget, 3.5);
}
const WATER_RING_C = 364.42;   // 2π × 58
function renderWater() {
  const wt = waterTargetL();
  const w = state.waterLiters || 0;
  const pct = wt > 0 ? Math.min(100, Math.round(w / wt * 100)) : 0;
  $("waterVal").textContent = fmtKg(w);
  $("waterTarget").textContent = fmtNum(wt);
  $("waterPct").textContent = "%" + pct;
  $("waterRing").style.strokeDashoffset = String(Math.round(WATER_RING_C * (1 - pct / 100) * 100) / 100);
  const a = state.settings.waterAuto !== false ? waterAutoInfo() : null;
  $("waterNote").textContent = a ? `Kilona göre: ${fmtNum(a.w)} kg × 35 ml${a.cr ? " + 0,5 L kreatin" : ""}`
    : state.settings.waterAuto !== false ? "Kilo girilmemiş; Profil'deki hedef kullanılıyor." : "Hedef Profil'de elle ayarlı.";
}

// ---------------------------------------------------------------------------
// BUGÜN: zaman çizelgesi
// ---------------------------------------------------------------------------
function renderTodayMeals() {
  const db = getFoodDB();
  const meals = dayMeals();
  const nextIdx = meals.findIndex(m => !m.done);
  if (!meals.length) {
    $("todayMeals").innerHTML = `<div class="n-card rounded-[22px] p-5 text-center space-y-3"><p class="text-[14px] n-muted">Bu menüde henüz öğün yok.</p>
      <button onclick="setNutriView('menus')" class="n-btn h-12 px-6 rounded-full text-[14px]">Menülerim'e git</button></div>`;
    return;
  }
  const changed = dayChangedIds();
  const savable = meals.some(m => changed.has(m.id) && !mealHasEst(m));
  let banner = "";
  if (dayCopy() && changed.size) {
    const tg = getTargets().calTarget;
    const over = Math.round(nutritionTotals(meals).cal - tg);
    const canBalance = over > Math.max(50, Math.round(tg * 0.05)) && meals.some(m => !m.done);
    banner = `<div id="dayDiffBanner" class="n-card rounded-[20px] p-3.5 mb-3 space-y-2.5">
        <div class="text-[14px] font-bold">Bugüne özel değişiklikler var</div>
        <p class="text-[12px] n-muted">Menülerim değişmedi. Bugünkü hâli menüye de kaydedebilir ya da menüdeki hâline dönebilirsin.${canBalance ? ` Bugün hedefi <strong class="n-over">${fmtInt(over)} kcal</strong> aşıyor.` : ""}</p>
        <div class="grid grid-cols-2 gap-2">
          ${savable ? `<button onclick="saveDayToMenu()" class="n-btn h-11 rounded-full text-[13px]">Menüye de kaydet</button>` : ""}
          <button onclick="revertDayToMenu()" class="n-btn-ghost h-11 rounded-full text-[13px] ${savable ? "" : "col-span-2"}">Bugünü menüye geri döndür</button>
          ${canBalance ? `<button onclick="balanceDayNow()" class="n-btn-outline h-11 rounded-full text-[13px] col-span-2">Günü dengele (kalan öğünlerden kıs)</button>` : ""}
        </div>
      </div>`;
  }
  $("todayMeals").innerHTML = banner + meals.map((meal, mIdx) => {
    const t = mealTotals(meal);
    const isNext = mIdx === nextIdx;
    const last = mIdx === meals.length - 1;
    const collapsed = meal.done && !openDoneMeals.has(meal.id);
    const editing = openEditMeals.has(meal.id);
    const rail = `<div class="flex flex-col items-center w-11 shrink-0">
        <label class="w-11 h-11 flex items-center justify-center cursor-pointer"><input type="checkbox" ${meal.done ? "checked" : ""} onchange="toggleMealDone(${mIdx})" class="n-check" aria-label="${esc(meal.title)}: yedim" /></label>
        ${last ? "" : '<div class="w-[1.5px] flex-1 n-rail my-1 rounded-full"></div>'}
      </div>`;
    const time = meal.time ? esc(meal.time) : "";
    if (collapsed && !editing) {
      return `<div class="flex gap-2" data-today-meal="${mIdx}">${rail}
        <button onclick="toggleMealOpen(${mIdx})" class="flex-1 min-w-0 min-h-[52px] mb-3 flex items-center justify-between gap-3 text-left" aria-expanded="false" aria-label="${esc(meal.title)} öğününü aç">
          <div class="min-w-0"><div class="text-[12px] font-semibold n-muted">${time ? time + " · " : ""}yendi${changed.has(meal.id) ? " · bugüne özel" : ""}</div><div class="text-[16px] font-bold n-muted truncate">${esc(meal.title)}</div></div>
          <div class="text-[14px] font-semibold n-muted whitespace-nowrap shrink-0">${fmtInt(t.cal)} kcal</div>
        </button></div>`;
    }
    const status = meal.done ? "TAMAMLANDI" : isNext ? "SIRADAKİ" : "";
    const label = [time, status, changed.has(meal.id) ? "BUGÜNE ÖZEL" : ""].filter(Boolean).join(" · ");
    const items = meal.items.map((item, iIdx) => {
      if (item.est) {
        const e = item.est;
        return `<div class="flex items-center justify-between gap-2 min-h-[44px] py-1" data-est="1">
            <div class="min-w-0 flex-1 text-[14px] leading-snug"><span class="font-semibold">${esc(e.name)}</span> <span class="n-muted whitespace-nowrap">· tahmini · ${fmtInt(num(e.p))} g P</span></div>
            <span class="text-[13px] font-semibold n-muted tabular-nums w-10 text-right shrink-0">${fmtInt(num(e.cal))}</span>
            ${editing ? `<button onclick="dayRemoveItem(${mIdx}, ${iIdx})" class="w-11 h-11 -my-1 -mr-2 shrink-0 rounded-full flex items-center justify-center n-over" aria-label="${esc(e.name)} çıkar">${svgI("x", 18, 2.2)}</button>` : ""}
          </div>`;
      }
      const f = db[item.foodId];
      if (!f) return "";
      const mac = calcItemMacros(item);
      const canSwap = !!swapGroup(item.foodId);
      if (editing) {
        return `<div class="py-2">
            <div class="flex items-center gap-1 min-h-[24px]">
              <div class="flex-1 min-w-0 text-[14px] font-semibold truncate">${esc(f.name)}</div>
              <div class="shrink-0 text-[13px] font-bold tabular-nums">${Math.round(mac.cal)} <span class="text-[12px] font-semibold n-dim">kcal</span></div>
              <button onclick="dayRemoveItem(${mIdx}, ${iIdx})" class="w-11 h-11 -my-2.5 -mr-2 shrink-0 rounded-full flex items-center justify-center n-over" aria-label="${esc(f.name)} bugünden çıkar">${svgI("x", 18, 2.2)}</button>
            </div>
            <div class="flex items-center justify-end gap-1 mt-1.5">
              <button onclick="dayChangeAmount(${mIdx}, ${iIdx}, -1)" class="n-btn-ghost w-11 h-11 shrink-0 rounded-xl flex items-center justify-center" aria-label="${esc(f.name)} azalt">${svgI("minus", 18, 2.4)}</button>
              <input type="text" inputmode="decimal" data-fk="damt-${mIdx}-${iIdx}" value="${esc(fmtNum(effAmount(item)))}" onchange="daySetAmount(${mIdx}, ${iIdx}, this.value)" class="n-amt shrink-0" aria-label="${esc(f.name)} bugünkü miktarı" />
              <span class="text-[12px] n-muted w-10 min-w-0 truncate">${esc(f.unit)}</span>
              <button onclick="dayChangeAmount(${mIdx}, ${iIdx}, 1)" class="n-btn-ghost w-11 h-11 shrink-0 rounded-xl flex items-center justify-center" aria-label="${esc(f.name)} artır">${svgI("plus", 18, 2.4)}</button>
            </div>
          </div>`;
      }
      return `<div class="flex items-center justify-between gap-2 min-h-[44px] py-1">
          <div class="min-w-0 flex-1 text-[14px] leading-snug"><span class="font-semibold">${esc(f.name)}</span> <span class="n-muted whitespace-nowrap">· ${fmtNum(effAmount(item))} ${esc(f.unit)}</span></div>
          ${canSwap ? `<button onclick="openSwap(${mIdx}, ${iIdx}, 'day')" class="n-chip swap text-[12px]" aria-label="${esc(f.name)} için ikame seç">⇄<span class="swap-txt"> İkame</span></button>` : ""}
          <span class="text-[13px] font-semibold n-muted tabular-nums w-10 text-right shrink-0">${Math.round(mac.cal)}</span>
        </div>`;
    }).join("");
    const last1 = editing ? lastDayMealFor(meal) : null;
    const editPanel = editing ? `<div class="pt-2 n-bt space-y-2" data-edit-panel="${mIdx}">
        <div class="text-[12px] n-muted">Buradaki değişiklikler yalnızca bugünü etkiler; menün aynı kalır.</div>
        <div class="grid grid-cols-2 gap-2">
          <button onclick="halfMeal(${mIdx})" class="n-btn-ghost h-11 rounded-full text-[13px]">½ Yarısını yedim</button>
          <button onclick="openFreeMeal(${mIdx})" class="n-btn-ghost h-11 rounded-full text-[13px]">Dışarıda yedim</button>
          ${last1 ? `<button onclick="repeatLastMeal(${mIdx})" class="n-btn-ghost h-11 rounded-full text-[13px] flex items-center justify-center gap-1.5" data-repeat="${mIdx}">${svgI("repeat", 16)}${dayLabelShort(last1.key)} gibi</button>` : ""}
          <button onclick="saveMealAsCombo(${mIdx}, 'day')" class="n-btn-ghost h-11 rounded-full text-[13px] flex items-center justify-center gap-1.5 ${last1 ? "" : "col-span-2"}">${svgI("star", 16)}Kombo kaydet</button>
        </div>
      </div>` : "";
    const headOpen = meal.done && !editing;
    return `<div class="flex gap-2" data-today-meal="${mIdx}">${rail}
      <div class="flex-1 min-w-0 pb-3">
        <div class="n-card ${isNext ? "n-next" : ""} rounded-[22px] p-4 space-y-2">
          ${headOpen
            ? `<button onclick="toggleMealOpen(${mIdx})" class="w-full flex items-start justify-between gap-3 text-left min-h-[44px]" aria-expanded="true" aria-label="${esc(meal.title)} öğününü kapat">`
            : `<div class="flex items-start justify-between gap-3">`}
            <div class="min-w-0">
              ${label ? `<div class="text-[12px] font-bold tracking-wide n-accent">${label}</div>` : ""}
              <h3 class="text-[18px] font-extrabold leading-tight mt-0.5 break-words">${esc(meal.title)}</h3>
              ${meal.targetNote ? `<div class="text-[12px] n-muted mt-0.5">${esc(meal.targetNote)}</div>` : ""}
              ${num(meal.balanced, 0) < 0 ? `<div class="text-[12px] font-semibold n-k mt-0.5" data-balanced="${mIdx}">Gün dengelendi: bu öğünden ${fmtInt(-meal.balanced)} kcal kısıldı</div>` : ""}
            </div>
            <div class="text-right shrink-0 whitespace-nowrap"><span class="t-display text-[24px] leading-none tabular-nums">${fmtInt(t.cal)}</span><span class="text-[12px] n-muted ml-0.5">kcal</span>
              <div class="text-[12px] font-semibold tabular-nums mt-0.5">${macroLine(t.p, t.c, t.f)}</div></div>
          ${headOpen ? "</button>" : "</div>"}
          <div class="n-div">${items || '<div class="text-[13px] n-dim py-2">Bu öğünde henüz besin yok.</div>'}</div>
          ${editPanel}
          <div class="flex gap-2 pt-1">
            <button onclick="toggleMealDone(${mIdx})" class="${meal.done ? "n-btn-ghost" : "n-btn"} flex-1 min-w-0 h-12 rounded-full text-[14px] flex items-center justify-center gap-1.5">${meal.done ? svgI("check", 18, 2.6) + "Yendi" : "Yedim"}</button>
            <button onclick="goAddFood(${mIdx}, 'day')" class="n-btn-outline flex-1 min-w-0 h-12 rounded-full text-[14px] flex items-center justify-center gap-1.5">${svgI("plus", 18, 2.4)}Besin</button>
            <button onclick="toggleMealEdit(${mIdx})" class="${editing ? "n-btn" : "n-btn-ghost"} w-12 h-12 shrink-0 rounded-full flex items-center justify-center" aria-expanded="${editing}" aria-label="${esc(meal.title)}: bugün için düzenle" data-edit-btn="${mIdx}">${svgI(editing ? "check" : "edit", 18, 2.2)}</button>
          </div>
        </div>
      </div></div>`;
  }).join("");
}

// ---------------------------------------------------------------------------
// v14 — "SADECE BUGÜN": Bugün ekranındaki değişiklikler menünün o güne ait
// kopyasında yapılır (state.dayPlan). Menülerim yalnızca "Menüye de kaydet" ile değişir.
// Gece yarısı kopya arşivlenir ve silinir; yeni gün menüden temiz başlar.
// ---------------------------------------------------------------------------
const openEditMeals = new Set();   // Bugün: düzenleme modu açık öğünler (kaydedilmez)
function dayKind() { return state.dayType === "rest" ? "rest" : "train"; }
function dayKey() { return state.today || logicalToday(); }
function dayCopy() {
  const dp = state.dayPlan;
  return dp && dp.date === dayKey() && Array.isArray(dp[dayKind()]) ? dp[dayKind()] : null;
}
function dayMeals() { return dayCopy() || curMeals(); }
function ensureDayCopy() {
  const c = dayCopy();
  if (c) return c;
  if (!state.dayPlan || state.dayPlan.date !== dayKey()) state.dayPlan = { date: dayKey(), train: null, rest: null };
  const copy = clone(curMeals());
  state.dayPlan[dayKind()] = copy;
  return copy;
}
// Menüler + bugüne özel kopyalar (besin silme, gramaj sabitleme gibi toplu işlemler için)
function allMealLists() {
  const out = [state.meals, state.restMeals];
  const dp = state.dayPlan;
  if (dp) ["train", "rest"].forEach(k => { if (Array.isArray(dp[k])) out.push(dp[k]); });
  return out;
}
function mealHasEst(m) { return m.items.some(i => i.est); }
function itemsSig(items) {
  return JSON.stringify(items.map(i => i.est ? ["~", String(i.est.name), num(i.est.cal)] : [i.foodId, round1(num(i.amount))]));
}
// Bugüne özel kopyada menüden farklı olan öğünlerin kimlikleri
function dayChangedIds() {
  const out = new Set();
  const c = dayCopy();
  if (!c) return out;
  const menu = curMeals();
  c.forEach(m => {
    const mm = menu.find(x => x.id === m.id);
    if (!mm || itemsSig(mm.items) !== itemsSig(m.items)) out.add(m.id);
  });
  return out;
}
function toggleMealEdit(mIdx) {
  const m = dayMeals()[mIdx];
  if (!m) return;
  if (openEditMeals.has(m.id)) openEditMeals.delete(m.id); else openEditMeals.add(m.id);
  renderAll();
}
function dayChangeAmount(mIdx, iIdx, dir) {
  const c = ensureDayCopy();
  const item = c[mIdx] && c[mIdx].items[iIdx];
  if (!item || item.est) return;
  const f = getFoodDB()[item.foodId];
  const next = Math.max(0, round1(effAmount(item) + dir * (f ? num(f.step, 1) : 1)));
  if (next === 0) { dayRemoveItem(mIdx, iIdx); return; }
  item.amount = rawFromEff(f, next);
  renderAll();
}
function daySetAmount(mIdx, iIdx, val) {
  const n = num(val, NaN);
  const c = ensureDayCopy();
  const item = c[mIdx] && c[mIdx].items[iIdx];
  if (!item || item.est) return;
  if (!isFinite(n) || n <= 0) { dayRemoveItem(mIdx, iIdx); return; }
  item.amount = rawFromEff(getFoodDB()[item.foodId], round1(n));
  renderAll();
}
function dayRemoveItem(mIdx, iIdx) {
  snapshot();
  const c = ensureDayCopy();
  if (!c[mIdx] || !c[mIdx].items[iIdx]) return;
  const it = c[mIdx].items.splice(iIdx, 1)[0];
  const f = it.est ? null : getFoodDB()[it.foodId];
  renderAll();
  offerUndo(`${it.est ? it.est.name : f ? f.name : "Besin"} bugünden çıkarıldı`);
}
// Öğünün yarısı yendi: bugünkü miktarlar yarıya iner, öğün yendi işaretlenir
function halfMeal(mIdx) {
  snapshot();
  const c = ensureDayCopy();
  const m = c[mIdx];
  if (!m) return;
  const db = getFoodDB();
  m.items.forEach(it => {
    if (it.est) { ["cal", "p", "c", "f"].forEach(k => { it.est[k] = round1(num(it.est[k]) / 2); }); return; }
    const f = db[it.foodId];
    if (!f) return;
    it.amount = rawFromEff(f, Math.max(0.1, round1(effAmount(it) / 2)));
  });
  m.done = true;
  openDoneMeals.delete(m.id);
  openEditMeals.delete(m.id);
  renderAll();
  offerUndo(`½ ${m.title}: yarısı yendi (yalnızca bugün)`);
}
function saveDayToMenu() {
  const c = dayCopy();
  if (!c) return;
  snapshot();
  const changed = dayChangedIds();
  const menu = curMeals();
  let n = 0, skipped = 0;
  c.forEach(m => {
    if (!changed.has(m.id)) return;
    if (mealHasEst(m)) { skipped++; return; }
    const mm = menu.find(x => x.id === m.id);
    if (!mm) return;
    mm.items = clone(m.items);
    n++;
  });
  renderAll();
  offerUndo(`${n} öğün menüye kaydedildi${skipped ? ` · dışarıda yenen ${skipped} öğün menüye yazılmadı` : ""}`);
}
function revertDayToMenu() {
  const c = dayCopy();
  if (!c) return;
  snapshot();
  const menu = curMeals();
  c.forEach(m => { const mm = menu.find(x => x.id === m.id); if (mm) mm.done = !!m.done; });
  state.dayPlan[dayKind()] = null;
  openEditMeals.clear();
  renderAll();
  offerUndo("Bugün menüdeki hâline döndü");
}

// ---------------------------------------------------------------------------
// v14 — DIŞARIDA YEDİM (tahmini giriş) ve GÜNÜ DENGELE
// ---------------------------------------------------------------------------
let fmIdx = -1;
function openFreeMeal(mIdx) {
  const m = dayMeals()[mIdx];
  if (!m) return;
  fmIdx = mIdx;
  $("fmMeal").textContent = m.title;
  ["fmName", "fmKcal", "fmP", "fmC", "fmF"].forEach(id => { $(id).value = ""; });
  $("fmReplace").checked = true;
  $("fmBalance").checked = false;
  updateFreeMealHint();
  openModal("freeMealModal");
}
function freeMealPreview() {
  const meals = dayMeals();
  const m = meals[fmIdx];
  if (!m) return null;
  const kcal = num($("fmKcal").value, 0);
  const total = nutritionTotals(meals).cal - ($("fmReplace").checked ? mealTotals(m).cal : 0) + Math.max(0, kcal);
  const target = getTargets().calTarget;
  return { total, target, over: Math.round(total - target) };
}
function updateFreeMealHint() {
  const pv = freeMealPreview();
  if (!pv) return;
  const tol = Math.max(50, Math.round(pv.target * 0.05));
  $("fmHint").innerHTML = pv.over > 0
    ? `Bu girişle bugün <strong>${fmtInt(pv.total)} kcal</strong> olur; hedefi <strong class="n-over">${fmtInt(pv.over)} kcal</strong> aşar.`
    : `Bu girişle bugün <strong>${fmtInt(pv.total)} kcal</strong> olur; hedefin (${fmtInt(pv.target)} kcal) altında kalırsın.`;
  const can = pv.over > tol;
  $("fmBalance").disabled = !can;
  if (!can) $("fmBalance").checked = false;
  $("fmBalance").classList.toggle("opacity-40", !can);   // v33: açıklama okunur kalsın, yalnız anahtar soluk
}
function saveFreeMeal() {
  const kcal = num($("fmKcal").value, NaN);
  const p = num($("fmP").value, NaN);
  if (!(kcal > 0) || kcal > 6000) { sayAlert("Kalori eksik", "Lütfen tahmini kaloriyi yaz (örn: 850)."); return; }
  if (!isFinite(p) || p < 0 || p * 4 > kcal * 1.2) { sayAlert("Protein eksik", "Lütfen tahmini proteini gram olarak yaz (bilmiyorsan 0 yazabilirsin). Protein, kaloriden fazla olamaz."); return; }
  const cv = num($("fmC").value, NaN), fv = num($("fmF").value, NaN);
  if ((isFinite(cv) && cv < 0) || (isFinite(fv) && fv < 0)) { sayAlert("Değer hatalı", "Karb ve yağ negatif olamaz."); return; }
  snapshot();
  const c = ensureDayCopy();
  const m = c[fmIdx];
  if (!m) return;
  const est = { name: $("fmName").value.trim().slice(0, 50) || "Dışarıda yemek", cal: Math.round(kcal), p: round1(p), c: isFinite(cv) ? round1(cv) : 0, f: isFinite(fv) ? round1(fv) : 0 };
  const it = { foodId: "_est", amount: 1, est };
  if ($("fmReplace").checked) m.items = [it]; else m.items.push(it);
  m.done = true;
  openDoneMeals.delete(m.id);
  openEditMeals.delete(m.id);
  let msg = `✓ ${shortMealTitle(m)}: ${est.cal} kcal tahmini girildi (yalnızca bugün)`;
  if ($("fmBalance").checked) msg += balanceDay(fmIdx).msg;
  closeModal("freeMealModal");
  renderAll();
  offerUndo(msg);
}
function balanceDayNow() {
  snapshot();
  const r = balanceDay(-1);
  renderAll();
  if (r.parts.length) offerUndo("" + r.msg.replace(/^ · /, "")); else toast(r.msg.replace(/^ · /, ""), "error");
}
// Kalan (yenmemiş) öğünlerde karb/yağ ağırlıklı besinleri orantılı kısar; protein kaynakları
// (kalorisinin %40+'ı proteinden gelen besinler) değişmez. Hedef aşımını kapatmaya çalışır.
function balanceDay(skipIdx) {
  const meals = ensureDayCopy();
  const target = getTargets().calTarget;
  const over = nutritionTotals(meals).cal - target;
  if (over <= 20) return { msg: " · gün zaten hedefte, kısmaya gerek yok", parts: [] };
  const db = getFoodDB();
  const cands = [];
  meals.forEach((m, mi) => {
    if (mi === skipIdx || m.done) return;
    m.items.forEach(it => {
      if (it.est) return;
      const f = db[it.foodId];
      if (!f) return;
      const x = calcItemMacros(it);
      // 50 kcal altı (sebze, salata gibi) ve protein ağırlıklı besinlere dokunulmaz
      if (x.cal < 50 || (x.p * 4) / x.cal >= 0.4) return;
      cands.push({ m, it, f, cal: x.cal });
    });
  });
  // Her besinden en fazla %75 kısılır (en az dörtte biri kalır; besin tamamen silinmez)
  const avail = cands.reduce((a, b) => a + b.cal, 0) * BALANCE_MAX_CUT;
  if (avail <= 0) return { msg: " · kalan öğünlerde kısılabilecek karb/yağ ağırlıklı besin yok", parts: [] };
  const k = 1 - BALANCE_MAX_CUT * Math.min(1, over / avail);
  const before = new Map(meals.map(m => [m, mealTotals(m).cal]));
  cands.forEach(c => {
    const eff = effAmount(c.it);
    let ne = eff * k;
    ne = isScalable(c.f) ? Math.round(ne / 5) * 5 : Math.round(ne * 2) / 2;
    ne = Math.max(ne, isScalable(c.f) ? 5 : 0.5, 0);
    if (ne < eff) c.it.amount = rawFromEff(c.f, ne);
  });
  const parts = [];
  meals.forEach(m => {
    const d = Math.round(mealTotals(m).cal - before.get(m));
    if (d < 0) { m.balanced = Math.round(num(m.balanced, 0) + d); parts.push(`${shortMealTitle(m)} −${fmtInt(-d)}`); }
  });
  return { msg: ` · Günü dengeledim: ${parts.join(", ")} kcal${avail < over ? " (aşımın tamamı kapatılamadı)" : ""}`, parts };
}
const BALANCE_MAX_CUT = 0.75;
// "2. Öğün: Öğle Yemeği (...)" → "2. Öğün"; uzun adlar kısaltılır
function shortMealTitle(m) {
  const t = String(m.title || "");
  const i = t.indexOf(":");
  if (i > 0 && i <= 16) return t.slice(0, i);
  return t.length > 18 ? t.slice(0, 17) + "…" : t;
}

// ---------------------------------------------------------------------------
// MENÜLERİM
// ---------------------------------------------------------------------------
// v22: Proteinin öğünlere dağılımı (genel öneri: öğün başına ~20–40 g). Yalnızca içinde besin olan öğünler.
function proteinSpreadHtml(meals) {
  const rows = meals.filter(m => m.items.length).map(m => ({ t: shortMealTitle(m), p: mealTotals(m).p }));
  if (rows.length < 2) return "";
  const max = Math.max(40, ...rows.map(r => r.p));
  const low = rows.filter(r => r.p < 20).length;
  return `<div class="n-bt pt-3 space-y-1.5" data-protein-spread>
      <div class="flex items-baseline justify-between gap-2"><span class="n-label">PROTEİN DAĞILIMI</span><span class="text-[12px] n-dim">öğün başına ~20–40 g önerilir</span></div>
      ${rows.map(r => `<div class="flex items-center gap-2 text-[12px]">
        <span class="w-[92px] shrink-0 truncate n-muted">${esc(r.t)}</span>
        <span class="relative flex-1 h-2 rounded-full n-bar-bg overflow-hidden">
          <span class="absolute inset-y-0 rounded-full" style="left:${20 / max * 100}%;width:${20 / max * 100}%;background:var(--n-accent-soft)"></span>
          <span class="absolute inset-y-0 left-0 rounded-full" style="width:${Math.min(100, r.p / max * 100)}%;background:var(--n-p)"></span>
        </span>
        <span class="w-[46px] shrink-0 text-right tabular-nums ${r.p < 20 ? "n-k font-bold" : "n-text font-semibold"}">${Math.round(r.p)} g</span>
      </div>`).join("")}
      ${low ? `<p class="text-[12px] n-dim">${low} öğünde protein 20 g'ın altında; günlük toplam aynı kalsa da proteini öğünlere yaymak tokluk ve kas onarımı için daha iyi.</p>` : ""}
    </div>`;
}
function renderMenus() {
  const db = getFoodDB();
  const targets = getTargets();
  const plan = nutritionTotals(curMeals());
  const diff = Math.round(plan.cal) - targets.calTarget;
  const tol = Math.max(50, Math.round(targets.calTarget * 0.05));
  const ok = Math.abs(diff) <= tol;
  const statusHtml = ok
    ? `<span class="font-bold n-accent flex items-center gap-1">${svgI("check", 16, 2.6)}Hedefe uygun</span>`
    : diff > 0 ? `<span class="font-bold n-over">${fmtInt(diff)} kcal fazla</span>` : `<span class="font-bold n-k">${fmtInt(-diff)} kcal eksik</span>`;
  const pk = plan.p * 4, ck = plan.c * 4, fk = plan.f * 9, sum = pk + ck + fk || 1;
  const pct = x => Math.round((x / sum) * 100);
  $("menuTotal").innerHTML = `
    <div class="flex items-center justify-between gap-2 text-[13px]"><span class="n-muted">Menü toplamı</span>${statusHtml}</div>
    <div class="flex items-baseline gap-1.5 flex-wrap"><span class="t-display text-[36px] leading-none tabular-nums">${fmtInt(plan.cal)}</span><span class="text-[14px] font-semibold n-muted">/ ${fmtInt(targets.calTarget)} kcal hedef</span></div>
    <div class="h-2.5 w-full rounded-full overflow-hidden flex gap-1" aria-hidden="true">
      <div class="h-full rounded-l-full" style="width:${pct(pk)}%;background:var(--n-p)"></div>
      <div class="h-full" style="width:${pct(ck)}%;background:var(--n-k)"></div>
      <div class="h-full rounded-r-full" style="width:${pct(fk)}%;background:var(--n-y)"></div>
    </div>
    <div class="grid grid-cols-3 gap-2 text-[12px]">
      <div><strong class="n-p text-[14px]">${Math.round(plan.p)} g</strong> <span class="n-muted">protein</span><div class="n-dim">hedef ${targets.proTarget} g · %${pct(pk)}</div></div>
      <div><strong class="n-k text-[14px]">${Math.round(plan.c)} g</strong> <span class="n-muted">karb</span><div class="n-dim">hedef ${targets.carbTarget} g · %${pct(ck)}</div></div>
      <div><strong class="n-y text-[14px]">${Math.round(plan.f)} g</strong> <span class="n-muted">yağ</span><div class="n-dim">hedef ${targets.fatTarget} g · %${pct(fk)}</div></div>
    </div>
    ${proteinSpreadHtml(curMeals())}`;

  // Kiloya göre gramaj kartı
  const st = state.settings;
  const k = scaleK();
  $("scaleCard").innerHTML = `
    <label class="flex items-center justify-between gap-3 cursor-pointer min-h-[44px]">
      <span class="min-w-0"><span class="block text-[15px] font-bold">Kiloya göre gramaj</span>
        <span class="block text-[12px] n-muted">Kilon değişince menüdeki gramajlar da orantılı değişir.</span></span>
      <input id="scaleToggle" type="checkbox" class="n-sw" ${st.scaleOn ? "checked" : ""} onchange="toggleWeightScale(this.checked)" />
    </label>
    ${st.scaleOn ? `
      <div class="n-elev rounded-2xl px-3.5 py-3 space-y-1">
        <div class="flex items-center justify-between gap-2 text-[14px]"><span class="n-muted">Başlangıç kilosu</span><strong>${fmtNum(num(st.scaleBase, state.weight))} kg</strong></div>
        <div class="flex items-center justify-between gap-2 text-[14px]"><span class="n-muted">Şimdiki kilo</span><strong>${fmtNum(state.weight)} kg</strong></div>
        <div class="flex items-center justify-between gap-2 text-[14px]"><span class="n-muted">Gramaj oranı</span><strong class="n-accent">%${Math.round(k * 100)}</strong></div>
      </div>
      <button onclick="resetScaleBase()" class="n-btn-outline w-full h-11 rounded-full text-[13px]">Bu gramajları yeni başlangıç yap (${fmtNum(state.weight)} kg)</button>
      <p class="text-[12px] n-dim">Yalnızca gram ve ml ile ölçülen besinler değişir (tavuk, pirinç, yulaf...). Adet, kase, ölçek gibi besinler aynı kalır. Oran en fazla %70–%130 arasında uygulanır. Ayarı kapatırsan menü son başlangıç yaptığın gramajlara döner.</p>
      ${num(st.calAdjust, 0) !== 0 ? `<p id="scaleCoachNote" class="text-[12px] n-k border border-current rounded-2xl px-3 py-2">Kalori koçu hedefini ${num(st.calAdjust, 0) > 0 ? "+" : ""}${fmtInt(num(st.calAdjust, 0))} kcal ayarladı. İkisi aynı düzeltmeyi iki kez yapmaz: gramajlar yalnızca kilona göre değişir, koç yalnızca hedef kaloriyi değiştirir. Bu yüzden koçun düzeltmesi menüye kendiliğinden yansımaz; menü toplamını hedefe uydurmak için öğünlerdeki gramajları ayarla.</p>` : ""}` : ""}`;

  // Öğün listesi
  const meals = curMeals();
  const copyLabel = state.dayType === "rest" ? "Antrenmana kopyala" : "Dinlenmeye kopyala";
  let html = meals.map((meal, mIdx) => {
    const t = mealTotals(meal);
    const open = openMenuMeals.has(meal.id);
    const head = `<div class="flex items-center gap-1">
        <button class="drag-handle w-11 h-11 -ml-2 shrink-0 flex items-center justify-center n-dim" data-midx="${mIdx}" aria-label="Öğünü sürükleyerek taşı" style="touch-action: none; cursor: grab;">
          <svg width="14" height="20" viewBox="0 0 14 20" fill="currentColor" aria-hidden="true"><circle cx="4" cy="4" r="1.6"></circle><circle cx="10" cy="4" r="1.6"></circle><circle cx="4" cy="10" r="1.6"></circle><circle cx="10" cy="10" r="1.6"></circle><circle cx="4" cy="16" r="1.6"></circle><circle cx="10" cy="16" r="1.6"></circle></svg>
        </button>
        <button onclick="toggleMenuMeal(${mIdx})" class="flex-1 min-w-0 min-h-[52px] flex items-center gap-3 text-left" aria-expanded="${open}" aria-label="${esc(meal.title)} öğününü ${open ? "kapat" : "aç"}">
          ${meal.time ? `<span class="t-display text-[18px] n-accent tabular-nums shrink-0">${esc(meal.time)}</span>` : ""}
          <span class="flex-1 min-w-0"><span class="block text-[15px] font-bold leading-snug break-words">${esc(meal.title)}</span>
            <span class="block text-[12px] n-muted tabular-nums mt-0.5">${fmtInt(t.cal)} kcal · ${macroLine(t.p, t.c, t.f)} · ${t.n} besin</span></span>
          <span class="n-dim shrink-0">${svgI(open ? "chevD" : "chevR", 18)}</span>
        </button>
      </div>`;
    if (!open) return `<div data-meal-card="${mIdx}" class="n-card rounded-[20px] px-3 py-1.5">${head}</div>`;
    const items = meal.items.map((item, iIdx) => {
      const f = db[item.foodId];
      if (!f) return "";
      const mac = calcItemMacros(item);
      const canSwap = !!swapGroup(item.foodId);
      return `<div class="py-2.5">
          <div class="flex items-center gap-1 min-h-[24px]">
            <div class="flex-1 min-w-0 text-[15px] font-semibold truncate">${esc(f.name)}</div>
            <div class="shrink-0 text-[14px] font-bold tabular-nums">${Math.round(mac.cal)} <span class="text-[12px] font-semibold n-dim">kcal</span></div>
            ${canSwap ? `<button onclick="openSwap(${mIdx}, ${iIdx})" class="w-11 h-11 -my-2.5 shrink-0 rounded-full flex items-center justify-center n-accent text-[18px] font-bold" aria-label="${esc(f.name)} için ikame seç">⇄</button>` : ""}
            <button onclick="removeItem(${mIdx}, ${iIdx})" class="w-11 h-11 -my-2.5 -mr-2 shrink-0 rounded-full flex items-center justify-center n-over" aria-label="${esc(f.name)} çıkar">${svgI("x", 18, 2.2)}</button>
          </div>
          <div class="flex items-center justify-between gap-2 mt-2">
            <div class="text-[12px] font-semibold tabular-nums leading-tight min-w-0">${macroLine(mac.p, mac.c, mac.f, true)}</div>
            <div class="flex items-center gap-1 shrink-0">
              <button onclick="changeAmount(${mIdx}, ${iIdx}, -1)" class="n-btn-ghost w-11 h-11 rounded-xl flex items-center justify-center" aria-label="${esc(f.name)} azalt">${svgI("minus", 18, 2.4)}</button>
              <input type="text" inputmode="decimal" data-fk="amt-${mIdx}-${iIdx}" value="${esc(fmtNum(effAmount(item)))}" onchange="setAmount(${mIdx}, ${iIdx}, this.value)" class="n-amt" aria-label="${esc(f.name)} miktarı" />
              <span class="text-[12px] n-muted w-12 truncate">${esc(f.unit)}</span>
              <button onclick="changeAmount(${mIdx}, ${iIdx}, 1)" class="n-btn-ghost w-11 h-11 rounded-xl flex items-center justify-center" aria-label="${esc(f.name)} artır">${svgI("plus", 18, 2.4)}</button>
            </div>
          </div>
        </div>`;
    }).join("");
    return `<div data-meal-card="${mIdx}" class="n-card n-sel rounded-[20px] px-3.5 pt-1.5 pb-3.5 space-y-3">
        ${head}
        ${meal.targetNote ? `<div class="text-[12px] n-muted -mt-2 pl-10">${esc(meal.targetNote)}</div>` : ""}
        <div class="n-div n-bt">${items || '<div class="text-[13px] n-dim py-3">Bu öğünde henüz besin yok.</div>'}</div>
        <button onclick="goAddFood(${mIdx}, 'menu')" class="n-btn w-full h-12 rounded-full text-[14px] flex items-center justify-center gap-1.5">${svgI("plus", 18, 2.4)}Besin ekle</button>
        <div class="flex gap-2 overflow-x-auto no-scrollbar -mx-0.5 px-0.5">
          <button onclick="quickAdd(${mIdx}, 'whey_shake', 1)" class="n-chip">+1 Shake</button>
          <button onclick="quickAdd(${mIdx}, 'yesil_salata', 1)" class="n-chip">+ Salata</button>
          <button onclick="quickAdd(${mIdx}, 'ceviz', 20)" class="n-chip">+20 g Ceviz</button>
        </div>
        <div class="flex flex-wrap items-center justify-end gap-1.5 pt-2 n-bt">
          <button onclick="saveMealAsCombo(${mIdx}, 'menu')" class="n-btn-ghost w-11 h-11 shrink-0 rounded-full flex items-center justify-center" aria-label="${esc(meal.title)}: kombo olarak kaydet">${svgI("star", 18)}</button>
          <button onclick="openMealModal(${mIdx})" class="n-btn-ghost w-11 h-11 shrink-0 rounded-full flex items-center justify-center" aria-label="${esc(meal.title)} öğününü düzenle">${svgI("edit", 18)}</button>
          <button onclick="copyMeal(${mIdx})" class="n-btn-ghost h-11 px-4 shrink-0 whitespace-nowrap rounded-full text-[13px] flex items-center gap-1.5">${svgI("copy", 16)}${copyLabel}</button>
          <button onclick="deleteMeal(${mIdx})" class="n-btn-ghost w-11 h-11 shrink-0 rounded-full flex items-center justify-center n-over" aria-label="${esc(meal.title)} öğününü sil">${svgI("trash", 18)}</button>
        </div>
      </div>`;
  }).join("");
  html += `<button onclick="openMealModal()" class="w-full min-h-[60px] rounded-[20px] border-[1.5px] border-dashed n-accent flex items-center justify-center gap-2 font-bold text-[14px]" style="border-color: var(--n-accent)">
    ${svgI("plus", 20, 2.4)}Yeni öğün ekle</button>`;
  if (dayChangedIds().size) {
    html = `<div id="menuDayNote" class="n-card rounded-[20px] p-3.5 space-y-2.5">
        <p class="text-[13px] n-muted">Bugün ekranında bugüne özel değişiklikler yaptın. Burada yaptıkların <strong class="n-text">bugünü değiştirmez</strong>; yarından itibaren geçerli olur.</p>
        <button onclick="revertDayToMenu()" class="n-btn-ghost w-full h-11 rounded-full text-[13px]">Bugünü menüye geri döndür</button>
      </div>` + html;
  }
  $("mealsContainer").innerHTML = html;
}

