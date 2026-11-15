# v43 — Hesap genişletme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kalori/makro hesabını Ver / Koru / Al hedefi, hareketlilik düzeyi, kanıta dayalı protein (seçenek B) ve kalorinin %25'i yağ kuralıyla genişletmek; koçu iki yönlü yapmak.

**Architecture:** Bütün hedef hesabı `getTargets()` (`src/app/03-beslenme.js`) içinde kalır ve yeni ayarları okur; ekran tarafı Menülerim'deki "Kalori açığı" kartını "Hedef" kartına çevirir, koç (`coachAnalysis`, `progCoachHtml`) hedefe göre beklenen değişimi ve uyarıları hesaplar. Eski kayıtlar `migrateState` adım 3 ile çevrilir (`DATA_VER` 2 → 3).

**Tech Stack:** Düz JS (derlemede `src/app/*.js` ad sırasıyla birleşir), Tailwind 3.4 derleme, Playwright (Python) testleri.

**Spec:** `docs/superpowers/specs/2026-11-15-asama2-herkes-icin-design.md` (§5 ve yağ kuralı). Proje kuralları: `CLAUDE.md`.

## Global Constraints

- Depolama anahtarı `ayk_plus_v5_state` değişmez; eski kayıt verisi silinmez. Biçim çevirisi yalnızca `migrateState` içinde (yeni adım + `DATA_VER` + 1 + eski formatla test).
- Sınıf adları JS içinde tam ve sabit metin; renkler `--n-*` (Beslenme) / `--t-*` / `--w-*` değişkenleriyle, sabit hex yok.
- Dokunma alanı ≥ 44 px; sayı gösterimi `fmtNum` / `fmtKg` / `fmtInt`; kullanıcı metni `esc()`.
- Arayüz metinleri doğru Türkçe; emojisiz.
- Sahibin kalorisi değişmez (hareketlilik `mid` = bugünkü 1,55 / 1,43). Bilinçli değişim yalnızca protein (~201 → 180 g), yağ (76 → ~%25) ve buna bağlı karbonhidrat.
- Testlerde açılış betiği (splash) satırı, `aykStoredState()`, temiz başlangıç `localStorage.clear()` + `indexedDB.deleteDatabase('aykplus')`; temalı pencereler `void fn()`.
- Sürüm: `src/markup.html` `AYK+ v43`, `sw.js` `const CACHE = 'aykplus-v43'`.

### Sabit değerler (spec'ten)

