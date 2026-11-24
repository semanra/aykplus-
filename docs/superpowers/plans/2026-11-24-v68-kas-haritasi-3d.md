# v68 3D Kas Haritası Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gemini Pro'nun 3D görünümlü renk anahtarlı vücut görselini paylaşım kartında, Antrenman "KAS YÜKÜ" haritasında ve bitiş özetinde kullanmak; 4 yeni kas grubu eklemek; iki küçük animasyon.

**Architecture:** Üretim betiği iki hafif dosya çıkarır (paletli etiket PNG + gri ışık WebP). Yeni `src/app/32-kas-harita.js` bunları bir kez okur ve tema/yoğunluk/seçime göre canvas'a boyar (sonuç önbellekli). Paylaşım kartı, Antrenman ve bitiş özeti bu tek çiziciyi çağırır; eski `kas-harita.png`, `BODY_POLYS` ve `anatomy*.jpg/webp` kullanımı kalkar.

**Tech Stack:** Vanilla JS (derleme `npm run build`), Canvas 2D, Python + Pillow + numpy + scipy (görsel üretimi), Python Playwright testleri.

**Spec:** `docs/superpowers/specs/2026-11-24-kas-haritasi-3d-design.md`

## Global Constraints

- `ayk_plus_v5_state` ve `DATA_VER` (7) değişmez; yeni kayıt alanı yok; `ex.muscle` / `sess.muscle` Türkçe kayıt adı.
- `MUSCLES` = `["Göğüs","Sırt","Omuz","Ön Bacak","Arka Bacak & Kalça","Kalf","Biceps","Triceps","Karın","Ön Kol","Boyun","İç Bacak","Kaval"]` (yeniler SONDA).
- `MINOR_MUSCLES` = `["Ön Kol","Boyun","İç Bacak","Kaval"]`: listelerde yalnız set > 0 ise, yorum/10–20 bandı yok.
- EN: Ön Kol → Forearms, Boyun → Neck, İç Bacak → Adductors, Kaval → Tibialis. Arayüz metni `t()`/`tn()` + sözlük (`21-en-antrenman.js`); v47 bekçisi geçmeli.
- Etiket indeksi = `MUSCLES.indexOf(ad) + 2`; 0 zemin, 1 gövde.
- Canvas'ta `ctx.filter` YASAK (iOS); ışıma `shadowBlur` ile.
- Animasyon `animOK()` korumalı, `/* v68 ANİM: … */` etiketli; kapalıyken son hâl.
- Dokunma ≥ 44 px; Tailwind sınıfları sabit metin; renkler `--t-*`/`--w-*` (harita canvas'ı hariç, o `MAP_THEMES`'ten).
- Yeni görseller `sw.js` `FILES` içinde ve kalıcı görsel önbelleği dalından hariç.
- Yeni test `tests/test_v68_kas3d.py`, PORT = 8825, her `new_context` `locale` verir, `service_workers="block"`, `from ortak_tohum import TEST_INIT`.
- Ücretli işlem/yeni görsel üretimi yok; push yalnız kullanıcı onayıyla.

## Review Focus

1. Harita görselleri henüz yüklenmeden (async) Antrenman çizilir ve kullanıcı dokunur → hata yok, yüklenince harita kendiliğinden görünür (Task 5 testi 5e).
2. Antrenman açıkken tema değişir (koyu ↔ aydınlık) → harita yeni temayla yeniden boyanır, eski önbellek kullanılmaz (Task 5 testi 5f).
3. Antrenman'da her `renderAll` yeni canvas üretip iPhone belleğini doldurur → aynı anahtar için aynı sonuç yeniden kullanılır (Task 3 testi 3e).
4. `state.libMuscle` eski/bozuk değer veya küçük kas + 0 set → hata yok, seçim kartı "henüz çalışılmadı" (Task 5 testi 5g).
5. Harita görseli 404 (çevrimdışı ilk açılış) → paylaşım kartı, Antrenman ve bitiş özeti haritasız ama hatasız (Task 4 testi 4c, Task 5 testi 5h, Task 6 testi 6c).

---

### Task 1: Üretim betiği ve harita dosyaları

