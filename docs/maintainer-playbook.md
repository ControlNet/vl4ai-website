# Maintainer Playbook

This guide is for lab members who need to update site content, verify the restored multi-page site, and publish a static build without changing the Astro component system.

## Public route surface

The canonical public information architecture is now:

- `/`
- `/people/`
- `/research/`
- `/publications/`
- `/news/`
- `/positions/`
- `/contact/`
- `/404.html`

Legacy top-level `.html` aliases such as `/people.html` and `/news.html` are retired. Legacy detail URLs under `/pages/*.html` are also retired. `/404.html` is the only supported `.html` route.

## Ground rules

- Edit content under `src/content/`.
- Put referenced images and files under `public/`.
- Use content asset paths like `images/...` or `files/...`, not `/images/...` and not `new_design/...`.
- Do not edit `new_design/`. It is immutable reference-only input.
- Do not hand-edit `dist/`. Always regenerate it with `pnpm build`.
- Treat `src/data/route-contract.ts` as the source of truth for the canonical route matrix and retired legacy paths.

## Where to edit content

The current site is split between route copy in `src/content/site/` and route-owned collections under the matching content folders.

### Homepage `/`

Edit these files:

- `src/content/site/home-route.md` for route-level hero copy and homepage CTA text
- `src/content/site/home.md` for the homepage intro and about copy
- `src/content/publications/index.toml` for featured publications shown on the homepage
- `src/content/news/index.toml` for featured news shown on the homepage

Notes:

- Homepage publications are selected from `src/content/publications/index.toml` items that declare `homeRank`.
- Homepage news items are now selected automatically as the newest three entries in `src/content/news/index.toml`.

### People `/people/`

Edit these files:

- `src/content/site/people-route.md` for page header copy
- `src/content/people/index.toml` for the director, current members, alumni, images, and links

Important constraints:

- use compact `[[member]]` and `[[alumni]]` tables in the single `src/content/people/index.toml` file
- keep `group` editor-facing and simple: `director`, `postdocs`, `phd-students`, or `master-and-undergrad-students`
- `[[member]]` entries must include `name`, `group`, `image`, `details`, and `links`
- `[[alumni]]` entries must include `name`, `group`, and `details`, and may include one optional `link`
- the site derives each people entry id automatically from `table type + name` and adds a numeric suffix only on collision
- `/people/` keeps the existing section block order and preserves TOML file order within each rendered section
- the homepage reads the one current `[[member]]` entry whose `group` is `director`

Example:

```toml
[[member]]
name = "A/Prof. Hamid Rezatofighi"
group = "director"
image = "images/team/115_Hamid Rezatofigih_10012025.jpg"
details = [
  "Associate Professor, Department of Data Science & AI",
  "Interested in Computer vision, Robot vision & Deep learning",
]
links = [
  { kind = "email", label = "Email", url = "mailto:Hamid.Rezatofighi@monash.edu" },
  { kind = "website", label = "Website", url = "https://research.monash.edu/en/persons/hamid-rezatofighi" },
]

[[alumni]]
name = "Huangying Zhan"
group = "postdocs"
details = [
  "Postdoc, University of Adelaide, 2020-2022",
  "Now Scientist at OPPO US Research Center",
]
link = "https://huangying-zhan.github.io/"
```

### Research `/research/`

Edit these files:

- `src/content/site/research-route.md` for route-level header copy
- `src/content/research/overview.md` for overview copy and support lists
- `src/content/research/topics/*.md` for research areas and topic cards
- `src/content/research/benchmarks/*.md` for benchmark and dataset spotlight entries

Important constraints:

- keep frontmatter `kind` correct for overview, topic, and benchmark entries
- topic and benchmark entries should keep valid `localeKey`, `slug`, `sortOrder`, and image fields
- benchmark `primaryUrl` values that still point at retired legacy `.html` pages are rendered as preserved archive chips, not active canonical routes

### Publications `/publications/`

Edit these files:

- `src/content/site/publications-route.md` for archive header copy and CTA labels
- `src/content/publications/index.toml` for the archive records themselves

Important constraints:

