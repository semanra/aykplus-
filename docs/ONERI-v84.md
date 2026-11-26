# Öneri turu — v84 sonrası (26 Kasım 2026)

Kaynak: Codex (GPT-6.2 Sol, depo `1ec9875` = v83) + Gemini Pro (v81 kaynağı) + Claude. Her madde kodda doğrulandı.
Kullanıcı kararı bekleniyor: kısa bir web turu mu, doğrudan Aşama B mi?

## A. Yeni özellik (web)

| # | Öneri | Kaynak | Kodda durum | Zorluk |
|---|---|---|---|---|
| 1 | Bitmiş antrenmanı düzeltme (kilo/tekrar; rekor ve 1RM grafiği yeniden hesaplanır) | Codex + Gemini | Geçmişte yalnız Paylaş / Sil var (`gymHistoryHtml`) | Orta |
| 2 | Antrenman gününü kopyala (Programım) | Codex + Gemini | Yalnız Yeni gün / Adlandır / Günü sil | Küçük |
| 3 | Kendi makro hedefini elle gir (diyetisyen/koç verdiyse kcal + P/K/Y) | Claude | Yok; hedef yalnız `getTargets` formülü + `calAdjust` | Küçük–Orta |
| 4 | Dünün bütün öğünlerini bugüne kopyala | Gemini | Öğün başına "Dünkü gibi" var | Küçük |
| 5 | "Dışarıda yedim" / hızlı kalori Bugün ekranında tek dokunuş | Gemini | Öğün düzenleme panelinin içinde | Küçük |
| 6 | Antrenman geçmişinde 30'dan eskisi için "Daha fazla göster" | Codex | Son 30 seans; eskisi takvimden | Küçük |
| 7 | Geçmiş güne besin ekleme/düzeltme (dün unutulan öğün) | Codex + Gemini | Gün arşivi özet; ayrıntı 7 gün | Büyük |
| 8 | Isınma seti işareti (sayımlara girmez) | Gemini | Ayrı ısınma kartı var (`warmupSets`) | Küçük–Orta |
| 9 | Tarif: "tamamı 640 g, ben 180 g yedim" akışını görünür kılma | Codex | `rcCooked` var | Küçük–Orta |

## B. Eksik / zayıf yönler

| # | Konu | Kaynak | Doğrulama | Zorluk |
|---|---|---|---|---|
| 10 | Yakınlaştırma kapalı (`user-scalable=no, maximum-scale=1.0`) — erişilebilirlik | Codex | Doğru (`src/markup.html` viewport) | Orta (iOS'ta yazı kutusuna odakta kendiliğinden yakınlaşma denetlenmeli) |
| 11 | `renderAll` her çizimde `invalidateFoodDB` + `refreshFoodSnaps`; `flushSave` her kayıtta bütün parçaları `stringify` | Codex + Gemini | Doğru; ölçülen (PC): 5 yıllık veride kayıt ~7 ms, dokunuş ~5 ms → iPhone'da ölçülmeli | Küçük–Orta |
| 12 | `foods.js` (416 KB) açılışta eşzamanlı | Codex + Gemini | Doğru; tembel yükleme menü/arama bağımlılığı yüzünden riskli, önce iPhone'da ölç | Orta |
| 13 | Paylaşım kartında büyük fotoğraf belleği | Codex | Tahmin; eski iPhone'da denenmeli | Orta |

## C. Aşama B listesine eklenecek

- Haptics (zaten planlı) + ana ekran araç takımı (Widget: kalan kalori / sıradaki antrenman) — Gemini.
- PWA → yerel uygulama veri taşıma senaryoları (temiz kurulum, tekrar içe aktarma, yarıda kapanma, iCloud'da daha yeni kopya) — Codex (zaten listede, test senaryoları eklendi).
- Önerilmeyen (şimdilik): kas haritası için Web Worker, global kapsamı modüllere bölme.
