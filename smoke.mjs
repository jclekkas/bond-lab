import puppeteer from "puppeteer-core";
import http from "http"; import fs from "fs";
const html = fs.readFileSync("dist/index.html");
const srv = http.createServer((q, s) => { s.writeHead(200, { "content-type": "text/html" }); s.end(html); }).listen(4173);
const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"], headless: "new" });
const errors = [], external = [], notes = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SHOTS = "/workspace/bond-lab-shots"; fs.mkdirSync(SHOTS, { recursive: true });
async function open(url, tag, vp, { tour = false, theme } = {}) {
  const page = await browser.newPage();
  await page.setViewport(vp);
  page.on("console", (m) => { if (["error", "warning"].includes(m.type())) errors.push(`${tag} ${m.type()}: ${m.text()}`); });
  page.on("pageerror", (e) => errors.push(`${tag} pageerror: ${e.message}`));
  page.on("request", (r) => { const u = r.url(); if (!/^(http:\/\/localhost:4173|file:|data:)/.test(u)) external.push(u); });
  await page.evaluateOnNewDocument((tour, theme) => { if (!tour) localStorage.setItem("bondlab.tour.v1", "1"); else if (!sessionStorage.getItem("smk")) { localStorage.removeItem("bondlab.tour.v1"); sessionStorage.setItem("smk", "1"); } if (theme) localStorage.setItem("bondlab.theme", theme); }, tour, theme);
  await page.goto(url, { waitUntil: "load" });
  await sleep(150);
  const click = async (txt, sel = "button", quiet = false) => {
    const ok = await page.evaluate((txt, sel) => { const b = [...document.querySelectorAll(sel)].find((x) => (x.textContent.trim().includes(txt) || (x.getAttribute("aria-label") || "").includes(txt)) && !x.disabled && x.getClientRects().length); if (b) { b.click(); return true; } return false; }, txt, sel);
    if (!ok && !quiet) errors.push(`${tag} could not click "${txt}"`);
    await sleep(60); return ok;
  };
  const stage = (n) => click(`Step ${n}:`, vp.width > 860 ? ".rail button" : ".stage-strip button");
  const text = () => page.evaluate(() => document.querySelector(".main").innerText);
  const key = async (k) => { await page.keyboard.press(k); await sleep(60); };
  const overflow = () => page.evaluate(() => {
    const out = [];
    if (document.documentElement.scrollWidth > window.innerWidth + 1) out.push(`page ${document.documentElement.scrollWidth}>${window.innerWidth}`);
    const m = document.querySelector(".main"); if (m && m.scrollWidth > m.clientWidth + 1) out.push(`main ${m.scrollWidth}>${m.clientWidth}`);
    document.querySelectorAll(".panel").forEach((p) => { if (p.scrollWidth > p.clientWidth + 2 && !p.querySelector(".tbl-wrap")) out.push("panel:" + (p.querySelector("h2")?.textContent || "").slice(0, 40)); });
    return out;
  });
  const setRange = (idx, v) => page.evaluate((idx, v) => { const el = [...document.querySelectorAll('.main input[type=range]')][idx]; const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(el, String(v)); el.dispatchEvent(new Event("input", { bubbles: true })); }, idx, v);
  return { page, click, stage, text, key, overflow, setRange };
}
const ASSETS = ["Auto ABS (car loans)", "MBS (home mortgages)", "Credit card ABS (credit cards)", "Student loan ABS (student loans)", "Equipment ABS (equipment leases)", "Royalty ABS (song royalties)", "CLO (business loans)"];
const D = { width: 1440, height: 900 };
const { page, click, stage, text, key, overflow, setRange } = await open("http://localhost:4173/", "desktop", D);
const report = [];
for (const name of ASSETS) {
  const r = [`== ${name}`];
  await stage(1); await click(name, ".asset-card");
  // locks before progress
  await stage(6); r.push("  lock before rating: " + ((await text()).includes("Price and place the bonds") ? "NOT LOCKED" : "locked ok"));
  await stage(2);
  for (const p of ["the borrowers", "the servicer", "the trustee", "the rating agencies", "the underwriter", "the market maker"]) await click(p, ".chip", true);
  await click("So the lender's creditors can't grab them");
  r.push("  SPV quiz: " + ((await text()).includes("Correct, +20 XP") || (await page.evaluate(() => document.body.innerText.includes("Correct, +20 XP")))));
  await stage(3); await page.evaluate(() => { const el = document.querySelector(".main input[type=range]"); const v = Math.round((+el.min + +el.max) / 2 / +el.step) * +el.step; const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(el, String(v)); el.dispatchEvent(new Event("input", { bubbles: true })); });
  r.push("  pool metrics: " + (await page.evaluate(() => [...document.querySelectorAll(".metric")].slice(0, 4).map((m) => m.innerText.replace(/\s+/g, " ")).join(" | "))));
  await stage(4);
  // drag handle via keyboard
  const before = await page.evaluate(() => document.querySelector(".stack .layer")?.textContent);
  await page.focus(".stack .handle"); await key("ArrowDown");
  r.push("  stack: " + before + " -> " + (await page.evaluate(() => document.querySelector(".stack .layer")?.textContent)));
  await key("ArrowUp");
  await stage(5); await click("Request credit ratings"); await sleep(1100);
  r.push("  ratings: " + (await page.evaluate(() => [...document.querySelectorAll(".main .rating")].slice(0, 3).map((x) => x.textContent).join("/"))));
  await stage(6); await sleep(1700);
  let closeOk = await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.includes("Price and close the deal")); return b && !b.disabled; });
  if (!closeOk) { // widen spreads until covered
    for (let i = 0; i < 3; i++) await setRange(i, [140, 400, 900][i]);
    await sleep(1700);
    closeOk = await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.includes("Price and close the deal")); return b && !b.disabled; });
    if (!closeOk) { await stage(4); await setRange(0, 70); await setRange(3, 3); await stage(5); await click("Re-check ratings"); await sleep(1100); await stage(6); for (let i = 0; i < 3; i++) await setRange(i, [140, 400, 900][i]); await sleep(1700); r.push("  (needed thicker cushion to sell)"); }
  }
  r.push("  gauges: " + (await page.evaluate(() => [...document.querySelectorAll(".gauge .num")].map((x) => x.textContent).join(" "))));
  await click("Price and close the deal");
  await stage(7); await click("Open secondary trading"); await click("Buy", ".seg button"); await click("$1M", ".seg button");
  await click("Buy $1M"); await key("n"); await key("n"); await key("b"); await key("n");
  await click("Sell", ".seg button"); await click("$2M", ".seg button"); await click("Sell $2M");
  await click("Limit", ".seg button");
  if (!(await page.$("#lim"))) { console.log("DBG", errors.join(" || "), await page.evaluate(() => [...document.querySelectorAll(".ticket .seg button")].map(b=>b.textContent+(b.className)).join(","))); }
  await page.type("#lim", "50.5"); await click("Sell $2M"); // far limit -> rest? sell at 50.5 fills immediately (better)
  await page.focus("#lim"); await page.keyboard.down("Control"); await page.keyboard.press("A"); await page.keyboard.up("Control"); await page.keyboard.press("Backspace"); await page.type("#lim", "149"); await click("Sell $2M"); // rests
  await click("Market", ".seg button"); await key("n");
  const tr = await page.evaluate(() => ({ blotter: document.querySelector(".dock-tabs")?.innerText.replace(/\s+/g, " "), pnl: [...document.querySelectorAll(".metric")].find((m) => m.innerText.includes("P&L"))?.innerText.replace(/\s+/g, " "), quotes: document.querySelectorAll(".quote-row").length, candles: document.querySelectorAll(".chart-wrap rect").length, depth: document.querySelectorAll(".depth tbody tr").length }));
  r.push("  trading: " + JSON.stringify(tr));
  if (name === ASSETS[0]) {
    await page.evaluate(() => document.querySelector(".main").scrollTo(0, 0)); await sleep(150);
    const bb = await page.evaluate(() => { const r = document.querySelector(".chart-wrap svg").getBoundingClientRect(); return { x: r.left + r.width * 0.72, y: r.top + Math.min(r.height * 0.4, 120) }; });
    await page.mouse.move(bb.x, bb.y); await sleep(4200);
    await page.screenshot({ path: `${SHOTS}/desktop-trading-floor.png` });
  }
  await stage(8); await click("Play"); await sleep(1500); await click("Pause");
  r.push("  stress month: " + (await page.evaluate(() => document.querySelector(".player input")?.value)) + " wf rows " + (await page.evaluate(() => document.querySelectorAll(".wf-row").length)));
  const ov = await overflow(); if (ov.length) r.push("  OVERFLOW: " + ov.join("; "));
  report.push(r.join("\n"));
}
// structuring screenshot
await stage(1); await click(ASSETS[0], ".asset-card"); await stage(4); await sleep(200);
await page.screenshot({ path: `${SHOTS}/desktop-structuring.png` });
for (const n of [1, 2, 3, 5]) { await stage(n); await sleep(250); const ov = await overflow(); if (ov.length) notes.push(`stage ${n} overflow ${ov}`); await page.screenshot({ path: `/workspace/shot-s${n}.png` }); }
// help + shortcuts
await key("?"); notes.push("help modal: " + !!(await page.$(".modal"))); await key("Escape");
await key("t"); notes.push("theme after T: " + (await page.evaluate(() => document.documentElement.dataset.theme)));
await page.screenshot({ path: "/workspace/shot-light.png" }); await key("t");
await key("c"); notes.push("side closed: " + (await page.evaluate(() => document.querySelector(".app").classList.contains("side-closed")))); await key("c");
// tour
const t = await open("http://localhost:4173/", "tour", D, { tour: true });
notes.push("tour shown: " + !!(await t.page.$(".tour-card")));
await t.click("Next", ".tour-card button"); await t.click("Next", ".tour-card button"); await sleep(400); await t.page.screenshot({ path: "/workspace/shot-tour.png" });
await t.click("Skip tour"); notes.push("tour dismissed: " + !(await t.page.$(".tour-card")));
await t.page.screenshot({ path: "/workspace/shot-topbar.png", clip: { x: 900, y: 0, width: 540, height: 60 } });
const tourTitle = (pg) => pg.evaluate(() => document.querySelector(".tour-card h4")?.textContent || null);
// replay after dismissal (desktop)
await t.page.reload({ waitUntil: "load" }); await sleep(200);
notes.push("desktop no tour after reload: " + !(await t.page.$(".tour-card")));
await t.page.click(".tour-btn"); await sleep(150);
notes.push("desktop replay via button: " + (await tourTitle(t.page)));
notes.push("button tooltip: " + (await t.page.$eval(".tour-btn", (b) => b.title)) + " | visible label: " + (await t.page.$eval(".tour-btn", (b) => b.innerText)));
await t.key("ArrowRight"); notes.push("arrow next: " + (await tourTitle(t.page)));
await t.click("Skip tour", ".tour-card button");
await t.key("g"); notes.push("replay via G: " + (await tourTitle(t.page)));
const last = await t.page.evaluate(async () => { for (let i = 0; i < 10; i++) { const n = [...document.querySelectorAll(".tour-card button")].find((b) => b.textContent === "Next"); if (!n) break; n.click(); await new Promise((r) => setTimeout(r, 50)); } return document.querySelector(".tour-card p")?.textContent; });
notes.push("last step mentions replay: " + /replay this tour anytime/.test(last || ""));
await t.click("Start building", ".tour-card button"); notes.push("closed after last: " + !(await t.page.$(".tour-card")));
await t.key("?"); await t.click("Tour step 4", ".modal button"); notes.push("help jump to step 4: " + (await tourTitle(t.page)) + " | modal closed: " + !(await t.page.$(".modal")));
await t.key("Escape"); notes.push("esc closes: " + !(await t.page.$(".tour-card")));
await t.key("?"); await t.click("Replay tour from the start", ".modal button"); notes.push("help replay: " + (await tourTitle(t.page))); await t.key("Escape");
// mobile replay
const mt = await open("http://localhost:4173/", "mobile-tour", { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, { tour: true });
notes.push("mobile first-visit tour: " + (await tourTitle(mt.page)));
await mt.click("Skip tour", ".tour-card button"); await mt.page.reload({ waitUntil: "load" }); await sleep(200);
notes.push("mobile no tour after reload: " + !(await mt.page.$(".tour-card")));
await mt.click("Coach", ".mtabs button"); await mt.click("Replay the guided tour", ".mtabs button"); await sleep(150);
notes.push("mobile replay via tab: " + (await tourTitle(mt.page)) + " | back on workspace: " + (await mt.page.evaluate(() => !document.querySelector(".app").classList.contains("m-coach"))));
await mt.page.screenshot({ path: "/workspace/bond-lab-shots/mobile-tour-replay.png" });
await mt.click("Skip tour", ".tour-card button");
await mt.page.click(".tour-btn"); await sleep(150); notes.push("mobile replay via top bar: " + (await tourTitle(mt.page)));
await mt.click("Skip tour", ".tour-card button");
notes.push("mobile overflow w/ 4 tabs: " + JSON.stringify(await mt.overflow()));
// mobile
const M = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const m = await open("http://localhost:4173/", "mobile", M);
await m.click("Credit card ABS (credit cards)", ".asset-card"); await m.stage(4); await sleep(200);
notes.push("mobile overflow s4: " + JSON.stringify(await m.overflow()));
await m.page.screenshot({ path: `${SHOTS}/mobile-structuring.png` });
await m.stage(5); await m.click("Request credit ratings"); await sleep(1100); await m.stage(6); await sleep(1600); await m.click("Price and close the deal", "button", true);
await m.stage(7); await m.click("Open secondary trading"); await m.click("Buy $1M"); await m.click("Next month");
notes.push("mobile overflow s7: " + JSON.stringify(await m.overflow()));
await m.page.screenshot({ path: "/workspace/shot-mobile-trading.png", fullPage: false });
await m.click("Coach", ".mtabs button"); await sleep(150); notes.push("mobile coach visible: " + (await m.page.evaluate(() => getComputedStyle(document.querySelector(".side")).display)));
await m.page.screenshot({ path: "/workspace/shot-mobile-coach.png" });
await m.click("Blotter", ".mtabs button"); await sleep(150); notes.push("mobile tape visible: " + (await m.page.evaluate(() => getComputedStyle(document.querySelector(".tape")).display)));
// file://
const f = await open("file:///workspace/bond-lab/dist/index.html", "file", D);
notes.push("file:// render: " + (await f.page.evaluate(() => !!document.querySelector(".topbar") && document.querySelectorAll(".asset-card").length)));
console.log(report.join("\n")); console.log(notes.join("\n"));
console.log("ERRORS:", errors.length ? errors.join("\n") : "none"); console.log("EXTERNAL:", external.length ? [...new Set(external)].join("\n") : "none");
await browser.close(); srv.close();
