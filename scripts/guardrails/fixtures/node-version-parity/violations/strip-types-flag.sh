#!/usr/bin/env bash
node --experimental-strip-types scripts/report.ts
node --experimental-transform-types scripts/report.ts
