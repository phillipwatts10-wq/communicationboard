/*
  Automatic tests for the communication board.
  Run with:  node tests/run-tests.js
  Needs Playwright with Chromium installed.

  The real speech feature is replaced by a stand-in that records
  what would have been said, so tests can check it silently.
*/
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const SHOTS = path.join(__dirname, "screenshots");
fs.mkdirSync(SHOTS, { recursive: true });

const VIEWPORTS = [
  { name: "iPad-Air-1180x820", width: 1180, height: 820 },
  { name: "iPad-1024x768", width: 1024, height: 768 }
];
const GRID_SIZES = [8, 12];

// ---------- tiny local web server ----------
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml" };
function startServer() {
  const server = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
    const file = p.endsWith("/") ? path.join(p, "index.html") : p;
    if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((r) => server.listen(0, () => r(server)));
}

// ---------- results ----------
let passed = 0;
const failures = [];
function check(cond, msg) {
  if (cond) passed++;
  else failures.push(msg);
}

// ---------- load the data file in Node ----------
function loadData() {
  const src = fs.readFileSync(path.join(ROOT, "data/board.js"), "utf8");
  const sandbox = { window: {} };
  new Function("window", src)(sandbox.window);
  return sandbox.window.COMMUNICATION_DATA;
}
const DATA = loadData();
const BOARD = DATA.boards[DATA.activeBoardId];

// Shortest list of presses from Home to every screen.
function pathsToScreens() {
  const paths = { [BOARD.homeScreen]: [] };
  const queue = [BOARD.homeScreen];
  while (queue.length) {
    const sid = queue.shift();
    BOARD.screens[sid].slots.forEach((wid) => {
      const w = BOARD.words[wid];
      if (w && w.opens && !(w.opens in paths)) {
        paths[w.opens] = paths[sid].concat([wid]);
        queue.push(w.opens);
      }
    });
  }
  return paths;
}
const PATHS = pathsToScreens();

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return "rgb(" + ((n >> 16) & 255) + ", " + ((n >> 8) & 255) + ", " + (n & 255) + ")";
}

// ---------- browser set-up ----------
function speechStub() {
  window.__log = [];
  const voices = [
    { name: "US Voice", lang: "en-US", voiceURI: "us-voice", localService: true, default: true },
    { name: "British Voice", lang: "en-GB", voiceURI: "gb-voice", localService: true, default: false },
    { name: "British Voice 2", lang: "en-GB", voiceURI: "gb-voice-2", localService: true, default: false },
    { name: "French Voice", lang: "fr-FR", voiceURI: "fr-voice", localService: true, default: false }
  ];
  window.SpeechSynthesisUtterance = function (text) { this.text = text; this.rate = 1; this.voice = null; this.lang = ""; };
  const synth = {
    getVoices: () => voices,
    speak: (u) => window.__log.push({ type: "speak", text: u.text, rate: u.rate, voice: u.voice && u.voice.voiceURI, lang: u.lang }),
    cancel: () => window.__log.push({ type: "cancel" }),
    addEventListener: () => {},
    removeEventListener: () => {}
  };
  Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
}

async function newPage(browser, viewport, settings, opts = {}) {
  const context = await browser.newContext({ viewport, hasTouch: true });
  await context.addInitScript(speechStub);
  if (settings) {
    await context.addInitScript(([key, value]) => {
      if (!sessionStorage.getItem("__seeded")) {
        localStorage.setItem(key, value);
        sessionStorage.setItem("__seeded", "1");
      }
    }, ["commboard.settings." + BOARD.id, JSON.stringify(settings)]);
  }
  if (opts.extraData) {
    await context.route("**/data/board.js", async (route) => {
      const body = fs.readFileSync(path.join(ROOT, "data/board.js"), "utf8") + "\n" + opts.extraData;
      await route.fulfill({ status: 200, contentType: "text/javascript", body });
    });
  }
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(BASE);
  return { page, context, errors };
}

const screenOf = (page) => page.getAttribute("#grid", "data-screen");
const sentenceOf = (page) => page.$$eval("#strip-words .strip-card", (els) => els.map((e) => e.dataset.word));
const lastSpoken = (page) => page.evaluate(() => { const s = window.__log.filter((l) => l.type === "speak"); return s.length ? s[s.length - 1] : null; });
const speakCount = (page) => page.evaluate(() => window.__log.filter((l) => l.type === "speak").length);

async function goToScreen(page, sid) {
  await page.click("#home");
  for (const wid of PATHS[sid]) await page.click('#grid [data-word="' + wid + '"]');
  await page.click("#clear");
}

