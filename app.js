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
    hiddenFixedKeys: []
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

  function speak(text) {
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
      img.src = (board.imageFolder || "images/") + word.image;
      img.onerror = () => img.remove(); // missing file: keep the empty space
      box.appendChild(img);
    }
    return box;
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

  $("home").addEventListener("click", () => {
    if (!acceptPress()) return;
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
  const staffBtn = $("staff");
  let holdTimer = null;
  function cancelHold() { clearTimeout(holdTimer); holdTimer = null; }
  staffBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    cancelHold();
    holdTimer = setTimeout(() => { holdTimer = null; openAdultCheck(); }, LONG_PRESS_MS);
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach((ev) => staffBtn.addEventListener(ev, cancelHold));
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
    fillVoiceList();
    $("rate").value = String(settings.rate);
    $("rate-value").textContent = settings.rate.toFixed(2);
    $("delay").value = String(settings.pressDelayMs);
    $("delay-value").textContent = (settings.pressDelayMs / 1000).toFixed(2) + " seconds";
    fillFixedToggles();
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

  $("test-voice").addEventListener("click", () => speak("This is how I will sound."));

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
    fillSettings();
  });

  $("close-settings").addEventListener("click", closeSettings);

  // ---------- Stop iPad zoom / scroll bounce ----------
  document.addEventListener("gesturestart", (e) => e.preventDefault());
  document.addEventListener("dblclick", (e) => e.preventDefault());
  document.addEventListener("touchmove", (e) => {
    if (!e.target.closest(".modal")) e.preventDefault();
  }, { passive: false });

  // ---------- Start ----------
  drawGrid();
  drawStrip();
  drawFixedBar();
})();
