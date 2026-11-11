# Beslenme Bölümü — Eksik Analizi (v24)

**Tarih:** 11 Kasım 2026 · **Kapsam:** `src/app.js`, `src/markup.html`, `src/data.js`, `sw.js`, `tests/`, tasarım dosyası `ayk_beslenme_tema_ux_st_dyosu.tsx`
**Not:** Bu çalışmada hiçbir kod değiştirilmedi. Satır numaraları v24 (commit `29b1cd0`) içindir.

Önem dereceleri:
- **Kritik:** Uygulamanın açılmamasına, veri kaybına ya da yanlış hesaba yol açar. Önce bunlar düzeltilmeli.
- **Önemli:** Günlük kullanımda hata, kafa karışıklığı ya da belirgin yavaşlık yaratır.
- **Küçük:** Görünüm, tutarlılık ya da ileride sorun çıkarabilecek ayrıntılar.

---

## Özet tablo

| # | Konu | Önem |
|---|------|------|
| 6.1 | sw.js: 404/5xx hatasında önbellekteki kopya açılmıyor | **Kritik** |
| 6.2 | sw.js: Zayıf internette (spor salonu) açılış uzun süre takılabilir | **Kritik** |
| 1.1 | 180 günden eski günlük özetler kalıcı olarak siliniyor | **Kritik** |
| 1.2 | Menülerim'de gramı 0 yapınca besin Geri al olmadan siliniyor | Önemli |
| 1.3 | "Karbı dengele" Geri al sunmuyor ve yeni veritabanındaki besinleri tanımıyor | Önemli |
| 1.4 | Alışveriş tikleri / bulunamayan aramalar Geri al olmadan siliniyor | Küçük |
| 1.5 | "Sabitle" ve doz silme Geri al sunmuyor | Küçük |
| 1.6 | Eski/bozuk veri için eksik göç kontrolleri ve testleri | Önemli |
| 3.1 | Arama her harfte tüm listeyi yazım hatası kontrolünden geçiriyor (yavaş) | Önemli |
| 3.2 | Her değişiklikte görünmeyen sekmeler de yeniden çiziliyor | Önemli |
| 3.3 | foods.js + index.html ilk açılış boyutu | Küçük |
| 3.4 | `color-mix()` eski iOS'ta çalışmıyor | Küçük |
| 3.5 | "Dünkü gibi" etiketi gün geçiş saatini hesaba katmıyor | Önemli |
| 4.x | Testi olmayan / zayıf test edilen özellikler | Önemli |
| 5.x | Kafa karıştırıcı metinler ve akışlar | Önemli / Küçük |
| 2.x | Tasarım dosyasından farklar | Önemli / Küçük |

---

## 1) CLAUDE.md'deki kesin kurallar

Denetlenen kurallar: 44 px dokunma alanı, `esc()`, `data-fk`, Türkçe ondalık virgül, silmede Geri al, `prompt/confirm/alert` yasağı, eski veriyle göç testi.

**Temiz çıkanlar (sorun bulunmadı):**
- **44 px:** Beslenmedeki tüm düğmeler `w-11/h-11` (44 px) veya daha büyük. Küçük görünen parçalar (28 px onay dairesi `.n-check`, 31 px anahtar `.n-sw`) hep 44 px'lik bir satır/etiketin içinde. Eski pencerelerdeki `text-xs py-2` düğmeleri, beslenmeden açılınca `.nm button { min-height:44px }` kuralıyla büyüyor. `test_v13` zaten 44 px'ten küçük öğe arıyor.
- **`esc()`:** Kullanıcı metnini ekrana basan her yer `esc()` kullanıyor. Open Food Facts ürün adı ve markası, arama metni, takviye notları ve saat etiketi de dahil. `onclick` içindeki metinler `esc(JSON.stringify(...))` kalıbında. Toast ve pencere başlıkları `textContent` kullandığı için güvenli.
- **`data-fk`:** Tam yeniden çizim yapan metin kutularının hepsinde var (app.js:1130, 1523, 5547).
- **Sayılar:** `type="number"` hiç yok. Kullanıcı girişleri `num()` ile okunuyor.
- **`prompt/confirm/alert`:** Beslenmede doğrudan kullanılmıyor.

