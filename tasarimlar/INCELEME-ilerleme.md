# İlerleme sekmesi: tasarım incelemesi için soru metni

Aşağıdaki metni, inceleme yapacak sohbete (Gemini, ChatGPT, başka bir Claude sohbeti) yapıştır. Şu dosyaları ekle:

- `ilerleme-A-390.png`, `ilerleme-B-genel-390.png` (ve B'nin kilo/guc/beslenme görüntüleri), `ilerleme-C-390.png`: üç önerinin ekran görüntüleri (her biri sayfanın tamamı); 320 px karşılıkları `-320.png`
- İstersen `ilerleme-A.html`, `-B.html`, `-C.html`: aynı tasarımlar; tarayıcıda açılabilir, iPhone genişliğinde
- Ayrıntılı açıklama: `ilerleme-ozet.md`
- Karşılaştırma için `mobilite-son.png`: uygulamanın yeni tasarlanmış kardeş sekmesi

---

Merhaba. **AYK+** adlı kişisel fitness uygulamamın **İlerleme** sekmesi için üç farklı tasarım önerisi hazırladık. Senden bunları karşılaştırıp eleştirel bir görüş vermeni istiyorum.

## Uygulama hakkında

- iPhone'da ana ekrana eklenen bir web uygulaması (PWA). Türkçe. Tek kullanıcı: ben.
- Veriler yalnızca telefonda duruyor. Sunucu, hesap ya da bildirim yok.
- Dört sekme var: Beslenme, Antrenman, Mobilite, İlerleme. Her sekmenin kendi vurgu rengi var:
  - Antrenman turkuaz `#1FD1C1`, Beslenme zümrüt yeşili `#22C55E`, Mobilite lavanta `#B3A6FF` (zemini indigo-siyah), Profil kırık beyaz `#F4F4F5` ("Grafit").
  - Ortak zemin: saf siyah `#000`, yüzey `#141416`, yükseltilmiş yüzey `#1E1E21`, çizgi `#2A2A2E`; metin beyaz / `#A1A1AA` / `#8B8B93`.
  - Başlıklar ve büyük sayılar için Barlow Condensed 800 italik (uygulamada adı "AYKDisplay").
- İlerleme şu an eski bir lacivert temada ve emojili; yeni tasarımla diğer sekmelerin ailesine katılacak.

## Bugünkü İlerleme sekmesinde ne var? (yeni tasarımda hepsi korunmalı)

- **Kalori koçu:** son 4 haftanın tartılarına bakıp hedef kaloriyi artırma/azaltma önerir; "Uygula" ile hedefe yazar.
- **Bu hafta:** antrenman sayısı, toplam tonaj, kardiyo (dk/km), ortalama su.
- **Kas grubu kartı:** bu hafta kas başına set sayısı.
- **Kilo takibi:** şu anki kilo, değişim, hedefe kalan, yağ oranı / yağsız kütle / yağ kütlesi, kilo grafiği, son tartılar (silinebilir), "kiloyu kaydet".
- **Vücut ölçüleri:** bel, göğüs, kol, kalça vb.
- **Antrenman takvimi:** son 5 hafta, antrenman yapılan günler işaretli.
- **Hareket ilerlemesi:** bir hareket seçilir, tahmini 1RM grafiği çıkar.
- **Kişisel rekorlar:** her hareketin en iyi seti (tahmini 1RM), dokununca grafiği açılır.
- **Geçmiş:** su ve beslenme grafikleri (7/30 gün).

## Üç öneri (ortak renk düzeni: "Grafit + kaynak renkleri")

İlerleme'nin kendine ait vurgu rengi yok: dokunulan şeyler kırık beyaz `#F4F4F5`, veriler geldikleri sekmenin rengini taşıyor (antrenman turkuaz, beslenme yeşil, mobilite lavanta, su mavi, kilo beyaz). Anlam hiçbir yerde yalnızca renkle verilmiyor (✓ ~ ! ↑ * simgeleri, çizgili/kesik desenler, çizgi uçlarında ad + değer). 4'ten az veri noktası olan yerde grafik yerine sayı kartı var.

- **A · Tek akış (pano):** tek kaydırmalı sayfa. 4 haftalık sayı kutusu, koç, kilo (günlük nokta + 7 günlük ortalama çizgisi), antrenman (5 haftalık takvim, tonaj çubukları, kas başına set bullet grafiği, 1RM, en iyiler), beslenme (kalori ve su çubukları, hedef çizgisi), vücut ölçüleri.
- **B · Alt sekmeler:** Genel · Kilo · Güç · Beslenme. Genel'de "Bu hafta, gün gün" şeridi (antrenman / beslenme hedefi / mobilite × 7 gün, simgeli).
- **C · Haftalık rapor:** "46. HAFTA" ve hafta okları, tek cümlelik özet, "Geçen haftaya göre" tablosu, koç, takvim, haftalık kilo ortalaması, kalori; altta uzun vade ve önceki haftalar.

Veriler örnektir (bugün 14 Kasım Cumartesi kabul edildi).

## Senden istediklerim

1. **Hangisi?** Üç öneriden hangisini seçerdin, neden? İkisinin birleşimi daha iyi olur mu (hangi parça hangisinden)?
2. **Kullanılabilirlik:** Spor salonunda ya da sabah tartıdan sonra hızlıca bakarken en önemli bilgiyi kaç saniyede görürüm? Tartı kaydetmek, bir hareketin grafiğini açmak kaç dokunuş?
3. **Grafikler:** Kilo grafiği günlük mü, haftalık ortalama mı olmalı? 1RM grafiği, kas başına set çubukları, 7 günlük kalori çubukları anlaşılır mı? Yanıltıcı bir ölçek var mı?
4. **"Bu hafta, gün gün" şeridi (B) ve "Geçen haftaya göre" tablosu (C):** işe yarar mı? Hangi ölçüler olmalı?
5. **Görsel:** Kendi vurgusu olmayan "Grafit + kaynak renkleri" düzeni diğer sekmelerle uyumlu mu, yoksa İlerleme'nin kendi rengi mi olmalı? Kontrast, boşluk, hizalama, tutarsızlık açısından göze batan bir şey var mı?
6. **Eksik veya fazla:** Mevcut özelliklerden atlanan bir şey var mı? Gereksiz bulduğun bir parça var mı?

Her başlık için **en önemli 3–5 bulguyu** önem sırasıyla yaz; hangi öneride ve hangi ekranda olduğunu belirt.

## Kurallar (önerilerin bunlara uymalı)

- Dokunma alanları en az 44 px olmalı.
- Emoji kullanılmamalı; yalnızca çizgi ikonlar.
- Sunucu, hesap ya da bildirim gerektiren bir öneri olmamalı. iPhone'da titreşim yok; Apple Sağlık bağlantısı web uygulamasında mümkün değil.
- Kayıtlı verilerim silinmemeli.
- Şunları istemiyorum: ilerleme fotoğrafı, paylaşılabilir sporcu/PR kartı, ayrı bir "vücut istatistikleri" ekranı (Lightweight uygulamasındaki "Body" gibi), sıralama tablosu, hazır program şablonu.

Cevabını Türkçe ve madde madde yaz. Emin olmadığın yerde "emin değilim" de.
