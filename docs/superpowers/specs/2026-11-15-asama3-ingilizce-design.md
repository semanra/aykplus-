# Aşama 3 — İngilizce (v46–v49) Tasarımı

Tarih: 15 Kasım 2026 · Durum: taslak (kullanıcı onayı bekliyor)
Üst belge: `docs/YOL-HARITASI-appstore.md` → Aşama 3.

## 1. Amaç ve neden

AYK+ App Store'a TR + EN çıkacak (14 Kasım 2026 kararı). Aşama 3, uygulamanın bütün arayüzünü İngilizce kullanılabilir yapar. İlk hedef ABD **değil**; genel İngilizce konuşan kullanıcı (İngiltere, Avrupa, Avustralya — kg/cm kullanan ülkeler).

Kullanıcının kalite şartı (kelimesi kelimesine): "çeviriyi düzgün yap, kafadan sağma … her anlam düzgün otursun". Yani İngilizce metin, o ekranda o anlamı taşıyan, doğal, bir İngilizce fitness uygulamasında beklenecek ifade olmalı; kelime kelime çeviri kabul edilmez.

## 2. Hedefler / hedef olmayanlar / başarısızlık sayılanlar

**Hedefler**
- Uygulamanın her arayüz metni Türkçe ve İngilizce.
- Dil: yeni kurulumda telefon diline göre (Türkçe değilse İngilizce), Profil'den değiştirilebilir.
- Sayı ve tarih biçimi dile göre (TR `72,5` · `1.250` · "15 Kas"; EN `72.5` · `1,250` · "15 Nov").
- Örnek içerik (kurulumdaki örnek menü/program/esneme) seçilen dilde oluşturulur.
- Besin/yemek adları, hareket rehberleri, Hakkında İngilizce (v49).

**Hedef olmayanlar (bu aşamada)**
- lb ve inç (vücut kilosu ve boy dahil) — ilk karar "lb işini sonra getiririz"; 16 Kasım 2026'da Aşama 3'ün son sürümü v53 olarak eklendi (§6, §10).
- Üçüncü bir dil.
- Kullanıcının kendi yazdığı/kaydettiği adların (öğün, besin, program günü, rutin) çevrilmesi — bunlar kullanıcı verisidir.

**Başarısızlık sayılanlar (teknik olarak çalışsa bile)**
- Sahibin Türkçe ekranında herhangi bir değişiklik (yazı, yerleşim, sayı biçimi).
- Sahibin telefonu İngilizce ayarlı olduğu için uygulamanın kendiliğinden İngilizceye geçmesi.
- Yarı Türkçe yarı İngilizce bir ekranın kullanıcıya görünmesi.
- Sözlük gibi duran, anlamı oturmayan, tutarsız terimli çeviri.
- Kayıtlı verinin dil değişince bozulması (ör. antrenman geçmişi anahtarları).

## 3. Kısıtlar

- Depolama anahtarı ve veri yapısı kuralları aynen (CLAUDE.md §5). Yeni alan `settings.lang` `normalizeState` ile varsayılanlı; `migrateState` adım 5 + `DATA_VER` 5.
- Veri katmanındaki Türkçe küçük harf/normalize işlemleri (`exKey`, `normSearch`, `mobNorm` vb.) dile göre DEĞİŞMEZ; yalnızca ekranda gösterilen biçimler dile bağlanır. Kayıtta karşılaştırma için tutulan metinler (ör. `ser.metric === "Tahmini 1RM"`) Türkçe sabit kalır, yalnızca gösterilirken çevrilir.
- Tailwind sınıf adları sabit metin (değişmez kural).
- Hız: `t()` her çizimde çağrılacak; tek bir nesne aramasıyla sınırlı kalmalı (her dokunuş ~5 ms bütçesi korunur).
- Telefon diline bakmak YALNIZCA kayıt hiç yokken (yeni kurulum).

## 4. Yaklaşımlar (seçilen: A)

- **A) Türkçe metin anahtar (seçildi).** Kodda `t("Bugün")`; İngilizce sözlük `"Bugün": "Today"`. Türkçe seçiliyken `t()` metni olduğu gibi döndürür → sahibin ekranı yapı gereği değişmez. Eksik çeviri Türkçe görünür, testler listeler. Aynı Türkçe yazının iki anlamı varsa bağlam işaretiyle ayrılır.
- B) Kod adlı anahtarlar (`t("beslenme.bugun")`, tr/en ayrı dosyalar): alışılmış ama ~2.000 metni yerinden taşır, Türkçe ekranı bozma riski en yüksek, kod okunmaz olur. Reddedildi.
- C) Dile göre ayrı derleme: uygulama içinden dil değiştirmek zorlaşır, her şey iki kez test edilir. Reddedildi.

