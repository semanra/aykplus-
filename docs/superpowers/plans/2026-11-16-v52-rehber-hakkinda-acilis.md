# v52 — Rehberler, Hakkında, paylaşım, ses, son denetim ve İngilizcenin açılması

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** İngilizcenin son kalan Türkçe parçalarını çevirmek ve İngilizce seçeneğini herkese açmak (`EN_PUBLIC = true`).

**Architecture:** v47–v51 kalıbının devamı: yeni sözlük dosyası `src/app/25-en-rehber.js` (`Object.assign(EN, {…})` + gösterim yardımcıları), kayıtlı değerler Türkçe kalır, yalnız gösterim çevrilir. Ses `t()` + en-GB'ye geçer. Son görev denetim ve açılış.

**Tech Stack:** Vanilla JS PWA, `npm run build`, Playwright (Python) testleri.

**Spec:** `docs/superpowers/specs/2026-11-15-asama3-ingilizce-design.md` (§6 v52 satırı, §5 kuralları)

## Kararlar (denetleyici; kullanıcı inceler)

1. **Mobilite hareket adları:** adın kendisi İngilizce kalır (v39 kullanıcı kararı); Türkçe parantez ("Arm Circles (Kol Çevirme)") İngilizcede gösterilmez ya da anlamı korunarak çevrilir — v51 `exNameL` ile aynı kural, ayrı tablo `MOB_NAME_EN`. Kayıtlı `it.name`, `mobilityLog`, rehber anahtarı DEĞİŞMEZ.
2. **Kütüphaneden İngilizcede eklenen hareketin notu** İngilizce yazılır (yeni kayıt o anki dilde, i18n-kayitli-metinler kuralı). Var olan notlar değişmez. Kullanıcının kendi notu çevrilmez.
3. **Ses:** dil İngilizceyse `u.lang = "en-GB"`, ses `en` ile başlayan; yoksa Türkçe davranış aynen. Türkçede konuşulan cümleler bayt bayt aynı.
4. **Eski kaydın göçünde rutin adı** ("Rutinim", `migrateState` adım 1) dilden bağımsız sabit "Rutinim": göç edilen kayıt v39 öncesi, yani Türkçe dönemden.
5. **İngilizce herkese açılır:** Profil `#pfLang` ve kurulum `#obLang` görünür. Türkçe ekranlarda yalnız bu iki seçici ve sürüm etiketi değişir (bilinçli piksel farkı).

## Global Constraints

- Türkçe ekranlar: dil seçicisi ve sürüm etiketi dışında piksel farkı yok.
- Kayıt (`state`) içine İngilizce metin yalnızca "yeni kayıt o anki dilde" kuralının izin verdiği yerlere yazılır (karar 2); kimlikler, `exKey`, `mobNorm`, `mobilityLog` Türkçe/ham.
- İngilizce değerlerde `&`, `<`, `>` yok; yer tutucular (`{ad}` vb.) Türkçe anahtarla birebir aynı.
- `src/app` içinde `t` adlı yerel bağlama yok.
- Statik bekçi (`tests/test_v47_ingilizce.py` bölüm 4) yeni dosyaları kapsar; bayat izin girişi hata.
- Çeviri anlamlı, kelime kelime değil; terimler `docs/i18n-terimler.md`.
- `sw.js` `CACHE = 'aykplus-v52'`, markup `AYK+ v52`.
- Test dosyası `tests/test_v52_son.py`, port 8810.

## Review Focus

