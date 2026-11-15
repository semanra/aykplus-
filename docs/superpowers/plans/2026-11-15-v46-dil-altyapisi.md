# v46 — Dil Altyapısı Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Uygulamaya iki dil altyapısını (Türkçe anahtarlı `t()`), dile göre sayı/tarih biçimini, `settings.lang` + göçü ve gizli dil seçeneğini eklemek; Türkçe ekran piksel piksel aynı kalır. Örnek olarak sekme ve alt menü adları İngilizce.

**Architecture:** Yeni `src/app/16-dil.js` çeviri/biçim yardımcılarını, `src/app/17-sozluk-en.js` İngilizce sözlüğü tutar (derlemede ad sırasıyla birleşir; yalnızca çizim anında çağrıldıkları için sıra sorun değil). Türkçe seçiliyken `t()` metni olduğu gibi döndürür. İngilizce, `EN_PUBLIC = false` olduğu sürece yalnızca test bayrağı `window.AYK_TEST_EN === true` ile açılır.

**Tech Stack:** Vanilla JS, Tailwind 3.4 (sabit sınıf adları), Playwright (Python) testleri.

**Spec:** `docs/superpowers/specs/2026-11-15-asama3-ingilizce-design.md` (§5, §6 v46 satırı, §7, §8).

## Global Constraints

- Depolama anahtarı `ayk_plus_v5_state` değişmez; yeni alan `settings.lang` = `"tr" | "en"` `normalizeState` ile varsayılanlı (geçersiz → `"tr"`).
- `migrateState` adım 5: `if (v < 5) s.settings.lang = "tr";` ve `DATA_VER = 5`.
- Telefon diline YALNIZCA `freshState()` bakar, o da yalnızca `langAvailable()` doğruysa; aksi hâlde `"tr"`.
- Veri katmanı Türkçe işlemleri DEĞİŞMEZ: `exKey`, `normSearch`, `mobNorm`, barkod marka karşılaştırması `toLocaleLowerCase("tr")` olarak kalır. Kayıtta tutulan/karşılaştırılan Türkçe metinler kayıtta Türkçe kalır.
- Ekranda gösterilen büyük/küçük harf dönüşümleri ve tarih/sayı biçimleri `locale()` kullanır (TR `"tr-TR"`, EN `"en-GB"`).
- Cümle birleştirme ile çeviri YASAK; değişkenler `{ad}` yer tutucusu.
- Türkçe seçiliyken hiçbir ekran değişmez: `npm run kontrol -- --hizli` piksel farkı 0 (sürüm etiketi hariç).
- Tailwind sınıfları tam ve sabit metin; dokunma alanı ≥ 44 px; kullanıcı metni `esc()`.
- Testler `from ortak_tohum import TEST_INIT`; yeni test dosyası `tests/test_v46_dil.py`, kendi portu `8804`.

## Review Focus

1. İngilizce metni `tr-TR` ile büyük harfe çevirmek ("hip" → "HİP") → İngilizce modda gösterim dönüşümleri `en-GB` ile; Task 4 testi `mobUpper("hip") === "HIP"`.
2. Kayıtta `lang: "en"` var ama İngilizce henüz yayında değil (ileri sürüm yedeği geri yüklendi) → ekran Türkçe; Task 3 testi.
3. Geçersiz dil değeri (`"de"`, `5`, `null`) içeren kayıt/yedek → `"tr"`, sayfa hatası yok; Task 3 testi.
4. İngilizce modda giriş kutusuna gelen `72.5` ve kullanıcının yazdığı `1,5` → `num()` ikisini de doğru okur (72,5 ve 1,5); Task 4 testi.
5. Sözlükte yer tutucusu Türkçesiyle tutmayan giriş (`{n}` eksik/fazla) → test başarısız; Task 5 testi.

---

### Task 1: Terim sözlüğü belgesi

**Files:**
- Create: `docs/i18n-terimler.md`

**Interfaces:**
- Produces: Aşama 3'ün bütün sürümlerinde kullanılacak tek İngilizce karşılık listesi.