// ---------- TEST 1: every button on every layer ----------
async function testEveryButton(browser, vp, gridSize) {
  const tag = vp.name + " grid " + gridSize;
  const { page, context, errors } = await newPage(browser, vp, { gridSize, pressDelayMs: 0 });

  check(await screenOf(page) === BOARD.homeScreen, tag + ": starts on Home");
  check((await page.$$("#grid > *")).length === gridSize, tag + ": grid has " + gridSize + " spaces");

  for (const sid of Object.keys(BOARD.screens)) {
    check(sid in PATHS, tag + ": screen " + sid + " can be reached from Home");
    const slots = BOARD.screens[sid].slots;

    // Layout check on this screen.
    await goToScreen(page, sid);
    await layoutCheck(page, tag + " / " + sid, vp, gridSize);
    await page.screenshot({ path: path.join(SHOTS, vp.name + "-grid" + gridSize + "-" + sid + ".png") });

    for (let i = 0; i < slots.length; i++) {
      const wid = slots[i];
      const w = BOARD.words[wid];
      await goToScreen(page, sid);
      const btn = await page.$('#grid [data-word="' + wid + '"]');
      check(!!btn, tag + ": " + sid + " shows " + wid);
      if (!btn) continue;

      // Position: slot i is in cell i (on page 0).
      const idx = await page.$$eval("#grid > *", (els, id) => els.findIndex((e) => e.dataset && e.dataset.word === id), wid);
      check(idx === i % gridSize, tag + ": " + wid + " is in position " + i);

      // Colour.
      const bg = await btn.evaluate((e) => getComputedStyle(e).backgroundColor);
      check(bg === hexToRgb(BOARD.colours[w.colour].background), tag + ": " + wid + " colour is " + w.colour);

      const before = await speakCount(page);
      await btn.click();
      const sentence = await sentenceOf(page);
      const screenAfter = await screenOf(page);

      if (w.type === "category") {
        check(await speakCount(page) === before, tag + ": category " + wid + " does not speak");
        check(sentence.length === 0, tag + ": category " + wid + " does not join sentence");
        check(screenAfter === w.opens, tag + ": category " + wid + " opens " + w.opens);
      } else {
        const spoken = await lastSpoken(page);
        check(spoken && spoken.text === (w.speak || w.label), tag + ": " + wid + " speaks '" + (w.speak || w.label) + "'");
        check(spoken && spoken.rate === 0.8, tag + ": " + wid + " speaks at rate 0.8");
        check(spoken && spoken.lang === "en-GB", tag + ": " + wid + " uses British voice");
        check(sentence.length === 1 && sentence[0] === wid, tag + ": " + wid + " joins sentence");
        const expected = w.opens || sid;
        check(screenAfter === expected, tag + ": after " + wid + " screen is " + expected + " (got " + screenAfter + ")");
        // Strip card keeps the colour.
        const cardBg = await page.$eval("#strip-words .strip-card", (e) => getComputedStyle(e).backgroundColor);
        check(cardBg === hexToRgb(BOARD.colours[w.colour].background), tag + ": strip card for " + wid + " keeps colour");
      }
    }
  }

  // Fixed bar keys: speak, join, don't change screen.
  await goToScreen(page, "food");
  for (const wid of BOARD.fixedBar) {
    await page.click('#fixed-bar [data-word="' + wid + '"]');
    const spoken = await lastSpoken(page);
    check(spoken && spoken.text === BOARD.words[wid].label, tag + ": fixed key " + wid + " speaks");
    check(await screenOf(page) === "food", tag + ": fixed key " + wid + " keeps screen");
  }
  const s = await sentenceOf(page);
  check(JSON.stringify(s) === JSON.stringify(BOARD.fixedBar), tag + ": fixed keys all joined sentence in order");

  // Full sentence path: I want Food apple.
  await page.click("#clear");
  await page.click("#home");
  for (const wid of ["i", "want", "food", "apple", "banana"]) await page.click('#grid [data-word="' + wid + '"]');
  check(JSON.stringify(await sentenceOf(page)) === '["i","want","apple","banana"]', tag + ": I want apple banana sentence built");
  check(await screenOf(page) === "food", tag + ": stays on Food after final word");
  await page.screenshot({ path: path.join(SHOTS, vp.name + "-grid" + gridSize + "-sentence.png") });

  await page.click("#strip");
  check((await lastSpoken(page)).text === "eye want apple banana", tag + ": strip speaks whole sentence (I said as 'eye')");

  // Every visible button shows its symbol picture (loaded, not broken).
  const pics = await page.$$eval("#grid .word-btn, #fixed-bar .word-btn, .strip-card", (els) =>
    els.map((e) => { const i = e.querySelector(".symbol img"); return { id: e.dataset.word, ok: !!i && i.complete && i.naturalWidth > 0 }; }));
  pics.forEach((p) => check(p.ok, tag + ": " + p.id + " shows its symbol"));

  await page.click("#delete-last");
  check(JSON.stringify(await sentenceOf(page)) === '["i","want","apple"]', tag + ": Delete last word removes one");

  await page.click("#clear");
  check((await sentenceOf(page)).length === 0, tag + ": Clear empties sentence");

  // Home clears the sentence and goes to the Home screen.
  await page.click('#fixed-bar [data-word="yes"]');
  await page.click('#fixed-bar [data-word="more"]');
  check((await sentenceOf(page)).length === 2, tag + ": sentence built before Home");
  const speaksBefore = await speakCount(page);
  await page.click("#home");
  check((await sentenceOf(page)).length === 0, tag + ": Home clears the sentence");
  check(await screenOf(page) === "home", tag + ": Home goes to Home screen");
  check(await speakCount(page) === speaksBefore, tag + ": Home does not speak");

  // A new press stops earlier speech: cancel logged before every speak.
  const ok = await page.evaluate(() => window.__log.every((l, i) => l.type !== "speak" || (i > 0 && window.__log[i - 1].type === "cancel")));
  check(ok, tag + ": speech is stopped before each new speech");

  check(errors.length === 0, tag + ": no page errors (" + errors.join("; ") + ")");
  await context.close();
}

