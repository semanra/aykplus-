# Mobilite sekmesi: tasarım incelemesi için soru metni

Aşağıdaki metni, `tasarimlar/` klasöründeki dosyalarla birlikte inceleme yapacak sohbete (Gemini, ChatGPT, başka bir Claude sohbeti) yapıştır. En az şu iki dosyayı ekle:

- `mobilite-son.png`: son tasarımın ekran görüntüleri (4 ekran alt alta)
- `mobilite-son.html`: aynı tasarım; tarayıcıda açılabilir, iPhone genişliğinde (390 px)

İstersen karşılaştırma için `mobilite-A.png`, `mobilite-B.png` ve `mobilite-C.png` dosyalarını da ekleyebilirsin. Bunlar ilk üç öneri; son tasarım bunlardan birleştirildi.

---

Merhaba. **AYK+** adlı kişisel fitness uygulamamın **Mobilite** (esneme ve eklem hareketliliği) sekmesi için yeni bir tasarım hazırladık. Senden bu tasarım hakkında eleştirel bir görüş istiyorum.

## Uygulama hakkında

- iPhone'da ana ekrana eklenen bir web uygulaması (PWA). Türkçe. Tek kullanıcı: ben.
- Veriler yalnızca telefonda duruyor. Sunucu, hesap ya da bildirim yok.
- Dört sekmesi var: Beslenme, Antrenman, Mobilite, İlerleme.
- Antrenman sekmesinin teması:
  - saf siyah zemin `#000`, yüzey `#141416`, yükseltilmiş yüzey `#1E1E21`, çizgi `#2A2A2E`;
  - metin beyaz / `#A1A1AA` / `#8B8B93`;
  - tek vurgu rengi turkuaz `#1FD1C1`;
  - başlıklar ve sayılar için Barlow Condensed 800 italik (uygulamada adı "AYKDisplay").
- Mobilite bu temanın "kardeşi" olacak. Aynı aileden, ama kendi vurgu rengi var: lavanta `#B3A6FF`.

## Bugünkü Mobilite sekmesinde ne var? (yeni tasarımda hepsi korunmalı)

- İki liste:
  - **Dinamik** hareketler (ısınma; genelde 1 set × 8–10 tekrar);
  - **Statik** esnemeler (genelde 2 set × 30–45 sn).
- Her harekette:
  - yapıldı tiki;
  - uygulama metni ve not, ikisi de düzenlenebilir;
  - silme, "Geri al" ile.
- Statik hareketlerde sayaç: −15 sn / +15 sn / Atla. Süre bitince ses çalar.
- Kütüphane: 3 kategoride 37 hazır hareket (Dinamik, Statik, Foam roller). Listede olmayan hareket elle eklenebilir.
- "Tikleri sıfırla" düğmesi var; tikler gece yarısı da kendiliğinden sıfırlanır.
- Mobilite için geçmiş ya da istatistik tutulmuyor.

## Yeni tasarım (son hâli)

- **Ana ekran:** Üstte altı vücut bölgesi var: Kalça, Omuz, Omurga, Göğüs, Arka bacak, Ayak bileği. Her bölge o gün yapılan hareketler kadar alttan dolar. Bir bölgeye dokununca yalnızca onun hareketleri listelenir. Her kartta "Dinamik" ya da "Statik" etiketi var.
- **Hareket detayı:** Set ve süre −/+ ile ayarlanır. Ayrıca taraf (tek / sağ ve sol), tür (dinamik / statik), bölge ve not seçilir. Altta "Kaldır" ve "Sayacı başlat" düğmeleri var.
- **Sayaç:** Halka yerine yavaşça büyüyüp küçülen bir nefes dairesi var ("4 sn al, 6 sn ver"). Altta hangi tarafta ve hangi turda olunduğu kutularla gösteriliyor.
- **Hareket ekle:** Kütüphane bölgeye göre gruplanıyor. Tür filtresi ve "Elle ekle" seçeneği var.

## Senden istediklerim

Her başlık için **en önemli 3–5 bulguyu** önem sırasıyla yaz. Mümkünse hangi ekranda olduğunu da belirt.

1. **Kullanılabilirlik:** Spor salonunda, terli elle, iPhone'da kullanırken zorlanacağım bir yer var mı? Bir hareketi tiklemek, sayacı başlatmak ya da yeni hareket eklemek kaç dokunuş sürüyor; daha kısa olabilir mi?
2. **Bölge fikri:** Hareketleri vücut bölgesine göre gruplamak mantıklı mı? Bir hareket birden çok bölgeye giriyorsa (örneğin World's Greatest Stretch: kalça + omurga) nasıl göstermeli? Altı bölge doğru seçim mi?
3. **Sayaç:** Nefes dairesi işe yarar mı, yoksa dikkat mi dağıtır? Sağ/sol ve tur göstergesi anlaşılır mı?
4. **Görsel:** Lavanta vurgu, siyah zemin ve yazı tipi uyumlu mu? Kontrast, boşluk, hizalama ya da tutarsızlık açısından göze batan bir şey var mı?
5. **Eksik veya fazla:** Mevcut özelliklerden atlanan bir şey var mı? Gereksiz bulduğun bir parça var mı?

## Kurallar (önerilerin bunlara uymalı)

- Dokunma alanları en az 44 px olmalı.
- Emoji kullanılmamalı; yalnızca çizgi ikonlar.
- Sunucu, hesap ya da bildirim gerektiren bir öneri olmamalı. iPhone'da titreşim de yok.
- Kayıtlı verilerim silinmemeli. Yeni alanlar (bölge, set, süre, taraf) mevcut verilerden bir kez çevrilecek.
- Şunları istemiyorum: ilerleme fotoğrafı, sıralama tablosu, hazır program şablonu.

Cevabını Türkçe ve madde madde yaz. Emin olmadığın yerde "emin değilim" de.
