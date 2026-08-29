# RecipeVault Bulk Import Tool — Plan

A standalone React + Node app ("RecipeVault Importer") that turns a pile of PDFs,
photos and pasted text into structured recipes and pushes them into a running
RecipeVault instance over its public HTTP API.

It is a separate repo/package. RecipeVault itself needs **no changes** for the
baseline design (one optional backend addition is described in §9).

---

## 1. What the workflow looks like

```
  ┌──────────┐   ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐   ┌─────────┐
  │ Connect  │──▶│ Import │──▶│ Select │──▶│ Review │──▶│ Export │──▶│ Summary │
  └──────────┘   └────────┘   └────────┘   └────────┘   └────────┘   └─────────┘
   creds +        drop files   titles +     one-by-one    live         counts +
   AI key         → analyze    checkboxes   verify/edit   progress     failures
```

1. **Connect** — RecipeVault URL + username + password, AI key + model. Test button.
2. **Import** — drop/paste everything. The tool normalizes it into *pages*, then
   AI segmentation finds where each recipe starts and ends.
3. **Select** — flat list of detected recipes: **title + checkbox only**, with
   select-all / select-none at the top. Nothing has been extracted yet, so
   deselecting here is what keeps the AI bill down.
4. **Review** — recipe by recipe, source page shown side-by-side with an editable
   form. Modify anything, attach an image, or mark for deletion.
5. **Export** — pushes to RecipeVault with live per-recipe progress.
6. **Summary** — imported / skipped / failed counts, with links into the vault.

---

## 2. Architecture

```
        Browser (React SPA, :5175)
                  │  JSON + multipart, same origin
                  ▼
        Importer Node server (Express)
         ├── SQLite (better-sqlite3)  ── sessions, pages, recipes, export state
         ├── data/  ── originals, page renders, recipe images
         ├── AI client   ──────────────▶  Anthropic API (or OpenRouter)
         └── RecipeVault client ───────▶  https://your-vault/api/*
```

**All outbound calls happen in the Node process, never the browser.** Three
reasons, in order of how hard they are to work around:

1. **RecipeVault sends no CORS headers.** `backend/src/app.ts` mounts no `cors`
   middleware and `backend/package.json` has no such dependency, so a browser on
   `localhost:5175` cannot call `https://your-vault/api/*` at all. Proxying
   server-side sidesteps this entirely — no change to RecipeVault required.
2. **Credentials stay off the client.** The vault password and the AI key live in
   the importer's config, not in browser memory.
3. **Long jobs survive the tab.** Extracting 300 recipes takes minutes; the tab
   can be closed and reopened.

### Stack

Deliberately mirrors RecipeVault, so components and idioms can be lifted straight
across (in particular the ingredient/step editor in
`frontend/src/pages/RecipeEdit.tsx`, ~470 lines, which already handles sections
and drag-reordering).

| Layer | Choice |
|---|---|
| Server | Node 24, Express 5, TypeScript, zod |
| Store | SQLite via `better-sqlite3` (single file, no daemon) |
| Files | `multer` (upload), `sharp` (resize/crop), `pdfjs-dist` (render + text) |
| Client | React 19, Vite, Chakra UI v3, TanStack Query v5, `@dnd-kit` |
| Progress | Server-Sent Events (`/api/events/:sessionId`) |
| Run | `npm start` → one process, serves the built SPA, opens the browser |

**Why SQLite and not memory:** reviewing 300 recipes by hand is hours of work
spread over days. Losing it to a process restart, or to a half-finished export,
is the difference between a tool you use once and a tool you trust. Everything —
segmentation results, every keystroke in the review form, per-recipe export
status — is persisted as it happens.

---

## 3. Ingestion: everything becomes a page stream

The single idea that makes PDFs, photos and pasted text uniform:

> Every input is normalized into an ordered list of **pages**, each
> `{ id, sourceFile, pageNo, imagePath, text? }`.

