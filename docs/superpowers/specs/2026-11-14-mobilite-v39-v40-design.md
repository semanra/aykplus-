# Mobilite v39–v40: rutinler, rehberli seans, düzenleme — tasarım

Tarih: 14 Kasım 2026 · Taslak: `tasarimlar/mobilite-v39.html` (+ `.png`) · Önceki tasarım: `2026-11-12-mobilite-design.md` (v27)

## Neden

Kullanıcı mobilite bölümünü "boş" buluyor. İncelemede iki gerçek eksik çıktı:

1. **Rutini baştan sona yapmanın yolu yok.** Sayaç yalnızca tek bir süreli hareket için açılıyor, sonrakine geçmiyor; tekrarlı hareketlerin akışı yok. Evde yalnızca mobilite yapmak isteyen biri için en büyük eksik bu.
2. **Düzenleme gizli.** Harekete dokununca detay açılıyor, sıralama yalnızca "Tümü"de sürükleyerek; belirgin bir "Düzenle" yok.

Ayrıca: kütüphanede hareketin nasıl yapıldığı yazmıyor, her gün sessizce tutulan mobilite günlüğü hiçbir yerde görünmüyor, antrenmanla bağ yok. App Store yolunda (bkz. `docs/YOL-HARITASI-appstore.md`) herkesin kullanacağı bir bölüm olmalı.

## Kullanıcının kararları

- Onaylanan maddeler: **2** nasıl yapılır, **3** bölge takibi, **4** antrenmana bağlama (ısınma), **5** birden fazla rutin, **6** sesli sayaç. Ek: **Başlat** (rehberli seans) ve belirgin **Düzenle**.
- Esneklik testleri (madde 1) bu turda YOK.
- Taslak beğenildi. Bölge kutuları ana ekrana taşınıp "son çalışma"yı gösterir (dolan kutu görünümü kalkar) — onaylandı.
- **Hareket adları İngilizce kalır**, altında Türkçe ad YOK. "Nasıl yapılır" adımları Türkçe.
- **Video yok.** Poz resimleri (anatomy.jpg tarzında başlangıç/bitiş) ileride; v39–v40 sonrası, App Store öncesi. Bu sürümlerde resim alanı ayrılmaz (sonra eklenir).
- Isınma kartı hareketleri yalnızca **kullanıcının kendi rutinlerinden** seçer (kullanıcı "hazır program şablonu" istemiyor).

## Hedefler / hedef olmayanlar

Hedefler: rutin seçip tek dokunuşla baştan sona yapmak; rutinleri görünür biçimde düzenlemek; her hareketin nasıl yapıldığını görmek; haftalık süreklilik ve bölge ihmalini görmek; antrenman öncesi uygun ısınmayı tek dokunuşla başlatmak; ekrana bakmadan yapabilmek (ses).

Hedef olmayanlar: esneklik testleri, video/resim, hazır rutin şablonları, bildirim (iOS sınırı), Apple Sağlık.

Başarısızlık sayılır: mevcut rutinin veya günlüğün kaybolması; seansın yarıda kalınca yapılanları kaydetmemesi; düzenlemenin yine bulunamaması.

## Yaklaşımlar

- **A (seçilen): Ana ekran = rutin kartları + Başlat; rutinin içi + Düzenle; tam ekran seans.** Başlatma ve düzenleme ilk bakışta görünür; birden fazla rutini doğal taşır.
- B: Bugünkü tek liste kalır, üstte rutin sekmeleri (çipler) + "Başlat". Daha az değişiklik ama çok rutinde sıkışık, başlat yine liste içinde kaybolur.
- C: Rutin yok, yalnızca "Tümünü başlat". Madde 5 karşılanmaz.

## Tasarım

### Veri (eski veri kaybolmaz)

