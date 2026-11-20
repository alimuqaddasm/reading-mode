#!/usr/bin/env python3
"""Publish Reading Mode: main is the source, gh-pages is what GitHub Pages serves.

Run from a clone of this repo:
  python3 publish.py plan            what would change on the live site, and any hand copies on gh-pages
  python3 publish.py go "message"    put main's site files on gh-pages (one commit, never a force push)
  python3 publish.py takeback        bring files that were hand-copied onto gh-pages back into main
  python3 publish.py verify          byte-compare every live file with gh-pages

Files in SKIP stay on main only (repo rules and tooling, not part of the site).
Each publish commit carries a "Published-From: <main sha>" line; gh-pages commits after the last one are hand copies.
"""
import os, subprocess, sys, tempfile, time, urllib.request

SKIP = {"CLAUDE.md", "DECISIONS.md", ".gitignore", "publish.py"}
LIVE = "https://alimuqaddasm.github.io/reading-mode/"
TAG = "Published-From: "


def git(*a, env=None, check=True):
    r = subprocess.run(["git", *a], capture_output=True, text=True, env=env)
    if check and r.returncode:
        sys.exit(f"git {' '.join(a)} failed:\n{r.stderr.strip()}")
    return r.stdout.strip()


def files(ref):
    out = git("ls-tree", "-r", ref)
    res = {}
    for line in out.splitlines():
        meta, path = line.split("\t", 1)
        res[path] = meta.split()[2]
    return res


def site_tree(ref):
    """Tree id of ref without the SKIP files."""
    with tempfile.TemporaryDirectory() as d:
        env = dict(os.environ, GIT_INDEX_FILE=os.path.join(d, "index"))
        git("read-tree", ref, env=env)
        for p in SKIP:
            git("rm", "--cached", "-q", "--ignore-unmatch", p, env=env)
        return git("write-tree", env=env)


def baseline():
    """Last gh-pages commit made by this script, else where main and gh-pages meet."""
    for line in git("log", "--format=%H%x00%B%x1e", "origin/gh-pages").split("\x1e"):
        if TAG in line:
            return line.split("\x00", 1)[0].strip()
    return git("merge-base", "origin/main", "origin/gh-pages")


def hand_copies():
    base = baseline()
    return base, git("log", "--format=%h %s", f"{base}..origin/gh-pages").splitlines()


def diff(a_ref, b_tree):
    out = git("diff-tree", "-r", "--name-status", a_ref, b_tree)
    return [l for l in out.splitlines() if l]


def plan():
    git("fetch", "-q", "origin", "main", "gh-pages")
    base, hand = hand_copies()
    if hand:
        print(f"{len(hand)} hand copies on gh-pages, not yet in main (run takeback first):")
        print("\n".join("  " + h for h in hand))
    changes = diff("origin/gh-pages^{tree}", site_tree("origin/main"))
    print(f"{len(changes)} site files would change on the live site:" if changes else "The live site already matches main.")
    print("\n".join("  " + c for c in changes))
    return hand, changes


def go(msg):
    hand, changes = plan()
    if hand:
        sys.exit("Stopped: gh-pages has hand copies. Run takeback, then go again.")
    if not changes:
        return
    sha = git("rev-parse", "origin/main")
    commit = git("commit-tree", site_tree("origin/main"), "-p", "origin/gh-pages",
                 "-m", f"Publish: {msg}", "-m", f"{TAG}{sha}")
    git("push", "-q", "origin", f"{commit}:refs/heads/gh-pages")
    print(f"Published main {sha[:7]} as gh-pages {commit[:7]}. Run verify in a few minutes.")


def takeback():
    git("fetch", "-q", "origin", "main", "gh-pages")
    base, hand = hand_copies()
    if not hand:
        print("No hand copies on gh-pages.")
        return
    if git("status", "--porcelain"):
        sys.exit("Stopped: this clone has uncommitted changes.")
    git("checkout", "-q", "main")
    git("merge", "-q", "--ff-only", "origin/main")
    pages = diff(base, "origin/gh-pages")
    ours = {l.split("\t")[-1] for l in diff(base, "origin/main")}
    clash = [l.split("\t")[-1] for l in pages if l.split("\t")[-1] in ours]
    if clash:
        sys.exit("Stopped, clash: these files changed on both main and gh-pages:\n  " + "\n  ".join(clash))
    for l in pages:
        st, path = l.split("\t")[0], l.split("\t")[-1]
        if st.startswith("D"):
            git("rm", "-q", path)
        else:
            git("checkout", "origin/gh-pages", "--", path)
    git("commit", "-q", "-m", "Takeback: hand copies from gh-pages", "-m", "\n".join(hand))
    git("push", "-q", "origin", "main")
    print(f"Took back {len(pages)} files from {len(hand)} hand copies into main.")


def verify():
    git("fetch", "-q", "origin", "gh-pages")
    ok = bad = 0
    for path, blob in sorted(files("origin/gh-pages").items()):
        if path.startswith(".") or "/." in path:
            continue
        want = subprocess.run(["git", "cat-file", "blob", blob], capture_output=True).stdout
        url = LIVE + path + f"?v={int(time.time())}"
        try:
            got = urllib.request.urlopen(url, timeout=30).read()
        except Exception as e:
            got = f"error {e}".encode()
        if got == want:
            ok += 1
        else:
            bad += 1
            print("  differs:", path)
    print(f"{ok} of {ok + bad} live files match gh-pages byte for byte.")
    return bad == 0


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "plan"
    if cmd == "plan":
        plan()
    elif cmd == "go" and len(sys.argv) > 2:
        go(" ".join(sys.argv[2:]))
    elif cmd == "takeback":
        takeback()
    elif cmd == "verify":
        sys.exit(0 if verify() else 1)
    else:
        sys.exit(__doc__)
