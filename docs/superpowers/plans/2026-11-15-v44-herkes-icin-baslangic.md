# v44 — Herkes için başlangıç Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Yeni kullanıcı uygulamayı ilk açtığında adım adım kurulumla kendi bilgilerini girer ve isterse örnek menü/program/rutinle başlar; sahibin kişisel varsayılanları koddan çıkar; sağlık notu ve Hakkında/lisanslar eklenir. Sahibin telefonundaki veriye dokunulmaz.

**Architecture:** Yeni kurulum, `loadState()`'in "hiç kayıt yok" dalında `freshState()` ile tanınır ve `settings.onboarded = false` olarak kaydedilir; var olan her kayıt `migrateState` adım 4 ile `onboarded = true` olur. Kurulum ekranı `#onboard` (tam ekran, Antrenman ailesi `--t-*` renkleri) `onboarded === false` iken açılır. Örnek içerik saf fonksiyonlardan (`buildSampleMenu`, `samplePrograms`, `sampleMobility`) gelir. Testler sahibin eski varsayılan verisini `tests/fixtures/eski_varsayilan.json`'dan, yeni kurulumda devreye giren `window.AYK_TEST_SEED` kancasıyla alır.

**Tech Stack:** Düz JS (`src/app/*.js` ad sırasıyla birleşir), Tailwind 3.4 derleme, Playwright (Python).

**Spec:** `docs/superpowers/specs/2026-11-15-asama2-herkes-icin-design.md` §6 (+ §2 başarısızlık tanımları). Proje kuralları: `CLAUDE.md`.

## Global Constraints

- Depolama anahtarı `ayk_plus_v5_state` değişmez; kullanıcı verisi silinmez. Biçim değişikliği yalnızca `migrateState` (adım 4, `DATA_VER` 3 → 4) + eski formatla test.
- Sahip (dataVer ≤ 3 kaydı olan herkes) kurulumu **hiçbir yolda** görmez; kayıt verisi değişmez.
- Sahibin menüsü/programı/takviyeleri/mobilite rutini uygulama kodundan tamamen çıkar (spec §6.4); yalnızca test fikstüründe kalır.
- Sınıf adları JS'te sabit metin; renkler değişkenlerle (`--t-*`, kurulum ekranı Antrenman ailesinde); dokunma alanı ≥ 44 px; sayılar `num()` / `fmtNum()`; kullanıcı metni `esc()`; onay/metin girişi temalı `uiAsk` / `askConfirm` (prompt/confirm/alert yok).
- Arayüz metinleri doğru Türkçe, emojisiz.
- Testlerde açılış betiği, `aykStoredState()`, temiz başlangıç `localStorage.clear()` + `indexedDB.deleteDatabase('aykplus')`, temalı pencerelerde `void fn()`.
- Sürüm: `src/markup.html` `AYK+ v44`, `sw.js` `const CACHE = 'aykplus-v44'`.

### Sabit metinler ve değerler (spec'ten)

| Ad | Değer |
|---|---|
| Sağlık notu (`HEALTH_NOTE`) | "AYK+ genel bilgi amaçlıdır; tıbbi tavsiye, teşhis ya da tedavi yerine geçmez. Hamileysen, emziriyorsan, bir sağlık sorunun ya da yeme bozukluğu geçmişin varsa, beslenme ve egzersiz planını değiştirmeden önce bir doktora veya diyetisyene danış." |
| Kurulum 6. ekran üst metni | "Hepsini istediğin zaman değiştirebilir, silebilir ya da kendi menünü ve programını sıfırdan kurabilirsin." |
| Kilo verme hızları (kurulum) | yavaş 300 · orta 500 · hızlı 700 kcal açık |
| Kilo alma hızları | `GAIN_PACE` (v43) slow / mid / fast |
| Gizlilik satırı | "Verilerin yalnızca bu telefonda. Barkod okuttuğunda yalnızca barkod numarası Open Food Facts'e gönderilir." |
| Lisanslar | Barlow Condensed (SIL OFL 1.1) · @zxing/library (Apache-2.0) · Open Food Facts verisi (ODbL; ürün verisi katkıcılara ait) · USDA FoodData Central (kamu malı / CC0) · Tailwind CSS (MIT) · Vücut haritası görseli (uygulama sahibinin kendi görseli) |
| Yeni kurulum genel varsayılanları | kilo 70, boy 170, yaş 30, hedef kilo 70, cinsiyet `male`, `goal: "keep"`, `deficit: 0`, su hedefi 2,5, `weightLogs: []`, `supplementList: []`, `meals: []`, `restMeals: []`, mobilite `routines: []`, program = tek boş gün `{ id, name: "1. Gün", exercises: [] }` |

