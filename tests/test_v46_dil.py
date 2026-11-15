# v46 bölüm 1: dil ayarı (settings.lang), göç adım 5, curLang/locale/t/tn.
import os, sys, json, subprocess, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT, SPLASH_OFF, FIXTURE
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8804'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
URL = "http://localhost:8804/index.html"
KEY = "ayk_plus_v5_state"
EN_FLAG = "window.AYK_TEST_EN = true"
def st(pg): return pg.evaluate("aykStoredState()")
def boot(pg): pg.wait_for_function("window.aykBooted === true"); pg.wait_for_timeout(80)

try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    def page(locale="en-US", flag=False, seeded=True):
        ctx = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}, locale=locale)
        ctx.add_init_script(TEST_INIT if seeded else SPLASH_OFF)
        if flag: ctx.add_init_script(EN_FLAG)
        pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(URL); boot(pg)
        return pg
    def fresh_lang(locale, flag):
        pg = page(locale, flag, seeded=False)
        pg.evaluate("() => { localStorage.clear(); void indexedDB.deleteDatabase('aykplus'); }")
        pg.reload(); boot(pg)
        r = [pg.evaluate("state.settings.lang"), pg.evaluate("curLang()")]
        pg.context.close(); return r
    def seed(pg, data):
        pg.evaluate("s => { localStorage.clear(); void indexedDB.deleteDatabase('aykplus'); localStorage.setItem('%s', s); }" % KEY, json.dumps(data))
        pg.reload(); boot(pg)

    # 1) sahibin kaydı göçten geçer
    pg = page("tr-TR")
    check(st(pg)["settings"]["lang"] == "tr" and st(pg)["dataVer"] == 5, "göç adım 5: lang tr, dataVer 5")
    check(pg.evaluate("curLang()") == "tr" and pg.evaluate("locale()") == "tr-TR", "tr: curLang/locale")
    pg.context.close()
    # 2) telefon en-US + bayrak açıkken sahibin kaydı Türkçe
    pg = page("en-US", flag=True)
    check(pg.evaluate("curLang()") == "tr", "telefon İngilizce, eski kayıt Türkçe kalır")
    # 4) kayıtta lang en ama bayrak yok
    pg.context.close()
    pg = page("en-US", flag=False)
    pg.evaluate("state.settings.lang = 'en'")
    check(pg.evaluate("curLang()") == "tr" and pg.evaluate("langAvailable()") is False, "kayıtta en ama İngilizce yayında değil: tr")
    pg.context.close()
    # 3) yeni kurulum
    check(fresh_lang("en-US", False) == ["tr", "tr"], "İngilizce gizliyken yeni kurulum tr")
    check(fresh_lang("en-US", True) == ["en", "en"], "bayrakla yeni kurulum telefon diline göre en")
    check(fresh_lang("tr-TR", True) == ["tr", "tr"], "Türkçe telefonda tr")
    # 5) geçersiz lang
    pg = page("en-US", flag=True)
    OWNER = json.load(open(FIXTURE, encoding="utf-8")); OWNER["dataVer"] = 5
    for bad in ("de", 5, None):
        errs.clear()
        OWNER["settings"] = {**OWNER.get("settings", {}), "lang": bad}
        seed(pg, OWNER)
        check(pg.evaluate("state.settings.lang") == "tr" and pg.evaluate("curLang()") == "tr" and errs == [], "geçersiz lang %r -> tr, hata yok %s" % (bad, errs[:2]))
    # 6) t() / tn()
    check(pg.evaluate("t('Bugün')") == "Bugün", "tr: t aynen döndürür")
    check(pg.evaluate("t('Set|ayarla')") == "Set", "tr: bağlam kısmı atılır")
    check(pg.evaluate("t('{n} gün kaldı', {n: 5})") == "5 gün kaldı", "tr: yer tutucu")
    check(pg.evaluate("t('{n} gün', {n: 1.5})") == "1,5 gün", "tr: sayı fmtNum ile")
    check(pg.evaluate("tn(3, '{n} gün kaldı')") == "3 gün kaldı", "tr: tn {n} doldurulur")
    pg.evaluate("state.settings.lang = 'en'")
    check(pg.evaluate("curLang()") == "en" and pg.evaluate("locale()") == "en-GB", "bayrak + kayıt en: curLang en, locale en-GB")
    pg.evaluate("""() => { EN['{n} gün kaldı'] = {one: '{n} day left', other: '{n} days left'}; EN['Bugün'] = 'Today'; EN['Set|ayarla'] = 'Set'; EN['Merhaba {ad}'] = 'Hello {ad}'; }""")
    check(pg.evaluate("tn(1, '{n} gün kaldı')") == "1 day left" and pg.evaluate("tn(3, '{n} gün kaldı')") == "3 days left", "en: tn tekil/çoğul")
    check(pg.evaluate("t('Bugün')") == "Today" and pg.evaluate("t('Set|ayarla')") == "Set", "en: t sözlükten")
    check(pg.evaluate("t('Merhaba {ad}', {ad: 'Ali'})") == "Hello Ali", "en: yer tutucu")
    check(pg.evaluate("t('Sözlükte yok')") == "Sözlükte yok" and pg.evaluate("t('Yok|bağlam')") == "Yok", "en: sözlükte olmayan anahtar Türkçe döner")
    # --- bölüm 2: sayı, tarih, harf ---
    pg.evaluate("state.settings.lang = 'tr'")
    check(pg.evaluate("fmtNum(72.5)") == "72,5" and pg.evaluate("fmtKg(1.25)") == "1,25", "tr ondalık virgül")
    check(pg.evaluate("fmtInt(1250)") == "1.250", "tr binlik nokta")
    check(pg.evaluate("dayShort()[2]") == "Ça", "tr gün kısaltması")
    check(pg.evaluate("mobUpper('hip')") == "HİP", "tr büyük harf İ")
    tr_key = pg.evaluate("exKey('Iİ Bench')")
    tr_date = pg.evaluate("fmtDay(new Date(2026,10,15), {day:'numeric', month:'short'})")
    check(tr_date == "15 Kas", "tr tarih " + tr_date)
    pg.evaluate("state.settings.lang = 'en'")
    check(pg.evaluate("fmtNum(72.5)") == "72.5" and pg.evaluate("fmtKg(1.25)") == "1.25" and pg.evaluate("fmtInt(1250)") == "1,250", "en biçim")
    check(pg.evaluate("dayShort()") == ["Mo","Tu","We","Th","Fr","Sa","Su"], "en gün kısaltması")
    check(pg.evaluate("fmtDay(new Date(2026,10,15), {day:'numeric', month:'short'})") == "15 Nov", "en tarih")
    check(pg.evaluate("mobUpper('hip')") == "HIP", "en büyük harf İ yok (Review Focus 1)")
    check(pg.evaluate("upperL('hip')") == "HIP" and pg.evaluate("lowerL('HIP')") == "hip", "en upperL/lowerL")
    check(pg.evaluate("num('72.5')") == 72.5 and pg.evaluate("num('1,5')") == 1.5, "en giriş okuma (Review Focus 4)")
    check(pg.evaluate("exKey('Iİ Bench')") == tr_key, "exKey dilden bağımsız")
    check(pg.evaluate("normSearch('Iİ')") == pg.evaluate("(state.settings.lang='tr', normSearch('Iİ'))"), "normSearch dilden bağımsız")
    pg.evaluate("state.settings.lang = 'en'")
    check(">Mo<" in pg.evaluate("heatHtml(7)"), "en: heatHtml gün başlıkları İngilizce")
    pg.evaluate("logCurrentWeight()")
    d_en = pg.evaluate("state.weightLogs[state.weightLogs.length-1].date")
    check(d_en.split(" ")[-1] in ("Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"), "en: tartı kaydı Türkçe tarih yazar: " + d_en)
    check(pg.evaluate("fmtDateStore(new Date(2026,10,15,9,5).getTime(), true)") == pg.evaluate("(state.settings.lang='tr', fmtDate(new Date(2026,10,15,9,5).getTime(), true))"), "fmtDateStore = Türkçe fmtDate")
    pg.evaluate("state.settings.lang = 'en'")
    check(pg.evaluate("fmtDate(new Date(2026,10,15).getTime())") == "15 Nov", "en fmtDate gösterim")
    pg.evaluate("state.settings.lang = 'tr'")
    check(pg.evaluate("heatHtml(7)").count(">Ça<") == 1, "tr: heatHtml Ça")
    # --- bölüm 3: dil seçimi arayüzü, statik metinler ---
    import re
    pg.context.close()
    # t/tn sağlamlık (Task 3 incelemesi)
    pg = page("en-US", flag=True)
    pg.evaluate("state.settings.lang = 'en'")
    pg.evaluate("() => { EN['Düz'] = 'Plain'; EN['{n} x'] = 'only {n}'; EN['{n} y'] = {other: '{n} ys'}; EN['{n} z'] = {one: '{n} z1'}; }")
    check(pg.evaluate("t('constructor')") == "constructor" and pg.evaluate("t('toString')") == "toString", "t: prototip anahtarı sözlük girişi sayılmaz")
    check(pg.evaluate("tn(3, '{n} x')") == "only 3", "tn: düz metin EN girişi")
    check(pg.evaluate("tn(1, '{n} y')") == "1 ys" and pg.evaluate("tn(2, '{n} z')") == "2 z1", "tn: eksik biçim çökmez, öbürüne düşer")
    check(pg.evaluate("tn('1', '{n} z')") == "1 z1" and pg.evaluate("tn('3', '{n} y')") == "3 ys", "tn: sayısal metin n")
    check(pg.evaluate("t('{n} y', {n: 2})") == "2 ys", "t: nesne girişi other ile")
    pg.context.close()
    # bayraksız: dil satırı ve kurulum seçimi görünmez
    pg = page("en-US", flag=False)
    pg.evaluate("openProfile()")
    check(pg.evaluate("document.getElementById('pfLang').classList.contains('hidden')") and not pg.is_visible("[data-lang-opt]"), "bayraksız: Profil'de dil satırı yok")
    pg.context.close()
    pg = page("tr-TR", flag=False, seeded=False)
    pg.evaluate("() => { localStorage.clear(); void indexedDB.deleteDatabase('aykplus'); }"); pg.reload(); boot(pg)
    check(pg.locator("#onboard [data-lang-opt]").count() == 0, "bayraksız: kurulum adım 1'de dil seçimi yok")
    pg.context.close()
    # bayraklı: Profil → Dil → English
    pg = page("tr-TR", flag=True)
    pg.evaluate("switchTab('nutrition')"); pg.wait_for_timeout(100)
    tr_nav = pg.inner_text(".bottom-nav") + pg.inner_text("#nutriNav")
    before = st(pg)
    pg.evaluate("openProfile()")
    check(pg.is_visible("[data-lang-opt='en']"), "bayraklı: Profil'de dil satırı görünür")
    pg.click("[data-lang-opt='en']"); pg.wait_for_timeout(150)
    check(pg.inner_text("#navBtnGym span") == "Training" and pg.inner_text("#navBtnNutrition span") == "Nutrition", "alt menü İngilizce")
    check(pg.evaluate("document.getElementById('tabTitle').textContent") == "Nutrition", "sekme başlığı İngilizce")
    check(pg.evaluate("document.documentElement.lang") == "en", "html lang en")
    check(pg.get_attribute("[data-lang-opt='en']", "aria-pressed") == "true", "English düğmesi seçili")
    pg.evaluate("closeProfile()"); pg.wait_for_timeout(100)
    nav = pg.inner_text(".bottom-nav") + pg.inner_text("#nutriNav")
    check(not re.search("[çğıöşüÇĞİÖŞÜ]", nav), "nav'da Türkçe harf yok: " + nav.replace(chr(10), " "))
    check("Plans" in pg.inner_text("#nutriNav"), "alt sekme Plans")
    pg.evaluate("switchTab('gym')"); pg.wait_for_timeout(100)
    check("Exercises" in pg.inner_text("#gymRoot") and "Program" in pg.inner_text("#gymRoot") and "Hareketler" not in pg.inner_text("#gymRoot"), "antrenman alt sekmeleri İngilizce")
    pg.evaluate("switchTab('progress')"); pg.wait_for_timeout(100)
    check(pg.inner_text("#progNav").split(chr(10)) == ["Overview", "Weight", "Strength", "Nutrition"], "ilerleme alt sekmeleri İngilizce")
    pg.evaluate("switchTab('nutrition')"); pg.wait_for_timeout(100)
    # kayıtlı en bayrakla yeniden açılışta kalır
    pg.reload(); boot(pg)
    check(pg.evaluate("curLang()") == "en" and pg.inner_text("#navBtnGym span") == "Training", "kayıtlı en yeniden açılışta kalır")
    # dil açılıp kapatma: yalnızca settings.lang farklı
    pg.evaluate("openProfile()"); pg.click("[data-lang-opt='tr']"); pg.wait_for_timeout(150)
    pg.evaluate("closeProfile()"); pg.wait_for_timeout(100)
    after = st(pg)
    check(pg.inner_text(".bottom-nav") + pg.inner_text("#nutriNav") == tr_nav and pg.evaluate("document.documentElement.lang") == "tr", "geri Türkçe: metinler eski hâlinde")
    d1 = {k: v for k, v in before.items() if k not in ("lastSaved",)}
    diff = [k for k in set(before) | set(after) if before.get(k) != after.get(k) and k not in ("lastSaved", "today")]
    check(diff in ([], ["settings"]) and after["settings"]["lang"] == "tr", "tr→en→tr: kayıt aynı kalır (fark: %s)" % diff)
    # sözlük yer tutucu denetimi
    pg.context.close()
    pg = page("en-US", flag=True)
    bad = pg.evaluate(r"""() => { const ph = s => (String(s).match(/\{\w+\}/g) || []).sort().join(); const out = [];
      for (const k of Object.keys(EN)) { const v = EN[k];
        if (typeof v === 'string') { if (ph(k.split('|')[0]) !== ph(v)) out.push(k); }
        else if (v && typeof v === 'object') { if (typeof v.one !== 'string' || typeof v.other !== 'string' || ph(k.split('|')[0]) !== ph(v.one) || ph(v.one) !== ph(v.other)) out.push(k); }
        else out.push(k); }
      return out; }""")
    check(bad == [], "sözlük yer tutucuları tutarlı %s" % bad)
    # kurulum adım 1: dil seçimi ekranı hemen çevirir, bitişte yazılır
    pg.context.close()
    pg = page("tr-TR", flag=True, seeded=False)
    pg.evaluate("() => { localStorage.clear(); void indexedDB.deleteDatabase('aykplus'); }"); pg.reload(); boot(pg)
    check(pg.locator("#onboard [data-lang-opt]").count() == 2, "bayraklı: kurulum adım 1'de dil seçimi var")
    pg.click("#onboard [data-lang-opt='en']"); pg.wait_for_timeout(100)
    check(pg.evaluate("obDraft.lang") == "en" and pg.evaluate("curLang()") == "en" and pg.evaluate("document.documentElement.lang") == "en", "kurulum: seçim hemen İngilizce")
    check(pg.evaluate("state.settings.lang") == "en", "kurulum: dil ayarı en")
    pg = page("en-US", flag=True)
    pg.evaluate("state.settings.lang = 'tr'")
    check(errs == [], "sayfa hatası yok: " + str(errs[:3]))
    b.close()
finally:
    srv.terminate()
print("sayfa hataları:", errs)
print("BAŞARISIZ:" if fails else "TÜMÜ GEÇTİ", fails)
sys.exit(1 if (fails or errs) else 0)
