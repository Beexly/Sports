# Polymarket org, file trees not READMEs

Opened the top-level tree of all 104 repositories with `gh api repos/Polymarket/<name>/contents`. Zero listing errors.

MIT SDKs vendored into `packages/polymarket-sdks/`: ts-sdk, py-sdk, lattice-std, py-clob-client-v2, polymarket-us-python, polymarket-us-typescript, real-time-data-client, clob-client-v2, rs-clob-client-v2.

Not vendored: `builder-signing-sdk` and `py-builder-relayer-client` have no LICENSE file in the repository. Their source was not copied.

Publish stays off. `polymarketPublishAllowed()` returns false.

| repo | license | archived | top-level |
|---|---|---|---|
| agent-skills | NONE | False | README.md, SKILL.md, authentication.md, bridge.md, ctf-operations.md, gasless.md, market-data.md, order-patterns.md, websocket.md |
| agents | MIT | True | .env.example, .github, .gitignore, .pre-commit-config.yaml, CONTRIBUTING.md, Dockerfile, LICENSE.md, README.md, agents, docs, requirements.txt, scripts, +1 |
| amm-maths | NONE | True | .commitlintrc.js, .eslintignore, .eslintrc.js, .gitignore, .lintstagedrc.js, .npmignore, .prettierrc, README.md, jest.config.js, package.json, src, tsconfig.json, +2 |
| audit-checklist | NONE | True | README.md |
| balance-checker | NONE | True | .eslintrc.js, .github, .gitignore, .idea, .prettierrc.js, README.md, components, docs, global.d.ts, jest.config.js, jsdoc.json, next-env.d.ts, +9 |
| builder-relayer-client | NONE | False | .env.example, .eslintignore, .eslintrc.js, .github, .gitignore, .prettierignore, .prettierrc, Makefile, README.md, examples, package.json, pnpm-lock.yaml, +4 |
| builder-signing-sdk | NONE | False | .env.example, .github, .gitignore, README.md, package.json, pnpm-lock.yaml, src, tests, tsconfig.json, tsconfig.production.json, vitest.config.ts |
| builder-signing-server | NONE | False | .env.example, .gitignore, Makefile, README.md, package.json, pnpm-lock.yaml, src, tsconfig.json, tsconfig.production.json |
| cachethq-docker | BSD-3-Clause | True | .dockerignore, .gitattributes, .github, CHANGELOG.md, CONTRIBUTING.md, Dockerfile, LICENSE, Makefile, README.md, conf, docker-compose.yml, entrypoint.sh, +4 |
| clob-client | MIT | True | .claude, .env.example, .gitattributes, .github, .gitignore, .npmignore, .vscode, LICENSE, README.md, biome.json, examples, package.json, +7 |
| clob-client-l2-auth | NONE | True | .env.example, .gitignore, README.md, app.ts, package-lock.json, package.json |
| clob-client-v2 | MIT | False | .env.example, .github, .gitignore, .husky, .npmignore, .vscode, LICENSE, README.md, biome.json, examples, package.json, pnpm-lock.yaml, +6 |
| clob-order-utils | NONE | False | .editorconfig, .eslintignore, .eslintrc.cjs, .github, .gitignore, .npmignore, .prettierignore, .prettierrc.json, Makefile, README.md, package.json, src, +3 |
| conditional-token-examples | NONE | False | .env.example, .eslintignore, .eslintrc.js, .gitignore, .prettierignore, .prettierrc, README.md, package.json, src, tsconfig.json, yarn.lock |
| conditional-token-examples-py | MIT | True | .env.example, .gitignore, LICENSE, README.md, ctf_examples, requirements.txt |
| conditional-tokens-contracts | LGPL-3.0 | False | .env.example, .eslintignore, .eslintrc.js, .gitattributes, .gitignore, .npmignore, .soliumignore, .soliumrc.json, LICENSE, README.rst, config, contracts, +9 |
| conditional-tokens-market-makers | LGPL-3.0 | True | .eslintignore, .eslintrc.js, .gitattributes, .gitignore, .npmignore, .solhint.json, .travis.yml, LICENSE, codechecks.yml, contracts, docs, inheritanceMap.json, +7 |
| connect-swift | Apache-2.0 | False | .github, .gitignore, .swiftlint.yml, .swiftpm, Connect-Swift-Mocks.podspec, Connect-Swift.podspec, Examples, LICENSE, Libraries, MAINTAINERS.md, Makefile, Package.resolved, +5 |
| contract-security | NONE | False | README.md, audit-reports |
| cosmos-delegation-js | Apache-2.0 | True | .babelrc, .circleci, .eslintrc.json, .gitignore, .npmignore, LICENSE, README.md, jest.config.integration.js, jest.config.js, jest.config.unit.js, package.json, src, +2 |
| ctf-exchange | MIT | True | .env.example, .github, .gitignore, .gitmodules, .prettierrc, LICENSE.md, README.md, artifacts, audit, broadcast, deploy, docs, +7 |
| ctf-exchange-v2 | NOASSERTION | False | .env.example, .gas-snapshot, .github, .gitignore, .gitmodules, .prettierrc, .solhint.json, CLAUDE.md, LICENSE.md, README.md, artifacts, audits, +7 |
| ctf-utils | NONE | False | .gitignore, README.md, package.json, src, test, tsconfig.json, yarn.lock |
| deploy-ctf | NONE | True | .env.example, .eslintignore, .eslintrc.js, .gitignore, .prettierignore, .prettierrc, README.md, api, components, context, hooks, models, +9 |
| erpc | Apache-2.0 | False | .cursorrules, .dockerignore, .github, .gitignore, .goreleaser.yaml, .semrelrc, .vscode, CLA.md, CODE_OF_CONDUCT.md, CONTRIBUTING.md, Dockerfile, Dockerfile.fake, +36 |
| examples | NONE | True | .env.example, .eslintignore, .eslintrc.js, .gitignore, .prettierignore, .prettierrc, README.md, examples, package.json, src, tsconfig.json, yarn.lock |
| exchange-fee-module | NONE | False | .env.example, .gas-snapshot, .github, .gitignore, .gitmodules, README.md, artifacts, foundry.toml, lib, scripts, src |
| eztz | MIT | True | .editorconfig, .gitignore, .travis.yml, ISSUE_TEMPLATE.md, LICENSE, PROTO_003_FEES.md, README.md, cli, dist, example_node.js, examples, index.js, +6 |
| forge-template | Unlicense | True | .gas-snapshot, .github, .gitignore, .gitmodules, LICENSE, README.md, foundry.toml, lib, src, test |
| fx-portal | MIT | True | .github, .gitignore, LICENSE, README.md, contracts, hardhat.config.js, package-lock.json, package.json |
| go-builder-signing-sdk | MIT | False | .github, .gitignore, LICENSE, README.md, examples, go.mod, go.sum, helpers, local.go, remote.go, signer.go, signer_test.go |
| go-ctf-utils | NONE | False | .github, .gitignore, .gitmodules, Makefile, README.md, foundry.toml, fuzz, go.mod, go.sum, lib, utils |
| go-ethereum-hdwallet | MIT | False | .github, .gitignore, .golangci.yaml, LICENSE, Makefile, README.md, cmd, go.mod, go.sum, hdwallet.go, hdwallet_test.go |
| go-market-events | NONE | False | .editorconfig, .gitignore, .golangci.yaml, Makefile, README.md, constants, contracts, go.mod, go.sum, logger, main.go, watcher |
| go-order-utils | NONE | False | .editorconfig, .github, .gitignore, .golangci.yaml, Makefile, README.md, go.mod, go.sum, pkg |
| go-redeemtions | NONE | False | README.md, conditional_tokens, go.mod, go.sum, main.go |
| insta-exit-sdk | MIT | True | .gitignore, LICENSE, README.md, package.json, src, tsconfig.json, tslint.json, yarn.lock |
| irisnet-crypto | Apache-2.0 | True | .eslintrc.js, .github, .gitignore, CHANGELOG.md, LICENSE, README.md, config.json, docs, index.js, package-lock.json, package.json, src, +2 |
| lattice-std | MIT | False | .github, .gitignore, LICENSE, README.md, bash, docs, foundry.toml, script, src, test |
| leaderboard-username | NONE | False | .env.example, .eslintignore, .eslintrc.js, .gitignore, .prettierignore, .prettierrc, README.md, package.json, src, tsconfig.json, yarn.lock |
| ledger-cosmos-js | Apache-2.0 | True | .gitignore, LICENSE, README.md, browser, package-lock.json, package.json, src, tests |
| livepeerjs | MIT | True | .circleci, .dockerignore, .editorconfig, .github, .gitignore, .prettierignore, CHANGELOG.md, CODE_OF_CONDUCT.md, CONTRIBUTING.md, Dockerfile, LICENSE, PULL_REQUEST_TEMPLATE.md, +7 |
| magic-proxy-builder-example | NONE | True | .env.local, .gitignore, README.md, app, components, constants, eslint.config.mjs, hooks, next.config.ts, package-lock.json, package.json, postcss.config.mjs, +3 |
| magic-safe-builder-example | NONE | True | .env.local, .gitignore, README.md, app, components, constants, eslint.config.mjs, hooks, lib, next.config.ts, package-lock.json, package.json, +4 |
| market-maker-keeper | AGPL-3.0 | True | .github, .gitignore, .gitmodules, .python-version, COPYING, Dockerfile, README.md, bin, docker-compose.yml, install-dev.sh, install.sh, lib, +5 |
| matic-proofs | MIT | False | .circleci, .editorconfig, .eslintignore, .eslintrc.js, .gitignore, .mocharc.json, .npmignore, .nvmrc, .prettierrc, LICENSE, README.md, contracts, +8 |
| matic-withdrawal-batcher | NONE | True | .commitlintrc.js, .editorconfig, .env.example, .eslintignore, .eslintrc.yaml, .gitattributes, .gitignore, .huskyrc, .mocharc.json, .prettierignore, .prettierrc, .solcover.js, +14 |
| matic-withdrawal-batching-subgraph | MIT | True | .eslintignore, .eslintrc.js, .gitignore, .prettierrc.js, LICENSE.md, README.md, networks.yaml, package.json, schema.graphql, src, subgraph.template.yaml, templatify.ts, +2 |
| multi-endpoint-provider | NONE | True | .commitlintrc.js, .eslintignore, .eslintrc.js, .gitignore, .lintstagedrc.js, .npmignore, .prettierrc, README.md, jest.config.js, package.json, src, test, +4 |
| neg-risk-ctf-adapter | NONE | False | .github, .gitignore, .gitmodules, .vscode, README.md, addresses.json, artifacts, audit, docs, foundry.lock, foundry.toml, lib, +4 |
| perpetuals-examples | NONE | False | .gitignore, python |
| poly-ct-scripts | MIT | False | .env.example, .github, .gitignore, .gitmodules, .vscode, LICENSE.txt, README.md, artifacts, deployments, foundry.toml, lib, remappings.txt, +3 |
| poly-market-maker | MIT | False | .dockerignore, .env.example, .flake8, .github, .gitignore, Dockerfile, LICENSE.txt, Makefile, README.md, bin, config.env, config, +11 |
| poly-py-eip712-structs | MIT | False | .gitignore, API.md, LICENSE, README.md, poly_eip712_structs, requirements.txt, setup.py, tests |
| PolyLend | NONE | False | .github, .gitignore, .gitmodules, .vscode, README.md, artifacts, foundry.toml, lcov.info, lib, src |
| polymarket-bounties | NONE | True | .browserslistrc, .eslintrc.js, .gitignore, .prettierrc.js, README.md, babel.config.js, package.json, public, src, tsconfig.json, yarn.lock |
| polymarket-cli | NONE | False | .gitattributes, .github, .gitignore, Cargo.lock, Cargo.toml, Formula, README.md, install.sh, scripts, src, tests |
| polymarket-liq-mining | NONE | False | .github, .gitignore, .husky, .vscode, merkle-distributor, package.json, sdk, snapshots, yarn.lock |
| polymarket-liquidity-requests | MIT | True | .gitattributes, .github, .gitignore, LICENSE, README.md, docs, package.json, packages, yarn.lock |
| polymarket-mev-bundle-poc | NONE | False | .env.example, .gitignore, README.md, package.json, src, tsconfig.json |
| polymarket-sdk | MIT | False | .github, .gitignore, .npmignore, .npmrc, LICENSE, README.md, biome.json, package.json, pnpm-lock.yaml, src, test, tsconfig.json, +2 |
| polymarket-status-tool | NONE | True | .env.example, .gitignore, README.md, abi, constants.ts, getBalance.ts, helpers, package.json, server.ts, tsconfig.json, yarn-error.log |
| polymarket-subgraph | LGPL-3.0 | False | .eslintignore, .eslintrc.js, .gitignore, .prettierignore, .prettierrc.js, LICENSE, README.md, abis, activity-subgraph, common, docker-compose.yml, fee-module-subgraph, +13 |
| polymarket-us-python | MIT | False | .github, .gitignore, LICENSE, README.md, examples, polymarket_us, pyproject.toml, tests |
| polymarket-us-typescript | MIT | False | .github, .gitignore, CONTRIBUTING.md, LICENSE, README.md, biome.json, jest.config.js, package.json, pnpm-lock.yaml, src, tests, tsconfig.json, +3 |
| polymarket-v2-external | NOASSERTION | False | .gas-snapshot, .github, .gitignore, .gitmodules, .hooks, .storage-layouts, .vscode, LICENSE.md, Makefile, README.md, artifacts, audit, +8 |
| positions-subgraph | NONE | False | .gitignore, README.md, abis, docker-compose.yaml, networks.json, package.json, pnpm-lock.yaml, schema.graphql, src, subgraph.yaml, tsconfig.json, yarn.lock |
| privy-safe-builder-example | NONE | True | .env.local, .gitignore, README.md, app, components, constants, eslint.config.mjs, hooks, next.config.ts, package-lock.json, package.json, postcss.config.mjs, +3 |
| proxy-factories | LGPL-3.0 | False | .gitignore, LICENSE, README.md, packages |
| py-builder-relayer-client | NONE | False | .editorconfig, .env.example, .github, .gitignore, Makefile, README.md, examples, py_builder_relayer_client, requirements.txt, setup.py, tests |
| py-builder-signing-sdk | NONE | False | .editorconfig, .env.example, .github, .gitignore, Makefile, README.md, py_builder_signing_sdk, requirements.txt, setup.py, tests |
| py-clob-client | MIT | True | .editorconfig, .env.example, .github, .gitignore, CONTRIBUTING.md, LICENSE, Makefile, README.md, SECURITY.md, examples, py_clob_client, requirements.txt, +2 |
| py-clob-client-l2-auth | NONE | True | .env.example, .gitignore, README.md, app.py, requirements.txt |
| py-clob-client-v2 | MIT | False | .env.example, .github, .gitignore, LICENSE, Makefile, README.md, examples, py_clob_client_v2, pytest.ini, requirements.txt, setup.py, tests |
| py-merge-split-positions | NONE | False | .env.example, .gitignore, Makefile, README.md, merge-split.py, requirements.txt |
| py-sdk | MIT | False | .editorconfig, .env.example, .github, .gitignore, .python-version, .release-please-manifest.json, .vscode, AGENTS.md, CHANGELOG.md, CLAUDE.md, CONTRIBUTING.md, LICENSE, +10 |
| pyexchange | AGPL-3.0 | True | .github, .gitignore, .gitmodules, .python-version, COPYING, README.md, docker-compose.yml, install.sh, lib, pyexchange, requirements-dev.txt, requirements.txt, +3 |
| python-order-utils | MIT | False | .editorconfig, .github, .gitignore, LICENSE, Makefile, README.md, py_order_utils, pyproject.toml, requirements.txt, setup.py, tests |
| real-time-data-client | MIT | False | .env.example, .gitattributes, .github, .gitignore, .npmignore, .prettierignore, .prettierrc, .vscode, LICENSE, Makefile, README.md, eslint.config.mjs, +6 |
| redis-leaderboard | NONE | True | .eslintrc.js, .gitignore, .prettierrc.js, Procfile, build.ts, jsdoc.json, package.json, spec, src, tsconfig.json, tsconfig.prod.json, yarn.lock |
| relayer-deposits | NONE | False | .env.example, .gitignore, README.md, package.json, packages, start.sh, test_sdk.sh, yarn.lock |
| resolution-subgraph | MIT | False | .env.example, .gitignore, LICENSE, README.md, abis, docker-compose.yaml, generated, networks.json, package.json, schema.graphql, src, subgraph.yaml, +3 |
| rmqprom | NONE | False | .github, .gitignore, .golangci.yaml, Makefile, README.md, go.mod, go.sum, rmqprom.go |
| routing-api | GPL-3.0 | False | .github, .gitignore, .nvmrc, .prettierignore, LICENSE, README.md, bin, cdk.json, hardhat.config.js, jest.config.ts, lib, package-lock.json, +5 |
| rs-clob-client | MIT | True | .github, .gitignore, .idea, .pre-commit-config.yaml, .vscode, CHANGELOG.md, Cargo.lock, Cargo.toml, LICENSE, README.md, SECURITY.md, assets, +6 |
| rs-clob-client-v2 | MIT | False | .github, .gitignore, .idea, .pre-commit-config.yaml, .vscode, CHANGELOG.md, Cargo.lock, Cargo.toml, LICENSE, README.md, SECURITY.md, assets, +6 |
| s3x | Apache-2.0 | True | .dockerignore, .github, .gitignore, .mailmap, .travis.yml, CONTRIBUTING.md, CREDITS, Dockerfile, Dockerfile.dev, Dockerfile.mint, Dockerfile.release, Dockerfile.simpleci, +20 |
| safe-wallet-integration | NONE | True | .env.local, .gitignore, README.md, app, components, constants, eslint.config.mjs, hooks, next.config.ts, package-lock.json, package.json, postcss.config.mjs, +3 |
| solcurity | NONE | True | README.md |
| status-page-front | NONE | True | .babelrc, .eslintignore, .eslintrc.js, .github, .gitignore, .prettierignore, .prettierrc, README.md, components, jest.config.js, next-env.d.ts, package.json, +5 |
| tezbridge-crypto | MIT | True | .flowconfig, .gitignore, .travis.yml, LICENSE, PsBABY5H, PsBabyM1, PsddFKi3, Pt24m4xi, README.md, flow-typed, hdkey, lib, +4 |
| ts-merge-split-positions | NONE | True | .env.example, .gitignore, README.md, merge-split.ts, package-lock.json, package.json |
| ts-sdk | MIT | False | .brunson, .changeset, .claude, .editorconfig, .env.example, .github, .gitignore, .npmrc, .nvmrc, .prettierignore, .vscode, AGENTS.md, +16 |
| turnkey-safe-builder-example | NONE | True | .env.local, .gitignore, README.md, app, components, constants, eslint.config.mjs, hooks, next.config.ts, package-lock.json, package.json, postcss.config.mjs, +3 |
| tvl-subgraph | NONE | True | .gitignore, abis, build, docker-compose.yml, generated, networks.json, package.json, schema.graphql, src, subgraph.yaml, tsconfig.json, yarn.lock |
| uma-binary-adapter-sdk | MIT | False | .env.example, .eslintignore, .eslintrc.js, .github, .gitignore, .prettierignore, .prettierrc, LICENSE, README.md, package.json, src, tsconfig.json, +1 |
| uma-ctf-adapter | MIT | False | .env.example, .gas-snapshot, .github, .gitignore, .gitmodules, .prettierignore, .prettierrc, LICENSE.md, README.md, artifacts, audit, deploy, +6 |
| uma-ctf-adapter-sdk | MIT | False | .eslintignore, .eslintrc.js, .gitignore, .prettierignore, .prettierrc, LICENSE, README.md, package.json, src, tsconfig.json, yarn.lock |
| uma-sports-oracle | NONE | False | .env.example, .gas-snapshot, .github, .gitignore, .gitmodules, README.md, artifacts, audit, docs, foundry.toml, lib, script, +1 |
| vigil | NONE | False | .agents, .claude, .cursor, .factory, .gitignore, AGENTS.md, CLAUDE.md, convex, docs, electron.vite.config.ts, electron, out, +6 |
| vue-components | Apache-2.0 | True | .circleci, .dockerignore, .editorconfig, .eslintignore, .eslintrc.js, .github, .github_changelog_generator, .gitignore, .markdownlint.json, .postcssrc.js, .stylintrc, CHANGELOG.md, +11 |
| wagmi-safe-builder-example | NONE | True | .env.local, .gitignore, README.md, app, components, constants, eslint.config.mjs, hooks, next.config.ts, package-lock.json, package.json, postcss.config.mjs, +3 |
| web3-react-multichain | GPL-3.0 | True | .eslintrc.js, .github, .gitignore, LICENSE, README.md, docs, example, lerna.json, package.json, packages, tsconfig.json, yarn.lock |
| withdrawal-checker | NONE | True | .eslintrc.json, .gitignore, .prettierrc.js, README.md, jest.config.js, jsdoc.json, next-env.d.ts, next.config.js, package.json, pages, public, styles, +4 |
