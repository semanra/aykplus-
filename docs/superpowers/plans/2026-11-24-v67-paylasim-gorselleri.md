# v67 Paylaşım Görselleri — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Antrenman bitince/Geçmiş'ten Strava benzeri paylaşım ekranı: 5 şablon (kas haritası, rekor, fotoğraf üstü, şeffaf çıkartma, hareket listesi), hikâye/gönderi, koyu/aydınlık, istatistik aç/kapa, ay sırası satırı.

**Architecture:** Görseller Canvas 2D ile telefonda çizilir (bugünkü `buildShareCanvas` yöntemi). Kas haritası tek bir etiket görselinden (`img/kas-harita.png`, her kas grubu ayrı anahtar renk) çalışma anında boyanır. Bütün paylaşım kodu yeni `src/app/31-paylasim.js`'e taşınır; veri hazırlığı (saf işlevler), boyama, çizim ve pencere ayrı katmanlar.

**Tech Stack:** Vanilla JS, Canvas 2D, Web Share API, Clipboard API, Tailwind (derlemede), Python + Playwright testleri, Pillow (görsel betiği).

**Spec:** `docs/superpowers/specs/2026-11-24-paylasim-gorselleri-design.md` (görsel referans: `tasarimlar/_uret_paylasim.py` → `A3_*`, `tasarimlar/paylasim-A3.png`)

## Global Constraints

- Kişisel bilgi (kilo, hedef kilo, ölçü, yaş, boy, yağ oranı, ad, profil fotoğrafı) HİÇBİR şablonda çizilmez.
- Seçilen fotoğraf state / IndexedDB / localStorage / önbellek / yedeğe ASLA girmez; pencere kapanınca bırakılır.
- Renkler: koyu zemin `#000`, vurgu `#1FD1C1`; aydınlık zemin `#F4F4F5`, vurgu `#0E7C72`; başlık/sayı yazı tipi AYKDisplay (eğik 800).
- Boyutlar: hikâye 1080×1920, gönderi 1080×1350.
- Bütün arayüz ve tuval metni `t()` / `tn()`; İngilizce karşılık `src/app/25-en-rehber.js` (paylaşım kartı sözlüğü orada); kas adı `muscleL`; kilo `wRaw`/`wUnit`/`fmtWNum`.
- Dokunma alanı ≥ 44 px; pencere `.tm` teması ve `--w-*` değişkenleri; Tailwind sınıfları sabit metin.
- `state.settings.share` dışında hiçbir kayıt değişmez; `DATA_VER` artmaz.
- Testler `ortak_tohum.TEST_INIT`, `locale` açık, `color_scheme="dark"`, koşul bekle (sabit bekleme yok); WebKit paketi de geçmeli.
- Sürüm `AYK+ v67`, `sw.js` `aykplus-v67`.

## Review Focus

1. Eski antrenman (süre 0, `logId` eşleşmesi yok) Geçmiş'ten paylaşılınca → çökme yok, harita gri, liste şablonu yok, Süre çipi pasif. (Task 2 + Task 5 testleri)
2. Çok uzun gün adı / hareket adı (40+ karakter, emoji) → taşma yok, "…" ile kısalır. (Task 4 testi)
3. Yalnız kardiyo antrenmanı → panelde Kardiyo, kas haritası gri, rekor şablonu yok. (Task 2 + Task 4)
4. Paylaşım desteklenmeyen tarayıcı / Kopyala desteklenmeyen tarayıcı → indirme yedeği, Kopyala gizli; hata penceresi yok. (Task 5)
5. Fotoğraf seçilip pencere kapatılıp yeniden açılınca → eski fotoğraf yok, state/IndexedDB'de görsel verisi yok. (Task 5)

---

### Task 1: Kas haritası etiket görseli

