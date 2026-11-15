// v47: İngilizce sözlük, ortak metinler (bildirim, pencere, depolama/yedek uyarıları, üst panel). Anahtar = Türkçe metin.
Object.assign(EN, {
  // ortak düğme ve pencere kelimeleri
  "Tamam": "OK", "Vazgeç": "Cancel", "Kaydet": "Save", "Geri al": "Undo", "Geri alındı": "Undone",
  "Değiştir": "Change", "Atla": "Skip", "Yedekle": "Back up", "Profil": "Profile",
  // bildirimler
  "Hata: {m}": "Error: {m}", "bilinmeyen": "unknown",
  // dinlenme sayacı
  "Dinlenme": "Rest", "Dinlenme • {ad}": "Rest • {ad}", "{ad} bitti!": "{ad}: done", "BİTTİ!": "DONE",
  // gün dönümü
  "Yeni gün! Su, takviye, öğün ve mobilite tikleri sıfırlandı.": "New day started. Water, supplement, meal and mobility ticks have been reset.",
  "Yeni güne geçilsin mi?": "Start a new day?",
  "Su, takviye, öğün ve mobilite tikleri sıfırlanır. Bugünün özeti Beslenme → Geçmiş'e kaydedilir.": "Water, supplement, meal and mobility ticks will be reset. Today's summary is saved in Nutrition → History.",
  "Yeni güne geç": "Start new day",
  // tema düğmesi, profil fotoğrafı
  "Koyu temaya geç": "Switch to dark theme", "Aydınlık temaya geç": "Switch to light theme",
  "Fotoğraf seç": "Choose photo", "Profil fotoğrafı güncellendi": "Profile photo updated",
  "Fotoğraf yüklenemedi": "Couldn't upload photo",
  "Bu fotoğraf açılamadı. Başka bir fotoğraf seçmeyi dene.": "This photo couldn't be opened. Try choosing a different one.",
  "Profil fotoğrafı kaldırıldı": "Profile photo removed",
  // depolama, kurtarma, yedek uyarıları
  "Bu verilerle devam ediliyor": "Continuing with this data",
  "Bu verilerle devam": "Continue with this data",
  "Veriler kaydedilemedi! Hemen yedek al.": "Your data couldn't be saved. Back it up now.",
  "Kayıt deposu açılamadı. Verilerin güvende; uygulamayı tamamen kapatıp yeniden aç. Bu açılışta yapılan değişiklikler kaydedilmez.": "Couldn't open the storage. Your data is safe: fully close the app and reopen it. Changes made in this session won't be saved.",
  "Kayıtlı veriler okunamadı. Okunamayan hâli saklandı: Profil → Yedekleme'den indirebilir veya geri yüklemeyi deneyebilirsin.": "Your saved data couldn't be read. The unreadable copy was kept: you can download it or try restoring it from Profile → Backup.",
  "Son yedeğin {n} gün önce. Verilerini korumak için yedekle.": {
    one: "Your last backup was {n} day ago. Back up to keep your data safe.",
    other: "Your last backup was {n} days ago. Back up to keep your data safe."
  },
  "Henüz hiç yedek almadın. Verilerin sadece bu telefonda.": "You haven't made a backup yet. Your data is only on this phone.",
  "Uyarıyı 3 gün gizle": "Hide reminder for 3 days",
  // besin veritabanı sağlığı
  "Besin veritabanı yüklenemedi. Uygulamayı tamamen kapatıp yeniden aç.": "Couldn't load the food database. Fully close the app and reopen it.",
  "{n} besin veritabanında bulunamadı; \"⚠\" işaretliler son kayıtlı değerleriyle hesaplanıyor.": {
    one: "{n} food wasn't found in the database; items marked \"⚠\" use their last saved values.",
    other: "{n} foods weren't found in the database; items marked \"⚠\" use their last saved values."
  },
  "Bulunamayan besin": "Missing food",
});
