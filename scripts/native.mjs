// Aşama B (v86): iPhone uygulaması için web dosyalarını www/ klasörüne kopyalar (Capacitor webDir).
// sw.js KOPYALANMAZ: uygulamada dosyalar zaten telefonun içinde, service worker kullanılmaz.
// Önce `npm run build` çalışmış olmalı (index.html güncel).
import { cpSync, rmSync, mkdirSync, existsSync } from "node:fs";
const OUT = "www";
const FILES = ["index.html", "foods.js", "foods-en.js", "manifest.json", "icon.png", "icon-192.png", "icon-512.png", "privacy.html", "support.html"];
const DIRS = ["img", "vendor"];
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT);
for (const f of FILES) {
  if (!existsSync(f)) { console.error("✗ eksik dosya: " + f); process.exit(1); }
  cpSync(f, OUT + "/" + f);
}
for (const d of DIRS) cpSync(d, OUT + "/" + d, { recursive: true });
console.log("✓ www/ hazır (" + (FILES.length + DIRS.length) + " öğe)");
