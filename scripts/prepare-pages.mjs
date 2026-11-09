import { access, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { normalizeBasePath } from "./deployment.mjs";

const output = resolve("dist/client");
const shell = resolve(output, "_shell.html");
const html = await readFile(shell, "utf8");
const base = normalizeBasePath(process.env.VITE_BASE_PATH);
const assets = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
  .map((match) => match[1])
  .filter((url) => url.startsWith("/") && !url.startsWith("//"));
if (!assets.some((url) => url.includes("/assets/"))) throw new Error("Static shell has no bundled assets.");
for (const url of assets) {
  if (!url.startsWith(base)) throw new Error(`Asset outside Pages base: ${url}`);
  await access(resolve(output, url.slice(base.length).split(/[?#]/)[0]));
}
// Actual route documents avoid relying on GitHub's HTTP-404 fallback.
// Add each new concrete content route here when extending the application.
for (const route of ["", "app"]) {
  const directory = resolve(output, route);
  await mkdir(directory, { recursive: true });
  await copyFile(shell, resolve(directory, "index.html"));
}
await writeFile(resolve(output, ".nojekyll"), "");
const domain = (process.env.PAGES_CUSTOM_DOMAIN ?? "").trim();
if (domain) {
  if (!/^(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(domain)) {
    throw new Error("PAGES_CUSTOM_DOMAIN must be a hostname without protocol or path.");
  }
  await writeFile(resolve(output, "CNAME"), `${domain}\n`);
}
console.log(`Static Pages files ready at dist/client (base ${base}).`);