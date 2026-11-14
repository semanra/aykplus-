# App Store Aşama 1: depolama temeli + eski yük + otomatik Profil kaydı — tasarım ve plan

Tarih: 14 Kasım 2026 · Kullanıcı onayı: 1–9 maddelerinin hepsi ("hata yapmamaya çalış"), bitince GitHub'a gönder. Yol haritası: `docs/YOL-HARITASI-appstore.md` Aşama 1.

## Neden
Bütün veri tek `localStorage` kaydında; her dokunuşta tamamı yazılıyor. 5 yıllık yoğun kullanımda ~2,15 milyon karakter (temkinli sınırın %85'i) ve her dokunuş ~40 ms. Paketli uygulamada (Aşama 4) depolama tek katmandan geçmeli ki iPhone dosya depolamasına / iCloud'a bağlanabilsin. Eski sürüm çevirileri `normalizeState` içinde dağınık. Profil'de "Kaydet" düğmesi diğer uygulamalardaki otomatik kayıt alışkanlığına uymuyor.

## Kararlar
- Kullanıcı: iç yedek **son 7 gece + son 4 haftanın birer kopyası**; Profil otomatik kayıt; mevcut `ayk_plus_v5_state` **silinmez**.
- Benim kararım (kullanıcıya anlatılır): `ayk_plus_v5_state` silinmez ve **güncel tutulur** (aşağıdaki "ayna"); ayrıca geçişten önceki hâli birebir "Geçiş öncesi" iç yedeği olarak saklanır.

## Yaklaşımlar
- **A (seçilen): IndexedDB, parçalı, localStorage ayna.** Veri `aykplus` veritabanında parçalara bölünür; dokunuşta yalnızca değişen parça yazılır (asenkron, tek işlem = atomik). `localStorage` kaydı dokunuşlar durunca (2 sn sonra) ve uygulama arka plana geçerken arka planda güncellenir: eski/önbellekteki sürümler ve dışarıdan değiştirilmiş kayıt (eski sürüm, test tohumu) çalışır; dolarsa ayna durur, veri IndexedDB'de güvende.
- B: localStorage'ı anahtarlara bölmek — hız biraz düzelir, 5 MB sınırı kalır.
- C: Doğrudan yerel dosya/SQLite — yalnızca Aşama 4 (Capacitor) ile mümkün.

## Tasarım (v41)
- `src/app/00-depolama.js` (yeni, `01`'den önce birleşir; yalnızca fonksiyonlar): `idbOpen()`, `idbLoadAll()`, `idbWriteParts()`, `strSig(s)` (uzunluk + FNV-1a), `storageInit()`.
- Parçalar `STORE_PARTS = ["dailyLogs", "exerciseHistory", "workoutLogs", "weightLogs", "mobilityLog", "mobilityRoutineLog", "measurements", "foodSnap"]`, geri kalan = `core`. Mağazalar: `parts` (ad → JSON metni), `meta` (`main`: `{ migratedAt, mirrorSig, mirrorOff }`), `snaps` (anahtar → `{ kind: day|week|pre|import, date, ts, json }`).
- **Açılış:** `let state = normalizeState({})` yer tutucu; `saveState` açılış bitene dek hiçbir şey yazmaz. `13`'teki başlatma `bootApp()` olur; `storageInit().then(bootApp)`.
  - IndexedDB açılamaz (3 sn) → **eski mod**: `loadState()` + bugünkü localStorage kaydı (davranış birebir bugünkü).
  - `meta.migratedAt` var ve localStorage metninin imzası `meta.mirrorSig` ile aynı (ya da kayıt yok) → IndexedDB'den yükle. Parça okunamazsa: ham parçalar `ayk_plus_v5_state_kurtarma`'ya (yoksa) yazılır, en yeni iç yedekten açılır, uyarılır; iç yedek de yoksa localStorage'dan.
  - Aksi hâlde (ilk geçiş ya da localStorage dışarıdan değişmiş): varsa mevcut IndexedDB hâli `import` iç yedeği olur; ilk geçişte ham localStorage metni `pre` ("Geçiş öncesi") iç yedeği olur; `loadState()` (v4/kurtarma mantığı aynen) → bütün parçalar yazılır → geri okunup birebir karşılaştırılır → eşitse `meta` yazılır; değilse eski moda düşülür (veri localStorage'da kalır).
- **Kayıt:** `saveState()` → mikro görev sonunda `flushSave()`: her parça `JSON.stringify`, son yazılandan farklıysa tek işlemde yazılır; başarıda son yazılan güncellenir; hata → bugünkü "Veriler kaydedilemedi! Hemen yedek al." (bir kez). Ayna: 2 sn sessizlikten sonra ve `visibilitychange: hidden`/`pagehide`'da; başarıda `mirrorSig`; QuotaExceeded → `mirrorOff`.
- **İç yedek:** açılışta ve gün değişince `autoSnapshot()`: bugünün (`logicalToday`) `day` kopyası yoksa yazılır. Saklama: son 7 günün `day` kopyaları + 7 günden eski olanlar arasında son 4 haftanın her biri için en yeni bir kopya (`week`); `pre` kalıcı (1 adet); `import` son 2. Profil → Yedekleme `#pfSnaps`: tarih, tür, boyut; "Geri yükle" → onay → `snapshot()` → yükle → `renderAll()` → `offerUndo`.
- **Kayıt alanı:** IndexedDB modunda `navigator.storage.estimate()` (kullanılan MB, kotaya oran); eski modda bugünkü hesap. `checkStorageWarn` aynı eşik (%70).
- **Test yardımcıları (üründe gerçek iş görür):** `aykStoredState()` (kalıcı kayıttan okur: IndexedDB modunda parçalar, eski modda localStorage) — testlerdeki `JSON.parse(localStorage.getItem('ayk_plus_v5_state'))` buna çevrilir; "temiz başlangıç" yapan testler `localStorage.clear()` yanında `indexedDB.deleteDatabase('aykplus')` çağırır (uygulama `versionchange`'te bağlantıyı kapatır).

## Tasarım (v42)
- **Veri sürümü:** `state.dataVer` (şimdiki = 2). `migrateState(raw)` (`01-temel.js`, `normalizeState` başında): `dataVer` < 1 → mobilite eski biçimleri (`items` / `dynamic`+`static`) → `routines`; < 2 → kalori halkası bir kerelik "Yenen" (`macroViewV26`). `normalizeState` yalnızca doğrulama/temizlik yapar. v4 içe aktarma `loadState`'te kalır (başka anahtar). Eski yedekler aynı zincirden geçer.
- **Kullanılmayan kod:** her `function ad(` için kaynakta (src + markup) ham geçiş sayısı 1 olanlar listelenir, tek tek doğrulanıp silinir; `npm test` + `kontrol` piksel karşılaştırması.
- **Profil otomatik kayıt:** `#profileSave` ve "kaydedilmemiş değişiklik" uyarısı kalkar; her alan `change`'de (kutudan çıkınca) doğrulanıp kaydedilir (`saveProfileField(id)`), sınır dışı/boş → eski değer geri yazılır; "Kaydedildi · Geri al" (tek bildirim, art arda değişikliklerde yenilenir). Kilo: bugünkü kayıttaki tartı mantığı aynı gün tek kayıt.

## Test planı
- `tests/test_v41_depolama.py`: yeni kurulum IndexedDB'de; v40 localStorage kaydının birebir geçişi + "Geçiş öncesi" yedeği; ikinci açılışta tekrar geçiş yok; localStorage dışarıdan değişince içe alma + `import` yedeği; IndexedDB yokken eski mod (kayıt localStorage'a); yazma hatası uyarısı; bozuk parça → en yeni iç yedek + kurtarma kopyası; 5 yıllık veride dokunuş başı kayıt süresi (eski moda göre) ölçülür; gün atlamalarıyla 7 + 4 iç yedek saklama; iç yedekten geri dönme + Geri al; ayna 2 sn sonra güncel; ayna dolunca uygulama çalışmaya devam eder.
- `tests/test_v42_goc_profil.py`: eski kayıtlar (v4, v26 öncesi, v27 öncesi, v38) tek zincirden; `dataVer`; Profil alanları kutudan çıkınca kayıt, geçersiz değer geri gelir, Geri al, Kaydet düğmesi yok.
- Bütün eski testler yeni okuma yardımcısıyla geçmeli; `bozuk_veri.py`, `html_enjeksiyon.py`, `kontrol` temiz.

## Kısıtlar
CLAUDE.md §5. Kullanıcı verisi hiçbir yolda silinmez; her belirsiz durumda veri localStorage'da kalır ve uygulama eski moda düşer.
