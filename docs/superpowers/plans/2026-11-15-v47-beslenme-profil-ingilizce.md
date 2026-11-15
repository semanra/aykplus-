# v47 — Beslenme, Profil ve Ortak Metinler İngilizce Implementation Plan

> **For agentic workers:** Task 1 subagent-driven (ayrı gözden geçirme); Task 2–5 hızlı yol (görev başına gözden geçirme yok, sürüm sonunda tek bağımsız inceleme + İngilizce okuma). Kullanıcı kararı, 15 Kasım 2026.

**Goal:** Ortak metinler (bildirim, pencere, depolama/yedek uyarıları, üst panel), Beslenme (4 alt ekran + pencereleri) ve Profil'in bütün arayüz metinlerini `t()`'ye bağlamak ve İngilizcelerini terim sözlüğüne uygun yazmak; Türkçe ekran piksel piksel aynı kalır; İngilizce hâlâ gizli.

**Architecture:** v46 altyapısı (`src/app/16-dil.js`). Sözlük bölgelere ayrılır: `17-sozluk-en.js` (var, ortak/sekmeler), yeni `18-en-ortak.js`, `19-en-beslenme.js`, `20-en-profil.js` — her biri `Object.assign(EN, { … })`. JS içindeki Türkçe metin gösterildiği yerde `t("…")` / `tn(n, "…")`; `src/markup.html` statik metni `data-t` (öğenin tüm metni), `data-t-aria`, `data-t-ph`; karışık içerikli öğede metin `<span data-t>` içine alınır.

**Spec:** `docs/superpowers/specs/2026-11-15-asama3-ingilizce-design.md` (§5.1, §5.4, §5.5, §6 v47, §7, §8). Terimler: `docs/i18n-terimler.md` (BAĞLAYICI). Dokunulmayacak metinler: `docs/i18n-kayitli-metinler.md` (BAĞLAYICI).

## Global Constraints

- Türkçe seçiliyken hiçbir ekran değişmez: `npm run kontrol -- --hizli` piksel farkı 0 (sürüm etiketi hariç).
- Kayıtta tutulan / karşılaştırılan / anahtar olan Türkçe metinler (`docs/i18n-kayitli-metinler.md`) kayıtta Türkçe kalır; yalnızca gösterilirken `t()`.
- Cümle birleştirme YASAK: değişkenli cümle tek anahtar, `{ad}` yer tutucu (`t("{n} kcal kaldı", {n})`); Türkçe ek yapıştırma (`ad + "'ı"`) yer tutuculu cümleye çevrilir. Çoğul gereken İngilizce `tn` + `{one, other}`.
- İngilizce metin terim sözlüğündeki karşılığı kullanır; sözlükte olmayan yeni kavram çıkarsa sözlüğe satır eklenir (gerekçeli). Sentence case; en-GB yazımı (sözlük kuralları).
- Anahtarda HTML etiketi varsa İngilizcesi aynı etiketleri aynı sırada taşır; İngilizce metinde etiket dışı `<`, `>`, `&` yok.
- Kullanıcı verisi (besin/öğün/takviye/program adları) çevrilmez ve `esc()` ile kalır. Besin veritabanı adları, tarifler, Hakkında/sağlık notu v49'a kalır.
- `src/app` içinde `t` adlı yerel bağlama yok (Task 1 sonrası test yasaklar).
- Testler `TEST_INIT`; İngilizce `window.AYK_TEST_EN = true` + `state.settings.lang = "en"`. Tek seferde tek test süreci.

## Review Focus

1. Kayıtta tutulan bir metnin (öğün varsayılan adı, takviye `timeLabel`, `m.balanced`) yanlışlıkla çevrilip kayda İngilizce yazılması → Task 5 testi: İngilizcede yeni öğün/takviye ekle, kayıttaki varsayılan ad Türkçe kurala uygun mu (`docs/i18n-kayitli-metinler.md` neyi söylüyorsa).
2. Değişkenli cümlenin İngilizcede kelime sırası/çoğul hatası ("1 meals") → `tn` kullanımı; Task 5 statik denetim: `{n}` içeren ve sayıya bağlı anahtarların EN girişi `{one, other}`.
3. `data-fk` odak koruması olan girişlerin etiketleri değişince klavyenin kapanması → yalnızca metin değişir, öğe kimlikleri/özniteliklerine dokunulmaz; kontrol pikseli ve mevcut testler.
4. İngilizce ekranda taşma (uzun "Rebalance my day" vb.) → Task 5'te İngilizce kontrol ekranları (taşma/44 px ölçümü).
5. Gözden kaçan sarılmamış Türkçe metin → Task 5 statik tarama: kapsamdaki dosyalarda `t(`/`tn(` dışında Türkçe harfli metin kalmadı (izin listesi: veri sabitleri, veri katmanı, yorumlar).

---

### Task 1: Yerel `t` adlarını kaldır, testi sıkılaştır (adım adım; ayrı gözden geçirme)

**Files:** Modify `src/app/*.js` (yerel `t` bağlamaları, ~55), `tests/test_v46_dil.py` (M2 bekçisi).

