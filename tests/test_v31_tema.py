# v31: Görünüm (Sistem / Koyu / Aydınlık), aydınlık tema tüm uygulamada, her ekranda okunurluk ölçümü.
import os, sys, json, subprocess, time
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SHOTS = os.path.join(os.path.dirname(__file__), "shots")
os.makedirs(SHOTS, exist_ok=True)
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8780'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
URL = "http://localhost:8780/index.html"
def st(pg): return pg.evaluate("JSON.parse(localStorage.getItem('ayk_plus_v5_state'))")
def bg(pg, sel="body"): return pg.evaluate("s => getComputedStyle(document.querySelector(s)).backgroundColor", sel)
def is_light(pg): return pg.evaluate("document.documentElement.classList.contains('light')")

# Okunurluk: görünen her yazının zemine oranı (normal yazı 4,5:1, büyük yazı 3:1). Renkli dolgu/degrade zeminler dahil.
CONTRAST_JS = r"""(rootSel) => {
const ROOT = rootSel ? document.querySelector(rootSel) : document.body;
const vis = e => e.checkVisibility && e.checkVisibility({checkOpacity:true, checkVisibilityCSS:true}) && e.getBoundingClientRect().width > 0;
const parse = s => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [p[0],p[1],p[2], p.length>3 ? p[3] : 1]; };
const lum = c => { const f = v => { v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); }; return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2]); };
const ratio = (a,b) => { const x=lum(a), y=lum(b); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); };
const over = (t, b) => { const a=t[3]; return [t[0]*a+b[0]*(1-a), t[1]*a+b[1]*(1-a), t[2]*a+b[2]*(1-a), 1]; };
function bgOf(el) {
  const layers = []; let grad = null;
  for (let e = el; e; e = e.parentElement) {
    const cs = getComputedStyle(e);
    if (cs.backgroundImage && cs.backgroundImage.includes('gradient')) { const st = [...cs.backgroundImage.matchAll(/rgba?\([^)]+\)/g)].map(m => parse(m[0])).filter(c => c && c[3] > 0.5); if (st.length) { grad = st; break; } }
    const c = parse(cs.backgroundColor); if (c && c[3] > 0) { layers.push(c); if (c[3] >= 1) break; }
  }
  let bases = grad ? grad.map(g => [g[0],g[1],g[2],1]) : [parse(getComputedStyle(document.body).backgroundColor) || [0,0,0,1]];
  return bases.map(b => { let c = b; for (let i = layers.length-1; i >= 0; i--) c = over(layers[i], c); return c; });
}
const bad = [];
for (const e of ROOT.querySelectorAll('*')) {
  if (!vis(e) || e.closest('svg') || e.closest('.t-bodymap')) continue;
  if (![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
  const cs = getComputedStyle(e), fs = parseFloat(cs.fontSize), fw = parseInt(cs.fontWeight) || 400;
  let col = parse(cs.color); if (!col) continue;
  let op = 1; for (let x = e; x; x = x.parentElement) op *= parseFloat(getComputedStyle(x).opacity);
  if (op < 0.5 || e.closest('[disabled]') || e.closest('input::placeholder')) continue;
  const r = Math.min(...bgOf(e).map(b => ratio(col[3] < 1 ? over(col, b) : col, b)));
  const need = (fs >= 24 || (fs >= 18.66 && fw >= 700)) ? 3 : 4.5;
  if (r < need) bad.push(e.textContent.replace(/\s+/g,' ').trim().slice(0, 24) + ' ' + r.toFixed(2) + '/' + need);
}
return bad;
}"""

