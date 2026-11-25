# v71 — Çalışan kaslara göre esneme önerisi (25 Kasım 2026)

Kaynak: `docs/YOL-HARITASI-appstore.md` → "1 — HEMEN", madde 5. Kullanıcı: "4.yü bitir" (25 Kasım 2026).

## Ne yapar
Son 48 saatte biten antrenmanlarda çalışan kaslara uygun **esneme / gevşetme** hareketlerini önerir.
Önerilen hareketler mobilite kütüphanesinden gelir (kullanıcının rutininde olmaları gerekmez).

## Nerede
1. **Mobilite ana ekranı** (`#mobHome`), en üstte kart `#mobSuggest`:
   - Solda küçük **lavanta 3D kas haritası** (`paintMuscleMap3d`, yeni temalar `lav` / `lavLight`).
   - "Son 2 günde çalışan kaslar: Göğüs · Omuz · Triceps", "5 hareket · ~7 dk".
   - Hareket adları listesi (görselleri kütüphanedeki hareket görselleriyle aynı).
   - **Başlat** (`#mobSuggestStart`): rehberli seans (v39 seansıyla aynı ekran).
   - **Rutin olarak kaydet** (`#mobSuggestSave`): öneriyi yeni bir rutin olarak ekler ("Esneme önerisi"), Geri al'lı.
2. **Antrenman bitiş özeti**: öneri varsa "Esneme önerisi" düğmesi (`#finStretch`) → Mobilite sekmesi.

Son 48 saatte antrenman yoksa kart görünmez (boş kart yok).

## Seçim kuralı
- Kas → hareket listesi elle seçildi (`MUSCLE_STRETCH`, öncelik sırasıyla; önce ekipmansız esnemeler, sonra rulo/top).
- Kaslar set sayısına göre çoktan aza; sırayla her kastan bir sonraki kullanılmamış hareket (round-robin); **en fazla 6 hareket**.
- Küçük kaslar (Ön Kol, Boyun, İç Bacak, Kaval) yalnız çalışıldıysa girer (set > 0 kuralı zaten bunu sağlar).

## Kayıt
- Öneri **kaydedilmez** (her açılışta yeniden hesaplanır). Seanstaki hareketler geçici öğelerdir (`mobSuggestItems`, kimlik `sg_…`).
- Seansta biten hareketin adı bugünün `state.mobilityLog[gün]` listesine eklenir (gece arşivi zaten birleştirir; biçim aynı) →
  haftalık gün sayısı, seri ve bölge "son çalışma" doğru güncellenir.
- "Rutin olarak kaydet" normal rutin oluşturur (`normMobItem` + `mobFromLegacy`, kütüphaneden eklemeyle aynı).

## Ayar
- `settings.mobSuggest` (varsayılan **açık**; `normalizeState`'te boolean değilse `true`). Profil → Antrenman bölümü `#setMobSuggest`
  ("Kaslara göre esneme önerisi"). Kapalıyken öneri hiçbir yerde görünmez; rutinlere ve verilere dokunulmaz.
- Veri sürümü (DATA_VER) değişmez: yeni alan yalnızca varsayılanla eklenir.

## Dil
Bütün metinler `t()` ile; İngilizce karşılıklar `22-en-mobilite.js`.

## Test
`tests/test_v71_esneme_onerisi.py`: seçim kuralı (kas sırası, 6 sınırı, tekillik), 48 saat sınırı, kart/harita, seans + mobilityLog,
rutin olarak kaydet + Geri al, ayar kapalıyken hiçbir yerde yok, bitiş özeti düğmesi, İngilizce, eski kayıt (ayar alanı yok → açık).
