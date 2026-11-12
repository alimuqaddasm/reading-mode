# reading-mode

<!-- hub-rules:start -->
## Hub rules v3 (2026-11-12), same for every account and every session

If `kit/REPO-RULES.md` in `alimuqaddasm/hub` shows a newer version than this, follow that one.

Each session starts on its own branch cut from `main`, so the newest work is often on another branch. These rules make sure you find it. They apply to this repo and again to every repo you attach later, before your first edit there.

**Before you open or change any file, even just to show it**
1. Run `git ls-remote --heads origin`. For each `claude/*` branch other than yours, `git fetch origin <branch>` and `git diff --name-only origin/main...FETCH_HEAD` to see whether it changes the files you were asked about. This is the live truth for this repo.
2. Read `README.md` in `alimuqaddasm/hub` (GitHub tools, or attach the repo) for the picture across repos. It can be hours old. If its "Rebuilt" time is more than 13 hours old, or you cannot read it, or this repo is not listed in it, say so in your first reply and carry on with step 1.
3. If exactly one branch holds newer work on your task, bring it into your own branch before your first commit: `git merge --ff-only FETCH_HEAD`; if that is refused, `git fetch --deepen=500 origin` and do a normal merge. Tell the owner which branch you built on.
4. If several do: when one contains the others, use that one. When they have diverged, or one changed in the last few hours (another session may be open on it), or a merge conflicts, do not choose. Give the owner the branch names and dates and ask.
5. Never commit to, force push or delete a branch that is not yours.
6. Read `DECISIONS.md` on `main` here, and `DECISIONS.md` in the hub if it exists.

**While you work**
- Push your branch after every finished piece. Unpushed work is lost when the session ends.
- When the owner gives a rule that later sessions must follow (a design choice, "from now on", a mentor instruction), add one dated line at the top of `DECISIONS.md` on `main`, as a single-file commit made with the GitHub file tool, saying what it covers. Create the file if missing. If the line replaces an older one, delete the older one. If it applies to all repos, write it in the hub's `DECISIONS.md` instead. This rule is the owner's standing permission for that one-file write to `main`. If it is refused, commit the line on your branch and tell the owner.

**When the owner says a status changed**
- "sent to mentor" is `with mentor`. "mentor wants changes" is `revising`. "this is final" is `final`.
- In `alimuqaddasm/hub`, take the course id and unit label exactly as they appear in `status.json`, then in `board.json` set `courses.<id>.units.<unit>` to `{"status": ..., "round": n, "note": "...", "updated": "<UTC date and time, YYYY-MM-DDTHH:MM>"}`. A move to `revising` adds 1 to `round`, and the mentor's comment goes in `note`. Write that one file to `main` with the GitHub file tool; if rejected, re-read and retry once. This rule is the owner's standing permission for that write. Say whether it was recorded.

**"save"**
- This word is the owner's explicit permission to write to `main` and to open and merge a pull request for it.
- In each repo where this session made commits: push your branch, `git fetch origin main`, merge `origin/main` into your branch, push, then `git push origin HEAD:main`. If that push is refused, open a pull request and merge it with a merge commit, never squash or rebase. Never force push.
- If a merge conflicts, stop in that repo, leave your branch pushed, and name the files. Do not pick a side.
- If your branch was built on another branch, say so: saving puts that work in `main` too.
- Check that `main` on GitHub now contains your last commit. Then list every repo as saved or not saved, with the reason. Never say saved unless that check passed.
- After a save that reached `main`, start the hub scan so the Work Map and Reading Mode catch up: run the `Scan repos` workflow (`scan.yml`) in `alimuqaddasm/hub` with workflow_dispatch (GitHub tools). If that is refused, say so; the twice-daily scan will pick it up.

Skipped steps are not caught. Pushed work always shows on the hub, but unpushed work and unwritten decisions are lost.
<!-- hub-rules:end -->
