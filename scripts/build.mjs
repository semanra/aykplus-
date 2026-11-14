// AYK+ derleme betiği
// src/markup.html + src/data.js + src/app/*.js (ad sırasıyla birleştirilir)  →  build/pre.html  →  Tailwind CSS  →  index.html
// index.html'i ASLA elle düzenleme; her zaman src/ altındaki dosyaları değiştirip `npm run build` çalıştır.
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const p = (...x) => path.join(root, ...x);

// v34: uygulama kodu src/app/ altında bölümlere ayrıldı (01-temel.js … 13-cizim-baslat.js). Dosyalar ADI SIRASIYLA
// birleştirilir; en üst düzeydeki komutların sırası önemli olduğu için yeni dosyayı doğru numarayla ekle.
const appDir = p("src", "app");
const appFiles = fs.readdirSync(appDir).filter(f => /^\d{2}-[\w-]+\.js$/.test(f)).sort();
if (!appFiles.length) throw new Error("src/app/ içinde .js dosyası yok.");
const app = appFiles.map(f => fs.readFileSync(path.join(appDir, f), "utf8")).join("");
fs.mkdirSync(p("build"), { recursive: true });
fs.writeFileSync(p("build", "app.js"), app);
execSync(`node --check "${p("build", "app.js")}"`, { stdio: "inherit" });
execSync(`node --check "${p("src", "data.js")}"`, { stdio: "inherit" });
// v18: besin veritabanı ayrı dosyada (scripts/usda/build_foods.py üretir)
if (!fs.existsSync(p("foods.js"))) throw new Error("foods.js yok; scripts/usda/build_foods.py ile üret.");
execSync(`node --check "${p("foods.js")}"`, { stdio: "inherit" });

const markup = fs.readFileSync(p("src", "markup.html"), "utf8");
const data = fs.readFileSync(p("src", "data.js"), "utf8");
for (const [name, txt] of [["data.js", data], ["src/app/*.js", app]]) {
  if (txt.includes("</script")) throw new Error(`${name} içinde "</script" geçiyor; HTML'i bozar.`);
}
for (const ph of ["/*__TAILWIND__*/", "/*__DATA__*/", "/*__APP__*/"]) {
  if (!markup.includes(ph)) throw new Error(`markup.html içinde ${ph} yer tutucusu yok.`);
}

fs.mkdirSync(p("build"), { recursive: true });
const pre = markup.replace("/*__DATA__*/", () => data).replace("/*__APP__*/", () => app);
fs.writeFileSync(p("build", "pre.html"), pre);

execSync(`npx tailwindcss -c tailwind.config.cjs -i src/tailwind.css -o build/tw.css --minify`, { cwd: root, stdio: "inherit" });
const css = fs.readFileSync(p("build", "tw.css"), "utf8");
fs.writeFileSync(p("index.html"), pre.replace("/*__TAILWIND__*/", () => css));

const kb = (fs.statSync(p("index.html")).size / 1024).toFixed(0);
const ver = (pre.match(/AYK\+ v(\d+)/) || [])[1];
const cache = (fs.readFileSync(p("sw.js"), "utf8").match(/aykplus-v(\d+)/) || [])[1];
console.log(`✓ index.html oluşturuldu (${kb} KB) · uygulama sürümü v${ver} · önbellek aykplus-v${cache}`);
