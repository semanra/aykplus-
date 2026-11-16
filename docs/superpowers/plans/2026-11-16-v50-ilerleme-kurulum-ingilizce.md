# v50 — İlerleme, Kurulum ve Örnek İçerik İngilizce Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Karma yöntem B (kullanıcı kararı): Task 1 ayrı gözden geçirmeli; Task 2–4 hızlı; sonda en yetenekli modelde tek bağımsız inceleme + İngilizce okuma, tek düzeltme turu; göndermeden önce kullanıcıya sorulur. Limit az harcanır.

**Goal:** İlerleme sekmesinin (Genel, Kilo, Güç, Beslenme; koç; grafik penceresi), ilk açılış kurulumunun (7 adım) ve örnek içerik üreticilerinin bütün arayüz metinlerini `t()`'ye bağlamak, İngilizcelerini terim sözlüğüne (bölüm 8, 10) uygun yazmak; örnek içerik İngilizce kurulumda İngilizce adlarla oluşur. Türkçe ekran piksel piksel aynı; İngilizce hâlâ gizli.

**Architecture:** v46–v49 altyapısı. Yeni sözlük dosyası `src/app/23-en-ilerleme-kurulum.js` (`Object.assign(EN, {…})`). v48 yardımcıları (`muscleL`, `kindL`, `effortL`, `targetL`) İlerleme'de de kullanılır.

**Spec:** `docs/superpowers/specs/2026-11-15-asama3-ingilizce-design.md` (§6 v50 satırı, §7, §8). Terimler `docs/i18n-terimler.md` bölüm 8, 10, 11 (BAĞLAYICI). Kayıtlı metinler `docs/i18n-kayitli-metinler.md` a3 (BAĞLAYICI, aşağıdaki kararla).

**Kapsam dışı:** Hakkında gövdesi (v52) — ama kurulumdaki "Sağlık notu" kutusu `HEALTH_NOTE`'u gösterdiği için `HEALTH_NOTE` sabitinin İngilizcesi bu sürümde yazılır (Hakkında aynı sabiti v52'de kullanır); paylaşım kartı (v52); besin adları (v51) — örnek menü besin kimlikleriyle kurulur, adlar besin verisinden gelir.

## Global Constraints