**Files:**
- Create: `scripts/gorsel/kas_harita.py` (bugünkü `tasarimlar/_harita_isle.py` `labels()` mantığı)
- Create: `img/kas-harita.png`
- Modify: `sw.js` (`FILES`'a `'./img/kas-harita.png'`), `scripts/gorsel/README.md` (kısa bölüm)
- Test: `tests/test_v67_paylasim.py` (bölüm 1; dosya bu görevde oluşturulur, port 8824)

**Interfaces:**
- Produces: `img/kas-harita.png` — RGB, genişlik 900 px, yalnız şu 11 renk (en yakın-renk ataması, kenar yumuşatma YOK, yeniden boyutlandırma `NEAREST`):
  `#000000` boşluk · `#808080` gövde · `#FF0000` Göğüs · `#FFFF00` Omuz · `#0000FF` Biceps · `#FF00FF` Triceps · `#FF8000` Karın · `#00FF00` Ön Bacak · `#00FFFF` Sırt · `#8000FF` Arka Bacak & Kalça · `#804000` Kalf. Kaynak `tasarimlar/_paylasim/kaynak-gemini.jpg`, içeriğe göre %3 boşlukla kırpılır.

- [ ] **Step 1: Test yaz** — `tests/test_v67_paylasim.py` iskeleti (test_v66 başlığı gibi; `PORT = 8824`) + bölüm 1 (Python tarafı, sayfa açmadan): Pillow ile `img/kas-harita.png` aç; `assert set(renkler) ⊆ 11 anahtar renk`; her kas rengi ≥ 5000 piksel; genişlik 900; dosya < 150 KB; `sw.js` metninde `./img/kas-harita.png`.
- [ ] **Step 2: Çalıştır, FAIL gör** — `python tests/test_v67_paylasim.py` → "FAIL kas-harita.png yok".
- [ ] **Step 3: `kas_harita.py`** — `python scripts/gorsel/kas_harita.py` → `img/kas-harita.png` (palet modlu PNG `P`, `optimize=True`). `sw.js` FILES'a ekle.
- [ ] **Step 4: Çalıştır, PASS.**
- [ ] **Step 5: Commit** — `git add scripts/gorsel/kas_harita.py scripts/gorsel/README.md img/kas-harita.png sw.js tests/test_v67_paylasim.py && git commit -m "v67: kas haritası etiket görseli"`

### Task 2: Paylaşım verisi (saf işlevler)

**Files:**
- Create: `src/app/31-paylasim.js` (eski `09`'daki `shareFile`, `logExerciseLines`, `fitText`, `roundRect`, `buildShareCanvas`, `openShareCard`, `shareWorkoutCard` bu dosyaya TAŞINIR; `09`'dan silinir; içerik bu görevde değişmez)
- Test: `tests/test_v67_paylasim.py` (bölüm 2)

**Interfaces:**
- Produces:
  - `shareData(log) -> { day: string, dateTxt: string, stats: Stat[], muscles: {[MUSCLES adı]: number}, rows: Row[], prs: Pr[], monthNo: number, monthTxt: string }`
  - `Stat = { key: "dur"|"vol"|"sets"|"prs"|"cardio", label: string, value: string, has: boolean }` — sıra hep dur, vol, sets, prs, cardio; `has` false: dur `durationMin` ≤ 0, prs `log.prs` 0, cardio `cardioMin` ≤ 0.
  - `Row = { name: string, txt: string, pr: boolean }` (`logExerciseLines` + `pr`)
  - `Pr = { name, kg, reps, e1rm, prev, pct }` — yıldızlı oturumlar, `pct` azalan sıralı; `log.prs === 0` ise `[]` ve hiçbir `Row.pr` true değil.
  - Rekor kuralı: ağırlık oturumunun en iyi `e1rm`'i, aynı `exKey` için `ts < log.ts` olan bütün oturumların en iyisinden büyük (önceki oturum yoksa rekor DEĞİL).
  - `monthNo` = aynı takvim ayında `ts ≤ log.ts` olan `state.workoutLogs` sayısı; `monthTxt` TR `"{ay} ayının {n}. antrenmanı"`, EN `"{n}{th} workout of {month}"` (1st, 2nd, 3rd, 11th–13th th).
  - `muscles`: `sess.logId === log.id`, kardiyo hariç, grup `sess.muscle` (MUSCLES'ta ise) yoksa `autoMuscle(sess.name)`; değer = set sayısı.

- [ ] **Step 1: Test yaz** (sayfada `pg.evaluate` ile tohum log + `exerciseHistory`):
  - `test_veri_temel`: 3 hareket (Bench 4 set Göğüs, Lateral 4 set Omuz, Pushdown 3 set Triceps) → `muscles == {Göğüs:4, Omuz:4, Triceps:3}`, `stats[1].value == "12.450 kg"` (volume 12450), `rows.length == 3`.
  - `test_rekor`: Bench önceki oturum 80×8, bu oturum 85×8, `log.prs = 1` → `prs[0].name == "Bench Press"`, `rows[0].pr`; `log.prs = 0` → hiç `pr`.
  - `test_eski_kayit`: `{ dayName:'Eski', ts, volume: 500, sets: 5 }` (id yok, durationMin yok) → `muscles` boş, `rows == []`, `stats[0].has == false`.
  - `test_ay_sirasi`: aynı ayda 3 log, ortadakinin `monthNo == 2`; `monthTxt` TR "Kasım ayının 2. antrenmanı"; EN `setLang('en')` → "2nd workout of November", 11 → "11th", 21 → "21st".
  - `test_kardiyo`: yalnız kardiyo oturumu → `muscles` boş, `stats[4].has` true, `prs == []`.
- [ ] **Step 2: FAIL gör** (`shareData is not defined`).
- [ ] **Step 3: `31-paylasim.js` oluştur, taşıma + `shareData` ve yardımcıları.** Taşıma sonrası `npm run build` "✓ index.html oluşturuldu".
- [ ] **Step 4: PASS + eski paylaşım testleri hâlâ geçer:** `python tests/run_all.py v67_ v52_ v53_ v12_ v8_`.
- [ ] **Step 5: Commit** — `"v67: paylaşım verisi (kas setleri, rekorlar, ay sırası); kart kodu 31-paylasim.js'e taşındı"`

### Task 3: Kas haritası boyama

**Files:** Modify `src/app/31-paylasim.js` · Test `tests/test_v67_paylasim.py` (bölüm 3)

**Interfaces:**
- Consumes: `img/kas-harita.png` (Task 1), `shareData().muscles` (Task 2)
- Produces:
  - `loadMuscleLabels() -> Promise<{ w: number, h: number, lab: Uint8Array }>` — bir kez yükler (önbellekli); `lab` değerleri 0 boşluk, 1 gövde, 2+ `MUSCLES` sırasıyla eşlenmiş grup (anahtar renk → ad tablosu `MAP_KEYS`).
  - `paintMuscleMap(muscles, pal) -> Promise<HTMLCanvasElement>` — `pal`: `"dark"` (gövde `rgb(40,40,45)`, boş kas `rgb(64,64,72)`, çalışan koyu `rgb(24,140,130)` → parlak `#1FD1C1`) · `"light"` (gövde `rgb(212,212,216)`, boş kas `rgb(186,186,194)`, çalışan `rgb(70,160,150)` → `#0E7C72`) · `"clear"` (gövde beyaz α 70, boş kas beyaz α 120, çalışan `#1FD1C1` α 200 → 255). Yoğunluk `0.55 + 0.45 × set / enÇok` doğrusal karışım. Boşluk piksel α 0. Tam boy boyanır; çağıran küçültürken `imageSmoothingQuality = "high"`.
  - Görsel yüklenemezse: Promise `null` döner, çizim haritasız devam eder (hata penceresi yok).

- [ ] **Step 1: Test yaz** — `paintMuscleMap({Göğüs: 7, Omuz: 9}, "dark")`: göğüs bölgesinden bir pikselin (etiketten seçilen ilk Göğüs pikseli) G kanalı > 120 ve R < 60; bir Sırt pikseli `(64,64,72)`; boşluk α 0; Omuz pikseli Göğüs'ten parlak (G büyük). `"clear"`'da gövde α 70. `img/kas-harita.png` isteği 404'e çevrildiğinde (`route`) `paintMuscleMap` `null` ve `pageerror` yok.
- [ ] **Step 2: FAIL gör.**
- [ ] **Step 3: Uygula.**
- [ ] **Step 4: PASS.**
- [ ] **Step 5: Commit** — `"v67: kas haritası çalışma anında boyanıyor"`

### Task 4: Şablon çizimi

**Files:** Modify `src/app/31-paylasim.js`, `src/app/25-en-rehber.js` · Test `tests/test_v67_paylasim.py` (bölüm 4)

**Interfaces:**
- Consumes: `shareData`, `paintMuscleMap`
- Produces:
  - `SHARE_TPLS = ["map", "pr", "photo", "sticker", "list"]`
  - `shareTplsFor(data) -> string[]` — `pr` yalnız `data.prs.length`; `list` yalnız `data.rows.length`.
  - `buildShareCanvas(log, opts?) -> Promise<HTMLCanvasElement>`; `opts = { tpl = "map", size = "story"|"post", theme = "dark"|"light", stats = {dur,vol,sets,prs,cardio,month: boolean}, photo?: ImageBitmap|HTMLImageElement }` (varsayılan: map, story, dark, hepsi açık). Fotoğraf ve çıkartma `theme` yok sayar. `photo` şablonunda `photo` yoksa: koyu zemin + ortada "Fotoğraf seç" yer tutucusu (paylaşılmaz; pencere düğmeyi pasif tutar).
  - Ortak çizim yardımcıları (aynı dosyada): `drawWordmark`, `drawTag(text)` (eğik çubuk + italik etiket), `drawTitle` (gün adı; 128 px'ten 72 px'e kadar küçülür, sonra `fitText`), `drawStatPanel(stats, cols)` (−8° eğik, kenar `rgba(acc,.75)` 3 px, köşe 34, dış ışık, hücre ayracı), `drawStage` (radyal ışık + solan yay), `drawFooter` (ay sırası satırı + "AYK+ ile kaydedildi").
  - Panel düzeni (spec §9-1): görünür istatistik = `stats[k] && has`; map-hikâye n≤3 tek satır, 4 → 2×2, 5 → 3+2; gönderi tek sütun; sticker ilk 3; list tek satır n sütun; n = 0 panel yok.
  - Yerleşim: `tasarimlar/_uret_paylasim.py` `A3_map / A3_photo / A3_sticker / A3_list` ölçüleri birebir; rekor şablonu spec §4-5; taslağı olmayan gönderi/aydınlık birleşimleri aynı bileşenlerle.
  - İngilizce: yeni anahtarlar `25-en-rehber.js` paylaşım bölümüne ("YENİ REKOR": "NEW PR", "Çalışan kaslar": "Muscles worked", "Tahmini 1RM ~{v}": "Est. 1RM ~{v}", "+{n} rekor daha": tn, "Fotoğraf seç": "Choose photo", ...).

- [ ] **Step 1: Test yaz** (`fillText` yakalama kalıbı `test_v52_son.py`'deki gibi):
  - `test_boyutlar`: 5 şablon × 2 boyut → `[1080,1920]` / `[1080,1350]`.
  - `test_cikartma_seffaf`: sticker köşe pikseli (5,5) α == 0; map köşe pikseli α == 255.
  - `test_kisisel_yok`: tohumdaki `state.weight`, `state.settings.goalWeight` (fmt edilmiş), ölçü değerleri ve profil adı metinleri HİÇBİR şablonun `fillText` listesinde yok; ayrıca hiçbir metinde " kg" + kilo değeri yok.
  - `test_istatistik_kapat`: `stats.vol=false` → "Tonaj" çizilmez; hepsi kapalı → panel etiketleri yok; `month=false` → ay satırı yok.
  - `test_rekor_karti`: `prs` var → "YENİ REKOR", "Bench Press", "85 kg × 8"; imperial → "185 lb × 8" ve hiçbir metin " kg" ile bitmez.
  - `test_uzun_ad`: 60 karakterlik gün adı + emojili hareket adı → her `fillText` için `measureText(width) ≤ 1080 - 2×72` (sarmalayıcıda ölç).
  - `test_ingilizce`: `setLang('en')` → "Workout complete", "Logged with AYK+", "Muscles worked", Türkçe harf yok.
  - `test_kardiyo_kart`: yalnız kardiyo → `shareTplsFor` `["map","photo","sticker","list"]`, map metinlerinde "Çalışan kaslar" yok.
  - Görsel: her şablon × boyut × tema PNG'si `tests/shots/v67_<tpl>_<size>_<theme>.png` kaydedilir (gözle kontrol için).
- [ ] **Step 2: FAIL gör.**
- [ ] **Step 3: Uygula.** Yazı tipi: çizimden önce `document.fonts.load(disp(64))` (bugünkü kalıp). Fotoğraf `cover` kırpma: kısa kenara göre ölçekle, ortala.
- [ ] **Step 4: PASS; `tests/shots/v67_*.png` dosyalarına gözle bak** (her biri tam boy; A3 taslağıyla karşılaştır).
- [ ] **Step 5: Commit** — `"v67: 5 paylaşım şablonu (hikâye/gönderi, koyu/aydınlık)"`

### Task 5: Paylaşım penceresi

**Files:** Modify `src/markup.html` (yeni `#shareModal`), `src/app/31-paylasim.js`, `src/app/01-temel.js` (`normalizeState`), `src/app/25-en-rehber.js` · Test `tests/test_v67_paylasim.py` (bölüm 5)

**Interfaces:**
- Consumes: `buildShareCanvas`, `shareTplsFor`, `shareData`
- Produces:
  - `openShareCard(logIdx)` (ad korunur; `#finShare` ve Geçmiş düğmesi değişmeden bunu çağırır) → `#shareModal` açar.
  - `state.settings.share = { tpl: "map"|"pr"|"sticker"|"list", size: "story"|"post", theme: "dark"|"light", stats: {dur,vol,sets,prs,cardio,month: boolean} }`; `normalizeState`: nesne değilse / alan geçersizse varsayılan `{tpl:"map", size:"story", theme:"dark", stats: hepsi true}`; `tpl === "photo"` kaydedilmez (map'e döner).
  - Açılış şablonu (spec §9-5): kayıtlı tpl o antrenmanda varsa o; değilse map; `muscles` boş ve kayıtlı map ve liste varsa list.
  - DOM: `#shareModal` içinde `#shareTrack` (yatay `scroll-snap`, her şablon bir `[data-share-tpl]` önizleme `<img>`), `#shareDots [data-share-dot]` (düğme, `aria-label` şablon adı), `#shareSize [data-share-size]`, `#shareTheme [data-share-theme]` (photo/sticker'da gizli), `#shareStats [data-share-stat]` (`aria-pressed`; `has` false ise `disabled`; son açık olan kapatılamaz → toast "En az bir bilgi açık kalmalı"), `#sharePhotoBtn` + gizli `#sharePhotoInput` (`type=file accept="image/*"`), `#shareGo` ("Paylaş"), `#shareCopy` ("Kopyala"; yalnız sticker ve `navigator.clipboard?.write && window.ClipboardItem` varsa).
  - `shareGo()`: tam boy çizim → `navigator.share({files})`; yoksa indirme (eski `shareWorkoutCard` yedeği); `AbortError` sessiz.
  - `shareCopy()`: `ClipboardItem({'image/png': blob})` → toast "Kopyalandı. Instagram hikâyesinde yapıştır."
  - Fotoğraf: `createImageBitmap(file, {imageOrientation: "from-image"})`, yoksa `Image` + object URL; modül değişkeni `sharePhoto`; `closeShare()` → `sharePhoto?.close?.()`, URL revoke, `sharePhoto = null`.
  - Önizleme: değişiklikte yalnız görünen şablon yeniden çizilir (ölçekli canvas → `toBlob` → `<img>`); diğerleri ilk açılışta bir kez.

- [ ] **Step 1: Test yaz:**
  - `test_pencere_acilir`: bitiş özetinden `#finShare` → `#shareModal` görünür, 5 nokta (rekorlu tohum), ilk görünen kas haritası.
  - `test_secimler_hatirlanir`: Gönderi + Aydınlık + Tonaj kapalı seç, kapat, yeniden aç → aynı; `aykStoredState().settings.share` eşleşir.
  - `test_bozuk_ayar`: `settings.share = "x"` ve `{tpl:"photo", size:5}` → yüklemede varsayılan / map.
  - `test_foto_saklanmaz`: `set_input_files('#sharePhotoInput', 1×1 png)` → önizleme değişir; kapat-aç → foto yok (`sharePhoto === null`); `JSON.stringify(aykStoredState())` ve bütün localStorage değerlerinde `data:image` / `blob:` yok.
  - `test_paylas_yedek`: `navigator.share` ve `canShare` silinmiş → `#shareGo` indirme başlatır (`download` olayı), sayfa hatası yok.
  - `test_kopyala_gizli`: `ClipboardItem` silinmiş → sticker'da `#shareCopy` gizli; sahte `clipboard.write` ile → çağrılır ve toast.
  - `test_eski_antrenman`: Review Focus 1 tohumu Geçmiş'ten açılır → liste noktası yok, Süre çipi `disabled`, hata yok.
  - `test_44px`: pencere içindeki görünür düğmelerin hepsi ≥ 44 px (`SMALL` kalıbı).
  - `test_eski_kayit_goc`: `settings.share` alanı olmayan eski tohum → açılış sorunsuz, varsayılan.
- [ ] **Step 2: FAIL gör.**
- [ ] **Step 3: Uygula** (eski `chartModal` tabanlı `openShareCard` gövdesi kaldırılır; `chartModal` diğer kullanımlar için kalır).
- [ ] **Step 4: PASS.**
- [ ] **Step 5: Commit** — `"v67: paylaşım penceresi (şablon kaydırma, boyut, tema, istatistik, fotoğraf, kopyala)"`

### Task 6: Eski testler, İngilizce bekçisi, kontrol aracı

**Files:** Modify `tests/test_v12_baslik_foto.py:99`, `tests/test_v52_son.py:~150-175`, `tests/test_v53_birim.py:~340-346`, `tests/test_v8_ozellikler.py:43`, `tests/test_v47_ingilizce.py:576` (işlev listesi `09` → yeni `31-paylasim.js` girdisi), `scripts/kontrol/ortak.py`

- [ ] **Step 1:** v12: `icon.png` denetimi yerine "kartta AYK+ yazısı çiziliyor" (`fillText` listesinde "AYK" ve "+"). v52/v53: pencere başlığı/düğme metinleri `#shareModal` ile; tuval beklentileri: "Antrenman tamamlandı", "AYK+ ile kaydedildi", "Süre", "Tonaj", "Set" (Hareketler yalnız `tpl:"list"` çağrısında). v8: Geçmiş düğmesi `#shareModal` açar. v47: `31-paylasim.js` girdisi (taşınan + yeni işlevler), statik Türkçe bekçisi kapsamına `31` eklenir.
- [ ] **Step 2:** `ortak.py` `SCREENS`'e `paylas-harita`, `paylas-foto`, `paylas-liste` (koyu tohum, son antrenman), `EN_SCREENS`'e `en-paylas-harita`, `en-u-paylas` (imperial); listelerin sonuna.
- [ ] **Step 3:** `npm run build && npm test` → hepsi geçer; `npm run test:webkit` → hepsi geçer.
- [ ] **Step 4: Commit** — `"v67: eski paylaşım testleri ve kontrol ekranları yeni pencereye göre"`

### Task 7: Sürüm, belgeler, kullanıcıya gösterim

**Files:** `src/markup.html` (`AYK+ v67`), `sw.js` (`aykplus-v67`), `privacy.html` (bölüm 3'e TR + EN cümle: "Paylaşım kartı için seçtiğin fotoğraf yalnızca cihazında işlenir; kaydedilmez ve hiçbir yere gönderilmez."), `docs/SURUM-GECMISI.md` (v67 notu), `CLAUDE.md` (§2 dosya listesine `31-paylasim` ve `img/kas-harita.png`; §9 son durum v67)

- [ ] **Step 1:** Sürüm etiketleri + belgeler.
- [ ] **Step 2:** `npm run build` ("✓ index.html oluşturuldu") → `npm test` → `npm run test:webkit` → `npm run kontrol -- --hizli` (yalnız bilinçli farklar: paylaşım ekranları yeni, sürüm etiketi). `python scripts/kontrol/bozuk_veri.py` ve `html_enjeksiyon.py` (settings değişti) → 0 hata.
- [ ] **Step 3:** Bütün şablon × boyut × tema birleşimlerinin (`tests/shots/v67_*.png`) tek sayfalık özetini `tasarimlar/paylasim-v67-tum.png` olarak üret, kendin tam boy incele (≤ 2 görsel/bakış), sonra kullanıcıya göster (spec §9-2 sözü).
- [ ] **Step 4: Commit (yerel)** — `"AYK+ v67: paylaşım görselleri"`. `main`'e gönderme yalnız kullanıcı onayıyla.