| Input | Becomes |
|---|---|
| Text PDF | one page per PDF page: rendered JPEG (~1600px long edge) + extracted text layer |
| Scanned PDF | same, image only — no text layer, so vision does the reading |
| Photo (JPG/PNG/HEIC) | one page, image only |
| Pasted text | synthetic text-only pages, split on blank-line runs |

Recipe *segments* then reference **page IDs, not exclusive ranges** — which is
what lets a recipe span a page break *and* lets two recipes share one page.

Gotchas worth budgeting for:

- **HEIC.** iPhone photos are HEIC by default and `sharp` cannot read them
  without libheif. Convert on ingest with `heic-convert`, or fail loudly with a
  clear message rather than silently dropping the file.
- **Orientation.** Phone photos carry EXIF rotation; `sharp().rotate()` before
  anything else or the model reads sideways text.
- **Size.** A 300-page cookbook at ~300 KB/page render is ~90 MB on disk. Fine,
  but store under `data/` and make "delete session" actually delete the files.

---

## 4. AI pipeline: two stages, and why

### Stage A — Segmentation (runs on everything, cheap)

Per source file, feed the page stream (text where available, images otherwise,
in batches of ~10 pages with page markers) and ask only:

> Where does each recipe start and end, and what is its title?

Output per segment: `{ title, pageIds[], confidence }`.

This is what populates the Select page. It is a shallow question over a lot of
pages, so it runs on a cheap model.

For **photo streams** the same call answers the grouping question — "is this
photo a continuation of the previous one?" — from content (a step ending
mid-sentence, a "continued" marker, the same handwriting and card). The Review
page keeps a manual **merge with previous / split here** override for when it
guesses wrong.

### Stage B — Extraction (runs only on selected recipes, expensive)

For each **selected** segment, send just that segment's pages plus a JSON-schema
constrained prompt, and get the full structured recipe back.

**Reuse RecipeVault's own schema verbatim.** `RECIPE_RESPONSE_FORMAT` in
`backend/src/services/ai/recipe-assistant.service.ts:148` already describes
exactly the shape the app stores — including the `"section"` entries for
"For the bun" / "For the sauce" headings. Copying it means extraction output maps
1:1 onto the export payload with no lossy translation layer in between.

The lenient `extractionSchema` right below it (line 209) is worth copying too:
it tolerates a model returning `"4"` for servings or omitting an empty `unit`,
which over hundreds of recipes is the difference between a clean run and a
hundred manual fixes.

### Two-stage is a cost decision, not an aesthetic one

Select-before-extract means you never pay to extract the 80 recipes you didn't
want out of a 300-recipe cookbook. Segmentation over the whole book is a
fraction of the cost of extracting it.

### Model choice and rough cost

Segmentation is easy; extraction from a creased photocopy or handwriting is not.
Split them:

| Stage | Suggested | Why |
|---|---|---|
| Segmentation | Claude Haiku 4.5 (`claude-haiku-4-5`) | shallow question, many pages |
| Extraction | Claude Opus 5 (`claude-opus-5`) | handwriting, faded scans, multi-column layouts |

Both configurable in Settings; step extraction down to `claude-sonnet-5` if
accuracy on your actual material holds.

Order-of-magnitude for a 300-page cookbook yielding ~300 recipes, at list
pricing (input/output per MTok: Haiku 4.5 $1/$5, Sonnet 5 $2/$10, Opus 5 $5/$25),
counting a rendered page at roughly 2–3k tokens:

- Segmentation, ~300 pages ≈ 750k input tokens → **under $1** on Haiku.
- Extraction, ~300 recipes × ~3 pages ≈ 2.3M input + ~0.4M output →
  **~$4** on Sonnet 5, **~$20** on Opus 5.

Two levers worth taking:

- **Message Batches API** — same requests submitted asynchronously at **50% cost**.
  Extraction is not latency-sensitive (you are going to review them tomorrow
  anyway), so this halves the biggest line item. Results come back keyed by
  `custom_id` in arbitrary order — key by ID, never by position.
