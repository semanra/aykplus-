# Mobilite v27 — Tasarım (spec)

Tarih: 12 Kasım 2026 · Görsel kaynak: `tasarimlar/mobilite-son.html` / `.png`
Durum: Kullanıcı kararları alındı; dış yapay zekâ yorumları uygulamadan **sonra** alınacak.

## Amaç
Mobilite sekmesini eski lacivert tasarımdan, antrenman temasının kardeşi olan lavanta temaya (`#B3A6FF`) taşımak; hareketleri vücut bölgesine göre izlenebilir, set/süre/taraf bilen bir sayaçla yapılabilir hâle getirmek. Mevcut her özellik korunur (tik, not, düzenleme, Geri al'lı silme, sayaç, kütüphane, elle ekleme, sıfırlama, gece sıfırlanma).

## Kullanıcı kararları
1. Bölge: her hareketin **ana** bölgesi + isteğe bağlı **ikincil** bölgesi. Ana 1 puan, ikincil 0,5 puan doldurur.
2. "Tümü" listesi **rutin sırasında** tek liste; varsayılan önce dinamik sonra statik; sürükle-bırak ile sıralanır.
3. **Günlük kayıt** sessizce tutulur (`state.mobilityLog`), ekranda gösterilmez.
4. Sayaç: tur bitince ses → 5 sn "taraf değiştir" arası → sonraki tur kendiliğinden; son turda hareket tiklenir.
5. Dinamik/tekrarlı hareketlerde "Tekrar" alanı, sayaç yok; her harekette Tekrar/Süre seçimi.
6. Mimari: yaklaşım A (tek liste + bir kerelik göç, `app.js` içinde v27 bölümü).

## Veri modeli
`state.mobilityRoutine.items[]`, her öğe:
`{ id, name, type: dynamic|static|release, region, region2, sets (1–10), mode: reps|time, reps (1–100), sec (5–600), sides: 1|2, note, rx, rxOk, done }`

Bölgeler (`MOB_REGIONS`, data.js): `hip` Kalça · `shoulder` Omuz · `spine` Omurga · `chest` Göğüs · `hamstring` Arka bacak · `ankle` Ayak bileği. Boş bölge = "Bölgesiz" (yalnızca Tümü'nde görünür).

`state.mobilityLog["YYYY-AA-GG"] = ["ad", ...]` — gün arşivlenirken yapılan hareketler; boş gün yazılmaz; hiç silinmez.

## Göç (normalizeState)
- `items` dizisi yoksa: `dynamic` (tür dynamic) + `static` (tür static; adı Foam roller kategorisindeyse release) sırayla çevrilir. `dynamic`/`static` dizileri **dokunulmadan yedek** kalır.
- `rx` = eski `prescription` metni. Okuma (`parseMobRx`):
  - Set: `N Set`, `N'er/şer Set`; yoksa 1.
  - Tekrar: `N(–M) Tekrar|Tur` → mode reps, üst değer.
  - Süre: `N(–M) sn|saniye` → mode time, üst değer. Eski `timerSec` varsa o kullanılır.
  - Taraf: `Sağ ve Sol`, `Sağ/Sol`, `Her Ayak|Kol|Yön|Bacak|Taraf` → 2.
  - Hiçbiri bulunamazsa `rxOk:false`; tür varsayılanı (dinamik 1×10 tekrar, diğerleri 2×30 sn); detayda "Eski yazım: …".
- Bölgeler kütüphanedeki ad eşleşmesinden (`r`, `r2`); eşleşmezse boş.
- Not, tik korunur. Bozuk kayıtlar (nesne değil / adsız) atılır; sayılar sınırlanır.
- Var olan `items` her açılışta `normMobItem` ile temizlenir.

## Kütüphane bölgeleri (data.js `r` / `r2`)
Dinamik: WGS hip/spine · 90/90 hip · Ankle Dorsiflexion ankle · Cat-Cow spine · Shoulder Dislocates shoulder/chest · Thoracic Rotation spine/shoulder · Deep Squat Hold hip/ankle · Scapular Push-Up shoulder · Cossack hip/hamstring · Leg Swings hip/hamstring · Inchworm hamstring/spine · Hip CARs hip · Shoulder CARs shoulder · Thread the Needle spine/shoulder · Pull-Apart shoulder · Glute Bridge March hip.
Statik: Doorway Pec chest/shoulder · Child's Pose shoulder/spine · Couch hip · Figure-4 hip · Hamstring hamstring · Pigeon hip · Frog hip · Hip Flexor hip · Butterfly hip · Calf ankle · Triceps & Lat shoulder/spine · Cross-Body shoulder · Neck shoulder/spine · Cobra/Sphinx spine/chest · Spinal Twist spine · Dead Hang shoulder/spine.
Foam roller: T-Spine spine · Lat shoulder · Quad/Hip Flexor hip · Glute hip · Plantar ankle.

## Ekranlar (hepsi `#mobRoot` içinde çizilir; sayaç ayrı tam ekran katman `#mobTimer`)
- **Tema:** `body.theme-mob` (siyah zemin, antrenman yüzeyleri, lavanta vurgu, `on-acc #1B1446`). `trainCtx()` Mobilite'yi de kapsar → temalı `uiAsk` pencereleri; lavantaya çevrilir. Eski `#mobilityHeaderBar` ve hedef seçim kutusu kaldırılır. Emoji yok.
- **Ana:** 3×2 bölge kartı (doluluk, "x / y" ya da "Tamam"); dokun → süz, tekrar dokun → Tümü. Başlık + "Tümü (yapılan / toplam)" düğmesi. Kart: 44 px tik, gövde → detay, süreli harekette sayaç düğmesi, Tümü'nde sürükleme tutamacı. Süzülmüş listede ikincil hareketler "ikincil" etiketiyle sonda. Altta "Hareket ekle" + "Sıfırla" (Geri al'lı).
- **Detay:** geri, "Bölge · n. hareket", ad (dokun → yeniden adlandır), Set −/+, Tekrar/Süre seçimi, Tekrar ±1 / Süre ±5, Taraf, Tür (3), Ana bölge, İkincil bölge (Yok + diğerleri), Not, önizleme satırı, Eski yazım; Kaldır (Geri al'lı) + Sayacı başlat (süreli). Anında kayıt.
- **Sayaç:** kapat, bölge, ses aç/kapa (`settings.mobSound`), ad, "Sağ taraf · 1. tur / 2", nefes dairesi (10 sn: 4 al / 6 ver; hareket azaltma tercihinde durur), kalan süre, −15 / +15 / Atla, tur kutuları. Bitiş zamanına göre hesap; arka plandan dönünce kaçırılan aşamalar ilerletilir. Açıkken ekran kararmaz (`keepAwake`).
- **Ekle:** kapat, arama, Tümü/Dinamik/Statik/Foam roller, ana bölgeye göre gruplar (seçili bölge önce, Bölgesiz en sonda), satırda "+" (pencere açık kalır, toast), "Rutinde" etiketi, "Listede yok mu? Elle ekle" → ad sorulur → detay açılır.

## Hata/sınır durumları
- iOS: uygulama kapalıyken / sessiz modda ses yok (bilinen sınır).
- Detayı açık hareket silinirse/Geri alınırsa listeye dönülür.
- Sayaç çalışırken hareket silinirse sayaç kapanır.
- Sayı girişleri yalnızca −/+ ile (klavye yok → odak sorunu yok); not ve ad metinleri `esc()`.

## Test
`tests/test_v27_mobilite.py`: eski kayıt göçü (sıra, rx okuma, timerSec önceliği, not/tik, yedek diziler, bozuk kayıt, okunamayan yazı), bölge doluluğu (ana/ikincil), süzme, detay düzenleme, ekleme/elle ekleme, sil + Geri al, sıfırla + Geri al, sürükle-bırak, sayaç akışı (tur → ara → sonraki → son turda tik), gün arşivi `mobilityLog`, 44 px, yatay taşma yok, ekran görüntüleri. Eski `test_v11` `startTimer` testi değişmez.

## Sürüm
v27; `sw.js` → `aykplus-v27`; CLAUDE.md'ye v27 notu.
