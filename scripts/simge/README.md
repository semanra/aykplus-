# AYK+ marka vektörleri (v55)

- `ayk-yazi.svg`: "AYK+" yazısı (sade, kesiksiz). Kaynak: kullanıcının Gemini görseli `Gemini_Generated_Image_7g2957g2957g2957.jpg` (Masaüstü). Başlıktaki Kinetic Slice ve açılış (Portal Zoom) bunu kullanır. İlk yol beyaz harfler, ikinci yol turkuaz `+`.
- `ayk-simge.svg`: uygulama simgesi (A seçeneği: hız kesikli harfler + `+` + kadran çizgileri, ızgara ve renkli noktalar YOK, siyah zemin, içerik genişliği %80). Kaynak: `Gemini_Generated_Image_owups0owups0owup.jpg`.

Üretim (yeniden gerekirse): `masks.py` (PIL ile beyaz/turkuaz maskeler) → `node tr.js` (npm `potrace@2.1.8` ile vektör) → `comp.py` (birleştirme). Görseller Masaüstünde durur; bu klasörde yalnızca sonuç ve betikler var.
