# v48 — Antrenman İngilizce Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Kullanıcı kararı (16 Kasım 2026, "B"): Task 1 ayrı gözden geçirmeli; Task 2–4 hızlı yol (görev başına gözden geçirme yok); sürüm sonunda en yetenekli modelde tek bağımsız inceleme + İngilizce okuma, tek düzeltme turu; göndermeden önce kullanıcıya sorulur. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Antrenman sekmesinin (Bugün, aktif antrenman, Programım, Hareketler + vücut haritası, Geçmiş), hareket penceresinin, hareket menüsünün (`#exSheet`), plaka/kademe aracının ve Antrenman → Bugün'deki ısınma kartının bütün arayüz metinlerini `t()`'ye bağlamak ve İngilizcelerini terim sözlüğüne uygun yazmak. Türkçe ekran piksel piksel aynı kalır; İngilizce hâlâ gizli.

**Architecture:** v46–v47 altyapısı (`src/app/16-dil.js`, `t()`/`tn()`, `data-t*`). Yeni sözlük dosyası `src/app/21-en-antrenman.js` (`Object.assign(EN, {…})`). Kayıtlı Türkçe değerler (kas adları, `ex.kind`, `s.e`, hareket adları, geçmiş anahtarları) kayıtta değişmez; gösterilirken küçük yardımcılar (`muscleL`, `kindL`, `effortL`, `equipL`, `targetL`) çevirir.

**Tech Stack:** Vanilla JS PWA, Playwright (Python) testleri, `npm run kontrol`.

**Spec:** `docs/superpowers/specs/2026-11-15-asama3-ingilizce-design.md` (§5, §6 v48 satırı, §7, §8). Terimler: `docs/i18n-terimler.md` (BAĞLAYICI). Kayıtlı metinler: `docs/i18n-kayitli-metinler.md` (BAĞLAYICI; bu plan b-tablosundaki iki satırı aşağıdaki karara göre günceller).

**Kapsam bölmesi (kullanıcı kararı):** Spec'in v48 satırı ikiye bölündü. Bu sürüm = Antrenman. Mobilite, İlerleme (koç dahil), kurulum ve örnek içerik üreticileri sonraki sürüm. Paylaşım kartı, hareket rehberleri ve hareket adlarındaki Türkçe parantezler ("Geniş Tutuş" gibi; hareket adı = geçmiş anahtarı) spec gereği v49'da.

## Global Constraints

- Türkçe seçiliyken hiçbir ekran değişmez: `npm run kontrol -- --hizli` piksel farkı 0 (sürüm etiketi hariç).
- Kayıtta tutulan / karşılaştırılan / anahtar olan Türkçe metinler (`docs/i18n-kayitli-metinler.md`) kayıtta Türkçe kalır; yalnızca gösterilirken `t()`. Özellikle: `MUSCLES` (ex.muscle, `state.libMuscle`, `MOB_WARM_REGIONS` anahtarı), `MUSCLE_RULES`, `exKey(ad)`, `EXERCISE_LIBRARY` kategori sırası (`LIB_CAT_MUSCLE`), `d.name.split(":")[0]`, `last.dayName` eşleşmesi.
- Cümle birleştirme YASAK: değişkenli cümle tek anahtar, `{ad}` yer tutucu; sayıya bağlı İngilizce `tn` + `{one, other}`. Örn. `finishAndLogWorkout` bitiş bildirimi (tonaj, kardiyo dk, rekor sayısı) parçaları ayrı anahtarlara bölünmez, tek cümle kalıplarıyla yazılır (gerekirse 2–4 kalıp).
- İngilizce metin terim sözlüğündeki karşılığı kullanır (bölüm 5–6: Workout, Program/My program, Exercises, Exercise library, Set, Reps, Weights/Cardio/Timed, Barbell & plates (Plates), Dumbbell, Bodyweight, Muscle group, Muscle map, Weekly sets per muscle, Rest timer, Warm-up sets, Plate breakdown, Weight increments, Progression suggestion, Estimated 1RM, Volume, Set effort, Easy/Moderate/Hard/Failure, Deload week). Sözlükte olmayan kavram → sözlüğe gerekçeli satır. Sentence case; en-GB yazımı.
- Anahtarda HTML etiketi varsa İngilizcesi aynı etiketleri aynı sırada taşır; İngilizce metinde etiket dışı `<`, `>`, `&` yok (`&` gereken kas adı İngilizcede "and" ya da `&amp;` değil: bkz. Task 1 kas tablosu).
- Kullanıcı verisi (hareket/gün/program adları, notlar) çevrilmez, `esc()` ile kalır. Hareket kütüphanesi adları çevrilmez (kullanıcı kararı + geçmiş anahtarı).
- `src/app` içinde `t` adlı yerel bağlama yok (test yasaklar).
- Testler `TEST_INIT`; İngilizce `window.AYK_TEST_EN = true` + `state.settings.lang = "en"`. Tek seferde tek test süreci. Yeni test `tests/test_v48_antrenman.py`, port 8806.
- Dokunma alanı ≥ 44 px; `data-fk` öğelerinin kimlik/özniteliklerine dokunulmaz.

