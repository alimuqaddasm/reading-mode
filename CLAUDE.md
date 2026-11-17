# reading-mode

<!-- hub-rules:start -->
## Hub rules v4 (2026-11-17), same for every account and every session

If `kit/REPO-RULES.md` in `alimuqaddasm/hub` shows a newer version than this, follow that one.
These rules come from the EX-44 system design (`alimuqaddasm/ex44-system`, `docs/EX44-SYSTEM-DESIGN.md`). On EX-44 the fuller `docs/EX44-RULES.md` also applies.

**How the pieces fit.** EX-44 is the master of everything. GitHub is the record and the only door. `main` always holds the latest work. la57 (the owner's laptop, and the mentor's view) receives only the `la57` branch, which holds approved files only. So putting work into `main` never shows it to the mentor; only "publish" does.

**Before you open or change any file, even just to show it**
1. Run `git ls-remote --heads origin`. For each `claude/*` or `job/*` branch other than yours, `git fetch origin <branch>` and `git diff --name-only origin/main...FETCH_HEAD` to see whether it changes the files you were asked about. Say what each branch holds compared with `main`. Never judge a repo from `main` alone.
2. If exactly one branch holds newer work on your task, bring it into your own branch before your first commit and tell the owner which branch you built on. If several do and they have diverged, or one changed in the last few hours, or a merge conflicts: do not choose. Give the owner the branch names and dates and ask.
3. Never commit to, force push or delete a branch that is not yours. Never touch the branches `la57` and `from-la57` by hand: `la57` is written only by the publish tool on EX-44, `from-la57` only by the owner's "Send back" button on la57.
4. Read `DECISIONS.md` on `main` here, and `DECISIONS.md` in the hub. The hub's `README.md` gives the picture across repos; it can be hours old.

**While you work**
- Push your branch after every finished piece. Then put that piece into `main` if it fits cleanly: `git fetch origin main`, merge `origin/main` into your branch, push, then `git push origin HEAD:main`. No asking. Never force push, never squash or rebase what is already pushed.
- If the merge conflicts: stop, leave your branch pushed, name the files, and show the owner both versions. Do not pick a side.
- These still need the owner's word every time: restarting or deploying a live service; deleting or moving files (shelve, never delete); any branch listed as "leave exactly as it is" in the hub's `DECISIONS.md`.
- When the owner gives a rule that later sessions must follow, add one dated line at the top of `DECISIONS.md` on `main` (the hub's `DECISIONS.md` if it applies to all repos). If it replaces an older line, delete the older one.

**The owner's words**
- "save": put everything this session has into `main` now, as above, in every repo it touched. Check that `main` on GitHub contains your last commit, then list every repo as saved or not saved, with the reason. Then start the hub scan (`Scan repos` workflow in `alimuqaddasm/hub`, workflow_dispatch); if that is refused, say so.
- "publish": send approved files to la57. It works only on EX-44, with `ex44-system/tools/publish.py`, from the repo's `la57-list.txt` on `main`. Decks (pptx), Word files (docx) and flowcharts (html) go by rule. A PDF goes only if real Word or PowerPoint on la57 made it. For any other new or changed file, ask the owner once (yes always, yes this time, never) and write the answer into `la57-list.txt`. A session that is not on EX-44 says so and leaves the publish to an EX-44 chat.
- "show me": send a draft to la57's preview folder with `ex44-system/tools/showme.py` (EX-44 only). It is not a publish.
- "sent to mentor" is `with mentor`. "mentor wants changes" is `revising`. "this is final" is `final`. In `alimuqaddasm/hub`, take the course id and unit label exactly as they appear in `status.json`, then in `board.json` set `courses.<id>.units.<unit>` to `{"status": ..., "round": n, "note": "...", "updated": "<UTC date and time, YYYY-MM-DDTHH:MM>"}`. A move to `revising` adds 1 to `round`, and the mentor's comment goes in `note`. Write that one file to `main`; if rejected, re-read and retry once. Say whether it was recorded.

**Before you say done**
- Count the set. If the job makes a numbered set (lessons 8 to 25), count it and say "18 of 18", or name what is missing.
- Show the check. Never say "done" or "fixed" without showing the check you ran on the real file or page. Otherwise say "not checked".

Skipped steps are not caught. Pushed work always shows on the hub; unpushed work and unwritten decisions are lost.
<!-- hub-rules:end -->