Kullanıcı A'yı seçti ("A yolundan devam et").

## 5. Tasarım

### 5.1 Çeviri işlevi
- `t(tr, vars)`: `lang === "tr"` ise `tr` (yer tutucular doldurularak), değilse `EN[tr]` ?? `tr`.
- Yer tutucu: `t("{n} gün kaldı", { n: 5 })`. Metin birleştirme ile cümle kurmak YASAK (İngilizcede kelime sırası farklı); cümleler bütün hâlde, değişkenler yer tutucu olarak çevrilir.
- Çoğul: İngilizcede tekil/çoğul farkı var (1 day / 2 days). `tn(n, "{n} gün", ...)` gibi bir yardımcı; İngilizce girişte `{one, other}` biçimi.
- Bağlam: aynı Türkçe metin farklı anlamda geçiyorsa `t("Set|ayarla")` gibi bağlam ekli anahtar; Türkçe gösterimde `|` sonrası atılır.
- Sözlük: `src/app/` içinde ayrı dosya(lar), ekrana göre gruplu, gerektiğinde her girişin yanında Türkçe bağlam notu (yorum). Derlemede birleşir.
- Statik işaretleme (`src/markup.html`, ~230 metin): `data-t` öz niteliği; açılışta ve dil değişince tek geçişle çevrilir (Türkçede dokunulmaz).
- `html lang` dil ile güncellenir.

### 5.2 Dil seçimi ve göç
- `settings.lang` = `"tr" | "en"`.
- `migrateState` adım 5: mevcut her kayıt `lang: "tr"` alır (sahip asla otomatik İngilizceye geçmez).
- Yeni kurulum: `navigator.language` Türkçe ile başlıyorsa `tr`, değilse `en`. Kurulumun ilk adımında dil değiştirilebilir.
- Profil → Ayarlar → Dil (Türkçe / English). Değişince tam yeniden çizim.
- **İngilizce seçeneği v49'a kadar gizli**: yeni kurulumda da `tr` seçilir; testler gizli bir bayrakla İngilizceyi açar. v49'da (her ekran çevrilip denetlenince) görünür olur.

### 5.3 Sayı ve tarih
- `fmtNum`, `fmtKg`, `fmtInt` ve tüm `toLocale…("tr-TR")` gösterim çağrıları tek bir `locale()` yardımcısına bağlanır (TR `tr-TR`, EN `en-GB`).
- Gün kısaltmaları (`["Pt","Sa",…]` 4 yerde) ve ay adları tek yardımcıdan.
- Giriş okuma `num()`: iki dilde de hem `,` hem `.` ondalık kabul eder (bugün de öyle); değişmez.
- Paylaşım kartı (canvas) ve sesli yönlendirme (`u.lang`) dile göre.

### 5.4 Uygulamanın ürettiği adlar
- Kullanıcı verisine dönüşen varsayılan adlar ("1. Gün", "Kahvaltı", "Rutinim", örnek program/menü/rutin adları) oluşturulduğu andaki dilde yazılır; sonradan dil değişince kayıtlı adlar değişmez (kullanıcı verisi).
- Örnek içerik üreticileri (`14-ornek-icerik.js`) dile göre ad üretir.

### 5.5 Çeviri kalitesi süreci (kullanıcının şartı)
1. **Terim sözlüğü (v46, ilk iş):** ~80 temel kavram için tek İngilizce karşılık (ör. antrenman günü / dinlenme günü, menü, öğün, tonaj, kademe, dinlenme haftası, set zorluğu etiketleri, açık/fazla, koruma kalorisi, yağsız kütle, ısınma, rutin, seans). Karşılıklar yerleşik İngilizce fitness/beslenme uygulamalarındaki ve kanıta dayalı kaynaklardaki yaygın kullanıma bakılarak seçilir (kopya değil, terim tutarlılığı). Sözlük `docs/i18n-terimler.md` içinde, her terimin yanında neden o seçildiği; kullanıcıya gösterilir.
2. **Bağlamla çeviri:** her metin, ekranı ve işlevi bilinerek çevrilir; sözlük ekrana göre gruplu, belirsiz girişlerde Türkçe bağlam notu.
3. **Bağımsız ikinci okuma:** her sürümde çevrilen ekranlar İngilizce ekran görüntüleriyle ayrı bir gözden geçiriciye okutulur: anlam doğru mu, doğal mı, terim sözlüğüne uygun mu, sağlık/hesap metinleri doğru mu.
4. **Mekanik denetimler (test):** İngilizce modda ekranlarda Türkçeye özgü karakter (çğıöşü…) kalmadı (kullanıcı verisi hariç); her sözlük girişinin yer tutucuları Türkçesiyle aynı; kullanılmayan/eksik giriş listesi; `kontrol` aracı İngilizce ekranları da çeker (taşma, 44 px, okunurluk).
5. **Sağlık ve yöntem metinleri** (Hakkında, `HEALTH_NOTE`, protein/kalori açıklaması, koç uyarıları) ayrıca dikkatle; yerleşik terimler (TDEE, lean body mass, calorie deficit/surplus).
6. v49 sonunda: İngilizcesi iyi bir kişinin göz atması için ekran listesi (isteğe bağlı, kullanıcı karar verir).