// ---------- layout ----------
async function layoutCheck(page, tag, vp, gridSize) {
  const boxes = await page.evaluate(() => {
    const r = (sel) => { const e = document.querySelector(sel); const b = e.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; };
    const all = [...document.querySelectorAll("button")].filter((b) => !b.closest(".modal") && b.offsetParent !== null && getComputedStyle(b).visibility !== "hidden");
    return {
      strip: r("#strip-area"), main: r("#main-area"), bar: r("#fixed-bar"),
      buttons: all.map((b) => { const x = b.getBoundingClientRect(); return { id: b.id || b.dataset.word, x: x.left, y: x.top, w: x.width, h: x.height }; }),
      words: [...document.querySelectorAll("#grid .word-btn, #fixed-bar .word-btn")].map((b) => {
        const l = b.querySelector(".label");
        // Check every word of the label: no word may be wider than the button.
        const range = document.createRange();
        range.selectNodeContents(l);
        const lines = [...range.getClientRects()];
        const lb = l.getBoundingClientRect();
        const inside = lines.every((r) => r.left >= lb.left - 1 && r.right <= lb.right + 1);
        return { id: b.dataset.word, w: b.offsetWidth, h: b.offsetHeight, fixed: !!b.closest("#fixed-bar"),
          fits: inside && l.scrollWidth <= l.clientWidth + 1 && l.scrollHeight <= l.clientHeight + 1,
          symbolH: b.querySelector(".symbol").offsetHeight };
      }),
      scrollW: document.documentElement.scrollWidth, scrollH: document.documentElement.scrollHeight
    };
  });
  check(boxes.scrollW <= vp.width && boxes.scrollH <= vp.height, tag + ": no page scrolling");
  check(boxes.strip.y + boxes.strip.h <= boxes.main.y, tag + ": strip above grid, no overlap");
  check(boxes.main.y + boxes.main.h <= boxes.bar.y, tag + ": grid above fixed bar, no overlap");
  boxes.buttons.forEach((b) => {
    check(b.x >= 0 && b.y >= 0 && b.x + b.w <= vp.width + 0.5 && b.y + b.h <= vp.height + 0.5, tag + ": " + b.id + " fully on screen");
    if (b.id !== "staff") check(b.w >= 80 && b.h >= 70, tag + ": " + b.id + " is a large target (" + Math.round(b.w) + "x" + Math.round(b.h) + ")");
  });
  boxes.words.forEach((w) => {
    check(w.fits, tag + ": label '" + w.id + "' fits on its button");
    if (!w.fixed) check(w.w >= 150 && w.h >= 120, tag + ": " + w.id + " grid button big enough (" + w.w + "x" + w.h + ")");
    check(w.symbolH >= (w.fixed ? 40 : 45), tag + ": " + w.id + " still has a symbol space (" + w.symbolH + "px)");
  });
}

