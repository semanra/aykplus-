// ============================================================================
// v15 — MUTFAK: kombo, tarif, dünkü öğünü tekrarla, haftalık alışveriş listesi
// ============================================================================

// Öğeleri bir öğüne ekler; aynı besin zaten varsa miktarları toplar (ham/saklanan miktar)
function mergeItems(meal, items) {
  const db = getFoodDB();
  items.forEach(it => {
    if (it.est) { meal.items.push(clone(it)); return; }
    if (!db[it.foodId]) return;
    const ex = meal.items.find(i => !i.est && i.foodId === it.foodId);
    if (ex) ex.amount = round1(num(ex.amount) + num(it.amount));
    else meal.items.push({ foodId: it.foodId, amount: num(it.amount) });
  });
}
function itemsTotals(items) {
  let p = 0, c = 0, f = 0, cal = 0;
  items.forEach(i => { if (!i.est && !getFoodDB()[i.foodId]) return; const x = calcItemMacros(i); p += x.p; c += x.c; f += x.f; cal += x.cal; });
  return { p, c, f, cal };
}
// "2. Öğün: Öğle Yemeği" → "Öğle Yemeği"
function mealTitleBody(m) {
  const t = String(m.title || "");
  const i = t.indexOf(":");
  return (i > 0 && i <= 16 ? t.slice(i + 1) : t).trim() || t;
}

// ---------------------------------------------------------------------------
// KOMBO: bir öğünün besinleri "Favori Kase" gibi kaydedilir, tek dokunuşla eklenir
// ---------------------------------------------------------------------------
async function saveMealAsCombo(mIdx, dest) {
  const list = dest === "day" ? dayMeals() : curMeals();
  const m = list[mIdx];
  if (!m) return;
  const db = getFoodDB();
  const items = m.items.filter(i => !i.est && db[i.foodId]).map(i => ({ foodId: i.foodId, amount: num(i.amount) }));
  if (!items.length) { sayAlert("Kombo kaydedilemedi", "Bu öğünde kombo olarak kaydedilecek besin yok."); return; }
  const name = await askText("Kombonun adı", mealTitleBody(m).slice(0, 40), "örn: Favori Kase");
  if (name === null) return;
  const nm = name.trim().slice(0, 40) || "Kombo";
  state.combos.push({ id: "combo_" + Date.now().toString(36), name: nm, items });
  renderAll();
  toast(`"${nm}" kombo olarak kaydedildi (Besinler → Komboların)`);
}
function selectCombo(id) {
  foodUI.sel = "combo:" + id;
  renderFoodHead();
  renderFoodList();
  const el = $("comboSelCard");
  if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
}
function addComboToMeal(id) {
  const c = state.combos.find(x => x.id === id);
  const tIdx = foodTargetIdx();
  if (!c || tIdx < 0) return;
  const day = foodUI.dest !== "menu";
  const list = day ? ensureDayCopy() : curMeals();
  const meal = list[tIdx];
  mergeItems(meal, c.items);
  foodUI.sel = null;
  renderAll();
  const mid = meal.id;
  toast(`${c.name} → ${meal.title}${day ? " (yalnızca bugün)" : " (menüne, her gün)"}`, "ok", day ? { label: "Menüye de kaydet", fn: () => {
    const mm = curMeals().find(x => x.id === mid);
    if (!mm) { toast("Bu öğün menüde bulunamadı", "error"); return; }
    mergeItems(mm, c.items);
    renderAll();
    toast(`Menüdeki "${mm.title}" öğününe de eklendi`);
  } } : null);
}
function deleteCombo(id) {
  const i = state.combos.findIndex(c => c.id === id);
  if (i < 0) return;
  snapshot();
  const c = state.combos.splice(i, 1)[0];
  foodUI.sel = null;
  renderAll();
  offerUndo(`"${c.name}" kombosu silindi`);
}
function comboRowHtml(c) {
  const db = getFoodDB();
  const t = itemsTotals(c.items);
  const names = c.items.filter(i => db[i.foodId]).map(i => stripEmoji(db[i.foodId].name).replace(/^⭐\s*/, "")).join(", ");
  if (foodUI.sel === "combo:" + c.id) {
    const rows = c.items.map(i => {
      const f = db[i.foodId];
      if (!f) return "";
      return `<div class="flex items-center justify-between gap-2 py-1.5 text-[14px]"><span class="min-w-0 truncate">${esc(f.name)}</span><span class="n-muted whitespace-nowrap tabular-nums">${fmtNum(effAmount(i))} ${esc(f.unit)} · ${Math.round(calcItemMacros(i).cal)} kcal</span></div>`;
    }).join("");
    const tIdx = foodTargetIdx();
    return `<div class="n-elev n-sel rounded-[24px] p-4 space-y-3 my-2" id="comboSelCard" data-combo="${esc(c.id)}">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0"><h3 class="text-[17px] font-extrabold leading-snug break-words">${esc(c.name)}</h3><div class="text-[12px] n-muted">Kombo · ${c.items.length} besin</div></div>
          <div class="text-right shrink-0 whitespace-nowrap"><span class="t-display text-[28px] leading-none tabular-nums">${fmtInt(t.cal)}</span><span class="text-[12px] n-muted ml-1">kcal</span>
            <div class="text-[12px] font-semibold tabular-nums">${macroLine(t.p, t.c, t.f)}</div></div>
        </div>
        <div class="n-div">${rows}</div>
        <button id="comboAddBtn" onclick='addComboToMeal(${esc(JSON.stringify(c.id))})' class="n-btn w-full h-[52px] rounded-full text-[15px]" ${tIdx < 0 ? "disabled" : ""}>${tIdx < 0 ? "Önce bir öğün oluştur" : `Öğüne ekle · ${fmtInt(t.cal)} kcal`}</button>
        <div class="flex justify-end pt-1 n-bt">
          <button onclick='deleteCombo(${esc(JSON.stringify(c.id))})' class="n-btn-ghost h-11 px-4 rounded-full text-[13px] flex items-center gap-1.5 n-over">${svgI("trash", 16)}Komboyu sil</button>
        </div>
      </div>`;
  }
  return `<button onclick='selectCombo(${esc(JSON.stringify(c.id))})' class="w-full min-h-[64px] flex items-center justify-between gap-3 py-2.5 text-left n-bb" data-combo="${esc(c.id)}">
      <span class="min-w-0"><span class="flex items-center gap-1.5 text-[15px] font-bold leading-snug"><span class="n-accent shrink-0">${svgI("star", 16, 2)}</span><span class="truncate">${esc(c.name)}</span></span>
        <span class="block text-[12px] n-muted mt-0.5 truncate">${fmtInt(t.cal)} kcal · ${Math.round(t.p)} g protein · ${esc(names)}</span></span>
      <span class="w-10 h-10 rounded-full n-btn flex items-center justify-center shrink-0" aria-hidden="true">${svgI("plus", 20, 2.4)}</span>
    </button>`;
}

