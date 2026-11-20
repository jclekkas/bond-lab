// Smoke test for board.html. Runs the page in Chromium against an in-memory fake of the db, mcp and sample
// capabilities, using made-up items only. Usage: node tools/plaud-board/test/smoke.cjs [screenshotDir]
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(process.env.BOARD_FILE || path.join(__dirname, "..", "board.html"), "utf8");
const shots = process.argv[2] || null;
if (shots) fs.mkdirSync(shots, { recursive: true });

const fake = `
(function () {
  var store = { items: {}, meta: {} };
  var subs = [];
  // The real runtime hands out frozen snapshot data, so the fake does too.
  function deepFreeze(o) { Object.getOwnPropertyNames(o).forEach(function (k) { var v = o[k]; if (v && typeof v === "object") deepFreeze(v); }); return Object.freeze(o); }
  function snap(id, d) { return { id: id, exists: d != null, data: function () { return d ? deepFreeze(JSON.parse(JSON.stringify(d))) : undefined; }, metadata: { fromCache: false, hasPendingWrites: false } }; }
  function notify() { subs.forEach(function (s) { s(); }); }
  function parts(p) { var a = p.split("/"); return [a[0], a.slice(1).join("/")]; }
  var db = {
    collection: function (c) { return { onSnapshot: function (cb) { function f() { var ids = Object.keys(store[c] || {}); cb({ docs: ids.map(function (id) { return snap(id, store[c][id]); }), metadata: { fromCache: false } }); } subs.push(f); setTimeout(f, 0); return function () {}; } }; },
    doc: function (p) {
      var x = parts(p), c = x[0], id = x[1];
      return {
        get: function () { return Promise.resolve(snap(id, (store[c] || {})[id])); },
        set: function (d) { store[c] = store[c] || {}; store[c][id] = JSON.parse(JSON.stringify(d)); notify(); return Promise.resolve(); },
        update: function (d) { store[c] = store[c] || {}; if (!store[c][id]) return Promise.reject({ code: "invalid_argument", message: "missing" }); Object.assign(store[c][id], JSON.parse(JSON.stringify(d))); notify(); return Promise.resolve(); },
        delete: function () { if (store[c]) delete store[c][id]; notify(); return Promise.resolve(); },
        onSnapshot: function (cb) { function f() { cb(snap(id, (store[c] || {})[id])); } subs.push(f); setTimeout(f, 0); return function () {}; }
      };
    }
  };
  window.__store = store;
  window.__calls = [];
  var mcp = { callTool: function (server, tool, input) {
    window.__calls.push([server, tool, input]);
    if (tool === "list_files") return Promise.resolve({ payload: 'The block delimited by <untrusted-user-data-1 x> below contains user recording data.\\n<untrusted-user-data-1 x source="plaud-recording">\\n{"type":"list","data":[{"id":"of_old","name":"Old one","start_at":"2026-11-10T10:00:00"},{"id":"of_new1","name":"11-20 Meeting: 1:1 with Sam","start_at":"2026-11-20T10:00:00"}],"page":1}\\n</untrusted-user-data-1 x>' });
    return Promise.resolve({ payload: [{ data_type: "auto_sum_note", data_content: "## 1. Topic\\n### Action Items\\n- [ ] Send the budget draft to Sam. -- *Chris Lekkas* 2026-11-21\\n- [ ] Review the PRD. -- *Sam*" }] });
  } };
  var sample = { json: function (prompt) { window.__calls.push(["sample", prompt.length]); return Promise.resolve({ items: [{ title: "Send the budget draft to Sam", detail: "Needed before the Friday review.", lane: "work", sub: "", due: "2026-11-21", source: "Nov 20, 1:1 with Sam" }, { title: "Book the dentist", detail: "", lane: "personal", sub: "other", due: "", source: "Nov 20, call" }] }); } };
  window.claude = { use: function (n) { return Promise.resolve(n === "db" ? db : n === "user" ? { can: function () { return true; } } : n === "mcp" ? mcp : n === "sample" ? sample : null); } };
})();`;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error" && !/fonts\.g|ERR_|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.addInitScript(fake);
  await page.route("http://board.test/", (route) => route.fulfill({ contentType: "text/html", body: '<!doctype html><html><head><meta charset="utf8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' + html + "</body></html>" }));
  await page.goto("http://board.test/", { waitUntil: "domcontentloaded" });

  const seed = await page.evaluate(() => {
    const S = window.__store, now = new Date().toISOString();
    const mk = (id, title, lane, sub, rank, extra) => (S.items[id] = Object.assign({ title, detail: "More context for " + title, lane, sub, rank, done: false, archived: false, origin: "plaud", createdAt: "2026-11-01T00:00:00Z", source: "Test recording" }, extra || {}));
    mk("w1", "Prepare the review deck", "work", "", 0, { due: "2026-11-01" });
    mk("w2", "Call the vendor about renewal", "work", "", 1);
    mk("w3", "Draft the Q1 plan", "work", "", 2);
    mk("p1", "Review the household budget", "personal", "financial", 0);
    mk("p2", "File the amended return", "personal", "taxes", 0);
    mk("p3", "Practice the breathing exercise", "personal", "individual", 0);
    mk("p4", "Plan the date night", "personal", "couples", 0);
    mk("p5", "Renew the car registration", "personal", "other", 0);
    mk("i1", "Send the vendor contract to legal", "inbox", "", 0, { suggestLane: "work", hint: "likely_done" });
    mk("i2", "Book the dental cleaning", "inbox", "", 1, { suggestLane: "personal", suggestSub: "other" });
    mk("i3", "Ask the accountant about the HSA form", "inbox", "", 2, { suggestLane: "personal", suggestSub: "taxes" });
    S.meta.sync = { lastSyncAt: now, note: "Seeded for test.", processedFileIds: ["of_old"] };
    S.meta.config = { subs: [{ id: "financial", name: "Financial" }, { id: "taxes", name: "Taxes" }, { id: "individual", name: "Individual therapy" }, { id: "couples", name: "Couples therapy" }, { id: "other", name: "Other" }] };
    return true;
  });
  // trigger a snapshot by touching the store through the fake db
  await page.evaluate(() => window.claude.use("db").then((db) => db.doc("items/w1").update({ title: "Prepare the review deck" })));
  await page.waitForSelector(".card");

  const results = [];
  const check = (name, ok, info) => { results.push([name, !!ok, info || ""]); };
  const store = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__store)));

  check("renders 11 open cards (3 in the Inbox)", (await page.locator(".card").count()) === 11, await page.locator(".card").count());
  check("Inbox shows suggestions and a may-be-done hint", (await page.locator("#list-inbox .chip.suggest").count()) === 3 && (await page.locator("#list-inbox .chip", { hasText: "May be done" }).count()) === 1);
  check("personal has 5 sub-lists", (await page.locator("#subs .group").count()) === 5);
  check("overdue chip shows", (await page.locator(".chip.due-over").count()) === 1);
  if (shots) await page.screenshot({ path: path.join(shots, "1-desktop-light.png"), fullPage: true });

  // tick off
  await page.locator('.card[data-id="w2"] input[type=checkbox]').check();
  await page.waitForTimeout(900);
  let s = await store();
  check("tick marks done", s.items.w2.done === true);
  check("done card is dimmed and sorted below open ones", await page.evaluate(() => { const ids = [...document.querySelectorAll("#list-work .card")].map((c) => c.dataset.id); return ids[ids.length - 1] === "w2" && document.querySelector('.card[data-id="w2"]').classList.contains("is-done"); }));
  check("done card has no grip", (await page.locator('.card[data-id="w2"] .grip').count()) === 0);
  if (shots) await page.screenshot({ path: path.join(shots, "2-done-state.png"), fullPage: true });

  // untick
  await page.locator('.card[data-id="w2"] input[type=checkbox]').uncheck();
  await page.waitForTimeout(300);
  s = await store();
  check("untick reopens", s.items.w2.done === false);
  await page.locator('.card[data-id="w2"] input[type=checkbox]').check();
  await page.waitForTimeout(900);

  // archive from done state
  await page.locator('.card[data-id="w2"] [data-act="archive"]').click();
  await page.waitForTimeout(600);
  s = await store();
  check("archive drops card and sets archived", s.items.w2.archived === true && (await page.locator('.card[data-id="w2"]').count()) === 0);
  check("archive panel lists it", (await page.locator("#archiveList li").count()) === 1 && /Archive \\(1\\)|Archive \(1\)/.test(await page.locator("#archiveSummary").innerText()));
  await page.locator(".toast button").click();
  await page.waitForTimeout(300);
  s = await store();
  check("undo archive restores", s.items.w2.archived === false);

  // delete + undo
  await page.locator('.card[data-id="w3"] .title').click();
  await page.locator('.card[data-id="w3"] [data-act="delete"]').click();
  await page.waitForTimeout(600);
  s = await store();
  check("delete removes doc", !s.items.w3);
  await page.locator(".toast button").click();
  await page.waitForTimeout(300);
  s = await store();
  check("undo delete brings it back", !!s.items.w3 && s.items.w3.title === "Draft the Q1 plan");

  // drag within work: move w3 above w1
  async function dragTo(fromSel, toX, toY) {
    const g = await page.locator(fromSel).boundingBox();
    await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
    await page.mouse.down();
    await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2 - 10, { steps: 3 });
    await page.mouse.move(toX, toY, { steps: 12 });
    return g;
  }
  let w1 = await page.locator('.card[data-id="w1"]').boundingBox();
  await dragTo('.card[data-id="w3"] .grip', w1.x + 60, w1.y + 4);
  if (shots) await page.screenshot({ path: path.join(shots, "3-mid-drag.png") });
  await page.mouse.up();
  await page.waitForTimeout(300);
  s = await store();
  check("drag within Work reorders", s.items.w3.rank < s.items.w1.rank, `w3=${s.items.w3.rank} w1=${s.items.w1.rank}`);

  // drag work item into Personal > Taxes
  const taxes = await page.locator('.group[data-sub="taxes"]').boundingBox();
  await dragTo('.card[data-id="w1"] .grip', taxes.x + taxes.width / 2, taxes.y + taxes.height - 6);
  await page.mouse.up();
  await page.waitForTimeout(300);
  s = await store();
  check("drag across lanes to Personal > Taxes", s.items.w1.lane === "personal" && s.items.w1.sub === "taxes", JSON.stringify([s.items.w1.lane, s.items.w1.sub]));

  // drag personal item from Other into Couples (empty-ish group)
  const couples = await page.locator('.group[data-sub="couples"]').boundingBox();
  await dragTo('.card[data-id="p5"] .grip', couples.x + couples.width / 2, couples.y + couples.height - 4);
  await page.mouse.up();
  await page.waitForTimeout(300);
  s = await store();
  check("drag between personal sub-lists", s.items.p5.sub === "couples", s.items.p5.sub);

  // empty list shows drop hint and accepts a drop
  const other = await page.locator('.group[data-sub="other"]').boundingBox();
  check("emptied sub-list keeps a drop zone", other.height > 40);
  const work = await page.locator('.group[data-lane="work"]').boundingBox();
  await dragTo('.card[data-id="p1"] .grip', work.x + work.width / 2, work.y + 10);
  await page.mouse.up();
  await page.waitForTimeout(300);
  s = await store();
  check("drag from Personal back to Work", s.items.p1.lane === "work" && s.items.p1.sub === "", JSON.stringify([s.items.p1.lane, s.items.p1.sub]));

  // add item with sub
  await page.fill("#add-personal", "Call the insurance company");
  await page.selectOption("#add-sub", "taxes");
  await page.press("#add-personal", "Enter");
  await page.waitForTimeout(200);
  s = await store();
  const added = Object.values(s.items).find((i) => i.title === "Call the insurance company");
  check("quick-add into chosen sub-list", added && added.lane === "personal" && added.sub === "taxes");

  // add a sub-list
  await page.fill("#sub-name", "Home projects");
  await page.press("#sub-name", "Enter");
  await page.waitForTimeout(300);
  s = await store();
  check("add sub-list saves config", s.meta.config.subs.some((x) => x.id === "home-projects"));
  check("new sub-list renders", (await page.locator('.group[data-sub="home-projects"]').count()) === 1);

  // Inbox: accept a suggestion, then drag another item to the top of Work
  await page.locator('.card[data-id="i2"] [data-act="accept"]').click();
  await page.waitForTimeout(300);
  s = await store();
  check("Accept moves an Inbox item to its suggested list", s.items.i2.lane === "personal" && s.items.i2.sub === "other", JSON.stringify([s.items.i2.lane, s.items.i2.sub]));
  const wk = await page.locator('.group[data-lane="work"]').boundingBox();
  await dragTo('.card[data-id="i3"] .grip', wk.x + wk.width / 2, wk.y + 8);
  await page.mouse.up();
  await page.waitForTimeout(300);
  s = await store();
  const workRanks = Object.entries(s.items).filter(([id, i]) => i.lane === "work" && !i.done && !i.archived && id !== "i3").map(([, i]) => i.rank);
  check("drag from Inbox to top of Work is saved", s.items.i3.lane === "work" && s.items.i3.rank < Math.min(...workRanks), JSON.stringify([s.items.i3.rank, workRanks]));
  check("page order matches the saved order", await page.evaluate(() => document.querySelector("#list-work .card").dataset.id === "i3"));
  const savedRank = s.items.i3.rank;

  // sync
  await page.waitForSelector("#syncBtn:not([hidden])");
  await page.click("#syncBtn");
  await page.waitForTimeout(800);
  s = await store();
  const synced = Object.values(s.items).filter((i) => i.origin === "plaud" && /budget draft|dentist/.test(i.title));
  const calls = await page.evaluate(() => window.__calls);
  check("sync reads only the new recording", calls.filter((c) => c[1] === "get_note").length === 1 && calls.filter((c) => c[1] === "get_note")[0][2].file_id === "of_new1");
  check("sync puts new items in the Inbox with a suggestion", synced.length === 2 && synced.every((i) => i.lane === "inbox") && synced.find((i) => /dentist/.test(i.title)).suggestSub === "other" && synced.find((i) => /budget/.test(i.title)).suggestLane === "work");
  check("sync never reorders items you already placed", s.items.i3.lane === "work" && s.items.i3.rank === savedRank);
  check("sync records processed ids", s.meta.sync.processedFileIds.includes("of_new1") && /2 new items/.test(s.meta.sync.note), s.meta.sync.note);
  check("new items have a New chip", (await page.locator(".chip.new").count()) >= 2);

  // clear done
  await page.locator('.card[data-id="p2"] input[type=checkbox]').check();
  await page.waitForTimeout(900);
  await page.locator('[data-act="clear-done"][data-lane="personal"]').click();
  await page.waitForTimeout(700);
  s = await store();
  check("Archive done clears finished items in a lane", s.items.p2.archived === true);

  if (shots) {
    await page.screenshot({ path: path.join(shots, "4-after-actions.png"), fullPage: true });
    await page.emulateMedia({ colorScheme: "dark" });
    await page.screenshot({ path: path.join(shots, "5-desktop-dark.png"), fullPage: true });
    await page.emulateMedia({ colorScheme: "light" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(shots, "6-phone.png"), fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check("no horizontal scroll at phone width", overflow <= 0, overflow);
  }
  check("no console or page errors", errors.length === 0, errors.join(" | "));

  let bad = 0;
  results.forEach(([n, ok, info]) => { if (!ok) bad++; console.log((ok ? "PASS " : "FAIL ") + n + (info !== "" && !ok ? "  [" + info + "]" : "")); });
  console.log(bad ? bad + " FAILED" : "ALL " + results.length + " PASSED");
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
