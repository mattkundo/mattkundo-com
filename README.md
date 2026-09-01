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
- No em or en dashes, no exclamation marks, no semicolons
- No platform number that is absent from `metrics.json`
- None of the retired agency claims
- None of the claims the resume evidence bank rejected
- Every claim that needs a caveat carries it, so `$128.45` may not appear
  without "blended cost"

## The served resume PDF

`src/assets/resume/matt-kundo-resume.pdf` is linked from the homepage, so it
is as public as the page and a reader reaches it in one click.

**It must only ever be produced by the gated renderer**, which refuses to emit
a PDF when a number in the document cannot be traced to
`configs/resume_evidence.yaml` in the mkdm-agent-2 repo, when banned phrasing
appears, or when a required caveat is missing.

This is not a hypothetical. On 2026-08-31 the file served here was a
2026-08-11 render that failed that gate on six counts: `1,662`, `113%`,
`85% CPA / 65% growth`, `508,916`, `349.7%` and `8,651`, plus `$128.45` with
no "blended cost". The HTML on this page had already been corrected. The PDF
had not, and nothing here was checking it, so the corrected page linked
straight to an uncorrected document.

`npm test` reads the built HTML and cannot see inside a PDF. Verify a
replacement by hand before committing it:

```
pdftotext src/assets/resume/matt-kundo-resume.pdf - > /tmp/r.txt
python3 -c "import sys; sys.path.insert(0,'/path/to/mkdm-agent-2'); \
  from tools.resume_evidence import audit_document; \
  print(audit_document(open('/tmp/r.txt').read()) or 'CLEAN')"
```

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