- [ ] **Step 1: Kavramları topla.** Uygulamanın arayüzündeki temel kavramları (~80) çıkar: sekme/alt sekme adları, beslenme (menü, öğün, yenen/plan, açık/fazla, koruma kalorisi, yağsız kütle, makrolar, lif/tuz, ikame, kombo, tarif, su, takviye zamanları), antrenman (set, tekrar, tonaj, kademe, plaka, ısınma seti, tahmini 1RM, set zorluğu: Kolay/Orta/Zor/Tükeniş, dinlenme haftası, kilo artırma önerisi, Programım, sıradaki gün), mobilite (rutin, seans, dinamik/statik/gevşetme, bölgeler, taraf), ilerleme (koç, seri, hedef tutturma), Profil (hareketlilik Az/Orta/Çok, protein Standart/Yüksek, hedef Ver/Koru/Al, kilo alma hızı, gün geçişi, iç yedek, kurtarma kopyası).
- [ ] **Step 2: Her kavrama tek İngilizce karşılık seç.** Yerleşik İngilizce fitness/beslenme uygulamalarındaki ve kanıta dayalı kaynaklardaki (ör. ISSN pozisyon bildirgeleri, NSCA terimleri) yaygın kullanıma bak (web araması). Belge biçimi tablo: `Türkçe | İngilizce | Bağlam (hangi ekran) | Neden bu karşılık (kaynak/yaygın kullanım)`. Birden çok aday varsa reddedilenleri ve nedenini yaz.
- [ ] **Step 3: Kurallar bölümü ekle:** İngiliz İngilizcesi yazımı (en-GB: "programme" değil, uygulamalarda yaygın "program" mı — seçimi ve gerekçesini yaz), büyük harf kuralı (düğmeler ve başlıklar "Sentence case"), birimler (kg, cm, kcal, g, ml, L değişmez), "AYK+" çevrilmez.
- [ ] **Step 4: Commit**

```bash
git add docs/i18n-terimler.md
git commit -m "v46: İngilizce terim sözlüğü"
```

### Task 2: Kayıtta tutulan Türkçe metinlerin listesi

**Files:**
- Create: `docs/i18n-kayitli-metinler.md`

**Interfaces:**
- Produces: v47–v49 görevlerinin "kayıtta Türkçe kalır, yalnızca gösterilirken çevrilir" listesi.

- [ ] **Step 1: Tara.** `src/app/*.js` ve `src/data.js` içinde Türkçe metnin (a) `state` içine yazıldığı, (b) `===`/`includes`/anahtar olarak karşılaştırıldığı, (c) `exKey`/`normSearch` ile anahtara çevrildiği yerleri bul. Bilinen örnekler: `ser.metric === "Tahmini 1RM"`, takviye `timeLabel`, mobilite `"Eski yazım"`, `m.balanced`, varsayılan adlar ("1. Gün", "Rutinim", öğün adları, örnek içerik adları), `log.dayName`, `EFFORT_LABELS` kullanımı, `MOB_REGION_LABEL`.
- [ ] **Step 2: Belgeye yaz:** her satır `dosya:satır | metin | kayıt mı / karşılaştırma mı / anahtar mı | çeviride ne yapılmalı (dokunma / gösterirken t() / dile göre üret)`.
- [ ] **Step 3: Commit**

```bash
git add docs/i18n-kayitli-metinler.md
git commit -m "v46: kayıtta tutulan Türkçe metinler listesi"
```

### Task 3: Dil ayarı, göç ve çeviri işlevleri

**Files:**
- Create: `src/app/16-dil.js`, `src/app/17-sozluk-en.js`
- Modify: `src/app/01-temel.js` (`DEFAULT_SETTINGS`, `DATA_VER`, `migrateState`, `normalizeState`, `freshState`)
- Test: `tests/test_v46_dil.py` (yeni; bölüm 1)

**Interfaces:**
- Produces (16-dil.js):
  - `const EN_PUBLIC = false;`
  - `langAvailable(): boolean` → `EN_PUBLIC || window.AYK_TEST_EN === true`
  - `curLang(): "tr"|"en"` → kayıtta `"en"` VE `langAvailable()` ise `"en"`, aksi hâlde `"tr"` (state henüz yer tutucuyken `"tr"`)
  - `locale(): "tr-TR"|"en-GB"`
  - `t(key: string, vars?: object): string` — anahtarın `|` sonrası bağlam kısmı Türkçe gösterimde atılır; EN'de `EN[key]` (yoksa Türkçe); `{ad}` yer tutucuları `vars` ile doldurulur (sayılar `fmtNum` ile).
  - `tn(n: number, key: string, vars?: object): string` — Türkçe tekil/çoğul ayrımı yok; EN girişi `{ one, other }` nesnesi; `{n}` her zaman doldurulur.
