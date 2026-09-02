import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "_site");
const metrics = JSON.parse(
  readFileSync(new URL("../src/_data/metrics.json", import.meta.url), "utf8")
);

// content-rules.test.js checks the homepage, which is the claims page. This file checks
// EVERY built page, because until 2026-09-02 a new page could carry any number, any dash
// and any plural pronoun and ship unread: the gate only ever opened _site/index.html.
function pages(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const p = path.join(dir, entry);
    if (statSync(p).isDirectory()) pages(p, acc);
    else if (entry.endsWith(".html")) acc.push(p);
  }
  return acc;
}
const ALL = pages(SITE).map((p) => [path.relative(SITE, p), readFileSync(p, "utf8")]);

// Order matters and each step is here because it drew blood.
//   pre/code FIRST: a printed result inside a sample (`# 6422, 0`) is output, not a claim.
//   entities AFTER tags: stripping <b> leaves &quot; behind, and the ; that terminates
//   every entity read as 32 semicolons in one essay that contains none. Same defect the
//   compliance gate hit in the sibling repo, which is why it strips entities first too.
function toProse(html) {
  const noCode = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<pre[\s\S]*?<\/pre>/gi, " ")
    .replace(/<code[\s\S]*?<\/code>/gi, " ");
  return noCode
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/https?:\/\/\S+/g, " ");
}
// A quoted span is a MENTION, not a use. The essay on this site says so about itself:
// it trips the pronoun rule on the quoted "we" it uses to explain the pronoun rule. A
// string rule cannot tell a mention from a use, so the quotes are where the line goes.
const unquoted = (prose) => prose.replace(/"[^"]{0,160}"/g, " ");

test("no page carries an em or en dash", () => {
  for (const [name, html] of ALL) {
    assert.equal(html.includes("—"), false, `em dash in ${name}`);
    assert.equal(html.includes("–"), false, `en dash in ${name}`);
  }
});

test("no page carries an exclamation mark or semicolon in prose", () => {
  for (const [name, html] of ALL) {
    const prose = toProse(html);
    assert.equal(/!/.test(prose), false, `exclamation mark in ${name}`);
    assert.equal(/;/.test(prose), false, `semicolon in ${name}`);
  }
});

test("no page uses first person plural outside a quotation", () => {
  for (const [name, html] of ALL) {
    const bare = unquoted(toProse(html));
    const banned = bare.match(/\b(we|our|ours)\b/gi) || [];
    assert.deepEqual(banned, [], `plural voice in ${name}: ${banned.join(", ")}`);
    assert.equal(/\bus\b/.test(bare), false, `"us" in ${name}`);
  }
});

test("no page carries a retired or rejected claim", () => {
  // Retired agency copy plus the claims the 2026-08-24 evidence audit rejected. The
  // homepage has been checked for these since 2026-08-28; every other page had not.
  const forbidden = ["Est. 2015", "5M+", "50+ clients", "312%", "Google Partner",
                     "85% CPA", "65% growth", "1,662", "113%", "349.7%", "508,916"];
  for (const [name, html] of ALL) {
    const prose = toProse(html);
    for (const claim of forbidden) {
      assert.equal(prose.includes(claim), false, `rejected claim "${claim}" in ${name}`);
    }
  }
});

test("every caveat travels with the claim it makes checkable, on every page", () => {
  const rules = [
    ["$76,279", "channel mix", "bare, it reads as managed media spend"],
    ["$128.45", "blended cost", "without the word cost it reads as revenue per enrollment"],
    ["42.6%", "23.3%", "42.6% is the peak of two variants and needs its comparator"],
  ];
  for (const [name, html] of ALL) {
    const prose = toProse(html);
    for (const [claim, caveat, why] of rules) {
      if (!prose.includes(claim)) continue;
      assert.ok(prose.includes(caveat), `${name}: ${claim} without "${caveat}" (${why})`);
    }
  }
});

// Published metric values are allowed everywhere. Anything else a page states has to be
// declared here, per page, with a reason. Per page rather than in one global pool so a
// figure from an essay cannot quietly authorise the same digits on the claims page.
const GLOBAL = [
  "76,279", "153,610", "128.45", "48,570", "2015", "2018", "2024", "2025", "2026",
  "101", "594", "194", "197", "253", "38", "39", "42.6", "23.3", "15",
];
const PER_PAGE = {
  // Figures the essay states with the measurement that produced them, in the sentence.
  // The compliance-gate counts are late-August snapshots and are deliberately narrated
  // as such rather than presented as current.
  "writing/the-check-that-could-not-fail/index.html": [
    "1,135", "438", "147",          // compliance gate flags / sanitizations / blocks, late Aug
    "30", "23",                     // 30 realistic outbound shapes measured, 23 flagged
    "751", "200",                   // chars of prose after the strip; tool truncation limit
    "255", "4.8",                   // the post title, and its Search Console average position
    "11", "36", "14", "32",         // scrape coverage range, and providers seen per run
    "2,287", "3,395", "736",        // rows created / deactivated / genuinely active, one week
    "12",                           // plan names quoted from the catalog
    "27", "40",                     // signal wrong for ~27% on a random sample of 40
    "51",                           // tests shipped alongside the prose rule that day
  ],
  // Every figure here is read out of tools/repurpose/report.json, which is extracted from
  // the linked source report. The rate figures are the ones a reader would check against it.
  "work/one-report-one-short/index.html": [
    "6.69", "7.85", "9.1", "6.6",   // median, average, and the 1-12 vs 13-24 month bands
    "13", "24", "12",               // the contract-length bands themselves
    "45", "1,350", "25", "150",     // runtime seconds, frames, render seconds, lines of Python
    "31",                           // the week ends August 31
  ],
  "writing/index.html": ["45"],     // the runtime, in the blurb linking the page above
};

test("no page states a number that is neither a published metric nor declared", () => {
  const base = new Set(Object.values(metrics.metrics).map((m) => m.value.toLocaleString("en-US")));
  for (const n of GLOBAL) base.add(n);
  // A single-digit integer part must not split at the decimal point. Until 2026-09-02 the
  // pattern required 2-3 leading digits, so "6.69" was scanned as "69" and "9.1" was not
  // scanned at all. Allowlisting "69" would then have permitted those digits anywhere.
  const NUM = /\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b|\b\d+\.\d+\b|\b\d{4,}\b|\b\d{2,3}\b/g;
  for (const [name, html] of ALL) {
    const allowed = new Set([...base, ...(PER_PAGE[name] || [])]);
    const numeric = toProse(html).replace(/\b\d{4}-\d{2}-\d{2}\b/g, " ");
    const found = numeric.match(NUM) || [];
    const unsourced = [...new Set(found)].filter((n) => !allowed.has(n));
    assert.deepEqual(unsourced, [], `undeclared numbers in ${name}: ${unsourced.join(", ")}`);
  }
});

test("every page declares exactly one h1", () => {
  for (const [name, html] of ALL) {
    const h1s = html.match(/<h1[\s>]/g) || [];
    assert.equal(h1s.length, 1, `${name} has ${h1s.length} h1 elements`);
  }
});

test("the per-page allowlist has no entry for a page that no longer exists", () => {
  // An allowlist entry is an assertion that a number traces. One that outlives its page is
  // how a retired figure walks back onto the site, which is why 1,662 came off the global
  // list on 2026-08-28 along with the claim it covered.
  const names = new Set(ALL.map(([n]) => n));
  for (const name of Object.keys(PER_PAGE)) {
    assert.ok(names.has(name), `allowlist names a page that is not built: ${name}`);
  }
});
