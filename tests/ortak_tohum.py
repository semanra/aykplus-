# v44: testlerin ortak açılış betiği. Açılış animasyonunu kaldırır ve yeni kurulum yerine "eski varsayılan"
# (sahibin v43 varsayılanları, tests/fixtures/eski_varsayilan.json) ile açar: window.AYK_TEST_SEED → freshState().
import os, json
_HERE = os.path.dirname(os.path.abspath(__file__))
FIXTURE = os.path.join(_HERE, "fixtures", "eski_varsayilan.json")
# v55: window.AYK_NO_ANIM = true → uygulama içi animasyonlar (halka, sayaç, set tiki, tema geçişi) anında son hâlde
# v59: window.AYK_PF_FLAT = true → Profil bölümleri alt sayfa yerine eskisi gibi alt alta (eski testler alanları doğrudan
# doldurur). Gerçek düzen: tests/test_v59_profil_duzen.py ve kontrol aracının profil-ana/-hedef/... ekranları (bayrak false).
PF_FLAT_FLAG = "window.AYK_PF_FLAT = true;"
NO_ANIM_FLAG = "window.AYK_NO_ANIM = true;"
SPLASH_OFF = PF_FLAT_FLAG + NO_ANIM_FLAG + "document.addEventListener('DOMContentLoaded',()=>{const s=document.getElementById('splash'); if(s) s.remove();})"
with open(FIXTURE, encoding="utf-8") as _f:
    _SEED = json.load(_f)
TEST_INIT = "window.AYK_TEST_SEED = " + json.dumps(_SEED, ensure_ascii=False) + ";\n" + SPLASH_OFF
SEED_ONLY = PF_FLAT_FLAG + NO_ANIM_FLAG + "window.AYK_TEST_SEED = " + json.dumps(_SEED, ensure_ascii=False) + ";"   # açılış animasyonu kalır (splash testleri)

def with_defaults(seed):
    """Eski normalizeState davranışı: {...DEFAULT_STATE, ...kayıt}, ayarlar bir seviye derin birleşir.
    Kısmi tohum kayıtlarını sahibin eski varsayılanlarıyla tamamlar (dataVer taşınmaz: göç adımları çalışsın)."""
    base = {k: v for k, v in _SEED.items() if k != "dataVer"}
    out = {**base, **seed}
    out["settings"] = {**_SEED.get("settings", {}), **seed.get("settings", {})}
    return out
