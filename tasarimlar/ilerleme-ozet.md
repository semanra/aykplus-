# İlerleme sekmesi: tasarım önerileri (2. tur, 14 Kasım 2026)

Dosyalar: `ilerleme-A.html`, `ilerleme-B.html`, `ilerleme-C.html` (tarayıcıda açılır; iPhone genişliği).
Ekran görüntüleri: `ilerleme-A-390.png` / `-320.png`; B'de her alt sekme ayrı (`ilerleme-B-genel-390.png` …); `ilerleme-C-390.png` / `-320.png`.
Üretici: `python tasarimlar/_uret_ilerleme.py --png`. Örnek veri; "bugün" = 14 Kasım Cumartesi. 12 Kasım'daki 1. tur (amber / mercan / sekme renkleri) git geçmişinde: `caac5fe`.

## 1. Bugünkü İlerleme sekmesi: neler var, hangi veriyi gösteriyor?

| Bölüm | Gösterdiği veri | Kaynak (`state`) |
|---|---|---|
| Akıllı kalori koçu | Son 4 haftanın tartıları ve yenen kaloriden gerçek harcama (TDEE), kilo hızı, önerilen kalori düzeltmesi; "Öneriyi uygula" | `weightLogs`, `dailyLogs`, `settings.coachAppliedAt` |
| Bu hafta | Antrenman sayısı, rekor sayısı, toplam tonaj, kardiyo (dk / km), ortalama su ve hedefi | `workoutLogs`, `dailyLogs.water` |
| Haftalık kas grubu setleri | 9 kas grubu için bu haftanın set sayısı, 10–20 set öneri bandı | `exerciseHistory` |
| Kilo takibi | Şu anki kilo, ilk kayıttan değişim, hedefe kalan, yağ oranı / yağsız kütle / yağ kütlesi, son 40 tartının grafiği, son 6 tartı (silinebilir), "kg kaydet" | `weightLogs`, `settings.targetWeight`, `settings.bodyFat` |
| Vücut ölçüleri | Bel, göğüs, kol, kalça vb. son değer ve değişim, seçilen ölçünün grafiği, son 4 kayıt (silinebilir), "Ölçü ekle" | `measurements` |
| Antrenman takvimi | Son 5 hafta, antrenman yapılan günler, son 4 haftada kaç gün | `workoutLogs` |
| Hareket ilerlemesi | Seçilen hareketin tahmini 1RM grafiği ve son kayıtları | `exerciseHistory` |
| Kişisel rekorlar | Her hareketin en iyi seti (tahmini 1RM, kilo × tekrar, tarih); dokununca grafik | `exerciseHistory` |
| Geçmiş (su ve beslenme) | 7 / 14 / 30 günlük su ve kalori grafikleri, ortalamalar, gün gün liste | `dailyLogs` |
| (Gösterilmiyor) | Mobilite günlüğü: her gün yapılan hareketler (v27'den beri sessizce kaydediliyor) | `mobilityLog` |

Yeni önerilerde hepsi korunuyor. Mobilite günlüğü ilk kez gösteriliyor: takvimde ve haftalık özette.

## 2. Renk düzeni (üç öneride ortak)

**"Grafit + kaynak renkleri"**
- Zemin ve kartlar Antrenman ve Profil ile aynı siyah aileden (`#000` / `#141416` / `#1E1E21`).
- Dokunulan her şey (düğme, seçili sekme, alt menü) kırık beyaz `#F4F4F5`, üstündeki yazı `#09090B`. Profil v28'deki "Grafit" ile aynı.
- Veriler geldikleri sekmenin rengini taşıyor: antrenman turkuaz `#1FD1C1`, beslenme yeşil `#22C55E`, mobilite lavanta `#B3A6FF`, su mavi `#4EA8DE`, kilo nötr beyaz.

**Neden kendine ait bir vurgu rengi yok?** ui-ux-pro-max palet veritabanı fitness için turuncu (`#F97316`), analiz panoları için mavi + amber öneriyor. İkisi de uygulamadaki makro renklerine çarpıyor:
- Turuncu, yağ (`#E27C66`) ile karb (`#E5B85B`) arasına düşüyor.
- Mavi, protein (`#58B9F7`) ve su (`#4EA8DE`) ile karışıyor.

İlerleme diğer sekmelerin verisini topladığı için rengi veriye bırakmak en tutarlısı: turkuaz bir çubuk her yerde "antrenman" demek.

## 3. Grafik kuralları (ui-ux-pro-max `chart`)

| Veri | Seçilen tür | Neden |
|---|---|---|
| Kilo (30 gün) | **Çizgi**: günlük tartılar soluk nokta, 7 günlük ortalama kalın çizgi | Zaman ekseni. Ortalama, su/tuz dalgalanmasını gizler. Hedef 82 kg çizilirse grafik ezilir; kalan miktar yazıyla. |
| Kilo (haftalar) | **Çizgi**, 8 haftalık ortalama | Uzun vadeli eğilim |
| Tahmini 1RM | **Çizgi** (≥ 4 seans) / **sayı kartı** (< 4 seans, örn. Squat) | "4 noktadan az → sayı kartı" kuralı |
| Rekorlar | Liste + küçük eğilim çizgisi (320 px'te gizlenir) | Değer okunur; çizgi yalnızca yön gösterir |
| Kas başına set | **Yatay bullet**, azalan sıra, 10–20 bandı kesik çerçeve, durum yazıyla (az / uygun / fazla) | Hedefe göre karşılaştırma. Bant renksiz, çizgi deseniyle. |
| Haftalık tonaj | **Dikey çubuk**, 8 hafta | Kategori (hafta) karşılaştırma. Bitmemiş hafta yarı saydam ve "Bu h." yazılı, yanıltmasın diye. |
| Kalori / su (7 gün) | **Dikey çubuk** + kesik hedef çizgisi | Hedefe göre gün gün. Aşım çizgili desen + "↑", işaretlenmemiş gün kesik çerçeve + "*", bugün yarı saydam. |
| Antrenman takvimi | **Takvim ızgarası** (35 hücre) | Antrenman = dolgu + kalın rakam + ✓, mobilite = alt çizgi, bugün = beyaz çerçeve |
| Vücut ölçüleri (2 kayıt) | **Sayı kartları** + değişim oku | 4 ölçümden önce grafik yok |
| Haftalık şerit (B, C) | Simgeli ızgara | ✓ yapıldı/hedefte, ~ yakın, ! uzak (renk + şekil) |

**Renk körlüğü:** hiçbir yerde anlam yalnızca renkle verilmiyor. Her çizginin ucunda adı ve değeri yazıyor. Durumlar simge (✓ ~ ! ↑ *) ve desenle (çizgili, kesik çerçeve) gösteriliyor. Açıklamalar her grafiğin altında.

**Kurallar:** Dokunma alanları ≥ 44 px, emoji yok (çizgi simgeler), 12 px altı yazı yalnızca grafik eksenlerinde (11 px). 390 ve 320 px'te yana taşma yok (üretici her ekranda ölçüyor).

**Yok:** İlerleme fotoğrafı, sporcu/PR paylaşım kartı, "Body" istatistik ekranı, sıralama tablosu, rozet/topluluk. "Hareketlerin en iyileri" mevcut "Kişisel rekorlar" listesinin devamıdır; paylaşılan bir kart değil.

## 4. Üç öneri

**A · Tek akış (pano).**
- Her şey tek kaydırmalı sayfada, kullanım sıklığına göre dizili: haftalık 4 sayı kutusu (antrenman, kilo ortalaması, kalori hedefi, mobilite), koç, kilo, antrenman (takvim, tonaj, kas setleri, 1RM, en iyiler), beslenme (kalori, su), vücut ölçüleri.
- Bölüm başlıkları kaynak rengindeki küçük kareyle ayrılıyor.
- En az dokunuş isteyen öneri. Bugünkü sekmeye en yakın olduğu için alışmak kolay; ama sayfa uzun.

**B · Alt sekmeler.**
- Beslenme ve Antrenman'daki gibi üstte dört alt sekme var: Genel · Kilo · Güç · Beslenme.
- Genel'de iki sayı kutusu, koç ve "Bu hafta, gün gün" şeridi: antrenman / beslenme hedefi / mobilite × 7 gün, simgeli.
- Her sekme kısa ve odaklı; kilo sekmesinde günlük ve haftalık iki ayrı çizgi var.
- Diğer sekmelerle aynı gezinme alışkanlığı. Bir bilgiye ulaşmak için bazen bir dokunuş fazla.

**C · Haftalık rapor.**
- Her hafta bir rapor: üstte "46. HAFTA" ve hafta okları, tek cümlelik özet ("Bu hafta 3 antrenman yaptın…"), ardından "Geçen haftaya göre" tablosu (6 ölçü, oklu fark).
- Sonra koç, 5 haftalık takvim, haftalık kilo ortalaması, kalori. En altta "Uzun vade" (1RM, kas setleri, ölçüler) ve önceki haftaların listesi.
- Haftayı değerlendirmek için en iyisi. Günlük "bugün ne durumdayım" bakışı A kadar hızlı değil.

**Önerim: A**, B'nin "Bu hafta, gün gün" şeridiyle birlikte. Sabah tartıdan sonra veya salonda tek bakışta her şeyi gösteriyor, uygulamanın bugünkü yapısını bozmuyor. Şerit, mobilite verisini ve haftanın düzenini en kısa yoldan gösteriyor.