- use a compact `[[item]]` list in `src/content/publications/index.toml`
- required fields are `title`, `year`, `authors`, `venue`, `image`, and `links`
- optional escape hatches are `note`, `homeRank`, and `archiveGroup`
- `year` must be a valid integer
- `image` should point to an asset under `public/`
- the site derives each internal publication id automatically from `year + title` and adds a numeric suffix only on collision
- `/publications/` sorts items by year descending and preserves TOML file order within the same year
- `archiveGroup` defaults to `String(year)` and should be set only when a legacy bucket label must be preserved, such as `2015-2018`
- the homepage renders the four lowest `homeRank` values, sorted by ascending `homeRank`, then year, then TOML order

Example:

```toml
[[item]]
year = 2023
title = "Unifying Flow, Stereo and Depth Estimation"
authors = ["Haofei Xu", "Jing Zhang", "Jianfei Cai", "Hamid Rezatofighi", "Fisher Yu", "Dacheng Tao", "Andreas Geiger"]
venue = "IEEE Transactions on Pattern Analysis and Machine Intelligence, 2023"
image = "images/pub/Screenshot-from-2023-01-0418-23-26.png"
links = [
  { kind = "pdf", label = "PDF", url = "https://arxiv.org/pdf/2211.05783" },
  { kind = "github", label = "GitHub", url = "https://github.com/autonomousvision/unimatch" },
  { kind = "project", label = "Project page", url = "https://haofeixu.github.io/unimatch" },
]
homeRank = 1

[[item]]
year = 2018
archiveGroup = "2015-2018"
title = "Deep Auto-Set: A Deep Auto-Encoder-Set Network for Activity Recognition Using Wearables"
authors = ["Alireza Abedin Varamin", "Ehsan Abbasnejad", "Qinfeng Shi", "Damith C. Ranasinghe", "Hamid Rezatofighi"]
venue = "EAI International Conference on Mobile and Ubiquitous Systems. Computing, Networking and Services, 2018"
image = "images/pub/Deep-Auto-Set.jpg"
links = [
  { kind = "pdf", label = "PDF", url = "https://arxiv.org/pdf/1811.08127.pdf" },
]
```

Legacy parity helper:

```bash
node scripts/compare-publications-migration.mjs
```

The publications comparison script checks the compact TOML archive against `../vl4ai-website-old/publications.html` and tolerates only documented legacy anomalies, such as duplicate rows that appear twice in the old archive.

### News `/news/`

Edit these files:

- `src/content/site/news-route.md` for archive header copy and archive CTA text
- `src/content/news/index.toml` for the full news timeline

Important constraints:

- use a compact `[[item]]` list with only `date`, `title`, `summary`, `link`, and `image`
- `date` must use `YYYY-MM-DD`
- `image` should point to an asset under `public/`
- the site derives the entry id automatically from `date + title` and adds a numeric suffix if a duplicate would collide
- the homepage pulls the newest three items by date, and items with the same date stay in file order

Example:

```toml
[[item]]
date = "2026-02-01"
title = "Our work MATA published in ICLR."
summary = "Congrats to Zhixi. Read paper here."
link = "https://arxiv.org/pdf/2601.19204"
image = "images/news/mata.png"
```

### Positions `/positions/`

Edit these files:

- `src/content/site/positions-route.md` for route-level header copy
- `src/content/positions/overview.md` for lab-wide recruitment guidance, essential skills, important links, and inclusion language
- `src/content/positions/openings/*.md` for prose-heavy preserved openings
- `src/content/positions/openings/*.toml` for shorter flat opening records

Important constraints:

- frontmatter or TOML `kind` must stay `overview` or `opening`
- opening `status` must stay within the existing allowed values
- open positions should expose a `primaryUrl` or at least one link
- preserved opening records remain visible on `/positions/`, but they do not restore legacy detail routing

### Contact `/contact/`

Edit these files:

- `src/content/site/contact-route.md` for page header copy
- `src/content/site/contact.toml` for phone, email, office hours, address lines, map URL, and map embed URL
- `src/content/site/lab.toml` for the lab name, description, location, and logo metadata reused on the contact page and shared shell