1. Rehberi olan her mobilite hareketinin İngilizce adım sayısı Türkçeyle aynı; eksik İngilizce rehber → Türkçe değil, hiç gösterme değil: test eksik girişte hata verir.
2. Türkçe ses cümleleri değişmedi (Türkçede `mobSay`'e giden metin eski `trFill` çıktısıyla aynı).
3. Eski (v39 öncesi) kayıt İngilizce açıkken yüklenince rutin adı "Rutinim".
4. İngilizce ekranlarda Türkçe harfsiz Türkçe kelime kalmadı ("dk", "sn", "kez", "gun", "Tumu"…).
5. Sahibin kaydı (eski varsayılan fikstür) Türkçede aynı hedefleri verir: 2478 / 180 / 69 / 284.

---

### Task 1: Mobilite rehberleri, kütüphane notları ve hareket adları (ayrı gözden geçirme)

**Files:**
- Create: `src/app/25-en-rehber.js`
- Modify: `src/app/06-mobilite.js` (rehber, ad ve not gösterimleri; `mobAddLib` notu), gerekirse `10-antrenman-arayuzu.js` ısınma kartı ve `07-grafik-ilerleme.js` mobilite adları
- Modify: `tests/test_v47_ingilizce.py` (bekçi kapsamına `25`)
- Test: `tests/test_v52_son.py` (yeni, bölüm 1)

**Interfaces:**
- Produces: `MOB_GUIDE_EN = { "<MOB_GUIDE anahtarı>": { steps: [...], warn: "..." } }` (açılışta `MOB_LIB_V39` eklendikten sonraki BÜTÜN `MOB_GUIDE` anahtarları); `MOB_NOTE_EN = { "<Türkçe kütüphane notu>": "English" }` (`MOBILITY_LIBRARY` + `MOB_LIB_V39` notları); `MOB_NAME_EN = { "<parantezli ad>": "English" }`.
- Produces: `mobGuideL(name) -> {steps, warn} | null` (İngilizcede EN, yoksa Türkçe rehber; Türkçede `mobGuide`), `mobNameL(name) -> string`, `mobNoteL(note) -> string` (yalnız kütüphane notlarını çevirir, bilinmeyen metni aynen döner).

- [ ] **Step 1: Test yaz** — `tests/test_v52_son.py` bölüm 1: (a) her `MOB_GUIDE` anahtarı için `MOB_GUIDE_EN` var, `steps.length` eşit, değerlerde Türkçe harf / `&<>` yok; (b) her kütüphane notu `MOB_NOTE_EN`'de; (c) Türkçe parantezli her mobilite adı `MOB_NAME_EN`'de; (d) İngilizcede hareket detayı `#mobDtGuide` ve seans `#mobTGuide` İngilizce adım gösteriyor, ekle listesinde not İngilizce, ad parantezsiz; (e) İngilizcede kütüphaneden eklenen hareketin `note` alanı İngilizce, `name` ham Türkçe-parantezli ad; (f) Türkçede aynı ekranlar eski metni gösteriyor.
- [ ] **Step 2: Çalıştır, başarısız olduğunu gör** — `python tests/test_v52_son.py` → FAIL.
- [ ] **Step 3: Uygula** — sözlük + yardımcılar `25`'te; `06`'da `mobGuideHtml`, seans rehberi, liste/detay/seans/bitiş/ekle başlıkları ve bildirimlerdeki ad gösterimi `mobNameL`, ekle listesi notu `mobNoteL`, `mobAddLib` İngilizcede `note: mobNoteL(x.m.note)`; ısınma kartı ve İlerleme'deki mobilite adları da `mobNameL`. Arama İngilizcede gösterilen adla da eşleşir.
- [ ] **Step 4: Çalıştır** — `npm run build && python tests/test_v52_son.py && python tests/test_v49_mobilite.py && python tests/test_v47_ingilizce.py` → hepsi geçer.
- [ ] **Step 5: Commit** — `v52: mobilite rehberleri, notlar ve hareket adları İngilizce`.

### Task 2: Hakkında, paylaşım kartı ve İngilizce ses

**Files:**
- Modify: `src/app/08-profil-yedek.js` (`renderAbout`, `PRIVACY_NOTE`, `METHOD_SOURCES`, `LICENSES` gösterimi), `src/app/09-kas-plaka-koc-takviye.js` (paylaşım kartı tuval metinleri ve penceresi), `src/app/06-mobilite.js` (`mobSay` + ses çağrıları), `src/app/25-en-rehber.js` (yeni anahtarlar), `src/markup.html` (Hakkında statik başlıkları `data-t`)
- Test: `tests/test_v52_son.py` bölüm 2

**Interfaces:**
- Consumes: `22-en-mobilite.js` içindeki ses anahtarları (zaten var).

- [ ] **Step 1: Test yaz** — bölüm 2: İngilizcede `#pfAboutHealth`, `#pfAboutPrivacy`, `#pfMethodBody`, `#pfLicList` Türkçe harf içermiyor ve çarpanlar `1.55` biçiminde; Türkçede `#pfMethodBody` metni eski ile aynı (v44 testindeki beklenen parçalar); paylaşım kartı İngilizcede `#chartTitle` "Workout summary", görsel `alt` İngilizce; `mobSay` yakalanınca (sahte `speechSynthesis`) İngilizcede `lang == "en-GB"` ve metin İngilizce ("Start", "Switch to left", "{name} done. Well done."), Türkçede `tr-TR` ve eski cümleler.
- [ ] **Step 2: Çalıştır, başarısız** — FAIL.
- [ ] **Step 3: Uygula** — Hakkında paragrafları `t()` (sayılar yer tutucu, `fmtNum`/dile göre ondalık); paylaşım kartı metinleri `t()` (tarih zaten `fmtDay`); ses: `trFill(` → `t(` ve taraf `mobSideL`, `mobSay` dile göre `lang`/ses seçer. Kaynak ve lisans adları özel ad olarak kalır, yalnız Türkçe açıklama kısmı çevrilir.
- [ ] **Step 4: Çalıştır** — `npm run build && python tests/test_v52_son.py && python tests/test_v44_baslangic.py && python tests/test_v40_isinma_ses.py` → geçer.
- [ ] **Step 5: Commit** — `v52: Hakkında, paylaşım kartı ve sesli yönlendirme İngilizce`.

### Task 3: Son denetim, park edilenler ve İngilizcenin açılması

**Files:**
- Modify: `src/app/16-dil.js` (`EN_PUBLIC = true`), `src/app/01-temel.js` veya göç yeri (karar 4), stepper `aria-label`'ları (park: "Decrease Sets" → "Decrease sets", "(sec)"), `tests/test_v46_dil.py` ve seçicinin gizli olduğunu varsayan testler, `tests/test_v47_ingilizce.py` (izin listelerinin bayat girişleri), `scripts/kontrol/ortak.py` (Türkçe kelime taraması), `src/markup.html` sürüm `AYK+ v52`, `sw.js` `aykplus-v52`, `CLAUDE.md` (§6 dil maddesi, §9 v52), `docs/i18n-kayitli-metinler.md`
- Test: `tests/test_v52_son.py` bölüm 3

- [ ] **Step 1: Test yaz** — bölüm 3: (a) bayraksız açılışta `langAvailable() === true`, `#pfLang` görünür, İngilizce seçince arayüz İngilizce, Türkçeye dönünce Türkçe; (b) bütün `EN_SCREENS` + kurulum ekranlarında görünen metinde Türkçe harf yok ve Türkçe harfsiz Türkçe kelime listesi (`\b(dk|sn|kez|tekrar|gun|Tumu|Kaydet|Geri|Ekle|Sil|Hedef|Bugun)\b`, büyük/küçük harf duyarlı, kullanıcı/örnek besin adları hariç) eşleşmiyor; (c) v39 öncesi kayıt İngilizce ayarla yüklenince rutin adı "Rutinim"; (d) Türkçe eski varsayılan fikstürde hedefler 2478/180/69/284.
- [ ] **Step 2: Çalıştır, başarısız** — FAIL.
- [ ] **Step 3: Uygula** — tarama bulduklarını düzelt; karar 4; aria düzeltmeleri; `EN_PUBLIC = true`; seçicinin gizliliğini sınayan eski test satırlarını "görünür" olarak güncelle (gerekçe yorumu ile); sürüm etiketleri; belgeler.
- [ ] **Step 4: Tam doğrulama** — `npm run build` ("✓ index.html oluşturuldu") → `npm test` (43/43) → `npm run kontrol -- --hizli` (Türkçede yalnız dil seçicisi + sürüm etiketi farkı; ölçüm temiz) → `python scripts/kontrol/bozuk_veri.py` ve `html_enjeksiyon.py` 0 hata.
- [ ] **Step 5: Commit** — `AYK+ v52: İngilizce herkese açık`.