// ---------------------------------------------------------------------------
// TARİF: malzemeler + pişmiş toplam ağırlık → 100 g makroları; tek besin olarak kaydedilir
// ---------------------------------------------------------------------------
let rcp = { id: null, items: [] };
function openRecipeModal(editId) {
  const f = editId && state.customFoods[editId];
  const isRec = !!(f && f.recipe);
  rcp = { id: isRec ? editId : null, items: isRec ? clone(f.recipe.items) : [] };
  $("rcTitle").textContent = isRec ? "Tarifi düzenle" : "Yeni tarif";
  $("rcName").value = isRec ? stripEmoji(f.name) : "";
  $("rcCooked").value = isRec ? fmtNum(f.recipe.cooked) : "";
  closeModal("pickerModal");
  renderRecipe();
  openModal("recipeModal");
}
function recipeTotals() {
  const db = getFoodDB();
  let p = 0, c = 0, f = 0, cal = 0, raw = 0;
  rcp.items.forEach(i => {
    const fd = db[i.foodId];
    if (!fd) return;
    const a = num(i.amount, 0);
    p += fd.p * a; c += fd.c * a; f += fd.f * a; cal += kcalPerUnit(fd) * a;
    if (isScalable(fd)) raw += a;
  });
  return { p, c, f, cal, raw };
}
function renderRecipe() {
  const db = getFoodDB();
  $("rcItems").innerHTML = rcp.items.map((it, i) => {
    const fd = db[it.foodId];
    if (!fd) return "";
    return `<div class="flex items-center gap-1.5 py-1.5" data-rc-item="${i}">
        <div class="flex-1 min-w-0"><div class="text-[14px] font-semibold truncate">${esc(fd.name)}</div><div id="rcK${i}" class="text-[12px] n-muted tabular-nums">${Math.round(kcalPerUnit(fd) * num(it.amount))} kcal</div></div>
        <input type="text" inputmode="decimal" data-fk="rc-${i}" value="${esc(fmtNum(it.amount))}" oninput="rcAmount(${i}, this.value)" class="n-amt shrink-0" aria-label="${esc(fd.name)} miktarı" />
        <span class="text-[12px] n-muted w-10 min-w-0 truncate">${esc(fd.unit)}</span>
        <button onclick="rcRemove(${i})" class="w-11 h-11 shrink-0 rounded-full flex items-center justify-center n-over" aria-label="${esc(fd.name)} çıkar">${svgI("x", 18, 2.2)}</button>
      </div>`;
  }).join("") || `<p class="text-[13px] n-dim py-2">Henüz malzeme yok. Aşağıdan ekle.</p>`;
  updateRecipeSummary();
}
function rcAmount(i, v) {
  const it = rcp.items[i];
  if (!it) return;
  it.amount = Math.max(0, num(v, 0));
  const fd = getFoodDB()[it.foodId];
  if (fd && $("rcK" + i)) $("rcK" + i).textContent = `${Math.round(kcalPerUnit(fd) * it.amount)} kcal`;
  updateRecipeSummary();
}
function rcRemove(i) { rcp.items.splice(i, 1); renderRecipe(); }
function updateRecipeSummary() {
  const t = recipeTotals();
  const cooked = num($("rcCooked").value, 0);
  $("rcCooked").placeholder = t.raw > 0 ? `çiğ malzemeler toplam ${fmtInt(t.raw)} g` : "örn: 1200";
  const per = cooked > 0 ? 100 / cooked : 0;
  $("rcSum").innerHTML = `<div class="flex items-baseline justify-between gap-2"><span class="n-muted">Tarifin tamamı</span><strong class="tabular-nums">${fmtInt(t.cal)} kcal · ${macroLine(t.p, t.c, t.f)}</strong></div>`
    + (cooked > 0
      ? `<div class="flex items-baseline justify-between gap-2 mt-1"><span class="n-muted">Pişmiş 100 g</span><strong class="tabular-nums n-accent">${fmtInt(t.cal * per)} kcal</strong></div>
         <div class="text-right text-[12px] font-semibold tabular-nums">${macroLine(t.p * per, t.c * per, t.f * per, true)}</div>`
      : `<div class="text-[12px] n-dim mt-1">100 g değerlerini hesaplamam için pişmiş toplam ağırlığı yaz.</div>`);
}
function rcAddIngredient() {
  const db = getFoodDB();
  const cats = {};
  Object.keys(db).forEach(id => {
    if (id === rcp.id) return;
    const f = db[id];
    if (isHiddenFood(f)) return;
    const cat = stripEmoji(f.cat || "Diğer");
    (cats[cat] = cats[cat] || []).push({ id, label: f.name, sub: `${fmtNum(f.def)} ${f.unit} · ${Math.round(kcalPerUnit(f) * num(f.def, 1))} kcal` });
  });
  const groups = Object.keys(cats).map(c => ({ label: c, short: c.replace(/\s*[&/].*$/, ""), items: cats[c] }));
  // Seçici, tarif penceresinin üstünde açılır; seçince tarif penceresi yerinde kalır
  openPicker("Malzeme ekle", groups, it => {
    const f = getFoodDB()[it.id];
    const ex = rcp.items.find(x => x.foodId === it.id);
    if (ex) ex.amount = round1(num(ex.amount) + num(f.def, 1)); else rcp.items.push({ foodId: it.id, amount: num(f.def, 1) });
    renderRecipe();
  });
}
function saveRecipe() {
  const name = $("rcName").value.trim().slice(0, 50);
  if (!name) { sayAlert("Ad eksik", "Lütfen tarifin adını yaz."); return; }
  if (!rcp.items.length) { sayAlert("Malzeme yok", "En az bir malzeme ekle."); return; }
  const cooked = num($("rcCooked").value, 0);
  if (!(cooked > 0) || cooked > 30000) { sayAlert("Pişmiş ağırlık eksik", "Pişmiş toplam ağırlığı gram olarak yaz (tencereyi tartıp boş tencerenin ağırlığını düş)."); return; }
  const t = recipeTotals();
  const id = rcp.id || "custom_recipe_" + Date.now().toString(36);
  const editing = !!rcp.id;
  state.customFoods[id] = {
    name: "🍲 " + name, cat: "🍲 Tariflerim", unit: "g", step: 10, def: Math.max(10, Math.min(250, Math.round(cooked))),
    p: t.p / cooked, c: t.c / cooked, f: t.f / cooked, kcal: t.cal / cooked,
    recipe: { items: rcp.items.filter(i => num(i.amount) > 0).map(i => ({ foodId: i.foodId, amount: num(i.amount) })), cooked }
  };
  invalidateFoodDB();
  closeModal("recipeModal");
  toast(editing ? `${name} tarifi güncellendi` : `${name} tarifi besin listene eklendi`);
  renderAll();
  if (!editing && state.activeTab === "nutrition" && state.nutriView === "foods") { foodUI.cat = "recipes"; renderFoods(); selectFood(id); }
}

