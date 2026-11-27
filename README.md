# Communication Board – Stage 1

A simple, calm communication board for iPad (Safari, landscape).
No adverts, no tracking, no sounds except speech, no animations.

## Files

| File | What it is |
|---|---|
| `index.html` | The page layout |
| `styles.css` | Sizes, borders, layout |
| `app.js` | What happens when buttons are pressed |
| `data/board.js` | **All words, colours, layers and image names – edit this one** |
| `images/` | Put symbol pictures here later |
| `tests/run-tests.js` | Automatic checks |

## Using it

- **Sentence strip** (top): shows chosen words in their colours. Tap it to hear the whole sentence.
  It holds up to 12 words (6 per row). It never clears by itself.
- **Delete last word** and **Clear** sit beside the strip.
- **Home** (left) goes back to the first screen. It does not clear the sentence.
- **Arrows** appear only when a screen has more words than fit. Words never change position.
- **Bottom bar**: help, stop, more, finished, yes, no. They speak and join the sentence, and never change screen.

## Staff settings

Press and **hold the small "Staff" button (top right) for 3 seconds**, then answer the sum.
This only stops students opening settings by accident – it is **not** security.

Settings are saved on that iPad only:
- 8 or 12 buttons per screen
- voice and speaking speed (starts at 0.8), with a Test voice button
- double-press protection (starts at 1 second)
- show or hide each bottom-bar key (hidden keys leave a gap so others don't move)

## Changing words or colours

Open `data/board.js` in a text editor. The notes at the top explain each part.
- To change a colour, edit its line in `colours`. Every button with that colour changes.
- To change a word, edit its `label` (shown) or add `speak` (if it should be said differently).
- If you make a mistake, the board shows a message saying what is wrong.

## Adding symbols (later)

1. Put picture files in the `images` folder, named as in `data/board.js` (e.g. `apple.png`).
2. In `data/board.js`, change `showImages: false` to `showImages: true`.
Missing pictures just leave the space empty.

## Running the tests

Needs Node.js and Playwright with Chromium:

```bash
node tests/run-tests.js
```

Screenshots are saved to `tests/screenshots/` (not stored in git).

## Not built yet (planned)

Staff editing on screen, offline use, and School / Class / Student accounts with one board per student.
The data file already has placeholder spaces for these. It contains no real student data.