- Türkçe seçiliyken hiçbir ekran değişmez: `npm run kontrol -- --hizli` piksel farkı 0 (sürüm etiketi hariç).
- Kayıtlı metin kararı (örnek içerik, kayıtlı-metinler a3): öğün başlıkları, gün adları, örnek hareket notu ve örnek esneme rutini adı **dile göre üretilir** (kurulum o anki dilde: TR bugünkü metin bayt bayt, EN "Breakfast" / "Day 1: Full Body A" / "Target: 3 sets x 8–12 reps" / "Daily stretching"); gün adlarında ":" ayracı korunur. `targetInfo` ve `set.target` v48 kuralıyla **her dilde Türkçe biçim** ("sn", ondalık virgül; `fmtNumTr`). `01-temel.js` `/^Hedef:/` kalıbı İngilizce öneki de tanır (`/^(Hedef|Target):/`). Var olan kayıt değişmez. Hareket kütüphanesi adları çevrilmez. `weightLogs[].date` `fmtDateStore` (zaten öyle).
- Koç ve İlerleme metinlerinde sayılar dile göre (`fmtNum`, `fmtKg`, `locale()`); kayıt anahtarları, `dailyLogs` tarih anahtarları, `PROG_VIEWS` değerleri değişmez.
- Cümle birleştirme YASAK; sayıya bağlı İngilizce `tn` + `{one, other}`. İngilizce metinde etiket dışı `<`, `>`, `&` yok. Sentence case, en-GB. Terimler: Overview/Weight/Strength/Nutrition, Weigh-in / Log weigh-in, Recent weigh-ins, 7-day average, Measurements, Coach / Calorie coach, Coach adjustment, Streak, This week day by day, On target/Close/Off target, Choose exercise, Volume, Estimated 1RM (e1RM), PR, Workout calendar, Cardio / PRs; kurulum bölüm 10 terimleri (Activity level Low/Moderate/High, Training experience New to the gym / I've trained before, Health notice…).
- Kullanıcı verisi çevrilmez, `esc()`. `src/app` içinde `t` adlı yerel bağlama yok. Testler `TEST_INIT`; İngilizce `window.AYK_TEST_EN = true` + `state.settings.lang = "en"`; kurulum testleri tohumsuz başlatma (`localStorage.clear()` + `indexedDB.deleteDatabase('aykplus')`, `tests/ortak_tohum.py` `SEED_ONLY` kalıbı). Yeni test `tests/test_v50_ilerleme_kurulum.py`, port 8808. Tek test süreci. Dokunma alanı ≥ 44 px; `data-fk` öğelerine dokunulmaz.

## Review Focus

1. İngilizce kurulumda örnek içeriğin yarı Türkçe/yarı İngilizce oluşması ya da gün adının ":" ayracını kaybedip Antrenman gün çipini bozması → Task 1 testi.
2. Örnek süreli hareketin `targetInfo`'su İngilizce birimle kaydedilip `parseRepRange` / "+ set"i bozması → Task 1 testi (kayıt "sn").
3. Kurulumda dil seçilince (`obPickLang`) adımların ve hesap özetinin dile göre yeniden çizilmemesi; kurulum yarıda kapanınca dilin kalıcı karışıklığı → Task 3 testi.
4. Koç cümlelerinde sayı/yön/çoğul hataları ("1 weeks", "+-250 kcal") → Task 2 testi (koç örnek durumlarıyla: kilo verme hızlı, kilo almama, koruma sapması) + Task 4 statik denetim.
5. İngilizcede dar yerlerde taşma (İlerleme 4 kutu, şerit etiketleri, kurulum seçenek kartları, sonraki/geri düğmeleri) → Task 4 İngilizce kontrol ekranları.

---

### Task 1: Örnek içerik üreticileri ve kayıt kuralları (ayrı gözden geçirme)

**Files:** Create `src/app/23-en-ilerleme-kurulum.js`, `tests/test_v50_ilerleme_kurulum.py`. Modify `src/app/14-ornek-icerik.js` (`SAMPLE_MENU_TEMPLATE` başlıkları, `samplePrograms` gün adları ve not, `sampleMobility` rutin adı), `src/app/01-temel.js` (`/^Hedef:/` kalıbı), `docs/i18n-kayitli-metinler.md` (a3 satırlarına "v50 yapıldı" + targetInfo notu), `docs/i18n-terimler.md` (bölüm 10'a gerekirse örnek gün/öğün adları satırı).
- [ ] **Step 1: Başarısız test** bölüm 1: (a) İngilizcede `buildSampleMenu(2200)` öğün başlıkları `["Breakfast","Lunch","Snack","Dinner"]` (sözlük bölüm 10'daki karşılıklar esas; yoksa bunlar), Türkçede bugünkü dört başlık; (b) İngilizcede `samplePrograms("new")` gün adları "Day 1: Full Body A"… biçiminde ve her biri ":" içerir; `samplePrograms("pro")` "Day 1: Upper Body A"…; Türkçede bugünkü adlar bayt bayt; (c) ağırlık hareketi notu İngilizcede "Target: {n} sets x {hedef} reps" kalıbında, Türkçede bugünkü "Hedef: …"; süreli hareketin `targetInfo`'su her iki dilde "…x… sn"; (d) `sampleMobility()` rutin adı İngilizcede "Daily stretching", Türkçede "Günlük esneme"; (e) `normalizeState` ile kind'ı "time"a çevrilmiş ve notu "Target: …" olan hareketin notu silinir (01 kalıbı).
- [ ] **Step 2:** Çalıştır → FAIL. **Step 3:** Uygula: başlık/ad/not üretimi çağrı anında `t()` (şablonda Türkçe kalır; `t("Kahvaltı")` vb.; gün adı `t("{n}. Gün: Tüm Vücut A", {n})` gibi tek anahtar; not `t("Hedef: {n} Set x {hedef} Tekrar", …)`), `01` kalıbı. **Step 4:** `npm run build` → test_v50 bölüm 1, `test_v44_baslangic.py`, `test_v48_antrenman.py`, `test_v47_ingilizce.py`, `test_v46_dil.py` PASS.
- [ ] **Step 5: Commit** `v50: örnek içerik dile göre, kayıt kuralları`.

### Task 2: İlerleme ve koç

**Files:** `src/app/07-grafik-ilerleme.js` (tamamı), `src/app/09-kas-plaka-koc-takviye.js` yalnızca `coachAnalysis`, `applyCoach`, `resetCoachAdjust`, `dayIntake`, `historySeries`, `setHistRange` görünen metinleri (koçun Beslenme'deki kısa ipucu `coachHintText` v47'de yapıldı; aynı anahtarları yeniden kullan), `src/markup.html` `#chartModal` (`data-t*`; başlığı JS yazar), `src/app/23-en-ilerleme-kurulum.js`.
- Kapsam: alt sekmeler (`PROG_VIEWS` etiketleri gösterimde `t()`), 4 kutu (`progWeekly`), tartı düğmesi ve penceresi (`progLogWeight`), koç kartı (`progCoachHtml`), şerit (`#pStrip`, `aria-label`'lar), Kilo (grafik, aralık düğmeleri, yağ oranı, haftalık ortalama, son tartılar + silme/Geri al, ölçü grafiği), Güç (hareket çipleri/`select`, rekorlar, kas listesi `muscleL`, volume, takvim — gün kısaltmaları `dayShort`), Beslenme (7/14/30, grafikler, gün listesi), eski grafik penceresi (`exerciseChartHtml`, `openExerciseChart`), `lineChart` eksen/boş durum metinleri.
- Test (bölüm 2): İngilizcede dört alt sekme (fikstür verisiyle) ve grafik penceresi açılır; `#progressRoot` (ya da İlerleme kökü) + `#chartModal` görünür metni ve `aria-label`'larda, fikstür kullanıcı verisi (hareket adları, notlar) ayıklandıktan sonra Türkçe harf yok; koç üç durumda (fikstür üzerinde `weightLogs`/`goal` ayarlanarak `coachAnalysis()` metni) İngilizce ve Türkçe harfsiz, "1 weeks" yok; Türkçede `progGenelHtml()` değişmedi.
- Commit: `v50: İlerleme ve koç İngilizce`.

### Task 3: İlk açılış kurulumu

**Files:** `src/app/15-kurulum.js` (`obStepHtml`, `obRender`, `obHead`, `obField`, `obOpt`, `obCheckRow`, `obWeeklyText`, `obUpdateWeekly`, `obCheck`/`obSetErr` hata metinleri, `obTargets` özeti, `finishOnboarding` bildirimi, "Yedeğim var" akışı), `src/app/01-temel.js` yalnızca `HEALTH_NOTE` İngilizcesi için sözlük girişi (sabit Türkçe kalır; gösterimde `t(HEALTH_NOTE)` — kurulumda ve Hakkında'daki kullanım aynı anahtar), `src/markup.html` `#onboard` (`data-t*`), `src/app/23-en-ilerleme-kurulum.js`.
- `obPickLang` dil değiştirince kurulum yeniden çizilir (v46 davranışı korunur) ve açık adım İngilizce görünür.
- Test (bölüm 3): tohumsuz başlatma + `AYK_TEST_EN`; dil "English" seçilir; 7 adım sırayla gezilir (geçerli değerlerle), her adımda `#onboard` görünür metni + `aria-label` + `placeholder` Türkçe harf içermez (dil seçicideki "Türkçe" adı hariç); geçersiz kilo girişinde hata metni İngilizce; bitince örnek içerik seçiliyse kayıttaki öğün başlıkları İngilizce, `settings.lang === "en"`; Türkçe kurulumda aynı akış bugünkü metinleri ve Türkçe örnek içeriği verir.
- Commit: `v50: kurulum İngilizce`.

### Task 4: Denetimler ve sürüm

**Files:** `tests/test_v47_ingilizce.py` (bölüm 4 kapsam), `tests/test_v50_ilerleme_kurulum.py` (bölüm 4), `scripts/kontrol/ortak.py` (`EN_SCREENS`, gerekirse tohumsuz İngilizce kurulum ekranları), `src/markup.html` (`AYK+ v50`), `sw.js` (`aykplus-v50`), `CLAUDE.md`.
- [ ] Statik bekçi: `07`, `14`, `15` `IZIN`'e tam dosya (gerekçeli izin listesi); `09` `KISMI` listesine Task 2 işlevleri; `MK_IZIN`'den `chartModal` ve `onboard` çıkar; `01-temel.js` izinlerinden `HEALTH_NOTE` gerekçesi "gösterimde t(HEALTH_NOTE)" olarak güncellenir; `23` dosyası anahtar/yer tutucu/`{one, other}` denetimine girer.
- [ ] `kontrol`: İngilizce ölçüm ekranları (`tests/shots/v50_en_*.png`): `en-p-genel`, `en-p-kilo`, `en-p-guc`, `en-p-beslenme`, `en-p-grafik`, `en-ob-1` … `en-ob-7` (kurulum, görünür alan çekimi — v49 kuralı). Taşma/44 px/okunurluk temiz; düzeltme CSS ile, Türkçe piksel farkı 0.
- [ ] Sürüm etiketleri; CLAUDE.md (Dil bölümüne v50 satırı: `23-en-ilerleme-kurulum.js`, örnek içerik dile göre, `HEALTH_NOTE` İngilizcesi; dosya listesi; test sayısı 41; İngilizce kontrol ekranı 40; yol haritasına v50).
- [ ] `npm run build` → `npm test` 41/41 → `npm run kontrol -- --hizli` → `bozuk_veri.py`, `html_enjeksiyon.py` (0) → sahip fikstürü 2478/180/69/284, `lang` tr, `dataVer` 5, kurulum yok.
- [ ] Commit: `AYK+ v50: İlerleme, kurulum ve örnek içerik İngilizce (gizli)`.

### Sürüm sonu (denetleyici)
- Tek bağımsız inceleme (en yetenekli model): kod + İngilizce okuma (`tests/shots/v50_en_*.png` + `23-en-ilerleme-kurulum.js`), sözlük uyumu, kayıt kuralları, koç cümlelerinin anlamı. Tek düzeltme turu; kullanıcıya özet ve "gönderelim mi".
