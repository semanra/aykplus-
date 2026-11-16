# Kayıtta tutulan Türkçe metinler (v46, Aşama 3 — İngilizce)

Amaç: Sonraki sürümlerde (v47–v49) görünen metinler `t("Türkçe metin")` ile sarılırken, **kullanıcı verisine yazılan, kodda karşılaştırılan ya da anahtara çevrilen** Türkçe metinlerin dile göre DEĞİŞMEMESİ. Bunlar kayıtta Türkçe kalır; yalnızca gösterilirken çevrilir (ya da hiç çevrilmez).

Kapsam: `src/app/*.js` ve `src/data.js`. Yalnızca görüntülenen düz metinler (yaklaşık 2000 adet) bilerek listelenmedi.

Satır numaraları v46 dalındaki (`1bced4b`) durumdur; kod değiştikçe kayar, ara satırlara değil ifadeye güvenin.

**Çeviride ne yapılmalı** sütunu:
- **dokunma** = kayıtta/karşılaştırmada olduğu gibi kalır, `t()` sarılmaz.
- **gösterirken t()** = kayıt Türkçe kalır; ekrana basılırken `t(kayıtlıMetin)` ile çevrilir (sözlükte tam metin anahtar olarak bulunmalı; bulunmazsa metin olduğu gibi görünür).
- **dile göre üret** = yeni kayıt oluşturulurken o anki dilde yazılır; var olan kayıt değişmez.

Tablo kısaltması: **K** = kayıt (state/yedek/ayna içine yazılıyor), **C** = karşılaştırma (kodda `===`, `includes`, regex vb.), **A** = anahtar (nesne/dizin anahtarı ya da arama anahtarı).

---

## (a) Kayıtta (state / localStorage) saklanan Türkçe metinler

### a1. Kullanıcıya otomatik verilen varsayılan adlar (normalizeState / DEFAULT_STATE)

| Konum | Metin | Tür | Çeviride ne yapılmalı |
|---|---|---|---|
| src/data.js:590 | `"1. Gün"` (DEFAULT_STATE.workoutDays[0].name; `freshState` → `normalizeState({})` bunu kullanır) | K (+C, bkz. b3: `nextDayIdx` günü ada göre arar) | dile göre üret (yeni kurulumda dil EN ise "Day 1"); var olan kayıt dokunma |
| src/app/01-temel.js:247 | `"Antrenman günü"` (adı bozuk günün yedek adı) | K | dile göre üret |
| src/app/01-temel.js:106 | `"Adsız hareket"` (adı okunamayan hareket) | K | dile göre üret |
| src/app/01-temel.js:152 | `` `${i+1}. Öğün` `` (başlığı bozuk öğün) | K | dile göre üret (ama bkz. b4: ":" ayracı kısa başlık için aranır) |
| src/app/01-temel.js:138 | `"Tahmini öğün"` (est.name yedek adı) | K | dile göre üret |
| src/app/01-temel.js:306 | `"Adsız besin"` (özel besin yedek adı) | K | dile göre üret |
| src/app/01-temel.js:350 | `"Kombo"` (kombo yedek adı) | K | dile göre üret |
| src/app/11-mutfak-akilli.js:40 | `"Kombo"` (boş ad girilirse) | K | dile göre üret |
| src/app/01-temel.js:226 | `"Rutinim"` (eski mobilite listelerinden göçte oluşan rutin, id `mr_main`) | K | göç tek seferlik: göç sırasında dile göre üret; var olan kayıt dokunma (v49 yapıldı) |
| src/app/01-temel.js:260 | `"Rutin"` (adı bozuk rutin yedek adı) | K | dile göre üret (v49 yapıldı) |
| src/app/01-temel.js:322 | `"Özel"` (`timeLabel` yedek değeri, takviye zamanı custom iken) | K | dile göre üret |
| src/app/09-kas-plaka-koc-takviye.js:686 | `"Özel"` (kullanıcı etiket girmezse `s.timeLabel = ... || "Özel"`) | K | dile göre üret |
| src/app/02-arayuz.js:163, 174, 180 | `"Dinlenme"` (`timer.label`; `ayk_timer` anahtarına `JSON.stringify({endAt,label})` olarak yazılır, açılışta geri okunur) | K (kısa ömürlü, localStorage `ayk_timer`) | gösterirken t() (`restPillLabel`, 02:232; toast 02:212) ya da etiketi saklama |
| src/app/05-secici-hareket.js:341 | `"Dinlenme • " + ex.name` (aynı sayaç etiketi) | K (`ayk_timer`) | aynı: yalnızca ön ek çevrilir; hareket adı dokunma |
| src/app/10-antrenman-arayuzu.js:296 | `startTimer(sec, ex.name.slice(0,40))` | K (`ayk_timer`) | hareket adı, dokunma |
| src/app/03-beslenme.js:669 | `"Dışarıda yemek"` (`est.name`, "Dışarıda yedim" penceresinde ad boşsa) | K (öğün kalemi `est.name`, arşive de girer) | dile göre üret |

### a2. Kullanıcıya girişte önerilen (düzenlenebilir) ad kalıpları