- Produces (17-sozluk-en.js): `const EN = { … }` (bu görevde boş nesne; Task 5 doldurur).

- [ ] **Step 1: Failing test yaz** (`tests/test_v46_dil.py`, port 8804, v44 test iskeleti gibi):

```python
# 1) sahibin kaydı (TEST_INIT) göçten geçer
check(st(pg)["settings"]["lang"] == "tr" and st(pg)["dataVer"] == 5, "göç adım 5: lang tr, dataVer 5")
# 2) telefon en-US + İngilizce bayrağı açıkken bile sahibin kaydı Türkçe
#    (context locale="en-US", add_init_script("window.AYK_TEST_EN = true") + TEST_INIT)
check(pg.evaluate("curLang()") == "tr", "telefon İngilizce, eski kayıt Türkçe kalır")
# 3) yeni kurulum (tohumsuz, localStorage.clear + deleteDatabase), locale en-US
#    bayraksız → tr ; bayraklı → en ; locale tr-TR + bayraklı → tr
check(fresh_lang(locale="en-US", flag=False) == "tr", "İngilizce gizliyken yeni kurulum tr")
check(fresh_lang(locale="en-US", flag=True) == "en", "bayrakla yeni kurulum telefon diline göre en")
check(fresh_lang(locale="tr-TR", flag=True) == "tr", "Türkçe telefonda tr")
# 4) kayıtta lang en ama bayrak yok → curLang tr (Review Focus 2)
# 5) geçersiz lang "de", 5, null → normalizeState "tr", sayfa hatası yok (Review Focus 3)
# 6) t() / tn()
check(pg.evaluate("t('Bugün')") == "Bugün", "tr: t aynen döndürür")
check(pg.evaluate("t('Set|ayarla')") == "Set", "tr: bağlam kısmı atılır")
check(pg.evaluate("t('{n} gün kaldı', {n: 5})") == "5 gün kaldı", "tr: yer tutucu")
# EN modunda (bayrak + state.settings.lang='en'), EN geçici olarak test girişiyle doldurulup:
#   EN['{n} gün kaldı'] = {one:'{n} day left', other:'{n} days left'} → tn(1,…) '1 day left', tn(3,…) '3 days left'
#   sözlükte olmayan anahtar → Türkçe döner
```

