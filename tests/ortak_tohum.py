# v44: testlerin ortak açılış betiği. Açılış animasyonunu kaldırır ve yeni kurulum yerine "eski varsayılan"
# (sahibin v43 varsayılanları, tests/fixtures/eski_varsayilan.json) ile açar: window.AYK_TEST_SEED → freshState().
import os, json
_HERE = os.path.dirname(os.path.abspath(__file__))
FIXTURE = os.path.join(_HERE, "fixtures", "eski_varsayilan.json")
SPLASH_OFF = "document.addEventListener('DOMContentLoaded',()=>{const s=document.getElementById('splash'); if(s) s.remove();})"
with open(FIXTURE, encoding="utf-8") as _f:
    _SEED = json.load(_f)
TEST_INIT = "window.AYK_TEST_SEED = " + json.dumps(_SEED, ensure_ascii=False) + ";\n" + SPLASH_OFF