| Konum | Metin | Tür | Çeviride ne yapılmalı |
|---|---|---|---|
| src/app/05-secici-hareket.js:390 | `` `${n}. GÜN: ` `` (yeni antrenman günü ad kutusu varsayılanı; kullanıcı yazıp Ekle der → `state.workoutDays[].name`) | K | **KARAR (v48):** dile göre üret: Türkçe `${n}. GÜN: ` aynen, İngilizce `DAY ${n}: `; yer tutucu örneği de çevrilir; ":" ayracı korunur (`split(":")[0]` kısa etiketi) |
| src/app/10-antrenman-arayuzu.js:657 | `` `${n}. Öğün: ` `` (yeni öğün ad kutusu varsayılanı → `meal.title`) | K | dile göre üret ("Meal n: ") |
| src/app/09-kas-plaka-koc-takviye.js `copyMeal` | `src.title + " (kopya)"` (öğün kopyalanınca yeni öğün başlığı) | K | dile göre üret (" (copy)"); Türkçede tam " (kopya)" (v47 yapıldı) |
| src/app/06-mobilite.js:99 | `r.name + " (kopya)"` (rutin kopyalanınca yeni rutin adı) | K | dile göre üret (" (copy)") (v49 yapıldı) |
| src/app/04-besinler-barkod.js:539, 711, 712 | `name: "⭐ " + ad`, `cat: "⭐ Özel Eklediklerim"` (özel besin / barkodlu ürün; `state.customFoods`, ayrıca `foodSnap`) | K + C (cat anahtar: `foodCatKey`) | `name` ön eki ⭐ emojidir, dokunma. **`cat` kayıtta Türkçe kalır**; gösterirken `t(stripEmoji(f.cat))` (04:155, 11:179, 11:309) |
| src/app/11-mutfak-akilli.js:201 | `name: "🍲 " + ad`, `cat: "🍲 Tariflerim"` (tarif; `state.customFoods["custom_recipe_<id>"]`) | K + C | `cat` aynı şekilde; `🍲` ön eki dokunma |
| src/app/01-temel.js:489 | `"⚠ " + (x.n \| "Bulunamayan besin")`, `cat: "⚠ Bulunamayan"` | çalışma anı (kayda yazılmaz; `lostFood`, `_lost`) | gösterirken t() |

### a3. Örnek içerik üreticileri ve kurulum (kayda yazılan Türkçe metinler)

| Konum | Metin | Tür | Çeviride ne yapılmalı |
|---|---|---|---|
| src/app/14-ornek-icerik.js:8–11 | Öğün başlıkları: `"Kahvaltı"`, `"Öğle yemeği"`, `"Ara öğün"`, `"Akşam yemeği"` (`buildSampleMenu` → `state.meals[].title`; `SAMPLE_MENU_TEMPLATE`) | K | dile göre üret (şablona dil başına başlık ekle) |
| src/app/14-ornek-icerik.js:62–83 | Gün adları: `"1. Gün: Tüm Vücut A"`, `"2. Gün: Tüm Vücut B"`, `"3. Gün: Tüm Vücut C"`, `"1. Gün: Üst Vücut A"`, `"2. Gün: Alt Vücut A"`, `"3. Gün: Üst Vücut B"`, `"4. Gün: Alt Vücut B"` (`samplePrograms` → `workoutDays[].name`) | K (+ C: Antrenman sekmesinde `name.split(":")[0]` ile kısa etiket, 10:229) | dile göre üret ("Day 1: Full Body A"…); iki nokta ":" ayracı korunmalı (bkz. b4) |
| src/app/14-ornek-icerik.js:88 | `note: "Hedef: " + n + " Set x " + hedef + " Tekrar"` (örnek hareket notu → `ex.note`) | K (+ C: 01-temel.js:113, 118 `/^Hedef:/` yalnızca süreli/kardiyo çevirisinde bu notu siler) | dile göre üret ("Target: 3 sets x 8–12 reps"); `/^Hedef:/` regex'i yeni önek için de çalışmalı ya da kaldırılmalı |
| src/app/14-ornek-icerik.js:87–88 | `targetInfo: n + "x" + def + " sn"`, `targetInfo: n + "x" + hedef` (örnek `ex.targetInfo`) | K + C (09:53 `parseRepRange` `^\d+x` ve rakam aralığını okur; 05:360, 368 `^\d+x` değiştirir) | `"sn"` son eki kayda yazılıyor: dile göre üret ("sec"); `"x"` ve sayı kalıbı dokunma |
| src/app/14-ornek-icerik.js:104 | `name: "Günlük esneme"` (mobilite rutini adı, `state.mobilityRoutine.routines[].name`) | K | dile göre üret |
| src/app/14-ornek-icerik.js:87,88; 62–83 | Hareket adları `"Machine Chest Press (Flat)"`, `"Plank / RKC Plank"`, … (kütüphaneden birebir, ayrıca "Geniş Tutuş", "Derece", "Barfiks" gibi Türkçe parantezler) | K + A (`exKey` → `exerciseHistory`, `LIB_MUSCLE_MAP`) | dokunma (bkz. c-1) |
| src/app/14-ornek-icerik.js:94–101 | Mobilite hareket adları (kütüphaneden birebir) | K + A (`mobNorm`) | dokunma (bkz. c-2) |
| src/app/14-ornek-icerik.js:8–11, 14–57 | `time: "08:00"` vb. ve besin kimlikleri (`u173424`, `tr_beyaz_peynir`) | K | dil bağımsız, dokunma |
| src/app/15-kurulum.js:268 | `weightLogs = [{ date: fmtDate(now), ... }]` (bkz. a4) | K | bkz. a4 |
| src/app/15-kurulum.js:206–260 | Kurulum başka Türkçe metin KAYDETMEZ (yalnızca `settings.sex/goal/activity/gainPace` İngilizce anahtarlar, `state.deficit`, `weight`, örnekler yukarıdaki üreticilerden) | — | `obDraft` içindeki değerler (`male/female`, `lose/keep/gain`, `low/mid/high`, `new/pro`) dil bağımsız, dokunma |

