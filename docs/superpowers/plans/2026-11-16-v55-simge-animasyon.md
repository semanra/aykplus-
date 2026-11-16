# v55 — Yeni simge, açılış (Portal Zoom), başlık (Kinetic Slice), uygulama içi animasyonlar, tema geçişi

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Yeni AYK+ kimliğini (simge + açılış + başlık) uygulamaya taşımak ve hafif, geri alınabilir animasyonlar eklemek.

**Kaynaklar (kullanıcının dosyaları, Masaüstü):** `ayk_a_l_animasyonu_vitrini.html` (Seçenek 2 Kinetic Slice; `getAYKLettersSVG`, `getPlusSVG`, kadran tikleri — ORTAK GEOMETRİ, viewBox 400), `ayk açılış deneme 2.html` (Seçenek 1 Portal Zoom, "+" odaklı, pikselleşmeyen vektör yöntemi), simge önizlemesi `ayk simge onizleme.html`.

## Kararlar (kullanıcı, 16 Kasım 2026)
- Simge: vektörden yeniden çizim, ızgara ve turkuaz/amber noktalar YOK, kenar boşluğu iPhone köşelerine göre; varyant kullanıcı önizlemeden seçecek (Görev 3 o zamana dek bekler).
- Başlık `#brandTag`: Kinetic Slice ile belirir; kayboluşu serbest (öneri: ~1 sn bekleyip hafif bulanıklaşarak/solarak kaybolur), sekme adı kalır.
- Açılış: Portal Zoom, "+" odaklı (~1,45 sn), Gemini teknik kuralları: SVG büyük çizilip küçük ölçekle başlar (1600 px sahne, `scale(0.21)` → `scale(4.2)`), `will-change: transform, opacity`, `geometricPrecision`, en üst katman, veri yüklemesini engellemez, sonunda DOM'dan kalkar.
- Uygulama içi animasyonlar: (1) halkaların dolması (kalori, su, takviye), (2) set tiki "pıt" + satır parlaması, (3) yeni rekorda kısa parıltı, (4) sayıların sayarak değişmesi (kalan kalori/makrolar, tonaj gibi özet sayıları), (7) dinlenme sayacı son 3 sn nabız; + tema geçişi (aydınlık/koyu) için yumuşak geçiş.
- Geri alınabilirlik: Profil → Ayarlar "Animasyonlar" anahtarı (`settings.anim`, varsayılan açık; kapalıyken 1–4, 7 ve tema geçişi çalışmaz; açılış/başlık mevcut `settings.splash` ayarına bağlı kalır). Her animasyon kodda ayrı, `/* v55 ANİM: <ad> */` etiketli blok.

