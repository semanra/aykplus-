---
paths:
  - "src/app/07-*.js"
  - "src/app/23-*.js"
---
# İlerleme mimarisi (v29)

(`CLAUDE.md` §6'dan taşındı, metin değiştirilmeden; bu dosya yalnızca yukarıdaki dosyalarla çalışırken yüklenir.)

- **İlerleme (v29):** `body.theme-prog` (Antrenman'ın siyah yüzeyleri; dokunulanlar kırık beyaz `#F4F4F5`, Profil Grafit kurallarıyla aynı; veriler kaynak sekmenin renginde: antrenman `#1FD1C1`, beslenme `#22C55E`, mobilite `#B3A6FF`, su `#4EA8DE`, kilo beyaz). Alt sekmeler `state.progressView` = `genel | kilo | guc | beslenme` (`PROG_VIEWS`, `setProgressView`, kaydedilir; yalnızca açık alt sekme çizilir: `progGenelHtml / progKiloHtml / progGucHtml / progBeslenmeHtml`). Grafikler `pLine` (x = zaman) ve `pBars` (bayrak: `over` çizgili + ↑, `plan` kesik çerçeve + *, `now` yarı saydam); 4'ten az nokta → grafik yerine sayı/açıklama. Genel: 4 kutu (`progWeekly`), `#pWeighBtn` → `progLogWeight()` (temalı pencere, `logCurrentWeight`), koç `progCoachHtml` (`#pCoach`, `applyCoach`/`resetCoachAdjust`), şerit `#pStrip` (antrenman / beslenme hedefi `hitClass` / mobilite `mobilityLog`; ✓ ~ ! + `aria-label`). Kilo: `#pWeight` (günlük nokta + 7 günlük ortalama, `progUI.wRange` 30/90/Tümü, kaydedilmez), yağ oranı, haftalık ortalama (≥ 4 hafta), son tartılar (sil + Geri al), `#pMeasure` (`measureSel`). Güç: `#pExChart` (`progressSel`, son 4 hareket çipi + tümü `select`; `exerciseSeries` noktaları `t` taşır), `#pPrs`, `#pMuscles` (bullet, azalan), `#pTonnage` (8 hafta + kardiyo/rekor), `#pCalendar` (5 hafta). Beslenme: `histRange` 7/14/30 (`setHistRange`), `#pNutriHist`, `#pKcal`, `#pWater`, `#pDayList`. `trainCtx()` İlerleme'yi kapsar (pencereler `.tm`). Tasarım: `tasarimlar/ilerleme-B.html`, `tasarimlar/ilerleme-ozet.md`.