**Files:**
- Create: `scripts/gorsel/kas_3d.py`, `img/kas-3d-etiket.png`, `img/kas-3d-isik.webp`, `tasarimlar/_paylasim/3d/etiket-kontrol-uretim.png`
- Add to git: `tasarimlar/_paylasim/3d/kaynak-3d-gemini-tam.jpg`, `tasarimlar/_harita3d_v2.py`, `tasarimlar/paylasim-3d-tur3.png`, `tasarimlar/paylasim-3d-setler3.png`
- Test: `tests/test_v68_kas3d.py` (bölüm 1)

**Interfaces:**
- Produces: `img/kas-3d-etiket.png` (mode "P", indeks 0–14), `img/kas-3d-isik.webp` (gri, aynı boyut, ışık 0…1,15 → 0…255), genişlik 900.

- [ ] **Step 1: Test bölüm 1'i yaz** (sayfa açmadan, Pillow):
  - `1a` iki dosya var, aynı boyut, genişlik 900.
  - `1b` etiket görselinde yalnız 0–14 indeksleri; 2–14 her biri ≥ 1500 piksel (Boyun/Kaval küçük).
  - `1c` her kas etiketinde 150 pikselden küçük bağlı parça yok (`scipy.ndimage.label`).
  - `1d` toplam boyut < 160 KB.
  - `1e` sabit noktalar: göğüs bölgesinde (ön figürün üst gövde ortası) çoğunluk etiket = `MUSCLES.index("Göğüs")+2`. (Koordinatı betiğin kontrol görselinden okuyup sabitle.)
- [ ] **Step 2: Çalıştır** `python tests/test_v68_kas3d.py` → Expected: `FAIL 1a` (dosyalar yok).
- [ ] **Step 3: `scripts/gorsel/kas_3d.py`'yi yaz**: etiketleme `tasarimlar/_harita3d_v2.py`'nin üst kısmıyla aynı (ton + konum kuralları, renkli piksellerde ModeFilter 9, kenara bağlı olmayan koyu alan gövde); ek: her kas etiketinin < 150 px bağlı parçası, parçanın 1 px genişletilmiş çevresindeki en çok görülen ≥1 etikete atanır; betiğin `names` sırası `MUSCLES` sırasına çevrilir (indeks = `MUSCLES.index+2`); figür sınırına +20 px kırp, 900 px'e `NEAREST` (etiket) / `LANCZOS` (ışık) ölçekle; ışık `clip(SHADE/1.15)*255` WebP kalite 82. Kontrol görseli yazar.
- [ ] **Step 4: Çalıştır** `python scripts/gorsel/kas_3d.py && python tests/test_v68_kas3d.py` → Expected: bölüm 1 hepsi `ok`. Kontrol görselini büyük boyda aç ve incele (her kas doğru yerde, minik nokta yok).
- [ ] **Step 5: Commit** `v68: 3D kas haritası üretim betiği ve görselleri`.

### Task 2: Yeni kas grupları

**Files:**
- Modify: `src/app/09-kas-plaka-koc-takviye.js:5-45`, `src/markup.html:1214-1225` (`#exMuscle`), `src/app/21-en-antrenman.js:4-8`
- Test: `tests/test_v68_kas3d.py` (bölüm 2)

**Interfaces:**
- Produces: `MUSCLES` (13), `MINOR_MUSCLES` (4), `LIB_MUSCLE_OVERRIDE` (exKey → kas), güncel `autoMuscle(name)`.

- [ ] **Step 1: Test bölüm 2'yi yaz** (`ctx("tr-TR")`):
  - `2a` `MUSCLES` tam olarak Global Constraints'teki dizi; `MINOR_MUSCLES` 4 öğe.
  - `2b` `autoMuscle`: "Wrist Curl (Bilek)"→Ön Kol, "Reverse Wrist Curl (Bilek)"→Ön Kol, "Reverse Barbell / Cable Curl (Ön Kol)"→Ön Kol, "Hip Adduction Machine (İç Bacak)"→İç Bacak, "Tibialis Raise"→Kaval, "Neck Curl"→Boyun, "Seated Calf Raise"→Kalf, "Hammer Curl (Dumbbell)"→Biceps, "Hip Abduction Machine (Dış Bacak / Yan Kalça)"→Arka Bacak & Kalça, "Copenhagen Plank"→İç Bacak, "Farmer Walk"→Ön Kol.
  - `2c` eski kayıt: geçmişte `{name:"Tibialis Raise", muscle:"Kalf"}` oturumu → `weeklyMuscleSets` Kalf'a sayar; `aykStoredState()` içindeki `muscle` hâlâ "Kalf".
  - `2d` `#exMuscle` seçeneklerinde 4 yeni değer; İngilizcede metinleri Forearms/Neck/Adductors/Tibialis.