SEED = r"""() => {
  const D = 864e5, now = Date.now(), key = t => todayStr(new Date(t));
  for (let w = 5; w >= 0; w--) [0, 2].forEach((dd, j) => {
    const ts = weekStart() - w * 7 * D + dd * D + 18 * 3600e3; if (ts > now) return;
    [["Barbell Bench Press", "Göğüs", 80], ["Lat Pulldown", "Sırt", 60]].forEach(([name, muscle, base]) => {
      const kg = base + (5 - w) * 2.5; (state.exerciseHistory[exKey(name)] = state.exerciseHistory[exKey(name)] || []).push({ ts, logId: "l" + w + j, kind: "weight", name, muscle, sets: [{ kg, reps: 8 }, { kg, reps: 6 }] });
    });
    state.workoutLogs.push({ id: "l" + w + j, ts, volume: 4000, cardioMin: 10, cardioKm: 0, prs: 0, sets: 4 });
  });
  for (let i = 20; i >= 1; i--) state.weightLogs.push({ date: fmtDate(now - i * D), weight: 98 - i * 0.05, ts: now - i * D });
  for (let i = 1; i <= 10; i++) state.dailyLogs[key(now - i * D)] = { kcal: 2400, p: 190, eatenKcal: [2300, 2600, 2900, 2450][i % 4], eatenP: 180, mealsDone: i % 5 ? 4 : 0, mealsTotal: 4, water: 3, calTarget: 2400, proTarget: 190 };
  state.measurements = [{ ts: now - 20 * D, bel: 100 }, { ts: now - 2 * D, bel: 98 }];
  state.mobilityRoutine.items[0].done = true; const m = dayMeals(); if (m[0]) m[0].done = true;
  renderAll();
}"""
SCREENS = [
  ("beslenme-bugün", "switchTab('nutrition'); setNutriView('today')", None), ("beslenme-menüler", "setNutriView('menus')", None),
  ("beslenme-besinler", "setNutriView('foods')", None), ("beslenme-geçmiş", "setNutriView('history')", None),
  ("antrenman-bugün", "switchTab('gym'); setGymView('today')", None), ("antrenman-program", "setGymView('program')", None),
  ("antrenman-hareketler", "setGymView('library')", None), ("antrenman-geçmiş", "setGymView('history')", None),
  ("antrenman-aktif", "setGymView('today'); startWorkout()", None),
  ("mobilite-liste", "state.gymActive = false; switchTab('mobility')", None), ("mobilite-detay", "mobOpen(state.mobilityRoutine.items[0].id)", None),
  ("mobilite-ekle", "mobAddOpen()", None), ("mobilite-sayaç", "mobBack(); mobTimerStart(state.mobilityRoutine.items.find(i => i.mode === 'time').id)", "#mobTimer"),
  ("ilerleme-genel", "mobTimerClose(); switchTab('progress'); setProgressView('genel')", None), ("ilerleme-kilo", "setProgressView('kilo')", None),
  ("ilerleme-güç", "setProgressView('guc')", None), ("ilerleme-beslenme", "setProgressView('beslenme')", None),
  ("profil", "openProfile()", "#profilePage"),
]

def ctx_page(b, scheme, init_theme=None):
    ctx = b.new_context(color_scheme=scheme, viewport={"width": 390, "height": 844}, device_scale_factor=1, is_mobile=True, has_touch=True)
    ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.getElementById('splash'); if(s) s.remove();})")
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
    return ctx, pg