## Review Focus

1. **Sahibin v43 kaydı (dataVer 3), v4 kaydı, yalnızca localStorage, yalnızca IndexedDB, bozuk kayıt + kurtarma:** kurulum çıkmaz, kayıt değişmez → Görev 1 testleri.
2. **Kurulum yarıda kapatılırsa:** sonraki açılışta kurulum yeniden çıkar; yarım bilgiler uygulamaya sızmaz → Görev 4 testi.
3. **Ondalık virgül:** kiloya "72,5" yazılınca 72,5 kaydedilir; geçersiz/boş alanla "İleri" ilerlemez ve uyarır → Görev 4 testi.
4. **Kurulumdan "Yedeğim var" ile v43 yedeği geri yükleme:** kurulum kapanır, yedekteki veri aynen gelir, `onboarded` true → Görev 4 testi.
5. **Boş başlangıç:** bütün sekmeler ve alt ekranlar (Beslenme 4 alt ekran + alışveriş listesi; Antrenman Bugün/Programım/Kütüphane/Geçmiş + ısınma kartı; Mobilite ana ekran; İlerleme 4 alt sekme; Profil) sayfa hatası olmadan açılır ve boş yerlerde yönlendirme görünür → Görev 2 testi.

---

### Task 1: Yeni kurulumu tanıma, `onboarded`, test fikstürü ve kanca

**Files:**
- Create: `tests/fixtures/eski_varsayilan.json` (bugünkü `normalizeState({})` çıktısı, v43 derlemesinden; sahibin varsayılanları), `tests/ortak_tohum.py` (`TEST_INIT` JS metni: açılış animasyonu kaldırma + `window.AYK_TEST_SEED = <fikstür>`)
- Modify: `src/app/01-temel.js` (`DEFAULT_SETTINGS.onboarded`, `DATA_VER = 4`, `migrateState` adım 4, `freshState()`, `loadState` "kayıt yok" dalı), `src/app/08-profil-yedek.js` (`resetToDefaults` → `freshState()`)
- Modify: bütün `tests/test_*.py` ve `scripts/kontrol/{ortak,bozuk_veri,html_enjeksiyon}.py` içindeki açılış betiği satırları → `TEST_INIT` (toplu, mekanik)
- Test: `tests/test_v44_baslangic.py` (yeni; bölüm 1)

**Interfaces:**
- Produces: `freshState()` → yeni kurulum durumu (`normalizeState({})` + `settings.onboarded = false`; `window.AYK_TEST_SEED` varsa onun yerine `normalizeState(seed)` ve `onboarded = true`); `state.settings.onboarded` boolean; `var freshInstall` (bu açılışta yeni kurulum mu). Yeni kurulum yalnızca: `ayk_plus_v5_state` yok **ve** `ayk_plus_v4_state` yok **ve** okuma hatası yok **ve** `ayk_plus_v5_idb` ≠ "1" (bu cihazda IndexedDB kullanılmışsa yeni kurulum sayılmaz). IndexedDB modunda bu dala yalnızca `migratedAt` yokken gelinir (00-depolama.js mevcut akış).
- `TEST_INIT` (Python, `tests/ortak_tohum.py`): testler `from ortak_tohum import TEST_INIT` (kontrol betikleri göreli yolla) ve `ctx.add_init_script(TEST_INIT)`.

- [ ] **Step 1: Fikstürü üret** — `npm run build` (v43 hâli), küçük bir Playwright betiğiyle temiz sayfada `JSON.stringify(normalizeState({}))` al, `tests/fixtures/eski_varsayilan.json`'a yaz (`today`, `createdAt` gibi zaman alanlarını çıkar). Commit'e girer.

