# Dış inceleme — v80/v81 (26 Kasım 2026)

İnceleyenler: **Codex** (GPT-6.2 Sol, depoyu klonladı, `ce536d1` = v80; derleme + Chromium 69/69 geçti, WebKit Linux'ta açılamadı) ve **Gemini Pro** (src/app/*.js, üç .txt dosyası; v81 kaynağı). Her bulgu Claude tarafından kodda doğrulandı.

**v82'de düzeltildi:** 1–6, 8–21 (#9 kullanıcı kararıyla: yağ %20, yine aşarsa not). Ertelendi: #7.

Durum: ✔ = doğrulandı (gerçek) · ~ = gerçek ama dar/kenar durum · ✗ = geçersiz · ⏭ = Aşama B (Capacitor) işi

## Veri ve güvenlik

| # | Kaynak | Yer | Bulgu | Durum | Öneri |
|---|---|---|---|---|---|
| 1 | Codex | `01-temel.js normalizeExercise`, `10 exRightText` / `gymActiveHtml` satır 369 | İçe aktarılan yedekteki `ex.rest` sayıya çevrilmeden `exRightText` ile HTML'e yazılıyor (XSS). | ✔ | `rest` normalizeExercise'da 0–3600 tamsayı; 369'da `esc(exRightText(ex))`. |
| 2 | Codex | `08 restoreFromText` | `{"meals":true}` gibi AYK+ olmayan bir dosya onaydan sonra kabul ediliyor, veri neredeyse boşalıyor (öncesi iç yedekte duruyor). `storageSnapshotNow` hata verirse geri yükleme yine sürüyor. | ✔ | Tür denetimi (meals/workoutDays dizi, en az bir gerçek alan); iç yedek yazılamazsa geri yükleme durur. |
| 3 | Codex | `01-temel.js normalizeStateInner` satır 401 | Bilerek boşaltılan dinlenme günü menüsü (`restMeals: []`) her açılışta antrenman menüsüyle yeniden doluyor. | ✔ | Yalnızca `restMeals` alanı hiç yoksa (eski kayıt) kopyala. |
| 4 | Codex | `04 updateProfile` | Kalori açığı kaydırıcısı oynatılınca kilo da kaydırıcının 0,5 adımına yuvarlanıyor (70,2 → 70). v81'de de var. | ✔ | Kilo yalnız kilo kaydırıcısı oynatılınca yazılsın. |
| 5 | Codex | `00-depolama.js storageInit` catch | IndexedDB açılıp okunamazsa ayna yazılabilir açılıyor; o oturumun değişiklikleri sonraki açılışta IndexedDB'nin (daha büyük sıra no) altında kalabiliyor. | ~ | Satır 113'teki gibi `storeGen += 1e6`; ayna kapalıysa salt okunur (satır 117 gibi). |
| 6 | Codex | `05 historyFor`, `finishAndLogWorkout` | "constructor", "toString" adlı özel hareket `Object.prototype`'tan değer alıyor → çökme. | ~ | `Object.hasOwn` + dizi denetimi. |
| 7 | Codex | `00 flushSave` / `writeMirror` | Aynı cihazda iki sekme açıkken biri diğerinin kaydını ezebiliyor. | ~ | iPhone PWA'da tek pencere; şimdilik ertelenebilir (ileride BroadcastChannel uyarısı). |

## Hesaplama

| # | Kaynak | Yer | Bulgu | Durum | Öneri |
|---|---|---|---|---|---|
| 8 | Codex | `03 getTargets`, `renderWeightBlock` | Güvenli alt sınır (1.400 / 1.750) devreye girince ekranda "−500" ve "~N hafta" yazıyor ama gerçek açık daha küçük. | ✔ | Gerçek fark (`calTarget − tdee − calAdjust`) gösterilir, alt sınır notu. |
| 9 | Codex | `03 getTargets` | Düşük kalori + yüksek proteinde makroların toplamı hedefi aşabiliyor (karbonhidrat en az 60 g kuralı). | ✔ | Kullanıcı kararı: yağ önce %20'ye insin, yine aşarsa not. |
| 10 | Gemini | `09 applyCoach` | Alt sınırdayken koçun "+150" önerisi uygulanınca hedef değişmeyebiliyor (calAdjust birikmiş). | ✔ | calAdjust doğrudan `newTarget − (tdee + goalDelta)` olur. |
| 11 | Gemini | `09 coachAnalysis` | Son tartıdan sonraki günlerin kalorisi de ortalamaya giriyor. | ~ | Kalori ortalaması son tartı gününde kesilir. |
| 12 | Gemini | `36 recapData` | Aylık özette kalori ±%5 (50 kcal alt sınırsız), protein %90; İlerleme'de ±max(50, %5) ve %95 → iki ekran farklı gün sayısı verebilir. | ✔ | Aynı kural (`hitClass`, %95). |
| 13 | Gemini | `05 paceText` | 5:59,8 /km → "5:59" (60 sn 59'a kırpılıyor). | ✔ | Toplam saniyeden hesap. |
| 14 | Gemini | `09 platesFor` / `renderPlateTool` | Plaka aracına 10.000.000 yazılırsa yüz binlerce plaka → donma. | ✔ | Kilo üst sınırı (ör. 1.000 kg) + döngü sınırı. |

## Arayüz / bellek

| # | Kaynak | Yer | Bulgu | Durum | Öneri |
|---|---|---|---|---|---|
| 15 | Gemini + Codex | `04 onBarcode`, `startScan` | Ürün aranırken pencere kapatılırsa yanıt gelince etiket formu açılabiliyor; kamera izni beklenirken kapatılırsa kamera açık kalabiliyor. | ✔ | Arama / kamera sonrası oturum (token) denetimi, geç gelen akış durdurulur. |
| 16 | Gemini | `09 suggestionHtml`, `openMeasureModal` | "Şimdi değil" 36 px, ölçü "İptal" / "Kaydet" ~32 px (44 px kuralı). | ✔ | `min-h-[44px]`. |
| 17 | Gemini | `31 shareBlob`, `32 paintMuscleMap3d` | Büyük tuvaller iş bitince boşaltılmıyor (iOS tuval belleği). | ✔ | `cv.width = cv.height = 0`. |
| 18 | Codex | `32 loadMapImg` | `getContext()` null dönerse yükleme sözü hiç bitmiyor. | ~ | onload hatası reject. |
| 19 | Codex | `31 sharePickPhoto` | Fotoğraf açılamazsa nesne URL'si serbest kalmıyor. | ✔ | Hata yolunda `revokeObjectURL`. |
| 20 | Gemini | `35 renderCalendar` | Takvimde geri gitme yalnız antrenman kayıtlarına bakıyor; yalnız mobilite olan aya gidilemiyor. | ✔ | mobilityLog da sayılır. |
| 21 | Gemini | `sw.js` IMG_CACHE | Önbellekte olmayan görsel çevrimdışı istenince yakalanmamış hata. | ✔ | `.catch(() => Response.error())`. |

## Aşama B (Capacitor / App Store) — şimdi değil, plana yazıldı ⏭

- `support.html`: GitHub dışında giriş gerektirmeyen destek e-postası (Gemini).
- `privacy.html` / `support.html` PWA ifadeleri ("GitHub Pages", "ana ekrana ekle") yerel uygulamaya göre (Gemini); gizlilikte sıfırlama sonrası iç yedek kaldığı gerçeği (Codex).
- Kamera izni metni "Ayarlar → Safari → Kamera" → yerelde "Ayarlar → AYK+ → Kamera" (Gemini).
- `saveTextFile` / `shareFileOut` → `@capacitor/filesystem` + `@capacitor/share` (ikisi).
- `13 bootApp` service worker kaydı yalnız web'de (ikisi).
- PWA'dan yerel uygulamaya veri taşıma: ilk açılışta belirgin "PWA yedeğini içe aktar" adımı (Codex).
- iCloud yedeğinde son sağlam kopyanın ezilmemesi: atomik yazma, önceki sürümü saklama (Codex).
- iOS paketine foods.js, foods-en.js, vendor/, img/ alan `webDir` derleme adımı (Codex).
- Info.plist / PrivacyInfo.xcprivacy şablonları (Gemini teklif etti).