try:
  with sync_playwright() as p:
    b = p.chromium.launch()

    # ================= 1) VARSAYILAN: SİSTEM =================
    ctx, pg = ctx_page(b, "light")
    pg.goto(URL); pg.wait_for_timeout(200)
    pg.evaluate("s => localStorage.setItem('ayk_plus_v5_state', s)", json.dumps({"activeTab": "gym", "settings": {"nutriLight": True}})); pg.reload(); pg.wait_for_timeout(350)
    s = st(pg)
    check(s["settings"]["theme"] == "system" and s["settings"]["nutriLight"] is True, "eski kayıt: tema yok → Sistem; eski nutriLight alanı silinmedi")
    check(is_light(pg) and bg(pg) == "rgb(242, 242, 245)", "Sistem + telefon aydınlık → aydınlık (antrenman zemini #F2F2F5)")
    check(pg.evaluate("document.querySelector('meta[name=theme-color]').content") == "rgb(242, 242, 245)", "theme-color zemine uyuyor")
    # Not: Playwright sistem teması değişiminde "change" olayı göndermiyor; uygulamaya dönüş (focus) yedeği denenir
    pg.emulate_media(color_scheme="dark"); pg.evaluate("window.dispatchEvent(new Event('focus'))"); pg.wait_for_timeout(150)
    check(not is_light(pg) and bg(pg) == "rgb(0, 0, 0)", "telefon koyuya geçince uygulamaya dönüşte koyu")
    pg.emulate_media(color_scheme="light"); pg.evaluate("document.dispatchEvent(new Event('visibilitychange'))"); pg.wait_for_timeout(150)
    check(is_light(pg), "telefon aydınlığa dönünce uygulama aydınlık")
    pg.evaluate("switchTab('nutrition')"); pg.wait_for_timeout(100)
    check(pg.evaluate("document.body.classList.contains('nutri-light')") and bg(pg) == "rgb(243, 245, 242)", "Beslenme kendi aydınlık temasında (Warm Alabaster)")
    check(pg.evaluate("getComputedStyle(document.querySelector('.n-hero')).color") == "rgb(255, 255, 255)", "Beslenme özet kartı aydınlıkta da koyu, yazısı beyaz")

    # ================= 2) DÜĞME VE PROFİL =================
    for tab in ["gym", "mobility", "progress", "nutrition"]:
        pg.evaluate(f"switchTab('{tab}')"); pg.wait_for_timeout(60)
        check(pg.is_visible("#nutriThemeBtn"), f"tema düğmesi görünüyor ({tab})")
    pg.evaluate("switchTab('gym')")
    check(pg.get_attribute("#nutriThemeBtn", "aria-label") == "Koyu temaya geç", "aydınlıkta düğme 'Koyu temaya geç'")
    pg.click("#nutriThemeBtn"); pg.wait_for_timeout(120)
    check(st(pg)["settings"]["theme"] == "dark" and not is_light(pg) and bg(pg) == "rgb(0, 0, 0)", "düğme → Koyu (sistem aydınlık olsa da)")
    check(pg.evaluate("localStorage.getItem('ayk_theme')") == "dark", "açılış aynası güncel (ayk_theme)")
    pg.reload(); pg.wait_for_timeout(300)
    check(not is_light(pg) and st(pg)["settings"]["theme"] == "dark", "yeniden açınca Koyu kalıyor")
    pg.evaluate("openProfile()"); pg.wait_for_timeout(150)
    pressed = pg.eval_on_selector_all("[data-theme-opt]", "els => els.map(e => e.dataset.themeOpt + ':' + e.getAttribute('aria-pressed'))")
    check(pressed == ["system:false", "dark:true", "light:false"], f"Profil → Görünüm: seçili Koyu ({pressed})")
    pg.click('[data-theme-opt="light"]'); pg.wait_for_timeout(120)
    check(is_light(pg) and st(pg)["settings"]["theme"] == "light", "Profil'de Aydınlık → anında aydınlık, Kaydet beklemeden")
    check(bg(pg, "#profileSave") == "rgb(24, 24, 27)", "Profil 'Kaydet' aydınlıkta koyu grafit")
    small = pg.evaluate("""() => [...document.querySelectorAll('[data-theme-opt]')].filter(e => e.getBoundingClientRect().height < 44).length""")
    check(small == 0, "Görünüm düğmeleri ≥ 44 px")
    pg.click('[data-theme-opt="system"]'); pg.wait_for_timeout(120)
    check(st(pg)["settings"]["theme"] == "system" and is_light(pg), "Sistem'e dönüş")
    pg.evaluate("hideProfile()")
    # açılışta yanıp sönme yok: uygulama betiği çalışmadan önce html.light hazır
    pg.evaluate("setTheme('light')"); pg.wait_for_timeout(80)
    ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{ window.__earlyLight = document.documentElement.classList.contains('light'); })")
    pg.emulate_media(color_scheme="dark"); pg.reload(); pg.wait_for_timeout(300)
    check(pg.evaluate("window.__earlyLight") is True, "açılışta tema sayfa çizilmeden uygulanıyor (koyu sistemde Aydınlık seçili)")
    ctx.close()

    # ================= 3) OKUNURLUK: HER EKRAN, İKİ TEMA =================
    for scheme in ["light", "dark"]:
        ctx, pg = ctx_page(b, scheme)
        pg.goto(URL); pg.wait_for_timeout(300); pg.evaluate(SEED); pg.wait_for_timeout(200)
        for name, js, root in SCREENS:
            pg.evaluate("() => { " + js + " }"); pg.wait_for_timeout(180)
            bad = pg.evaluate(CONTRAST_JS, root)
            check(not bad, f"[{scheme}] {name}: tüm yazılar okunur ({bad[:3]})")
            ov = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
            check(ov <= 0, f"[{scheme}] {name}: yatay taşma yok")
        if scheme == "light":
            pg.evaluate("hideProfile(); switchTab('gym'); setGymView('library')"); pg.wait_for_timeout(150)
            # v38: koyu sahne kartı yerine zeminsiz çizim (anatomy-light.webp) açık kartta; siyah zeminli resim gizli
            bm = pg.evaluate("""(() => { const e = document.querySelector('.t-bodymap'), cs = getComputedStyle(e);
              return { bg: cs.backgroundColor, img: cs.backgroundImage, vis: getComputedStyle(e.querySelector('img')).visibility }; })()""")
            check(bm["bg"] != "rgb(11, 11, 13)" and "anatomy-light.webp" in bm["img"] and bm["vis"] == "hidden", f"aydınlıkta vücut haritası açık kartta, zeminsiz çizimle ({bm})")
            ok_img = pg.evaluate("new Promise(r => { const i = new Image(); i.onload = () => r(i.naturalWidth); i.onerror = () => r(0); i.src = 'anatomy-light.webp'; })")
            check(ok_img == 765, f"zeminsiz çizim yükleniyor ({ok_img} px)")
            pg.screenshot(path=SHOTS + "/v31_aydinlik_hareketler.png")
            pg.evaluate("setGymView('today')"); pg.wait_for_timeout(100); pg.screenshot(path=SHOTS + "/v31_aydinlik_antrenman.png")
            pg.evaluate("switchTab('mobility')"); pg.wait_for_timeout(100); pg.screenshot(path=SHOTS + "/v31_aydinlik_mobilite.png")
            pg.evaluate("switchTab('progress'); setProgressView('genel')"); pg.wait_for_timeout(100); pg.screenshot(path=SHOTS + "/v31_aydinlik_ilerleme.png")
        ctx.close()

    check(not errs, f"sayfa hatası yok ({errs[:3]})")
    b.close()
finally:
    srv.terminate()
print(f"\n{len(fails)} hata" if fails else "\nHEPSİ GEÇTİ")
sys.exit(1 if fails else 0)