### Shared site metadata

The following file supports shared lab identity outside a single page:

- `src/content/site/lab.toml`

Use it when you need to update:

- lab short and full names
- lab metadata such as name, description, location, and logo
- primary location text
- logo path and alternate names

## Asset workflow

1. Add new assets under `public/`, usually in one of these folders:
   - `public/images/team/`
   - `public/images/news/`
   - `public/images/pub/`
   - `public/images/slider/`
   - `public/files/`
2. Reference the asset from content as `images/...` or `files/...`.
3. Do not point content at `new_design/`.

## Verification order

Run commands from the repo root in this order whenever you prepare a content or docs handoff:

### 1. Lint the repo

```bash
pnpm lint
```

This runs TypeScript checking plus `scripts/validate-source-links.mjs`.

### 2. Validate Astro collections and types

```bash
pnpm check
```

This is the maintainer alias for Astro content and type validation.

### 3. Build the static site

```bash
pnpm build
```

This emits the canonical static route surface in `dist/`. After task 11, the public output should contain only the canonical slash routes plus `/404.html`. It should not emit legacy `.html` compatibility pages.

### 4. Preview the built output

```bash
pnpm preview --host 0.0.0.0 --port 4321
```

`pnpm preview` serves the current `dist/` tree. If you change source or content files, rebuild before trusting preview or Playwright results.

### 5. Run the Playwright smoke suite

```bash
pnpm test:e2e
```

This command first validates built links with `pnpm verify:dist-links`, then starts preview on port `4321`, then runs the serial smoke suite in `tests/e2e/smoke.spec.ts`.

### 6. Run the full repo gate

```bash
pnpm verify
```

`pnpm verify` is the final release gate. Today it expands to lint, Astro check, build, and E2E coverage. The full suite is expected to pass in the current restored state.

## Evidence workflow

The smoke suite writes two classes of evidence.

### Task-scoped evidence under `.sisyphus/evidence/`

Existing route-restoration tasks write focused artifacts such as:

- `task-7-publications-desktop.png`
- `task-8-news-desktop.png`
- `task-9-positions-desktop.png`
- `task-10-contact-desktop.png`
- `task-10-contact-masked.png`
- `task-11-legacy-retirement.txt`
- `task-11-sitemap.txt`

These files are useful when you need proof for a specific route-restoration task.

### Deterministic parity evidence under `.sisyphus/evidence/parity/`

The same smoke suite now writes parity-critical artifacts to a dedicated folder:

- `route-matrix.txt` records the canonical route matrix, the final pathname observed for each canonical route, the canonical URL in the page head, and the retired legacy paths covered by the suite
- `desktop-home.png`, `desktop-people.png`, `desktop-research.png`, `desktop-publications.png`, `desktop-news.png`, `desktop-positions.png`, `desktop-contact.png`
- `mobile-home.png`, `mobile-people.png`, `mobile-research.png`, `mobile-publications.png`, `mobile-news.png`, `mobile-positions.png`, `mobile-contact.png`

Determinism rules in the suite:

- screenshots are taken after a fresh navigation per route
- Playwright disables animations and hides the caret for captured screenshots
- the contact parity screenshots mask the live map region so iframe changes do not create noise
- the route matrix is generated from the canonical route contract and the current preview output, so it stays aligned with the supported public surface

If parity evidence is missing, rerun `pnpm build` and then `pnpm test:e2e`.

## What should not be edited for routine maintenance

- `new_design/`
- generated `dist/` output
- legacy compatibility routes, because they are retired
- Astro components or layouts for content-only updates

## Release checklist

1. Edit the correct file under `src/content/`.
2. Add new assets under `public/` if needed.
3. Run `pnpm lint`.
4. Run `pnpm check`.
5. Run `pnpm build`.
6. Run `pnpm preview --host 0.0.0.0 --port 4321` for a quick visual pass.
7. Run `pnpm test:e2e`.
8. Run `pnpm verify`.
9. Review `.sisyphus/evidence/` and `.sisyphus/evidence/parity/` if the change is parity-sensitive.
10. Deploy `dist/` to your static host.
