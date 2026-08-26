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
  for (const n of ["76,279", "153,610", "128.45", "1,662", "142,841", "2015", "2018", "2024", "2026"]) {
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