- `state.mobilityRoutine.routines = [{ id, name, items }]` (items bugünkü `normMobItem` biçimi; `done` hareket başına kalır).
- Göç (`normalizeState`, bir kez): `routines` yoksa → `items` (yoksa eski `dynamic`/`static` → `mobFromLegacy`) tek rutine taşınır: `{ id: "mr_main", name: "Rutinim", items }`, ardından `mobilityRoutine.items` silinir (veri taşındı, kopya tutulmaz). `routines` varken eski diziler hiç okunmaz. Eski `dynamic`/`static` dizilerine dokunulmaz (Aşama 1'de ele alınacak).
- `routines` boş olabilir (kullanıcı hepsini sildiyse); yeni kurulumda varsayılan bir rutin `DEFAULT_STATE`'ten gelir.
- Erişim tek yardımcıdan: `mobRoutines()`, `mobAllItems()` (tüm rutinlerin hareketleri). Bugün `mobilityRoutine.items` kullanan yerler (`archiveDay`, `resetDaily`, İlerleme şeridi, antrenman kas haritası 10-antrenman:744) `mobAllItems()`'a geçer.
- `mobilityLog[gün]` biçimi DEĞİŞMEZ (ad listesi). Bölge "son çalışma" adlardan çözülür: ad → bölge eşlemesi tüm rutinlerin hareketleri + `MOB_LIB_REGIONS`; bilinmeyen ad yok sayılır. Bugün canlı tiklerden.
- Ayar: `settings.mobVoice` (v40, varsayılan kapalı). `settings.mobSound` aynı.
- Eski formatla test zorunlu (v27 öncesi `dynamic/static`, v27–v38 `items`) + `bozuk_veri.py`, `html_enjeksiyon.py` (rutin adı yeni kullanıcı alanı).

### Ekranlar (taslaktaki numaralar)

1. **Ana ekran** (`mobUI.view = "home"`, mobilite açılınca): bu hafta kaç gün + üst üste gün (seri: bugün veya dünden geriye kesintisiz günler; bugün henüz yapılmadıysa seri dünden sayılır) + Pt–Pz şeridi; rutin kartları (ad, hareket sayısı, ~süre, ana bölgeler, "Dün yapıldı / 3 gün önce", **Başlat**, **Aç**); "+ Yeni rutin"; bölgeler · son çalışma (Bugün / Dün / N gün önce / hiç; 7+ gün sarı).
2. **Rutinin içi** (`view = "routine"`): geri, rutin adı, **Düzenle**; bugünkü kart listesi (tik, süreli harekette tek-hareket sayacı, dokununca detay); altta sabit **Başlat · N hareket · ~X dk** (her zaman baştan).
3. **Düzenle** (`mobUI.edit`): rutin adı kutusu (`data-fk`), satırlarda tutamaç (mevcut sürükle-bırak) + çöp (Geri al'lı), satıra dokununca bugünkü detay sayfası; **+ Hareket ekle** (mevcut ekle ekranı, bu rutine ekler), **Kopyala**, **Rutini sil** (onay + Geri al). **Bitti** ile çıkılır.
4–5. **Seans** (tam ekran, mevcut `#mobTimer` katmanı genişler): üstte "Rutin adı · 4 / 8" + çubuk, kapat, ses. Süreli hareket: bugünkü nefes dairesi akışı (tur → ses → 5 sn ara → sonraki tur); bitince **sıradaki harekete geçer** (kapanmaz). Tekrarlı hareket: büyük tekrar sayısı + "SET 1/2 · SOL TARAF" + taraf/set kutuları; **Bitti** sonraki adıma, **Önceki** bir hareket geri. Her harekette "Nasıl yapılır" (açık/kapalı tercihi kayıtsız, seans boyunca hatırlanır); altta "Sıradaki: …". Atla = hareketi atla (tiklenmez). Biten hareket o anda tiklenir ve kaydedilir (seans yarıda kapanırsa yapılanlar kalır).
   Sıra: **her zaman rutinin başından, rutindeki bütün hareketler sırayla** (kullanıcı kararı: atlanan/yapılmayan hareket ileride "kalan" diye öne çıkarılmaz; ne yapılacağına kullanıcı rutinini düzenleyerek karar verir, uygulama yönlendirmez). Bugün önceden tiklenmiş hareketler de sırada gelir.
6. **Bitiş**: hareket / dakika / atlanan sayısı, bu hafta kaçıncı gün, seri, liste; **Tamam** → rutinin içine.
7. **Isınma kartı (v40)**, Antrenman → Bugün, antrenman başlamadan önce: günün hareketlerinin kaslarından bölgeler (Göğüs→göğüs, omuz · Sırt→omurga, omuz · Omuz/Biceps/Triceps→omuz · Ön Bacak→kalça, ayak bileği · Arka Bacak & Kalça→kalça, arka bacak · Kalf→ayak bileği · Karın→omurga); tüm rutinlerden bu bölgelerdeki **dinamik** hareketler, en fazla 4, ada göre tekil. Uygun hareket yoksa kart görünmez. Bugün mobilite yapıldıysa kart tek satıra küçülür. Başlat aynı seansı "Isınma" adıyla açar; biten hareketler kendi rutinlerinde tiklenir.

### Nasıl yapılır

`MOB_GUIDE` (data.js): kütüphanedeki 37 hareketin her biri için Türkçe 3–4 adım + 1 "Dikkat" notu; anahtar hareketin İngilizce adı (kesme işareti farkı yok sayılır). Kullanıcının rutinindeki hareket adıyla eşleşirse detay sayfasında ve seansta görünür; elle eklenen hareketlerde görünmez (yerine hareketin notu). Kullanıcının hareket adlarına dokunulmaz.

### Sesli sayaç (v40)

`speechSynthesis` (tr-TR ses). Söyler: hareket adı + "sağ taraf / sol taraf", "sola geç", "son 10 saniye", "bitti", seans sonunda "Rutin bitti". Seans ekranındaki ses düğmesi + Profil'de aç/kapa. iOS sınırı (kullanıcıya dürüstçe söylenir): uygulama ekrandayken çalışır; sessiz modda ve uygulama kapalıyken konuşmaz. Ses yoksa sessizce atlanır.

### Sürümler

- **v39:** veri göçü + rutinler, ana ekran (hafta/seri, bölge son çalışma dahil), rutin içi, Düzenle, seans (süreli + tekrarlı), bitiş, `MOB_GUIDE`.
- **v40:** antrenmandaki ısınma kartı, sesli sayaç.

## Kısıtlar

CLAUDE.md §5 kuralları: depolama anahtarı aynı, `esc()`, 44 px, `data-fk`, silme = snapshot → sil → renderAll → offerUndo, temalı pencereler (`askConfirm/askText`), renkler yalnızca `--t-*` değişkenleri (aydınlık tema dahil), emojisiz metinler, Türkçe doğru yazım. Sayaç zamanı bitiş saatine göre (arka plandan dönünce ilerler). v34 kuralı: yalnızca açık ekran çizilir.

## Uygulayıcıya kalanlar (benim kararlarım, kullanıcı görebilir)

- Rutin kartındaki "~X dk": süreli hareketlerde `mobTotalSec`, tekrarlı harekette tekrar başına 4 sn + taraf/set (yaklaşık).
- "+ Yeni rutin" adı temalı pencereyle sorulur; boş rutinle rutinin içine (Düzenle açık) gidilir.
- Bölge sarısı eşiği 7 gün.
- `test_v27_mobilite.py` ve kontrol ekran listesi (`scripts/kontrol/ortak.py`: m-liste/m-detay/m-ekle/m-sayac) yeni yapıya uyarlanır; yeni ekranlar (ana, düzenle, seans-tekrar, bitiş) eklenir.
