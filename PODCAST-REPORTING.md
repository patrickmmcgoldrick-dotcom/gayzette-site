# Podcast Watchlist reporting pipeline

The daily Podcast Watchlist reporter follows the completed Listening OS capture. It converts yesterday’s ready episode notes into original, sourced reporting and explicitly tracks any blocked episode. Public episode release dates are verified separately from private watch dates.

The canonical public destination is `https://thegayzette.news/podcasts.html`. The reporter follows the 08:36 Pacific capture at approximately 11am Pacific.

Run `node podcast-reporter.mjs intake --hq PATH --out PRIVATE_MANIFEST --ledger PRIVATE_LEDGER` to select yesterday in America/Los_Angeles. `--date YYYY-MM-DD` is available for a late backlog. Keep the manifest and ledger outside the public repository. `--hq` is a locally configured content root; there are no credentials or personal paths in this package.

Use `--since YYYY-MM-DD` only to reconcile an explicit missed-run window through `--date`; it does not discover a following roster or label old episodes as new. The default remains yesterday only. A repeated channel in listening history is not a verified subscription. New-release monitoring uses a separately confirmed followed-show roster; recent episode reporting may use the actual notes without asserting that the listener subscribes.

Then an authorized reporter reads the note and full archived transcript, opens the public episode, investigates a specific question through additional primary evidence, and writes a developed story. A different checker independently verifies each factual claim, attribution, context, privacy and originality. Reporting must connect and expand; a recap alone does not meet the contract.

Run `node podcast-reporter.mjs build --drafts REVIEWED_JSON --manifest PRIVATE_MANIFEST --out PUBLIC_JSON`. The build fails if an eligible episode has neither a checked story nor an explained blocked/deferred disposition, if sources/review are missing, or if common private metadata appears in public text. The allowlist output drops private intake and review fields. The human privacy check remains essential; a heuristic cannot prove privacy by itself.

After the public site is committed and verified live, run `node podcast-reporter.mjs receipt --payload PUBLIC_JSON --ledger PRIVATE_LEDGER --commit COMMIT_SHA --url LIVE_URL`. This appends publication receipts only; it cannot verify deployment itself.

## Reviewed input

Root: `{ updated_on, stories, dispositions }`. Each disposition has `episode_id`, `status` (`blocked` or `deferred`), and `reason`.

Each story: `id`, `episode_id`, `headline` (at most 12 words), `dek`, `show`, `episode_title`, `episode_url`, `published_on` (verified date or `unknown`), `reported_on`, `angle`, `body` (at least 3 paragraphs / 220 words), `connection`, `caveat`, optional `category`, `sources`, `review`.

Sources: `{ title, url, date, opened_on, role: "episode"|"context", primary }`; at least the exact episode and one primary context source are required. Review: `{ status: "passed", writer, checker, checked_on, privacy: "public-only", attribution: "passed", original_reporting: "passed", claims: [{ verdict: "OK", source_url, locator }] }`. Writer/checker identities must differ. Set these fields only after actually completing the checks.

If live episode playback is unavailable, the exact original episode URL may instead carry `opened_on: null`, `verification_method: "archived-primary-captions"`, and `archived_opened_on` set to the actual date the archived primary captions were read. This branch additionally requires a nonempty public `source_note` describing the access limitation and archived-caption method, plus `review.source_access: "archived-primary-with-disclosure"`. A checker must independently inspect those captions and their timestamp locators. A generated note alone is not primary evidence. Context sources still require a current opened public primary-source receipt. Never fill a fictitious live-open date. The public projection preserves the disclosure, verification method and archive-read date.

Public output: `{ schema_version: 1, beat: "Podcast Watchlist", updated_on, stories }`. Stories contain only the public editorial fields above and sources `{title,url,date,role}`. No notes, transcripts, watch dates, identities of listeners or private project details go to the website.

## Runtime boundary

This package performs intake and validation. It does not generate reporting, retrieve subscriptions, install a scheduler or publish to GitHub. Those actions belong to the separately installed agent, which must use authorized current tools and verify its results. The current morning Gayzette should not wait for this later daily update. Missing local access or failed ingestion must produce a blocked run, never a fabricated story or an empty-success claim.

Preferred design: the TV Watchlist visual system approved November 1, 2026. Navigation order is TV Watchlist, Podcast Watchlist. Keep the warm-paper editorial layout, burgundy hero and clear hierarchy.
