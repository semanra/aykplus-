// v49: İngilizce sözlük, Mobilite (terimler: docs/i18n-terimler.md bölüm 7). Anahtar = Türkçe metin.
// Kayıtta Türkçe kalanlar (MOB_REGIONS/MOB_TYPES anahtarları, rounds[].side "Sağ"/"Sol", rutin adları) docs/i18n-kayitli-metinler.md'ye göre.
Object.assign(EN, {
  // --- bölgeler, türler, taraflar (gösterim: mobRegionL / mobTypeL / mobSideL)
  "Kalça": "Hips", "Omuz": "Shoulders", "Omurga": "Spine", "Göğüs": "Chest", "Arka bacak": "Hamstrings", "Ayak bileği": "Ankles",
  "Dinamik": "Dynamic", "Statik": "Static", "Foam roller": "Foam rolling",
  "Sağ": "Right", "Sol": "Left",
  // --- sayaç geçişi (ekranda; konuşma v52'ye dek Türkçe)
  "Sola geç": "Switch to left", "Sağa geç": "Switch to right", "Sıradaki set": "Next set",
  // --- kayıt adları (yeni kopya/göç/onarım adı o anki dilde yazılır)
  "{ad} (kopya)": "{ad} (copy)", "Rutinim": "My routine", "Rutin": "Routine",
  // --- sürükleme bildirimi (mobiliteye özgü)
  "Hareket taşındı|mobilite": "Move reordered",
  // --- sesli yönlendirme kalıpları (v52'ye dek konuşma Türkçe; trFill ile Türkçe doldurulur, İngilizce girişler v52 için)
  "{ad} bitti. Tebrikler.": "{ad} finished. Well done.",
  "Başla": "Start", "Son 10 saniye": "Last 10 seconds",
  "Set {n}.": "Set {n}.", "{taraf} taraf.": "{taraf} side.", "Set {n}. {taraf} taraf.": "Set {n}. {taraf} side.",
  "{ad}. {sn} saniye.": "{ad}. {sn} seconds.", "{ad}. {sets} set, {sn} saniye.": "{ad}. {sets} sets, {sn} seconds.",
  "{ad}. {taraf} taraf. {sn} saniye.": "{ad}. {taraf} side. {sn} seconds.",
  "{ad}. {taraf} taraf. {sets} set, {sn} saniye.": "{ad}. {taraf} side. {sets} sets, {sn} seconds.",
  "{ad}. {tekrar} tekrar.": "{ad}. {tekrar} reps.", "{ad}. {sets} set, {tekrar} tekrar.": "{ad}. {sets} sets, {tekrar} reps.",
  "{ad}. {taraf} taraf. {tekrar} tekrar.": "{ad}. {taraf} side. {tekrar} reps.",
  "{ad}. {taraf} taraf. {sets} set, {tekrar} tekrar.": "{ad}. {taraf} side. {sets} sets, {tekrar} reps.",
});
