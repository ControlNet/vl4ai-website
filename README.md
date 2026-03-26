# VL4AI Website

This repository contains the restored VL4AI lab website as an Astro 6 static site. The canonical public information architecture now consists of eight content routes plus the not-found route:

- `/`
- `/people/`
- `/research/`
- `/publications/`
- `/news/`
- `/gallery/`
- `/positions/`
- `/contact/`
- `/404.html`

Legacy top-level `.html` aliases and `/pages/*.html` compatibility routes are retired. `/404.html` is the only supported `.html` route in the public surface.

## Maintainer start here

Read [`docs/maintainer-playbook.md`](docs/maintainer-playbook.md) before making content updates. It covers:

- the restored eight-page route surface and the retired legacy paths
- the exact content ownership per page under `src/content/**`
- the maintainer verification order
- the parity evidence workflow under `.sisyphus/evidence/` and `.sisyphus/evidence/parity/`
- the deployment expectation for the generated `dist/` directory

## Content ownership at a glance

- Homepage `/`: `src/content/site/home.md`, `src/content/site/home-route.md`, the director entry from `src/content/people/index.toml`, featured items from `src/content/publications/index.toml`, and the newest six news entries from `src/content/news/index.toml`
- People `/people/`: `src/content/site/people-route.md` and `src/content/people/index.toml`
- Research `/research/`: `src/content/site/research-route.md` and `src/content/research/**`
- Publications `/publications/`: `src/content/site/publications-route.md` and `src/content/publications/index.toml`
- News `/news/`: `src/content/site/news-route.md` and `src/content/news/index.toml`
- Gallery `/gallery/`: `src/content/site/gallery-route.md` and `src/content/gallery/index.toml`
- Positions `/positions/`: `src/content/site/positions-route.md` and `src/content/positions/**`
- Contact `/contact/`: `src/content/site/contact-route.md`, `src/content/site/contact.toml`, and `src/content/site/lab.toml`

## Gallery authoring format

Gallery items now live in a compact `[[item]]` list in `src/content/gallery/index.toml`.

```toml
[[item]]
title = "Embodied Motion Study"
description = "A moving-media tile for the gallery route."
media = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
feature = true
```

Important rules:

- keep one `[[item]]` per gallery tile in `src/content/gallery/index.toml`
- required fields are `title`, `description`, and `media`
- optional `feature = true` marks a tile as the larger hero-style panel in the mosaic rhythm
- use a single string `media` for one image or video item, or an array for a rotating image sequence
- `media` values may point to local assets under `public/` or to absolute `https://` URLs for reference media
- the site derives each internal gallery id automatically from `title`, preserves TOML order for rendered layout sequencing, infers media type, derives alt text from `title`, and assigns dense-grid spans automatically
- compact Gallery parsing here is intentionally limited to quoted strings, booleans, and arrays rather than full TOML features

## News authoring format

News entries now live in a compact `[[item]]` list in `src/content/news/index.toml`.

```toml
[[item]]
date = "2026-02-01"
title = "Our work MATA published in ICLR."
summary = "Congrats to Zhixi. Read paper here."
link = "https://arxiv.org/pdf/2601.19204"
image = "images/news/mata.png"
```

Maintain only those five fields. The site now derives the news entry id automatically from `date + title`, keeps the homepage to the newest six items by date, and generates archive date labels from the stored date.

## People authoring format

People entries now live in one compact TOML file with `[[member]]` and `[[alumni]]` tables in `src/content/people/index.toml`.

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

Important rules:

- use `[[member]]` for current people and `[[alumni]]` for previous cohorts
- keep `group` editor-facing and simple: `director`, `postdocs`, `phd-students`, or `master-and-undergrad-students`
- members must include `name`, `group`, `image`, `details`, and `links`
- alumni must include `name`, `group`, and `details`, and may optionally include one `link`
- the site derives each people entry id automatically from `table type + name` and adds a numeric suffix only if a collision occurs
- `/people/` preserves TOML file order within each rendered section, so keep entries in the order you want them shown
- the homepage reads the single `[[member]]` entry with `group = "director"`

## Publications authoring format

Publications now live in a compact `[[item]]` list in `src/content/publications/index.toml`.

```toml
[[item]]
year = 2025
title = "Marginalized Generalized IoU (MGIoU): A Unified Objective Function for Optimizing Any Convex Parametric Shapes"
authors = ["Duy-Tho Le", "Trung Pham", "Jianfei Cai", "Hamid Rezatofighi"]
venue = "Annual Conference on Artificial Intelligence (AAAI), 2025"
image = "images/pub/tho_iccv.png"
links = [
  { kind = "pdf", label = "PDF", url = "https://arxiv.org/pdf/2504.16443" },
]
```

Optional escape hatches are:

- `note` for a single archive/homepage callout such as an oral or spotlight tag
- `homeRank` for homepage featured ordering; the homepage renders the top four items sorted by ascending `homeRank`, then by `year` and TOML order
- `archiveGroup` when a publication should render under a legacy bucket label instead of `String(year)`, such as `2015-2018` or the preserved `2024` bucket for a 2023 venue item

Important rules:

- maintain only `title`, `year`, `authors`, `venue`, `image`, and `links` unless one of the three optional fields is genuinely needed
- the site derives each internal publication id automatically from `year + title` and adds a numeric suffix only on collision
- `/publications/` sorts by year descending and then preserves TOML file order within the same year
- `/publications/` groups by `archiveGroup` when present, otherwise by the publication year
- the homepage no longer uses manual booleans; any item with `homeRank` is eligible for the featured list

To compare the compact source against the legacy archive HTML, run:

```bash
node scripts/compare-publications-migration.mjs
```

The script compares grouped archive structure plus row metadata and reports only documented legacy anomalies, such as duplicate rows in the old `publications.html`.

## Verification order

Run commands from the repo root in this order:

```bash
pnpm lint
pnpm check
pnpm build
pnpm preview --host 0.0.0.0 --port 4321
pnpm test:e2e
pnpm verify
```

Important workflow note: `pnpm test:e2e` previews the current `dist/` tree. Always run `pnpm build` before relying on E2E results after source or content changes.

The suite is currently expected to pass end to end, including lint, Astro check, build, Playwright smoke coverage, and the repo-wide `pnpm verify` gate.

## Evidence outputs

- Task-scoped smoke artifacts are written under `.sisyphus/evidence/`
- Deterministic parity artifacts are written under `.sisyphus/evidence/parity/`
- The parity workflow captures a route matrix text file plus desktop and mobile screenshots for the parity-critical canonical pages

## Deployment target

Deploy the generated `dist/` directory to a static host. Do not deploy `src/` or use `new_design/` as runtime site content.

## License

The work is licensed under The MIT License.