// ---------- TEST 2: double-press protection ----------
async function testDoublePress(browser) {
  const { page, context } = await newPage(browser, VIEWPORTS[0], { pressDelayMs: 1000 });
  await page.click('#grid [data-word="i"]');
  await page.waitForTimeout(1100);
  await page.click('#grid [data-word="want"]');
  await page.waitForTimeout(1100);
  await page.click('#grid [data-word="food"]');
  await page.waitForTimeout(1100);
  await page.click('#grid [data-word="apple"]');
  await page.click('#grid [data-word="apple"]'); // too quick – ignored
  await page.click('#fixed-bar [data-word="yes"]'); // too quick – ignored
  check(JSON.stringify(await sentenceOf(page)) === '["i","want","apple"]', "Double press: quick second presses ignored (1 s delay)");
  await page.waitForTimeout(1100);
  await page.click('#grid [data-word="apple"]');
  check((await sentenceOf(page)).length === 4, "Double press: press accepted after delay");
  // Quick tap on I from Home with touch.
  await page.waitForTimeout(1100);
  await page.tap('#fixed-bar [data-word="yes"]');
  check((await sentenceOf(page)).pop() === "yes", "Touch tap works");
  await context.close();
}

// ---------- TEST 3: staff settings ----------
async function testStaffSettings(browser) {
  const vp = VIEWPORTS[0];
  const { page, context } = await newPage(browser, vp, null);

  // Defaults.
  const def = await page.evaluate((k) => localStorage.getItem(k), "commboard.settings." + BOARD.id);
  check(def === null, "Settings: nothing stored until staff change something");
  await page.click('#grid [data-word="i"]');
  const sp = await lastSpoken(page);
  check(sp.voice === "gb-voice" && sp.rate === 0.8, "Speech: default is British voice at 0.8");

  // Short press does nothing.
  const staff = await page.$("#staff");
  const b = await staff.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(800);
  await page.mouse.up();
  await page.waitForTimeout(2600);
  check(await page.isHidden("#adult-check"), "Staff: short press does not open check");

  // Long press opens the adult check.
  await page.mouse.down();
  await page.waitForTimeout(3200);
  await page.mouse.up();
  check(await page.isVisible("#adult-check"), "Staff: 3 second hold opens adult check");
  await page.screenshot({ path: path.join(SHOTS, "staff-adult-check.png") });

  // Wrong answer.
  const q = await page.textContent("#adult-question");
  const [, a, bb] = q.match(/(\d+) \+ (\d+)/);
  const right = String(Number(a) + Number(bb));
  await page.click('[data-key="0"]');
  await page.click('[data-key="ok"]');
  check(await page.isVisible("#adult-check") && (await page.textContent("#adult-message")).length > 0, "Staff: wrong answer refused");
  check(await page.isHidden("#settings"), "Staff: settings stay closed after wrong answer");

  // Cancel then retry.
  await page.click("#adult-cancel");
  check(await page.isHidden("#adult-check"), "Staff: cancel closes check");
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(3200);
  await page.mouse.up();
  const q2 = await page.textContent("#adult-question");
  const [, a2, b2] = q2.match(/(\d+) \+ (\d+)/);
  for (const ch of String(Number(a2) + Number(b2))) await page.click('[data-key="' + ch + '"]');
  await page.click('[data-key="ok"]');
  check(await page.isVisible("#settings"), "Staff: right answer opens settings");
  await page.screenshot({ path: path.join(SHOTS, "staff-settings.png") });

  // Voice list: British first.
  const opts = await page.$$eval("#voice-select option", (o) => o.map((x) => x.value));
  check(opts[0] === "" && opts[1] === "gb-voice" && opts[2] === "gb-voice-2" && !opts.includes("fr-voice"), "Settings: voice list shows British first, English only");
  await page.selectOption("#voice-select", "gb-voice-2");

  // Speed.
  await page.$eval("#rate", (e) => { e.value = "1.1"; e.dispatchEvent(new Event("input")); });
  await page.click("#test-voice");
  const t = await lastSpoken(page);
  check(t.voice === "gb-voice-2" && Math.abs(t.rate - 1.1) < 0.001, "Settings: chosen voice and speed used");

  // Delay.
  await page.$eval("#delay", (e) => { e.value = "0"; e.dispatchEvent(new Event("input")); });

  // Grid 12.
  await page.click('[data-grid="12"]');

  // Hide help and more – the others must not move.
  const before = await page.$$eval("#fixed-bar .word-btn", (els) => els.map((e) => [e.dataset.word, Math.round(e.getBoundingClientRect().left)]));
  await page.click('[data-toggle="help"]');
  await page.click('[data-toggle="more"]');
  await page.click("#close-settings");
  check(await page.isHidden("#settings"), "Settings: Done closes settings");
  check((await page.$$("#grid > *")).length === 12, "Settings: grid now 12");
  const after = await page.$$eval("#fixed-bar .word-btn", (els) => els.map((e) => [e.dataset.word, Math.round(e.getBoundingClientRect().left), getComputedStyle(e).visibility]));
  check(after.find((x) => x[0] === "help")[2] === "hidden" && after.find((x) => x[0] === "more")[2] === "hidden", "Settings: help and more hidden");
  check(after.every((x, i) => x[1] === before[i][1]), "Settings: other fixed keys keep their positions");
  await page.screenshot({ path: path.join(SHOTS, "hidden-keys-grid12.png") });

  // Settings are kept after reload.
  await page.reload();
  check((await page.$$("#grid > *")).length === 12, "Settings: grid size kept after reload");
  const hiddenAfter = await page.$$eval("#fixed-bar .is-hidden", (els) => els.map((e) => e.dataset.word));
  check(JSON.stringify(hiddenAfter) === '["help","more"]', "Settings: hidden keys kept after reload");
  await page.click('#grid [data-word="i"]');
  const sp2 = await lastSpoken(page);
  check(sp2.voice === "gb-voice-2" && Math.abs(sp2.rate - 1.1) < 0.001, "Settings: voice and speed kept after reload");
  await context.close();
}

