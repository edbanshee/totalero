import { appendFileSync } from "node:fs";
import { repositoryBase } from "./deployment.mjs";

const base = repositoryBase(process.env.GITHUB_REPOSITORY ?? "", process.env.PAGES_CUSTOM_DOMAIN);
if (!process.env.GITHUB_ENV) throw new Error("GITHUB_ENV is required.");
appendFileSync(process.env.GITHUB_ENV, `VITE_BASE_PATH=${base}\n`);
console.log(`GitHub Pages base: ${base}`);