- [ ] **Step 2: Çalıştır, başarısız olduğunu gör:** `python tests/test_v46_dil.py` → FAIL (`curLang is not defined`).
- [ ] **Step 3: Uygula.** `DEFAULT_SETTINGS.lang = "tr"`; `DATA_VER = 5`; `migrateState` içine `if (v < 5) s.settings.lang = "tr";`; `normalizeState`: `lang` `"tr"|"en"` değilse `"tr"`; `freshState()` tohumsuz dalında, `onboarded = false` satırının yanında (normalizeState'ten SONRA, çünkü göç adım 5 `tr` yazar): `s.settings.lang = langAvailable() && !/^tr\b/i.test(navigator.language || "") ? "en" : "tr"`. Test tohumu dalı (`AYK_TEST_SEED`) dokunulmaz → göçten `tr` alır. `16-dil.js` ve boş `EN` ile `17-sozluk-en.js`.
- [ ] **Step 4: Testi ve tüm paketi çalıştır:** `npm run build` ("✓ index.html oluşturuldu") → `python tests/test_v46_dil.py` PASS → `npm test` 37/37.
- [ ] **Step 5: Commit** — `git commit -m "v46: dil ayarı, göç adım 5, t()/tn()"`

### Task 4: Dile göre sayı, tarih ve harf dönüşümü

**Files:**
- Modify: `src/app/01-temel.js` (`fmtNum`, `fmtKg`, `fmtDate`), `src/app/03-beslenme.js:106` (`fmtInt`), `src/app/16-dil.js`, ve `toLocale…("tr-TR")` / `toLocaleUpperCase("tr")` gösterim çağrıları: `04-besinler-barkod.js:342`, `05-secici-hareket.js:464`, `06-mobilite.js:15,551,703`, `07-grafik-ilerleme.js:272,294,398,441,450,454,455,483,487,489`, `08-profil-yedek.js:103`, `09-kas-plaka-koc-takviye.js:814,818,822,916`, `10-antrenman-arayuzu.js:381,578`, `11-mutfak-akilli.js:230,242,311,557,562`, `06-mobilite.js:134` (`MOB_DAY_LABELS`)
- Test: `tests/test_v46_dil.py` (bölüm 2)

**Interfaces:**
- Consumes: `curLang()`, `locale()` (Task 3).
- Produces (16-dil.js): `fmtDay(date: Date|number|string, opts: object): string` (= `toLocaleDateString(locale(), opts)`), `dayShort(): string[]` (TR `["Pt","Sa","Ça","Pe","Cu","Ct","Pz"]`, EN `["Mo","Tu","We","Th","Fr","Sa","Su"]`), `upperL(s)`, `lowerL(s)` (gösterim için `locale()` ile).

- [ ] **Step 1: Failing test yaz** (bölüm 2):

```python
# Türkçe (değişmemeli)
check(pg.evaluate("fmtNum(72.5)") == "72,5" and pg.evaluate("fmtKg(1.25)") == "1,25", "tr ondalık virgül")
check(pg.evaluate("fmtInt(1250)") == "1.250", "tr binlik nokta")
check(pg.evaluate("dayShort()[2]") == "Ça", "tr gün kısaltması")
# İngilizce (bayrak + lang en)
check(pg.evaluate("fmtNum(72.5)") == "72.5" and pg.evaluate("fmtInt(1250)") == "1,250", "en biçim")
check(pg.evaluate("fmtDay(new Date(2026,10,15), {day:'numeric', month:'short'})") == "15 Nov", "en tarih")
check(pg.evaluate("mobUpper('hip')") == "HIP", "en büyük harf İ yok (Review Focus 1)")
check(pg.evaluate("num('72.5')") == 72.5 and pg.evaluate("num('1,5')") == 1.5, "en giriş okuma (Review Focus 4)")
# veri anahtarları dile bağlı değil
check(pg.evaluate("exKey('Iİ Bench')") == <TR modundaki değerle aynı>, "exKey dilden bağımsız")
```

- [ ] **Step 2: Çalıştır, FAIL gör.**
- [ ] **Step 3: Uygula.** Listelenen her gösterim çağrısını `locale()` / `fmtDay` / `fmtInt` / `upperL` / `lowerL` / `dayShort()` ile değiştir; dört gün kısaltması dizisi `dayShort()` olur. Sesli yönlendirmede `u.lang = locale()`. `exKey`, `normSearch`, `mobNorm`, `04-besinler-barkod.js:538,550` DOKUNULMAZ (Global Constraints). Gösterim mi veri mi emin olunamayan bir çağrı varsa Task 2 belgesine bak; belgede yoksa dokunma ve raporda yaz.
- [ ] **Step 4: Testler:** `npm run build` → `python tests/test_v46_dil.py` PASS → `npm test` hepsi geçer → `npm run kontrol -- --hizli` Türkçe ekranlarda piksel farkı 0.
- [ ] **Step 5: Commit** — `git commit -m "v46: sayı/tarih/harf biçimi dile göre"`

### Task 5: Dil seçimi arayüzü, statik metinler ve örnek çeviri

**Files:**
- Modify: `src/app/16-dil.js`, `src/app/17-sozluk-en.js`, `src/markup.html` (alt menü `<span>` metinleri satır ~953–959; Profil → Ayarlar'da Görünüm satırının altına Dil satırı ~1356–1361), `src/app/02-arayuz.js:332,372` (`TAB_TITLES`), `src/app/03-beslenme.js:77,243` (`NUTRI_VIEWS`), `src/app/10-antrenman-arayuzu.js:190` (`GYM_VIEWS` gösterimi), `PROG_VIEWS` gösterimi (`07-grafik-ilerleme.js`), `src/app/08-profil-yedek.js` (Dil düğmelerinin `on`/`aria-pressed` durumu, Görünüm gibi), `src/app/15-kurulum.js` (adım 1'e dil seçimi)
- Test: `tests/test_v46_dil.py` (bölüm 3)

**Interfaces:**
- Consumes: `t`, `curLang`, `langAvailable` (Task 3).
- Produces: `setLang(l: "tr"|"en"): void` (ayarı yazar, `document.documentElement.lang`, açık `uiDialog` kapanır, `applyStaticI18n()`, `renderAll()`, Profil açıksa yeniden çizer), `applyStaticI18n(root = document): void` (`[data-t]` öğelerinin metni `t(data-t)`; `data-t-aria` → `aria-label`, `data-t-ph` → `placeholder`; Türkçede ve hiç dil değişmemişken DOM'a dokunmaz).

- [ ] **Step 1: Failing test yaz** (bölüm 3):

```python
# bayraksız: Profil'de [data-lang-opt] görünmez, kurulum adım 1'de dil seçimi görünmez
# bayraklı: Profil → Dil → English
check(pg.inner_text("#navBtnGym span") == "Training" or <terim sözlüğündeki karşılık>, "alt menü İngilizce")
check(pg.inner_text("#tabTitle") == <sözlükteki 'Beslenme'>, "sekme başlığı İngilizce")
check(pg.evaluate("document.documentElement.lang") == "en", "html lang en")
# İngilizce modda sekme/alt menü/alt sekme öğelerinde Türkçeye özgü harf yok
check(not re.search("[çğıöşüÇĞİÖŞÜ]", pg.inner_text(".bottom-nav") + pg.inner_text("#nutriNav")), "nav'da Türkçe harf yok")
# geri Türkçe → metinler eski hâlinde
# dil değiştir → geri değiştir: aykStoredState() yalnızca settings.lang farkıyla aynı (stableStr karşılaştırması)
# sözlük denetimi: her EN girişinin {yer tutucu} kümesi Türkçe anahtarınkiyle aynı; tn girişleri {one, other} (Review Focus 5)
check(pg.evaluate(PLACEHOLDER_AUDIT_JS) == [], "sözlük yer tutucuları tutarlı")
```

- [ ] **Step 2: Çalıştır, FAIL gör.**
- [ ] **Step 3: Uygula.** Alt menü metinlerine `data-t`; `TAB_TITLES`, `NUTRI_VIEWS`, `GYM_VIEWS`, `PROG_VIEWS` etiketleri gösterilirken `t(...)` (diziler/nesneler Türkçe veri olarak kalır). `EN` sözlüğüne yalnızca bu metinlerin ve Dil satırının karşılıkları — Task 1 terim sözlüğünden. Profil Dil satırı Görünüm satırıyla aynı yapı (`t-seg grid-cols-2`, düğmeler `data-lang-opt="tr"|"en"`, "Türkçe" / "English" — dil adları her dilde kendi adıyla), `langAvailable()` değilse satır gizli. Kurulum adım 1'de aynı seçim, yalnızca `langAvailable()`; seçim `obDraft.lang`, `finishOnboarding` yazar ve ekran o anda yeni dile geçer.
- [ ] **Step 4: Testler:** build → `python tests/test_v46_dil.py` PASS → `npm test` → `npm run kontrol -- --hizli` Türkçe piksel farkı 0.
- [ ] **Step 5: Commit** — `git commit -m "v46: dil seçimi (gizli), statik metin çevirisi, sekme adları İngilizce"`

### Task 6: Sürüm

**Files:**
- Modify: `src/markup.html` (`AYK+ v46`), `sw.js` (`aykplus-v46`), `CLAUDE.md` (§3 test sayısı 37; §6'ya "Dil (v46)" maddesi: `t`/`tn`/bağlam, `curLang`/`langAvailable`/`EN_PUBLIC`, `locale`/`fmtDay`/`dayShort`/`upperL`/`lowerL`, `data-t`, veri katmanı `"tr"` kalır kuralı, `DATA_VER` 5 adım 5; §9'a v46 satırı), `scripts/kontrol/ortak.py` gerekmez (Türkçe ekran aynı)

- [ ] **Step 1:** Sürüm etiketleri ve CLAUDE.md.
- [ ] **Step 2:** `npm run build` → `npm test` (37/37) → `npm run kontrol -- --hizli` (yalnızca sürüm etiketi farkı) → `python scripts/kontrol/bozuk_veri.py` ve `python scripts/kontrol/html_enjeksiyon.py` (hata 0; veri yapısı değişti).
- [ ] **Step 3:** Sahibin fikstürüyle doğrula: hedefler 2478 / 180 / 69 / 284 (antrenman günü), kurulum yok, `lang` `"tr"`.
- [ ] **Step 4: Commit** — `git commit -m "AYK+ v46: dil altyapısı (İngilizce gizli), dile göre sayı/tarih"`