- [ ] **Step 1:** Bekçiyi sıkılaştır: `src/app/*.js` içinde `t` adlı HER bağlama (const/let/var t, işlev parametresi `t`, `t =>`, `(t, …) =>`, `function(t)`, yapı bozma `{ t }`/`[t]`) test başarısızlığı. Yorum ve metin içleri sayılmaz. Çalıştır → bugünkü kodda FAIL (~55 yer listelenir).
- [ ] **Step 2:** Her yerel `t`'yi anlamına uygun adla değiştir (`getTargets()` sonucu `tg`, öğe `el`/`titleEl`, ok parametresi `x`/`tm` vb.); davranış aynı.
- [ ] **Step 3:** `npm run build` → `python tests/test_v46_dil.py` PASS → `npm test` 37/37 → `npm run kontrol -- --hizli` piksel farkı 0.
- [ ] **Step 4:** CLAUDE.md "Dil (v46)" kuralını "test her `t` bağlamasını yasaklar" olarak güncelle. Commit: `v47: yerel t adları kaldırıldı, test her t bağlamasını yasaklar`.

### Task 2: Ortak metinler

**Files:** `src/app/00-depolama.js`, `01-temel.js`, `02-arayuz.js`, `13-cizim-baslat.js`, `src/markup.html` (üst panel, yedek bandı, bildirimler, dinlenme sayacı hapı, ortak pencere iskeleti `uiDialog` düğmeleri), yeni `src/app/18-en-ortak.js`.
- Kapsam: bildirimler (`toast`, `offerUndo` metinleri), `uiAsk/uiAlert/askConfirm/sayAlert/askText` ile gelen başlık/mesaj/düğme metinleri bu dosyalarda yazılanlar, depolama/kurtarma/salt-okunur uyarıları, gün dönümü onayı, yedek hatırlatma bandı, sekme başlığı.
- Test (`tests/test_v47_ingilizce.py`, port 8805, bölüm 1): İngilizcede yedek bandı ve bir `uiAsk` penceresi (ör. `void askConfirm(...)` çağıran gerçek bir akış) Türkçe harf içermez; Türkçede metinler eskisiyle aynı.
- Commit: `v47: ortak metinler İngilizce`.

### Task 3: Beslenme

**Files:** `src/app/03-beslenme.js`, `04-besinler-barkod.js`, `11-mutfak-akilli.js`, `12-besin-veritabani.js` (yalnızca arayüz metinleri), `src/markup.html` (Beslenme sekmesi 722–909, özel besin, barkod, dışarıda yedim, tarif, alışveriş pencereleri), yeni `src/app/19-en-beslenme.js`.
- Besin adları/kategori adları veri (v49); `SUPP_PRESETS` adları kullanıcı listesine kopyalanıyorsa kayıtlı-metinler belgesine göre davran.
- Kayıtlı `.date` gösterimi: Beslenme'de `l.date` basılan her yer `l.ts ? fmtDate(l.ts) : l.date` (Türkçe bayt bayt aynı olmalı; değilse dokunma ve raporla).
- Test (bölüm 2): İngilizcede Bugün / Menülerim / Besinler / Geçmiş ve özel besin + barkod + dışarıda yedim + tarif + alışveriş pencereleri açılır; kullanıcı verisi dışında Türkçe harf yok (fikstür verisindeki adlar `[data-user]` gibi işaret yoksa metin karşılaştırmasıyla hariç tutulur: fikstürdeki besin/öğün/takviye adları listesi çıkarılır).
- Commit: `v47: Beslenme İngilizce`.

### Task 4: Profil

**Files:** `src/app/08-profil-yedek.js` (Hakkında `renderAbout` HARİÇ — v49), `src/markup.html` Profil sayfası, yeni `src/app/20-en-profil.js`.
- Test (bölüm 3): İngilizcede Profil üst/orta/alt (Hakkında hariç) ve Yedekleme bölümü Türkçe harf içermez; otomatik kayıt bildirimi İngilizce; Türkçede aynı.
- Commit: `v47: Profil İngilizce`.

### Task 5: Denetimler ve sürüm

**Files:** `tests/test_v47_ingilizce.py` (bölüm 4), `src/app/16-dil.js` (M7), `scripts/kontrol/ortak.py` (İngilizce ekranlar), `src/markup.html` (`AYK+ v47`), `sw.js` (`aykplus-v47`), `CLAUDE.md`.
- [ ] Statik denetim: kapsamdaki dosyalarda (00–04, 08, 11–13, markup'ın Beslenme/Profil/ortak bölümleri) `t(`/`tn(`/`data-t` dışında Türkçe harfli metin yok (izin listesi gerekçeli, test içinde); kapsamdaki her `t("…")` anahtarının EN girişi var; `{yer tutucu}` ve HTML etiket kümeleri EN = TR; sayıya bağlı `{n}` anahtarları `{one, other}`.
- [ ] Review Focus 1 testi (kayıtta varsayılan adlar).
- [ ] M7: `applyStaticI18n` düğüm listesini önbelleğe alır (yalnızca İngilizcede ve dil değişince yeniden tarar); Türkçede hiç çalışmaz.
- [ ] `kontrol`: İngilizce Beslenme 4 ekran + Profil 3 ekran ölçüm (taşma, 44 px, okunurluk) — piksel karşılaştırması yok (yeni ekran).
- [ ] Sürüm etiketleri, CLAUDE.md (v47 satırı, sözlük dosyaları, test sayısı 38), `npm run build` → `npm test` 38/38 → `npm run kontrol -- --hizli` (Türkçe yalnızca sürüm etiketi) → `bozuk_veri.py`, `html_enjeksiyon.py` → sahibin fikstürü 2478/180/69/284, `lang` tr.
- [ ] Commit: `AYK+ v47: Beslenme, Profil ve ortak metinler İngilizce (gizli)`.

### Sürüm sonu (denetleyici)
- Tek bağımsız inceleme (en yetenekli model): kod + İngilizce okuma (İngilizce ekran görüntüleri `tests/shots/` + sözlük dosyaları), terim sözlüğüne uygunluk, anlam. Bulgular tek düzeltme turunda.
