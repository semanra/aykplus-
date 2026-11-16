# v57 — Animasyonlar 2. tur

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]`.

**Goal:** Kullanıcının onayladığı ek animasyonlar (v55 altyapısı üstüne) + rekor yıldızı hizası (yapıldı, f51cd87).

**Architecture:** `src/app/27-animasyon.js` (`animOK()`, `animNum`, v55 kalıpları) genişletilir; her animasyon `/* v57 ANİM: <ad> */` etiketli ayrı blok; CSS `src/markup.html` v55 animasyon bölümüne.

## Global Constraints (v55 ile aynı)
- `animOK()` false (Hareketi azalt / `settings.anim === false` / `window.AYK_NO_ANIM`) → hiçbir animasyon, son hâl anında.
- Yalnız `transform` / `opacity` / `clip-path` / stroke-dashoffset (GPU dostu); `renderAll` süresini artırmaz; aynı veri yeniden çizilince yeniden oynamaz; dokunma engellenmez (animasyon sırasında da tıklanabilir).
- Tam yeniden çizim (`renderAll`) DOM'u yenilediği için "yeni eklenen / kapanan / silinen" animasyonları kimlik (öğün id, kalem dizini + besin, set) üzerinden bir kerelik işaretle yapılır (ör. `animMark(key)` → sonraki çizimde o öğeye sınıf).
- Renkler değişken (`--t-*`, `--n-*`, `--m-*`); sabit hex yok.
- Animasyon kapalıyken (testler, kontrol) ekranlar v56 ile piksel piksel aynı.
- `src/app` içinde `t` adlı yerel bağlama yok; yeni metin olursa `t()` + EN.
- Test: `tests/test_v57_anim2.py` (port 8814), `AYK_NO_ANIM` olmadan animasyonun sınıfı/başlangıcı, bayrakla son hâl.

---

### Task 1: Beslenme + genel
- 4 Öğün "yendi": Bugün'de daireye dokununca kart yumuşakça tek satıra kapanır (yükseklik/opaklık; `grid-template-rows` 1fr→0fr veya max-height yerine clip + transform), açınca yumuşakça açılır.
- 5 Su ekleme: su eklenince halkanın ucunda küçük dalga/damla (≤ 600 ms).
- 6 Hedef tamamlanınca: günlük kalori veya protein hedefine o gün İLK ulaşıldığında ilgili halka/çubuk bir kez parlar (gün başına bir kez; kayıt gerekmez, oturum içi işaret yeterli).
- 7 Besin ekleme: öğüne/menüye eklenen yeni kalem kayarak gelir ve kısa vurgulanır.
- 11 Pencereler: alttan açılan pencereler (`openModal`, `uiAsk`) yay hareketiyle açılır; tutamaçtan/üst bölgeden aşağı kaydırınca kapanır (kaydırma eşiği ~80 px veya hız; içerik kaydırmasıyla çakışmasın: yalnız içerik en üstteyken).
- 12 Sekme geçişi: `switchTab` ve alt görünüm değişiminde içerik ~150 ms belirir (+ 6 px yukarı kayma).
- 13 Silme ve geri al: `offerUndo` ile silinen satır yana kayarak kaybolur (silmeden ÖNCE ~180 ms animasyon, sonra mevcut akış), "Geri al" ile geri gelen satır aynı yoldan girer.
- [ ] Test + build + ilgili testler (v13, v14, v24, v25, v33, v55) → commit `v57: beslenme ve genel animasyonlar`.

### Task 2: Antrenman, Mobilite, İlerleme
- 2 Hareket tamamlanınca: son set tiklenince kart başlığındaki "tamamlandı" kısa turkuaz parlamayla gelir.
- 3 Kilo artırma önerisi (`suggestionHtml`, `[data-hold]`, deload notu): ilk göründüğünde hafif aşağı kayarak belirir.
- 8 Mobilite: seansta hareket geçişinde kart yana kayar (ileri: sola, geri: sağa); bitiş özeti kısa kutlamayla açılır.
- 9 İlerleme grafikleri: `pLine` çizgisi soldan sağa çizilir (stroke-dashoffset), `pBars` çubukları alttan yükselir; yalnız alt sekme/aralık değişince, her dokunuşta değil.
- 10 Seri: İlerleme "Bu hafta, gün gün" şeridinde (ve Mobilite haftası) bugün tamamlanınca o günün kutusu "pıt" ile dolar.
- 1 Antrenman bitişi: (kullanıcı onayı bekleniyor — yeni bitiş özeti kartı; onaylanırsa bu göreve eklenir).
- [ ] Test + build + ilgili testler (v10, v23, v29, v39, v40, v48, v55) → commit `v57: antrenman, mobilite ve ilerleme animasyonları`.

### Task 3: Sürüm
- [ ] `AYK+ v57`, `aykplus-v57`, CLAUDE.md §6 (v55 paragrafına v57 eki), §9, §3 → build → `npm test` → `npm run kontrol -- --hizli` → commit `AYK+ v57: animasyonlar 2. tur`.