- **Native PDF input** — a text PDF can be sent as a `document` block
  (base64, or via the Files API for reuse across calls) rather than page renders,
  which is both cheaper and more accurate on multi-column layouts. Limits: 32 MB
  per request, 600 pages. Page renders are still needed for the *Review* page's
  side-by-side view, so ingestion produces them either way.

Two correctness details for a long unattended run:

- A refusal comes back as **HTTP 200** with `stop_reason: "refusal"`, not an
  exception. Check `stop_reason` before reading content, or you will silently
  store a garbage recipe. Enabling server-side fallbacks handles it upstream.
- Do not lowball `max_tokens`. A long recipe truncated mid-list looks like a
  successful extraction. Cap generously and flag any response that hits it.

---

## 5. The four screens in detail

### 5.1 Import

One large dropzone plus a textarea. Accepts:

- drag & drop of files *and* folders (`webkitdirectory`)
- the file picker (multi-select)
- **Ctrl/Cmd+V** — images and text straight from the clipboard
- typed/pasted text in the textarea

Below it, a live file list: name, type, page count, status
(`queued → rendering → segmenting → done | failed`), fed by SSE. Then **Analyze**.

### 5.2 Select

Exactly as specified: **title and a checkbox, nothing else**, with select-all /
select-none in the header. Plus three things that cost little and save a lot:

- source badge (`cookbook.pdf p.42–43`) so you can tell two "Goulash" apart
- a **possible duplicate** flag — pre-flight `GET /api/recipes?search=<title>`
  against the vault, so you don't import what you already have
- a live "N of M selected · est. cost $X" line above the **Extract** button

### 5.3 Review

The screen that decides whether this tool is usable. Split view:

```
┌────────────────────────┬──────────────────────────────┐
│  source page image     │  title                       │
│  (zoom / pan,          │  servings · prep · cook      │
│   multi-page tabs)     │  ingredients  [+ section]    │
│                        │  steps        [+ section]    │
│                        │  notes · tags                │
│                        │  image: [page ▸ crop] [file] │
├────────────────────────┴──────────────────────────────┤
│  ◀ prev   3 / 147   next ▶      [ mark for deletion ] │
└───────────────────────────────────────────────────────┘
```

- **The source image is not optional.** Verifying 300 AI-extracted recipes
  without seeing the original is guessing, not verifying.
- Editor lifted from `RecipeEdit.tsx` — sections, drag-reorder, the lot.
- **Image sources:** crop from the page render (`sharp.extract`), upload a file,
  or paste from clipboard. Optional nicety: ask the vision model for the dish
  photo's bounding box during extraction and pre-fill the crop.
- **Mark for deletion** excludes it from export; a left sidebar lists every
  recipe with status (unreviewed / ok / marked), so you can jump around.
- Autosave every change to SQLite; keyboard shortcuts (`n`/`p`, `d`).
- At 300 recipes this is hours of work. A **"review only flagged"** mode — trust
  high-confidence extractions and surface only the ones with low confidence,
  empty ingredients, empty steps, or a truncated response — is the single
  biggest time lever available. (See open question 10.)

### 5.4 Export & Summary

Pre-flight panel: N to import, M with images, optional target collection
(`GET /api/collections`). Then a live list, one row per recipe, with per-recipe
status and a **retry failed** button. Ends on the summary: imported / skipped /
failed, failures with reasons, links into the vault, downloadable JSON report.

---

## 6. The export contract (verified against this repo)

Per recipe, in this order:

```
POST  /api/auth/login          {username, password}   → {accessToken}
POST  /api/recipes             {title}                → {id}
POST  /api/recipes/:id/images  multipart field "image"      ← repeat per image
PATCH /api/recipes/:id         {title, ingredients, instructions,
                                prepTime, cookTime, servings, notes}
POST  /api/recipes/:id/tags    {tags: [...]}                ← if any
POST  /api/collections/:cid/recipes {recipeId}              ← optional
```

