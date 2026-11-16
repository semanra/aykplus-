# v51 — Besin Adları İngilizce Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Karma yöntem B: Task 1 ayrı gözden geçirmeli; Task 2–4 hızlı; sonda en yetenekli modelde tek bağımsız inceleme + İngilizce okuma, tek düzeltme turu; göndermeden önce kullanıcıya sorulur. Limit az harcanır.

**Goal:** İngilizcede besin adları, porsiyon adları, besin kategorileri ve besin notları İngilizce görünür; İngilizcede arama İngilizce adlarla da çalışır; 124 Türk yemeği tarifinin adı İngilizcede de Türkçe kalır (kullanıcı kararı); hareket kütüphanesi adlarındaki Türkçe parantezler İngilizcede gösterilmez. Türkçe kullanıcı için hiçbir şey değişmez (ne ekran ne `foods.js`).

**Architecture:** İngilizce besin verisi ayrı bir dosyada: `foods-en.js` (depo kökü, `build_foods.py` üretir), yalnızca dil İngilizceyken yüklenir (Türkçe kullanıcıya ek yük yok). `foods.js` bayt bayt aynı kalır. Uygulamada gösterim yardımcıları besin nesnesini değiştirmez; kayıt (`customFoods`, `foodSnap`, menüler) Türkçe/kimlik tabanlı kalır.

**Spec:** `docs/superpowers/specs/2026-11-15-asama3-ingilizce-design.md` (§6 v51 satırı, §7, §8). Terimler `docs/i18n-terimler.md`; kayıtlı metinler `docs/i18n-kayitli-metinler.md` (BAĞLAYICI).

## Kararlar (denetleyici; kullanıcı inceler)

1. **USDA besinlerinin İngilizce adı = USDA'nın kendi açıklaması** (`desc`, SR Legacy; ör. "Beef, ground, 70% lean meat / 30% fat, raw"). Kaynağın kendi İngilizcesi olduğu için anlam birebir; İngilizce besin uygulamaları (ör. Cronometer) aynı biçimi gösterir. Yalnızca biçim temizliği: baştaki/sondaki boşluk, çift virgül; kelimelere dokunulmaz. Porsiyon adları da USDA'nın kendi etiketleri ("1 cup, chopped"); "cup" için uyarı Türkçedeki gibi değil, olduğu gibi (İngilizce kullanıcı ABD ölçüsünü tanır).
2. **Türk yemekleri (`r_…`, 124 tarif) adı her dilde Türkçe** (kullanıcı kararı). Tarif porsiyon adları ve notları (`t`) İngilizceye çevrilir (sözlük).
3. **Uygulamanın kendi listesi (`BASE_FOOD_DB`, `src/data.js`)**: genel besinler İngilizce adla ("Oats"); Türkiye'ye özgü ürünler (beyaz peynir, kaşar, ayran, kefir değil — kefir İngilizcede de kefir, simit, lavaş, tulum, pastırma, sucuk vb.) tarif kararıyla tutarlı olarak **Türkçe adıyla**, gerekiyorsa kısa İngilizce açıklama parantezde ("Beyaz peynir (white cheese)"). Birim kelimeleri (adet, dilim, porsiyon…) zaten `unitL` ile çevriliyor.
4. Kullanıcının kendi eklediği besinler, kombolar, tarifler (özel) çevrilmez.

## Global Constraints

- Türkçe seçiliyken hiçbir ekran değişmez (`npm run kontrol -- --hizli` piksel farkı 0, sürüm etiketi hariç); `foods.js` bayt bayt aynı (`git diff --quiet foods.js`); Türkçede `foods-en.js` yüklenmez (ağ isteği yok).
- Besin kimlikleri (`u<fdcId>`, `r_…`, `BASE_FOOD_DB` anahtarları) değişmez. Kayda (`customFoods`, `foodSnap.n`, menü kalemleri, arşiv) İngilizce ad yazılmaz. Arama anahtarı (`normSearch`, "tr") değişmez; İngilizce adlar aramaya ek giriş olarak katılır.
- `foods-en.js` yüklenemezse (çevrimdışı ilk açılış vb.) İngilizcede Türkçe adlar görünür, hata yok.
- `sw.js` `FILES` listesine `foods-en.js` eklenir (çevrimdışı).
- Cümle birleştirme YASAK; `tn`; İngilizce metinde etiket dışı `<`, `>`, `&` yok (besin adları veri: `esc()` ile basılır, bu kural sözlük değerleri için). `src/app` içinde `t` adlı yerel bağlama yok. Testler `TEST_INIT`; İngilizce `window.AYK_TEST_EN = true` + `state.settings.lang = "en"`. Yeni test `tests/test_v51_besin_adlari.py`, port 8809. Tek test süreci.
- USDA verisi depoya girmez: indirme ve ara çıktı `build/usda/` (git dışı) içinde.

## Review Focus