// ---------------------------------------------------------------------------
// DÜNKÜ ÖĞÜNÜ TEKRARLA: son arşivlenen günde aynı öğünün içeriğini bugüne kopyalar
// ---------------------------------------------------------------------------
function lastDayMealFor(meal) {
  const keys = Object.keys(state.dailyLogs).filter(k => k < dayKey() && Array.isArray(state.dailyLogs[k].meals)).sort().reverse();
  if (!keys.length) return null;
  const k = keys[0];
  const ms = state.dailyLogs[k].meals;
  const m = ms.find(x => x.id === meal.id) || ms.find(x => x.title === meal.title);
  if (!m || !Array.isArray(m.items)) return null;
  const db = getFoodDB();
  const items = m.items.filter(i => i && (i.est || db[i.foodId]));
  return items.length ? { key: k, items } : null;
}
function dayLabelShort(k) {
  const y = logicalNow(); y.setDate(y.getDate() - 1);   // v25: gün geçiş saatine göre "dün"
  if (k === todayStr(y)) return "Dünkü";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(k);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }) + " günkü" : "Önceki";
}
function repeatLastMeal(mIdx) {
  const cur = dayMeals()[mIdx];
  const r = cur && lastDayMealFor(cur);
  if (!r) return;
  snapshot();
  const c = ensureDayCopy();
  const m = c[mIdx];
  m.items = clone(r.items);
  openEditMeals.delete(m.id);
  renderAll();
  offerUndo(`${shortMealTitle(m)}: ${dayLabelShort(r.key).toLocaleLowerCase("tr")} öğün tekrarlandı (yalnızca bugün)`);
}

