// AYK+ derleme betiği
// src/markup.html + src/data.js + src/app.js  →  build/pre.html  →  Tailwind CSS  →  index.html
// index.html'i ASLA elle düzenleme; her zaman src/ altındaki dosyaları değiştirip `npm run build` çalıştır.
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const p = (...x) => path.join(root, ...x);

execSync(`node --check "${p("src", "app.js")}"`, { stdio: "inherit" });
execSync(`node --check "${p("src", "data.js")}"`, { stdio: "inherit" });

const markup = fs.readFileSync(p("src", "markup.html"), "utf8");
const data = fs.readFileSync(p("src", "data.js"), "utf8");
const app = fs.readFileSync(p("src", "app.js"), "utf8");
for (const [name, txt] of [["data.js", data], ["app.js", app]]) {
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
