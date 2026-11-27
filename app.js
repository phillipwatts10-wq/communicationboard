/* ============================================================
   COMMUNICATION BOARD – BEHAVIOUR
   You should not need to edit this file to change words,
   colours or layers. Those are all in data/board.js.
   ============================================================ */
(function () {
  "use strict";

  // ---------- Fixed rules ----------
  const LONG_PRESS_MS = 3000;       // hold the Staff button this long
  const MAX_SENTENCE_WORDS = 12;    // strip stops adding words after this (2 rows of 6)
  const STORAGE_PREFIX = "commboard.settings.";
  const BUILT_IN_DEFAULTS = {
    gridSize: 8,
    rate: 0.8,
    voiceURI: "",
    pressDelayMs: 1000,
    hiddenFixedKeys: [],
    muted: false
  };

  const $ = (id) => document.getElementById(id);

  // ---------- Load and check the data file ----------
  const data = window.COMMUNICATION_DATA;
  if (!data || !data.boards) {
    showProblem(["The data file (data/board.js) could not be read.",
      "Check it for a missing comma, quote mark or bracket."]);
    return;
  }
  const board = data.boards[data.activeBoardId];
  if (!board) {
    showProblem(["activeBoardId \"" + data.activeBoardId + "\" does not match any board in data/board.js."]);
    return;
  }
  const problems = checkBoard(board);
  if (problems.length) {
    showProblem(problems);
    return;
  }

  // ---------- Staff-added words (saved on this iPad only) ----------
  // Stored separately from data/board.js. Each page keeps a list of
  // added words after its built-in words. A deleted word leaves an
  // empty space (null) so nothing else moves; the next new word on
  // that page fills the first empty space.
  const customKey = "commboard.custom." + board.id;
  const baseSlots = {};
  Object.keys(board.screens).forEach((sid) => { baseSlots[sid] = board.screens[sid].slots.slice(); });
  let custom = loadCustom();
  applyCustom();

  function loadCustom() {
    let c = null;
    try { c = JSON.parse(localStorage.getItem(customKey)); } catch (e) { c = null; }
    if (!c || typeof c !== "object") c = {};
    if (!c.words || typeof c.words !== "object") c.words = {};
    if (!c.slots || typeof c.slots !== "object") c.slots = {};
    return c;
  }

  function saveCustom() {
    try {
      localStorage.setItem(customKey, JSON.stringify(custom));
    } catch (e) {
      return false; // storage full or blocked
    }
    // Ask Safari to keep this data (it may otherwise clear it after weeks unused).
    try {
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    } catch (e) { /* not supported */ }
    return true;
  }

  function applyCustom() {
    Object.keys(board.words).forEach((id) => { if (board.words[id].custom) delete board.words[id]; });
    Object.keys(custom.words).forEach((id) => {
      const w = custom.words[id];
      if (!w || !w.label) return;
      board.words[id] = {
        label: String(w.label),
        speak: w.speak ? String(w.speak) : "",
        colour: board.colours[w.colour] ? w.colour : "white",
        image: w.image ? String(w.image) : "",
        custom: true
      };
    });
    Object.keys(board.screens).forEach((sid) => {
      const extra = (custom.slots[sid] || []).map((id) => (id && board.words[id] ? id : null));
      while (extra.length && extra[extra.length - 1] === null) extra.pop();
      board.screens[sid].slots = baseSlots[sid].concat(extra);
    });
  }

  function placeWord(id, sid) {
    const list = custom.slots[sid] || (custom.slots[sid] = []);
    const gap = list.indexOf(null);
    if (gap !== -1) list[gap] = id;
    else list.push(id);
  }

  function unplaceWord(id) {
    Object.keys(custom.slots).forEach((sid) => {
      const list = custom.slots[sid];
      const i = list.indexOf(id);
      if (i !== -1) list[i] = null;
      while (list.length && list[list.length - 1] === null) list.pop();
    });
  }

  function pageOfCustom(id) {
    return Object.keys(custom.slots).find((sid) => custom.slots[sid].indexOf(id) !== -1) || null;
  }

  function checkBoard(b) {
    const out = [];
    const words = b.words || {};
    const screens = b.screens || {};
    const colours = b.colours || {};
    if (!screens[b.homeScreen]) out.push("homeScreen \"" + b.homeScreen + "\" is not a screen.");
    Object.keys(screens).forEach((sid) => {
      (screens[sid].slots || []).forEach((wid) => {
        if (wid !== null && !words[wid]) out.push("Screen \"" + sid + "\" uses word \"" + wid + "\", which is not in words.");
      });
    });
    Object.keys(words).forEach((wid) => {
      const w = words[wid];
      if (!w.label) out.push("Word \"" + wid + "\" has no label.");
      if (!colours[w.colour]) out.push("Word \"" + wid + "\" uses colour \"" + w.colour + "\", which is not in colours.");
      if (w.opens && !screens[w.opens]) out.push("Word \"" + wid + "\" opens \"" + w.opens + "\", which is not a screen.");
      if (w.type === "category" && !w.opens) out.push("Category \"" + wid + "\" needs an opens screen.");
    });
    (b.fixedBar || []).forEach((wid) => {
      if (!words[wid]) out.push("fixedBar uses word \"" + wid + "\", which is not in words.");
    });
    return out;
  }

  function showProblem(lines) {
    document.body.innerHTML = "";
    const box = document.createElement("div");
    box.className = "fatal";
    box.textContent = "There is a problem in the data file:\n\n" + lines.join("\n");
    document.body.appendChild(box);
  }

  // ---------- Settings (saved on this iPad only) ----------
  const storageKey = STORAGE_PREFIX + board.id;
  let settings = loadSettings();

  function defaults() {
    return Object.assign({}, BUILT_IN_DEFAULTS, board.defaultSettings || {});
  }

  function loadSettings() {
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(storageKey)) || {};
    } catch (e) {
      saved = {};
    }
    return tidySettings(Object.assign(defaults(), saved));
  }

  function tidySettings(s) {
    s.gridSize = Number(s.gridSize) === 12 ? 12 : 8;
    s.rate = clamp(Number(s.rate) || 0.8, 0.5, 1.5);
    s.pressDelayMs = clamp(Number(s.pressDelayMs), 0, 3000);
    if (isNaN(s.pressDelayMs)) s.pressDelayMs = 1000;
    if (!Array.isArray(s.hiddenFixedKeys)) s.hiddenFixedKeys = [];
    if (typeof s.voiceURI !== "string") s.voiceURI = "";
    s.muted = s.muted === true;
    return s;
  }

  function saveSettings() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(settings));
    } catch (e) {
      // Storage blocked (e.g. private browsing). Settings last until reload.
    }
  }

  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

  // ---------- Board state ----------
  const state = {
    screen: board.homeScreen,
    page: 0,
    sentence: []   // list of word ids
  };

  // ---------- Double-press protection ----------
  let lastAcceptedPress = -Infinity;
  function acceptPress() {
    const now = performance.now();
    if (now - lastAcceptedPress < settings.pressDelayMs) return false;
    lastAcceptedPress = now;
    return true;
  }

  // ---------- Speech ----------
  const synth = window.speechSynthesis || null;
  let voices = [];

  function refreshVoices() {
    voices = synth ? (synth.getVoices() || []) : [];
    if (!$("settings").hidden) fillVoiceList();
  }
  if (synth) {
    refreshVoices();
    if (typeof synth.addEventListener === "function") {
      synth.addEventListener("voiceschanged", refreshVoices);
    } else {
      synth.onvoiceschanged = refreshVoices;
    }
  }

  function isBritish(v) { return /^en[-_]gb/i.test(v.lang || ""); }
  function isEnglish(v) { return /^en/i.test(v.lang || ""); }

  function chooseVoice() {
    if (!voices.length) refreshVoices();
    if (settings.voiceURI) {
      const chosen = voices.find((v) => v.voiceURI === settings.voiceURI);
      if (chosen) return chosen;
    }
    return voices.find((v) => isBritish(v) && v.localService) ||
      voices.find(isBritish) ||
      voices.find(isEnglish) ||
      null;
  }

  function stopSpeech() {
    if (synth) synth.cancel();
  }

  // Board presses use speak(). When staff have muted speech, the board is
  // silent. Staff test buttons use speakAlways() so the voice can be checked.
  function speak(text) {
    if (settings.muted) {
      stopSpeech();
      return;
    }
    speakAlways(text);
  }

  function speakAlways(text) {
    if (!synth || !text) return;
    stopSpeech(); // a new press stops earlier speech
    const u = new SpeechSynthesisUtterance(text);
    const v = chooseVoice();
    u.lang = v ? v.lang : "en-GB";
    if (v) u.voice = v;
    u.rate = settings.rate;
    u.pitch = 1;
    u.volume = 1;
    synth.speak(u);
  }

  function spokenText(wordId) {
    const w = board.words[wordId];
    return w.speak || w.label;
  }

  // ---------- Building buttons ----------
  function paint(node, colourName) {
    const c = board.colours[colourName] || board.colours.white;
    node.style.backgroundColor = c.background;
    node.style.color = c.text;
    node.style.borderColor = c.border;
  }

  function makeSymbol(word) {
    const box = document.createElement("span");
    box.className = "symbol";
    box.setAttribute("aria-hidden", "true");
    if (board.showImages && word.image) {
      const img = document.createElement("img");
      img.alt = "";
      img.draggable = false;
      img.src = imageSrc(word.image);
      img.onerror = () => img.remove(); // missing file: keep the empty space
      box.appendChild(img);
    }
    return box;
  }

  // Photos added by staff are stored as data (they start "data:");
  // built-in symbols are file names in the images folder.
  function imageSrc(image) {
    return image.indexOf("data:") === 0 ? image : (board.imageFolder || "images/") + image;
  }

  function makeLabel(word) {
    const label = document.createElement("span");
    label.className = "label";
    label.textContent = word.label;
    return label;
  }

  function makeWordButton(wordId, extraClass) {
    const word = board.words[wordId];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "word-btn" + (extraClass ? " " + extraClass : "");
    btn.dataset.word = wordId;
    btn.dataset.kind = word.type === "category" ? "category" : "word";
    if (word.label.length > 8) btn.classList.add("long-label");
    paint(btn, word.colour);
    btn.appendChild(makeSymbol(word));
    btn.appendChild(makeLabel(word));
    return btn;
  }

  // ---------- Drawing the screen ----------
  const gridEl = $("grid");
  const stripWordsEl = $("strip-words");
  const fixedBarEl = $("fixed-bar");

  function pageCount() {
    const slots = board.screens[state.screen].slots;
    return Math.max(1, Math.ceil(slots.length / settings.gridSize));
  }

  function drawGrid() {
    const slots = board.screens[state.screen].slots;
    const size = settings.gridSize;
    const pages = pageCount();
    if (state.page > pages - 1) state.page = pages - 1;
    if (state.page < 0) state.page = 0;

    gridEl.className = "grid size-" + size;
    gridEl.dataset.screen = state.screen;
    gridEl.dataset.page = String(state.page);
    gridEl.replaceChildren();

    const start = state.page * size;
    for (let i = 0; i < size; i++) {
      const wid = slots[start + i];
      if (wid) {
        gridEl.appendChild(makeWordButton(wid));
      } else {
        const empty = document.createElement("div");
        empty.className = "empty-slot";
        gridEl.appendChild(empty);
      }
    }

    setArrow($("prev"), state.page > 0);
    setArrow($("next"), state.page < pages - 1);
  }

  function setArrow(btn, show) {
    // Hidden arrows keep their space so nothing moves.
    btn.style.visibility = show ? "visible" : "hidden";
    btn.disabled = !show;
  }

  function drawStrip() {
    stripWordsEl.replaceChildren();
    state.sentence.forEach((wid) => {
      const word = board.words[wid];
      const card = document.createElement("span");
      card.className = "strip-card";
      card.dataset.word = wid;
      paint(card, word.colour);
      card.appendChild(makeSymbol(word));
      card.appendChild(makeLabel(word));
      stripWordsEl.appendChild(card);
    });
    stripWordsEl.classList.toggle("two-rows", state.sentence.length > 6);
  }

  function drawFixedBar() {
    fixedBarEl.replaceChildren();
    (board.fixedBar || []).forEach((wid) => {
      const btn = makeWordButton(wid, "fixed-key");
      const hidden = settings.hiddenFixedKeys.indexOf(wid) !== -1;
      if (hidden) {
        btn.classList.add("is-hidden"); // keeps its space so others don't move
        btn.disabled = true;
        btn.setAttribute("aria-hidden", "true");
      }
      fixedBarEl.appendChild(btn);
    });
  }

  // ---------- What presses do ----------
  function goTo(screenId) {
    state.screen = screenId;
    state.page = 0;
    drawGrid();
  }

  function addToSentence(wordId) {
    if (state.sentence.length >= MAX_SENTENCE_WORDS) return;
    state.sentence.push(wordId);
    drawStrip();
  }

  function pressWord(wordId, inFixedBar) {
    const word = board.words[wordId];
    if (word.type === "category") {
      goTo(word.opens);              // categories only navigate
      return;
    }
    speak(spokenText(wordId));
    addToSentence(wordId);
    if (!inFixedBar && word.opens) goTo(word.opens);
    // Final words and fixed keys: stay on the same screen.
  }

  gridEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-word]");
    if (!btn || !acceptPress()) return;
    pressWord(btn.dataset.word, false);
  });

  fixedBarEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-word]");
    if (!btn || btn.disabled || !acceptPress()) return;
    pressWord(btn.dataset.word, true);
  });

  $("strip").addEventListener("click", () => {
    if (!acceptPress() || !state.sentence.length) return;
    speak(state.sentence.map(spokenText).join(" "));
  });

  $("delete-last").addEventListener("click", () => {
    if (!acceptPress()) return;
    state.sentence.pop();
    drawStrip();
  });

  $("clear").addEventListener("click", () => {
    if (!acceptPress()) return;
    stopSpeech();
    state.sentence = [];
    drawStrip();
  });

  // Home goes to the first screen and clears the sentence strip.
  // (Speech already playing is allowed to finish.)
  $("home").addEventListener("click", () => {
    if (!acceptPress()) return;
    state.sentence = [];
    drawStrip();
    goTo(board.homeScreen);
  });

  $("prev").addEventListener("click", () => {
    if (!acceptPress() || state.page <= 0) return;
    state.page -= 1;
    drawGrid();
  });

  $("next").addEventListener("click", () => {
    if (!acceptPress() || state.page >= pageCount() - 1) return;
    state.page += 1;
    drawGrid();
  });

  // ---------- Staff button: long press ----------
  // Uses touch events on iPad (more reliable than pointer events, which
  // Safari cancels if the finger moves slightly) and mouse events elsewhere.
  const staffBtn = $("staff");
  const STAFF_LABEL = staffBtn.textContent;
  const MOVE_LIMIT = 40; // pixels the finger may drift while holding
  let holdTimer = null;
  let holdStart = null;

  function startHold(x, y) {
    cancelHold();
    holdStart = { x, y };
    staffBtn.textContent = "Keep holding…";
    staffBtn.classList.add("holding");
    holdTimer = setTimeout(() => {
      cancelHold();
      openAdultCheck();
    }, LONG_PRESS_MS);
  }
  function moveHold(x, y) {
    if (!holdStart) return;
    if (Math.abs(x - holdStart.x) > MOVE_LIMIT || Math.abs(y - holdStart.y) > MOVE_LIMIT) cancelHold();
  }
  function cancelHold() {
    clearTimeout(holdTimer);
    holdTimer = null;
    holdStart = null;
    staffBtn.textContent = STAFF_LABEL;
    staffBtn.classList.remove("holding");
  }

  staffBtn.addEventListener("touchstart", (e) => {
    e.preventDefault(); // stops Safari's copy/select pop-up and mouse emulation
    const t = e.changedTouches[0];
    startHold(t.clientX, t.clientY);
  }, { passive: false });
  staffBtn.addEventListener("touchmove", (e) => {
    const t = e.changedTouches[0];
    moveHold(t.clientX, t.clientY);
  }, { passive: true });
  staffBtn.addEventListener("touchend", cancelHold);
  staffBtn.addEventListener("touchcancel", cancelHold);

  staffBtn.addEventListener("mousedown", (e) => startHold(e.clientX, e.clientY));
  staffBtn.addEventListener("mousemove", (e) => moveHold(e.clientX, e.clientY));
  staffBtn.addEventListener("mouseup", cancelHold);
  staffBtn.addEventListener("mouseleave", cancelHold);
  staffBtn.addEventListener("contextmenu", (e) => e.preventDefault());

  // ---------- Adult check (a simple sum, NOT security) ----------
  const check = { answer: 0, entry: "" };

  function newSum() {
    const a = 2 + Math.floor(Math.random() * 8); // 2–9
    const b = 2 + Math.floor(Math.random() * 8);
    check.answer = a + b;
    check.entry = "";
    $("adult-question").textContent = "What is " + a + " + " + b + "?";
    $("adult-entry").textContent = "";
  }

  function openAdultCheck() {
    newSum();
    $("adult-message").textContent = "";
    $("adult-check").hidden = false;
  }

  function closeAdultCheck() { $("adult-check").hidden = true; }

  $("keypad").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-key]");
    if (!btn) return;
    const key = btn.dataset.key;
    if (key === "del") {
      check.entry = check.entry.slice(0, -1);
    } else if (key === "ok") {
      if (check.entry !== "" && Number(check.entry) === check.answer) {
        closeAdultCheck();
        openSettings();
        return;
      }
      $("adult-message").textContent = "Not quite. Try this one.";
      newSum();
      return;
    } else if (check.entry.length < 2) {
      check.entry += key;
    }
    $("adult-entry").textContent = check.entry;
  });

  $("adult-cancel").addEventListener("click", closeAdultCheck);

  // ---------- Staff settings ----------
  function openSettings() {
    refreshVoices();
    fillSettings();
    $("settings").hidden = false;
  }

  function closeSettings() {
    $("settings").hidden = true;
    // Stop the board treating the "Done" tap as a board press.
    lastAcceptedPress = performance.now();
  }

  function fillSettings() {
    document.querySelectorAll("[data-grid]").forEach((b) => {
      b.setAttribute("aria-pressed", String(Number(b.dataset.grid) === settings.gridSize));
    });
    document.querySelectorAll("[data-muted]").forEach((b) => {
      b.setAttribute("aria-pressed", String((b.dataset.muted === "true") === settings.muted));
    });
    fillVoiceList();
    $("rate").value = String(settings.rate);
    $("rate-value").textContent = settings.rate.toFixed(2);
    $("delay").value = String(settings.pressDelayMs);
    $("delay-value").textContent = (settings.pressDelayMs / 1000).toFixed(2) + " seconds";
    fillFixedToggles();
    drawMyWords();
  }

  function fillVoiceList() {
    const sel = $("voice-select");
    sel.replaceChildren();
    const auto = document.createElement("option");
    auto.value = "";
    auto.textContent = "Automatic (British English if available)";
    sel.appendChild(auto);
    const english = voices.filter(isEnglish);
    const sorted = english.filter(isBritish).concat(english.filter((v) => !isBritish(v)));
    sorted.forEach((v) => {
      const o = document.createElement("option");
      o.value = v.voiceURI;
      o.textContent = v.name + " (" + v.lang + ")";
      sel.appendChild(o);
    });
    if (!voices.length) {
      const o = document.createElement("option");
      o.disabled = true;
      o.textContent = "No voices found on this device yet";
      sel.appendChild(o);
    }
    sel.value = sorted.some((v) => v.voiceURI === settings.voiceURI) ? settings.voiceURI : "";
  }

  function fillFixedToggles() {
    const box = $("fixed-toggles");
    box.replaceChildren();
    (board.fixedBar || []).forEach((wid) => {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.toggle = wid;
      const shown = settings.hiddenFixedKeys.indexOf(wid) === -1;
      b.textContent = board.words[wid].label + (shown ? ": shown" : ": hidden");
      b.setAttribute("aria-pressed", String(shown));
      box.appendChild(b);
    });
  }

  document.querySelectorAll("[data-grid]").forEach((b) => {
    b.addEventListener("click", () => {
      settings.gridSize = Number(b.dataset.grid);
      saveSettings();
      state.page = 0;
      drawGrid();
      fillSettings();
    });
  });

  document.querySelectorAll("[data-muted]").forEach((b) => {
    b.addEventListener("click", () => {
      settings.muted = b.dataset.muted === "true";
      if (settings.muted) stopSpeech();
      saveSettings();
      drawMuteIndicator();
      fillSettings();
    });
  });

  function drawMuteIndicator() {
    $("mute-indicator").hidden = !settings.muted;
  }

  $("voice-select").addEventListener("change", (e) => {
    settings.voiceURI = e.target.value;
    saveSettings();
  });

  $("rate").addEventListener("input", (e) => {
    settings.rate = clamp(Number(e.target.value), 0.5, 1.5);
    $("rate-value").textContent = settings.rate.toFixed(2);
    saveSettings();
  });

  $("delay").addEventListener("input", (e) => {
    settings.pressDelayMs = clamp(Number(e.target.value), 0, 3000);
    $("delay-value").textContent = (settings.pressDelayMs / 1000).toFixed(2) + " seconds";
    saveSettings();
  });

  $("test-voice").addEventListener("click", () => speakAlways("This is how I will sound."));

  $("fixed-toggles").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-toggle]");
    if (!b) return;
    const wid = b.dataset.toggle;
    const i = settings.hiddenFixedKeys.indexOf(wid);
    if (i === -1) settings.hiddenFixedKeys.push(wid);
    else settings.hiddenFixedKeys.splice(i, 1);
    saveSettings();
    drawFixedBar();
    fillFixedToggles();
  });

  $("reset-settings").addEventListener("click", () => {
    settings = tidySettings(defaults());
    saveSettings();
    state.page = 0;
    drawGrid();
    drawFixedBar();
    drawMuteIndicator();
    fillSettings();
  });

  $("close-settings").addEventListener("click", closeSettings);

  // ---------- My words: list ----------
  function drawMyWords() {
    const box = $("my-words");
    box.replaceChildren();
    const ids = Object.keys(custom.words);
    if (!ids.length) {
      const p = document.createElement("p");
      p.className = "hint";
      p.textContent = "No words added yet.";
      box.appendChild(p);
      return;
    }
    // Order: by page (board order), then position on the page.
    const screenOrder = Object.keys(board.screens);
    const rank = (id) => {
      const sid = pageOfCustom(id);
      return sid ? screenOrder.indexOf(sid) * 1000 + custom.slots[sid].indexOf(id) : 1e9;
    };
    ids.sort((a, b) => rank(a) - rank(b)).forEach((id) => {
      const w = board.words[id];
      if (!w) return;
      const row = document.createElement("div");
      row.className = "my-word-row";
      row.dataset.word = id;
      const sym = makeSymbol(w);
      paint(sym, w.colour);
      sym.style.backgroundColor = "#fff";
      const info = document.createElement("div");
      info.className = "info";
      info.textContent = w.label;
      const small = document.createElement("small");
      const sid = pageOfCustom(id);
      small.textContent = "Page: " + (sid ? board.screens[sid].title : "none");
      info.appendChild(small);
      const edit = document.createElement("button");
      edit.type = "button";
      edit.dataset.edit = id;
      edit.textContent = "Change";
      row.append(sym, info, edit);
      box.appendChild(row);
    });
  }

  $("add-word").addEventListener("click", () => openEditor(null));
  $("my-words").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-edit]");
    if (b) openEditor(b.dataset.edit);
  });

  // ---------- My words: add / change / delete ----------
  const editor = { id: null, colour: "white", image: "", deleteArmed: false };

  function openEditor(id) {
    const w = id ? custom.words[id] : null;
    editor.id = id;
    editor.colour = w && board.colours[w.colour] ? w.colour : "white";
    editor.image = w && w.image ? w.image : "";
    editor.deleteArmed = false;
    $("we-title").textContent = id ? "Change a word" : "Add a word";
    $("we-label").value = w ? w.label : "";
    $("we-speak").value = w && w.speak ? w.speak : "";
    $("we-message").textContent = "";
    $("we-delete").hidden = !id;
    $("we-delete").textContent = "Delete word";
    $("we-symbols").hidden = true;

    const sel = $("we-screen");
    sel.replaceChildren();
    Object.keys(board.screens).forEach((sid) => {
      const o = document.createElement("option");
      o.value = sid;
      o.textContent = board.screens[sid].title + " page";
      sel.appendChild(o);
    });
    sel.value = (id && pageOfCustom(id)) || state.screen;

    drawSwatches();
    drawPreview();
    $("word-editor").hidden = false;
  }

  function closeEditor() {
    $("word-editor").hidden = true;
    $("we-photo").value = "";
  }

  function drawSwatches() {
    const box = $("we-colours");
    box.replaceChildren();
    Object.keys(board.colours).forEach((name) => {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.colour = name;
      b.textContent = name;
      paint(b, name);
      b.setAttribute("aria-pressed", String(name === editor.colour));
      box.appendChild(b);
    });
  }

  function drawPreview() {
    const box = $("we-preview");
    box.replaceChildren();
    if (editor.image) {
      const img = document.createElement("img");
      img.alt = "Chosen picture";
      img.src = imageSrc(editor.image);
      box.appendChild(img);
    } else {
      box.textContent = "No picture";
    }
  }

  function drawSymbolPicker() {
    const box = $("we-symbols");
    box.replaceChildren();
    const seen = {};
    Object.keys(board.words)
      .filter((id) => !board.words[id].custom && board.words[id].image)
      .sort((a, b) => board.words[a].label.localeCompare(board.words[b].label))
      .forEach((id) => {
        const file = board.words[id].image;
        if (seen[file]) return;
        seen[file] = true;
        const b = document.createElement("button");
        b.type = "button";
        b.dataset.symbol = file;
        b.setAttribute("aria-label", board.words[id].label);
        const img = document.createElement("img");
        img.alt = "";
        img.src = imageSrc(file);
        b.appendChild(img);
        box.appendChild(b);
      });
  }

  // Shrinks a photo so it fits easily in the iPad's storage.
  function shrinkPhoto(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const max = 320;
        const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(1, Math.round(img.naturalWidth * scale));
        const h = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("bad image")); };
      img.src = url;
    });
  }

  $("we-colours").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-colour]");
    if (!b) return;
    editor.colour = b.dataset.colour;
    drawSwatches();
  });

  $("we-photo").addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    $("we-message").textContent = "";
    shrinkPhoto(file).then((dataUrl) => {
      editor.image = dataUrl;
      $("we-symbols").hidden = true;
      drawPreview();
    }).catch(() => {
      $("we-message").textContent = "That photo could not be used. Please try another.";
    });
  });

  $("we-pick-symbol").addEventListener("click", () => {
    const box = $("we-symbols");
    if (box.hidden) drawSymbolPicker();
    box.hidden = !box.hidden;
  });

  $("we-symbols").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-symbol]");
    if (!b) return;
    editor.image = b.dataset.symbol;
    $("we-symbols").hidden = true;
    drawPreview();
  });

  $("we-no-picture").addEventListener("click", () => {
    editor.image = "";
    $("we-symbols").hidden = true;
    drawPreview();
  });

  $("we-listen").addEventListener("click", () => {
    speakAlways($("we-speak").value.trim() || $("we-label").value.trim());
  });

  $("we-save").addEventListener("click", () => {
    const label = $("we-label").value.trim();
    if (!label) {
      $("we-message").textContent = "Please type the word for the button.";
      return;
    }
    const sid = $("we-screen").value;
    const record = { label, speak: $("we-speak").value.trim(), colour: editor.colour, image: editor.image };
    const before = JSON.stringify(custom);
    let id = editor.id;
    if (!id) {
      id = "custom_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      custom.words[id] = record;
      placeWord(id, sid);
    } else {
      custom.words[id] = record;
      if (pageOfCustom(id) !== sid) {
        unplaceWord(id);
        placeWord(id, sid);
      }
    }
    if (!saveCustom()) {
      custom = JSON.parse(before);
      $("we-message").textContent = "There is no room to save this on the iPad. Try a different photo, or delete some of your words.";
      return;
    }
    wordsChanged();
    closeEditor();
  });

  $("we-delete").addEventListener("click", () => {
    if (!editor.id) return;
    if (!editor.deleteArmed) {
      editor.deleteArmed = true;
      $("we-delete").textContent = "Press again to delete";
      return;
    }
    delete custom.words[editor.id];
    unplaceWord(editor.id);
    saveCustom();
    wordsChanged();
    closeEditor();
  });

  $("we-cancel").addEventListener("click", closeEditor);

  function wordsChanged() {
    applyCustom();
    // A deleted word cannot stay in the sentence strip.
    state.sentence = state.sentence.filter((id) => board.words[id]);
    drawGrid();
    drawStrip();
    drawMyWords();
  }

  // ---------- Stop iPad zoom / scroll bounce ----------
  document.addEventListener("gesturestart", (e) => e.preventDefault());
  document.addEventListener("dblclick", (e) => e.preventDefault());
  document.addEventListener("touchmove", (e) => {
    if (!e.target.closest(".modal")) e.preventDefault();
  }, { passive: false });

  // ---------- Start ----------
  drawMuteIndicator();
  drawGrid();
  drawStrip();
  drawFixedBar();
})();