// ---------------------------------------------------------------------------
// HAFTALIK ALIŞVERİŞ LİSTESİ: antrenman menüsü × antrenman günü + dinlenme menüsü × kalan günler
// Tarifler malzemelerine açılır. Gösterilen miktarlar kiloya göre gramaj dahil (yediğin kadar).
// ---------------------------------------------------------------------------
function shopTrainDays() {
  const n = state.shopTrainDays;
  return Number.isInteger(n) && n >= 0 && n <= 7 ? n : Math.max(0, Math.min(7, state.workoutDays.length));
}
function shopList() {
  const db = getFoodDB();
  const acc = {};
  const expand = (id, amt, depth) => {
    const f = db[id];
    if (!f || !(amt > 0)) return;
    if (f.recipe && depth < 4 && num(f.recipe.cooked, 0) > 0) {
      const k = amt / num(f.recipe.cooked);
      f.recipe.items.forEach(ri => expand(ri.foodId, num(ri.amount) * k, depth + 1));
      return;
    }
    acc[id] = (acc[id] || 0) + amt;
  };
  const nT = shopTrainDays(), nR = 7 - nT;
  [[state.meals, nT], [state.restMeals, nR]].forEach(([ms, n]) => {
    if (!n) return;
    ms.forEach(m => m.items.forEach(i => { if (!i.est) expand(i.foodId, effAmount(i) * n, 0); }));
  });
  return Object.keys(acc).map(id => ({ id, f: db[id], amt: acc[id] }))
    .sort((a, b) => stripEmoji(a.f.cat || "").localeCompare(stripEmoji(b.f.cat || ""), "tr") || stripEmoji(a.f.name).localeCompare(stripEmoji(b.f.name), "tr"));
}
function fmtShopAmt(f, a) {
  if (f.unit === "g") return a >= 1000 ? fmtKg(round2(a / 1000)) + " kg" : (Math.ceil(a / 10) * 10) + " g";
  if (f.unit === "ml") return a >= 1000 ? fmtKg(round2(a / 1000)) + " L" : (Math.ceil(a / 10) * 10) + " ml";
  if (f.unit === "adet") return Math.ceil(a - 1e-9) + " adet";
  return fmtNum(Math.ceil(a * 2 - 1e-9) / 2) + " " + f.unit;
}
function shopName(f) { return stripEmoji(f.name).replace(/^⭐\s*/, ""); }
function openShopList() { renderShopList(); openModal("shopModal"); }
function setShopDays(d) {
  state.shopTrainDays = Math.max(0, Math.min(7, shopTrainDays() + d));
  renderAll();
  renderShopList();
}
function toggleShop(id) {
  if (state.shopChecked[id]) delete state.shopChecked[id]; else state.shopChecked[id] = true;
  saveState();
  renderShopList();
}
function clearShopChecks() {   // v26: Geri al
  snapshot(); state.shopChecked = {}; saveState(); renderShopList();
  toast("İşaretler temizlendi", "ok", { label: "Geri al", fn: () => { doUndo(); renderShopList(); } });
}
function renderShopList() {
  const list = shopList();
  const nT = shopTrainDays();
  $("shopDays").innerHTML = `<div class="flex items-center justify-between gap-2">
      <div class="min-w-0"><div class="text-[14px] font-bold">Antrenman günü</div><div class="text-[12px] n-muted">Haftanın kalan ${7 - nT} günü dinlenme menüsü</div></div>
      <div class="flex items-center gap-1 shrink-0">
        <button onclick="setShopDays(-1)" class="n-btn-ghost w-11 h-11 rounded-full flex items-center justify-center" aria-label="Antrenman gününü azalt">${svgI("minus", 18, 2.4)}</button>
        <span id="shopDaysVal" class="t-display text-[24px] w-8 text-center tabular-nums">${nT}</span>
        <button onclick="setShopDays(1)" class="n-btn-ghost w-11 h-11 rounded-full flex items-center justify-center" aria-label="Antrenman gününü artır">${svgI("plus", 18, 2.4)}</button>
      </div>
    </div>`;
  let lastCat = null;
  $("shopItems").innerHTML = list.length ? list.map(r => {
    const cat = stripEmoji(r.f.cat || "Diğer");
    const on = !!state.shopChecked[r.id];
    const head = cat !== lastCat ? `<div class="n-label pt-3 pb-1">${esc(cat.toLocaleUpperCase("tr"))}</div>` : "";
    lastCat = cat;
    return head + `<label class="flex items-center gap-3 min-h-[48px] py-1 cursor-pointer n-bb" data-shop="${esc(r.id)}">
        <input type="checkbox" class="n-check shrink-0" ${on ? "checked" : ""} onchange='toggleShop(${esc(JSON.stringify(r.id))})' aria-label="${esc(shopName(r.f))} alındı" />
        <span class="flex-1 min-w-0 text-[15px] font-semibold ${on ? "line-through n-dim" : ""}">${esc(shopName(r.f))}</span>
        <span class="shrink-0 text-[14px] font-bold tabular-nums ${on ? "line-through n-dim" : ""}">${esc(fmtShopAmt(r.f, r.amt))}</span>
      </label>`;
  }).join("") : `<p class="text-[14px] n-muted text-center py-6">Menülerinde besin yok.</p>`;
  const left = list.filter(r => !state.shopChecked[r.id]).length;
  $("shopCount").textContent = list.length ? `${left} / ${list.length} ürün alınacak` : "";
}
function shopText() {
  const list = shopList();
  const left = list.filter(r => !state.shopChecked[r.id]);
  const rows = (left.length ? left : list).map(r => `• ${shopName(r.f)} — ${fmtShopAmt(r.f, r.amt)}`);
  const nT = shopTrainDays();
  return `AYK+ alışveriş listesi (7 gün: ${nT} antrenman, ${7 - nT} dinlenme)\n` + rows.join("\n");
}
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; }
  catch (e) {
    const ta = document.createElement("textarea");
    ta.value = t; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e2) { ok = false; }
    ta.remove();
    return ok;
  }
}
async function copyShopList() {
  const ok = await copyText(shopText());
  toast(ok ? "Liste kopyalandı. Notlar'ı açıp yapıştırabilirsin." : "Kopyalanamadı; Paylaş düğmesini dene.", ok ? "ok" : "error");
}
async function shareShopList() {
  try { await navigator.share({ title: "Alışveriş listesi", text: shopText() }); }
  catch (e) { if (e && e.name !== "AbortError") copyShopList(); }
}

