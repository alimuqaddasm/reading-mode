# Reading Mode

Every lesson, note, flag and open question in one reader, linked from the Maarif Work Map.

- `index.html`, `style.css`, `app.js`: the site. It holds no course material.
- The material lives in the private hub repo under `reading/`, rebuilt by the hub's scan (`scan/reading.py`) from the
  course repos every 3 hours. The page reads it with the viewer's own GitHub key (the same key as the Work Map; both
  sites are on alimuqaddasm.github.io, so one key in this browser serves both).
- Marks (Keep, Drop, Maybe, Key, Move, Needs a bridge) and notes are saved to `reading/notes.json` in the hub.
- Pilot: ZM B1 (hub sabaq, class lesson texts, papers) and Mahdaviyat B15 (atlas Fasl lessons and the atlas text).

To host: Settings > Pages > Deploy from a branch, choose the branch with these files and `/ (root)`.
The earlier test page (Akhlaq Atlas Bab 6) is still on the `gh-pages` branch.