## Global Constraints
- "Hareketi azalt" (`prefers-reduced-motion: reduce`) açıksa hiçbir animasyon oynamaz, son hâl anında görünür.
- Animasyon yalnız `transform`/`opacity`/`clip-path`/stroke ile (GPU dostu); her dokunuşta tam çizim (`renderAll`) süresini artırmaz; sayaç/halka animasyonları önceki değerden yeni değere (ilk açılışta 0'dan), aynı değer tekrar çizilince yeniden oynamaz.
- Testler ve kontrol aracı: `window.AYK_NO_ANIM = true` (TEST_INIT ve `scripts/kontrol/ortak.py` başlangıç betiği) iken JS animasyonları anında son hâle geçer; mevcut CSS kapatıcı korunur. Mevcut 45 test paketi değiştirilmeden geçmeli (gerekirse yalnız TEST_INIT'e bayrak).
- Renkler `--t-*` / `--n-*` değişkenleri; JS'te sabit hex yok (açılış sahnesi istisna: kimlik renkleri `#000`, `#FFF`, `#1FD1C1`).
- Dokunma alanları, okunurluk ve ekran düzeni değişmez; animasyon kapalıyken ekranlar v54 ile piksel piksel aynı (sürüm etiketi + Profil'deki yeni anahtar hariç).
- `src/app` içinde `t` adlı yerel bağlama yok; yeni metinler `t()` + EN girişi; statik bekçi geçer.
- `sw.js` `aykplus-v55`, markup `AYK+ v55`. Test `tests/test_v55_anim.py`, port 8813.

---

### Task 1: Animasyon altyapısı, ayar, uygulama içi animasyonlar ve tema geçişi
**Files:** yeni `src/app/27-animasyon.js` (`animOK()`, sayaç `countTo(el, from, to, fmt)`, halka yardımcıları, PR parıltısı, tema geçişi), `src/markup.html` (CSS blokları + Profil anahtarı `#setAnim`), `01-temel.js` (varsayılan `anim: true`, `normalizeState`; veri biçimi göç gerektirmez), çağrı yerleri `03`, `02` (sayaç hapı, `applyTheme`/`toggleTheme`), `10` (set tiki, PR), `tests/ortak_tohum.py` (TEST_INIT bayrağı), `scripts/kontrol/ortak.py`.
- Tema geçişi: View Transitions API varsa (`document.startViewTransition`) tema düğmesinden dairesel açılış (clip-path circle) ~400 ms; yoksa ~250 ms çapraz solma; tema düğmesindeki güneş/ay simgesi döner.
- [ ] Test (bölüm 1): `animOK()` reduce-motion / `settings.anim=false` / `AYK_NO_ANIM` ile false; ayar Profil'de görünür, 44 px, kayda yazılır; sayaç bitince metin son değere eşit; set tiki sonrası set kaydı aynı; tema değişince `html.light` doğru; sayfa hatası yok.
- [ ] Build → test_v55 + v13, v24, v31, v10, v8, v42 geçer → commit `v55: uygulama içi animasyonlar ve tema geçişi`.

### Task 2: Açılış Portal Zoom ve başlık Kinetic Slice
**Files:** `src/markup.html` (mevcut açılış katmanı yerine yeni SVG sahne + CSS; `#brandTag` yerine/ içinde Kinetic Slice SVG), `02-arayuz.js` veya açılış kodu (bitince katmanı kaldırma), `13-cizim-baslat.js` gerekiyorsa.
- Açılış `settings.splash` kapalıysa / reduce-motion açıksa hiç oynamaz (mevcut `html.no-brand` mantığı korunur); TEST_INIT'in açılışı kaldırma yolu çalışmaya devam eder.
- [ ] Test (bölüm 2): açılış katmanı bitince DOM'dan kalkar (≤ 2 sn), reduce-motion'da hiç görünmez; `#brandTag` SVG'si var ve sonunda gizlenir; sekme başlığı `#tabTitle` görünür kalır.
- [ ] Build → test_v55 + v12 (başlık), v44 (kurulum) geçer → commit `v55: açılış Portal Zoom ve başlık Kinetic Slice`.

### Task 3: Simge (kullanıcı varyantı seçince)
**Files:** `icon.png`, `icon-192.png`, `icon-512.png` (+ gerekirse 1024 mağaza kopyası `icon-1024.png`), üretici `scripts/simge.py` (SVG → PNG, Playwright ile), `manifest.json`, `src/markup.html` (apple-touch-icon), paylaşım kartı `icon.png` kullanır (değişiklik yok).
- [ ] Üret, boyutları ve şeffaflık olmadığını doğrula (iOS simgesi opak) → commit `v55: yeni simge`.

### Task 4: Sürüm ve doğrulama
- [ ] Sürüm etiketleri, CLAUDE.md (§6 açılış/başlık/animasyon maddesi, §9 v55, §3 test sayısı), build → `npm test` (46/46) → `npm run kontrol -- --hizli` (yalnız Profil anahtarı + sürüm etiketi + başlık/simge farkları) → commit `AYK+ v55: yeni simge ve animasyonlar`.