### 1.1 — 180 günden eski günlük özetler siliniyor · **Kritik**
- **Yer:** `archiveDay`, app.js:592: `while (keys.length > 180) delete state.dailyLogs[keys.shift()];`
- **Sorun:** Her gece yarısı 180 günden eski günlük beslenme özetleri (kalori, makro, su, öğün sayısı) kalıcı olarak siliniyor. CLAUDE.md'de bu sınır yazmıyor. "Kullanıcı verisi kutsaldır" kuralına aykırı. 6 ay sonra uzun dönem grafikleri ve geçmiş sessizce kısalır.
- **Boyut:** Öğün içeriği zaten yalnızca son 7 gün saklanıyor. Bir günlük özet yaklaşık 150 bayt, yani 1 yıl ≈ 55 KB. Ölçümde 365 günlük veriyle durum dosyası 77 KB çıktı. Bu, localStorage sınırının (~5 MB) çok altında.
- **Öneri:** 180 gün sınırını kaldır (ya da 5 yıla çıkar). İstenirse yalnızca çok eski günlerin `meals` alanı gibi büyük kısımları kırpılsın, özetler silinmesin. Önce kullanıcıya sorulmalı: bugüne kadar silinen veri geri getirilemez, yalnızca yedeklerde durur.

### 1.2 — Menülerim'de 0 gram = Geri al olmadan silme · **Önemli**
- **Yer:** `changeAmount` (app.js:2180) ve `setAmount` (app.js:2187).
- **Sorun:** Menülerim'de − düğmesine basa basa 0'a inmek ya da gram kutusunu boşaltıp 0 yazmak besini **sessizce siler**. `snapshot()` ve "Geri al" yok. Kutuyu boşaltıp yeni sayı yazmaya çalışırken besin kaybolabilir. Bugün ekranındaki aynı işlem (`dayRemoveItem`, app.js:1236/1245) doğru çalışıyor.
- **Öneri:** Bugün tarafındaki gibi silmeyi `removeItem` üzerinden yap (`snapshot` → sil → `offerUndo`). Boş kutu için silme yerine eski değere dönmek daha güvenli.

### 1.3 — "Karbı dengele" düğmesi · **Önemli**
- **Yer:** `autoBalanceCarbs`, app.js:2213. Düğme markup.html:497 (Menülerim).
- **Sorun 1:** Yalnızca eski listenin sabit kimliklerini tanıyor: `pirinc, basmati, makarna_tam, bulgur, yulaf, patates, tatli_patates`. `yulaf`, `patates` ve `tatli_patates` v20'den beri gizli (data.js:20, 25, 26). Kullanıcı yulafı veya patatesi artık USDA listesinden (`u173904`, `u170026`...) ekliyor. Bu menülerde düğme "Dengelemek için öğünlerinde pirinç, makarna... olmalı" hatası veriyor.
- **Sorun 2:** Menüdeki tüm karb gramlarını değiştiriyor ama `snapshot()`/Geri al yok.
- **Sorun 3:** "Günü dengele" ile adı çok benzer ama başka bir iş yapıyor (bkz. 5.1).
- **Öneri:** Karb besinlerini sabit kimlik yerine kategoriden ya da makro oranından (karbonhidrat payı yüksek, `g` birimli) seç. `replace` eşlemesini de dikkate al. Geri al ekle. Alternatif: kullanıcı artık kullanmıyorsa düğmeyi kaldır.

### 1.4 — Toplu temizlemede Geri al yok · **Küçük**
- `clearShopChecks()` (app.js:5694): alışveriş listesindeki tüm tikleri onaysız ve Geri alsız siler.
- `clearMissSearches()` (app.js:6116): Profil'deki "Bulunamayan aramalar" listesini onaysız siler.
- **Öneri:** İkisine de `snapshot()` + `offerUndo()` ekle.

