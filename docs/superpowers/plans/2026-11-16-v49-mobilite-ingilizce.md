# v49 — Mobilite İngilizce Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Kullanıcı kararı (16 Kasım 2026, "B"): Task 1 ayrı gözden geçirmeli; Task 2–4 hızlı yol; sürüm sonunda en yetenekli modelde tek bağımsız inceleme + İngilizce okuma, tek düzeltme turu; göndermeden önce kullanıcıya sorulur. Limit az harcanır: gereksiz okuma/ajan yok.

**Goal:** Mobilite sekmesinin (ana ekran, rutin, düzenle, hareket detayı, hareket ekle, rehberli seans/sayaç ekranı, bitiş özeti) bütün arayüz metinlerini `t()`'ye bağlamak ve İngilizcelerini terim sözlüğüne (bölüm 7) uygun yazmak; v48 ve v45'ten bekleyen küçük işleri kapatmak. Türkçe ekran piksel piksel aynı; İngilizce hâlâ gizli.

**Architecture:** v46–v48 altyapısı. Yeni sözlük dosyası `src/app/22-en-mobilite.js` (`Object.assign(EN, {…})`). Kayıtlı Türkçe değerler (rutin/hareket adları, `MOB_REGIONS`/`MOB_TYPES` anahtarları, `mobNorm`, `mobilityLog`, `mobT.rounds[].side` = "Sağ"/"Sol") değişmez; gösterim yardımcıları `mobRegionL(key)`, `mobTypeL(key)`, `mobSideL(side)` çevirir.

**Spec:** `docs/superpowers/specs/2026-11-15-asama3-ingilizce-design.md` (§6 v49 satırı, §7, §8). Terimler `docs/i18n-terimler.md` bölüm 7 (BAĞLAYICI). Kayıtlı metinler `docs/i18n-kayitli-metinler.md` (BAĞLAYICI).

**Kapsam dışı:** hareket adları (İngilizce, kullanıcı kararı), "nasıl yapılır" adımları `MOB_GUIDE`/`MOB_LIB_V39` metinleri (v52), sesli yönlendirmenin İngilizce sesi (v52), İlerleme'deki mobilite şeridi (v50).

## Global Constraints