// ============================================================================
// v16 — AKILLI: kalan makroya göre tamamla, haftalık görünüm (Geçmiş)
// ============================================================================

// ---------------------------------------------------------------------------
// KALAN HEDEFİ KAPATAN SEÇENEKLER: yalnızca kullanıcının sık yediği/kayıtlı besinlerden,
// önce kalan protein, sonra kalan kalori hedeflenir.
// ---------------------------------------------------------------------------
// v26: arama her harfte yeniden saymasın (besin tablosu sürümü değişince yenilenir)
let _freqC = null;
function frequentFoodsCached(limit) {
  if (!_freqC || _freqC.ver !== foodDbVer || _freqC.limit !== limit) _freqC = { ver: foodDbVer, limit, ids: frequentFoods(limit) };
  return _freqC.ids;
}
// v26: arama kutusu: yazmayı ~150 ms bırakınca aranır (boşaltınca hemen)
let _fsTimer = null;
function foodSearchInput() {
  clearTimeout(_fsTimer);
  const run = () => { _fsTimer = null; foodUI.limit = 0; renderFoodList(); };
  if (!$("foodSearch").value.trim()) run(); else _fsTimer = setTimeout(run, 150);
}
function frequentFoods(limit = 30) {
  const db = getFoodDB();
  const cnt = {};
  const bump = (id, w) => { if (id && id !== "_est" && db[id] && !isHiddenFood(db[id])) cnt[id] = (cnt[id] || 0) + w; };
  allMealLists().forEach(ms => ms.forEach(m => m.items.forEach(i => bump(i.foodId, 1))));
  (state.combos || []).forEach(c => c.items.forEach(i => bump(i.foodId, 1)));
  state.recentFoods.forEach((id, i) => bump(id, 2 - i * 0.1));
  Object.keys(state.dailyLogs).forEach(k => {
    const ms = state.dailyLogs[k].meals;
    if (Array.isArray(ms)) ms.forEach(m => (m.items || []).forEach(i => bump(i.foodId, 0.5)));
  });
  return Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]).slice(0, limit);
}
// Ekranda gösterilecek "makul" miktar: gram/ml 10'ar, diğerleri adım (en az 0,5)
// Gerçekçi olsun diye bir besinden en fazla porsiyonunun 2,5 katı önerilir (40 g zeytinyağı gibi miktarlar çıkmaz)
function maxSuggestAmt(f) {
  const def = num(f.def, isScalable(f) ? 100 : 1);
  return isScalable(f) ? Math.min(500, Math.max(30, def * 2.5)) : Math.min(6, Math.max(1, def * 2.5));
}
function niceAmt(f, a) {
  const cap = maxSuggestAmt(f);
  if (isScalable(f)) return Math.max(10, Math.min(Math.floor(cap / 10) * 10 || 10, Math.round(a / 10) * 10));
  const st = Math.max(0.5, num(f.step, 1));
  return Math.max(st, Math.min(Math.floor(cap / st) * st || st, Math.round(a / st) * st));
}
function fillSuggestions(remP, remK) {
  const db = getFoodDB();
  const ids = frequentFoods(30);
  const macro = (id, a) => { const f = db[id]; return { p: f.p * a, k: kcalPerUnit(f) * a }; };
  const score = (P, K) => Math.abs(P - remP) * 8 + (K > remK ? (K - remK) * 2 : remK - K);
  const out = [];
  // Tek besin: proteini kapatacak kadar
  ids.forEach(id => {
    const f = db[id];
    if (!(f.p > 0)) return;
    const a = niceAmt(f, remP / f.p);
    const m = macro(id, a);
    if (m.k > remK + 80) return;
    out.push({ parts: [{ id, a }], P: m.p, K: m.k, s: score(m.p, m.k) });
  });
  // İki besin: A proteini, B kalan kaloriyi kapatır
  ids.forEach(A => {
    const fa = db[A];
    if (!(fa.p > 0) || (fa.p * 4) / Math.max(1e-9, kcalPerUnit(fa)) < 0.25) return;   // A protein kaynağı olmalı
    ids.forEach(B => {
      if (A === B) return;
      const fb = db[B];
      const kb = kcalPerUnit(fb);
      if (!(kb > 0)) return;
      const a = niceAmt(fa, remP / fa.p);
      const ma = macro(A, a);
      const leftK = remK - ma.k;
      if (leftK < 60) return;
      const b = niceAmt(fb, leftK / kb);
      const mb = macro(B, b);
      const P = ma.p + mb.p, K = ma.k + mb.k;
      if (K > remK + 80) return;
      out.push({ parts: [{ id: A, a }, { id: B, a: b }], P, K, s: score(P, K) });
    });
  });
  out.sort((x, y) => x.s - y.s);
  // Çeşitlilik: aynı besin kümesi bir kez; aynı ana protein kaynağı en fazla iki seçenekte
  const seen = new Set(), used = {}, pick = [];
  for (const o of out) {
    const key = o.parts.map(p => p.id).sort().join("+");
    const a0 = o.parts[0].id;
    if (seen.has(key) || (used[a0] || 0) >= 2) continue;
    seen.add(key);
    used[a0] = (used[a0] || 0) + 1;
    pick.push(o);
    if (pick.length >= 3) break;
  }
  return pick;
}
let foodSuggestCache = [];
function renderFoodSuggest() {
  const el = $("foodSuggest");
  if (!el) return;
  const tIdx = foodTargetIdx();
  const t = getTargets();
  const tot = nutritionTotals(foodMeals());
  const remP = t.proTarget - tot.p, remK = t.calTarget - tot.cal;
  foodSuggestCache = tIdx >= 0 && remK >= 80 && remP >= 8 ? fillSuggestions(remP, remK) : [];
  if (!foodSuggestCache.length) { el.innerHTML = ""; el.classList.add("hidden"); return; }
  const db = getFoodDB();
  el.classList.remove("hidden");
  el.innerHTML = `<div class="n-label mb-2">KALAN HEDEFİNİ KAPATAN SEÇENEKLER</div>
    <p class="text-[12px] n-muted mb-2">Kalan: <strong class="n-text tabular-nums">${fmtInt(remK)} kcal</strong> · <strong class="n-p tabular-nums">${fmtInt(remP)} g protein</strong>. Sık yediğin besinlerden:</p>
    <div class="space-y-2">${foodSuggestCache.map((o, i) => {
      const label = o.parts.map(p => `${fmtNum(p.a)} ${db[p.id].unit} ${stripEmoji(db[p.id].name).replace(/^⭐\s*/, "")}`).join(" + ");
      const lk = Math.round(remK - o.K), lp = Math.round(remP - o.P);
      const kTxt = lk >= 0 ? `${fmtInt(lk)} kcal kalır` : `${fmtInt(-lk)} kcal aşar`;
      const pTxt = lp > 0 ? `${fmtInt(lp)} g P kalır` : "protein tamam";
      return `<button onclick="addSuggestion(${i})" class="w-full min-h-[56px] n-card rounded-2xl px-3.5 py-2.5 text-left flex items-center justify-between gap-3" data-suggest="${i}">
          <span class="min-w-0"><span class="block text-[14px] font-bold leading-snug">${esc(label)}</span>
            <span class="block text-[12px] n-muted tabular-nums mt-0.5">${fmtInt(o.K)} kcal · ${fmtInt(o.P)} g protein → ${kTxt}, ${pTxt}</span></span>
          <span class="w-10 h-10 rounded-full n-btn flex items-center justify-center shrink-0" aria-hidden="true">${svgI("plus", 20, 2.4)}</span>
        </button>`;
    }).join("")}</div>`;
}
function addSuggestion(i) {
  const o = foodSuggestCache[i];
  const tIdx = foodTargetIdx();
  if (!o || tIdx < 0) return;
  const day = foodUI.dest !== "menu";
  const list = day ? ensureDayCopy() : curMeals();
  const meal = list[tIdx];
  const db = getFoodDB();
  const items = o.parts.map(p => ({ foodId: p.id, amount: rawFromEff(db[p.id], p.a) }));
  mergeItems(meal, items);
  o.parts.forEach(p => { state.recentFoods = [p.id, ...state.recentFoods.filter(x => x !== p.id)].slice(0, 8); });
  renderAll();
  const mid = meal.id;
  toast(`${o.parts.length} besin → ${meal.title}${day ? " (yalnızca bugün)" : " (menüne, her gün)"}`, "ok", day ? { label: "Menüye de kaydet", fn: () => {
    const mm = curMeals().find(x => x.id === mid);
    if (!mm) { toast("Bu öğün menüde bulunamadı", "error"); return; }
    mergeItems(mm, items);
    renderAll();
    toast(`Menüdeki "${mm.title}" öğününe de eklendi`);
  } } : null);
}