### 1.5 — Toplu gram değişiminde Geri al yok · **Küçük**
- `resetScaleBase` ("Sabitle", app.js:853): tüm menülerdeki gramları kalıcı olarak yeniden yazar, Geri al yok.
- `editSuppDose` (app.js:4157): boş yanıt dozu, birimi ve sınırları siler, Geri al yok.
- **Öneri:** `snapshot()` + `offerUndo()` ekle. Kural yalnızca silmeyi sayıyor, ama ikisi de geri dönüşü zor değişiklikler.

### 1.6 — Eski / bozuk veri için eksik göç kontrolü · **Önemli**
`normalizeState` (app.js:121–213) yeni alanların çoğunu doğru tamamlıyor: `dayPlan`, `combos`, `foodSnap`, takviye dozları, `waterAuto`, `dayStartHour`... Eksikler:
- **Öğün kalemleri hiç doğrulanmıyor.** Yalnızca `m.items`'in dizi olduğu kontrol ediliyor.
  - Yedekte `null` öğün olursa `normalizeState` çöker. Bu durumda uygulama hiç açılmaz.
  - Metin miktar (`"80,5"`) olursa `effAmount` NaN döner ve kalori bozulur.
- **`customFoods` kayıtları doğrulanmıyor.** `null` kayıt veya bozuk `recipe` doğrudan besin tablosuna giriyor (app.js:271).
- **`dailyLogs` kayıtları doğrulanmıyor.** `lastDayMealFor` (app.js:5618) `null` kayıtta hata verir.
- **Göç testi olmayan veri biçimleri:**
  - tarifli / barkodlu özel besinler
  - `dayPlan` içinde kayıtlı tahmini (`est`) girişler
  - bozuk `dailyLogs[*].meals`
  - eski biçimli `restMeals`
  - geçersiz `scaleOn`/`scaleBase`
  - metin veya `null` miktarlar

