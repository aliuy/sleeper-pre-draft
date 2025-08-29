# Copilot instructions — Sleeper Draft Queue Helper

Purpose: give an AI coding agent the minimal, actionable knowledge to be productive in this repo.

Big picture
- This is a Manifest V3 Chrome extension (see `manifest.json`). No build step: files are plain JS/CSS/JSON.
- Runtime pieces:
  - Content scripts (run at `document_end`, `world: MAIN`): `name-matching.js`, `sleeper-api.js`, `content-sleeper.js`.
  - Styling: `sleeper-styles.css` (injected by manifest).
  - Icons: `img/` (exposed via `web_accessible_resources`).
- Primary flow: `content-sleeper.js` initializes -> loads players from `SleeperAPI` -> uses `NameMatcher` to match input names -> injects UI -> manipulates the page DOM to add/remove players in the queue.

Key files & responsibilities
- `manifest.json` — content script list, host permissions, url match patterns (where to test).
- `content-sleeper.js` — orchestrator: UI injection, DOM heuristics, queue/clear flows, React integration helpers, main debugging hooks (`window.sleeperHelper`).
- `name-matching.js` — name-matching logic (MIT header included). Use `NameMatcher.findPlayerMatches` / `findBestMatch` for matching and confidence scores.
- `sleeper-api.js` — remote fetch + in-memory cache + small metadata persist. Default: 100ms rate-limit, 24h cacheExpiry.
- `sleeper-styles.css` — UI styles; classes use `sleeper-` prefix.

Integration points & fragile spots
- External API: `https://api.sleeper.app/v1/players/nfl` (host permission in `manifest.json`).
- DOM selectors are heuristic and site-version dependent. Common selectors used in `content-sleeper.js` you may need to update:
  - queue/button discovery: `queueSelectors` array (e.g. selectors containing "queue", "add", "watch")
  - player containers: `playerContainers` (e.g. `[class*="player-list"]`, `table[class*="player"]`, roles `table/grid`)
  - action classes used at runtime: `.queue-action`, `.watchlist-action`, `.delete-button` (used to add/remove players)
  - search input selectors: `searchSelectors` (various `input[placeholder*="search"]`, `.player-search input`, etc.)
- React integration: `typeTextRealistically`, `clearSearchInput` attempt to call React's onChange via `__reactFiber*` or `__reactInternalInstance*`. This is fragile across React versions — always keep the DOM-event fallback (`fallbackDOMSearch`).

Developer workflows (how to test & debug)
- No build: to test locally load unpacked extension via chrome://extensions → "Load unpacked" → point to this folder.
- Pages to test (from `manifest.json`): `*://*.sleeper.com/draft/*`, `*://*.sleeper.com/leagues/*/predraft*`, `*://*.sleeper.app/*/draft/*` etc. Use mock draft pages when available.
- Quick manual test (from README): paste sample names in UI (e.g. Josh Allen, Christian McCaffrey, Tyreek Hill) → Analyze → Add to queue.
- Console helpers:
  - `window.sleeperHelper` is created when the content script runs. Toggle verbose logs: `window.sleeperHelper.isDebug = true`.
  - Manually trigger flows: `window.sleeperHelper.analyzePlayers()` `window.sleeperHelper.queuePlayers()` `window.sleeperHelper.clearQueue()`.
  - Inspect or stub data: `window.sleeperHelper.players = { /* small player map */ }` then call `analyzePlayers()`.
  - If `SleeperAPI.getAllPlayers()` fails, stub it in the console: `window.SleeperAPI.getAllPlayers = async () => ({ '1': { first_name:'Josh', last_name:'Allen', full_name:'Josh Allen', position:'QB', status:'Active' } })`.

Project-specific conventions
- UI classes use `sleeper-` prefix.
- Logging uses `this.log(...)` (timestamped prefix). Keep this for consistency.
- The code intentionally avoids storing the full players payload into Chrome storage; only metadata is persisted (see `sleeper-api.js`).
- Files export `module.exports` for Node testability but are intended to be loaded directly as content scripts.
- Name-matching logic is adapted from Henry Goodman (MIT) — preserve license header when editing.

When changing behavior
- If site DOM changes, first update selector arrays in `content-sleeper.js` (`queueSelectors`, `playerContainers`, `searchSelectors`).
- To change network/cache behavior, edit `SleeperAPI`'s `rateLimitDelay` and `cacheExpiry` in `sleeper-api.js`.
- To add persistent caching or background fetch, add a background service worker (Manifest V3) and move long-lived storage there — current design is intentionally in-page and ephemeral.

Notes for AI agents
- Prefer small, targeted edits: update selectors or tweak delays first when addressing failures.
- Preserve the NameMatcher MIT header and any console-friendly logging for easier manual debugging.
- Document any new selectors or feature flags in `README.md` and this file.

If anything above is unclear or missing (examples, selectors, test steps), tell me which part to expand or correct.