| Ad | Değer |
|---|---|
| `ACTIVITY_MULT` | `{ low: [1.45, 1.30], mid: [1.55, 1.43], high: [1.70, 1.58] }` (antrenman günü, dinlenme günü) |
| `GAIN_PACE` | `{ slow: 0.10, mid: 0.15, fast: 0.20 }` (TDEE'nin oranı) |
| Kalori tabanı | kadın 1400, erkek 1750 (değişmez) |
| Protein | `ref` = hedef kilo ≥ 30 ise `min(kilo, hedef)`, değilse `kilo`. lose: yağ oranı geçerliyse `yağsızKütle × 2.5`, değilse `ref × 2.2`; keep: `ref × 1.6`; gain: `ref × 1.8`; Standart = `min(o değer, kilo × 2.2)`; `proteinHigh` açıksa `max(Standart, kilo × 2.0)`; `Math.round` |
| Yağ | `Math.round(calTarget × 0.25 / 9)` |
| Karbonhidrat | `max(60, round((cal − pro×4 − yağ×9) / 4))` (bugünkü gibi) |
| Ver'e geçerken açık 0 ise | `state.deficit = 500` |

## Review Focus

1. **Eski kayıt, açık 0:** v42'de "kilo koruma" kullanan biri v43'te `keep` olmalı, kalorisi aynı kalmalı → Görev 1 testine eklendi.
2. **Al seçiliyken kilo zaten hedefin üstünde:** zaman çizelgesi negatif/sonsuz hafta yazmamalı, "hedefine ulaştın" demeli → Görev 2 testine eklendi.
3. **Düşük kalorili kilolu kadın (taban 1400):** hedeflerin toplamı (P×4 + K×4 + Y×9) kalori hedefini aşmamalı (karbonhidrat alt sınırı 60 hariç tutulursa) → Görev 1 testine eklendi.
4. **Bozuk ayar değerleri** (`goal: 5`, `activity: "x"`, `gainPace: null`, `proteinHigh: "evet"`): açılış hatasız, geçerli varsayılana dönüş → Görev 1 testine eklendi; ayrıca `bozuk_veri.py`.
5. **Hedef kilo boş/geçersiz:** protein `ref = kilo` ile hesaplanır, `NaN` yok → Görev 1 testine eklendi.

---

### Task 1: Hesap çekirdeği + göç (getTargets, migrateState adım 3)

**Files:**
- Modify: `src/app/01-temel.js` (`DEFAULT_SETTINGS` satır 5–12; `DATA_VER` satır 215; `migrateState` 216–230; `normalizeState` ayar doğrulaması)
- Modify: `src/app/03-beslenme.js:4-19` (`getTargets`)
- Test: `tests/test_v43_hesap.py` (yeni; bölüm 1). `tests/run_all.py` listesine ekle (listeyse).

**Interfaces:**
- Produces: `ACTIVITY_MULT`, `GAIN_PACE` (01-temel.js, en üstte); `goalDelta()` → sayı (kcal; lose: `−state.deficit`, keep: `0`, gain: `+round(tdee × oran)`) ; `getTargets()` → `{ calTarget, proTarget, carbTarget, fatTarget, tdee, goal, goalDelta }` (eski alanlar aynı adla kalır). `state.settings.goal` ∈ `lose|keep|gain`, `gainPace` ∈ `slow|mid|fast`, `activity` ∈ `low|mid|high`, `proteinHigh` boolean.

- [ ] **Step 1: Write the failing test** `tests/test_v43_hesap.py` (yapı `tests/test_v42_goc_profil.py` gibi: kendi sunucusu, port 8802, `page()`, `seed()`, `check()`; sonda `fails`/`errs` ile çıkış kodu). Bölüm 1 denetimleri:

```python
OWNER = {"weight": 105, "deficit": 700, "dayType": "train",
         "settings": {"sex": "male", "age": 26, "height": 180, "targetWeight": 82}}
seed(pg, OWNER); t = pg.evaluate("getTargets()"); s = st(pg)
check(s["dataVer"] == 3 and s["settings"]["goal"] == "lose" and s["settings"]["activity"] == "mid", "eski kayıt: lose + mid, dataVer 3")
check(t["calTarget"] == 2478, "sahibin kalorisi değişmedi (2478)")
check(t["proTarget"] == 180 and t["fatTarget"] == 69 and t["carbTarget"] == 284, "protein 180, yağ 69, karb 284")
check(s["deficit"] == 700, "açık korunuyor")

seed(pg, {**OWNER, "deficit": 0}); t = pg.evaluate("getTargets()")
check(st(pg)["settings"]["goal"] == "keep" and t["calTarget"] == t["tdee"], "açık 0 → keep, kalori = tdee")

seed(pg, {**OWNER, "settings": {**OWNER["settings"], "bodyFat": 25}})
check(pg.evaluate("getTargets().proTarget") == 197, "yağ oranı 25: yağsız kütle × 2,5 = 197")
seed(pg, {**OWNER, "settings": {**OWNER["settings"], "proteinHigh": True}})
check(pg.evaluate("getTargets().proTarget") == 210, "Yüksek: kilo × 2 = 210")
LEAN = {"weight": 80, "deficit": 500, "dayType": "train", "settings": {"sex": "male", "age": 30, "height": 180, "targetWeight": 80, "bodyFat": 10, "proteinHigh": True}}
seed(pg, LEAN)
check(pg.evaluate("getTargets().proTarget") == 176, "zayıf + Yüksek: Standart (176) Yüksek'ten (160) büyükse Standart")
BIG = {"weight": 130, "deficit": 0, "dayType": "train", "settings": {"sex": "male", "age": 35, "height": 182, "targetWeight": 85, "goal": "keep"}}
seed(pg, BIG); check(pg.evaluate("getTargets().proTarget") == 136, "130 kg, hedef 85, keep: 85 × 1,6 = 136")
seed(pg, {**BIG, "deficit": 600, "settings": {**BIG["settings"], "goal": "lose"}})
check(pg.evaluate("getTargets().proTarget") == 187, "130 kg lose: 85 × 2,2 = 187")
F = {"weight": 120, "deficit": 1000, "dayType": "rest", "settings": {"sex": "female", "age": 55, "height": 155, "targetWeight": 70, "activity": "low"}}   # 1732,75 × 1,30 − 1000 = 1253 → taban 1400
seed(pg, F); t = pg.evaluate("getTargets()")
check(t["calTarget"] == 1400 and t["proTarget"]*4 + t["fatTarget"]*9 + t["carbTarget"]*4 <= 1400 + 8, "taban 1400'de hedef toplamı kaloriyi aşmıyor")
G = {"weight": 70, "deficit": 0, "dayType": "train", "settings": {"sex": "male", "age": 30, "height": 178, "targetWeight": 76, "goal": "gain", "gainPace": "mid"}}
seed(pg, G); t = pg.evaluate("getTargets()")
check(t["tdee"] == 2585 and t["goalDelta"] == 388 and t["calTarget"] == 2973 and t["proTarget"] == 126 and t["fatTarget"] == 83, "gain mid: +%15, protein 70 × 1,8")
seed(pg, {**OWNER, "settings": {**OWNER["settings"], "activity": "high"}})
check(abs(pg.evaluate("getTargets().tdee") - 3485) <= 1, "high: 2050 × 1,70")
seed(pg, {**OWNER, "settings": {**OWNER["settings"], "targetWeight": ""}})
check(pg.evaluate("getTargets().proTarget") == 231, "hedef kilo boş: ref = kilo (105 × 2,2 = 231)")
seed(pg, {**OWNER, "settings": {**OWNER["settings"], "goal": 5, "activity": "x", "gainPace": None, "proteinHigh": "evet"}})
s = st(pg)["settings"]
check(s["goal"] == "lose" and s["activity"] == "mid" and s["gainPace"] == "mid" and s["proteinHigh"] is False, "bozuk ayarlar geçerli değere döndü")
seed(pg, {**OWNER, "dataVer": 3, "deficit": 0, "settings": {**OWNER["settings"], "goal": "lose"}})
check(st(pg)["settings"]["goal"] == "lose", "dataVer 3 kayıtta göç tekrar çalışmıyor (kullanıcının seçimi korunur)")
```

- [ ] **Step 2: Run it to verify it fails** — `npm run build` sonra `python3 tests/test_v43_hesap.py`. Beklenen: FAIL (dataVer 2, goal yok, protein 201).

- [ ] **Step 3: Implement**
  - `DEFAULT_SETTINGS`'e `goal: "lose", gainPace: "mid", activity: "mid", proteinHigh: false` ekle.
  - `DATA_VER = 3`; `migrateState`'e `if (v < 3) s.settings.goal = num(s.deficit, 0) > 0 ? "lose" : "keep";` (yorum: "v43: hedef Ver/Koru/Al").
  - `normalizeState` ayar doğrulaması: `goal` geçersizse `num(s.deficit) > 0 ? "lose" : "keep"`; `gainPace` / `activity` geçersizse `"mid"`; `proteinHigh = s.settings.proteinHigh === true`.
  - `getTargets()` yukarıdaki sabit değerler tablosuna göre; `goalDelta` sonucu da döndürür. Fonksiyon dışında tek başına `goalDelta()` gerekmiyorsa yazma (YAGNI); koç `getTargets().goalDelta` kullanır.

- [ ] **Step 4: Run tests** — `npm run build` ("✓ index.html oluşturuldu"), `python3 tests/test_v43_hesap.py` → bölüm 1 hepsi `ok`. Sonra `npm test`; değer değişimi yüzünden kırılan eski test olursa yalnızca beklenen sayıyı güncelle ve commit mesajında belirt (mantığı değiştirme).

- [ ] **Step 5: Commit** — `git add src/app/01-temel.js src/app/03-beslenme.js tests/test_v43_hesap.py tests/run_all.py` → `git commit -m "v43: hedef (Ver/Koru/Al), hareketlilik, kanıta dayalı protein, yağ %25 — hesap ve göç"`

### Task 2: Menülerim "Hedef" kartı

**Files:**
- Modify: `src/markup.html:762-770` ("KALORİ AÇIĞI" bloğu)
- Modify: `src/app/03-beslenme.js` (`renderWeightBlock`, satır ~250–275)
- Modify: `src/app/04-besinler-barkod.js:575-579` (`updateProfile`; yeni `setGoal`, `setGainPace` buraya)
- Test: `tests/test_v43_hesap.py` bölüm 2

**Interfaces:**
- Consumes: `getTargets()` → `goal`, `goalDelta` (Görev 1).
- Produces: `setGoal(g: "lose"|"keep"|"gain")`, `setGainPace(p: "slow"|"mid"|"fast")` (ikisi de `renderAll()`); DOM kimlikleri `#goalLose #goalKeep #goalGain`, `#loseBox` (mevcut `#deficitSlider`, `#deficitVal` içinde), `#gainBox` (`#paceSlow #paceMid #paceFast`), `#goalVal` (gösterilen kcal farkı), `#timelineInfo` (mevcut).

- [ ] **Step 1: Write the failing test** (bölüm 2, sahibin kaydıyla, `pg.evaluate("setNutriView('menus')")`):

```python
check(pg.is_visible("#goalLose") and pg.is_visible("#goalVal"), "Hedef kartı görünür")
check(pg.is_visible("#loseBox") and not pg.is_visible("#gainBox") and "kayıp" in pg.inner_text("#timelineInfo"), "Ver: kaydırıcı görünür, 'kayıp'")
pg.click("#goalGain"); pg.wait_for_timeout(80)
check(st(pg)["settings"]["goal"] == "gain" and pg.is_visible("#gainBox") and not pg.is_visible("#loseBox"), "Al: hız düğmeleri görünür")
check("ulaştın" in pg.inner_text("#timelineInfo"), "Al + kilo (105) hedefin (82) üstünde: 'hedefine ulaştın', negatif hafta yok")
pg.evaluate("state.settings.targetWeight = 110; renderAll()")
check("alım" in pg.inner_text("#timelineInfo") and "hafta" in pg.inner_text("#timelineInfo"), "Al: 'haftalık ~… kg alım → … hafta'")
c1 = pg.evaluate("getTargets().calTarget"); pg.click("#paceFast"); pg.wait_for_timeout(80)
check(st(pg)["settings"]["gainPace"] == "fast" and pg.evaluate("getTargets().calTarget") > c1 and pg.inner_text("#goalVal").startswith("+"), "Hızlı: kalori arttı, '+' gösterilir")
pg.click("#goalKeep"); pg.wait_for_timeout(80)
check("koru" in pg.inner_text("#timelineInfo").lower() and not pg.is_visible("#loseBox") and not pg.is_visible("#gainBox"), "Koru")
pg.evaluate("state.deficit = 0; renderAll()"); pg.click("#goalLose"); pg.wait_for_timeout(80)
check(st(pg)["deficit"] == 500, "Ver'e açık 0 iken geçince 500")
for sel in ["#goalLose", "#goalKeep", "#goalGain", "#paceSlow"]:
    pg.click("#goalGain"); bb = pg.locator(sel).bounding_box(); check(bb and bb["height"] >= 44, sel + " ≥ 44 px")
```

- [ ] **Step 2: Run to verify it fails** — `npm run build && python3 tests/test_v43_hesap.py` → bölüm 2 FAIL.

- [ ] **Step 3: Implement** — Başlık `HEDEF`, sağda `#goalVal` (`−700` / `0` / `+350`, `t-display`). Altında üç düğmeli seçici: Beslenme'deki `#btnTrain/#btnRest` seçicisinin sınıflarını aynen kullan (seçili hâl de aynı sınıf düzeniyle; sınıf adları sabit metin). `#loseBox` = mevcut kaydırıcı; `#gainBox` = Yavaş / Orta / Hızlı. `renderWeightBlock` görünürlükleri, seçili düğmeyi ve `#timelineInfo` metnini yöne göre yazar:
  - lose: bugünkü metin (kilo ≤ hedef → `"<hedef> kg hedefine ulaştın!"`).
  - keep: `"Kilo koruma: hedef kalorin harcamana eşit"`.
  - gain: kilo ≥ hedef → `"<hedef> kg hedefine ulaştın!"`; değilse `"Haftalık ~<fmtKg(goalDelta×7/7700)> kg alım → <hedef> kg hedefine ~<hafta> hafta"`.
  - `setGoal("lose")` açık 0 ise `state.deficit = 500`.

- [ ] **Step 4: Run tests** — derle, `python3 tests/test_v43_hesap.py` bölüm 1–2 `ok`; `tests/shots/` altına Menülerim'in iki temada ekran görüntüsünü al (`pg.screenshot`) ve bak.

- [ ] **Step 5: Commit** — `git commit -m "v43: Menülerim'de Hedef kartı (Ver/Koru/Al, kilo alma hızı)"`

### Task 3: Koç iki yönlü

**Files:**
- Modify: `src/app/09-kas-plaka-koc-takviye.js:395-445` (`coachAnalysis`, `coachHintText`)
- Modify: `src/app/07-grafik-ilerleme.js:241-270` (`progCoachHtml` uyarı ve "neden" metinleri)
- Test: `tests/test_v43_hesap.py` bölüm 3 (tartı tohumlama kalıbı `tests/test_v7_oneri_koc.py`'den)

**Interfaces:**
- Consumes: `getTargets()` → `goal`, `goalDelta`; `GAIN_PACE`.
- Produces: `coachAnalysis()` dönüşüne `goal`, `gainTooFast`, `notGaining`, `keepDrift` (boolean) eklenir; `expectedWeekly = goalDelta × 7 / 7700`; `tooFast` ve `gaining` yalnızca `goal === "lose"` iken doğru olabilir.

- [ ] **Step 1: Write the failing test** — 21 günde 6 tartı tohumla (`weightLogs` `ts` ile, test_v7 kalıbı), her senaryoda `pg.evaluate("coachAnalysis()")` ve `pg.evaluate("progCoachHtml()")`:

```python
# gain, 70 → 71,5 kg / 3 hafta (≈ %0,7/hafta)
check(a["expectedWeekly"] > 0 and a["gainTooFast"] and "fazla yağ" in html, "Al + hızlı alım: uyarı")
# gain, kilo sabit 70
check(a["notGaining"] and "almıyorsun" in html, "Al + alım yok: uyarı")
# keep, 80 → 78,5 kg / 3 hafta
check(a["keepDrift"] and a["expectedWeekly"] == 0 and "korunmuyor" in html, "Koru + kayma: uyarı")
# lose, sahibin kaydı, 105 → 101 / 3 hafta (≈ %1,3/hafta)
check(a["tooFast"] and not a["gainTooFast"], "Ver: eski uyarı aynı")
# gain senaryosunda tooFast/gaining yanlış
check(not a_gain["tooFast"] and not a_gain["gaining"], "Al'da kilo verme uyarıları çıkmıyor")
```

- [ ] **Step 2: Run to verify it fails.**

- [ ] **Step 3: Implement** — İstenen kalori: lose `max(taban, tdeeEst − deficit)`, keep `max(taban, tdeeEst)`, gain `max(taban, tdeeEst + round(tdeeEst × GAIN_PACE[pace]))`. Eşikler: `gainTooFast` = gain ve `pctPerWeek > 0.5`; `notGaining` = gain ve `weekly < 0.05`; `keepDrift` = keep ve `|pctPerWeek| > 0.25`. Metinler (aynen):
  - gainTooFast: `Haftada vücut ağırlığının %<x>'i kadar alıyorsun; %0,5'in üstü fazla yağ birikmesine yol açabilir.`
  - notGaining: `Kalori fazlası verdiğin hâlde kilo almıyorsun. Porsiyonları tartarak girmeyi ve öğün tiklerini kontrol etmeyi öneririm.`
  - keepDrift: `Kilon korunmuyor: haftada %<x> değişiyor.`
  - "neden" satırı (delta işaretine göre): gain → delta > 0 `Beklediğinden yavaş alıyorsun.` / delta < 0 `Beklediğinden hızlı alıyorsun; fazla yağ birikmesin diye.`; keep → delta > 0 `Kilo veriyorsun.` / delta < 0 `Kilo alıyorsun.`; lose → bugünkü metinler.

- [ ] **Step 4: Run tests** — derle, bölüm 1–3 `ok`; `python3 tests/test_v7_oneri_koc.py` ve `tests/test_v29_ilerleme.py` geçer.

- [ ] **Step 5: Commit** — `git commit -m "v43: kalori koçu kilo alma ve korumada da çalışıyor"`

### Task 4: Profil — hareketlilik ve protein seçimi

**Files:**
- Modify: `src/markup.html` (Kişisel bilgiler, `#setTarget` satır 1231 yakını)
- Modify: `src/app/08-profil-yedek.js` (`PF_FIELDS` satır 5; `fillProfileFields` / `applyProfileFields` mevcut kalıbıyla)
- Test: `tests/test_v43_hesap.py` bölüm 4

**Interfaces:**
- Consumes: `state.settings.activity`, `state.settings.proteinHigh` (Görev 1).
- Produces: `#setActivity` (`select.t-in`: `low` "Az (masa başı)", `mid` "Orta", `high` "Çok (ayakta ya da bedenen çalışma)"), `#setProtein` (`select.t-in`: `std` "Standart", `high` "Yüksek"), altında açıklama satırı (aynen): `Standart, araştırmalara göre yeterli miktardır. Yüksek, daha fazlasını isteyenler için.`

- [ ] **Step 1: Write the failing test:**

```python
pg.evaluate("openProfile()"); pg.wait_for_timeout(150)
check(pg.input_value("#setActivity") == "mid" and pg.input_value("#setProtein") == "std", "Profil varsayılanları")
c0 = pg.evaluate("getTargets().calTarget"); pg.select_option("#setActivity", "high"); pg.wait_for_timeout(100)
check(st(pg)["settings"]["activity"] == "high" and pg.evaluate("getTargets().calTarget") > c0 and "Kaydedildi" in pg.inner_text("#toastWrap"), "hareketlilik otomatik kaydedildi, kalori arttı")
pg.select_option("#setProtein", "high"); pg.wait_for_timeout(100)
check(st(pg)["settings"]["proteinHigh"] is True and pg.evaluate("getTargets().proTarget") == 210, "Yüksek protein kaydedildi")
pg.locator("#toastWrap button", has_text="Geri al").last.click(); pg.wait_for_timeout(120)
check(st(pg)["settings"]["proteinHigh"] is False and pg.input_value("#setProtein") == "std", "Geri al")
```

- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement** — iki alanı `PF_FIELDS`'e ekle, okuma/yazmayı mevcut `setSex` kalıbıyla yap.
- [ ] **Step 4: Run tests** — derle, bölüm 1–4 `ok`; `python3 tests/test_v42_goc_profil.py` geçer.
- [ ] **Step 5: Commit** — `git commit -m "v43: Profil'de hareketlilik ve protein (Standart/Yüksek)"`

### Task 5: Sürüm, tam doğrulama, belge

**Files:**
- Modify: `src/markup.html` (`AYK+ v43`), `sw.js` (`aykplus-v43`), `CLAUDE.md` (§6 Beslenme'ye "Hedef ve hesap (v43)" maddesi: ayar adları, sabitler, `DATA_VER` 3; §9 yol haritasına v43 satırı), `scripts/kontrol/ortak.py` (gerekirse Menülerim Hedef kartı Al hâli ekranı)

- [ ] **Step 1:** Sürüm etiketlerini artır, `npm run build` → "✓ index.html oluşturuldu".
- [ ] **Step 2:** `npm test` → 35 paketin hepsi geçer (çıktıyı kaydet).
- [ ] **Step 3:** `npm run kontrol -- --hizli` → yalnızca bilinçli farklar (Menülerim Hedef kartı, makro hedef sayıları); ölçüm (okunurluk/44 px/taşma) temiz. `python3 scripts/kontrol/bozuk_veri.py` → kurtarmaya düşme ve sayfa hatası 0; `python3 scripts/kontrol/html_enjeksiyon.py` → 0.
- [ ] **Step 4:** Sahibin kaydıyla gerçek değerleri ölç (antrenman ve dinlenme günü: kalori, P/K/Y eski → yeni) ve kullanıcıya verilecek özete yaz.
- [ ] **Step 5:** Commit `"AYK+ v43: hedef Ver/Koru/Al, hareketlilik, kanıta dayalı protein ve yağ"`. **`main`'e gönderme kullanıcı onayından sonra.**