- [ ] **Step 2: Write the failing test** (`tests/test_v44_baslangic.py` bölüm 1; yapı `tests/test_v43_hesap.py` gibi, port 8803; bu dosyanın kendi `page_fresh()` yardımcısı `TEST_INIT` KULLANMAZ — yalnızca açılış animasyonunu kaldırır):

```python
pg = page_fresh()   # hiç kayıt yok
s = st(pg)
check(s["settings"]["onboarded"] is False and s["dataVer"] == 4, "yeni kurulum: onboarded false, dataVer 4")
pg.reload(); pg.wait_for_function("window.aykBooted === true")
check(st(pg)["settings"]["onboarded"] is False, "kurulum bitmeden yeniden açılınca yine onboarded false")
OWNER43 = json.load(open(FIXTURE)); OWNER43["dataVer"] = 3
seed(pg, OWNER43); check(st(pg)["settings"]["onboarded"] is True and st(pg)["dataVer"] == 4, "v43 kaydı: onboarded true")
seed(pg, {**OWNER43, "dataVer": 2}); check(st(pg)["settings"]["onboarded"] is True, "v42 kaydı: onboarded true")
# v4 kaydı
pg.evaluate("s => { localStorage.clear(); void indexedDB.deleteDatabase('aykplus'); localStorage.setItem('ayk_plus_v4_state', s); }", json.dumps({"weight": 90, "meals": OWNER43["meals"]}))
pg.reload(); pg.wait_for_function("window.aykBooted === true")
check(st(pg)["settings"]["onboarded"] is True and st(pg)["weight"] == 90, "v4 kaydı: kurulum yok, kilo 90")
# bozuk kayıt
pg.evaluate("() => { localStorage.clear(); void indexedDB.deleteDatabase('aykplus'); localStorage.setItem('ayk_plus_v5_state', '{bozuk'); }")
pg.reload(); pg.wait_for_function("window.aykBooted === true")
check(pg.evaluate("state.settings.onboarded") is True, "bozuk kayıt: kurulum yok (kurtarma akışı)")
# IndexedDB'de veri var, localStorage silinmiş
seed(pg, OWNER43); pg.evaluate("() => { localStorage.removeItem('ayk_plus_v5_state'); localStorage.removeItem('ayk_plus_v5_sira'); localStorage.removeItem('ayk_plus_v5_imza'); }")
pg.reload(); pg.wait_for_function("window.aykBooted === true")
check(pg.evaluate("state.settings.onboarded") is True and pg.evaluate("state.weight") == OWNER43["weight"], "yalnızca IndexedDB: kurulum yok, veri aynı")
# fabrika ayarları
pg.evaluate("void resetToDefaults()"); pg.click("#uiDlgOk"); pg.wait_for_timeout(80); pg.click("#uiDlgOk"); pg.wait_for_timeout(200)
check(pg.evaluate("state.settings.onboarded") is False, "fabrika ayarları: kurulum yeniden açılacak")
# kanca
ctx2 = b.new_context(...); ctx2.add_init_script(TEST_INIT)   # aynı tarayıcı
check(pg2.evaluate("state.settings.onboarded") is True and pg2.evaluate("state.weight") == 105, "test kancası: eski varsayılanlarla, kurulumsuz")
```

- [ ] **Step 3: Run it to verify it fails** — `npm run build && python tests/test_v44_baslangic.py` → FAIL (`onboarded` yok).

- [ ] **Step 4: Implement** — `DEFAULT_SETTINGS.onboarded = true`; `DATA_VER = 4`; `migrateState`: `if (v < 4) s.settings.onboarded = true;` (yorum "v44: var olan kayıt kurulumu görmez"); `freshState()` ve `loadState` "kayıt yok" dalı yukarıdaki kurala göre (`freshInstall = true`); `resetToDefaults` `freshState()` kullanır. `normalizeState`: `onboarded` boolean değilse `true`.

