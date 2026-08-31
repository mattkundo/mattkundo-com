#!/usr/bin/env node
// Thin gate in front of `node --test`.
//
// Node's test runner silently drops any listed file that does not exist, as
// long as at least one other listed file is still present, and exits 0
// anyway (it only errors when every listed file is missing). That defeats
// the point of listing files explicitly: an agent with write access to
// test/ could delete a failing test file, or gut individual tests from
// inside one, and ship a green run. This script closes both holes:
//
//   1. Every expected file's existence is checked before tests run. A
//      missing file fails loudly and names itself.
//   2. The total test count node --test reports is compared against a
//      floor. Gutting tests from inside a surviving file drops the count
//      without deleting a file, so file-existence alone can't catch it.
//
// Adding a test file or a test: bump EXPECTED_FILES / MINIMUM_TEST_COUNT
// below. Those two constants are the one place to touch.

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const TEST_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "test");

// Add a new test file here when you add one.
const EXPECTED_FILES = ["content-rules.test.js", "schema.test.js"];

// The current known-good total. Raise it when you add tests. Only lower it
// if you can say why the count is supposed to drop.
const MINIMUM_TEST_COUNT = 18;

const missing = EXPECTED_FILES.filter((f) => !existsSync(path.join(TEST_DIR, f)));
if (missing.length > 0) {
  console.error(
    `FAIL: expected test file(s) missing: ${missing.join(", ")}\n` +
      `Update EXPECTED_FILES in scripts/test-gate.mjs if this file was intentionally renamed or removed.`
  );
  process.exit(1);
}

const files = EXPECTED_FILES.map((f) => path.join(TEST_DIR, f));
const result = spawnSync(process.execPath, ["--test", ...files], {
  stdio: ["inherit", "pipe", "inherit"],
  encoding: "utf8",
});

process.stdout.write(result.stdout ?? "");

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const match = (result.stdout ?? "").match(/^# tests (\d+)$/m);
if (!match) {
  console.error("FAIL: could not find a test count in node --test output.");
  process.exit(1);
}

const count = Number(match[1]);
if (count < MINIMUM_TEST_COUNT) {
  console.error(
    `FAIL: only ${count} tests ran, expected at least ${MINIMUM_TEST_COUNT}. ` +
      `A test file survived but appears to have lost tests. If a removal was intentional, ` +
      `lower MINIMUM_TEST_COUNT in scripts/test-gate.mjs; otherwise a test went missing.`
  );
  process.exit(1);
}

console.log(
  `OK: ${count} tests ran across ${EXPECTED_FILES.length} files (minimum ${MINIMUM_TEST_COUNT}).`
);
