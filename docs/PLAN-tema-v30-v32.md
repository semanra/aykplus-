# Tema planı v30–v32 (14 Kasım 2026, kullanıcı onayladı: "Tavsiyelerin hepsini uygula") — TAMAMLANDI (v30, v31, v32 yerelde commit)

Kararlar (kullanıcı):
- Görünüm: **Sistem / Koyu / Aydınlık**, varsayılan **Sistem**; Profil'den ve başlıktaki güneş/ay düğmesinden değiştirilebilir.
- Antrenman sırasında zorunlu koyu YOK (kullanıcı kendisi seçer).
- Vücut haritasının aydınlık hâli bana bırakıldı.
- Push: her sürüm yerelde commit; GitHub'a gönderme kullanıcı onayıyla (bellek kuralı).

## v30 — Renkleri tek yere toplama (görünüm değişmez)
- Antrenman ailesi için değişkenler `--t-*` (`:root`): bg, surface, elev, elev2, elev0, sunk, line, line2, text, text1–3, muted, dim, faint, faint2, grid, nav, scrim, acc, acc-rgb, on-acc, acc-text, panel, panel-line.
- Bölüm kapsamları yalnızca değişkenleri değiştirir: `body.theme-mob` (indigo yüzey + lavanta), `body.theme-prog` ve `body.pf-page` (nötr yüzey + kırık beyaz vurgu). Eski `--m-*` ve Grafit kural blokları kalkar.
- Veri renkleri `--d-tq/gr/lv/wa/kg/over` (İlerleme grafikleri; SVG'de `style="fill/stroke:var(...)"`).
- CSS'teki sabit hex'ler (t-*, .tm, m-*, p-*, pf, başlık, alt menü, açılış, sayaç hapı, bildirim, uiDialog) değişkene.
- JS: `bg-[#141416]` → `bg-[var(--t-surface)]` vb.; düz yazıdaki `text-white` → `t-text`, seçili çip `bg-white text-black` → `t-inv`. Renkli dolgu üstündeki beyaz yazı olduğu gibi kalır.
- Açılış ekranı ve `theme-color` eski laciverdden siyaha (bilinçli tek görünüm değişikliği). Mobilite'den açılan ortak pencereler indigo yüzey alır (bilinçli).
- Doğrulama: v29 ve v30'un aynı ekranlarının görüntüleri piksel piksel karşılaştırılır (`scratchpad/pixdiff.py`); fark yalnızca yukarıdaki bilinçli yerlerde olmalı.

## v31 — Aydınlık tema her yerde
- `state.settings.theme` = `system | dark | light` (varsayılan `system`; eski `nutriLight` alanı dokunulmadan kalır).
- Etkin tema: `html.light` sınıfı; `matchMedia('(prefers-color-scheme: light)')` dinlenir. Açılışta yanıp sönmesin diye `<head>` içinde küçük betik `ayk_theme` aynasını okur.
- Beslenme: `nutri-light` artık etkin temadan gelir. Diğer bölümler `html.light` altında `--t-*` aydınlık değerleri.
- Vurgu aydınlıkta koyulaşır: turkuaz yazı `--t-acc-text` koyu turkuaz, lavanta koyu lavanta, Grafit → koyu grafit dolgu + beyaz yazı.
- Vücut haritası: denendi (koyu sahne / ters çevrilmiş çizim ×2); ters çevrilmiş hâl röntgen negatifi gibi göründüğü için **koyu sahne kartı** seçildi.
- `theme-color` ve durum çubuğu meta'sı temaya göre (iOS'ta durum çubuğu bir sonraki açılışta güncellenebilir).
- Testler: kontrast (her ekranda 4,5:1), varsayılan Sistem, geçiş, kalıcılık.

## v32 — Ortak bileşenler ve rapordan kalanlar
- Köşe/yükseklik ölçeği: kart 22, kontrol 14, hap 999; ana düğme 52, ikincil 44.
- Başlık kuralı: bölüm başlıkları cümle düzeni (büyük harf aralıklı etiketler yalnızca çok kısa yerde).
- Beslenme → Geçmiş hedef takvimine ✓ ~ ! simgeleri (İlerleme ile aynı dil).
- ANALIZ-tasarim kalanlar: A3.2, A3.4, A3.5, A3.6, A3.7, A3.8, A4.x (12 px), A5.2, A5.3, A5.4, A6.2 (odak), A6.3 (hareket azalt), A6.5 (yan kenar boşluğu), A2.6, A2.7.