// ---------- TEST 4: next / previous arrows with fixed positions ----------
async function testPaging(browser) {
  // Temporarily add 12 extra test words to Food (not saved to the data file).
  const extra = `
    (function(){
      var b = COMMUNICATION_DATA.boards[COMMUNICATION_DATA.activeBoardId];
      for (var i = 1; i <= 12; i++) {
        b.words["test" + i] = { label: "test" + i, colour: "green", image: "" };
        b.screens.food.slots.push("test" + i);
      }
    })();`;
  for (const gridSize of GRID_SIZES) {
    const { page, context } = await newPage(browser, VIEWPORTS[0], { gridSize, pressDelayMs: 0 }, { extraData: extra });
    await goToScreen(page, "food");
    const total = 18;
    const pages = Math.ceil(total / gridSize);
    const prevVis = () => page.$eval("#prev", (e) => getComputedStyle(e).visibility);
    const nextVis = () => page.$eval("#next", (e) => getComputedStyle(e).visibility);
    const nextBox = await page.$eval("#next", (e) => JSON.stringify(e.getBoundingClientRect()));
    check(await prevVis() === "hidden" && await nextVis() === "visible", "Paging " + gridSize + ": page 1 shows next only");
    for (let p = 1; p < pages; p++) {
      await page.click("#next");
      const ids = await page.$$eval("#grid > *", (els) => els.map((e) => e.dataset.word || null));
      const expected = [];
      for (let i = 0; i < gridSize; i++) expected.push(BOARD.screens.food.slots.concat(Array.from({ length: 12 }, (_, k) => "test" + (k + 1)))[p * gridSize + i] || null);
      check(JSON.stringify(ids) === JSON.stringify(expected), "Paging " + gridSize + ": page " + (p + 1) + " words in fixed positions");
      check(await page.$eval("#next", (e) => JSON.stringify(e.getBoundingClientRect())) === nextBox, "Paging " + gridSize + ": next arrow does not move");
    }
    check(await nextVis() === "hidden" && await prevVis() === "visible", "Paging " + gridSize + ": last page shows previous only");
    await page.screenshot({ path: path.join(SHOTS, "paging-grid" + gridSize + "-last-page.png") });
    await page.click("#prev");
    check(await page.getAttribute("#grid", "data-page") === String(pages - 2), "Paging " + gridSize + ": previous goes back a page");
    // On a screen with few words, both arrows hidden.
    await page.click("#home");
    check(await prevVis() === "hidden" && await nextVis() === "hidden", "Paging " + gridSize + ": Home has no arrows");
    await context.close();
  }
}

// ---------- TEST 5: no animations, no outside requests ----------
async function testCalmAndPrivate(browser) {
  const context = await browser.newContext({ viewport: VIEWPORTS[0] });
  const outside = [];
  context.on("request", (r) => { if (!r.url().startsWith(BASE)) outside.push(r.url()); });
  await context.addInitScript(speechStub);
  const page = await context.newPage();
  await page.goto(BASE);
  await page.click('#grid [data-word="i"]');
  const anim = await page.evaluate(() => [...document.querySelectorAll("*")].some((e) => {
    const s = getComputedStyle(e);
    return (s.animationName && s.animationName !== "none") || (parseFloat(s.transitionDuration) || 0) > 0;
  }));
  check(!anim, "Calm: no animations or transitions");
  check(outside.length === 0, "Private: no requests to other websites (" + outside.join(", ") + ")");
  // Sentence cap.
  await page.evaluate(() => {});
  await context.close();
}

