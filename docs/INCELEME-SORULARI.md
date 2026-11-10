# Dış inceleme için soru metni

Aşağıdaki metni zip dosyasıyla birlikte inceleme yapacak sohbete (Gemini, ChatGPT, başka bir Claude sohbeti) yapıştır.

---

Merhaba. Ekteki zip, kişisel kullanım için geliştirdiğim **AYK+** adlı fitness uygulamasının kaynak kodu.

Önce `docs/PROJE-OZETI.md` dosyasını oku. Mimari, kurallar ve özellikler orada.

Kısaca:

- **Ne:** iPhone'da ana ekrana eklenen bir PWA.
- **Teknoloji:** saf JavaScript (React değil). Kaynak `src/` altında üç dosya; derleme sonunda tek `index.html` olur.
- **Veri:** sadece telefonda, `localStorage` içinde.
- **Ekran görüntüleri:** `ekranlar/` klasöründe.

Senden şunlara bakmanı istiyorum. Her başlık için **en önemli 3–5 bulguyu** önem sırasıyla yaz. Her bulguda **dosya adı ve mümkünse fonksiyon adı** ver.

1. **Hatalar ve veri riski:** Kullanıcı verisini kaybettirebilecek, yanlış kalori/makro hesaplatabilecek ya da iPhone Safari'de bozulabilecek yerler var mı?
2. **Beslenme bölümü:** Gerçek günlük kullanımda kafa karıştıran ya da gereksiz uzun süren akışlar hangileri? Neyi sadeleştirirdin?
3. **Antrenman bölümü:** Ciddi antrenman yapan biri için eksik kalan en değerli 3 özellik ne olurdu? Lütfen şunları önerme, istemiyorum: ilerleme fotoğrafı, sıralama tablosu, hazır program şablonu, sporcu/PR kartı.
4. **Tasarım ve tema:** Ekran görüntülerinde göze batan boşluk, hizalama, renk kontrastı veya tutarsızlık var mı? Beslenme yeşil "Emerald Obsidian" temasında, antrenman siyah + turkuaz temada.
5. **Kod yapısı:** `src/app.js` yaklaşık 6.000 satır. Bakımı kolaylaştırmak için en düşük riskli 2–3 iyileştirme ne olurdu? Büyük bir yeniden yazım ya da React'e geçiş önermeni istemiyorum.

Kurallar (önerilerin bunlara uymalı):

- Depolama anahtarı ve veri biçimi geriye dönük uyumlu kalmalı.
- Besin değerleri asla tahmin edilemez.
- Dokunma alanları en az 44 px olmalı.
- Sunucu veya hesap gerektiren bir öneri olmamalı.

Cevabını Türkçe ve madde madde yaz. Emin olmadığın yerde "emin değilim" de.