## 6. Sürümler

| Sürüm | İçerik |
|---|---|
| **v46** | `t()`/`tn()`/bağlam, `data-t`, `settings.lang` + göç (adım 5, DATA_VER 5), gizli dil seçeneği, sayı/tarih yardımcıları (tüm `tr-TR` gösterimleri), terim sözlüğü belgesi, eksik/yer tutucu/Türkçe karakter testleri. Örnek olarak alt menü ve sekme başlıkları İngilizce. Türkçe ekran piksel olarak aynı (kontrol). |
| v47 | Beslenme + Profil + ortak pencereler/bildirimler. |
| v48 | Antrenman (yayınlandı 16 Kasım 2026, `4a89e67`). |
| v49 | Mobilite: ana ekran, rutin, hareket ekle/detay, rehberli seans ekranı (yazılar; sesli yönlendirme v52), v48'den kalan iki metin (sürükleme bildirimi "move", seans sonu sesli cümlenin yazı kısmı). |
| v50 | İlerleme (Genel/Kilo/Güç/Beslenme, koç `coachAnalysis`/`progCoachHtml`, grafik penceresi), ilk açılış kurulumu (7 adım), örnek içerik üreticileri (kayıtlı-metinler a3: dile göre üret). |
| v51 | Besin adları: USDA İngilizce adları (`scripts/usda/` kaynağından), besin kategorileri, `f.kx` notları, porsiyon adları; **124 Türk yemeği tarifinin adı İngilizcede de Türkçe kalır** (kullanıcı kararı 16 Kasım 2026); hareket adlarındaki Türkçe parantezler (geçmiş anahtarı `exKey` korunarak, yalnızca gösterimde). |
| v52 | Hareket rehberleri ve mobilite adımları (`MOB_GUIDE`, `MOB_LIB_V39`), Hakkında/sağlık notu/gizlilik/lisanslar, paylaşım kartı, sesli yönlendirme (en-GB ses); son genel denetim (Türkçe harfsiz Türkçe kelime taraması dahil: "dk", "sn", "set"…); **İngilizce seçeneği görünür olur** (`EN_PUBLIC = true`). |
| v53 | **lb / inç** (kullanıcı kararı 16 Kasım 2026: "hazır detaylı girdiysek lb'yi de ekleyelim"): vücut kilosu, set kilosu, plaka/kademe, boy ve ölçüler. Başlamadan önce kısa tasarım kararları (bkz. §10). |

**Bölme kararı (16 Kasım 2026):** kullanıcı, limiti aşmamak için eski v48 ve v49 satırlarını ikiye böldürdü; her sürüm tek oturuma sığacak boyutta. Her sürümün ayrıntılı planı o sürüme başlarken yazılır (önceki sürümün sonuçlarına göre), kullanıcı "devam" deyince.

Her sürüm ayrı spec bölümü değil, ayrı plan (`docs/superpowers/plans/`).