- Türkçe seçiliyken hiçbir ekran değişmez: `npm run kontrol -- --hizli` piksel farkı 0 (sürüm etiketi hariç).
- Kayıtta/karşılaştırmada/anahtarda Türkçe metinler kayıtta Türkçe kalır; yalnızca gösterilirken `t()`. "Eski yazım" (`rxOk:false`) kayıtta Türkçe, gösterimde `t()`. Yeni rutin kopyası adı ve yedek adlar dile göre üretilir (kayıtlı-metinler a1/a2: `" (kopya)"` → `" (copy)"`, `"Rutin"` → `"Routine"`, göçteki `"Rutinim"` → `"My routine"`); var olan kayıt değişmez.
- **Sesli yönlendirme (v52'ye kadar):** konuşulan metin her zaman TÜRKÇE kalır (ses `tr-TR`); İngilizcede bile Türkçe ses İngilizce kelime okumaz. Cümleler yine de birleştirmesiz tek anahtar olarak yazılır (`trFill(anahtar, {…})` ile Türkçe doldurulur; v52 `t()` + en-GB sese geçer). Seans başlığı konuşmada Türkçe kaynağından (ör. ısınma için "Isınma") okunur.
- Cümle birleştirme YASAK; sayıya bağlı İngilizce `tn` + `{one, other}` ("1 days ago" olmaz: "yesterday"/"{n} days ago" kalıbı sözlükteki gibi).
- İngilizce metinde etiket dışı `<`, `>`, `&` yok. Sentence case, en-GB. Terimler: Routine, My routine, Session, Move (listede) / exercise (cümlede), Dynamic/Static/Foam rolling, Hips/Shoulders/Spine/Chest/Hamstrings/Ankles, Main area/Secondary area, Sides: One/Both, Each side, Right/Left/Switch to left, Reps/Time, Get ready, Done, Skip/Previous, How to, Last worked, by area, Voice guidance, Old format.
- Kullanıcı verisi (rutin/hareket adları, notlar) çevrilmez, `esc()`.
- `src/app` içinde `t` adlı yerel bağlama yok. Testler `TEST_INIT`; İngilizce `window.AYK_TEST_EN = true` + `state.settings.lang = "en"`; tek test süreci. Yeni test `tests/test_v49_mobilite.py`, port 8807. Dokunma alanı ≥ 44 px; `data-fk` öğelerine dokunulmaz.

## Review Focus

1. Rutin kopyalama/yeni rutin/onarımda adın yanlış dilde ya da çevrilmiş hâliyle kayda yazılması; var olan "Rutinim" adının İngilizcede değişmesi → Task 1 testi.
2. Sayaçta taraf etiketinin ("Sağ"/"Sol") çevrilip `nx.side === "Sol"` karşılaştırmasını bozması → Task 1 testi (İngilizcede iki taraflı harekette tur geçişi "Switch to left" gösterir, konuşma Türkçe "Sola geç").
3. İngilizcede Türkçe sesin İngilizce metin okuması (`mobSay`) → Task 1 testi: `speechSynthesis.speak` taklidiyle İngilizcede konuşulan metinler Türkçe.
4. "N gün önce" / "N hareket" / "N dk" sayı ve çoğul hataları → `tn`; Task 4 statik denetim.
5. İngilizcede dar yerlerde taşma (bölge çipleri, seans üst çubuğu, Başlat çubuğu) → Task 4 İngilizce kontrol ekranları.

---

### Task 1: Bekleyenler, Mobilite terimleri, yardımcılar ve kayıt/ses kuralları (ayrı gözden geçirme)

**Files:** Create `src/app/22-en-mobilite.js`, `tests/test_v49_mobilite.py`. Modify `src/app/06-mobilite.js` (yardımcılar `MOB_REGION_LABEL` yanında; `mobCopyRoutine`, `mobSay` çağrıları), `src/app/01-temel.js` (`"Rutinim"` göç adı, `"Rutin"` yedek adı — dile göre), `src/app/10-antrenman-arayuzu.js` (~756 sürükleme bildirimi `kind === "mob"`), `src/app/21-en-antrenman.js` gerekirse, `docs/i18n-kayitli-metinler.md`.

**Interfaces — Produces:** `mobRegionL(key) -> string`, `mobTypeL(key) -> string` (`MOB_REGION_LABEL`/`MOB_TYPE_LABEL` görünen hâli), `mobSideL(side: "Sağ"|"Sol"|"") -> string`; hepsi Türkçede bugünkü metni aynen verir, `t()`'yi çağrı anında çalıştırır.

- [ ] **Step 1 (bekleyen a1):** Mobilite sürükleme bildirimi (`10` ~756, `kind === "mob"`) Antrenman'ın "Hareket taşındı" anahtarını değil mobiliteye özgü anahtarı kullanır (Türkçe metin aynı kalır; bağlamlı anahtar `t("Hareket taşındı|mobilite")`), EN "Move reordered" (ya da sözlük bölüm 7'ye uygun eşdeğer; gerekçe ledger'a).
- [ ] **Step 2 (bekleyen a2 + ses kuralı):** `mobSay` çağrılarındaki birleştirilmiş cümleler tek anahtarlı kalıplara çevrilir (`"{ad} bitti. Tebrikler."`, `"{taraf} taraf."`, `"Set {n}."`, hareket tanıtım cümlesi vb.) ve `trFill` ile TÜRKÇE doldurulur; seans başlığı konuşmada Türkçe kaynaktan (ses nesnesinde ayrı `sayTitle` alanı ya da eşdeğeri; ısınmada "Isınma"). Bu anahtarların EN girişleri şimdiden yazılır (v52 kullanacak). Türkçede konuşulan metin bayt bayt aynı.
- [ ] **Step 3:** Kayıt adları dile göre: `mobCopyRoutine` `t("{ad} (kopya)", {ad})` biçiminde (Türkçede tam bugünkü metin, `.slice(0, 40)` korunur), `01-temel.js` göç adı "Rutinim" ve onarım yedeği "Rutin" o anki dilde (`curLang()`; göç sırasında dil "tr" ise Türkçe). `docs/i18n-kayitli-metinler.md` ilgili satırlara "v49 yapıldı" notu.
- [ ] **Step 4: Başarısız test** `tests/test_v49_mobilite.py` bölüm 1:
  - Türkçe: `mobRegionL("hip") == "Kalça"`, `mobTypeL("release") == "Foam roller"`, `mobSideL("Sol") == "Sol"`; İngilizce: `"Hips"`, `"Foam rolling"`, `"Left"`.
  - Review Focus 1: İngilizcede fikstür rutini kopyalanınca yeni ad `<ad> (copy)`; kayıttaki eski rutin adı değişmedi; Türkçede kopya adı `<ad> (kopya)`.
  - Review Focus 2–3: `speechSynthesis.speak` taklit edilir (`window.__said = []`), ses ayarı açık; İngilizcede iki taraflı süreli bir hareketle seans başlatılır, sayaç zamanı ilerletilerek (`mobT.endAt` geri alınıp `mobTimerTick()`) tur geçişi yapılır → ekranda "Switch to left", `__said` içinde "Sola geç" ve hiçbir konuşulan metin İngilizce kelime ("Start", "left", "Done") içermez; seans bitince konuşulan son metin `"… bitti. Tebrikler."` Türkçe.
  - Bekleyen a1: İngilizcede `endMealDrag` mobilite yolu sonrası bildirim EN mobilite metni; Türkçede "Hareket taşındı".
- [ ] **Step 5:** Çalıştır → FAIL. **Step 6:** Uygula (yardımcılar + 22 dosyası: bölgeler, türler, taraflar, Step 1–3 anahtarları). **Step 7:** `npm run build` → `python tests/test_v49_mobilite.py`, `test_v48_antrenman.py`, `test_v47_ingilizce.py`, `test_v46_dil.py`, `test_v39_mobilite.py`, `test_v40_isinma_ses.py` PASS.
- [ ] **Step 8: Commit** `v49: bekleyenler, Mobilite terimleri, kayıt ve ses kuralları`.

### Task 2: Mobilite ekranları (ana ekran, rutin, düzenle, detay, ekle)

**Files:** `src/app/06-mobilite.js` (seans/sayaç işlevleri HARİÇ: Task 3), `src/app/22-en-mobilite.js`.
- Kapsam: `mobSummary`, `mobCardHtml`, `mobRoutineHtml`, `mobEdit`, `mobRenameRoutine`, `mobRemoveItem`, `mobCopyRoutine` bildirimi, `mobDeleteRoutine` onayı, `renderMobility`, `mobToggle`, `mobReset`, `mobWeekStats` / `mobRegionLast` / `mobAgoText` / `mobLastDone` görünen metinleri (`tn`), `mobRoutineCardHtml`, `mobHomeHtml`, `mobNewRoutine`, `mobPreviewHtml`, `mobDetailHtml` (bölge/tür/taraf yardımcılarla; "Eski yazım" → `t()`), `mobRename`, `mobRemove`, `mobAddHtml`, `mobRenderAddList`, `mobAddLib`/`mobAddCustom` bildirim ve onayları, `mobGuideHtml` başlık/etiketleri ("How to", "Watch out"; adım metinleri v52 — dokunma), `mobWarmupHide` bildirimi.
- Test (bölüm 2): İngilizcede ana ekran, rutin içi, Düzenle, hareket detayı (eski yazımlı bir hareket dahil), hareket ekle (arama sonuçlu) açılır; `#mobRoot` görünür metninde fikstür kullanıcı verisi + kütüphane hareket adları + `MOB_GUIDE` adım metinleri ayıklandıktan sonra Türkçe harf yok; Türkçe `mobHomeHtml()` değişmedi.
- Commit: `v49: Mobilite ekranları İngilizce`.

### Task 3: Rehberli seans ve sayaç ekranı

**Files:** `src/app/06-mobilite.js` (`mobFmt`, `mobTimer*`, `mobSes*`, `mobBreathLabel`, `mobRoundLabel`, `mobSesFinHtml`, `mobTimerRender`, `mobTimerUpdate`, `mobTimerVoice`, `mobWarmupStart` görünen metinleri), `src/markup.html` `#mobTimer` (`data-t*`), `src/app/22-en-mobilite.js`.
- Görünen metin `t()`, konuşulan metin Task 1 kuralıyla Türkçe. Taraf gösterimi `mobSideL`.
- Test (bölüm 3): İngilizcede seans üç evrede (hazırlık, iş, taraf değişimi) ve bitiş özeti ekranında `#mobTimer` görünür metni + `aria-label` Türkçe harf içermez (hareket adları hariç); tekrarlı harekette "Done" düğmesi; Türkçede aynı akış eski metinleri verir.
- Commit: `v49: rehberli seans ekranı İngilizce`.

### Task 4: Denetimler, v45 artıkları ve sürüm

**Files:** `tests/test_v47_ingilizce.py` (bölüm 4 kapsam), `tests/test_v49_mobilite.py` (bölüm 4), `scripts/kontrol/ortak.py` + `kontrol.py`, `src/app/04-besinler-barkod.js` ve `11-mutfak-akilli.js` (`.n-seg`), `src/markup.html` (`AYK+ v49`), `sw.js` (`aykplus-v49`), `CLAUDE.md`.
- [ ] **Bekleyen b1:** `.n-seg` içindeki seçim düğmelerine `aria-pressed="true|false"` (04 ~63 "Nereye eklensin?", 11 ~585 takvim aralığı, varsa diğer `.n-seg` grupları); görünüm değişmez. Test: iki grupta seçili düğme `aria-pressed="true"`, diğeri `"false"`.
- [ ] **Bekleyen b2:** kontrol aracı `ob-*` (kurulum) ekranlarında `full_page=True` çekiminin ürettiği artefaktı incele (`#onboard` sabit konumlu katman; tam sayfa çekimde kayma/boşluk); düzeltme: `ob-*` için `full_page=False` (görünür alan) ya da `#onboard` öğesinin kendi ekran görüntüsü — ölçüm (`AUDIT_JS` `#onboard`) aynı kalır. Raporda önce/sonra.
- [ ] Statik bekçi: `KISMI["06-mobilite.js"]` kaldırılır, `06` `IZIN`'e tam dosya (gerekçeli izin: `MOB_WARM_REGIONS` anahtarları, `"Sağ"/"Sol"` çalışma anı değerleri, `mobSay` Türkçe ses kalıpları (`trFill`), `"Eski yazım"` kayıt değeri vb.); `MK_IZIN`'den `mobTimer` çıkar; `22` dosyası anahtar/yer tutucu/`{one, other}` denetimine girer.
- [ ] `kontrol`: İngilizce Mobilite ölçüm ekranları (`tests/shots/v49_en_m_*.png`): `en-m-ana`, `en-m-rutin`, `en-m-duzenle`, `en-m-detay`, `en-m-ekle`, `en-m-seans` (iş evresi), `en-m-bitis`. Taşma/44 px/okunurluk temiz; düzeltme CSS ile, Türkçe piksel farkı 0.
- [ ] Sürüm etiketleri; CLAUDE.md (Dil bölümüne v49 satırı: `22-en-mobilite.js`, yardımcılar, ses kuralı; dosya listesi; test sayısı 40; İngilizce kontrol ekranı 28; yol haritasına v49).
- [ ] `npm run build` → `npm test` 40/40 → `npm run kontrol -- --hizli` → `bozuk_veri.py`, `html_enjeksiyon.py` (0) → sahip fikstürü 2478/180/69/284, `lang` tr, `dataVer` 5, kurulum yok.
- [ ] Commit: `AYK+ v49: Mobilite İngilizce (gizli)`.

### Sürüm sonu (denetleyici)
- Tek bağımsız inceleme (en yetenekli model): kod + İngilizce okuma (`tests/shots/v49_en_m_*.png` + `22-en-mobilite.js`), sözlük uyumu, kayıt/ses kuralları. Tek düzeltme turu, kısa yeniden kontrol; kullanıcıya özet (bekleyenlerin her biri dahil) ve "gönderelim mi" (yerel spec commit'i 59de3d2 de aynı gönderimle gider).