- [ ] **Step 2: Çalıştır** → Expected: `FAIL 2a`.
- [ ] **Step 3: Uygula**: `MUSCLES` sonuna 4 grup, `MINOR_MUSCLES`; `LIB_MUSCLE_MAP` kurulduktan sonra `LIB_MUSCLE_OVERRIDE` ile 5 kütüphane adı üzerine yazılır; `MUSCLE_RULES` başına Kaval `/tibialis|kaval/`, İç Bacak `/adduct|iç bacak|copenhagen/`, Ön Kol `/wrist|bilek|forearm|farmer|ön kol|reverse (barbell |cable |ez-bar )?curl/`, Boyun `/neck|boyun/`; Kalf kuralından `tibialis`, Biceps kuralından `ön kol`, Arka Bacak kuralından `adduct` çıkar. Sözlüğe 4 ad.
- [ ] **Step 4: Çalıştır** bölüm 2 + `python tests/test_v47_ingilizce.py` + `python tests/test_v48_antrenman.py` → Expected: hepsi ok.
- [ ] **Step 5: Commit** `v68: yeni kas grupları (Ön Kol, Boyun, İç Bacak, Kaval)`.

### Task 3: Çizici `32-kas-harita.js`

**Files:**
- Create: `src/app/32-kas-harita.js`
- Test: `tests/test_v68_kas3d.py` (bölüm 3)

**Interfaces:**
- Consumes: Task 1 dosyaları, Task 2 `MUSCLES`.
- Produces:
  - `loadMuscleMap(): Promise<{w, h, lab: Uint8Array, shade: Float32Array} | null>` (tek sefer, hata → null; null sonucu da önbellekler ama sonraki çağrıda bir kez yeniden dener).
  - `muscleLevel(sets: number, scale: "session"|"week"): number` → session `clamp((n−1)/7)`, week `clamp((n−1)/19)`; n ≤ 0 → −1 (çalışılmadı).
  - `MAP_THEMES = {dark, light, clear}` (renkler spec §6.2'den birebir).
  - `paintMuscleMap3d(muscles: {[ad]: sets}, opts: {theme, scale, selected?, levels?}): Promise<HTMLCanvasElement|null>`; `opts.levels` (ad → 0…1) verilirse animasyon için seviye doğrudan kullanılır. Önbellek: son 4 anahtar (`JSON` kaslar + tema + ölçek + seçim), aynı anahtar aynı canvas nesnesini döndürür.
  - `muscleAt(map, x, y, r): string|null` (görsel koordinatı).
  - `muscleMapRatio = h / w` (yüklendikten sonra; yüklenmeden önce 1213/900 varsayılan).

- [ ] **Step 1: Test bölüm 3'ü yaz** (pg.evaluate ile `await paintMuscleMap3d(...)` sonucu canvas'tan `getImageData`; kas piksellerini `loadMuscleMap().lab` ile seç):
  - `3a` dark, `{Göğüs:8}`: göğüs ortalama rengi G ve B > 180, R < 90; Sırt (çalışılmadı) ortalaması gri (|R−G| < 12, değer < 120).
  - `3b` `{Göğüs:1}` göğüs parlaklığı (R+G+B) < `{Göğüs:8}` parlaklığının %75'i, ama G > R + 40 (yine turkuaz).
  - `3c` light: figür dış kenarının hemen dışındaki piksel (zemin indeksi 0, 3 px içinde gövde) alfa > 0 ve değer < 170 (kontur); zemin uzağı alfa 0.
  - `3d` `muscleLevel(1,"session")==0`, `(8,"session")==1`, `(20,"week")==1`, `(0,"week")==-1`; `muscleAt` göğüs merkezinde "Göğüs", zeminde r=0 → null, r=60 → en yakın kas.
  - `3e` aynı argümanlarla iki çağrı `===` aynı canvas; tema farklı → farklı canvas.
  - `3f` seçim: `selected:"Göğüs"` dark'ta göğüs kenarında beyaza yakın piksel var (≥ 230), light'ta koyu (≤ 40).
