import puppeteer from "puppeteer-core";
import http from "http"; import fs from "fs";
const html = fs.readFileSync("dist/index.html");
const srv = http.createServer((q, s) => { s.writeHead(200, { "content-type": "text/html" }); s.end(html); }).listen(4173);
const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"], headless: "new" });
const errors = [], external = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function open(url, tag, opts = {}) {
  const page = await browser.newPage();
  await page.setViewport(opts.mobile ? { width: 390, height: 844, deviceScaleFactor: 2 } : { width: 1280, height: 900 });
  if (opts.dark) await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]);
  page.on("console", (m) => { if (["error", "warning"].includes(m.type())) errors.push(`${tag} ${m.type()}: ${m.text()}`); });
  page.on("pageerror", (e) => errors.push(`${tag} pageerror: ${e.message}`));
  page.on("request", (r) => { const u = r.url(); if (!/^(http:\/\/localhost:4173|file:|data:)/.test(u)) external.push(u); });
  await page.goto(url, { waitUntil: "load" });
  const click = async (txt, sel = "button", quiet = false) => {
    const ok = await page.evaluate((txt, sel) => { const b = [...document.querySelectorAll(sel)].find((x) => x.textContent.trim().includes(txt) && !x.disabled); if (b) { b.click(); return true; } return false; }, txt, sel);
    if (!ok && !quiet) errors.push(`${tag} could not click "${txt}"`);
    await sleep(40); return ok;
  };
  const tables = () => page.evaluate(() => [...document.querySelectorAll("table")].map((t) => t.innerText.replace(/\s+/g, " ")));
  const stage = (n) => click(`${n}. `);
  return { page, click, tables, stage };
}
const ASSETS = ["Auto ABS (car loans)", "MBS (home mortgages)", "Credit card ABS (credit cards)", "Student loan ABS (student loans)", "Equipment ABS (equipment leases)", "Royalty ABS (song royalties)", "CLO (business loans)"];
const { page, click, tables, stage } = await open("http://localhost:4173/", "desktop");
await stage(2); await page.evaluate(() => [...document.querySelectorAll("section")].find((x) => x.textContent.startsWith("Market participants"))?.scrollIntoView());
await sleep(100); await page.screenshot({ path: "/workspace/shot-diagram.png" });
// investor table + trade log role checks need stage 6/7 content, handled per asset below
const report = [];
for (const name of ASSETS) {
  await stage(1); await click(name);
  const r = [`== ${name}`];
  r.push("  real-life: " + (await page.evaluate(() => [...document.querySelectorAll("h2")].map((h) => h.textContent).filter((x) => /in real life|Good to know/.test(x)).join(" | "))));
  await stage(2); await click("Investors"); await click("(the special purpose vehicle)");
  r.push("  SPV card: " + (await page.evaluate(() => [...document.querySelectorAll("section")].find((x) => x.querySelector("h2")?.textContent.startsWith("Special purpose vehicle, SPV"))?.innerText.replace(/\s+/g, " ").slice(0, 230))));
  await click("So the lender's creditors can't grab them");
  r.push("  SPV quiz feedback: " + (await page.evaluate(() => document.body.innerText.includes("Correct, +20 XP. After a true sale"))));
  r.push("  players: " + (await page.evaluate(() => [...document.querySelectorAll("button")].filter(b=>b.textContent.includes("Collect")||b.textContent.includes("Servic")||b.textContent.includes("Capital")).map(b=>b.textContent).slice(0,3).join(", "))));
  await stage(3);
  r.push("  basket: " + (await page.evaluate(() => [...document.querySelectorAll("section")].find((s) => s.textContent.includes("Collateral pool (your basket"))?.innerText.replace(/\s+/g, " ").slice(0, 260))));
  await stage(5); await click("Request credit ratings", "button", true); await click("Re-check ratings", "button", true);
  r.push("  grades: " + (await tables())[0]);
  await stage(6);
  r.push("  book: " + (await tables())[0]);
  r.push("  investor rows: " + (await tables())[1]?.slice(0, 160));
  const closed = await click("Price and close the deal", "button", true);
  r.push("  closed at defaults: " + closed);
  await stage(7); await click("Open secondary trading"); await click("Buy $1M");
  r.push("  trade log: " + (await tables()).pop()?.slice(0, 120));
  const titles = new Set();
  for (let k = 0; k < 30; k++) { await click("Next month"); const t = await page.evaluate(() => [...document.querySelectorAll("section")].find((s) => s.textContent.startsWith("News wire"))?.querySelector("div div div span")?.textContent); if (t) titles.add(t); }
  r.push("  news seen: " + [...titles].join("; "));
  const body = await page.evaluate(() => document.body.innerText);
  r.push("  roles shown: " + ["(an investor)", "(the market maker)", "(the servicer)"].map((x) => x + "=" + body.includes(x)).join(" "));
  r.push("  quotes: " + (await tables())[0].slice(0, 200));
  await stage(8);
  const segs = await page.evaluate(() => { const s = [...document.querySelectorAll("section")].find((x) => x.textContent.startsWith("Stress test (pick a storm)")); return [...s.querySelectorAll("button")].map((b) => b.textContent).filter((x) => x !== "Custom"); });
  for (const sname of segs) { await click(sname); const t = (await tables())[0]; r.push(`  storm "${sname}": ` + t.replace(/Tranche \(floor\) Size Interest received Principal repaid \(paid back\) Principal lost WAL \(avg wait\) Result /, "").replace(/\$[\d.]+[MKB]? \$[\d.]+[MKB]? /g, "").slice(0, 220)); }
  r.push("  storm note: " + (await page.evaluate(() => [...document.querySelectorAll("p")].find((p) => p.textContent.startsWith("Collateral losses"))?.textContent)));
  report.push(r.join("\n"));
}
// mortgage guarantee toggle
await stage(1); await click("MBS (home mortgages)"); await page.evaluate(() => document.querySelector('[role=switch]').click()); await sleep(50);
await stage(5); await click("Request credit ratings", "button", true); await click("Re-check ratings", "button", true);
report.push("== Mortgage agency toggle ON grades: " + (await tables())[0]);
await click("Dictionary: industry terms", "h2");
report.push("dictionary rows: " + (await page.evaluate(() => [...document.querySelectorAll("table")].pop().rows.length)));
report.push("desk: " + (await page.evaluate(() => document.querySelector("section").innerText.replace(/\s+/g, " ").slice(0, 320))));
await page.screenshot({ path: "/workspace/shot-desk.png" });
// file:// dark + mobile quick passes over two assets
for (const [url, tag, o] of [["file://" + process.cwd() + "/dist/index.html", "file-dark", { dark: true }], ["http://localhost:4173/", "mobile", { mobile: true }]]) {
  const p = await open(url, tag, o);
  for (const name of ["MBS (home mortgages)", "Credit card ABS (credit cards)"]) {
    await p.stage(1); await p.click(name);
    for (let s = 2; s <= 8; s++) { await p.stage(s); if (s === 7) { await p.click("Open secondary trading"); for (let k = 0; k < 4; k++) await p.click("Next month"); } }
  }
  const ow = await p.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  report.push(`${tag}: walked mortgages + cards through all 8 stages; horizontal overflow ${ow}px`);
  if (tag === "mobile") { await p.stage(1); await p.page.screenshot({ path: "/workspace/shot-mobile.png" }); }
  await p.page.close();
}
await browser.close(); srv.close();
console.log(report.join("\n"));
console.log("ERRORS:", errors.length ? errors.join("\n") : "none");
console.log("EXTERNAL REQUESTS:", external.length ? external.join("\n") : "none");
