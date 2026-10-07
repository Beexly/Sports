/**
 * Tests for scripts/guardrails/node-container-parity.mjs.
 *
 * Run: node --test scripts/guardrails/node-container-parity.test.mjs
 *
 * The last test is the one that matters most: it asserts the REPO'S OWN state,
 * so it fails on a tree where a container has drifted off the pin or where no
 * pin file exists. That is what makes this a regression test rather than a test
 * of its own fixtures.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { isCandidate, parseImageRef, parseNodeImageLine, scanFile, tagMajor } from "./node-container-parity.mjs";
import { readPinnedMajor } from "../lib/node-runtime-pin.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "../..");
const GUARD = "scripts/guardrails/node-container-parity.mjs";
const FIXTURES = "scripts/guardrails/fixtures/node-container-parity";

/** @param {string[]} args */
function runGuard(args) {
  const result = spawnSync(process.execPath, [GUARD, ...args], { cwd: REPO_ROOT, encoding: "utf8" });
  return { code: result.status, out: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}

test("parseImageRef only claims the official node image", () => {
  assert.equal(parseImageRef("node:20-alpine"), "20-alpine");
  assert.equal(parseImageRef("node"), "");
  assert.equal(parseImageRef("library/node:20"), "20");
  assert.equal(parseImageRef("docker.io/library/node:20-bookworm"), "20-bookworm");
  assert.equal(parseImageRef("node:20@sha256:abc"), "20");
  assert.equal(parseImageRef("nodered/node-red:3"), null);
  assert.equal(parseImageRef("ghcr.io/shopify/toxiproxy:2.9.0"), null);
  assert.equal(parseImageRef("postgres:16-alpine"), null);
  assert.equal(parseImageRef("node:${NODE_TAG}"), null);
});

test("tagMajor reads a major only from a tag that states one", () => {
  assert.equal(tagMajor("20"), 20);
  assert.equal(tagMajor("20-alpine"), 20);
  assert.equal(tagMajor("20.20.2"), 20);
  assert.equal(tagMajor("22.11.0-bookworm-slim"), 22);
  assert.equal(tagMajor("latest"), null);
  assert.equal(tagMajor("alpine"), null);
  assert.equal(tagMajor(""), null);
});

test("parseNodeImageLine handles the FROM and image: shapes the repo uses", () => {
  assert.deepEqual(parseNodeImageLine("FROM node:20-alpine AS base"), { kind: "from", tag: "20-alpine" });
  assert.deepEqual(parseNodeImageLine("FROM --platform=linux/amd64 node:20"), { kind: "from", tag: "20" });
  assert.deepEqual(parseNodeImageLine("    image: node:22-alpine"), { kind: "image", tag: "22-alpine" });
  assert.deepEqual(parseNodeImageLine('  image: "node:20"'), { kind: "image", tag: "20" });
  assert.deepEqual(parseNodeImageLine("  - image: node:20"), { kind: "image", tag: "20" });
  assert.equal(parseNodeImageLine("FROM base AS builder"), null);
  assert.equal(parseNodeImageLine("  image: postgres:16-alpine"), null);
  assert.equal(parseNodeImageLine("# FROM node:22 was considered"), null);
});

test("scanFile flags a drifted major and says which majors are involved", () => {
  const findings = scanFile("x/docker-compose.yml", "services:\n  m:\n    image: node:22-alpine\n", 20);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, "container-major-drift");
  assert.equal(findings[0].line, 3);
  assert.match(findings[0].detail, /runs Node 22/);
  assert.match(findings[0].detail, /pins Node 20/);
});

test("scanFile flags a floating tag and suggests the pinned replacement", () => {
  const findings = scanFile("x/Dockerfile", "FROM node:alpine\nFROM node\n", 20);
  assert.equal(findings.length, 2);
  assert.ok(findings.every((f) => f.rule === "container-unpinned"));
  assert.match(findings[0].detail, /node:20-alpine/);
  assert.match(findings[1].detail, /node:20/);
});

test("scanFile is silent on a file that matches the pin", () => {
  assert.deepEqual(scanFile("x/Dockerfile", "FROM node:20-alpine AS base\nFROM base AS build\n", 20), []);
});

test("isCandidate picks up Dockerfile variants and YAML only", () => {
  assert.equal(isCandidate("Dockerfile"), true);
  assert.equal(isCandidate("Dockerfile.tlaps"), true);
  assert.equal(isCandidate("docker-compose.chaos.yml"), true);
  assert.equal(isCandidate("ci.yaml"), true);
  assert.equal(isCandidate("README.md"), false);
  assert.equal(isCandidate("server.mjs"), false);
});

test("guard exits 0 over the clean fixtures", () => {
  const { code, out } = runGuard(["--scan-root", `${FIXTURES}/allowed`, "--pin", "20"]);
  assert.equal(code, 0, out);
  assert.match(out, /PASS/);
});

test("guard exits 1 over the drifting fixtures and names every finding", () => {
  const { code, out } = runGuard(["--scan-root", `${FIXTURES}/violations`, "--pin", "20"]);
  assert.equal(code, 1, out);
  assert.match(out, /container-major-drift/);
  assert.match(out, /container-unpinned/);
  assert.match(out, /compose-drift\.yml/);
  assert.match(out, /Dockerfile\.unpinned/);
});

test("REPO STATE: every Node container in this repo matches the pin", () => {
  const { code, out } = runGuard([]);
  assert.equal(code, 0, `node-container-parity failed against the repo:\n${out}`);
});

test("guard prints a runtime NOTICE exactly when the runner is off the pin", () => {
  const { out } = runGuard([]);
  const pinned = readPinnedMajor({ startDir: REPO_ROOT }).major;
  const running = Number(process.versions.node.split(".")[0]);
  if (running === pinned) {
    assert.doesNotMatch(out, /NOTICE/, `no drift notice expected while running the pinned major (${pinned})`);
  } else {
    assert.match(out, /NOTICE - Node \d+ is (?:newer|older) than the repo pin/);
  }
});
