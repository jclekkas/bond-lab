// Renders src/term/prfaq.ts into public/bond-lab-prfaq.pdf with headless Chrome (run: node make-prfaq.mjs).
import { buildSync } from "esbuild";
import puppeteer from "puppeteer-core";
import fs from "fs";
buildSync({ entryPoints: ["src/term/prfaq.ts"], bundle: true, format: "esm", platform: "node", outfile: "node_modules/.prfaq.mjs", logLevel: "error" });
const { prfaqDocument, PRFAQ_PDF } = await import("./node_modules/.prfaq.mjs?" + Date.now());
fs.mkdirSync("public", { recursive: true });
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"], headless: "new" });
const p = await b.newPage();
await p.setRequestInterception(true);
p.on("request", (r) => (r.url().startsWith("data:") || r.url() === "about:blank" ? r.continue() : r.abort()));
await p.setContent(prfaqDocument(false), { waitUntil: "load" });
await p.pdf({ path: "public/" + PRFAQ_PDF, format: "Letter", printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true, headerTemplate: "<span></span>",
  footerTemplate: '<div style="font:7pt -apple-system,Segoe UI,Arial,sans-serif;color:#7a8496;width:100%;padding:0 0.7in;display:flex;justify-content:space-between"><span>Lighthouse ABS Exchange PRFAQ &middot; hypothetical concept; real firm names for realism only; illustrative numbers</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>' });
await b.close();
console.log("wrote public/" + PRFAQ_PDF, fs.statSync("public/" + PRFAQ_PDF).size, "bytes");