// ---------- TEST 6: long sentences stay readable ----------
async function testLongSentence(browser) {
  for (const vp of VIEWPORTS) {
    const { page, context } = await newPage(browser, vp, { pressDelayMs: 0 });
    const stripCheck = async (label) => {
      const r = await page.evaluate(() => {
        const strip = document.getElementById("strip-words").getBoundingClientRect();
        return [...document.querySelectorAll(".strip-card")].map((c) => {
          const b = c.getBoundingClientRect();
          const l = c.querySelector(".label");
          return { id: c.dataset.word, inside: b.right <= strip.right + 0.5 && b.bottom <= strip.bottom + 0.5,
            fits: l.scrollWidth <= l.clientWidth + 1 && l.scrollHeight <= l.clientHeight + 1 };
        });
      });
      r.forEach((c) => {
        check(c.inside, vp.name + " " + label + ": strip card " + c.id + " inside strip");
        check(c.fits, vp.name + " " + label + ": strip word " + c.id + " readable (not cut off)");
      });
    };
    const press = async (list) => { for (const w of list) await page.click('#grid [data-word="' + w + '"]'); };

    // Round 1: longest game words. "I want" + 4 games = 6 words (one row).
    await page.click("#home");
    await press(["i", "want", "games", "matching_game", "board_game", "ipad_game", "chase"]);
    check((await sentenceOf(page)).length === 6, vp.name + ": 6-word sentence built");
    await stripCheck("6 words (games)");
    await page.screenshot({ path: path.join(SHOTS, "sentence-6-words-" + vp.name + ".png") });
    await press(["matching_game", "board_game", "matching_game", "board_game", "ipad_game", "matching_game"]);
    await stripCheck("12 words (games)");
    await page.screenshot({ path: path.join(SHOTS, "sentence-12-words-" + vp.name + ".png") });

    // Round 2: Home clears, then place words including "playground".
    await page.click("#home");
    check((await sentenceOf(page)).length === 0, vp.name + ": Home cleared the long sentence");
    await press(["i", "want", "places", "playground", "library", "garden", "hall"]);
    await stripCheck("6 words (places)");
    await press(["playground", "playground", "playground", "playground", "playground", "playground", "hall", "hall"]);
    const n = (await sentenceOf(page)).length;
    check(n === 12, vp.name + ": sentence capped at 12 words (got " + n + ")");
    await stripCheck("12 words (places)");
    // Pressing still speaks even when the strip is full.
    check((await lastSpoken(page)).text === "hall", vp.name + ": word still speaks when strip is full");
    await context.close();
  }
}

// ---------- helpers for staff tests ----------
async function touchHold(page, ms, driftPx) {
  const box = await (await page.$("#staff")).boundingBox();
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  await page.waitForTimeout(400);
  const holdingText = await page.textContent("#staff");
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + driftPx, y: y + driftPx / 2 }] });
  await page.waitForTimeout(ms - 400);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
  return holdingText;
}

async function solveSum(page) {
  const q = await page.textContent("#adult-question");
  const [, a, b] = q.match(/(\d+) \+ (\d+)/);
  for (const ch of String(Number(a) + Number(b))) await page.click('[data-key="' + ch + '"]');
  await page.click('[data-key="ok"]');
}

async function openSettings(page) {
  await touchHold(page, 3300, 0);
  await solveSum(page);
}

// ---------- TEST 7: Staff button with a real touch hold ----------
async function testStaffTouch(browser) {
  const { page, context } = await newPage(browser, VIEWPORTS[0], { pressDelayMs: 0 });
  const t1 = await touchHold(page, 1200, 0);
  check(t1.indexOf("Keep holding") !== -1, "Staff touch: shows 'Keep holding…' while held");
  await page.waitForTimeout(2500);
  check(await page.isHidden("#adult-check"), "Staff touch: short hold does not open");
  check((await page.textContent("#staff")).trim() === "Staff", "Staff touch: label goes back after letting go");
  await touchHold(page, 3300, 12);
  check(await page.isVisible("#adult-check"), "Staff touch: 3 s hold with a slightly moving finger opens check");
  await page.click("#adult-cancel");
  await touchHold(page, 3300, 90);
  check(await page.isHidden("#adult-check"), "Staff touch: sliding the finger away cancels");
  await context.close();
}

