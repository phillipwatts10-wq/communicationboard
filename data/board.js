/*
  ============================================================
  COMMUNICATION BOARD – DATA FILE
  ============================================================
  This is the ONE file that holds all the words, colours,
  layers (screens) and image names. You can edit it in any
  plain text editor. Save the file and reload the page.

  Tips for editing safely:
  - Text goes inside "double quotes".
  - Every line inside a list or group ends with a comma.
  - If something is wrong, the board shows a message telling
    you which word or screen has the problem.

  ------------------------------------------------------------
  HOW IT FITS TOGETHER
  ------------------------------------------------------------
  colours  – each colour is named once. Words use the name.
             Change a colour here and every button using it
             changes.
  words    – every button. Each word has:
               label  : the text shown on the button
               speak  : (optional) what is said, if different
               colour : one of the colour names below
               image  : the symbol file name in the images folder
               type   : "category" for buttons that only open
                        a page (they do not speak or join the
                        sentence). Leave it out for normal words.
               opens  : (optional) the screen to open next
  screens  – every page of the board. "slots" lists the words
             in position order: left to right, top row first.
             Use null for a deliberately empty space.
  fixedBar – the keys along the bottom, in order.

  Words that staff add on the iPad (Staff → My words) are NOT
  stored in this file. They are saved on that iPad only.

  ------------------------------------------------------------
  FUTURE (not built yet)
  ------------------------------------------------------------
  The "organisation" section and "owner" fields are placeholders
  so that School, Class and Student accounts, with one board per
  student, can be added later. They contain NO real student data.
  ============================================================
*/