Constraints that the payload builder has to respect:

| Rule | Source |
|---|---|
| `POST /api/recipes` accepts **only** `title`; everything else lands via PATCH | `recipes.controller.ts:78` |
| `ingredients`: `{amount, unit, name}` or `{type:'section', title}` — all strings | `recipes.controller.ts:35` |
| `instructions`: `{step:int, text}` or `{type:'section', title}` | `recipes.controller.ts:39` |
| Steps numbered **1..n, skipping sections** | `utils/sections.ts` `renumberSteps` |
| `prepTime`/`cookTime`/`servings`: non-negative int — **omit**, never `null` | `updateSchema` |
| Image upload: multipart field `image`, **8 MB cap**, resized to 1920px by sharp | `recipes.routes.ts:22` |
| Tag names are lowercased + trimmed and **globally unique across all users** | `tags.service.ts` `findOrCreateTags` |
| JSON body limit 10 MB | `app.ts` |
| Access token TTL is **15 minutes** | `auth.service.ts:5` |

Two behaviours worth exploiting:

- **Upload images *before* the PATCH.** `patchRecipe` calls `ensureCoverImage()`
  first (`recipes.controller.ts:113`), so the first uploaded image becomes the
  cover for free — no separate `PATCH /cover-image` call.
- **Re-login, don't refresh.** The 15-minute access token will expire during a
  long run. The refresh flow depends on an httpOnly cookie; since the importer
  holds the password anyway, catching a 401 and re-logging-in is simpler and has
  fewer failure modes than cookie-jar handling.

### Reliability

- **Concurrency 2–3.** This is a self-hosted single-process Express server also
  doing `sharp` work; hammering it with 20 parallel uploads is not a kindness.
- **Idempotent resume.** Persist the returned `recipeId` the instant step 2
  succeeds. A resumed export continues at step 3 instead of creating a duplicate.
  Status machine: `pending → created → imaged → patched → tagged → done | failed`.
- **Partial failures leave a stub.** If the PATCH fails you have an
  "Untitled Recipe" in the vault. Offer both *retry* and *delete the stub*
  (`DELETE /api/recipes/:id`) from the failure list.
- Exponential backoff on 5xx and network errors; fail fast on 4xx (they will not
  fix themselves) and surface the message.

---

## 7. Data model (SQLite)

```
session(id, name, created_at, status)
source_file(id, session_id, filename, kind, bytes, status, error)
page(id, source_file_id, page_no, image_path, text, width, height)
segment(id, session_id, title, page_ids_json, confidence, selected,
        extract_status, extract_error)
recipe_draft(id, segment_id, payload_json, image_paths_json, cover_index,
             review_status, marked_deleted, updated_at)
export_job(id, session_id, started_at, finished_at, collection_id)
export_item(id, export_job_id, recipe_draft_id, vault_recipe_id,
            status, error, attempts)
```

`recipe_draft.payload_json` holds exactly the RecipeVault-shaped object, so
export is a serialization, not a transformation.

---

## 8. Build order

De-risk the integration contract first, before any UI exists.

| Phase | Scope | Size |
|---|---|---|
| **0** | Scaffold, SQLite, Connect page, RecipeVault client, export one hardcoded recipe end-to-end | S |
| **1** | Ingestion (files → pages), Import page, SSE progress | M |
| **2** | Stage A segmentation + Select page | M |
| **3** | Stage B extraction + Review page (split view, editor, images) | **L** |
| **4** | Export engine (queue, retry, resume) + Summary page | M |
| **5** | Polish: Batch API, duplicate detection, crop-from-page, keyboard shortcuts, "review only flagged" | M |

Phase 0 is deliberately first: if anything about the 4-call export sequence is
wrong, it is far cheaper to discover it against a hardcoded payload than after
building a review UI on top of a broken assumption.

---

## 9. One optional RecipeVault change

