# v85 planı (27 Kasım 2026)

Kullanıcı kararı: `docs/ONERI-v84.md` → A1, A2, A3, A5, A6, A7, A9 + B11 (hız). A4 ve A8 yapılmayacak.
B10, B12, B13 için çözüm listesi kullanıcıya verilir (Aşama B'de iPhone'da ölçülerek).

## 1. Bitmiş antrenmanı düzeltme
- Antrenman → Geçmiş satırında kalem düğmesi → `#editLogModal` (`.tm` pencere). Kaydın hareketleri (`exerciseHistory` içinde `logId` eşleşen seanslar) setleriyle listelenir: ağırlıkta kilo + tekrar, kardiyoda dk + km, sürelide sn. Set silinebilir (son set kalırsa hareket kaydı silinir).
- Kaydet: seanslar güncellenir, `log.sets/volume/cardioMin/cardioKm/prs` yeniden hesaplanır. Rekor: setin 1RM'i, aynı hareketin bu kayıttan ÖNCEKİ seanslarındaki en iyiyi geçerse (geçmiş yoksa rekor sayılmaz, canlı kuralla aynı).
- `logId`'si olmayan eski kayıtlar: "Bu eski kayıtta set ayrıntısı yok" notu, düzenleme yok.
- `snapshot()` + Geri al. İlerleme grafikleri `exerciseHistory`'den okunduğu için kendiliğinden güncellenir.

## 2. Antrenman gününü kopyala
- Programım'da "Kopyala" düğmesi (düğmeler 2×2). Ad sorulur (öneri "<ad> (kopya)"); hareketler derin kopya, setlerde `done/pr/e` temizlenir, süperset harfleri korunur. Yeni gün seçili olur.

## 3. Kendi makro hedefim
- `settings.manualTarget = { on, kcal, p, c, f }` (varsayılan kapalı; `normalizeState` doğrular; göç gerekmez).
- Profil → Kilom ve hedeflerim bölümünde "KENDİ HEDEFİM" kartı: anahtar + kcal, protein (zorunlu), karb/yağ (boşsa otomatik: yağ %25, karb kalan). Her iki gün tipinde aynı.
- `getTargets()`: açıksa bu değerler (`manual: true`, `goalDelta = kcal − tdee`, alt sınır uygulanmaz ama altındaysa uyarı). Koç öneri yapmaz (delta 0, not gösterir). Menülerim hedef kartında not.

## 5. "Dışarıda yedim" tek dokunuş
- Bugün → "BUGÜNÜN ÖĞÜNLERİ" altında düğme. Pencerede öğün seçici (`#fmMealSel`), varsayılan sıradaki yenmemiş öğün. Öğün düzenlemedeki düğme aynı pencereyi o öğünle açar.

## 6. Antrenman geçmişinde "Daha fazla göster"
- İlk 30, düğmeyle +30 (`gymHistLimit`, kaydedilmez).

## 7. Geçmiş güne yemek ekleme
- Beslenme → Geçmiş'te geçmiş gün kartında "+ Ekle" → `#pastFoodModal`: besin ara + miktar, ya da tahmini (ad, kcal, P, K, Y). Eklenenler kartta listelenir, × ile silinir (Geri al).
- Kayıt: `dailyLogs[gün].added = [{ n, k, p, c, f, id?, a? }]`; toplamlar hem plan (`kcal/p/c/f`) hem yenen (`eatenKcal/eatenP`) alanlarına eklenir/çıkarılır. `archiveDay` aynı güne yeniden yazarsa `added` korunur ve toplamlara yeniden eklenir.
- Son 60 gün (Geçmiş'te görünen günler). Kayıt olmayan güne ekleme yok.

## 9. Tarif: "tamamı 640 g, ben 180 g yedim"
- Besin kartında tarif seçilince hazır miktarlar: Tamamı / Yarısı / Çeyreği (+ porsiyon, 100 g) ve "Tencerenin tamamı 640 g; yediğin gramı yaz" satırı.
- Tarif penceresinde "Yediğim miktar (g)" hesaplayıcı: o miktarın kcal ve makroları.

## 11. Hız (kayıt)
- Ölçüm (PC, 5 yıllık veri): dokunuş başı kayıt 6,4 ms, bunun 5,8 ms'i parçaları metne çevirmek (`exerciseHistory` 1,1 MB).
- Çözüm: büyük parçalar (`exerciseHistory`, `dailyLogs`, `workoutLogs`) için ucuz imza; imza değişmediyse dokunuşta metne çevrilmez. Güvenlik ağı: atlanan parça olduysa 2 sn sonra TAM karşılaştırma (`flushSave(true)`), arka plana geçerken ve aynada da tam. Bu üç parçayı değiştiren işlemler (`markPartDirty`) ayrıca işaretler.
- Test: imzanın yakalamadığı eski kayıt değişikliği 2 sn içinde IndexedDB'ye yazılıyor; arka plana geçince hemen yazılıyor; ölçüm.