- [ ] **Step 2: Çalıştır** → Expected: `FAIL 3a` (`paintMuscleMap3d is not defined`).
- [ ] **Step 3: Uygula**: piksel formülü spec §6.2 birebir; ışıma: çalışan kas maskesini (kas başına alfa `0,35+0,65×seviye`, renk tema ışıma rengi) ayrı canvas'a çiz, ana canvas'a `shadowBlur = h/60`, `shadowColor` ışıma rengi, gölge kaydırma ile figürün arkasına; light'ta önce kontur (silüeti 8 yöne 4 px kaydırarak kontur rengiyle) ve `shadowBlur` siyah %22 gölge; seçim konturu kenar pikselleri (4-komşudan biri farklı etiket) 3 px. Yayınlanan `index.html`'e `build` ile girer (dosya adı sırası 32).
- [ ] **Step 4: Çalıştır** `npm run build && python tests/test_v68_kas3d.py` → Expected: bölüm 1–3 ok. `tests/shots/v68_harita_{dark,light,clear}.png` kaydet ve büyük boyda incele (önizleme `paylasim-3d-tur3.png` ile aynı görünüm).
- [ ] **Step 5: Commit** `v68: 3D kas haritası çizicisi`.

### Task 4: Paylaşım kartına geçiş

**Files:**
- Modify: `src/app/31-paylasim.js:396-470` (eski harita kodu silinir, çağrılar), `sw.js:3,38`
- Delete: `img/kas-harita.png`, `scripts/gorsel/kas_harita.py`, `tasarimlar/_harita3d.py`
- Test: `tests/test_v68_kas3d.py` (bölüm 4), `tests/test_v67_paylasim.py` (bölüm 1, 3, 7 güncellenir)

**Interfaces:**
- Consumes: `paintMuscleMap3d(data.muscles, {theme: opts.theme | "clear", scale: "session"})`.

- [ ] **Step 1: Test bölüm 4'ü yaz ve v67 testini güncelle**:
  - `4a` `buildShareCanvas` (map şablonu, dark/light/sticker): harita kutusunda turkuaz piksel var; `MAP_KEYS`, `paintMuscleMap`, `loadMuscleLabels` tanımsız.
  - `4b` `sw.js` FILES içinde `./img/kas-3d-etiket.png` ve `./img/kas-3d-isik.webp`, `kas-harita.png` yok; görsel önbellek dalı ikisini hariç tutar.
  - `4c` `route("**/kas-3d-*", 404)` → kart üretilir, sayfa hatası yok.
  - v67: bölüm 1 (eski PNG denetimi) → yeni dosya varlığına; bölüm 3 (`paintMuscleMap`) → `paintMuscleMap3d`; bölüm 7 404 yolu `kas-3d-*`.
- [ ] **Step 2: Çalıştır** `npm run build && python tests/test_v68_kas3d.py` → Expected: `FAIL 4a`.
- [ ] **Step 3: Uygula**: harita kutusu oranı `muscleMapRatio`; düzen taşma ölçümü v67 testleriyle aynı kalmalı.
- [ ] **Step 4: Çalıştır** v68 + v67 + `python tests/test_v25_sw.py` → Expected: hepsi ok; `tests/shots/v67_*` görüntülerini büyük boyda incele.
- [ ] **Step 5: Commit** `v68: paylaşım kartında 3D kas haritası`.

### Task 5: Antrenman "KAS YÜKÜ" haritası ve listeler

**Files:**
- Modify: `src/app/10-antrenman-arayuzu.js:436-590` (`BODY_POLYS`, `heatColor` silinir; `gymLibraryHtml`), `src/app/07-grafik-ilerleme.js:440-446`, `src/markup.html:92-95` (anatomy-light CSS silinir), `sw.js:3`, `src/app/21-en-antrenman.js`
- Delete: `anatomy-light.webp`, `scripts/anatomy_light.py` (`anatomy.jpg` repoda KALIR, yüklenmez)
- Test: `tests/test_v68_kas3d.py` (bölüm 5); güncellenir: `test_v11_profil_program.py`, `test_v12_baslik_foto.py`, `test_v31_tema.py`, `test_v47_ingilizce.py`, `test_v48_antrenman.py`, `test_v61_erisim.py`, `test_v63_gorsel.py`, `scripts/kontrol/ortak.py`

