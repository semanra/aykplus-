# AYK+ — Dış inceleme paketi (v57, 16 Kasım 2026)

Bu dosya, uygulamayı başka yapay zekâlara (ChatGPT, Gemini, Grok vb.) inceletmek için hazırlandı. Aşağıdaki "Gönderilecek metin" bölümünü olduğu gibi kopyalayıp yapıştırın; yanına `Masaüstü\AYK+ inceleme paketi\` klasöründeki ekran görüntülerini ekleyin. Gelen yanıtları bu sohbete yapıştırın; birlikte değerlendirip hangilerini yapacağımıza karar veririz.

---

## Gönderilecek metin

Merhaba. Kişisel bir fitness uygulaması geliştiriyorum ve App Store'a çıkmadan önce bağımsız, dürüst bir değerlendirme istiyorum. Övgüye değil, eksiklere ve risklere odaklan.

**Uygulama:** AYK+ — beslenme (makro/kalori takibi), antrenman (set/kilo kaydı), mobilite/esneme ve ilerleme takibi tek uygulamada. Türkçe ve İngilizce, kg/lb.
**Canlı adres (iPhone Safari'de açıp "Ana Ekrana Ekle" ile denenebilir):** https://semanra.github.io/aykplus-/
**Ekli:** ekran görüntüleri (Beslenme, Antrenman, Mobilite, İlerleme, Profil, açılış, koyu ve aydınlık tema, İngilizce).

**Teknik durum:**
- Şu an bir PWA (web uygulaması). Sunucu, hesap ve bulut yok; bütün veri telefonda (IndexedDB + yedek kopya). Çevrimdışı çalışır.
- Sıradaki adım: Capacitor ile gerçek iPhone uygulaması, ardından bildirimler/titreşim, sonra App Store başvurusu (önce ücretsiz, abonelik sonra).
- Besin veritabanı USDA (yaklaşık 1.800 besin) + 124 Türk yemeği tarifi, barkod okuma Open Food Facts ile.
- Hedef hesabı: Mifflin-St Jeor / Katch-McArdle, hareketlilik çarpanı, Ver/Koru/Al hedefi, kanıta dayalı protein (yağsız kütle / hedef kilo referanslı), yağ kalorinin %25'i.
- Antrenman: set zorluğu (Kolay–Tükeniş), kilo artırma önerisi, dinlenme haftası notu, plaka hesaplayıcı, makine kademeleri, rekorlar, paylaşım kartı.
- Mobilite: rutinler, rehberli seans (süre/tekrar, sağ/sol), 104 hareket ve "nasıl yapılır", isteğe bağlı sesli yönlendirme.
- İlk açılışta 7 adımlı kurulum, örnek menü/program/rutin seçeneği, otomatik iç yedekler.

**Lütfen şu başlıklarla değerlendir (her maddede: sorun, neden önemli, öneri, öncelik Yüksek/Orta/Düşük):**
1. **İlk izlenim ve kullanılabilirlik:** yeni bir kullanıcı ilk 5 dakikada neyi anlamaz, nerede takılır? Ekranlar fazla mı kalabalık?
2. **Görsel tasarım:** tutarlılık, okunurluk, renk/tema, simge ve açılış animasyonu. Neresi "amatör" görünüyor?
3. **Özellik eksikleri:** benzer uygulamalarda (MyFitnessPal, Strong, Hevy, MacroFactor vb.) olup burada olmayan, kullanıcının gerçekten arayacağı şeyler. Gereksiz ya da kaldırılması gereken bir şey var mı?
4. **Hesap ve içerik doğruluğu:** kalori/protein hesabı, kilo artırma mantığı, mobilite talimatları; sağlık açısından riskli bir şey var mı?
5. **App Store riskleri:** Apple inceleme kuralları (özellikle 4.2 "web sitesini kutulama", sağlık uygulaması kuralları, gizlilik formu), reddedilme ihtimali yüksek noktalar.
6. **Profil bölümü:** şu an tek uzun sayfa (kişisel bilgiler, kilo, hedefler, ölçüler, 12 satırlık ayarlar, yedekleme, bulunamayan aramalar, hakkında). Nasıl düzenlenmeli?
7. **İsim ve konumlandırma:** "AYK+" adı ve uygulamanın mağazadaki tanıtımı için öneriler; hedef kitle kim olmalı?
8. **En önemli 5 öneri:** sadece beş madde, önem sırasına göre.

Kısa ve somut yaz; genel geçer tavsiye yerine bu uygulamaya özel konuş.

---

## Ekran görüntüleri listesi (klasördeki dosyalar)

Klasör: `Masaüstü\AYK+ inceleme paketi\` — v57 kontrol aracının çektiği ekranlar (koyu + aydınlık), İngilizce ekranlar, açılış animasyonu kareleri ve antrenman özeti.

## Bizim tarafımızdaki bağlam (yapay zekâlara gönderilmez)

- Kendi denetimimiz: `docs/ANALIZ-v57-denetim.md` (kalan eksikler, Profil fikirleri, yol haritası).
- Yol haritası: `docs/YOL-HARITASI-appstore.md`.