// ---------- TEST 8: My words ----------
async function testMyWords(browser) {
  const vp = VIEWPORTS[0];
  const { page, context, errors } = await newPage(browser, vp, { pressDelayMs: 0, gridSize: 8 });
  const addWord = async (label, opts = {}) => {
    await page.click("#add-word");
    await page.fill("#we-label", label);
    if (opts.speak) await page.fill("#we-speak", opts.speak);
    if (opts.colour) await page.click('#we-colours [data-colour="' + opts.colour + '"]');
    if (opts.screen) await page.selectOption("#we-screen", opts.screen);
    if (opts.symbol) { await page.click("#we-pick-symbol"); await page.click('#we-symbols [data-symbol="' + opts.symbol + '"]'); }
    if (opts.photo) await page.setInputFiles("#we-photo", opts.photo);
    if (opts.photo) await page.waitForFunction(() => !!document.querySelector("#we-preview img"));
    await page.click("#we-save");
  };

  // Go to Food, open settings: the page picker should default to Food.
  await goToScreen(page, "food");
  await openSettings(page);
  check(await page.isVisible("#settings"), "My words: settings open");
  check((await page.textContent("#my-words")).indexOf("No words added yet") !== -1, "My words: empty to start");

  await page.click("#add-word");
  check(await page.inputValue("#we-screen") === "food", "My words: page defaults to the page you were on");
  // Saving with no word is refused.
  await page.click("#we-save");
  check((await page.textContent("#we-message")).length > 0 && await page.isVisible("#word-editor"), "My words: empty word refused");
  // Typing works.
  await page.fill("#we-label", "pizza");
  check(await page.inputValue("#we-label") === "pizza", "My words: typing into the word box works");
  await page.click("#we-cancel");

  // Make a photo to upload (a screenshot of a symbol).
  await page.goto(BASE + "images/apple.svg");
  const photo = { name: "photo.png", mimeType: "image/png", buffer: await page.screenshot() };
  await page.goto(BASE);
  await goToScreen(page, "food");
  await openSettings(page);

  await addWord("pizza", { colour: "green", symbol: "sandwich.svg" });
  await addWord("pasta", { colour: "orange", photo, speak: "pasta please" });
  await addWord("rice", { colour: "green" });
  check(await page.isHidden("#word-editor"), "My words: editor closes after saving");
  const rows = await page.$$eval(".my-word-row", (r) => r.map((x) => x.querySelector(".info").firstChild.textContent));
  check(JSON.stringify(rows) === '["pizza","pasta","rice"]', "My words: list shows added words in order (" + rows + ")");
  await page.screenshot({ path: path.join(SHOTS, "my-words-list.png") });
  await page.click("#close-settings");

  // Food now: 6 built-in + pizza, pasta on page 1; rice on page 2.
  const ids = await page.$$eval("#grid > *", (els) => els.map((e) => e.dataset.word || null));
  check(ids[6] && ids[6].indexOf("custom_") === 0 && ids[7] && ids[7].indexOf("custom_") === 0, "My words: new words fill the next spaces");
  check(await page.$eval("#next", (e) => getComputedStyle(e).visibility) === "visible", "My words: full page shows next arrow");
  await page.screenshot({ path: path.join(SHOTS, "my-words-on-food.png") });
  const label = (i) => page.$eval("#grid > :nth-child(" + (i + 1) + ") .label", (e) => e.textContent);
  check(await label(6) === "pizza" && await label(7) === "pasta", "My words: pizza and pasta in places 7 and 8");
  const pastaImg = await page.$eval("#grid > :nth-child(8) img", (i) => ({ src: i.src.slice(0, 14), ok: i.naturalWidth > 0 }));
  check(pastaImg.src === "data:image/jpe" && pastaImg.ok, "My words: photo shown on button");
  const pizzaBg = await page.$eval("#grid > :nth-child(7)", (e) => getComputedStyle(e).backgroundColor);
  check(pizzaBg === hexToRgb(BOARD.colours.green.background), "My words: chosen colour used");

  // Pressing an added word speaks it, joins, stays.
  await page.click("#clear");
  await page.click("#grid > :nth-child(8)");
  check((await lastSpoken(page)).text === "pasta please", "My words: 'say it as' is spoken");
  check((await sentenceOf(page)).length === 1 && await screenOf(page) === "food", "My words: joins sentence and stays on page");
  await page.click("#next");
  check(await label(0) === "rice", "My words: third word on page 2");
  await page.click("#prev");

  // Kept after reload.
  await page.reload();
  await goToScreen(page, "food");
  check(await label(6) === "pizza" && await label(7) === "pasta", "My words: kept after reload");

  // Change pizza's word, delete pasta (needs two presses), sentence loses pasta.
  await page.click("#grid > :nth-child(8)");
  await openSettings(page);
  await page.click('.my-word-row:nth-child(1) [data-edit]');
  check(await page.inputValue("#we-label") === "pizza", "My words: Change opens the word");
  await page.fill("#we-label", "pizza slice");
  await page.click("#we-save");
  await page.click('.my-word-row:nth-child(2) [data-edit]');
  await page.click("#we-delete");
  check(await page.isVisible("#word-editor") && (await page.textContent("#we-delete")).indexOf("again") !== -1, "My words: delete asks for a second press");
  await page.click("#we-delete");
  await page.click("#close-settings");
  check(await label(6) === "pizza slice", "My words: changed word shown");
  const after = await page.$$eval("#grid > *", (els) => els.map((e) => e.className));
  check(after[7] === "empty-slot", "My words: deleted word leaves an empty space (nothing moves)");
  check((await sentenceOf(page)).length === 0, "My words: deleted word removed from sentence");
  await page.click("#next");
  check(await label(0) === "rice", "My words: rice did not move after delete");
  await page.click("#prev");

  // A new word fills the gap.
  await openSettings(page);
  await addWord("chips", { colour: "green" });
  await page.click("#close-settings");
  check(await label(7) === "chips", "My words: new word fills the empty space");

  // Move rice to the feel page.
  await openSettings(page);
  const riceRow = await page.$$eval(".my-word-row", (r) => r.findIndex((x) => x.textContent.indexOf("rice") === 0));
  await page.click(".my-word-row:nth-child(" + (riceRow + 1) + ") [data-edit]");
  await page.selectOption("#we-screen", "feel");
  await page.click("#we-save");
  await page.click("#close-settings");
  check(await page.$eval("#next", (e) => getComputedStyle(e).visibility) === "hidden", "My words: Food back to one page after moving rice");
  await goToScreen(page, "feel");
  check(await label(6) === "rice", "My words: rice moved to feel page");

  // Built-in words untouched; adding words did not change grid count.
  check((await page.$$("#grid > *")).length === 8, "My words: grid still 8 spaces");
  check(errors.length === 0, "My words: no page errors (" + errors.join("; ") + ")");
  await page.screenshot({ path: path.join(SHOTS, "my-words-feel.png") });

  // Editor screenshot with symbol picker open.
  await openSettings(page);
  await page.click("#add-word");
  await page.click("#we-pick-symbol");
  await page.screenshot({ path: path.join(SHOTS, "word-editor.png") });
  await context.close();
}