### a4. Biçimlendirilmiş Türkçe tarih/etiket yazısı kayda yazılıyor

| Konum | Metin | Tür | Çeviride ne yapılmalı |
|---|---|---|---|
| src/app/01-temel.js:61–65 (`fmtDate`) → src/app/04-besinler-barkod.js:596, 05-secici-hareket.js:449, 15-kurulum.js:268 | `date: fmtDate(ts)` / `fmtDate(ts, true)` → `"15 Kas"`, `"15 Kas 14:30"` (Türkçe ay kısaltması) `weightLogs[].date` ve `workoutLogs[].date` olarak YAZILIYOR | K | Kayıttaki `date` yalnızca `ts` yoksa yedek olarak gösterilir (07:346, 08:94, 10:256, 10:576, 09:814, 03:276). **Kayıtlı yazıya dokunma**; gösterirken `ts` varsa `fmtDate(ts)` (dile göre) kullanılıyor (zaten öyle), `ts` yoksa kayıtlı Türkçe `date` aynen gösterilir. Yeni kayıtta `date` alanının dile göre üretilmesi şart değil (ts esas). 03-beslenme.js:276 `l.date` doğrudan basıyor (ts kullanmıyor): v47+ burada `ts` varsa `fmtDate(l.ts)` kullanılsın |

### a5. Enum benzeri alanlar: İngilizce anahtar kaydedilir, Türkçe etiket yalnızca gösterilir (SORUN YOK, bilgi için)

| Konum | Alan | Çeviride ne yapılmalı |
|---|---|---|
| src/app/09-kas-plaka-koc-takviye.js:561 | `supplementList[].time` = `morning/pre/post/bed/custom`; `SUPP_TIMES` etiketleri ("Sabah tok", …) | gösterirken t() |
| src/app/09-kas-plaka-koc-takviye.js:563 | `SUPP_GROUPS` grup başlıkları | gösterirken t() |
| src/app/01-temel.js:102 | `EFFORT_LABELS` {1:"Kolay",2:"Orta",3:"Zor",4:"Tükeniş"}; kayıtta yalnızca sayı `s.e` | gösterirken t(); sözlük anahtarı olarak `EFFORT_LABELS[v]` kullanıldığı için etiketler `t()` DIŞINDAKİ tek yerde (tanım) kalmalı ya da `t(EFFORT_LABELS[v])` ile sarılmalı |
| src/app/06-mobilite.js:6, data.js:347 | `MOB_REGIONS` ([anahtar, etiket]); kayıtta `it.region/region2` İngilizce anahtar (`hip` vb.) | gösterirken t(MOB_REGION_LABEL[k]); anahtara dokunma |
| src/data.js:348 | `MOB_TYPES` ([`dynamic/static/release`, etiket]) | gösterirken t() |
| src/app/07-grafik-ilerleme.js:84 | `PROG_VIEWS` ([anahtar, etiket]); kayıtta `state.progressView` anahtarı | gösterirken t() |
| src/app/02-arayuz.js:332 | `TAB_TITLES` | gösterirken t() |
| src/app/09-kas-plaka-koc-takviye.js:709 | `MEASURES` ([`bel`, "Bel", …]); kayıtta `measurements[].bel` vb. anahtar | gösterirken t(); anahtar `bel/kalca/gogus/kol/bacak/boyun` dokunma |
| src/app/01-temel.js:88 | `KIND_LABEL` (kayıtta `ex.kind` = weight/cardio/time) | gösterirken t() |
| data.js: BASE_FOOD_DB `unit` | Besin birimi **Türkçe kelime olarak kayıtlı besin tanımında**: `adet`, `ölçek`, `dilim`, `kase`, `porsiyon`, `bardak`, `parça`, `g`, `ml` (data.js; ayrıca `customFoods[].unit` ve `foodSnap[].u`, 01-temel.js:366: `["g","ml","adet"].includes(x.u)` değilse serbest metin) | K + C | Bkz. b2 |

---

## (b) Kodda karşılaştırılan / ayrıştırılan Türkçe metinler

### b1. Doğrudan karşılaştırma (`===`, `includes`, regex)

