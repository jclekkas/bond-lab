// Headless smoke test for the Exchange Builder module (desktop + mobile, offline).
import puppeteer from "puppeteer-core";
import http from "http"; import fs from "fs";
const srv = http.createServer((q, s) => { const f = q.url.split("?")[0].endsWith(".pdf") ? "dist" + q.url.split("?")[0] : "dist/index.html"; if (!fs.existsSync(f)) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": f.endsWith(".pdf") ? "application/pdf" : "text/html" }); s.end(fs.readFileSync(f)); }).listen(4174);
const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"], headless: "new" });
const errors = [], external = [], notes = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SHOTS = "/workspace/bond-lab-shots"; fs.mkdirSync(SHOTS, { recursive: true });
async function open(tag, vp) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage(); await page.setViewport(vp);
  page.on("console", (m) => { if (["error", "warning"].includes(m.type())) errors.push(`${tag} ${m.type()}: ${m.text()}`); });
  page.on("pageerror", (e) => errors.push(`${tag} pageerror: ${e.message}`));
  page.on("request", (r) => { const u = r.url(); if (!/^(http:\/\/localhost:4174|data:)/.test(u)) external.push(u); });
  await page.evaluateOnNewDocument(() => localStorage.setItem("bondlab.tour.v1", "1"));
  await page.goto("http://localhost:4174/", { waitUntil: "load" }); await sleep(150);
  const click = async (txt, sel = "button", quiet = false) => {
    const ok = await page.evaluate((txt, sel) => { const b = [...document.querySelectorAll(sel)].find((x) => (x.textContent.trim().includes(txt) || (x.getAttribute("aria-label") || "").includes(txt)) && !x.disabled && x.getClientRects().length); if (b) { b.dispatchEvent(new MouseEvent("click", { bubbles: true })); return true; } return false; }, txt, sel);
    if (!ok && !quiet) errors.push(`${tag} could not click "${txt}" (${sel})`);
    await sleep(80); return ok;
  };
  const key = async (k) => { await page.keyboard.press(k); await sleep(80); };
  const text = (sel = ".main") => page.evaluate((sel) => document.querySelector(sel)?.innerText ?? "", sel);
  const tourTitle = () => page.evaluate(() => document.querySelector(".tour-card h4")?.textContent || null);
  const stage = (n) => click(`Step ${n}:`, vp.width > 860 ? ".rail button" : ".stage-strip button");
  const overflow = () => page.evaluate(() => { const out = []; if (document.documentElement.scrollWidth > window.innerWidth + 1) out.push(`page ${document.documentElement.scrollWidth}>${window.innerWidth}`); const m = document.querySelector(".main"); if (m && m.scrollWidth > m.clientWidth + 1) out.push(`main ${m.scrollWidth}>${m.clientWidth}`); return out; });
  return { page, click, key, text, tourTitle, stage, overflow };
}
// ---------- desktop ----------
const D = await open("desktop", { width: 1440, height: 900 });
await D.click("Exchange Builder", ".mode-switch button");
notes.push("auto exchange tour on first switch: " + (await D.tourTitle()));
await D.click("Next", ".tour-card button"); notes.push("exchange tour step 2: " + (await D.tourTitle()));
await D.click("Skip tour", ".tour-card button");
notes.push("rail: " + (await D.page.evaluate(() => [...document.querySelectorAll(".rail .stage-btn .t")].map((x) => x.textContent).join(" | "))));
notes.push("topbar: " + (await D.page.evaluate(() => [...document.querySelectorAll(".topbar .tb-cell")].map((x) => x.innerText.replace(/\s+/g, " ")).join(" | "))));
const ov = [];
// step 1
await D.click("Play the trade"); await sleep(5600);
notes.push("S1 path finished: " + (await D.text()).includes("step 6/6"));
await D.click("$50M block", ".seg button"); notes.push("S1 50M cost: " + (await D.page.evaluate(() => [...document.querySelectorAll(".main .wf-row")].map((r) => r.innerText.replace(/\s+/g, " ")).join(" | "))));
await D.click("negotiated privately", ".side .quiz-opts .chip"); notes.push("quiz feedback: " + (await D.text(".side")).includes("Correct, +20 XP"));
ov.push(...(await D.overflow()).map((x) => "S1 " + x));
// step 2
await D.stage(2);
for (const id of ["mm", "bd", "ins", "pen", "ccp", "cust", "dep", "data", "reg"]) await D.page.evaluate((id) => { const i = ["tech", "reg", "data", "rate", "svc", "iss", "bd", "mm", "hf", "am", "ins", "pen", "bank", "ccp", "cust", "dep"].indexOf(id); const g = document.querySelectorAll(".xnode")[i + 1]; g.dispatchEvent(new MouseEvent("click", { bubbles: true })); }, id);
await sleep(100);
notes.push("S2 role card: " + (await D.page.evaluate(() => [...document.querySelectorAll(".main .panel-h h2")].map((h) => h.textContent).slice(1, 3).join(" | "))));
notes.push("S2 explored: " + (await D.page.evaluate(() => document.querySelector(".main").innerText.match(/\d+\/\d+ explored/)?.[0])));
await D.click("Who pays whom", ".seg button"); await D.click("Rebates", ".chip");
notes.push("S2 flows drawn: " + (await D.page.evaluate(() => document.querySelectorAll(".xmap path.flow-line").length)) + " labels " + (await D.page.evaluate(() => document.querySelectorAll(".xflow-lbl").length)));
await D.click("All money flows", ".chip");
await D.page.evaluate(() => document.querySelector(".main").scrollTo(0, 0)); await sleep(200);
await sleep(4200); await D.page.screenshot({ path: `${SHOTS}/exchange-map.png` });
ov.push(...(await D.overflow()).map((x) => "S2 " + x));
// step 3
await D.stage(3);
const met = () => D.page.evaluate(() => [...document.querySelectorAll(".main .metric")].slice(0, 8).map((m) => m.querySelector(".k").innerText.split("(")[0].trim().slice(0, 14) + "=" + m.querySelector(".v").innerText).join(", "));
notes.push("S3 default: " + (await met()));
await D.click("Fully lit order book", ".chip"); notes.push("S3 lit: " + (await met()));
await D.click("Dealer-friendly RFQ", ".chip"); notes.push("S3 rfq: " + (await D.page.evaluate(() => [...document.querySelectorAll(".pbar")].map((p) => p.innerText.replace(/\s+/g, "")).join(" "))));
await D.click("Balanced hybrid", ".chip"); await D.click("Full loan-level", ".seg button"); await D.click("Generous", ".seg button", true);
await D.page.evaluate(() => document.querySelector(".main").scrollTo(0, 0)); await sleep(250);
await sleep(4200); await D.page.screenshot({ path: `${SHOTS}/exchange-design.png` });
ov.push(...(await D.overflow()).map((x) => "S3 " + x));
// step 4
await D.stage(4); notes.push("S4 verdicts: " + (await D.page.evaluate(() => [...document.querySelectorAll(".win .wh")].map((w) => w.innerText.replace(/\s+/g, " ")).join(" | "))));
ov.push(...(await D.overflow()).map((x) => "S4 " + x));
// step 5
await D.stage(5); await D.click("Royalty ABS", ".chip"); notes.push("S5 none: " + (await D.page.evaluate(() => document.querySelector(".main .chip-tag.tag-bad, .main .chip-tag.tag-warn, .main .chip-tag.tag-ok")?.textContent)));
await D.click("Agency MBS TBA", ".chip"); await D.click("Anchor participants", ".lever"); await D.click("Market-maker program", ".lever"); await D.click("Deal standardization", ".lever");
await D.click("Fee holiday", ".lever"); notes.push("S5 over-budget toast: " + (await D.page.evaluate(() => document.querySelector(".toasts")?.innerText.includes("Over budget"))));
notes.push("S5 result: " + (await D.page.evaluate(() => [...document.querySelectorAll(".main .chip-tag")].map((t) => t.textContent).join(" | "))));
ov.push(...(await D.overflow()).map((x) => "S5 " + x));
// step 6
await D.stage(6); await D.click("Run all scenarios"); await sleep(3200);
notes.push("S6 before safeguards: " + (await D.page.evaluate(() => [...document.querySelectorAll(".scen .sh")].map((x) => x.innerText.replace(/\s+/g, " ")).join(" | "))));
for (const l of ["Circuit breakers", "Market surveillance", "Independent data audits", "Position and order limits"]) await D.click(l, ".switch");
notes.push("S6 after safeguards: " + (await D.page.evaluate(() => [...document.querySelectorAll(".scen .sh .chip-tag")].map((x) => x.textContent).join(" "))));
ov.push(...(await D.overflow()).map((x) => "S6 " + x));
// step 7
await D.stage(7); await sleep(200);
notes.push("S7 grades: " + (await D.page.evaluate(() => [...document.querySelectorAll(".main .tbl tbody tr")].map((r) => [...r.children].slice(0, 3).map((c) => c.innerText).join(" ")).join(" | "))));
notes.push("badges: " + (await D.page.evaluate(() => [...document.querySelectorAll(".rail .badge")].map((b) => b.textContent).join(", "))));
await sleep(4200); await D.page.screenshot({ path: `${SHOTS}/exchange-scorecard.png` });
ov.push(...(await D.overflow()).map((x) => "S7 " + x));
// step 8: PRFAQ
await D.stage(8); await sleep(200);
notes.push("S8 PRFAQ: " + JSON.stringify(await D.page.evaluate(() => ({ h1: document.querySelector(".prfaq .pf-h1")?.textContent.slice(0, 60), sections: [...document.querySelectorAll(".prfaq .pf-h2")].map((h) => h.textContent), questions: document.querySelectorAll(".prfaq h3").length, words: document.querySelector(".prfaq").innerText.split(/\s+/).length, pdf: document.querySelector(".prfaq-actions a")?.getAttribute("href"), next: !!document.querySelector('[aria-label="Next step"]:not([disabled])') }))));
const pdfRes = await D.page.evaluate(async () => { const r = await fetch("bond-lab-prfaq.pdf"); const b = new Uint8Array(await r.arrayBuffer()); return r.status + " " + r.headers.get("content-type") + " " + b.length + " " + String.fromCharCode(...b.slice(0, 5)); });
notes.push("PDF served next to index.html: " + pdfRes);
const popP = new Promise((r) => browser.once("targetcreated", r));
await D.click("Print-friendly view", ".prfaq-actions button");
const tgt = await Promise.race([popP, sleep(3000).then(() => null)]);
if (tgt) { const pp = await tgt.page(); await sleep(300); notes.push("print view: " + (await pp.evaluate(() => document.title + " | toolbar=" + !!document.querySelector(".pf-toolbar") + " | h2=" + document.querySelectorAll(".pf-h2").length))); await pp.close(); } else errors.push("print view did not open");
await D.page.evaluate(() => document.querySelector(".main").scrollTo(0, 0)); await sleep(4200);
await D.page.screenshot({ path: `${SHOTS}/exchange-prfaq.png` });
ov.push(...(await D.overflow()).map((x) => "S8 " + x));
await D.key("7"); notes.push("key 7 -> " + (await D.page.evaluate(() => document.querySelector(".ws-head h1").textContent))); await D.key("8");
// tour replay + shortcuts + dictionary
await D.key("g"); notes.push("G in exchange mode: " + (await D.tourTitle())); await D.key("Escape");
await D.click("Replay the guided tour", ".topbar button"); notes.push("Replay button in exchange mode: " + (await D.tourTitle())); await D.key("Escape");
await D.key("?"); await D.click("Exchange tour step 3", ".modal button"); notes.push("help jump exchange step 3: " + (await D.tourTitle())); await D.key("Escape");
await D.key("["); notes.push("[ key: " + (await D.page.evaluate(() => document.querySelector(".ws-head h1").textContent)));
await D.key("d"); await D.page.type(".side input", "clearing"); notes.push("dictionary 'clearing': " + (await D.page.evaluate(() => [...document.querySelectorAll(".side .dict-item .di-t")].map((x) => x.textContent).join(" | "))));
await D.click("Coach", ".side-tabs .tab");
await D.page.reload({ waitUntil: "load" }); await sleep(200); notes.push("mode persists after reload: " + (await D.page.evaluate(() => document.querySelector(".mode-switch .on")?.textContent)));
await D.key("x"); notes.push("X toggles to: " + (await D.page.evaluate(() => document.querySelector(".mode-switch .on")?.textContent)) + " | deal h1: " + (await D.page.evaluate(() => document.querySelector(".ws-head h1").textContent)));
await D.key("?"); await D.click("Exchange tour step 1", ".modal button"); notes.push("help exchange chip from Deal Lab switches mode: " + (await D.page.evaluate(() => document.querySelector(".mode-switch .on")?.textContent)) + " / " + (await D.tourTitle())); await D.key("Escape");
await D.key("t"); await D.stage(3); await sleep(150); await D.page.screenshot({ path: "/workspace/shot-exchange-light.png" }); await D.key("t");
notes.push("desktop overflow: " + JSON.stringify(ov));
// ---------- mobile ----------
const M = await open("mobile", { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await M.click("Exchange Builder", ".mode-switch button"); notes.push("mobile exchange tour: " + (await M.tourTitle()));
await M.click("Skip tour", ".tour-card button");
const mov = [];
for (let n = 1; n <= 8; n++) { await M.stage(n); await sleep(150); if (n === 1) { await M.click("Play the trade"); await sleep(400); } const o = await M.overflow(); if (o.length) mov.push(`S${n} ${o}`); if (n === 3) { await sleep(4200); await M.page.screenshot({ path: `${SHOTS}/exchange-mobile.png` }); } if (n === 8) { await sleep(4200); await M.page.screenshot({ path: "/workspace/shot-exchange-prfaq-mobile.png" }); } }
notes.push("mobile overflow: " + JSON.stringify(mov));
await M.click("Coach", ".mtabs button"); notes.push("mobile coach: " + (await M.text(".side")).slice(0, 40).replace(/\s+/g, " "));
await M.click("Tour", ".mtabs button"); notes.push("mobile Tour tab in exchange mode: " + (await M.tourTitle())); await M.click("Skip tour", ".tour-card button");
await M.click("Tape", ".mtabs button"); notes.push("mobile tape: " + (await M.page.evaluate(() => document.querySelector(".ticker .lbl")?.textContent)));
console.log(notes.join("\n")); console.log("ERRORS:", errors.length ? errors.join("\n") : "none"); console.log("EXTERNAL:", external.length ? [...new Set(external)].join("\n") : "none");
await browser.close(); srv.close();
