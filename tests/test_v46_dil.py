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
    check(st(pg)["settings"]["lang"] == "tr" and st(pg)["dataVer"] == 6, "göç adım 5: lang tr, dataVer 6 (v53)")
    check(pg.evaluate("curLang()") == "tr" and pg.evaluate("locale()") == "tr-TR", "tr: curLang/locale")
    pg.context.close()
    # 2) telefon en-US + bayrak açıkken sahibin kaydı Türkçe
    pg = page("en-US", flag=True)
    check(pg.evaluate("curLang()") == "tr", "telefon İngilizce, eski kayıt Türkçe kalır")
    # 4) kayıtta lang en, bayrak yok — v52: İngilizce herkese açık (EN_PUBLIC = true), bayraksız da en
    pg.context.close()
    pg = page("en-US", flag=False)
    pg.evaluate("state.settings.lang = 'en'")
    check(pg.evaluate("curLang()") == "en" and pg.evaluate("langAvailable()") is True, "v52: kayıtta en, bayraksız da en (İngilizce yayında)")
    pg.context.close()
    # 3) yeni kurulum
    check(fresh_lang("en-US", False) == ["en", "en"], "v52: bayraksız yeni kurulum telefon diline göre en (İngilizce herkese açık)")
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
    # bayraksız: v52'den beri İngilizce herkese açık → dil satırı ve kurulum seçimi GÖRÜNÜR (eskiden gizliydi)
    pg = page("en-US", flag=False)
    pg.evaluate("openProfile()")
    check(not pg.evaluate("document.getElementById('pfLang').classList.contains('hidden')") and pg.is_visible("#pfLang [data-lang-opt]"), "v52 bayraksız: Profil'de dil satırı görünür")
    pg.context.close()
    pg = page("tr-TR", flag=False, seeded=False)
    pg.evaluate("() => { localStorage.clear(); void indexedDB.deleteDatabase('aykplus'); }"); pg.reload(); boot(pg)
    check(pg.locator("#onboard [data-lang-opt]").count() == 2, "v52 bayraksız: kurulum adım 1'de dil seçimi var")
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
    diff = [k for k in set(before) | set(after) if before.get(k) != after.get(k) and k not in ("lastSaved", "today")]
    sx = lambda d: {k: v for k, v in d["settings"].items() if k != "lang"}
    check(diff in ([], ["settings"]) and after["settings"]["lang"] == "tr" and sx(before) == sx(after), "tr→en→tr: kayıt yalnızca settings.lang farkıyla aynı (fark: %s)" % diff)
    # yedek geri yükleme: lang en (bayrakla) korunur; eski sürüm (dataVer 4) yedeği tr olur
    OWN = json.load(open(FIXTURE, encoding="utf-8"))
    bk = json.dumps({**OWN, "dataVer": 5, "settings": {**OWN.get("settings", {}), "lang": "en"}})
    pg.evaluate("t => { void restoreFromText(t, {onboarding: true}); }", bk); pg.wait_for_timeout(500)
    check(pg.evaluate("curLang()") == "en" and pg.evaluate("document.documentElement.lang") == "en", "dataVer 5 yedeği (lang en) geri yüklenince en kalır")
    bk4 = json.dumps({**OWN, "dataVer": 4, "settings": {**OWN.get("settings", {}), "lang": "en"}})
    pg.evaluate("t => { void restoreFromText(t, {onboarding: true}); }", bk4); pg.wait_for_timeout(500)
    check(pg.evaluate("curLang()") == "tr" and pg.evaluate("document.documentElement.lang") == "tr", "dataVer 4 yedeği geri yüklenince tr (göç adım 5)")
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
    # I1: kayıtlı en ile açılış (setLang YOK), sonra Türkçe kayda dönüş: statik metin ve html lang Türkçeye döner
    pg.context.close()
    pg = page("en-US", flag=True)
    OWN1 = json.load(open(FIXTURE, encoding="utf-8"))
    seed(pg, {**OWN1, "dataVer": 5, "settings": {**OWN1.get("settings", {}), "lang": "en"}})
    check(pg.evaluate("curLang()") == "en" and pg.inner_text("#navBtnGym span") == "Training", "I1: kayıtlı en ile açılış İngilizce")
    pg.evaluate("() => { state.settings.lang = 'tr'; renderAll(); }"); pg.wait_for_timeout(150)
    check(pg.inner_text("#navBtnGym span") == "Antrenman" and pg.evaluate("document.documentElement.lang") == "tr", "I1: setLang olmadan Türkçeye dönüşte statik metin ve html lang Türkçe")
    # M2 (v47): src/app/*.js içinde `t` adlı HİÇBİR bağlama olamaz (global t()'i gölgeler)
    import re, glob
    app_files = lambda: [fn for fn in sorted(glob.glob(os.path.join(REPO, "src", "app", "*.js"))) if not fn.endswith("17-sozluk-en.js")]
    def code_only(src):
        """Yorumları, metinleri, düzenli ifadeleri ve şablon metnini boşaltır; ${...} içi kod kalır."""
        out = []; i = 0; n = len(src); stack = []  # stack: şablon içi ${ süslü sayaçları
        def prev_sig():
            for ch in reversed(out):
                if not ch.isspace(): return ch[-1]
            return ""
        def prev_word():
            m = re.search(r"([A-Za-z_$][\w$]*)\s*$", "".join(out[-20:])); return m.group(1) if m else ""
        def template(i):
            out.append("`")
            while i < n:
                c = src[i]
                if c == "\\": i += 2
                elif c == "`": out.append("`"); return i + 1
                elif src.startswith("${", i):
                    stack.append(0); out.append("${"); return i + 2
                else:
                    if c == "\n": out.append("\n")
                    i += 1
            return i
        while i < n:
            c = src[i]
            if src.startswith("//", i):
                while i < n and src[i] != "\n": i += 1
            elif src.startswith("/*", i):
                j = src.find("*/", i + 2); j = n if j < 0 else j + 2; out.append("\n" * src.count("\n", i, j)); i = j
            elif c in "\"'":
                j = i + 1
                while j < n and src[j] != c and src[j] != "\n": j += 2 if src[j] == "\\" else 1
                out.append(c + c); i = j + 1
            elif c == "`":
                i = template(i + 1)
            elif c == "/" and (prev_sig() == "" or prev_sig() in "(,=:[!&|?{};+-*%<>~^" or prev_word() in ("return", "typeof", "case", "in", "of")):
                j = i + 1; cls = False
                while j < n and src[j] != "\n":
                    if src[j] == "\\": j += 2; continue
                    if src[j] == "[": cls = True
                    elif src[j] == "]": cls = False
                    elif src[j] == "/" and not cls: break
                    j += 1
                out.append("/r/"); i = j + 1
                while i < n and src[i].isalpha(): i += 1
            elif stack and c == "{":
                stack[-1] += 1; out.append(c); i += 1
            elif stack and c == "}":
                if stack[-1] == 0:
                    stack.pop(); out.append("}"); i = template(i + 1)
                else:
                    stack[-1] -= 1; out.append(c); i += 1
            else:
                out.append(c); i += 1
        return "".join(out)
    KW = r"(?!(?:if|for|while|switch|catch|function|return|typeof|void|await|new|else|do)\b)"
    def t_bindings(code):
        """code_only çıktısında `t` bağlamalarını (satır no, tür) listeler.
        Bilinen sınır: `)` hemen ardından gelen düzenli ifade (`if (x) /'/.test(y)`) bölme sayılır."""
        found = []
        NP = r"(?:[^()]|\([^()]*\))*"   # bir düzey iç içe parantezli (varsayılan değerlerde f())
        TT = r"(?<![\w$.])t\b(?!\s*[(.\[])"
        pats = [
            ("const/let/var t", r"\b(?:const|let|var)\s+t\b"),
            ("const/let/var ... , t", r"\b(?:const|let|var)\s+[^;]*?,\s*t\s*=(?![=>])|\b(?:let|var)\s+(?:[\w$]+\s*,\s*)+t\s*[;,]"),
            ("yapı bozma", r"\b(?:const|let|var)\s*[\{\[][^}\]]*?\bt\b[^}\]]*[\}\]]\s*(?:=(?![=>])|\bof\b|\bin\b)"),
            ("function(t)", r"\bfunction\b\s*[\w$]*\s*\(" + NP + TT + NP + r"\)"),
            ("t =>", r"(?<![\w$.])t\s*=>"),
            ("(…t…) =>", r"\(" + NP + TT + NP + r"\)\s*=>"),
            ("catch(t)", r"\bcatch\s*\(\s*(?:t\s*\)|[\{\[][^}\]]*\bt\b)"),
            ("yöntem(t) {", r"(?<![\w$.])" + KW + r"[\w$]+\s*\(" + NP + TT + NP + r"\)\s*\{"),
        ]
        for name, pat in pats:
            for m in re.finditer(pat, code):
                found.append((code.count("\n", 0, m.start()) + 1, name))
        return found
    bad_lines = [
        "const t = 1;", "let a = 2, t = 3;", "var {x, t} = o;", "const [t, u] = z;", "let a, t;",
        "for (const t of xs) {}", "for (const [k, t] of xs) {}", "for (const {t} in o) {}", "for (let [t] of xs) {}",
        "function f(t) {}", "function g(a, t, b) {}", "const h = function(t) {};", "function k(a, b = f(), t) {}",
        "xs.map(t => t);", "ys.map((t, i) => i);", "zs.map((a, t) => a);", "ws.map((t, b = f()) => b);", "vs.map((a = g(), t) => a);",
        "try {} catch (t) {}", "try {} catch ({ t }) {}", "try {} catch ([t]) {}",
        "const o2 = { m(t) { return 1; } };", "async function q(t) {}", "const r = async t => 1;",
    ]
    miss = [ln for ln in bad_lines if not t_bindings(code_only(ln))]
    check(miss == [], "M2 öz-sınama: her yasak örnek satır yakalanır, kaçan: %s" % miss)
    clean_lines = [
        "// const t = 1;", "/* t => 1 */", 'const s = "t => 1 const t";', "const q = 'function(t)';", "const r = /t(=>)/g;",
        "const z = `a'b ${t(\"x\")} (t) => 1`;", "const w = `Profil'den ${t(\"y\")}`;", "if (t) {}", 'while (t("a")) {}',
        'items.forEach(it => t("k"));', "const k = tg.t;", "const o = { t: 1, u: 2 };", 'const m = t("x") + t("y");',
        "const p = { a: x.t, b: y.t };", "xs.map(it => it.t);", "const f = (a, b) => t(a) + b;", "function f(a, b) { return t(a); }",
    ]
    fp = [ln for ln in clean_lines if t_bindings(code_only(ln))]
    check(fp == [], "M2 öz-sınama: yorum/metin/şablon/global t kullanımı/.t/t: anahtarı yanlış alarm vermez, alarm veren: %s" % fp)
    shadow = []; nfiles = 0
    for fn in app_files():
        nfiles += 1
        for ln, kind in t_bindings(code_only(open(fn, encoding="utf-8").read())):
            shadow.append("%s:%d %s" % (os.path.basename(fn), ln, kind))
    check(nfiles >= 15 and shadow == [], "M2: src/app/*.js içinde `t` bağlaması yok (%d dosya) %d yer: %s" % (nfiles, len(shadow), shadow))
    # M8: koddaki t("…")/tn(n,"…") anahtarlarından sözlükte (EN) olmayanlar. v46'da yalnızca UYARI (sayı yazılır);
    # v49'da (İngilizce herkese açılırken) bu denetim BAŞARISIZLIK olur.
    enkeys = set(pg.evaluate("Object.keys(EN)"))
    lit = r'"((?:[^"\\n]|\.)*)"'
    used = set()
    for fn in app_files():
        raw = open(fn, encoding="utf-8").read()
        for mm in re.finditer(r"(?<![.\w])t\(\s*" + lit, raw): used.add(mm.group(1))
        for mm in re.finditer(r"(?<![.\w])tn\(\s*[^,()]+,\s*" + lit, raw): used.add(mm.group(1))
    def unesc(k):
        try: return json.loads('"' + k + '"')
        except Exception: return k
    missing = sorted(k for k in used if unesc(k) not in enkeys)
    print("UYARI M8: EN sözlüğünde eksik t()/tn() anahtarı: %d / %d" % (len(missing), len(used)))
    pg = page("en-US", flag=True)
    pg.evaluate("state.settings.lang = 'tr'")
    check(errs == [], "sayfa hatası yok: " + str(errs[:3]))
    b.close()
finally:
    srv.terminate()
print("sayfa hataları:", errs)
print("BAŞARISIZ:" if fails else "TÜMÜ GEÇTİ", fails)
sys.exit(1 if (fails or errs) else 0)