window.COMMUNICATION_DATA = {
  dataVersion: 1,

  // Placeholder only. No real people.
  organisation: {
    schools: [
      {
        id: "example-school",
        name: "Example School",
        classes: [
          {
            id: "example-class",
            name: "Example Class",
            students: [
              { id: "example-student", displayName: "Example Student", boardId: "example-board" }
            ]
          }
        ]
      }
    ]
  },

  // Which board this iPad shows.
  activeBoardId: "example-board",

  boards: {
    "example-board": {
      id: "example-board",
      name: "Example board",
      owner: { schoolId: "example-school", classId: "example-class", studentId: "example-student" },

      // Symbols are SVG files in the "images" folder (drawn by
      // tools/make-symbols.py). You can replace any file with your own
      // picture – keep the same name, or change the name below.
      // Set showImages to false to show words only.
      showImages: true,
      imageFolder: "images/",

      // The first screen, shown when Home is pressed.
      homeScreen: "home",

      // Starting settings. Staff can change these on the iPad.
      defaultSettings: {
        gridSize: 8,          // 8 or 12 buttons per screen
        rate: 0.8,            // speaking speed (1 is normal)
        voiceURI: "",         // empty = British English if available
        pressDelayMs: 1000,   // double-press protection, in milliseconds
        hiddenFixedKeys: [],  // e.g. ["more"] to hide the "more" key
        muted: false          // true = board starts with speech off
      },

      // ---------- COLOURS ----------
      // background = button colour, text = word colour,
      // border = outline colour. Use #RRGGBB colour codes.
      colours: {
        orange: { background: "#F7A541", text: "#000000", border: "#000000" },
        yellow: { background: "#FFE14D", text: "#000000", border: "#000000" },
        green:  { background: "#8FD18F", text: "#000000", border: "#000000" },
        blue:   { background: "#8DC4F2", text: "#000000", border: "#000000" },
        purple: { background: "#C9A8E8", text: "#000000", border: "#000000" },
        white:  { background: "#FFFFFF", text: "#000000", border: "#000000" }
      },

      // ---------- FIXED BAR ----------
      fixedBar: ["help", "stop", "more", "finished", "yes", "no"],

      // ---------- SCREENS (LAYERS) ----------
      screens: {
        home:       { title: "Home",       slots: ["i"] },
        i:          { title: "I",          slots: ["want", "need", "feel"] },
        want:       { title: "want",       slots: ["food", "drinks", "toys", "games", "activities", "places"] },
        need:       { title: "need",       slots: ["toilet_need", "break", "drink", "quiet"] },
        feel:       { title: "feel",       slots: ["happy", "sad", "angry", "tired", "worried", "calm"] },
        food:       { title: "Food",       slots: ["apple", "banana", "biscuit", "crisps", "sandwich", "yoghurt"] },
        drinks:     { title: "Drinks",     slots: ["water", "juice", "milk", "squash"] },
        toys:       { title: "Toys",       slots: ["ball", "bricks", "cars", "bubbles", "puzzle", "teddy"] },
        games:      { title: "Games",      slots: ["matching_game", "board_game", "ipad_game", "chase"] },
        activities: { title: "Activities", slots: ["music", "painting", "reading", "swinging"] },
        places:     { title: "Places",     slots: ["playground", "garden", "toilet_place", "library", "hall", "home_place"] }
      },

      // ---------- WORDS ----------
      words: {
        // Home
        // speak "eye": the iPad voice reads a lone "I" as "capital I".
        i:    { label: "I", speak: "eye", colour: "orange", image: "i.svg", opens: "i" },

        // Layer after I
        want: { label: "want", colour: "yellow", image: "want.svg", opens: "want" },
        need: { label: "need", colour: "yellow", image: "need.svg", opens: "need" },
        feel: { label: "feel", colour: "yellow", image: "feel.svg", opens: "feel" },

        // Categories (open a page only – do not speak or join)
        food:       { label: "Food",       type: "category", colour: "white", image: "food.svg",       opens: "food" },
        drinks:     { label: "Drinks",     type: "category", colour: "white", image: "drinks.svg",     opens: "drinks" },
        toys:       { label: "Toys",       type: "category", colour: "white", image: "toys.svg",       opens: "toys" },
        games:      { label: "Games",      type: "category", colour: "white", image: "games.svg",      opens: "games" },
        activities: { label: "Activities", type: "category", colour: "white", image: "activities.svg", opens: "activities" },
        places:     { label: "Places",     type: "category", colour: "white", image: "places.svg",     opens: "places" },

        // need
        toilet_need: { label: "toilet", colour: "yellow", image: "toilet.svg" },
        break:       { label: "break",  colour: "yellow", image: "break.svg" },
        drink:       { label: "drink",  colour: "yellow", image: "drink.svg", opens: "drinks" },
        quiet:       { label: "quiet",  colour: "purple", image: "quiet.svg" },

        // feel
        happy:   { label: "happy",   colour: "purple", image: "happy.svg" },
        sad:     { label: "sad",     colour: "purple", image: "sad.svg" },
        angry:   { label: "angry",   colour: "purple", image: "angry.svg" },
        tired:   { label: "tired",   colour: "purple", image: "tired.svg" },
        worried: { label: "worried", colour: "purple", image: "worried.svg" },
        calm:    { label: "calm",    colour: "purple", image: "calm.svg" },

        // Food
        apple:    { label: "apple",    colour: "green", image: "apple.svg" },
        banana:   { label: "banana",   colour: "green", image: "banana.svg" },
        biscuit:  { label: "biscuit",  colour: "green", image: "biscuit.svg" },
        crisps:   { label: "crisps",   colour: "green", image: "crisps.svg" },
        sandwich: { label: "sandwich", colour: "green", image: "sandwich.svg" },
        yoghurt:  { label: "yoghurt",  colour: "green", image: "yoghurt.svg" },

        // Drinks
        water:  { label: "water",  colour: "green", image: "water.svg" },
        juice:  { label: "juice",  colour: "green", image: "juice.svg" },
        milk:   { label: "milk",   colour: "green", image: "milk.svg" },
        squash: { label: "squash", colour: "green", image: "squash.svg" },

        // Toys
        ball:    { label: "ball",    colour: "green", image: "ball.svg" },
        bricks:  { label: "bricks",  colour: "green", image: "bricks.svg" },
        cars:    { label: "cars",    colour: "green", image: "cars.svg" },
        bubbles: { label: "bubbles", colour: "green", image: "bubbles.svg" },
        puzzle:  { label: "puzzle",  colour: "green", image: "puzzle.svg" },
        teddy:   { label: "teddy",   colour: "green", image: "teddy.svg" },

        // Games
        matching_game: { label: "matching game", colour: "green",  image: "matching-game.svg" },
        board_game:    { label: "board game",    colour: "green",  image: "board-game.svg" },
        ipad_game:     { label: "iPad game",     colour: "green",  image: "ipad-game.svg" },
        chase:         { label: "chase",         colour: "yellow", image: "chase.svg" },

        // Activities
        music:    { label: "music",    colour: "green",  image: "music.svg" },
        painting: { label: "painting", colour: "yellow", image: "painting.svg" },
        reading:  { label: "reading",  colour: "green",  image: "reading.svg" },
        swinging: { label: "swinging", colour: "green",  image: "swinging.svg" },

        // Places
        playground:   { label: "playground", colour: "blue", image: "playground.svg" },
        garden:       { label: "garden",     colour: "blue", image: "garden.svg" },
        toilet_place: { label: "toilet",     colour: "blue", image: "toilet.svg" },
        library:      { label: "library",    colour: "blue", image: "library.svg" },
        hall:         { label: "hall",       colour: "blue", image: "hall.svg" },
        home_place:   { label: "home",       colour: "blue", image: "home.svg" },

        // Fixed bar keys
        help:     { label: "help",     colour: "white", image: "help.svg" },
        stop:     { label: "stop",     colour: "white", image: "stop.svg" },
        more:     { label: "more",     colour: "white", image: "more.svg" },
        finished: { label: "finished", colour: "white", image: "finished.svg" },
        yes:      { label: "yes",      colour: "white", image: "yes.svg" },
        no:       { label: "no",       colour: "white", image: "no.svg" }
      }
    }
  }
};