- [ ] **Step 5: Test düzenini topluca çevir** — `tests/ortak_tohum.py` yaz; her test dosyasındaki açılış betiği `add_init_script(...)` çağrısını `add_init_script(TEST_INIT)` yap (`SPLASH` sabiti kullananlar dahil; `sys.path` gerekirse `tests/` eklenir). `scripts/kontrol/` üç betiği de. Temiz başlangıç yapan (`localStorage.clear()` + reload) testler artık fikstürle açılır.

- [ ] **Step 6: Run tests** — `npm run build`; `python tests/test_v44_baslangic.py` (bölüm 1 ok); `npm test` → 36/36.

- [ ] **Step 7: Commit** — `git commit -m "v44: yeni kurulumu tanıma (onboarded, veri sürümü 4), test fikstürü"`

### Task 2: Genel varsayılanlar ve boş durumlar

**Files:**
- Modify: `src/data.js` (`DEFAULT_STATE`: sahibin menüsü, programı, mobilite listeleri, kilo 105, "Başlangıç" tartısı çıkar → tablodaki genel değerler), `src/app/01-temel.js` (`DEFAULT_SETTINGS` genel değerler; `DEFAULT_SUPPS = []`; `normalizeState`'in boş menüyü sahibin menüsüyle doldurması kalkar; `workoutDays` boş/eksikse tek boş gün)
- Modify: `src/app/03-beslenme.js` (Menülerim ve Bugün boş menü kartı), `src/app/10-antrenman-arayuzu.js` (hareketsiz gün kartı), gerekirse diğer çizim yerleri
- Test: `tests/test_v44_baslangic.py` bölüm 2

**Interfaces:**
- Consumes: `freshState()`, `TEST_INIT` (Görev 1).
- Produces: boş menü kartı `[data-empty-menu]` (düğme "İlk öğününü ekle" → mevcut öğün ekleme akışı, `#mealsContainer` altındaki "Yeni öğün ekle" ile aynı işlev); hareketsiz gün kartı `[data-empty-day]` (düğme "İlk hareketini ekle" → mevcut hareket ekleme akışı). Ruling: uygulamanın "en az bir antrenman günü kalmalı" kuralı korunur; "boş program" = tek boş gün.

- [ ] **Step 1: Write the failing test** (bölüm 2, `page_fresh()` ile):

```python
s = st(pg)
check(s["meals"] == [] and s["restMeals"] == [] and s["supplementList"] == [] and s["weightLogs"] == [], "yeni kurulum: liste yok")
check(len(s["workoutDays"]) == 1 and s["workoutDays"][0]["exercises"] == [] and s["mobilityRoutine"]["routines"] == [], "tek boş gün, rutin yok")
src = open(os.path.join(REPO, "src", "data.js"), encoding="utf-8").read() + open(os.path.join(REPO, "src", "app", "01-temel.js"), encoding="utf-8").read()
check("Üst Vücut A" not in src and "Kas Onarımı" not in src and "Greens" not in src, "sahibin varsayılanları kodda yok")
pg.evaluate("state.settings.onboarded = true; renderAll()")   # kurulum ekranı olmadan boş uygulamayı gez
SCREENS = ["switchTab('nutrition'); setNutriView('today')", "setNutriView('menus')", "setNutriView('foods')", "setNutriView('history')", "openShop && openShop()",
           "switchTab('gym'); state.gymView='today'; renderAll()", "state.gymView='program'; renderAll()", "state.gymView='library'; renderAll()", "state.gymView='history'; renderAll()",
           "switchTab('mobility')", "switchTab('progress'); setProgressView('genel')", "setProgressView('kilo')", "setProgressView('guc')", "setProgressView('beslenme')", "openProfile()"]
for js in SCREENS: pg.evaluate(js); pg.wait_for_timeout(60)
check(errs == [], "boş başlangıçta bütün ekranlar hatasız: " + str(errs[:3]))
pg.evaluate("closeProfile(); switchTab('nutrition'); setNutriView('menus')")
check(pg.is_visible("[data-empty-menu]") and "İlk öğününü ekle" in pg.inner_text("[data-empty-menu]"), "Menülerim boş kartı")
pg.evaluate("setNutriView('today')"); check(pg.is_visible("[data-empty-menu]"), "Bugün boş kartı")
pg.evaluate("switchTab('gym'); state.gymView='today'; renderAll()")
check(pg.is_visible("[data-empty-day]") and "İlk hareketini ekle" in pg.inner_text("[data-empty-day]"), "hareketsiz gün kartı")
# eksik listeli eski kayıt (spec §6.4 doğrulaması)
seed(pg, {"weight": 88, "dataVer": 1, "settings": {"age": 40}})
check(st(pg)["weight"] == 88 and st(pg)["settings"]["onboarded"] is True and errs == [], "listeleri eksik eski kayıt hatasız açılır")
```

Ek doğrulama (rapora yazılır, testte): sahibin fikstür kaydı `seed` edilip `stateParts(state)` ve ayna alan listesi, `DEFAULT_STATE` / `DEFAULT_SETTINGS`'in bütün anahtarlarını içeriyor (`all(k in stored for k in keys)`). Tutmazsa DURUP rapora `BLOCKED` yaz (spec §6.4: sahibe sorulmadan dondurma yapılmaz).

- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement** — tablodaki genel değerler; boş durum kartları Beslenme'de `--n-*`, Antrenman'da `--t-*`; düğmeler 44 px.
- [ ] **Step 4: Run tests** — bölüm 1–2 ok; `npm test` → hepsi geçer (fikstür kancası sayesinde eski testler sahibin verisiyle açılır).
- [ ] **Step 5: Commit** — `git commit -m "v44: genel varsayılanlar, sahibin verisi koddan çıktı, boş durum kartları"`

### Task 3: Örnek içerik üreticileri

**Files:**
- Create: `src/app/14-ornek-icerik.js` (yalnızca veri + saf fonksiyonlar; `13`'ten sonra birleşir, çağrılar kurulumdan gelir)
- Test: `tests/test_v44_baslangic.py` bölüm 3

**Interfaces:**
- Produces:
  - `buildSampleMenu(calTarget: number): Meal[]` — 4 öğün (kahvaltı, öğle, ara, akşam), `normMealList` biçimi, benzersiz `id`'ler; şablon gramajları `calTarget / şablonKcal` oranıyla ölçeklenir: `g/ml` kalemler 5'e yuvarlanır (en az 5), adetli/dilimli kalemler tam sayıya (en az 1). Yalnızca `getFoodDB()`'de var olan ve `isHiddenFood` olmayan besin kimlikleri.
  - `samplePrograms(level: "new" | "pro"): WorkoutDay[]` — new: 3 gün tüm vücut ("1. Gün: Tüm Vücut A/B/C"), gün başına 5–6 hareket; pro: 4 gün ("1. Gün: Üst Vücut A", "2. Gün: Alt Vücut A", "3. Gün: Üst Vücut B", "4. Gün: Alt Vücut B"). Hareket adları `EXERCISE_LIBRARY` içinden, kilolar 0, mevcut hareket nesnesi biçimi (`normalizeExercise` ile uyumlu; set/tekrar hedefi `targetInfo` + `sets`).
  - `sampleMobility(): Routine` — `{ id, name: "Günlük esneme", items }`, 6–8 hareket, dinamik + statik karışık, adlar mobilite kütüphanesinden (`normMobItem` biçimi).

- [ ] **Step 1: Write the failing test:**

```python
for cal in (1600, 2400, 3200):
    menu = pg.evaluate(f"buildSampleMenu({cal})")
    kcal = pg.evaluate("m => nutritionTotals(m).cal", menu)
    check(len(menu) == 4 and abs(kcal - cal) / cal <= 0.08, f"örnek menü {cal} kcal ±%8 (çıkan {kcal})")
    check(pg.evaluate("m => m.every(x => x.items.every(i => getFoodDB()[i.foodId] && !isHiddenFood(getFoodDB()[i.foodId])))", menu), "menü besinleri var ve gizli değil")
lib = pg.evaluate("Object.values(EXERCISE_LIBRARY).flat()")
for lvl, n in (("new", 3), ("pro", 4)):
    days = pg.evaluate(f"samplePrograms('{lvl}')")
    check(len(days) == n and all(5 <= len(d["exercises"]) <= 9 for d in days), f"{lvl}: {n} gün")
    check(all(e["name"] in lib for d in days for e in d["exercises"]), f"{lvl}: hareketler kütüphanede")
r = pg.evaluate("sampleMobility()")
check(r["name"] == "Günlük esneme" and 6 <= len(r["items"]) <= 8 and len({i["type"] for i in r["items"]}) >= 2, "mobilite rutini")
check(pg.evaluate("r => normalizeState({mobilityRoutine:{routines:[r]}}).mobilityRoutine.routines[0].items.length", r) == len(r["items"]), "rutin normalizeState'ten sağ çıkar")
```

- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement** — besin/hareket seçimi kurucunun (spec §6.3 çerçevesi: yaygın Türk mutfağı; yeni başlayana makine + dambıl ağırlıklı).
- [ ] **Step 4: Run tests** — bölüm 1–3 ok.
- [ ] **Step 5: Commit** — `git commit -m "v44: örnek menü, program ve esneme rutini üreticileri"`

### Task 4: Kurulum ekranı

**Files:**
- Modify: `src/markup.html` (`#onboard` iskeleti ve stilleri), `src/app/15-kurulum.js` (yeni; kurulum mantığı), `src/app/13-cizim-baslat.js` (`bootApp` sonunda `if (state.settings.onboarded === false) openOnboarding()`)
- Test: `tests/test_v44_baslangic.py` bölüm 4

**Interfaces:**
- Consumes: `freshState`, `buildSampleMenu`, `samplePrograms`, `sampleMobility`, `getTargets`, `GAIN_PACE`, mevcut yedek geri yükleme (`importBackupFile` / `restoreFromText`), `HEALTH_NOTE` (bu görev `01-temel.js`'e sabit olarak ekler; Görev 5 de kullanır).
- Produces: `openOnboarding()`, `finishOnboarding()`; DOM: `#onboard[data-step="1..7"]`, `#obBack`, `#obNext`, `#obDots`; 1: `#obStart`, `#obRestore` (+ gizli dosya girişi), `#obHealth` (sağlık notu); 2: `#obSexMale`, `#obSexFemale`, `#obAge`, `#obHeight`, `#obWeight`, `#obErr`; 3: `#obGoalLose/Keep/Gain`, `#obTarget`, `#obPaceSlow/Mid/Fast`, `#obWeekly`; 4: `#obActLow/Mid/High` (her birinin altında bir satır örnek: "Masa başı iş, günde az yürüyüş" / "Gün içinde biraz hareket" / "Ayakta ya da bedenen çalışılan iş"); 5: `#obExpNew` ("Yeni başlıyorum"), `#obExpPro` ("Salonu biliyorum"); 6: `#obSampleMenu`, `#obSampleProgram` (etiket deneyime göre "Örnek program: 3 gün tüm vücut" / "Örnek program: 4 gün üst/alt vücut"), `#obSampleMob` (hepsi varsayılan işaretli) + sabit üst metin; 7: `#obSummary` (kalori, P/K/Y, su), `#obFinish` ("Uygulamaya geç").
- Davranış: kurulum bitene dek girilenler geçici bir nesnede tutulur (`state`'e yazılmaz); `finishOnboarding` hepsini tek seferde `state`'e yazar (ayarlar, `state.weight`, ilk tartı `weightLogs = [{date, weight, ts}]`, `deficit`, `goal`, `gainPace`, `activity`, işaretli örnekler: menü antrenman günü → `buildSampleMenu(antrenman günü kalorisi)`, dinlenme → `buildSampleMenu(dinlenme günü kalorisi)`; program; rutin), `onboarded = true`, `renderAll()`, kurulumu kapatır, Beslenme → Bugün'ü açar. Sınırlar Profil'deki sınırlarla aynı (kurucunun bulacağı `applyProfileFields` değerleri); geçersiz alanla "İleri" ilerlemez, `#obErr` neden yazar. Hedef kilo Ver'de mevcut kilodan küçük, Al'da büyük olmalı; Koru'da hedef = kilo.

- [ ] **Step 1: Write the failing test** (bölüm 4, `page_fresh()`):

```python
check(pg.is_visible("#onboard") and pg.get_attribute("#onboard", "data-step") == "1" and "tıbbi tavsiye" in pg.inner_text("#obHealth"), "yeni kurulumda kurulum + sağlık notu")
pg.click("#obStart"); pg.click("#obSexFemale"); pg.fill("#obAge", "34"); pg.fill("#obHeight", "165"); pg.fill("#obWeight", "")
pg.click("#obNext"); check(pg.get_attribute("#onboard", "data-step") == "2" and pg.inner_text("#obErr") != "", "boş kilo: ilerlemez, uyarır")
pg.fill("#obWeight", "72,5"); pg.click("#obNext")
pg.click("#obGoalLose"); pg.fill("#obTarget", "65"); pg.click("#obPaceMid"); check("kg" in pg.inner_text("#obWeekly"), "haftalık tahmin yazılır"); pg.click("#obNext")
pg.click("#obActLow"); pg.click("#obNext"); pg.click("#obExpNew"); pg.click("#obNext")
check("3 gün tüm vücut" in pg.inner_text("#onboard") and "sıfırdan kurabilirsin" in pg.inner_text("#onboard"), "örnek seçimi + kendi programı metni")
pg.reload(); pg.wait_for_function("window.aykBooted === true")
check(pg.is_visible("#onboard") and pg.get_attribute("#onboard", "data-step") == "1" and st(pg)["weight"] == 70, "yarıda kapatınca baştan, yarım bilgi kaydedilmedi")
# baştan sona tamamla
# aynı adımlar (kadın, 34, 165, "72,5", Ver, hedef 65, orta, Az, Yeni başlıyorum, üç kutu işaretli) tekrar girilir; pg.click("#obNext"); check("kcal" in pg.inner_text("#obSummary"), "özet"); pg.click("#obFinish"); pg.wait_for_timeout(150)
s = st(pg)
check(not pg.is_visible("#onboard") and s["settings"]["onboarded"] is True and s["weight"] == 72.5 and s["settings"]["sex"] == "female" and s["settings"]["goal"] == "lose" and s["deficit"] == 500 and s["settings"]["activity"] == "low", "kurulum yazıldı")
check(len(s["meals"]) == 4 and len(s["workoutDays"]) == 3 and len(s["mobilityRoutine"]["routines"]) == 1 and len(s["weightLogs"]) == 1, "örnekler eklendi")
pg.reload(); pg.wait_for_function("window.aykBooted === true"); check(not pg.is_visible("#onboard"), "bir daha çıkmaz")
# boş başla: üç kutunun işareti kaldırılınca menü yok, tek boş gün, rutin yok (ayrı temiz sayfa)
# Al: hedef kilo mevcut kilodan küçükse uyarı; Koru'da #obTarget gizli
# Yedeğim var: v43 yedeği (fikstür + dataVer 3) setInputFiles ile → kurulum kapanır, kilo 105, onboarded true
# 44 px: tamamlama akışında her adıma gelince o adımda görünen bütün düğmelerin (#onboard button:visible) bounding_box yüksekliği >= 44 olmalı
def tall_ok(): return pg.evaluate("[...document.querySelectorAll('#onboard button')].filter(b => b.offsetParent).every(b => b.getBoundingClientRect().height >= 44)")
# → tamamlama akışında her pg.click("#obNext") öncesi check(tall_ok(), f"adım {n}: düğmeler ≥ 44 px")
check(errs == [], "sayfa hatası yok")
```

- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement** — tam ekran, güvenli alan boşlukları, ilerleme noktaları, iki temada okunur (`--t-*`), başlıklar `t-display`. Sayı girişleri `type="text" inputmode="decimal"`, `num()` ile okunur.
- [ ] **Step 4: Run tests** — bölüm 1–4 ok; iki temada her adımın ekran görüntüsünü `tests/shots/v44_kurulum_<adım>_<tema>.png` olarak al ve bak.
- [ ] **Step 5: Commit** — `git commit -m "v44: ilk açılış kurulumu (7 adım, örnekle ya da boş başla, yedekten dönüş)"`

### Task 5: Hakkında ve sağlık notu (Profil)

**Files:**
- Modify: `src/markup.html` (Profil'in en altında, sürüm etiketinin üstünde `#pfAbout` kartı), gerekirse `src/app/08-profil-yedek.js`
- Test: `tests/test_v44_baslangic.py` bölüm 5

**Interfaces:**
- Consumes: `HEALTH_NOTE` (Görev 4).
- Produces: `#pfAbout` içinde: `#pfAboutHealth` (sağlık notu), gizlilik satırı (tablodaki metin), "Hesap yöntemi" (Mifflin-St Jeor; yağ oranı girilmişse Katch-McArdle; hareketlilik çarpanları `ACTIVITY_MULT`'tan yazılır; protein kuralı ve yağ %25; kaynaklar: Morton 2018, Nunes 2022, ISSN 2017, Helms 2014, Iraki 2019, Joslin, AMDR %20–35, Whittaker 2021), `#pfLicenses` (tablodaki lisanslar). Uzun bölümler `<details>` ile kapalı başlar.

- [ ] **Step 1: Write the failing test:**

```python
pg.evaluate("openProfile()"); pg.wait_for_timeout(150)
t = pg.inner_text("#pfAbout")
check("tıbbi tavsiye" in t and "Open Food Facts" in t and "ODbL" in t and "Apache-2.0" in t and "OFL" in t and "MIT" in t and "CC0" in t, "Hakkında: not, gizlilik, lisanslar")
check("Morton" in t or pg.evaluate("document.querySelector('#pfAbout').textContent.includes('Morton')"), "kaynaklar")
check("1,55" in pg.evaluate("document.querySelector('#pfAbout').textContent"), "çarpanlar ACTIVITY_MULT'tan, Türkçe ondalık")
```

- [ ] **Step 2: Run to verify it fails.** **Step 3: Implement.** **Step 4: Run** bölüm 1–5 ok; Profil alt kısmının iki temada ekran görüntüsü. **Step 5: Commit** `"v44: Profil'de Hakkında, sağlık notu ve lisanslar"`

### Task 6: Sürüm, tam doğrulama, belge

**Files:** `src/markup.html` (`AYK+ v44`), `sw.js` (`aykplus-v44`), `scripts/kontrol/ortak.py` (kurulum adımları 1–7 ve boş başlangıç Menülerim/Antrenman ekranları; kontrol betiği yeni kurulum ekranları için `TEST_INIT` olmadan açar), `CLAUDE.md` (§1 ve §5'e kurulum/`onboarded`/`freshState`/`DATA_VER` 4; §3'e test fikstürü ve `TEST_INIT` kuralı — yeni testler `TEST_INIT` kullanır; §6'ya kurulum ve örnek içerik maddesi; §8'deki "hazır program şablonu istenmiyor" notuna "kişisel kullanım içindi; v44'te yeni kullanıcıya isteğe bağlı örnek" açıklaması; §9'a v44 satırı)

- [ ] **Step 1:** Sürüm etiketleri, `npm run build` → "✓ index.html oluşturuldu".
- [ ] **Step 2:** `npm test` → hepsi geçer.
- [ ] **Step 3:** `npm run kontrol -- --hizli` → yalnızca bilinçli farklar, ölçüm temiz; `python scripts/kontrol/bozuk_veri.py` → 0 / 0; `python scripts/kontrol/html_enjeksiyon.py` → 0.
- [ ] **Step 4:** Sahibin fikstür kaydıyla (dataVer 3) açılışta hesap ve listeler v43 ile aynı (`getTargets()` antrenman/dinlenme, menü/program/takviye sayıları) — rapora tablo.
- [ ] **Step 5:** Commit `"AYK+ v44: ilk açılış kurulumu, örnek içerik, genel varsayılanlar, Hakkında"` (index.html dahil). **`main`'e birleştirme ve gönderme kullanıcı onayından sonra.**