## 7. Kesin doğrulama (her sürüm)
- Türkçe: `npm run kontrol` → bütün ekranlarda piksel farkı yok (v46'da hiç; sonraki sürümlerde yalnızca bilinçli farklar).
- Sahibin kaydı (fikstür) ile açılış: dil `tr`, kurulum yok, hedefler aynı (2478 / 180 / 69 / 284).
- Telefon dili `en-US` iken sahibin kaydı açılınca Türkçe kalır (test).
- Dil değiştir → geri değiştir: kayıtlı veri bayt bayt aynı (yalnızca `settings.lang` farkı).

## 8. Ek kararlar (kurucu okumasından; Claude'un kararları, kullanıcı inceler)
1. **Sabit Türkçe listeler** (`data.js` kütüphaneleri, `MOB_GUIDE`, `SWAP_GROUPS`, `EFFORT_LABELS`, `SUPP_PRESETS`, `TAB_TITLES`, `MOB_REGIONS` adları…) yerinde Türkçe veri olarak kalır; çeviri **gösterildiği anda** yapılır: `t(TAB_TITLES[k])`. Anahtar Türkçe metin olduğu için ayrıca kod adı gerekmez ve dil açılışta "donmaz". Kullanıcı verisine Türkçe ek yapıştıran cümleler (ör. "…'ı", "…ler") yer tutuculu bütün cümleye çevrilir. Hangi ekranın hangi sürümde sarılacağı §6 tablosundaki ekran bölünmesiyle belirlenir.
2. **Kayıtta tutulan / karşılaştırılan Türkçe metinler:** v46'nın ilk görevi bunların tam listesini çıkarmak (`ser.metric`, `timeLabel`, `"Eski yazım"`, `m.balanced`, varsayılan adlar vb.). Liste plana eklenir; bu metinler kayıtta Türkçe kalır, yalnızca gösterilirken çevrilir.
3. **Sahip v46–v48 boyunca İngilizce görmez** (seçenek gizli, yalnızca test bayrağı). Bu yüzden v47–v48 yarım çeviriyle güvenle yayınlanabilir; "yarı Türkçe ekran görünmesin" şartı v52'de İngilizce görünür olduğunda sağlanmış olmalı.
4. **Dil değişimi** yalnızca Profil → Dil ve kurulumun ilk adımından yapılır; o anda başka pencere/seans/sayaç ekranı açık olamaz. Değişince `data-t` geçişi + Profil ve `renderAll()` yeniden çizilir; açık bir `uiDialog` varsa kapanır. Dinlenme sayacı hapı bir sonraki saniyede yeni dille çizilir.
5. **Tarih/kayıt anahtarları** (`YYYY-AA-GG`, `dailyLogs`, `logicalToday`) dile göre değişmez. `num()` iki dilde de tek virgülü ondalık okur (bugünkü davranış); sayı giriş kutularına binlik ayırıcı hiç yazılmaz (yalnızca salt okunur gösterimlerde `fmtInt`), böylece "1,250" belirsizliği oluşmaz.
6. Test tohumu (`TEST_INIT`, fikstürde `dataVer` yok) göç adım 5'ten geçer ve `lang: "tr"` alır; v46 bunu test eder.
7. **Bağımsız ikinci okuma** (§5.5.3) her sürümde en yetenekli modelde ayrı bir gözden geçirici ajan tarafından yapılır ve sürümü **durdurabilir** (bulduğu anlam hataları düzeltilmeden yayın yok). İnsan (İngilizce bilen biri) okuması v52 sonunda isteğe bağlı.

## 9. Kurucuya bırakılanlar
- Sözlük dosyalarının bölünmesi (tek dosya ya da ekran başına) ve `tn()` imzası.
- `data-t` geçişinin ayrıntısı.
- Terim sözlüğünün hangi kaynaklara bakılarak hazırlanacağı (gerekçe belgede yazılı olmak şartıyla).


## 10. lb / inç (v53) — başlamadan önce konuşulacak kararlar (Claude'un önerileriyle)
1. **Kayıt birimi:** öneri — kayıt her zaman kg/cm kalır, yalnızca gösterim ve giriş çevrilir; AMA set kilosunda yuvarlama sorunu var (45 lb = 20,41 kg; geri çevrilince 45,0 lb tutmalı). Öneri: sette girilen değer kg'a çevrilip 3 ondalıkla saklanır, gösterimde lb'ye çevrilip en yakın 0,5 lb'ye yuvarlanır; test: 45/95/135/225 lb gidiş-dönüş birebir.
2. **Plakalar:** lb seçiliyse plaka takımı 45/35/25/10/5/2,5 lb ve boş bar 45 lb; kg'da bugünkü takım. Kademeler ve artış adımı (2,5 kg ↔ 5 lb) birime göre.
3. **Ayar:** birim dilden bağımsız ayrı ayar (`settings.units = metric | imperial`); İngilizce seçen İngiliz kullanıcı kg'da kalabilir. Varsayılan metrik; Profil ve kurulumda seçilir. Göç adımı + DATA_VER.
4. **Kapsam:** vücut kilosu, hedef kilo, tartılar, set kilosu, plaka/kademe, tonaj (volume), boy (ft/in), ölçüler (in), su (fl oz mu, L mi — öneri: L kalır). Besin gramajı g kalır (beslenme takibinde yaygın).

### §10 kararları (kullanıcı onayı, 16 Kasım 2026)
- Öneriler 1–4 olduğu gibi onaylandı (kayıt kg/cm, gösterim/giriş çevrilir; lb plaka takımı + 45 lb bar, adım 5 lb; kapsam yukarıdaki gibi, besin g ve su L kalır; ayrı ayar `settings.units`).
- Yeni kurulumda birim **telefonun bölgesine göre**: ABD bölgesi (`navigator.language` / `Intl` bölgesi `US`) → `imperial`, diğer her yer `metric`; kurulumda ve Profil'de değiştirilebilir. Var olan kayıt göçte `metric` alır.
- Makine kademe listesi (`ex.levels`) lb seçiliyse lb'ye çevrilerek gösterilir; kullanıcı listeyi lb olarak düzenleyebilir (kayıt kg).