1. İngilizce adın kayda sızması (menüye besin ekleme, kombo/tarif kaydetme, `foodSnap` yenileme, özel besin düzenleme İngilizceyken) → Task 2 testi: İngilizcede besin ekleyip kombo/tarif kaydet → kayıtta ad/`foodSnap.n` Türkçe.
2. `foods-en.js` sırası/porsiyon dizini `foods.js` ile kayarsa yanlış porsiyon adı + gramı → Task 1 testi: her kimlik için porsiyon sayısı eşit, rastgele 20 besinde etiket gramı USDA kaynağıyla tutarlı.
3. Dil İngilizceye geçince (`setLang('en')`) dosya yüklenmeden çizim olur, sonra hiç yenilenmez → Task 1 testi: yükleme bitince `renderAll()`.
4. İngilizce aramada Türkçe adla da bulabilme (Türk yemekleri Türkçe kaldığı için şart) ve İngilizce adla bulabilme; yazım hatası taraması bozulmaz → Task 2 testi.
5. Hareket adı gösteriminde parantez kaldırılınca geçmiş/anahtar bozulması → Task 3 testi (kayıt ve `exKey` değişmez).

---

### Task 1: İngilizce besin verisi üretimi ve yükleyici (ayrı gözden geçirme)

**Files:** Modify `scripts/usda/build_foods.py` (ikinci çıktı `foods-en.js`), `scripts/usda/README.md`; Create `foods-en.js` (üretilmiş), `tests/test_v51_besin_adlari.py`, `src/app/24-en-besin.js` (yükleyici + yardımcılar + tarif notu/porsiyon sözlüğü); Modify `sw.js` (`FILES`), `src/app/16-dil.js` (`setLang` → yükleyici), `src/app/13-cizim-baslat.js` (açılışta İngilizceyse yükle).
- `foods-en.js` biçimi: `const USDA_EN = { "<id>": ["<en ad>", ["<porsiyon 1>", …]] , … };` — porsiyonlar `foods.js` `o` dizisiyle **aynı sırada ve sayıda** (Türkçe çeviriden önceki USDA etiketi); tarifler (`r_…`) dosyada yok. Üretim `build_foods.py` içinde Türkçe porsiyon etiketinin üretildiği yerden aynı kaynakla (sıra garantisi).
- **Interfaces — Produces:** `foodNameL(f) -> string` (EN + `USDA_EN[id]` varsa İngilizce, yoksa `f.name`; `BASE_FOOD_DB` için Task 3'ün `BASE_EN` sözlüğü; `_lost` besinlerde "⚠ " öneki korunur), `portionL(f, i, label) -> string`, `loadFoodsEn() -> Promise<boolean>` (bir kez yükler, bitince `invalidateFoodDB()` + `renderAll()`; hata → false, sessiz).
- [ ] **Step 1:** USDA SR Legacy zip'ini `build/usda/`'ya indir/aç, `extract.py` → `build/usda/out`, `build_foods.py` → `foods.js` (bayt bayt aynı olmalı; değilse dur ve raporla) + `foods-en.js`.
- [ ] **Step 2: Başarısız test** bölüm 1: `foods-en.js` dosyasında her USDA kimliği `foods.js`'te var ve porsiyon sayısı eşit; 3 bilinen besin (ör. `u168652` kıyma → "Beef, ground, 70% lean meat / 30% fat, raw" ya da kaynaktaki tam metin) doğru; Türkçe açılışta `foods-en.js` isteği yapılmaz (Playwright `request` dinleyicisi); İngilizce açılışta yüklenir ve `foodNameL(getFoodDB()["u168652"])` İngilizce; `setLang('en')` sonrası Besinler listesi İngilizce adlarla yeniden çizilir; `foods-en.js` isteği engellenince (route abort) İngilizcede Türkçe adlar, sayfa hatası yok; `foods.js` bayt bayt değişmedi (`git diff --quiet foods.js` testte ya da adım notunda).
- [ ] **Step 3:** Çalıştır → FAIL. **Step 4:** Uygula. **Step 5:** `npm run build` → test_v51 bölüm 1, `test_v18*` (varsa besin veritabanı testi), `test_v25_sw.py`, `test_v47_ingilizce.py`, `test_v46_dil.py` PASS.
- [ ] **Step 6: Commit** `v51: İngilizce besin verisi (ayrı dosya) ve yükleyici`.

### Task 2: Besin adlarını gösterim yerlerinde İngilizce + İngilizce arama

**Files:** `src/app/03-beslenme.js`, `04-besinler-barkod.js`, `11-mutfak-akilli.js`, `12-besin-veritabani.js`, `05-secici-hareket.js` (besin seçici), `09` (takviye değil; yalnız besin geçen yerler), `src/app/24-en-besin.js`.
- Besin adı basılan HER yer `foodNameL(f)` (Bugün/Menülerim öğün kalemleri, Besinler listesi + seçili kart + hazır porsiyonlar `portionL`, öneriler, ikame penceresi, kombo/tarif malzeme listeleri, alışveriş listesi, Geçmiş/arşiv öğün içerikleri, bulunamayan besin uyarısı, seçiciler). Özel besinler (`custom_…`) ve tarif adları (`r_…`) olduğu gibi.
- Arama: İngilizcede `searchFoods` her besinin arama girişine İngilizce adı da ekler (Türkçe ad ve eş anlamlılar kalır; `_sEntry` önbelleği dil değişince sıfırlanır). Sıralama kuralları aynı.
- Test (bölüm 2): Review Focus 1 (İngilizcede ekle → kombo kaydet → tarif malzemesi ekle → kayıtta `foodSnap[id].n` ve kombo kalemleri Türkçe/kimlik); Review Focus 4 ("ground beef" ve "kıyma" İngilizcede aynı besini bulur; "karnıyarık" tarif bulunur; yazım hatalı "chiken breast" bir sonuç döner); İngilizcede Bugün/Menülerim/Besinler/Geçmiş ve ikame/alışveriş pencerelerinde fikstür besin adları İngilizce (tarif/özel/Türk ürünü hariç); Türkçede çıktı aynı.
- Commit: `v51: besin adları ve arama İngilizce`.

### Task 3: Kendi besin listesi, kategoriler, notlar ve hareket adları

**Files:** `src/app/24-en-besin.js` (`BASE_EN` sözlüğü: `BASE_FOOD_DB` kimliği → İngilizce ad, karar 3'e göre), besin kategorileri (`foods.js` `c` değerleri ve `BASE_FOOD_DB` `cat`; gösterimde `t()`; kategori Türkçe anahtar kalır), `f.kx` kalori istisnası cümleleri ve tarif notları (`t` alanı; sabit kalıplar sözlükte), `src/app/04-besinler-barkod.js` / `11` (izin listesindeki "Diğer", `f.kx` cümlesi), `src/app/10-antrenman-arayuzu.js` + `05` (hareket adı gösterimi `exNameL(name)`: İngilizcede kütüphane adındaki Türkçe parantez — ör. "(Barfiks)", "(Geniş Tutuş)" — kaldırılır ya da İngilizce karşılığıyla değişir, kayıt ve `exKey` değişmez; kullanıcının kendi yazdığı adlara dokunulmaz: yalnızca `EXERCISE_LIBRARY` adları), `docs/i18n-terimler.md` (karar 3 satırı + kategori adları).
- Test (bölüm 3): İngilizcede `BASE_FOOD_DB`'den 5 besin (genel + Türk ürünü) beklenen adla; bütün kategori başlıkları Türkçe harfsiz; bir `kx` besininde not İngilizce; kütüphanede Türkçe parantezli bir hareketin İngilizce gösteriminde Türkçe harf yok, `exerciseHistory` anahtarı ve programdaki `ex.name` değişmedi; Türkçede hepsi aynı.
- Commit: `v51: kendi besin listesi, kategoriler, notlar ve hareket adları İngilizce`.

### Task 4: Denetimler ve sürüm

**Files:** `tests/test_v47_ingilizce.py` (bölüm 4: 04/11 izinlerinden "Diğer", `f.kx` girdileri kalkar/gerekçe güncellenir; `24` dosyası anahtar denetimine), `tests/test_v51_besin_adlari.py` (bölüm 4), `scripts/kontrol/ortak.py` (İngilizce besin ekranları `en-n-besin-ara` (arama sonuçlu), `en-n-besin-kart` (seçili USDA besini + porsiyonlar), `en-n-menu` zaten var — yeniden ölçülür), `src/markup.html` (`AYK+ v51`), `sw.js` (`aykplus-v51`), `CLAUDE.md` (besin veritabanı bölümüne `foods-en.js`, yardımcılar, kararlar 1–4; test sayısı 42; yol haritası v51).
- `npm run build` → `npm test` 42/42 → `npm run kontrol -- --hizli` (Türkçe yalnız sürüm etiketi; İngilizce ölçüm temiz; uzun USDA adları taşma yapmamalı — gerekirse CSS satır kırma, Türkçe piksel 0) → `bozuk_veri.py`, `html_enjeksiyon.py` (0) → sahip fikstürü 2478/180/69/284, `lang` tr, `dataVer` 5; `git diff --quiet main -- foods.js`.
- Commit: `AYK+ v51: besin adları İngilizce (gizli)`.

### Sürüm sonu (denetleyici)
- Tek bağımsız inceleme (en yetenekli model): kod + İngilizce okuma (ekran görüntüleri, `BASE_EN`, kategori/not sözlüğü, `foods-en.js`'ten rastgele örnek), kayıt güvenliği. Tek düzeltme turu; kullanıcıya özet (kararlar 1–4 açıkça) ve "gönderelim mi".
