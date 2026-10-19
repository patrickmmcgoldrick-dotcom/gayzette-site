# The Gayzette site folder (v0)

This folder is the public website for thegayzette.news. It is plain finished HTML files: nothing to install, no server. Upload the whole folder to a static host and it works.

- `index.html` is the newest edition (with a small "Today's edition" banner).
- `editions/` holds one page per edition (`YYYY-MM-DD.html`) plus `editions/index.html`, the archive list.
- `404.html`, `robots.txt`, and `_build/manifest.json` (the list of published editions).

The private "Around the House / Coming Up" box and all vote buttons are left out on purpose.

To rebuild after new issues are written, run from the vault root:

    python3 "03 Newsroom/build/publish_site.py"

It reads every issue in `03 Newsroom/Issues/`, rewrites this folder, and checks that nothing private slipped in (it reports PASS or FAIL). This folder has its own git history; it has no remote yet.
