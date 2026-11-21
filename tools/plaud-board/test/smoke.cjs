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
        set: function (d) { if (window.__ro) return Promise.reject({ code: "invalid_argument", message: "You can't change this artifact's data." }); store[c] = store[c] || {}; store[c][id] = JSON.parse(JSON.stringify(d)); notify(); return Promise.resolve(); },
        update: function (d) { if (window.__ro) return Promise.reject({ code: "invalid_argument", message: "You can't change this artifact's data." }); store[c] = store[c] || {}; if (!store[c][id]) return Promise.reject({ code: "invalid_argument", message: "missing" }); Object.assign(store[c][id], JSON.parse(JSON.stringify(d))); notify(); return Promise.resolve(); },
        delete: function () { if (window.__ro) return Promise.reject({ code: "invalid_argument", message: "You can't change this artifact's data." }); if (store[c]) delete store[c][id]; notify(); return Promise.resolve(); },
        onSnapshot: function (cb) { function f() { cb(snap(id, (store[c] || {})[id])); } subs.push(f); setTimeout(f, 0); return function () {}; }
      };
    }
  };
  window.__store = store;
  window.__calls = [];
  var mcp = { callTool: function (server, tool, input) {
    window.__calls.push([server, tool, input]);
    if (tool === "list_files") return Promise.resolve({ payload: 'The block delimited by <untrusted-user-data-1 x> below contains user recording data.\\n<untrusted-user-data-1 x source="plaud-recording">\\n{"type":"list","data":[{"id":"of_old","name":"Old one","start_at":"2026-11-10T10:00:00"},{"id":"of_new1","name":"11-20 Meeting: 1:1 with Sam","start_at":"2026-11-20T10:00:00"},{"id":"of_new2","name":"11-20 still processing","start_at":"2026-11-20T11:00:00"},{"id":"of_new3","name":"11-20 Medical Consultation","start_at":"2026-11-20T12:00:00"}],"page":1}\\n</untrusted-user-data-1 x>' });
    if (input && input.file_id === "of_new2") return Promise.resolve({ payload: "[]" });
    if (input && input.file_id === "of_new3") return Promise.resolve({ payload: [{ data_type: "auto_sum_note", data_content: "## Plan\\n- The clinician will send a refill.\\n- The patient will check his records for an established pulmonologist and request a referral if needed." }] });
    return Promise.resolve({ payload: [{ data_type: "auto_sum_note", data_content: "## 1. Topic\\n### Action Items\\n- [ ] Send the budget draft to Sam. -- *Chris Lekkas* 2026-11-21\\n- [ ] Review the PRD. -- *Sam*" }] });
  } };
  var sample = { json: function (prompt) { window.__calls.push(["sample", prompt.length]); window.__lastPrompt = prompt; return Promise.resolve({ items: [{ title: "Send the budget draft to Sam", detail: "Needed before the Friday review.", lane: "work", sub: "", due: "2026-11-21", source: "Nov 20, 1:1 with Sam" }, { title: "Book the dentist", detail: "", lane: "personal", sub: "other", due: "", source: "Nov 20, call" }] }); } };
  window.claude = { use: function (n) { return Promise.resolve(n === "db" ? db : n === "user" ? { can: function () { return !window.__noWrite; }, isOwner: function () { return !window.__noWrite; } } : n === "mcp" ? mcp : n === "sample" ? sample : null); } };
})();`;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1100 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error" && !/fonts\.g|ERR_|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.addInitScript(fake);
  await page.route("http://board.test/", (route) => route.fulfill({ contentType: "text/html", body: '<!doctype html><html><head><meta charset="utf8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>[hidden]{display:none!important}</style></head><body>' + html + "</body></html>" }));
  await page.goto("http://board.test/", { waitUntil: "domcontentloaded" });

  const seed = await page.evaluate(() => {
    const S = window.__store, now = new Date().toISOString();
    const mk = (id, title, lane, sub, rank, extra) => (S.items[id] = Object.assign({ title, detail: "More context for " + title, lane, sub, rank, done: false, archived: false, origin: "plaud", createdAt: "2026-11-01T00:00:00Z", source: "Test recording" }, extra || {}));
    mk("w1", "Prepare the review deck", "work", "", 0, { due: "2026-11-01" });
    mk("w2", "Call the vendor about renewal", "work", "", 1);
    mk("w3", "Draft the Q1 plan", "work", "", 2);
    mk("p1", "Review the household budget", "personal", "financial", 0);
    mk("p2", "File the amended return", "personal", "taxes", 1);
    mk("p3", "Practice the breathing exercise", "personal", "individual", 2);
    mk("p4", "Plan the date night", "personal", "couples", 3);
    mk("p5", "Renew the car registration", "personal", "other", 4);
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
  check("summary strip shows five tiles", (await page.locator("#stats .stat").count()) === 5);
  await page.fill("#search", "household");
  check("search filters cards", (await page.locator(".card").count()) === 1);
  await page.fill("#search", "");
  check("clearing search restores cards", (await page.locator(".card").count()) === 11);
  check("overdue chip shows", (await page.locator(".chip.due-over").count()) === 1);
  if (shots) await page.screenshot({ path: path.join(shots, "1-desktop-light.png"), fullPage: true });

  // Regression: dropping in the empty space of a short lane must land in that lane, not in the taller neighbour
  {
    const wg = await page.locator('.group[data-lane="work"]').boundingBox();
    await dragTo('.card[data-id="i1"] .grip', wg.x + wg.width / 2, wg.y + wg.height + 90);
    await page.mouse.up();
    await page.waitForTimeout(300);
    const s0 = await store();
    check("Inbox item dropped in the empty space of Work lands in Work", s0.items.i1.lane === "work", s0.items.i1.lane);
    const s0w = Object.entries(s0.items).filter(([id, i]) => i.lane === "work" && !i.done && !i.archived && id !== "i1").map(([, i]) => i.rank);
    check("and goes to the bottom of Work", s0.items.i1.rank > Math.max(...s0w), JSON.stringify([s0.items.i1.rank, s0w]));
    const pg = await page.locator('.group[data-sub="individual"]').boundingBox();
    await dragTo('.card[data-id="i2"] .grip', pg.x + pg.width / 2, pg.y + pg.height / 2);
    await page.mouse.up();
    await page.waitForTimeout(300);
    const s1 = await store();
    check("Inbox item dropped on a Personal sub-list lands there", s1.items.i2.lane === "personal" && s1.items.i2.sub === "individual", JSON.stringify([s1.items.i2.lane, s1.items.i2.sub]));
    // put them back so later checks keep their starting state
    await page.evaluate(() => window.claude.use("db").then((db) => Promise.all([db.doc("items/i1").update({ lane: "inbox", rank: 0 }), db.doc("items/i2").update({ lane: "inbox", sub: "", rank: 1 })])));
    await page.waitForTimeout(300);
  }

  // Manual tasks: add from the panel, badge, source filter, edit
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.keyboard.press("n");
  check("N opens the add-task panel", await page.locator("#composer").isVisible());
  await page.fill("#c-title", "Call the plumber");
  await page.fill("#c-notes", "Kitchen sink is leaking");
  await page.fill("#c-due", "2026-12-01");
  await page.selectOption("#c-list", "personal:other");
  if (shots) await page.screenshot({ path: path.join(shots, "2a-composer.png") });
  await page.click("#c-submit");
  await page.waitForTimeout(500);
  let sm = await store();
  const mid = Object.keys(sm.items).find((k) => sm.items[k].title === "Call the plumber");
  check("manual task is saved as yours, in the chosen list, with notes and due date", mid && sm.items[mid].origin === "manual" && sm.items[mid].lane === "personal" && sm.items[mid].sub === "other" && sm.items[mid].due === "2026-12-01" && sm.items[mid].detail === "Kitchen sink is leaking", JSON.stringify(sm.items[mid]));
  check("a new manual task goes to the top of its list", sm.items[mid].rank < sm.items.p5.rank, JSON.stringify([sm.items[mid].rank, sm.items.p5.rank]));
  check("the panel closes after adding", !(await page.locator("#composer").isVisible()));
  check("manual task shows a You badge and Plaud tasks show a Plaud badge", (await page.locator(`.card[data-id="${mid}"] .chip.src.mine`).count()) === 1 && (await page.locator('.card[data-id="w1"] .chip.src:not(.mine)').count()) === 1);
  await page.click('#srcSeg [data-src="manual"]');
  check("filter: Added by me shows only my tasks", (await page.locator(".card").count()) === 1 && (await page.locator(".card .grip").count()) === 0);
  await page.click('#srcSeg [data-src="plaud"]');
  check("filter: From Plaud hides my tasks", (await page.locator(".card .chip.src.mine").count()) === 0 && (await page.locator(".card").count()) >= 10);
  await page.click('#srcSeg [data-src="all"]');
  await page.locator(`.card[data-id="${mid}"] .title`).click();
  await page.locator(`.card[data-id="${mid}"] [data-act="edit"]`).click();
  await page.fill("#c-title", "Call the plumber today");
  await page.click("#c-submit");
  await page.waitForTimeout(300);
  sm = await store();
  check("edit saves changes to a task", sm.items[mid].title === "Call the plumber today" && sm.items[mid].origin === "manual");
  await page.evaluate((id) => window.claude.use("db").then((db) => db.doc("items/" + id).delete()), mid);
  await page.waitForTimeout(300);

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
  await page.selectOption('.card[data-id="i1"] .sendto', "personal:taxes");
  await page.waitForTimeout(300);
  s = await store();
  check("Send to menu moves an Inbox item without dragging", s.items.i1.lane === "personal" && s.items.i1.sub === "taxes", JSON.stringify([s.items.i1.lane, s.items.i1.sub]));
  const wk = await page.locator('.group[data-lane="work"]').boundingBox();
  await dragTo('.card[data-id="i3"] .grip', wk.x + wk.width / 2, wk.y + 8);
  await page.mouse.up();
  await page.waitForTimeout(300);
  s = await store();
  const workRanks = Object.entries(s.items).filter(([id, i]) => i.lane === "work" && !i.done && !i.archived && id !== "i3").map(([, i]) => i.rank);
  check("drag from Inbox to top of Work is saved", s.items.i3.lane === "work" && s.items.i3.rank < Math.min(...workRanks), JSON.stringify([s.items.i3.rank, workRanks]));
  check("page order matches the saved order", await page.evaluate(() => document.querySelector("#list-work .card").dataset.id === "i3"));
  const savedRank = s.items.i3.rank;

  // Rank stack: one ranked list for the whole lane, section shown as a pill
  await page.click('.view[data-lane="personal"] [data-view="stack"]');
  await page.waitForTimeout(250);
  const openIds = async () => page.locator("#list-personal .card:not(.is-done)").evaluateAll((els) => els.map((e) => e.dataset.id));
  let ids = await openIds();
  check("Personal rank stack is a single list with a section pill on every open card", (await page.locator("#subs .group").count()) === 1 && ids.length >= 6 && (await page.locator("#list-personal .card:not(.is-done) .subpill").count()) === ids.length, String(ids.length));
  if (shots) await page.screenshot({ path: path.join(shots, "7-personal-stack.png") });
  let st0 = await store();
  const ranksInStack = ids.map((id) => st0.items[id].rank);
  check("stack order equals rank order", ranksInStack.every((r, k) => k === 0 || r >= ranksInStack[k - 1]), JSON.stringify(ranksInStack));
  const lastId = ids[ids.length - 1], lastSub = st0.items[lastId].sub;
  const topBox = await page.locator(`#list-personal .card[data-id="${ids[0]}"]`).boundingBox();
  await dragTo(`.card[data-id="${lastId}"] .grip`, topBox.x + topBox.width / 2, topBox.y + 4);
  await page.mouse.up();
  await page.waitForTimeout(300);
  st0 = await store();
  const others = Object.entries(st0.items).filter(([id, i]) => i.lane === "personal" && !i.done && !i.archived && id !== lastId).map(([, i]) => i.rank);
  check("dragging in the stack moves the item to the top of the whole lane and keeps its section", st0.items[lastId].rank < Math.min(...others) && st0.items[lastId].sub === lastSub && st0.items[lastId].lane === "personal", JSON.stringify([st0.items[lastId].rank, Math.min(...others), st0.items[lastId].sub, lastSub]));
  ids = await openIds();
  check("the stack shows it first", ids[0] === lastId);
  // pill changes the section without touching the rank
  const pillId = ids[1], pillRank = st0.items[pillId].rank, curSub = st0.items[pillId].sub, newSub = curSub === "taxes" ? "financial" : "taxes";
  await page.selectOption(`.card[data-id="${pillId}"] .subsel`, newSub);
  await page.waitForTimeout(300);
  st0 = await store();
  check("section pill changes the section and leaves the rank alone", st0.items[pillId].sub === newSub && st0.items[pillId].rank === pillRank, JSON.stringify([st0.items[pillId].sub, st0.items[pillId].rank, pillRank]));
  // back to sections: every section lists its items in the same rank order
  await page.click('.view[data-lane="personal"] [data-view="sections"]');
  await page.waitForTimeout(250);
  const consistent = await page.evaluate((snap) => {
    return [...document.querySelectorAll("#subs .group")].every((g) => {
      const dom = [...g.querySelectorAll(".card:not(.is-done)")].map((c) => c.dataset.id);
      const want = Object.entries(snap).filter(([, i]) => i.lane === "personal" && !i.done && !i.archived && (i.sub || "other") === g.dataset.sub).sort((a, b) => a[1].rank - b[1].rank).map(([id]) => id);
      return JSON.stringify(dom) === JSON.stringify(want);
    });
  }, st0.items);
  check("Sections view shows the same order, filtered by section", consistent);
  // dropping into an empty section sends the item to the bottom of the lane stack
  await page.fill("#sub-name", "Empty test");
  await page.press("#sub-name", "Enter");
  await page.waitForTimeout(300);
  await page.locator('.group[data-sub="empty-test"]').scrollIntoViewIfNeeded();
  const eg = await page.locator('.group[data-sub="empty-test"]').boundingBox();
  const dragId = (await page.locator('.group[data-sub="other"] .card:not(.is-done)').first().getAttribute("data-id"));
  await dragTo(`.card[data-id="${dragId}"] .grip`, eg.x + eg.width / 2, eg.y + eg.height / 2);
  await page.mouse.up();
  await page.waitForTimeout(300);
  st0 = await store();
  const maxOther = Math.max(...Object.entries(st0.items).filter(([id, i]) => i.lane === "personal" && !i.done && !i.archived && id !== dragId).map(([, i]) => i.rank));
  check("dropping into an empty section moves the item there and to the bottom of the stack", st0.items[dragId].sub === "empty-test" && st0.items[dragId].rank > maxOther, JSON.stringify([st0.items[dragId].sub, st0.items[dragId].rank, maxOther]));

  // sync
  await page.waitForSelector("#syncBtn:not([hidden])");
  await page.click("#syncBtn");
  await page.waitForTimeout(800);
  s = await store();
  const synced = Object.values(s.items).filter((i) => i.origin === "plaud" && /budget draft|dentist/.test(i.title));
  const calls = await page.evaluate(() => window.__calls);
  check("refresh reads only recordings it has not read before", calls.filter((c) => c[1] === "get_note").map((c) => c[2].file_id).sort().join() === "of_new1,of_new2,of_new3");
  check("narrative plan sections of medical or therapy notes are passed on for sorting", /PLAN SECTION/.test(await page.evaluate(() => window.__lastPrompt)) && /pulmonologist/.test(await page.evaluate(() => window.__lastPrompt)));
  check("a recording Plaud is still processing stays unread so the next refresh retries it", !s.meta.sync.processedFileIds.includes("of_new2") && s.meta.sync.processedFileIds.includes("of_new1") && /still processing/.test(s.meta.sync.note), s.meta.sync.note);
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

  // narrow window: the Inbox is a capped tray, so Work and Personal stay within reach of a drag
  await page.evaluate(() => window.claude.use("db").then((db) => Promise.all(Array.from({ length: 40 }, (_, k) => db.doc("items/nin" + k).set({ title: "Inbox backlog " + k, detail: "", lane: "inbox", sub: "", suggestLane: "work", rank: -100 + k, done: false, archived: false, origin: "plaud", createdAt: "2026-11-01T00:00:00Z" })))));
  await page.setViewportSize({ width: 900, height: 800 });
  await page.waitForTimeout(500);
  const inboxBox = await page.locator(".lane.inbox").boundingBox();
  const workLane = await page.locator(".lane.work").boundingBox();
  check("narrow window: Inbox is a capped tray and Work is on screen", inboxBox.height <= 400 && workLane.y < 800 - 120, JSON.stringify([inboxBox.height, workLane.y]));
  if (shots) await page.screenshot({ path: path.join(shots, "3a-narrow.png") });
  {
    const wg2 = await page.locator('.group[data-lane="work"]').boundingBox();
    await dragTo('.card[data-id="nin0"] .grip', wg2.x + wg2.width / 2, Math.min(wg2.y + 40, 760));
    await page.mouse.up();
    await page.waitForTimeout(300);
    const sN = await store();
    check("narrow window: drag from the Inbox tray to Work works", sN.items.nin0.lane === "work", sN.items.nin0.lane);
  }
  await page.evaluate(() => Promise.all(Array.from({ length: 40 }, (_, k) => window.claude.use("db").then((db) => db.doc("items/nin" + k).delete()))));
  await page.setViewportSize({ width: 1280, height: 1100 });
  await page.waitForTimeout(300);

  // long lists scroll inside their lane instead of stretching the page
  await page.evaluate(() => window.claude.use("db").then((db) => Promise.all(Array.from({ length: 30 }, (_, k) => db.doc("items/long" + k).set({ title: "Backlog item number " + k + " with a reasonably long title to wrap", detail: "", lane: "work", sub: "", rank: 100 + k, done: false, archived: false, origin: "manual", createdAt: "2026-11-01T00:00:00Z" })))));
  await page.waitForTimeout(400);
  check("long Work list scrolls inside its lane", await page.evaluate(() => { const sc = document.querySelector(".lane.work .lane-scroll"); return sc.scrollHeight > sc.clientHeight + 50 && document.documentElement.scrollHeight < window.innerHeight + 400; }));
  if (shots) await page.screenshot({ path: path.join(shots, "3b-long-list.png") });
  const firstId = await page.locator("#list-work .card").first().getAttribute("data-id");
  const gb = await page.locator("#list-work .card .grip").first().boundingBox();
  await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2);
  await page.mouse.down();
  const sb = await page.locator(".lane.work .lane-scroll").boundingBox();
  await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height - 14, { steps: 10 });
  await page.waitForTimeout(2500);
  await page.mouse.up();
  await page.waitForTimeout(300);
  s = await store();
  check("dragging near the lane edge autoscrolls a long list", s.items[firstId].rank > 112, String(s.items[firstId].rank));
  await page.evaluate(() => Promise.all(Array.from({ length: 30 }, (_, k) => window.claude.use("db").then((db) => db.doc("items/long" + k).delete()))));
  await page.waitForTimeout(300);

  // Work sections: create, see General plus the new section, rank stack with pills
  await page.fill("#sub-name-work", "Projects");
  await page.press("#sub-name-work", "Enter");
  await page.waitForTimeout(300);
  let sw = await store();
  check("a Work section can be created", Array.isArray(sw.meta.config.workSubs) && sw.meta.config.workSubs.some((x) => x.id === "projects") && sw.meta.config.subs.length >= 5);
  check("Work now shows General and the new section, and the view switch appears", (await page.locator('#subs-work .group').count()) === 2 && (await page.locator('.view[data-lane="work"]').isVisible()));
  const wid = await page.locator('#subs-work .group[data-sub=""] .card:not(.is-done)').first().getAttribute("data-id");
  const pg2 = await page.locator('#subs-work .group[data-sub="projects"]').boundingBox();
  await dragTo(`.card[data-id="${wid}"] .grip`, pg2.x + pg2.width / 2, pg2.y + pg2.height / 2);
  await page.mouse.up();
  await page.waitForTimeout(300);
  sw = await store();
  check("an item can be dragged into a Work section", sw.items[wid].sub === "projects" && sw.items[wid].lane === "work", JSON.stringify([sw.items[wid].lane, sw.items[wid].sub]));
  await page.click('.view[data-lane="work"] [data-view="stack"]');
  await page.waitForTimeout(250);
  check("Work rank stack is one list with pills", (await page.locator("#subs-work .group").count()) === 1 && (await page.locator("#list-work .card:not(.is-done) .subpill").count()) === (await page.locator("#list-work .card:not(.is-done)").count()));
  check("the moved item's pill says Projects", (await page.locator(`.card[data-id="${wid}"] .subpill select`).evaluate((el) => el.options[el.selectedIndex].text)) === "Projects");
  if (shots) await page.screenshot({ path: path.join(shots, "7b-work-stack.png") });
  await page.click('.view[data-lane="work"] [data-view="sections"]');
  await page.waitForTimeout(200);

  // the Refresh button is always there; without Plaud access it explains why, and R triggers it
  check("the Refresh from Plaud button is visible", await page.locator("#syncBtn").isVisible() && /Refresh from Plaud/.test(await page.locator("#syncBtn").innerText()));
  await page.evaluate(() => { window.__use = window.claude.use; window.claude.use = (n) => (n === "mcp" ? Promise.resolve(null) : window.__use(n)); });
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.keyboard.press("r");
  await page.waitForTimeout(400);
  check("R refreshes, and without Plaud access the page says so", /Plaud connection/.test(await page.locator("#syncText").innerText()) && /owning claude\.ai account/.test(await page.locator("#syncText").innerText()));
  await page.evaluate(() => { window.claude.use = window.__use; });

  // a refused save (read-only viewer) switches the page to a clear read-only state instead of a vague error
  await page.evaluate(() => { window.__ro = true; });
  await page.locator(".card input[type=checkbox]").first().check();
  await page.waitForTimeout(900);
  check("a refused save shows the read-only banner and turns editing off", await page.locator("#roBanner").isVisible() && !(await page.locator("#addBtn").isVisible()) && !(await page.locator("#syncBtn").isVisible()) && (await page.locator(".grip").count()) === 0 && (await page.locator("form.add").first().isHidden()));
  check("no vague save-failed toast appears", (await page.locator(".toast", { hasText: "Could not save" }).count()) === 0);

  if (shots) {
    await page.screenshot({ path: path.join(shots, "4-after-actions.png"), fullPage: true });
    await page.emulateMedia({ colorScheme: "dark" });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(shots, "5-desktop-dark.png"), fullPage: true });
    await page.emulateMedia({ colorScheme: "light" });
    await page.waitForTimeout(600);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(shots, "6-phone.png"), fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check("no horizontal scroll at phone width", overflow <= 0, overflow);
  }
  check("no console or page errors", errors.length === 0, errors.join(" | "));

  {
    const p2 = await ctx.newPage();
    await p2.addInitScript("window.__noWrite = true;");
    await p2.addInitScript(fake);
    await p2.route("http://board.test/", (route) => route.fulfill({ contentType: "text/html", body: '<!doctype html><html><head><meta charset="utf8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>[hidden]{display:none!important}</style></head><body>' + html + "</body></html>" }));
    await p2.goto("http://board.test/", { waitUntil: "domcontentloaded" });
    await p2.waitForTimeout(600);
    check("a viewer without write access sees the read-only banner at once", await p2.locator("#roBanner").isVisible() && !(await p2.locator("#addBtn").isVisible()) && !(await p2.locator("#syncBtn").isVisible()));
    await p2.close();
  }
  let bad = 0;
  results.forEach(([n, ok, info]) => { if (!ok) bad++; console.log((ok ? "PASS " : "FAIL ") + n + (info !== "" && !ok ? "  [" + info + "]" : "")); });
  console.log(bad ? bad + " FAILED" : "ALL " + results.length + " PASSED");
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