## Review Focus

1. Kayıtlı kas adının ekranda çevrilirken kayda İngilizce yazılması (hareket penceresinde kas seçip kaydetmek, Hareketler'de vücut haritasından kas seçmek) → Task 1 testi: İngilizcede kaydedilen `ex.muscle` ve `state.libMuscle` Türkçe `MUSCLES` değerlerinden biri; Türkçeye dönünce aynı kas seçili.
2. İngilizcede eklenen süreli/kardiyo hareketin `targetInfo`/`set.target` metninin bozulup `parseRepRange` ve "+ set" (`/^\d+x/`) işleyişini kırması → Task 1 testi (kayıt Türkçe biçimde kalır, ekranda "sec"/"min").
3. Program günü kısa etiketinin (`split(":")`) ve "sıradaki gün" eşleşmesinin İngilizce varsayılan gün adıyla ("Day 3: ") bozulması → Task 1 testi.
4. Sayıya bağlı cümlelerde "1 sets", "1 exercises" → `tn`; Task 4 statik denetim (`{n}` + sayıya bağlı anahtarlar `{one, other}`) ve Task 2–3'te elle yazım.
5. İngilizcede dar düğme/çiplerde taşma (zorluk satırı "Moderate"/"Failure" 4 sütun, `EQUIP_SHORT`, alt sekmeler "Exercises") → Task 4 İngilizce kontrol ekranları (taşma, 44 px).

---

### Task 1: Antrenman terimleri, gösterim yardımcıları ve kayıtlı metin kuralları (ayrı gözden geçirme)

**Files:**
- Create: `src/app/21-en-antrenman.js`, `tests/test_v48_antrenman.py`
- Modify: `src/app/01-temel.js` (`KIND_LABEL`, `EFFORT_LABELS` yanında), `src/app/09-kas-plaka-koc-takviye.js` (yardımcılar `MUSCLES` yanında), `src/app/10-antrenman-arayuzu.js` (`EQUIP_LABEL/EQUIP_SHORT`, `GYM_VIEWS`), `src/app/05-secici-hareket.js` (`targetInfoFor`, `addWorkoutDay` varsayılan adı, `addSetToExercise` hedef metni), `docs/i18n-terimler.md`, `docs/i18n-kayitli-metinler.md`.

**Interfaces:**
- Produces (Task 2–4 kullanır; hepsi Türkçede girdiyi/eski metni aynen döndürür):
  - `muscleL(m: string) -> string` = kayıtlı Türkçe kas adının görünen adı (`t(m)`; `MUSCLES` dışı değer aynen).
  - `kindL(kind: "weight"|"cardio"|"time") -> string` (`KIND_LABEL` görünen hâli, emojili biçim korunur).
  - `effortL(v: 1..4) -> string` (`t(EFFORT_LABELS[v])`).
  - `equipL(eq, short: boolean) -> string` (`EQUIP_LABEL`/`EQUIP_SHORT` görünen hâli).
  - `libCatL(cat: string) -> string` = `EXERCISE_LIBRARY` kategori başlığının görünen hâli (anahtar ve sıra değişmez).
  - `targetL(s: string) -> string` = kayıtlı `targetInfo` / `set.target` metnindeki " sn" / " dk" birimlerini İngilizcede " sec" / " min" gösterir; sayı ve "x" kalıbına dokunmaz.

- [ ] **Step 1: Sözlüğe satır ekle** (`docs/i18n-terimler.md`, bölüm 5, gerekçeli): kas grupları — Göğüs **Chest**, Sırt **Back**, Omuz **Shoulders**, Ön Bacak **Quads**, Arka Bacak & Kalça **Hamstrings and glutes** (anahtar `&` içerdiği için İngilizcede "and"; dar çipte sığmazsa Task 4 ölçümüne göre "Hams & glutes" değil, satır kırılır), Kalf **Calves**, Biceps **Biceps**, Triceps **Triceps**, Karın **Abs**; `EXERCISE_LIBRARY` 11 kategori başlığının İngilizcesi (parantezdeki İngilizce zaten var: "1. Chest (press & fly)" gibi, Türkçe kısım atılır, numara korunur); "Eğim/Seviye" **Incline / level**; "Kilo artış adımı" **Weight step** (gerekçe: kademe = increment ile karışmasın diye; tek hareketin otomatik artışı). Mobilite bölgeleriyle (`MOB_REGIONS`: Hips, Shoulders, Chest, Hamstrings) aynı kelimeler tutarlı.
- [ ] **Step 2: Kayıtlı metin kararı** (`docs/i18n-kayitli-metinler.md`, `targetInfoFor` ve `addSetToExercise` satırları): Karar — `targetInfo` / `set.target` içindeki "sn"/"dk" **kayıtta her dilde Türkçe** üretilir (veri katmanı `fmtDateStore` ile aynı ilke; `parseRepRange` ve `/^\d+x/` değişmeden çalışır, eski kayıtlarla tek biçim), ekranda `targetL()`. Gerekçe satırı yazılır. `addWorkoutDay` varsayılan gün adı kullanıcının düzenlediği ad olduğu için **dile göre üretilir**: Türkçe `` `${n}. GÜN: ` `` aynen, İngilizce `` `DAY ${n}: ` ``; yer tutucu örneği de çevrilir; ":" ayracı korunur.
- [ ] **Step 3: Başarısız testi yaz** `tests/test_v48_antrenman.py` (port 8806, v47 testinin `check()`/sunucu kalıbıyla) bölüm 1:
  - `muscleL("Arka Bacak & Kalça") == "Hamstrings and glutes"` (EN), Türkçede aynı metin; `effortL(4) == "Failure"`, `kindL("time")` İngilizcede Türkçe harf içermez; `libCatL(Object.keys(EXERCISE_LIBRARY)[0])` "1." ile başlar ve Türkçe harf içermez; `targetL("3x45 sn") == "3x45 sec"`, `targetL("20 dk • 3 km") == "20 min • 3 km"`, Türkçede ikisi aynen.
  - Review Focus 1: İngilizcede hareket penceresi açılır (`openExerciseModal`), `#exMuscle` seçeneklerinin görünen metni İngilizce ama `value`'ları `MUSCLES` ile aynı; kas seçilip kaydedilince `aykStoredState()` → son hareketin `muscle` alanı `MUSCLES` içinde; `selectMuscle(MUSCLES[0])` sonrası `state.libMuscle === MUSCLES[0]`.
  - Review Focus 2: İngilizcede süreli hareket eklenir (`setExModalKind('time')`, 3 set × 45) → kayıtta `targetInfo === "3x45 sn"`, `sets[0].target` " sn" ile biter; `addSetToExercise` sonrası `targetInfo` "4x" ile başlar; ekranda `#gymRoot` metni "45 sec" içerir, " sn" içermez.
  - Review Focus 3: İngilizcede `addWorkoutDay` penceresinin varsayılan değeri `DAY N: ` (N = gün sayısı + 1); "Day 4: Arms" adıyla eklenince gün çipi kısa etiketi "Day 4"; Türkçede varsayılan `N. GÜN: ` aynen.
- [ ] **Step 4: Çalıştır** `python tests/test_v48_antrenman.py` → FAIL (yardımcılar tanımsız).
- [ ] **Step 5: Uygula:** yardımcılar (Interfaces), `21-en-antrenman.js` içinde Step 1 terimleri + `KIND_LABEL`, `EFFORT_LABELS`, `EQUIP_LABEL`, `EQUIP_SHORT`, `GYM_VIEWS` etiketleri; `#exMuscle` seçenek metinleri `muscleL` ile (değer Türkçe); `addWorkoutDay` dile göre varsayılan; `targetInfoFor` ve `addSetToExercise` değişmez (kayıt Türkçe). Tanımlardaki Türkçe sabitler `t()` sarılmaz (sözlük anahtarı); v47 testinin `IZIN["01-temel.js"]` içindeki "KIND_LABEL/EFFORT_LABELS/kas adı (v48)" gerekçeleri "gösterimde kindL/effortL/muscleL" olarak güncellenir.
- [ ] **Step 6: Doğrula:** `npm run build` (✓ index.html) → `python tests/test_v48_antrenman.py` PASS → `python tests/test_v47_ingilizce.py` PASS → `python tests/test_v46_dil.py` PASS.
- [ ] **Step 7: Commit** `v48: Antrenman terimleri, gösterim yardımcıları, kayıtlı metin kuralları`.

### Task 2: Antrenman ekranları (`10-antrenman-arayuzu.js` + ısınma kartı)

**Files:** `src/app/10-antrenman-arayuzu.js` (meal/custom food işlevleri HARİÇ: v47'de yapıldı), `src/app/06-mobilite.js` yalnızca `warmupCardHtml` (Antrenman → Bugün'de görünür; Mobilite'nin kalanı sonraki sürüm), `src/app/21-en-antrenman.js`.

**Interfaces:** Consumes Task 1 yardımcıları.

- Kapsam: `gymSubNav`, `gymTodayHtml`, `estimateMinutes` metinleri, `effortRowHtml`, `setRowHtml`, `gymActiveHtml`, `exRightText` (`targetL`), `gymProgramHtml`, vücut haritası (`todayMuscleSets`/`programMuscleSets` etiketleri, `aria-label`'lar, kas adları `muscleL`), `selectMuscle` görünen metni, `setLibRange`, `libListHtml` / `gymLibraryHtml` (kategori başlıkları `libCatL`, "PROGRAMDA" işareti, boş arama), `gymHistoryHtml` (tarihler `ts`'ten `fmtDay`; kayıtlı `.date` gösterimi v47 kuralı: `l.ts ? fmtDate(l.ts) : l.date`), `openExSheet` menü metinleri, kademe yardımcılarının ekrana çıkan metinleri (`levelsSummary`, `levelsAskHtml`, `confirmInferredLevels`, `dismissLevelsAsk`, `updateExEquipUI`, `fillExLevels`), `startWorkout`/`exitActiveWorkout` onay ve bildirimleri, `renderGym` boş durumları ("İlk hareketini ekle" dahil).
- Test (`tests/test_v48_antrenman.py` bölüm 2): İngilizcede Antrenman Bugün, aktif antrenman (bir set tamamlanmış → zorluk satırı görünür), Programım, Hareketler (kas seçili + seçisiz), Geçmiş (fikstürde antrenman kaydı) ve `#exSheet` açılır; `#gymRoot` / `#exSheet` görünür metninde, fikstürdeki kullanıcı verisi (gün adları, hareket adları, notlar — fikstürden çıkarılan liste) ayıklandıktan sonra Türkçe harf yok; Türkçede `gymTodayHtml()` çıktısı değişiklik öncesi kayıtla aynı (kontrol pikseli Task 4'te).
- Commit: `v48: Antrenman ekranları İngilizce`.

### Task 3: Hareket penceresi, program işlemleri, plaka/kademe aracı

**Files:** `src/app/05-secici-hareket.js` (v47'de yapılan `openPicker`/`pickerChoose`/`pickerExtra` dışında hepsi), `src/app/09-kas-plaka-koc-takviye.js` yalnızca Antrenman işlevleri: `overloadSuggestion` metinleri, `deloadInfo`, `deloadHtml`, `dismissDeload`, `suggestionHtml`, `applySuggestion`, `dismissSuggestion`, `weeklyMuscleSets` görünen metinleri, `plateChips`, `warmupSets`, `openPlateTool`, `renderLevelTool`, `renderPlateTool`, `nextDayIdx` / `autoSelectNextDay` / `workoutInProgress` bildirimleri, `fmtDuration`, `fmtMinutes`, `snapshot`/`offerUndo`/`doUndo` (v47'de sarılmadıysa); koç (`coachAnalysis`, `applyCoach`, `resetCoachAdjust`), `dayIntake`, `historySeries`, `setHistRange`, paylaşım kartı (`logExerciseLines`, `buildShareCanvas`, `openShareCard`, `shareWorkoutCard`) HARİÇ. `src/markup.html` `#exerciseModal` ve `#exSheet` (`data-t`, `data-t-aria`, `data-t-ph`; JS'in yazdığı başlık `#exModalTitle` JS'te `t()`), `src/app/21-en-antrenman.js`.

- Özel durumlar: `finishAndLogWorkout` bitiş bildirimi tek cümle kalıplarıyla (`tn` rekor sayısı; "volume" terimi); `workoutLogs[].date` kayıtta `fmtDateStore` (v46 kuralı; zaten öyleyse dokunma); `sessionSummary` / `paceText` birimleri (`sn`→`sec`, `dk`→`min`, `/km` aynı) yalnızca gösterimde; `deleteWorkoutDay`/`removeExercise`/`deleteWorkoutLog` onay pencereleri ve Geri al bildirimleri; `exEquip` "Otomatik ({ad})" kalıbı `t("Otomatik ({ad})", {ad: equipL(..., true)})`; `"Dinlenme • " + ex.name` kayıt etiketi DEĞİŞMEZ (v47 `timerLabelText` çeviriyor).
- Test (bölüm 3): İngilizcede hareket penceresi üç türde (ağırlık, süreli, kardiyo) ve kademe bölümü açıkken (`exEquip = "stack"`) `#exerciseModal` görünür metni + `placeholder`/`aria-label` Türkçe harf içermez; plaka aracı (`openPlateTool` bir ağırlık hareketiyle) ve kademe aracı Türkçe harf içermez; antrenmanı bitirince bildirim İngilizce ve kayıttaki `workoutLogs` son kaydının `date` alanı Türkçe ay kısaltmalı (`fmtDateStore`); Türkçede aynı akış eski metinleri verir.
- Commit: `v48: hareket penceresi, program işlemleri ve plaka aracı İngilizce`.

### Task 4: Denetimler ve sürüm

**Files:** `tests/test_v47_ingilizce.py` (bölüm 4 kapsam genişletme), `tests/test_v48_antrenman.py` (bölüm 4), `scripts/kontrol/ortak.py` (`EN_SCREENS`), `src/markup.html` (`AYK+ v48`), `sw.js` (`aykplus-v48`), `CLAUDE.md`.

- [ ] Statik bekçi kapsamı: `KISMI`'den `05-secici-hareket.js` ve `10-antrenman-arayuzu.js` çıkar, `IZIN`'e tam dosya olarak girer (gerekçeli izin listesiyle: kas adı tanımları, `MUSCLE_RULES` kalıpları, `autoInc`/`autoEquip` kalıpları, `"Dinlenme • "` kayıt etiketi, `" sn"`/`" dk"` kayıt birimi, `BODY_POLYS` anahtarları vb.); `09` için `KISMI` listesine Task 3 işlevleri eklenir; `06` için `KISMI` = `["warmupCardHtml"]`; `MK_IZIN`'den `exerciseModal` ve `exSheet` çıkar; bayat izin girdisi hata (mevcut kural). Her yeni anahtarın EN girişi, yer tutucu/etiket kümesi eşitliği, sayıya bağlı `{n}` anahtarları `{one, other}` (mevcut denetim yeni dosyayı da kapsar).
- [ ] `kontrol`: İngilizce Antrenman ölçüm ekranları (yalnız ölçüm, piksel karşılaştırması yok; `tests/shots/v48_en_*.png`): `en-g-bugun`, `en-g-aktif` (bir set tamamlanmış, zorluk satırı açık), `en-g-program`, `en-g-hareketler` (kas seçili), `en-g-gecmis`, `en-g-hareket` (hareket penceresi, kademe bölümü açık), `en-g-plaka` (plaka aracı). Taşma, 44 px, okunurluk temiz; taşma çıkarsa metin kısaltılmaz, önce CSS (satır kırılması / esnek genişlik) — Türkçe piksel farkı 0 kalacak şekilde.
- [ ] Sürüm etiketleri; CLAUDE.md (Dil bölümüne v48 satırı: `21-en-antrenman.js`, yardımcılar `muscleL/kindL/effortL/equipL/libCatL/targetL`, `targetInfo` "sn"/"dk" kayıtta Türkçe kuralı; dosya listesine `21-en-antrenman`; test sayısı 39; kontrol aracında İngilizce ekran sayısı 21; yol haritasına v48 satırı).
- [ ] `npm run build` → `npm test` 39/39 → `npm run kontrol -- --hizli` (Türkçe yalnızca sürüm etiketi; İngilizce ölçüm temiz) → `python scripts/kontrol/bozuk_veri.py` ve `html_enjeksiyon.py` (0 hata) → sahibin fikstürü: antrenman günü hedefleri 2478/180/69/284, `lang` `tr`, `dataVer` 5, kurulum görünmez.
- [ ] Commit: `AYK+ v48: Antrenman İngilizce (gizli)`.

### Sürüm sonu (denetleyici)
- Tek bağımsız inceleme (en yetenekli model): kod + İngilizce okuma (`tests/shots/v48_en_*.png` + `21-en-antrenman.js`), terim sözlüğüne uygunluk, anlam, kayıtlı metin kuralları. Bulgular tek düzeltme turunda; ardından tam test + kontrol; kullanıcıya özet ve "gönderelim mi" sorusu.
