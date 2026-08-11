import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../_site/index.html", import.meta.url), "utf8");

function jsonLd() {
  const m = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/
  );
  assert.ok(m, "no JSON-LD block found");
  return JSON.parse(m[1]);
}

test("publishes a Person entity", () => {
  const d = jsonLd();
  assert.equal(d["@context"], "https://schema.org");
  assert.equal(d["@type"], "Person");
  assert.equal(d.name, "Matt Kundo");
});

test("sameAs links the personal LinkedIn profile", () => {
  const d = jsonLd();
  assert.ok(Array.isArray(d.sameAs), "sameAs must be an array");
  assert.ok(
    d.sameAs.some((u) => u === "https://www.linkedin.com/in/mattkundo"),
    "sameAs must include the personal LinkedIn profile, not the company page"
  );
});

test("sameAs never points at the company LinkedIn page", () => {
  const d = jsonLd();
  assert.equal(
    d.sameAs.some((u) => /linkedin\.com\/company/.test(u)),
    false,
    "the company page belongs to the Organization entity, not the Person"
  );
});

test("declares jobTitle, url and an image", () => {
  const d = jsonLd();
  assert.ok(d.jobTitle, "jobTitle missing");
  assert.equal(d.url, "https://mattkundo.com");
  assert.ok(d.image, "image missing");
});

test("sitemap and robots are built", () => {
  const robots = readFileSync(new URL("../_site/robots.txt", import.meta.url), "utf8");
  const sitemap = readFileSync(new URL("../_site/sitemap.xml", import.meta.url), "utf8");
  assert.ok(robots.includes("Sitemap: https://mattkundo.com/sitemap.xml"));
  assert.ok(sitemap.includes("<loc>https://mattkundo.com/</loc>"));
});
