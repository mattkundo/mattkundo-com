import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../_site/index.html", import.meta.url), "utf8");
const metrics = JSON.parse(
  readFileSync(new URL("../src/_data/metrics.json", import.meta.url), "utf8")
);

// Strip tags, scripts and URLs before prose checks, so markup and links do not
// trip rules meant for sentences.
const prose = html
  .replace(/<script[\s\S]*?<\/script>/gi, " ")
  .replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/https?:\/\/\S+/g, " ");

test("contains no em or en dashes", () => {
  assert.equal(html.includes("—"), false, "em dash found");
  assert.equal(html.includes("–"), false, "en dash found");
});

test("contains no exclamation marks in prose", () => {
  assert.equal(/!/.test(prose), false, "exclamation mark found");
});

test("contains no semicolons in prose", () => {
  // Same house style rule as the dash check (CLAUDE.md rule 8): a banned AI
  // tell that the suite didn't assert on until one slipped through.
  assert.equal(/;/.test(prose), false, "semicolon found");
});

test("uses first person singular, never we/our/us", () => {
  const banned = prose.match(/\b(we|our|ours)\b/gi) || [];
  assert.deepEqual(banned, [], `plural voice found: ${banned.join(", ")}`);
  assert.equal(/\bus\b/.test(prose), false, '"us" found');
});

test("contains none of the retired agency claims", () => {
  for (const claim of ["Est. 2015", "5M+", "50+ clients", "312%", "Google Partner"]) {
    assert.equal(prose.includes(claim), false, `forbidden claim present: ${claim}`);
  }
});

test("contains none of the claims the evidence bank rejected", () => {
  // The 2026-08-24 audit of the resume evidence bank rejected these, and the first three
  // were live on this page until 2026-08-28. Fragments rather than whole sentences, for
  // the same reason the bank bans the short form: a ban on the long sentence misses every
  // paraphrase.
  //   85% CPA / 65% growth  two channels over two measurement windows welded into one claim
  //   1,662                 no system of record, and arithmetically impossible as published
  //   113%                  a percentage delta with no absolute base, so nothing falsifies it
  //   349.7% / 508,916      unfalsifiable and not reproducible respectively
  for (const claim of ["85% CPA", "65% growth", "1,662", "113%", "349.7%", "508,916"]) {
    assert.equal(prose.includes(claim), false, `rejected claim present: ${claim}`);
  }
});

test("every claimed number carries the caveat that makes it checkable", () => {
  // This is the fix for two gates disagreeing. The site gate only ever asked whether a
  // number was ALLOWED to appear, never whether its caveat appeared with it, which is how
  // $128.45 sat on a public page with no "blended cost" while the resume gate was refusing
  // to render a PDF containing exactly that. These transcribe the `requires` rules from the
  // private evidence bank. It is a hand copy, and the copy is what has to be kept honest.
  const rules = [
    ["$76,279", "channel mix", "594 x $128.45 is the spend, so it is a channel mix and not managed spend"],
    ["$128.45", "blended cost", "without the word cost it reads as revenue per enrollment"],
    ["42.6%", "23.3%", "42.6% is the peak of two variants and needs its comparator"],
  ];
  for (const [claim, caveat, why] of rules) {
    if (!prose.includes(claim)) continue;
    assert.ok(prose.includes(caveat), `${claim} appears without "${caveat}": ${why}`);
  }
});

test("the headline metrics all appear on the page", () => {
  for (const key of ["merged_prs", "elapsed_days", "tools", "tests_passed"]) {
    const formatted = metrics.metrics[key].value.toLocaleString("en-US");
    assert.ok(
      html.includes(formatted),
      `metric ${key} (${formatted}) is missing from the page`
    );
  }
});

test("every metric carries a pinned derivation command", () => {
  const entries = Object.entries(metrics.metrics);
  assert.ok(entries.length >= 9, `expected at least 9 metrics, got ${entries.length}`);
  for (const [key, m] of entries) {
    assert.ok(
      typeof m.command === "string" && m.command.length > 0,
      `metric ${key} has no derivation command, so it cannot be published`
    );
    assert.equal(typeof m.value, "number", `metric ${key} value is not a number`);
  }
});

test("no long number appears on the page that is absent from metrics.json", () => {
  // Four-digit-plus figures are the ones a hiring manager would check. Every
  // one must either be a published metric or an explicitly allowed client
  // outcome from the case studies.
  const allowed = new Set(
    Object.values(metrics.metrics).map((m) => m.value.toLocaleString("en-US"))
  );
  // Sourced client outcomes and the address, per spec section 4.4. Years are allowed
  // individually rather than by pattern, so each one still has to be defensible: 2024 is
  // the first Matt-authored engineering artifact (mkdm-gbp-scheduler, 19 commits that
  // December), which is what the pitch's "since 2024" refers to.
  // 1,662 and 142,841 came off this list on 2026-08-28 along with the claims they covered.
  // An allowlist entry is an assertion that a number traces, so one that outlives its claim
  // is exactly how a rejected figure walks back onto a public page.
  for (const n of ["76,279", "153,610", "128.45", "48,570", "2015", "2018", "2024", "2025", "2026"]) {
    allowed.add(n);
  }
  const found = prose.match(/\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b|\b\d{4,}\b/g) || [];
  const unsourced = [...new Set(found)].filter((n) => !allowed.has(n));
  assert.deepEqual(unsourced, [], `unsourced numbers on the page: ${unsourced.join(", ")}`);
});

test("states the metrics snapshot date", () => {
  assert.ok(html.includes(metrics.snapshot), "snapshot date is not disclosed on the page");
});

test("has exactly one h1", () => {
  const h1s = html.match(/<h1[\s>]/g) || [];
  assert.equal(h1s.length, 1, `expected 1 h1, found ${h1s.length}`);
});

test("makes no external network requests", () => {
  const external = html.match(/(?:src|href)="https?:\/\/(?!mattkundo\.com)[^"]+"/g) || [];
  const assets = external.filter((u) => !/rel="(canonical|me)"/.test(u) && /\.(png|jpe?g|css|js|woff2?)/.test(u));
  assert.deepEqual(assets, [], `external asset requests found: ${assets.join(", ")}`);
});
