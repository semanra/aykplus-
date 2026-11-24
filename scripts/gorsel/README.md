# Hareket görselleri (v63)

Uygulamadaki görseller: `img/hareket/<no>.webp` (1024×576, şeffaf zemin, iki panel: başlangıç → bitiş).
Eşleme (hareket adı → görsel numarası): `harita.json` → `src/app/30-gorsel.js` içindeki `EX_IMG`.
16 hareket başka bir hareketin görselini kullanır (aynı hareket, farklı ad); bu yüzden 292 ad, 276 görsel.

## Kaynak
Ham görseller (Gemini / ChatGPT, beyaz zemin, büyük boy) depoda DEĞİL: kullanıcının masaüstü
`AYK+ Egzersizler/<no>..jpg` (+ 5 ilk deneme `Gemini_Generated_Image_*.jpg`: 1, 19, 20, 23, 32). Takip tablosu:
masaüstü `AYK+ Hareket Görselleri Takip.xlsx` (sayfa "Hareketler": No, ad, durum, ortak görsel).

## İşleme (`isle.py`, `hepsi.py`)
1. Arka plan: kenara değen ya da büyük saf beyaz alanlardan başlayıp keskin kenarı geçmeden yayılan bölge (`GRAD`);
   yumuşak kenarlı yer gölgeleri ayrıca eklenir (`SHADOW_*`; makine/figür kenarı serttir, gölge kenarı yumuşak).
2. Renkten saydamlığa: beyaz üstünde aynı görünür; renkli parıltı ve oklar koyu zeminde de dolu kalır.
3. Yanlış yönlü oklar silinir: 3, 21, 36, 66, 67, 85, 104 (`ARROWS`; çevresi tamamen arka plan olan renkli parça).
4. 19: makinedeki leke elle düzeltildi (`19_duzeltilmis.png`, betik oturum klasöründeydi; direk parçası yukarıdan kopyalandı).
5. Hafif açık kenar (`HALO`): ince koyu kablolar koyu temada da görünsün.
6. İçeriğe göre kırpılır, 1024×576'ya %5 boşlukla ortalanır, webp kalite 78 (toplam ~16 MB, ortalama ~58 KB).

Bilinen, kabul edilen: makine çerçevesinin içinde kalan küçük beyaz alanlar koyu temada beyaz görünür (otomatik
silme figürdeki parlak yerleri de siliyordu); bazı yer gölgelerinde küçük beyaz parçalar; 292'de beyaz masa yüzeyi saydam.

Önizleme: `python onizle.py <dosya.webp>` → koyu ve açık zeminde `_on.png`.

## Ölçü rehberi görselleri (v64, `olcu.py`)
Kaynak: masaüstü `AYK+ Ölçü Görselleri/olcu-<anahtar>.png` (ChatGPT, 1254×1254, beyaz zemin). `python scripts/gorsel/olcu.py`
→ `img/olcu/<anahtar>.webp` (720×720, şeffaf). bel/kalça/göğüs: sıkı ayar (`GRAD` 2, gölge birleştirme kapalı; yoksa açık renkli
uyluklar da silinir) ve yer gölgesi alttan kırpılır; kol: gövdenin düz kesildiği sağ kenar kırpılır.

## Paylaşım kartı kas haritası (v67, `kas_harita.py`)
Kaynak: `tasarimlar/_paylasim/kaynak-gemini.jpg` (Gemini Pro, 24 Kasım 2026; her kas grubu ayrı düz renk, siyah zemin).
`python scripts/gorsel/kas_harita.py` → `img/kas-harita.png` (palet PNG, yalnız 11 anahtar renk, 900 px, ~21 KB):
her piksel en yakın anahtar renge atanır, JPEG kenar gürültüsü `ModeFilter(5)` ile temizlenir, %3 boşlukla kırpılır.
Renk → kas eşlemesi `src/app/31-paylasim.js` `MAP_KEYS` ile aynı sırada. Önden görünümde baldır yok (anatomik olarak arkada).