// ---------- TEST 9: mute ----------
async function testMute(browser) {
  const { page, context, errors } = await newPage(browser, VIEWPORTS[0], { pressDelayMs: 0 });
  check(await page.isHidden("#mute-indicator"), "Mute: 'Sound off' hidden when speech is on");
  await openSettings(page);
  check(await page.getAttribute('[data-muted="false"]', "aria-pressed") === "true", "Mute: speech on by default");
  await page.click('[data-muted="true"]');
  const before = await speakCount(page);
  await page.click("#test-voice");
  check(await speakCount(page) === before + 1, "Mute: Test voice still plays for staff");
  await page.click("#close-settings");
  check(await page.isVisible("#mute-indicator"), "Mute: 'Sound off' shown on the board");
  await page.screenshot({ path: path.join(SHOTS, "muted.png") });

  const quiet = await speakCount(page);
  await page.click('#grid [data-word="i"]');
  await page.click('#grid [data-word="want"]');
  await page.click('#fixed-bar [data-word="yes"]');
  await page.click("#strip");
  check(await speakCount(page) === quiet, "Mute: words, fixed keys and strip make no sound");
  check(JSON.stringify(await sentenceOf(page)) === '["i","want","yes"]', "Mute: words still join the sentence");
  check(await screenOf(page) === "want", "Mute: pages still open");

  await page.reload();
  check(await page.isVisible("#mute-indicator"), "Mute: still muted after reload");
  await page.click('#grid [data-word="i"]');
  check(await speakCount(page) === 0, "Mute: silent after reload");

  await openSettings(page);
  await page.click('[data-muted="false"]');
  await page.click("#close-settings");
  check(await page.isHidden("#mute-indicator"), "Mute: 'Sound off' hidden after unmuting");
  await page.click('#grid [data-word="want"]');
  check((await lastSpoken(page)).text === "want", "Mute: speech back after unmuting");
  check(errors.length === 0, "Mute: no page errors (" + errors.join("; ") + ")");
  await context.close();
}

// ---------- run ----------
let BASE;
(async () => {
  const server = await startServer();
  BASE = "http://127.0.0.1:" + server.address().port + "/";
  const browser = await chromium.launch();
  try {
    for (const vp of VIEWPORTS) for (const g of GRID_SIZES) await testEveryButton(browser, vp, g);
    await testDoublePress(browser);
    await testStaffSettings(browser);
    await testPaging(browser);
    await testCalmAndPrivate(browser);
    await testLongSentence(browser);
    await testStaffTouch(browser);
    await testMyWords(browser);
    await testMute(browser);
  } catch (e) {
    failures.push("Test crashed: " + e.stack);
  }
  await browser.close();
  server.close();
  console.log("\nPassed checks: " + passed);
  console.log("Failed checks: " + failures.length);
  failures.slice(0, 60).forEach((f) => console.log("  FAIL: " + f));
  process.exit(failures.length ? 1 : 0);
})();
