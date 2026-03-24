# VL4AI Website

This repository contains the restored VL4AI lab website as an Astro 6 static site. The canonical public information architecture now consists of seven content routes plus the not-found route:

- `/`
- `/people/`
- `/research/`
- `/publications/`
- `/news/`
- `/positions/`
- `/contact/`
- `/404.html`

Legacy top-level `.html` aliases and `/pages/*.html` compatibility routes are retired. `/404.html` is the only supported `.html` route in the public surface.

## Maintainer start here

Read [`docs/maintainer-playbook.md`](docs/maintainer-playbook.md) before making content updates. It covers:

- the restored seven-page route surface and the retired legacy paths
- the exact content ownership per page under `src/content/**`
- the maintainer verification order
- the parity evidence workflow under `.sisyphus/evidence/` and `.sisyphus/evidence/parity/`
- the deployment expectation for the generated `dist/` directory

## Content ownership at a glance

- Homepage `/`: `src/content/site/home.md`, `src/content/site/home-route.md`, the director entry from `src/content/people/index.toml`, featured items from `src/content/publications/index.toml`, and the newest three news entries from `src/content/news/index.toml`
- People `/people/`: `src/content/site/people-route.md` and `src/content/people/index.toml`
- Research `/research/`: `src/content/site/research-route.md` and `src/content/research/**`
- Publications `/publications/`: `src/content/site/publications-route.md` and `src/content/publications/index.toml`
- News `/news/`: `src/content/site/news-route.md` and `src/content/news/index.toml`
- Positions `/positions/`: `src/content/site/positions-route.md` and `src/content/positions/**`
- Contact `/contact/`: `src/content/site/contact-route.md`, `src/content/site/contact.toml`, and `src/content/site/lab.toml`

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

Maintain only those five fields. The site now derives the news entry id automatically from `date + title`, keeps the homepage to the newest three items by date, and generates archive date labels from the stored date.

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