// ---------------------------------------------------------------------------
// HAFTALIK GÖRÜNÜM (Geçmiş): 7 günlük ortalama, hedef tutturma takvimi (7/30 gün),
// haftalık kalori bütçesi, 7 günlük hareketli kilo ortalaması
// ---------------------------------------------------------------------------
// Bir günün alınan kalorisi/proteini: öğün tiki varsa yenen, yoksa plan (kalori koçuyla aynı kural)
function logIntake(d) {
  if (!d) return null;
  const eaten = num(d.mealsDone) > 0 && num(d.eatenKcal) > 0;
  const k = eaten ? num(d.eatenKcal) : num(d.kcal);
  if (!(k > 0)) return null;
  return { k, p: eaten ? num(d.eatenP) : num(d.p, num(d.eatenP)), t: num(d.calTarget, 0), eaten };
}
function dateKeyOffset(n) { const d = logicalNow(); d.setDate(d.getDate() + n); return todayStr(d); }
function keyToDate(k) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(k); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
// Hedefe yakınlık: yeşil ±%5 (en az 50 kcal), sarı ±%15, kırmızı daha uzak
function hitClass(k, t) {
  if (!(t > 0)) return "none";
  const d = Math.abs(k - t);
  if (d <= Math.max(50, t * 0.05)) return "ok";
  if (d <= t * 0.15) return "near";
  return "far";
}
function weekStats() {
  const days7 = [];
  for (let i = 7; i >= 1; i--) { const k = dateKeyOffset(-i); const x = logIntake(state.dailyLogs[k]); if (x) days7.push(x); }
  const avgK = days7.length ? days7.reduce((a, b) => a + b.k, 0) / days7.length : 0;
  const avgP = days7.length ? days7.reduce((a, b) => a + b.p, 0) / days7.length : 0;
  // Bu hafta (Pazartesi–Pazar)
  const t = getTargets().calTarget;
  const ws = new Date(weekStart(logicalNow()));
  let total = 0, taken = 0, daysLeft = 0;
  const today = dayKey();
  for (let i = 0; i < 7; i++) {
    const d = new Date(ws); d.setDate(ws.getDate() + i);
    const k = todayStr(d);
    if (k < today) {
      const x = logIntake(state.dailyLogs[k]);
      total += x && x.t > 0 ? x.t : t;
      if (x) taken += x.k;
    } else {
      total += t;
      if (k === today) taken += eatenTotals().cal;
      daysLeft++;
    }
  }
  return { n7: days7.length, avgK, avgP, total, taken, left: total - taken, daysLeft };
}
function weightAvg7() {
  const from = Date.now() - 7 * DAY_MS;
  const ws = state.weightLogs.filter(l => l.ts && l.ts >= from && num(l.weight) > 0).map(l => num(l.weight));
  return ws.length ? { avg: ws.reduce((a, b) => a + b, 0) / ws.length, n: ws.length } : null;
}
function setNutriHistRange(r) { state.nutriHistRange = r === "30" ? "30" : "7"; renderAll(); }
function heatHtml(n) {
  const cells = [];
  const start = keyToDate(dateKeyOffset(-n + 1));
  const lead = (start.getDay() + 6) % 7;   // Pazartesi başlangıçlı ızgara
  for (let i = 0; i < lead; i++) cells.push(`<span aria-hidden="true"></span>`);
  for (let i = n - 1; i >= 0; i--) {
    const k = dateKeyOffset(-i);
    const isToday = k === dayKey();
    const x = isToday ? null : logIntake(state.dailyLogs[k]);
    const cls = isToday ? "today" : x ? hitClass(x.k, x.t) : "none";
    const d = keyToDate(k);
    const lbl = d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
    const tip = isToday ? `${lbl}: bugün (devam ediyor)` : x ? `${lbl}: ${fmtInt(x.k)} / ${fmtInt(x.t)} kcal` : `${lbl}: kayıt yok`;
    const sym = { ok: "✓", near: "~", far: "!" }[cls] || "";   // v32: renk tek başına anlam taşımaz (İlerleme şeridiyle aynı dil)
    cells.push(`<span class="n-heat ${cls}" data-heat="${k}" data-cls="${cls}" role="img" aria-label="${esc(tip)}" title="${esc(tip)}">${d.getDate()}${sym ? `<i class="n-heat-sym" aria-hidden="true">${sym}</i>` : ""}</span>`);
  }
  const wd = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"].map(x => `<span class="text-[12px] n-dim text-center">${x}</span>`).join("");
  return `<div class="grid grid-cols-7 gap-1.5">${wd}${cells.join("")}</div>`;
}
function weekCardHtml() {
  const w = weekStats();
  const wa = weightAvg7();
  const lastLog = state.weightLogs.reduce((m, l) => (!m || num(l.ts, 0) >= num(m.ts, 0) ? l : m), null);
  const last = lastLog ? num(lastLog.weight) : 0;
  const range = state.nutriHistRange === "30" ? "30" : "7";
  const perDay = w.daysLeft > 0 ? Math.round(w.left / w.daysLeft) : 0;
  return `<section id="weekCard" class="n-card rounded-[22px] p-4 space-y-4" aria-label="Haftalık görünüm">
      <div class="flex items-baseline justify-between gap-2"><span class="n-label">SON 7 GÜN</span><span class="text-[12px] n-dim">${w.n7} gün kayıt</span></div>
      <div class="grid grid-cols-2 gap-3">
        <div><div class="text-[12px] n-muted">Ortalama kalori</div><div class="t-display text-[26px] leading-none tabular-nums mt-1" id="avgKcal">${w.n7 ? fmtInt(w.avgK) : "—"}</div><div class="text-[12px] n-dim">kcal / gün</div></div>
        <div><div class="text-[12px] n-muted">Ortalama protein</div><div class="t-display text-[26px] leading-none tabular-nums mt-1 n-p" id="avgPro">${w.n7 ? fmtInt(w.avgP) : "—"}</div><div class="text-[12px] n-dim">g / gün</div></div>
      </div>
      <div class="pt-3 n-bt space-y-2.5">
        <div class="flex items-center justify-between gap-2">
          <span class="n-label">HEDEF TUTTURMA</span>
          <div class="n-seg grid-cols-2 w-[150px]" aria-label="Takvim aralığı">
            <button onclick="setNutriHistRange('7')" class="${range === "7" ? "on" : ""}" aria-pressed="${range === "7"}">7 gün</button>
            <button onclick="setNutriHistRange('30')" class="${range === "30" ? "on" : ""}" aria-pressed="${range === "30"}">30 gün</button>
          </div>
        </div>
        <div id="heatGrid">${heatHtml(range === "30" ? 30 : 7)}</div>
        <div class="flex flex-wrap gap-x-3 gap-y-1 text-[12px] n-muted">
          <span class="flex items-center gap-1"><i class="n-heat-dot ok">✓</i>Hedefte (±%5)</span>
          <span class="flex items-center gap-1"><i class="n-heat-dot near">~</i>Yakın (±%15)</span>
          <span class="flex items-center gap-1"><i class="n-heat-dot far">!</i>Uzak</span>
          <span class="flex items-center gap-1"><i class="n-heat-dot none"></i>Kayıt yok</span>
        </div>
      </div>
      <div class="pt-3 n-bt space-y-1.5" id="weekBudget">
        <span class="n-label">BU HAFTANIN KALORİ BÜTÇESİ</span>
        <div class="flex justify-between gap-2 text-[14px]"><span class="n-muted">Haftalık hedef</span><strong class="tabular-nums">${fmtInt(w.total)} kcal</strong></div>
        <div class="flex justify-between gap-2 text-[14px]"><span class="n-muted">Şu ana kadar alınan</span><strong class="tabular-nums">${fmtInt(w.taken)} kcal</strong></div>
        <div class="flex justify-between gap-2 text-[14px]"><span class="n-muted">Kalan</span><strong class="tabular-nums ${w.left < 0 ? "n-over" : "n-accent"}">${fmtInt(w.left)} kcal</strong></div>
        ${w.daysLeft > 0 ? `<p class="text-[12px] n-dim">Kalan ${w.daysLeft} günde (bugün dahil) günde ortalama ~${fmtInt(perDay)} kcal. Geçmiş günlerde öğün tiki yoksa planlanan kalori sayılır.</p>` : ""}
      </div>
      <div class="pt-3 n-bt flex items-center justify-between gap-2 text-[14px]" id="weightAvgRow">
        <span class="n-muted">Kilo${last ? ` · son tartı <strong class="n-text">${fmtNum(last)} kg</strong>` : ""}</span>
        <span>${wa ? `7 günlük ort. <strong class="tabular-nums">${fmtNum(wa.avg)} kg</strong> <span class="text-[12px] n-dim">(${wa.n} tartı)</span>` : `<span class="n-dim text-[12px]">Son 7 günde tartı yok</span>`}</span>
      </div>
    </section>`;
}

