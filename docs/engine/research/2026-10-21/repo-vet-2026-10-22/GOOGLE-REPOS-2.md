# Google repo list, second batch, 2026-10-22

Pasted 8. Distinct 8. Metadata from `gh api`.

| repo | stars | pushed_at | license | language | verdict |
|---|---:|---|---|---|---|
| google/adk-python | 21953 | 2026-10-22T00:51:04Z | Apache-2.0 | Python | reference only |
| google/go-tpm-tools | 309 | 2026-10-22T03:09:06Z | Apache-2.0 | C | skip |
| google/langextract | 38991 | 2026-10-17T07:27:52Z | Apache-2.0 | Python | concept adopt |
| google/leveldb | 39503 | 2026-10-08T19:15:30Z | BSD-3-Clause | C++ | skip |
| google/perfetto | 6687 | 2026-10-22T02:21:19Z | Apache-2.0 | C++ | skip |
| google/python-fire | 28231 | 2026-07-01T08:19:02Z | NOASSERTION | Python | rejected by policy |
| google/stellar-engine | 58 | 2026-10-22T02:36:16Z | Apache-2.0 | HCL | skip |
| google/styleguide | 39697 | 2026-10-21T22:14:02Z | NOASSERTION | HTML | rejected by policy |

Policy: `docs/strategy/dfs-tooling-vetting-2026-09-12.md:42`. GitHub reports `NOASSERTION` for python-fire and styleguide. That is not a licence this repo can copy from. No code was taken from either.

## What was added

LangExtract's README says every extracted value is grounded to a character span in the source. The library itself calls an LLM. Ollama is not installed, and no cloud key was invented, so the package was not run.

The rule was reimplemented in `intelligence/research/grounded_span.py`. A claim is kept only if it is a substring of the source. The test uses the banked 80-record corpus: the post line "Not all 5 yard gains are created equally." is kept at its real offset. A paraphrase that is not in the file is refused.

## Not added

- adk-python is a second agent framework. Hermes is the agent runtime. A second kit does not score a game.
- go-tpm-tools talks to a TPM. The pick path does not.
- leveldb is a C++ key-value store. GSE's store is Postgres.
- perfetto is client-side tracing for Chrome-scale systems. Vendoring it does not time a TypeScript route.
- stellar-engine is Terraform for Google Cloud accreditation. This project avoids paid cloud.
- styleguide and python-fire have no usable licence grant in the GitHub metadata.

Adopted as a reimplementation 1. Reference only 1. Skipped 4. Rejected by policy 2.