**Interfaces:**
- Consumes: `paintMuscleMap3d(counts, {theme: themeIsLight() ? "light" : "dark", scale: range === "today" ? "session" : "week", selected: state.libMuscle})`, `muscleAt`, `MINOR_MUSCLES`.
- Produces: `#bodyMapCv` (canvas), `[data-muscle-btn]` sr-only düğmeler (13), `drawBodyMap()` (canvas'ı boyar; `renderGym` sonunda kütüphane görünümündeyse çağrılır), `bodyMapTap(ev)`.

- [ ] **Step 1: Test bölüm 5'i yaz**:
  - `5a` Kütüphane açılır: `#bodyMapCv` var, `img[src="anatomy.jpg"]` yok; ağ isteklerinde `anatomy` yok (aydınlıkta da).
  - `5b` canvas'ta göğüs merkezine (testte `loadMuscleMap` ile hesaplanan merkez → CSS koordinatı) tıklama → `state.libMuscle == "Göğüs"`; Boyun merkezinin 15 CSS px yanına (gövde) tıklama → "Boyun".
  - `5c` 13 `[data-muscle-btn]`, her biri `aria-label` kas adı, seçili olan `aria-pressed="true"`.
  - `5d` Bu hafta: Boyun 0 sette satır yok; Boyun 3 set (geçmiş tohumu) → satır var, metninde "az|ideal|yok" yok, "3" var; Göğüs 0 sette satır var ("yok"). İlerleme kas listesinde aynı kural.
  - `5e` `loadMuscleMap` geciktirilmiş (route 600 ms) → kütüphane açılır, hemen canvas'a tıklama hata vermez, 1 sn sonra canvas boyalı (turkuaz/gri piksel var).
  - `5f` Kütüphane açıkken `setTheme('light')` → canvas piksellerinde gövde açık gri (değer > 180).
  - `5g` `state.libMuscle = "Kaval"` (0 set) → seçim kartında "henüz çalışılmadı"; `state.libMuscle = "xyz"` → hata yok.
  - `5h` 404 → kütüphane hatasız, canvas yerine kısa metin yok ama arama/listeler çalışır.
  - `5i` "Bugün" görünümünde bugün set yapılan kas satırı (44 px) var ve tıklayınca seçer.
  - `5j` lejant: Bu hafta "0 · 1–9 · 10–20 · 20+ set", Bugün "0 · 1–3 · 4–7 · 8+ set" (renk kutuları `MAP_THEMES` aktif temadan, seviye 0 / 0,5 / 1).
- [ ] **Step 2: Çalıştır** → Expected: `FAIL 5a`.
- [ ] **Step 3: Uygula**: canvas CSS boyutu `width:min(100%,340px)`, oran `muscleMapRatio`; boyama asenkron, sonuç geldiğinde canvas hâlâ DOM'daysa çizer; dokunmada `r` = 22 CSS px × (görsel genişliği / CSS genişliği); ÖN/ARKA yazıları korunur; küçük kas satırları `MINOR_MUSCLES` kuralıyla (07 ve 10). Eski testlerdeki `BODY_POLYS`/`polygon`/`anatomy` varsayımları yeni seçicilere çevrilir; `ortak.py` kütüphane ekranları aynı kalır (yalnız beklenen fark).
- [ ] **Step 4: Çalıştır** `npm run build && npm test` → Expected: bütün paketler geçer. `tests/shots` kütüphane görüntülerini (koyu + aydınlık) büyük boyda incele.
- [ ] **Step 5: Commit** `v68: Antrenman kas yükü haritası 3D; küçük kaslar listede yalnız çalışıldıysa`.

### Task 6: Bitiş özetinde harita + kasların sırayla yanması

**Files:**
- Modify: `src/app/10-antrenman-arayuzu.js:638-676` (`openFinishSummary`), `src/app/27-animasyon.js` (`animFinishMap`)
- Test: `tests/test_v68_kas3d.py` (bölüm 6), `tests/test_v57_anim2.py` (gerekirse)

**Interfaces:**
- Consumes: `shareData(log).muscles` (31), `paintMuscleMap3d(..., {levels})`, `muscleLevel`.
- Produces: `#finMap` (canvas, yükseklik 180 CSS px, ortada), `animFinishMap(muscles)`.

- [ ] **Step 1: Test bölüm 6'yı yaz**:
  - `6a` ağırlık setli antrenman bitince `#finMap` var ve turkuaz piksel içerir (`AYK_NO_ANIM`, son hâl).
  - `6b` yalnız kardiyo kaydı → `#finMap` yok.
  - `6c` 404 → özet açılır, `#finMap` yok, sayfa hatası yok.
  - `6d` animasyon açık (`AYK_NO_ANIM` yok, `settings.anim` true): 300 ms'de en çok setli kas yanmış, en az setli henüz boşta rengine yakın; 2 sn sonra hepsi son hâl (son hâl `6a` ile aynı piksel ortalaması ±5).
- [ ] **Step 2: Çalıştır** → Expected: `FAIL 6a`.
- [ ] **Step 3: Uygula**: harita istatistik kutularının altında; tema pencereye göre (`themeIsLight()`); animasyon: kaslar set çok → az, 160 ms ara, her biri 350 ms'de seviye −1 → hedef (ara karelerde `levels` ile yeniden boya, `requestAnimationFrame`; toplam ≤ 1,5 sn), `/* v68 ANİM */`.
- [ ] **Step 4: Çalıştır** v68 + `python tests/test_v57_anim2.py` → Expected: ok.
- [ ] **Step 5: Commit** `v68: bitiş özetinde kas haritası ve yanma animasyonu`.

### Task 7: Paylaşım penceresi animasyonu

**Files:**
- Modify: `src/app/27-animasyon.js`, `src/markup.html` (CSS `@keyframes`), `src/app/31-paylasim.js` (`openShareCard`, `setShareTpl`)
- Test: `tests/test_v68_kas3d.py` (bölüm 7)

**Interfaces:**
- Produces: `animShareIn()`, `animSharePr(el)`; sınıflar `ayk-share-in`, `ayk-pr-shine`.

- [ ] **Step 1: Test bölüm 7'yi yaz**: animasyon açıkken `openShareCard` sonrası `#shareBody` `ayk-share-in` alır ve 400 ms içinde kaldırır; rekor şablonu ilk gösterimde önizleme kutusuna `ayk-pr-shine` eklenir, ikinci gösterimde eklenmez; `AYK_NO_ANIM` iken hiçbiri eklenmez; paylaşılan canvas piksel aynı (animasyonlu ve animasyonsuz `toDataURL` eşit).
- [ ] **Step 2: Çalıştır** → Expected: `FAIL`.
- [ ] **Step 3: Uygula**: giriş 0,96 → 1 ölçek + saydamlık 220 ms; parıltı önizleme kutusunun üstünde CSS gradyan şerit ~700 ms; `/* v68 ANİM */`.
- [ ] **Step 4: Çalıştır** v68 + v67 → Expected: ok.
- [ ] **Step 5: Commit** `v68: paylaşım penceresi açılış ve rekor parıltısı`.

### Task 8: Sürüm ve tam doğrulama

**Files:**
- Modify: `src/markup.html` (`AYK+ v68`), `sw.js` (`aykplus-v68`), `docs/SURUM-GECMISI.md`, `CLAUDE.md` (§2 dosya listesi: `32-kas-harita`, `img/kas-3d-*`, `kas_3d.py`; anatomy satırları; §7 vücut haritası; §9 son durum), `tests/run_all.py` (yeni paket listedeyse), bellek el notu.

- [ ] **Step 1:** Sürüm etiketleri ve belgeler (sürüm notunda: otomatik kas tahmini değişti, örn. Hip Adduction geçmişi artık İç Bacak).
- [ ] **Step 2: Çalıştır** `npm run build` (Expected "✓ index.html oluşturuldu") → `npm test` → `npm run test:webkit` → `npm run kontrol -- --hizli` → `python scripts/kontrol/bozuk_veri.py` → `python scripts/kontrol/html_enjeksiyon.py`. Expected: hepsi geçer; kontrol farkları yalnız harita ekranları (paylaşım, kütüphane, bitiş özeti); bozuk veri 0.
- [ ] **Step 3:** `build/kontrol/fark/` ve harita görüntülerini büyük boyda incele (≤ 2 görüntü/bakış).
- [ ] **Step 4: Commit** `AYK+ v68: 3D kas haritası`. Push YOK (kullanıcı onayı beklenir).
