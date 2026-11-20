# Reading Mode

Every lesson, note, flag and open question in one reader, linked from the Maarif Work Map.

- `index.html`, `style.css`, `app.js`: the site. It holds no course material.
- The material lives in the private hub repo under `reading/`, rebuilt by the hub's scan (`scan/reading.py`) from the
  course repos every 3 hours. The page reads it with the viewer's own GitHub key (the same key as the Work Map; both
  sites are on alimuqaddasm.github.io, so one key in this browser serves both).
- Marks (Keep, Drop, Maybe, Key, Move, Needs a bridge) and notes are saved to `reading/notes.json` in the hub.
- Covers every course (ZM, TH, MA, Muqaddima, Tazzakur) and every atlas on main (Mahdaviyat, Tauheed, Akhlaq, Adl, Maad).

`main` is the source. GitHub Pages serves the `gh-pages` branch, which only `publish.py` writes:
`python3 publish.py plan`, then `python3 publish.py go "message"`, then `python3 publish.py verify`.
A hand copy straight onto `gh-pages` still works; `python3 publish.py takeback` brings it into `main`.
`CLAUDE.md`, `.gitignore` and `publish.py` stay on `main` only.