Imported recipes land as `origin: 'MANUAL'` with no `sourceUrl`, because
`postRecipe` hardcodes the origin and `updateSchema` accepts neither field. Three
hundred cookbook recipes will be indistinguishable from hand-typed ones, and the
app's origin filter won't help you find or undo them.

Baseline workaround, **no backend change**: write provenance into `notes`
(`Imported from cookbook.pdf, p.42`). Ugly but visible and searchable.

Better, if touching the app is acceptable — about 40 lines plus a migration:

```ts
// POST /api/recipes/import  — one call, one transaction
{ title, sourceUrl?, ingredients, instructions,
  prepTime?, cookTime?, servings?, notes?, tags?, origin: 'IMPORTED' }
```

`createRecipe()` in `recipes.service.ts` already accepts `origin` and `sourceUrl`
— only the controller withholds them. Add `IMPORTED` to the `RecipeOrigin` enum
and this collapses 4+ round trips per recipe into 1, makes each import atomic
(no "Untitled Recipe" stubs on failure), and gives every bulk-imported recipe a
badge and a filter in the app.

**The tool should be built to work without it**, with a config flag to use the
fast path when present. See open question 2.

---

## 10. Open questions

**About your material**

1. **Are the PDFs one recipe each, or whole cookbooks?** If it's one recipe per
   PDF, Stage A segmentation is nearly free (title extraction only) and the
   Select page gets simpler. Whole cookbooks are what the design above assumes.
2. **Printed or handwritten?** Clean printed pages extract almost perfectly on a
   cheap model. Handwriting — especially cursive, or a relative's recipe cards —
   is the hard case and drives both the model choice and how much of the Review
   page work is real editing versus rubber-stamping.
3. **What language are the recipes in?** The vault's parsers target Hungarian
   sites, so I'm assuming Hungarian and/or English. Should extraction preserve
   the source language exactly, or normalize everything to one language?
4. **How are the paper photos taken?** One photo per recipe card, or several
   photos per multi-page recipe? This decides whether auto-grouping is essential
   or a nice-to-have.

**About RecipeVault**

5. **May I add the `POST /api/recipes/import` endpoint (§9), or must the tool use
   only the existing API?** This is the biggest single fork in the plan — it
   affects speed, atomicity, and whether imports are distinguishable in the app.
6. **Tags: free-form or restricted?** `Tag.name` is globally unique and shared by
   every user in the instance, so AI-invented tags pollute everyone's tag list.
   Options: let the AI tag freely, restrict it to your existing tags
   (`GET /api/tags`), prefix them (`import:...`), or skip tags entirely.
7. **Target collection?** Import into a specific collection, or leave them in
   your default recipe book (which picks up everything you own automatically)?
8. **Where does the tool run** — your laptop against the live server, or on the
   server itself? Affects whether ~100 MB of images crosses the internet and
   whether the vault URL is public or `localhost:3000`.

**About the workflow**

9. **What is an acceptable AI spend for a full run?** The estimates in §4 span
   roughly $2 to $25 for ~300 recipes depending on model and whether batching is
   used. If cost matters more than the last few percent of accuracy, that changes
   the default model.
10. **Do you want a "review only flagged" mode?** Reviewing 300 recipes at one
    minute each is five hours. Auto-approving high-confidence extractions and
    surfacing only the suspicious ones (low confidence, empty ingredients or
    steps, truncated output) could cut that to under an hour — at the cost of
    some errors reaching the vault unseen.
11. **Duplicates** — when a recipe already exists in the vault, skip it, import a
    second copy anyway, or show a side-by-side and let you choose?
12. **Recipe images:** many paper recipes have no photo at all. Is a crop of the
    scanned page acceptable as the cover image, or would you rather those
    recipes have no image than a picture of a piece of paper?
13. **Run size** — do you want to throw all several hundred in at once, or work
    in batches of 20–30? The design assumes the former (hence the persistence and
    resume work); if batches are fine, phases 4–5 get noticeably lighter.
