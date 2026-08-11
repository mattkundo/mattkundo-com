# mattkundo.com

Personal site for Matt Kundo. Single page, built with 11ty, deployed on Netlify.

The design spec lives in the private `mkdm-agent-2` repo at
`docs/superpowers/specs/2026-08-11-mattkundo-com-design.md`.

## Build

```bash
npm install
npm run build   # -> _site/
npm test        # builds, then asserts the content rules
npm run serve   # local preview
```

## The numbers are generated, never typed

Every platform metric on the page renders from `src/_data/metrics.json`,
which I produce in the `mkdm-agent-2` repo:

```bash
python3 tools/w2_site_metrics.py --out /path/to/mattkundo-com/src/_data/metrics.json
```

As of this writing, that tool exists only on the branch `feat/w2-site-metrics`
in `mkdm-agent-2`, not yet on `main`. Check whether it has merged before
looking for it on a fresh `main` checkout, or point the command at the
feature branch directly if it has not.

Each value carries the exact command that derived it and a snapshot date.
I cannot generate this at build time here, because the source repo is
private. I regenerate it deliberately, then review the diff.

## Content rules, enforced by `npm test`

- First person singular. Never "we", "our", "us"
- No em or en dashes, no exclamation marks
- No platform number that is absent from `metrics.json`
- None of the retired agency claims

## Domain

`mattkundo.com` still 301 redirects to the agency site. This deploys to the
Netlify URL only.

**Do not configure a custom domain here, and do not touch this domain's DNS,
without reading section 2.3 of the spec first.** `mattkundo.com` carries
live Google Workspace mail (SPF, DKIM, DMARC, and five MX records) and is
the active sending identity for a running cold email outreach campaign. A
routine deploy or DNS edit against this domain risks breaking mail delivery
and the sender reputation that campaign depends on. If this site ever moves
onto that domain, it needs a deliberate, reviewed cutover, not a side effect
of shipping a page.