**Öneri:** `normalizeState` içinde öğün kalemlerini temizle: `null` atılsın, `amount` `num()` ile sayıya çevrilsin. `customFoods` ve `dailyLogs` için de aynısını yap. Bu biçimlerin hepsiyle bir "bozuk yedek" testi yaz (`test_v6_temel.py`'deki legacy kalıbıyla).

---

## 2) Tasarım dosyasıyla farklar

Karanlık renk paleti tasarımla neredeyse birebir aynı (markup.html:120–127). Farkların çoğu v14–v24'te bilerek yapılmış ve CLAUDE.md'de yazıyor: Besinler'in alt sekme olması, ikame penceresi, Su/Takviye kartları, Geçmiş ekranı, 44 px büyütmeleri, pişmiş/çiğ anahtarının olmaması. Aşağıdakiler belgelenmemiş farklar:

### 2.1 — Kalori halkası varsayılan olarak "plan"ı gösteriyor · **Önemli** (karar gerekiyor)
- **Tasarım:** Halka yenen kaloriyi, "Kalan" da kalan miktarı gösteriyor (TSX:624–630, 721–729).
- **Uygulama:** Varsayılan `settings.macroView = "plan"` (app.js:9). Halka ve "Kalan" önce planlanan yiyeceği gösteriyor, hero kartında ayrıca bir Plan/Yenen düğmesi var.
- **Neden önemli:** Gün içinde "ne kadar yedim, ne kaldı?" sorusu tasarımın ana fikri.
- **Öneri:** Kullanıcıya sor. "Yenen" varsayılan yapılabilir veya etiket daha görünür olabilir.

### 2.2 — "Favoriler" ve "Yüksek protein" filtreleri yok · **Küçük**
- **Tasarım:** Kategori hapları "Son kullanılanlar / Favoriler / Türk mutfağı / Yüksek Protein" (TSX:1395).
- **Uygulama:** Favori işaretleme ve yüksek protein filtresi yok. Kombolar ve öneriler kısmen bu işi görüyor.
- **Öneri:** "Yüksek protein" filtresi kolay bir ekleme olur (100 kcal başına protein oranıyla sıralama). Favori için yıldız işareti gerekir. İkisi de kullanıcı onayıyla.

### 2.3 — Menülerim'deki "+" düğmesinin işi farklı · **Küçük**
- **Tasarım:** "+ Yeni öğün veya besin ekle" Besinler'e götürüyor (TSX:1333).
- **Uygulama:** "Yeni öğün ekle" öğün penceresini açıyor (app.js:1543).
- **Not:** Uygulamanın davranışı da mantıklı. Bilgi için yazıldı.

### 2.4 — Yazı tipi ve küçük görsel farklar · **Küçük**
- **Sayılar:** Tasarımda sistem yazı tipi kalın. Uygulamada antrenmandaki gibi `t-display` (AYKDisplay italik). Tutarlılık açısından iyi, ama belgelenmemiş.
- **Kategori hapları:** Tasarımda pasif olanlar şeffaf ve çerçeveli, uygulamada dolu (`.n-chip`).
- **Gündüz teması:** Vurgu `#059669`. Makro renkleri tasarımdakinden koyu; kontrast için iyileştirme, belgelenmemiş.
- **Öneri:** Kullanıcı ekranlardan memnunsa yalnızca CLAUDE.md §7'ye not düş.

### 2.5 — CLAUDE.md'de güncel olmayan satır · **Küçük**
- **Sorun:** §6 "Bugün" maddesi hâlâ "su bardakları (`renderWater`)" diyor. v24'ten beri halka kartı var.
- **Öneri:** Satırı güncelle.

---

## 3) iPhone Safari sorunları ve yavaşlık

**Ölçüm yöntemi:** Chromium, iPhone boyutu, işlemci **4 kat yavaşlatılmış**. Bu iPhone ölçümü değil, karşılaştırma için kaba bir tahmin. Yeni bir iPhone muhtemelen 2–4 kat daha hızlıdır.

| İşlem | Normal veri | 1 yıllık veri |
|-------|-------------|---------------|
| `renderAll()` (her tıklamada) | 53 ms | 120–138 ms |
| — bunun beslenme kısmı | 46 ms | 96 ms |
| Arama "tavuk" | 264 ms | 266 ms |
| Arama "tavk göğüs" (yazım hatalı) | ~300–345 ms | ~270–310 ms |
| Arama "ta" (kısa) | 6 ms | 10 ms |
| `saveState()` | 0,8 ms | 4 ms |

### 3.1 — Arama her harfte ağır çalışıyor · **Önemli**
- **Yer:** `#foodSearch` her tuşta `renderFoodList()` çağırıyor (markup.html:513). Bekleme (debounce) yok.
- **Neden yavaş:** 4 harften uzun bir kelime bir besinin adında geçmezse, `wordScore` (app.js:6047) o besinin tüm kelimeleriyle yazım hatası karşılaştırması (`editDist`) yapıyor. ~1.900 besinin çoğu eşleşmediği için bu her tuşta binlerce kez çalışıyor. Telefonda yazarken takılma hissi verebilir.
- **Öneri:**
  1. Aramaya ~150 ms bekleme ekle.
  2. Yazım hatası taramasını yalnızca normal eşleşme az sonuç verdiğinde (ör. < 10) çalıştır.
  3. `frequentFoods(40)` her aramada yeniden hesaplanıyor; önbelleğe al.

### 3.2 — Her değişiklikte her şey yeniden çiziliyor · **Önemli**
- **Yer:** `renderAll` (app.js:6153), `renderNutrition` (app.js:947–991).
- **Sorun:** Bir öğüne tik atınca bile şunların hepsi baştan çiziliyor:
  - görünmeyen alt sekmeler (Menülerim, Besinler, Geçmiş) ve antrenman/mobilite sekmeleri
  - Besinler'in **arama sonucu listesi**: aramada metin kalmışsa her tıklamada 3.1'deki arama tekrar çalışıyor
  - Geçmiş ekranı: veri büyüdükçe yavaşlıyor (1 yılda 46 → 96 ms)
- Ayrıca her `renderAll`'da `invalidateFoodDB()` çağrıldığı için ~1.900 besinlik birleşik tablo yeniden kuruluyor (~3 ms, küçük).
- **Öneri:** `renderNutrition` içinde yalnızca açık alt sekmeyi çiz. Diğerlerini sekme açılınca (`setNutriView`) çiz. Bugün kartları (halka, su) her durumda güncel kalabilir. Risk düşük, etkisi büyük. Testler değişmeden geçmeli.

### 3.3 — Açılış boyutu · **Küçük**
- **Boyutlar:** index.html 568 KB, foods.js 416 KB. İkisi de açılışta yükleniyor. Barkod kütüphanesi (336 KB) yalnızca gerektiğinde yükleniyor; bu iyi.
- **Durum:** Önbellekten açılışta sorun değil. Ölçülen açılış 0,7–1,6 sn (4 kat yavaş işlemci).
- **Risk:** foods.js normal bir `<script>` olduğu için ilk çizimi bekletiyor. Uygulama sırf o yüzden yavaş açılıyor gibi görünebilir.
- **Öneri:** Şimdilik dokunma. İleride açılış yavaş hissedilirse foods.js `defer` ile yüklenip besin tablosu hazır olunca yenilenebilir. Bunun için `USDA_DB`'nin sabit (`const`) yapısı değişmeli; bu riskli bir iş.

### 3.4 — `color-mix()` eski iOS'ta çalışmıyor · **Küçük**
- **Yer:** app.js:1738–1740, besin kartındaki P/K/Y hapları.
- **Sorun:** `color-mix()` iOS 16.2 öncesinde çalışmaz. Arka plan rengi görünmez ama yazı görünür, işlev bozulmaz.
- **Öneri:** Sabit `rgba(...)` değerleri yaz.

### 3.5 — "Dünkü gibi" etiketi gün geçiş saatini yok sayıyor · **Önemli**
- **Yer:** `dayLabelShort`, app.js:5628.
- **Sorun:** "Dün"ü `new Date()` ile hesaplıyor, `logicalToday()` ile değil. Profil'de gün geçişi 03:00 ise 00:00–03:00 arasında düğme "Dünkü gibi" yerine "9 Kas günkü gibi" yazar.
- **Öneri:** `logicalToday()` kullan. dayStartHour > 0 ile bir test ekle.

### 3.6 — Diğer iOS notları · **Küçük**
- **Yakınlaştırma:** Giriş kutularının yazısı 16 px veya üstü, viewport `maximum-scale=1`. Odaklanınca yakınlaştırma sorunu yok.
- **Kayıt hatası:** localStorage dolarsa `saveState` uyarıyor ("Veriler kaydedilemedi! Hemen yedek al."). Bu durum test edilmiyor (bkz. 4).
- **Kalıcı depolama:** `navigator.storage.persist()` çağrılıyor. Ana ekrana eklenen PWA Safari'nin 7 gün kuralından muaf. Yedek hatırlatma bandı var.

---

## 4) Testi olmayan veya zayıf test edilen özellikler

**İyi test edilenler:**
- v14 "sadece bugün" akışının tamamı, kiloya göre gramaj, kombo/tarif/alışveriş
- öneriler, haftalık kart, arama/yazım hatası, bulunamayan/gizli besin
- etiket kontrolü, gün geçişi (sabit saatlerle), lif/tuz, adet sayacı
- su/takviye kartları, barkod (çevrimdışı dahil)

| Özellik | Durum | Önem | Öneri |
|---------|-------|------|-------|
| `sw.js` davranışı (çevrimdışı, 404/5xx, önbellek) | Hiç test yok; yalnızca dosyada `foods.js` adı aranıyor (test_v18:179) | **Kritik** | 6.1 düzeltmesiyle birlikte test yaz: Playwright'ta `context.route` ile 404/500 döndür, `context.set_offline(True)` ile çevrimdışı aç; uygulama açılmalı |
| "Karbı dengele" (`autoBalanceCarbs`) | Test yok (ve hatalı, bkz. 1.3) | Önemli | Düzeltme + test |
| Yedekten geri yükleme (beslenme verisi) | test_v6 yalnızca antrenman verisini kontrol ediyor | Önemli | Özel besin, kombo, tarif, `dayPlan`, `foodSnap`, takviye dozu ve `dailyLogs[].meals` geri yüklemeden sonra aynı mı, kontrol et |
| localStorage dolu | Test yok | Önemli | `setItem`'ı hata verdiren bir testle uyarının çıktığını doğrula |
| Gerçek gün geçişi (`dayStartHour` > 0, saat ilerletme) | Yalnızca sabit saatler test ediliyor | Önemli | Saati 02:59 → 03:01 ilerlet; `archiveDay` doğru tarihe yazmalı, "Dünkü" etiketi doğru olmalı |
| Menülerim'de 0 gram → silme | Test yok | Önemli | 1.2 düzeltmesiyle birlikte |
| Öğün sürükle-bırak | Yalnızca tutamaç var mı diye bakılıyor | Küçük | Gerçek sürükleme + sıranın kaydedildiğini kontrol et |
| Öğüne saat ekleme (`placeByTime`) | Yalnızca eski (v10) akışta | Küçük | v13 öğün penceresinden test |
| Bildirim kuralları (en fazla 2, tekrar yok) | Test yok | Küçük | Basit bir test |
| Gün tipi değişince (antrenman ↔ dinlenme) `dayPlan` | Test yok | Küçük | Değiştir, arşivle, doğru menü arşivlendi mi bak |
| "Menüye de kaydet" + kiloya göre gramaj açıkken | Test yok | Küçük | Ham mı, ölçekli miktar mı yazıldığını kontrol et |
| 180 gün silme (1.1) | Test yok | Kritik ile bağlı | Düzeltmeden sonra 400 günlük veriyle test |

---

## 5) Kafa karıştırabilecek metinler ve akışlar

Yazım hatası veya İngilizce kalıntı bulunmadı; "antrenman" her yerde doğru yazılmış.

| # | Şu anki metin / akış | Sorun | Öneri | Önem |
|---|----------------------|-------|-------|------|
| 5.1 | "Karbı dengele" (markup.html:497) ve "Günü dengele (kalan öğünlerden kıs)" (app.js:1084) | Adları çok benzer. Biri **menüyü** değiştiriyor ve porsiyonu artırabiliyor, diğeri yalnızca **bugünü** azaltıyor | Birincisini "Menünün karbını hedefe göre ayarla" yap (ya da kaldır) | Önemli |
| 5.2 | "Menüdeki hâline dön" (app.js:1083) ve "Bugünü de bu menüye eşitle" (app.js:1553) | Aynı işlem (`revertDayToMenu`), iki farklı ad | Tek ad: "Bugünü menüye geri döndür" | Önemli |
| 5.3 | "Plan · X kcal" (markup.html:403), "bugünkü planı değiştirmez" (app.js:1552), "planlı besinlerin yerine" (markup.html:833) | Kullanıcı yalnızca "Bugün" ve "Menülerim" görüyor; "plan" üçüncü bir kavram gibi duruyor | "Bugünkü menü · X kcal", "bugünün menüsünü değiştirmez", "bu öğündeki besinlerin yerine" | Önemli |
| 5.4 | Menülerim notu: "Bugün için bu menüde ayrı değişiklikler yaptın…" (app.js:1552) | Değişiklikler "bu menüde" değil, Bugün ekranında yapıldı | "Bugün ekranında bugüne özel değişiklikler yaptın. Burada yaptıkların yarından itibaren geçerli olur." | Önemli |
| 5.5 | "Menüye de kaydet" (app.js:1082) | Hangi menü (antrenman / dinlenme) belli değil | "Antrenman menüme de kaydet" / "Dinlenme menüme de kaydet" | Küçük |
| 5.6 | "Sabitle" / "Referans kilo … yapıldı" (app.js:1485, 863) ve "Ayarı kapatırsan menü ilk gramajlarına döner" (app.js:1486) | "Referans", "sabitle" teknik. Sabitledikten sonra "ilk gramajlarına döner" artık doğru değil | "Bu gramajları yeni başlangıç yap (X kg)" ve "…son kaydettiğin gramajlara döner" | Önemli |
| 5.7 | Besinler'de "Bugüne ekle / Menüye ekle" anahtarı (app.js:1622) | Gözden kaçıyor. Yanlış yere ekleme kolay | "Sadece bugüne" / "Menüme (her gün)"; seçili olan daha belirgin | Önemli |
| 5.8 | "Dışarıda yedim" (app.js:1147) | Bir yer anlatıyor, oysa iş "tahminle giriş" (evde bilinmeyen yemek için de) | "Tahminle gir (dışarıda / bilinmeyen)" | Küçük |
| 5.9 | "8 Kas günkü gibi" (app.js:5630) | Türkçesi akıcı değil, ne yaptığı belirsiz | "Dünkü öğünü tekrarla" / "8 Kas'taki öğünü tekrarla" | Küçük |
| 5.10 | Yeni gün onayı: "Bugünün özeti İlerleme sekmesine kaydedilir." (app.js:619) | **Yanlış yönlendirme:** özet artık Beslenme → Geçmiş'te | "…Beslenme → Geçmiş'e kaydedilir." | Önemli |
| 5.11 | "USDA FoodData Central · 123456" (app.js:6129), "Kalori USDA ölçümüdür (… nedeniyle …)" (app.js:1715) | Teknik terim ve kimlik numarası | "Kaynak: ABD Tarım Bakanlığı (USDA)"; "Bu besinde kalori ölçülmüş değerdir (lif/alkol nedeniyle)" | Küçük |
| 5.12 | "Yazan kalori 220, makrolardan hesaplanan 180." (app.js:2075) | "Makro" teknik | "Etikette yazan kalori 220; protein/karb/yağdan hesaplanan 180." | Küçük |
| 5.13 | "Kombo" (app.js:1149, 1680, 5502) ve boş durumdaki "★" işareti | Yabancı kelime. Düğme SVG yıldız + "Kombo kaydet" | Kalabilir; boş durum metninde düğmenin adını aynen yaz ("Kombo kaydet") | Küçük |
| 5.14 | Bildirimlerde emoji (★ 🗑️ ⚖️ 🌅) | Beslenme v13'ten beri çizgi ikon kullanıyor | Tutarlılık için gözden geçir | Küçük |
| 5.15 | Kalori halkasının plan/yenen göstermesi | Bkz. 2.1 | Kullanıcıya sor | Önemli |
| 5.16 | `waterVal` ve haftalık kayıp `toFixed(2)` ile "1,50" (app.js:972, 1050) | Diğer sayılar `fmtNum` ile ("1,5") | `fmtNum`/`fmtKg` kullan | Küçük |

---

## 6) sw.js — Hata ve çevrimdışı davranışı

Şu anki kod (sw.js:16–27): önce internetten deniyor. **İnternet hiç yoksa** önbelleğe dönüyor. Ama sunucu **cevap verip hata döndürürse** (GitHub Pages 404 veya 500/503), `fetch` başarılı sayılıyor ve hata sayfası olduğu gibi gösteriliyor. `res.ok` yalnızca önbelleğe yazıp yazmama kararında kullanılıyor. GitHub kapandığında uygulamanın açılmamasının nedeni bu.

### 6.1 — 404/5xx yanıtında önbelleğe dönülmüyor · **Kritik**
- **Öneri:** `res.ok` false ise önbellekteki kopyayı döndür. Önbellekte yoksa, son çare olarak sunucunun hata yanıtını ver.
- Taslak (uygulanmadı):
  ```js
  self.addEventListener('fetch', e => {
    if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
    const isPage = e.request.mode === 'navigate';
    const fromCache = () => caches.match(e.request, { ignoreSearch: true })
      .then(r => r || (isPage ? caches.match('./index.html') : undefined));
    e.respondWith(
      fetch(e.request).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          e.waitUntil(caches.open(CACHE).then(c => c.put(e.request, copy)));
          return res;
        }
        return fromCache().then(r => r || res);   // 404/5xx → önbellek; o da yoksa hata yanıtı
      }).catch(() => fromCache().then(r => r || Response.error()))
    );
  });
  ```

### 6.2 — Zayıf internette açılış takılıyor · **Kritik**
- **Sorun:** "Önce internet" yönteminde zaman aşımı yok. Spor salonunda sinyal zayıfsa (bağlı görünüp veri gelmiyorsa) istek 30–60 sn bekleyebilir. Uygulama bu sürede boş ekranda kalır. GitHub'ın yavaş cevap verdiği durumda da aynısı olur.
- **Öneri:** Sayfa ve dosya isteklerinde ~3 sn zaman aşımı. Süre dolarsa önbellekteki kopya hemen açılsın, internetten gelen yanıt arka planda önbelleği güncellesin. Alternatif: "önbellek önce + arka planda güncelle" (stale-while-revalidate). Bu durumda güncellemeler bir açılış gecikmeli gelir. Kullanıcının "iki kez kapatıp aç" alışkanlığıyla uyumlu.

### 6.3 — Sayfa olmayan isteklere HTML dönülüyor · **Küçük**
- **Sorun:** Çevrimdışıyken önbellekte olmayan **her** istek için `index.html` dönüyor. Örneğin `foods.js` önbellekte yoksa script yerine HTML gelir ve sözdizimi hatası olur. Uygulama bunu tolere ediyor (`USDA_FOODS` tanımsız → uyarı), ama hata yanlış yerden geliyor.
- **Öneri:** `index.html` yedeğini yalnızca sayfa açılışında (`request.mode === 'navigate'`) kullan. Yukarıdaki taslak bunu yapıyor.

### 6.4 — Önbelleğe yazma `waitUntil` dışında · **Küçük**
- **Sorun:** `caches.open(CACHE).then(c => c.put(...))` beklenmiyor. Service worker erken kapanırsa yeni kopya yazılmayabilir.
- **Öneri:** `e.waitUntil(...)` içine al (taslakta var).

### 6.5 — Kurulumda tek dosya hatası tüm kurulumu bozuyor · **Küçük (bilgi)**
- **Durum:** `c.addAll(FILES)` içindeki tek bir dosya 404 dönerse yeni sürüm kurulmaz, eski sürüm çalışmaya devam eder. Bu aslında güvenli bir davranış.
- **Öneri:** Yeni statik dosya eklerken `FILES` listesini güncellemeyi unutma (kontrol listesinde zaten var).

### 6.6 — Test · **Kritik**
- **Öneri:** 6.1 ve 6.2 için Playwright testi yaz:
  1. Uygulamayı bir kez aç (önbellek dolsun).
  2. `context.route` ile tüm isteklere 404 sonra 503 döndür, sayfayı yenile: uygulama açılmalı (`#tabNutrition` görünmeli).
  3. `context.set_offline(True)` ile aynısını yap.
  4. Yanıtı 10 sn geciktir: 3–4 sn içinde açılmalı.

---

## Önerilen sıra

1. **sw.js** (6.1, 6.2, 6.3, 6.4 + test 6.6). Tek dosya, düşük risk, en büyük etki. `CACHE` sürümünü artırmayı unutma.
2. **Veri güvenliği:** 180 gün silmesi (1.1, önce kullanıcı onayı), Menülerim 0 gram silmesi (1.2), `normalizeState` kalem temizliği ve bozuk yedek testi (1.6).
3. **Hatalı özellik:** "Karbı dengele" (1.3) düzeltilsin ya da kaldırılsın. "Dünkü" etiketi (3.5).
4. **Hız:** arama beklemesi ve yazım hatası taramasının sınırlanması (3.1), yalnızca açık alt sekmenin çizilmesi (3.2).
5. **Metinler:** 5.10 (yanlış yönlendirme), 5.1–5.4, 5.6–5.7. Halka varsayılanı (2.1) için kullanıcı kararı.
6. **Küçükler:** Geri al eklemeleri (1.4, 1.5), `color-mix` (3.4), sayı biçimi (5.16), CLAUDE.md güncellemesi (2.5), eksik testler (4).