| Konum | Metin | Tür | Çeviride ne yapılmalı |
|---|---|---|---|
| src/app/07-grafik-ilerleme.js:51 (üretim), 398, 403 | `ser.metric === "Tahmini 1RM"` (ayrıca metric değerleri "Toplam mesafe", "Toplam süre", "En uzun set", 07:45, 49) | C (çalışma anı; kayda yazılmaz) | Karşılaştırma Türkçe sabit kalmalı. `t()` yalnızca basılan yerde (`name:` 398, `p-fine` 403). **Öneri:** `metric` için dil bağımsız anahtar kullan (`"e1rm"`) ya da karşılaştırmayı `t()` ile sarılmamış sabit üzerinden yap |
| src/app/09-kas-plaka-koc-takviye.js:483 | `state.workoutDays.findIndex(d => d.name === last.dayName)` (`last.dayId` bulunamazsa ada göre yedek eşleşme) | C (kayıtlı iki Türkçe ad) | dokunma (ikisi de kayıt; ad dile göre çevrilmemeli, aksi halde eşleşme bozulur) |
| src/app/11-mutfak-akilli.js:220 | `ms.find(x => x.title === meal.title)` ("Dünkü gibi", id bulunamazsa başlıkla) | C (kayıtlı) | dokunma |
| src/app/01-temel.js:175 | `MOBILITY_LIBRARY[cat].find(x => x.name === name)` (kütüphane hareketi ada göre) | C | dokunma (hareket adları İngilizce kalır) |
| src/app/06-mobilite.js:385 | `mobItems().some(i => i.name === x.m.name)` ("Zaten rutinde") | C | dokunma |
| src/app/12-besin-veritabani.js:97 | `e.name === q`, `e.name.startsWith(q)` (arama puanı; `e.name` = `normSearch` edilmiş besin adı) | C/A | dokunma; arama normalizasyonu (c) bölümünde |
| src/app/06-mobilite.js:511, 613 | `nx.side === "Sol"` / `"Sağ"`; `rounds` üretimi 06-mobilite.js:413 `["Sağ","Sol"]` (taraf yazısı) | C (çalışma anı sayaç durumu `mobT`; kayda yazılmaz) | Türkçe sabit kalsın ya da `side` için `"R"/"L"` anahtar. Gösterim `mobUpper(r.side)` (06:633) ve `mobRoundLabel` → gösterirken t() |
| src/app/09-kas-plaka-koc-takviye.js:584 | `s.time === "custom"` → `s.timeLabel \|\| "Özel"` | C (anahtar İngilizce) | dokunma; `"Özel"` bkz. a1 |
| src/app/01-temel.js:113, 118 | `/^Hedef:/.test(ex.note)` | C (kayıtlı not) | bkz. a3 |
| src/app/01-temel.js:112, 117 | `ex.targetInfo = "30 dk"`, `n + "x45 sn"` (kardiyo/süreli otomatik çeviri) | K | dile göre üret ("30 min", "3x45 sec"); `parseRepRange` `^\d+x` kalıbı dokunma |
| src/app/05-secici-hareket.js:200–203 (`targetInfoFor`), `addSetToExercise` (`set.target`) | `${n}x${hedef}`, `${n}x${sec} sn`, `${min} dk • ${km} km`; süreli sette `sec + " sn"` (kullanıcı hareket eklerken `ex.targetInfo` / `set.target`'a yazılır) | K + C | **KARAR (v48): kayıtta her dilde Türkçe** ("sn"/"dk"); ekranda `targetL()` İngilizcede " sec"/" min" gösterir. Gerekçe: veri katmanı `fmtDateStore` ile aynı ilke; `parseRepRange` ve `/^\d+x/` değişmeden çalışır, eski kayıtlarla tek biçim. Sayı/"x" kalıbı dokunma |
| src/app/10-antrenman-arayuzu.js:229 | `d.name.split(":")[0]` (gün kısa etiketi) | C (kayıtlı ad ayrıştırma) | dokunma (":" ayracı dilde korunmalı) |
| src/app/03-beslenme.js:728–734 (`shortMealTitle`), src/app/11-mutfak-akilli.js:21–26 (`mealTitleBody`) | `title.indexOf(":")` ≤ 16 karakter içindeki iki nokta ile öğün başlığı kısaltma ("2. Öğün: Öğle Yemeği" → "2. Öğün") | C (kayıtlı başlık ayrıştırma) | dokunma; örnek öğün başlıkları (a3) iki nokta içermediği için bu kısaltmayı kullanmıyor; dile göre üretilen `n. Öğün: ` kalıbında ":" korunmalı |
| src/app/09-kas-plaka-koc-takviye.js:668, 577 | `normSearch(unit) === normSearch(s.unit)`, `/olcek\|scoop/`, `/^(mcg\|µg\|ug\|iu)$/` (takviye doz birimi, kayıtlı `unit` = "ölçek", "damla/kapsül", "softjel", "g", "mg") | C | dokunma; `"ölçek"` zaten `olcek\|scoop` ile iki dilli karşılanıyor |
| src/app/01-temel.js:24–29 | `SUPP_PRESETS`: regex `m` (`/kreatin\|creatine/`, `/magnez/`, `/cinko\|zinc/`, `/whey\|protein tozu/`, `/d3\|d vitamin/`, `/omega/`) kullanıcı takviye adına uyar (09:626 `p.m.test(normSearch(s.name))`) ve `hasCreatine` (03-beslenme.js:340 `/kreatin\|creatine/`) | C (kullanıcı adı) | dokunma; İngilizce karşılıklar (magnesium, zinc…) EKLENEBİLİR ama Türkçe kalıplar silinmemeli |
| src/app/01-temel.js:24–29 | Hazır takviyelerin kaydı: `name` ("Vitamin D3 + K2", "Kreatin Monohidrat", "Magnezyum", "Çinko", "Whey Protein", "Omega-3"), `unit` ("damla/kapsül", "softjel", "ölçek"), `note` ("Tok karnına", "Bol su ile", "Uykudan 1 saat önce", "Akşam", "Antrenman sonrası"), `time` | K (eklenince `state.supplementList`'e kopyalanır, 09:673–676) | dile göre üret (preset eklenirken o anki dilin `name/unit/note`'u yazılsın); `key` dokunma |
| src/app/01-temel.js:82–86 (`detectKind`) | Türkçe + İngilizce anahtar sözcükler (çiftçi, asılma, koşu, yürüyüş, bisiklet, kürek, eliptik, ip atlama, yüzme, kardiyo…) hareket adına uygulanır; sonuç `ex.kind` (K) | C | dokunma (Türkçe kalıplar durmalı; İngilizce eklenebilir) |
| src/app/09-kas-plaka-koc-takviye.js:20–28, 40–48 | `MUSCLE_RULES` regex (karın, mekik, kalf, baldır, kalça, ön bacak, omuz, arka kol, ön kol, barfiks, sırt, şınav, göğüs…) + `autoInc` (`dambıl`) kullanıcı hareket adına uygulanır | C (kullanıcı adı) | dokunma; kalıplar eklenebilir, silinemez |
| src/app/01-temel.js:161–176 (`parseMobRx`) | Eski mobilite yazısını ayrıştıran regex: `set`, `tekrar\|tur`, `sn\|saniye\|sec`, `sağ ve sol`, `her ayak/kol/yön/bacak/taraf`, `er\|şer` | C (yalnızca göç adım 1 ve `mobFromLegacy`) | dokunma (eski kayıt Türkçe; `mobAddLib` de `MOBILITY_LIBRARY[].prescription` Türkçe metinleri `parseMobRx` ile okur, 06-mobilite.js:386–387; kütüphane `prescription` metinleri çevrilirse bu regex bozulur: **kütüphane `prescription`/`rx` alanları Türkçe kalmalı ya da `parseMobRx` iki dilli olmalı**) |
| src/app/06-mobilite.js:268 | `it.rxOk ? "" : "Eski yazım: " + it.rx` | `rxOk` boolean K; `rx` kayıtlı Türkçe serbest metin | "Eski yazım" gösterirken t(); `it.rx` dokunma |
| src/app/03-beslenme.js:478, 723 | `m.balanced` (negatif sayı, öğüne yazılır); metin "Gün dengelendi: …" yalnızca gösterilir | K (sayı) | dokunma (metin yok, yalnızca sayı kayıtlı); gösterim t() |
| src/app/04-besinler-barkod.js:25, 37, 40, 119–134 | `foodCatKey(cat) = "c:" + cat` (Türkçe kategori adı anahtar); `foodUI.cat` ("recent", "combos", "recipes", "custom", "all", `c:<kategori>`) kayda yazılmaz; kategori adları `BASE_FOOD_DB[].cat` ve USDA `cat` (Türkçe) | A (çalışma anı) | anahtar dokunma; `cats` etiket listesi gösterirken t() (ör. `t(stripEmoji(c))`) |
| src/app/04-besinler-barkod.js:35–38 | Kategori chip metinleri "Son kullanılanlar", "Komboların", "Tariflerim", "Özel eklediklerim", "Tümü" | çalışma anı | gösterirken t() |
| src/app/11-mutfak-akilli.js:179, 309, 272 | `cat = stripEmoji(f.cat \|\| "Diğer")` ile alışveriş listesi gruplama; `localeCompare(..., "tr")` | A (çalışma anı gruplama + sıralama) | gruplama anahtarı Türkçe kalmalı; başlık gösterirken t(); `localeCompare` bkz. d-tablosu |
| src/app/06-mobilite.js:681 | `MOB_WARM_REGIONS` anahtarları = `MUSCLES` (Türkçe); `MOB_WARM_REGIONS[muscleOf(ex)]` | A + C | dokunma (bkz. b5) |
| src/app/01-temel.js:390 | `libMuscle` Türkçe kas adı listesinde mi? (kayıtlı `state.libMuscle`) | K + C | dokunma (bkz. b5) |

### b2. Birim metinleri (hem kayıt hem karşılaştırma)

| Konum | Metin | Tür | Çeviride ne yapılmalı |
|---|---|---|---|
| src/data.js (BASE_FOOD_DB `unit:`) | `adet`(21), `dilim`(5), `kase`(7), `parça`(1), `porsiyon`(16), `bardak`(1), `ölçek`(2); ayrıca `g`/`ml` | K (besin tanımı, `customFoods` içine de kopyalanır) + C (`f.unit === "g"/"ml"/"adet"` karşılaştırmaları: 03-beslenme.js:126, 04-besinler-barkod.js:102–106, 233, 11-mutfak-akilli.js:275–277, 10-antrenman-arayuzu.js:786, 14-ornek-icerik.js:39) | Kayıtlı birim Türkçe kalır. Mantık yalnızca `g`, `ml`, `adet` değerlerini karşılaştırıyor: bu üçünü ve diğerlerini ASLA çevirme; ekrana basarken `t(unit)` ya da birim eşleme tablosu (`adet`→"pcs", `ölçek`→"scoop", `dilim`→"slice"…) kullan |
| src/app/01-temel.js:366 | `foodSnap[id].u = ["g","ml","adet"].includes(x.u) ? x.u : String(x.u\|\|"g").slice(0,12)` | K + C | dokunma |
| src/app/04-besinler-barkod.js:687 | `"1adet"` mod anahtarı (özel besin formu `m`) | çalışma anı | dokunma |
| src/app/11-mutfak-akilli.js:275–277 | Alışveriş listesi miktarı: `" kg"`, `" L"`, `" g"`, `" ml"`, `" adet"` yalnızca gösterim | çalışma anı | gösterirken t() |

### b3. Ad ile eşleşen kayıtlar (kimlik yoksa ada düşenler)

(Tabloda b1'dekilerin özeti; v47+ görevleri için bu eşleşmelerin hangi alanlara dayandığı.)

| Eşleşme | Hangi iki alan | Kural |
|---|---|---|
| `nextDayIdx` | `workoutLogs[].dayName` ↔ `workoutDays[].name` (09:483) | `dayId` yoksa. Antrenman günü adları dile göre YENİDEN yazılmaz (kayıt + günlük aynı kalmalı) |
| `lastDayMealFor` | `dailyLogs[k].meals[].title` ↔ `meal.title` (11:220) | id yoksa. Öğün başlıkları yeniden yazılmaz |
| rutin tekrar kontrolü | `routine.items[].name` ↔ kütüphane adı (06:385) | ad aynı kalmalı |
| mobilite son çalışma | `mobilityLog[gün][]` ad listesi ↔ `mobNorm(it.name)` (06:168, 176–181, 690) | `mobilityLog` dizileri hareket ADI saklar (`archiveDay`, 02-arayuz.js:257). Ad çevirisi olursa eski günlük eşleşmez: mobilite adları İngilizce kalıyor (kullanıcı kararı), dokunma |
| egzersiz geçmişi | `exerciseHistory[exKey(ad)]` (05:269, 436; 10:13, 464, 480) | anahtar = küçük harfli ad, bkz. c |

### b4. Başlık içindeki ":" ayracı (biçim sözleşmesi)

`shortMealTitle` (03-beslenme.js:728), `mealTitleBody` (11-mutfak-akilli.js:21) ve Antrenman gün çipi (10-antrenman-arayuzu.js:229 `d.name.split(":")[0]`) öğün/gün başlığındaki **ilk ":" karakterine** (≤ 16 karakter) bağlıdır. Dile göre üretilen öğün/gün adlarında ("Meal 2: Lunch", "Day 1: Full Body A") ":" korunmalı; ":" kullanmayan adlar kısaltılmadan (18 karakterde kesilerek) gösterilir.

### b5. Kas adları (MUSCLES) — kayıtlı, anahtar ve karşılaştırma

| Konum | Metin | Tür | Çeviride ne yapılmalı |
|---|---|---|---|
| src/app/09-kas-plaka-koc-takviye.js:5 | `MUSCLES` = Göğüs, Sırt, Omuz, Ön Bacak, Arka Bacak & Kalça, Kalf, Biceps, Triceps, Karın | K (`ex.muscle` isteğe bağlı kayıt; `state.libMuscle`), C (`MUSCLES.includes(ex.muscle)`, 09:36; 10-antrenman-arayuzu.js:456), A (`MOB_WARM_REGIONS` 06:681, `MUSCLE_RULES` 09:20–28, `LIB_MUSCLE_MAP` 09:11–15, `BODY_POLYS`/kas sayımları, `[data-week-muscles]`, İlerleme `#pMuscles`) | **Kayıtta ve kodda Türkçe kalır.** Yalnızca ekrana basılırken `t(muscle)`. Kasa ait her karşılaştırma ve `Map` anahtarı Türkçe sabit üzerinden olmalı |
| src/app/01-temel.js:390 | `libMuscle` normalizeState doğrulama listesi (aynı dokuz ad, elle tekrarlanmış) | K + C | dokunma |
| src/app/09-kas-plaka-koc-takviye.js:20–28 | `MUSCLE_RULES[i][0]` (kas adı) | A | dokunma |
| src/app/10-antrenman-arayuzu.js:390 | `ex.kind === "cardio" ? "Kardiyo" : "Süreli"`, `EQUIP_SHORT` | gösterim | gösterirken t() |

---

## (c) `exKey` / `normSearch` / `mobNorm` ile anahtara çevrilen yerler

Tanımlar: `exKey(name)` 01-temel.js:70; `normSearch(s)` 01-temel.js:71–73; `mobNorm(t)` 06-mobilite.js:17. Üçü de Türkçe yerelle küçültür (`toLocaleLowerCase("tr"/"tr-TR")`): `I`→`ı`, `İ`→`i`. `exKey` ve `normSearch` ayrıca `ı`→`i` yapar. **Girdi dili İngilizce de olsa bu işlevler aynı kalmalı**: İngilizce hareket adları ("Barbell Bench Press") zaten ASCII; ama `"I"` içeren ad (ör. "Incline") `tr` yerelinde `ı` olur, sonra `ı`→`i` ile düzelir, yani anahtar değişmez. Yerel değiştirilirse (ör. `"en"`) `İ` içeren eski anahtarlar bozulabilir. **Bu üç işlev ve `"tr"` yereli DEĞİŞMEYECEK.**

### c-1. `exKey` (anahtar = kayıtlı geçmişin anahtarı; yedek/ayna dahil)

| Konum | Kullanım | Tür | Çeviride ne yapılmalı |
|---|---|---|---|
| src/app/05-secici-hareket.js:269 (`historyFor`), 436 (antrenman kaydı) | `state.exerciseHistory[exKey(name)]` — **kalıcı anahtar** (K + A) | A (kayıtlı) | dokunma. Hareket adı çevrilirse geçmiş kaybolur → hareket adları (kullanıcı kararı: İngilizce) çevrilmemeli |
| src/app/07-grafik-ilerleme.js:383–392 | `progressSel`, `state.exerciseHistory` anahtarları; `nm(k)` ile görünen ad | A | dokunma |
| src/app/09-kas-plaka-koc-takviye.js:13 | `LIB_MUSCLE_MAP[exKey(n)]` kütüphane → kas | A | dokunma |
| src/app/09-kas-plaka-koc-takviye.js:32, 44 | `autoMuscle`, `autoInc` içinde `exKey(name)` + regex | A/C | dokunma |
| src/app/10-antrenman-arayuzu.js:13, 464, 480, 490 | geçmiş araması, "PROGRAMDA" işareti (`inDay.has(exKey(n))`) | A/C | dokunma |
| src/data.js:104 `EXERCISE_LIBRARY` | Kategori başlıkları (`"1. Göğüs (Chest - Press & Fly)"` …) Türkçe/İngilizce karışık; `LIB_CAT_MUSCLE` (09:6) kategorileri sıra numarasıyla eşler | A (sıra) | Kategori başlıkları gösterirken t(); **sıra değişmemeli** |
| src/data.js:104+ hareket adları (ör. "Leg Press (45 Derece)", "Pull-up (Geniş Tutuş Barfiks)") | Parantez içindeki Türkçe sözcükler anahtarın parçası | A | adları çevirme; çevirisi gerekirse yalnızca gösterirken (ör. `exerciseLabel(name)`) |

### c-2. `mobNorm` (mobilite hareket adı eşleştirme)

| Konum | Kullanım | Tür | Çeviride ne yapılmalı |
|---|---|---|---|
| src/app/06-mobilite.js:21–22 | `_mobGuideIdx[mobNorm(k)]`, `mobGuide(ad)` (MOB_GUIDE anahtarları) | A | dokunma (`MOB_GUIDE` anahtarları ve `MOB_LIB_V39[].name` değişmez) |
| src/app/06-mobilite.js:159–160, 167 | ad → bölge haritası (`MOB_LIB_REGIONS` + rutin hareketleri) | A | dokunma |
| src/app/06-mobilite.js:176, 181 | `mobilityLog[gün]` ad listesi ↔ rutin hareketleri | A (kayıtlı) | dokunma |
| src/app/06-mobilite.js:359, 362 | ekle ekranı arama (`name + " " + note`) | A (arama) | `note`/`steps` çevrilirse arama metni dile göre aranır; ad dokunma |
| src/app/06-mobilite.js:690 | ısınma hareketleri | A | dokunma |

### c-3. `normSearch` (arama ve eşleştirme anahtarı)

| Konum | Kullanım | Tür | Çeviride ne yapılmalı |
|---|---|---|---|
| src/app/12-besin-veritabani.js:41–42, 137–138 | besin arama indeksi (ad, `aliases`, `cat`); `state.missSearches` eşleşmesi (`normSearch(x.q) === k`) | A (+K: `missSearches[].q` kullanıcının yazdığı metin) | dokunma. Besin adları/`aliases` Türkçe indekslenir; İngilizce arama için v48+ ayrı `aliasesEn` eklenmeli, mevcut anahtarlar değişmemeli |
| src/app/12-besin-veritabani.js:6–30 | `SEARCH_SYN` (pismis, haslanmis, kizartilmis, …) Türkçe eş anlamlı anahtarları | A | dokunma |
| src/app/04-besinler-barkod.js:112, 120 | besin ve kombo arama (`normSearch(c.name)`) | A | dokunma |
| src/app/05-secici-hareket.js:31, 40 | hareket seçici arama | A | dokunma |
| src/app/10-antrenman-arayuzu.js:469–470 | kütüphane arama | A | dokunma |
| src/app/03-beslenme.js:340 | `hasCreatine`: `/kreatin\|creatine/.test(normSearch(x.name))` | C | dokunma |
| src/app/09-kas-plaka-koc-takviye.js:577, 626, 668 | takviye birimi/ad eşleştirme | C | dokunma |

### c-4. Diğer anahtarlar (kayıtta anahtar olarak kullanılan metinler)

| Konum | Anahtar | Tür | Çeviride ne yapılmalı |
|---|---|---|---|
| src/app/11-mutfak-akilli.js:288, 310, 319 | `state.shopChecked[id]` — `id` besin/tarif kimliği (dil bağımsız) | A | dokunma |
| src/app/04-besinler-barkod.js:25 | `"c:" + Türkçe kategori adı` (yalnızca çalışma anı) | A | dokunma |
| src/app/00-depolama.js | `STORE_PARTS`, `kind` değerleri (`day/week/pre/safe/import`), `ayk_*` anahtarları | A | dokunma |
| src/app/05-secici-hareket.js:17–37 | `picker.cat` anahtarları (sıra numarası dizgisi, "all") | A | dokunma |

---

## d) `toLocale*("tr" / "tr-TR")` çağrıları: veri mi, görüntü mü?

Task 4 için: **veri** olanlar dile bağlı olmamalı (yerel `"tr"` kalır), **görüntü** olanlar `locale()` ile dile göre değişmeli.

| Konum | Çağrı | Sınıf | Not |
|---|---|---|---|
| src/app/01-temel.js:64 | `toLocaleDateString("tr-TR", …)` (`fmtDate`) | görüntü | kayda yazılan `date` metnini de üretiyor (bkz. a4); yeni sürümde ekranda `locale()` kullanılmalı, kayıt `ts`'e dayanır |
| src/app/01-temel.js:70 | `exKey` `toLocaleLowerCase("tr")` | **veri (anahtar)** | DEĞİŞMEZ |
| src/app/01-temel.js:72 | `normSearch` `toLocaleLowerCase("tr")` | **veri (anahtar)** | DEĞİŞMEZ |
| src/app/01-temel.js:82 | `detectKind` `toLocaleLowerCase("tr")` | **veri (karşılaştırma; sonuç `ex.kind` kaydedilir)** | DEĞİŞMEZ |
| src/app/03-beslenme.js:106 | `fmtInt` `toLocaleString("tr-TR")` | görüntü | sayı biçimi (binlik ayracı) dile göre |
| src/app/04-besinler-barkod.js:342 | `toLocaleDateString("tr-TR", …)` | görüntü | |
| src/app/04-besinler-barkod.js:538, 550 | `b.name.toLocaleLowerCase("tr").includes(b.brand.toLocaleLowerCase("tr"))` (barkod ürünü adında marka var mı) | veri (karşılaştırma; sonuç özel besin adına yazılır) | dil bağımsız yerel kalabilir; uzun vadede "en"/"tr" fark etmez, DEĞİŞTİRME |
| src/app/05-secici-hareket.js:464 | `toLocaleString("tr-TR")` (tonaj) | görüntü | |
| src/app/06-mobilite.js:15 | `mobUpper` `toLocaleUpperCase("tr-TR")` | görüntü | "i"→"İ" Türkçe'ye özgü; İngilizce'de `"en"` kullanılmalı (ör. "hip" → "HIP", "İ" olmamalı) |
| src/app/06-mobilite.js:17 | `mobNorm` `toLocaleLowerCase("tr-TR")` | **veri (anahtar)** | DEĞİŞMEZ |
| src/app/06-mobilite.js:703 | `MOB_REGION_LABEL[k].toLocaleLowerCase("tr-TR")` | görüntü | |
| src/app/07-grafik-ilerleme.js:272, 483, 487, 489 | `toLocaleString("tr-TR")` (kcal) | görüntü | |
| src/app/07-grafik-ilerleme.js:398 | `ser.metric.toLocaleLowerCase("tr-TR")` (grafik seri adı) | görüntü | `metric` karşılaştırması (b1) ayrı |
| src/app/07-grafik-ilerleme.js:441, 454, 455 | `toLocaleDateString("tr-TR", …)` | görüntü | |
| src/app/08-profil-yedek.js:103 | `toLocaleString("tr-TR")` (kalori) | görüntü | |
| src/app/09-kas-plaka-koc-takviye.js:814 | `toLocaleDateString("tr-TR", …)` (paylaşım kartı tarihi) | görüntü | |
| src/app/09-kas-plaka-koc-takviye.js:818 | `(log.dayName \|\| "Antrenman").toLocaleUpperCase("tr-TR")` | görüntü (`log.dayName` kayıtlı Türkçe/serbest ad; yedek `"Antrenman"`) | `"en"` ile büyüt; yedek metin `t()` |
| src/app/09-kas-plaka-koc-takviye.js:822 | `toLocaleString("tr-TR")` (tonaj) | görüntü | |
| src/app/09-kas-plaka-koc-takviye.js:916 | `toLocaleDateString("tr-TR", …)` | görüntü | |
| src/app/10-antrenman-arayuzu.js:381, 578 | `toLocaleString("tr-TR")` | görüntü | |
| src/app/11-mutfak-akilli.js:230 | `toLocaleDateString("tr-TR", …) + " günkü"` | görüntü | "günkü" ekiyle birleştirme dile bağlı: cümle `t()` ile bütün yazılmalı |
| src/app/11-mutfak-akilli.js:242 | `dayLabelShort(...).toLocaleLowerCase("tr")` | görüntü | |
| src/app/11-mutfak-akilli.js:311 | `cat.toLocaleUpperCase("tr")` (alışveriş başlığı) | görüntü | |
| src/app/11-mutfak-akilli.js:557 | `toLocaleDateString("tr-TR", …)` | görüntü | |
| src/app/11-mutfak-akilli.js:272 | `localeCompare(…, "tr")` (alışveriş sırası; çağrı `toLocale*` değil ama yerelli) | görüntü (sıralama) | dile göre; veri değil |
| src/app/00-depolama.js:344 | `all[b].date.localeCompare(all[a].date)` (ISO tarih, yerelsiz) | veri | dokunma |

Not: `String.prototype.toLowerCase/toUpperCase` (yerelsiz) yalnızca 04-besinler-barkod.js:482'de (`product_quantity_unit` "ml" kontrolü, harici API verisi) kullanılıyor; veri, dokunma.

---

## e) Hızlı özet: v47+ görevleri için kurallar

1. Kayıtta olan **ad/başlık/etiket** alanları (gün, öğün, rutin, kombo, takviye, özel besin, `timeLabel`, `ex.note`, `ex.targetInfo`, `weightLogs/workoutLogs.date`) mevcut kayıtlarda yeniden yazılmaz ve gösterilirken `t()` ile SARILMAZ (kullanıcı kendi yazmış olabilir; yedek adlar için a1'e bakılır).
2. Sistem tarafından üretilen varsayılan adlar (a1, a2, a3) dile göre üretilir; ama **yalnızca yeni oluşturulan** kayıtlar için.
3. Karşılaştırma ve anahtar işlevleri (`exKey`, `normSearch`, `mobNorm`, `detectKind`, `MUSCLE_RULES`, `parseMobRx`, `parseRepRange`, `ser.metric`, `EFFORT_LABELS` sayı anahtarı) ve `"tr"` yereli değişmez.
4. Kas adları (`MUSCLES`), besin birimleri (`adet`, `ölçek`, `dilim`, …), kategori adları (`cat`) ve `MOB_REGIONS` anahtarı kayıtta/kodda Türkçe (ya da İngilizce anahtar) kalır; ekranda `t()`.
5. Hareket ve mobilite hareket adları (kütüphane) çevrilmez; Türkçe parantezler anahtarın parçasıdır.
6. İki nokta (":") ayracı ve `^\d+x` kalıbı biçim sözleşmesidir; dile göre üretilen ad/hedef metinlerinde korunmalı.
