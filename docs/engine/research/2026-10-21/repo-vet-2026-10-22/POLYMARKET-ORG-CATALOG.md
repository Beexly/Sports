# Polymarket org catalog

Fetched with `gh api orgs/Polymarket/repos?per_page=100&sort=updated --paginate` on 2026-10-22.
Repos: 104. Archived: 47. Not archived: 57.

This is GitHub metadata. It is not a market-data ingest. `apps/web/lib/data-sources/source-router.ts` marks `polymarket-gamma` `cleared: false` with the note "COMPLIANCE HOLD. Cron removed (3dfbc726). Re-enable only with counsel-approved registry entry permitting storage + commercial_display." That flag was not flipped. No prices were stored.

## Licence counts

- NONE: 51
- MIT: 34
- Apache-2.0: 7
- LGPL-3.0: 4
- NOASSERTION: 2
- AGPL-3.0: 2
- GPL-3.0: 2
- Unlicense: 1
- BSD-3-Clause: 1

51 repos have no licence (`NONE`). `docs/strategy/dfs-tooling-vetting-2026-09-12.md:42` says that is all rights reserved. Those were not copied.

## Language counts

- TypeScript: 43
- Solidity: 15
- Python: 14
- (none): 13
- JavaScript: 8
- Go: 5
- Rust: 3
- Swift: 1
- Vue: 1
- Shell: 1

## What would matter for GSE, and why it is not wired

Read clients with an MIT licence, not vendored: `py-clob-client` (1225 stars), `clob-client` (515), `rs-clob-client` (681), `real-time-data-client` (230), `py-clob-client-v2` (166), `clob-client-v2` (75). They talk to the same public APIs the Gamma cron used to call. Wiring them into `game_signals` is the hold above, not a missing import.

Trading code, not added: `agents` (MIT, 3799, "Trade autonomously on Polymarket using AI Agents"), `poly-market-maker` (MIT, 326). A live autopsy already in this repo says paper bots looked profitable and live fills lost money. Autonomous trading is not an effectiveness upgrade.

`polymarket-cli` has 2884 stars and licence NONE. Not copied.
`agent-skills` has 193 stars and licence NONE. Not copied.

## Every repo

| name | stars | license | language | archived | description |
|---|---:|---|---|---|---|
| agents | 3799 | MIT | Python | True | Trade autonomously on Polymarket using AI Agents |
| polymarket-cli | 2884 | NONE | Rust | False |  |
| py-clob-client | 1225 | MIT | Python | True | Python client for the Polymarket CLOB |
| rs-clob-client | 681 | MIT | Rust | True | Polymarket Rust CLOB Client |
| clob-client | 515 | MIT | TypeScript | True | Typescript client for the Polymarket CLOB |
| ctf-exchange | 356 | MIT | Solidity | True | Polymarket CTF Exchange |
| poly-market-maker | 326 | MIT | Python | False | Market maker keeper for the Polymarket CLOB |
| real-time-data-client | 230 | MIT | TypeScript | False | A TypeScript client to receive real time data messages |
| polymarket-subgraph | 220 | LGPL-3.0 | TypeScript | False | Polymarket's public subgraph manifest for indexing on-chain trade, volume, user, liquidity and market data.  |
| agent-skills | 193 | NONE | - | False | Public repository for Polymarket Agent Skills |
| py-clob-client-v2 | 166 | MIT | Python | False |  |
| rs-clob-client-v2 | 146 | MIT | Rust | False |  |
| py-sdk | 140 | MIT | Python | False | Unified Python SDK for Polymarket DeFi |
| uma-ctf-adapter | 121 | MIT | Solidity | False | Adapter contract to resolve Polymarket prediction markets via UMA's Optimistic Oracle. |
| neg-risk-ctf-adapter | 90 | NONE | Solidity | False |  |
| ctf-exchange-v2 | 83 | NOASSERTION | Solidity | False | Polymarket CTF Exchange v2 |
| clob-client-v2 | 75 | MIT | TypeScript | False | Typescript client for the Polymarket CLOB |
| examples | 75 | NONE | TypeScript | True | Code examples for Polymarket |
| polymarket-sdk | 66 | MIT | TypeScript | False | SDK for interacting with the Polymarket Wallets |
| python-order-utils | 58 | MIT | Python | False | Python utilities to generate and sign orders for Polymarket's CLOB |
| builder-relayer-client | 56 | NONE | TypeScript | False | Typescript Client for the Polymarket Relayer API |
| go-order-utils | 56 | NONE | Go | False | Go utilities used to generate and sign limit and market orders for the Polymarket CLOB |
| ts-sdk | 44 | MIT | TypeScript | False | Unified TypeScript SDKs for Polymarket DeFi |
| py-builder-relayer-client | 42 | NONE | Python | False | Python Client for the Polymarket Relayer API |
| PolyLend | 39 | NONE | Solidity | False | PolyLend |
| polymarket-us-python | 32 | MIT | Python | False | Official Polymarket US Python SDK |
| clob-order-utils | 27 | NONE | TypeScript | False | Typescript utility to generate and sign orders for Polymarket's CLOB |
| builder-signing-sdk | 26 | NONE | TypeScript | False | TypeScript SDK for creating authenticated builder headers |
| conditional-tokens-market-makers | 26 | LGPL-3.0 | JavaScript | True |  Automated Market Maker (AMM) smart contracts for Conditional Tokens Markets. |
| py-merge-split-positions | 23 | NONE | Python | False |  |
| amm-maths | 21 | NONE | TypeScript | True |  |
| wagmi-safe-builder-example | 21 | NONE | TypeScript | True |  |
| conditional-tokens-contracts | 19 | LGPL-3.0 | Solidity | False | Smart contracts for conditional tokens. |
| privy-safe-builder-example | 18 | NONE | TypeScript | True |  |
| polymarket-liq-mining | 16 | NONE | TypeScript | False | Payout calculation scripts and merkle distributor contracts for the Polymarket liquidity mining program.  |
| polymarket-us-typescript | 16 | MIT | TypeScript | False | Official Polymarket US Typescript SDKs |
| conditional-token-examples-py | 15 | MIT | Python | True | Interacting with the Conditional Token Framework contracts using Web3py |
| uma-sports-oracle | 15 | NONE | Solidity | False | Oracle contract to resolve Polymarket sports markets using the Optimistic Oracle |
| builder-signing-server | 13 | NONE | TypeScript | False | Express server for creating authenticated builder headers remotely |
| contract-security | 13 | NONE | - | False |  |
| exchange-fee-module | 13 | NONE | Solidity | False | Enables dynamic fees on Exchange |
| magic-proxy-builder-example | 13 | NONE | TypeScript | True |  |
| polymarket-v2-external | 13 | NOASSERTION | Solidity | False | Polymarket-v2 contracts |
| proxy-factories | 12 | LGPL-3.0 | Solidity | False |  |
| py-builder-signing-sdk | 8 | NONE | Python | False | Python SDK for creating authenticated builder headers |
| poly-ct-scripts | 7 | MIT | Solidity | False | Forge scripts for interacting with Gnosis Conditional Tokens and related contracts. |
| magic-safe-builder-example | 6 | NONE | TypeScript | True |  |
| safe-wallet-integration | 6 | NONE | TypeScript | True |  |
| turnkey-safe-builder-example | 6 | NONE | TypeScript | True |  |
| web3-react-multichain | 6 | GPL-3.0 | TypeScript | True | 🧰 A simple, maximally extensible, dependency minimized framework for building modern Ethereum dApps |
| market-maker-keeper | 5 | AGPL-3.0 | - | True | Maker Keeper Framework: Market maker keepers for OasisDEX, EtherDelta, 0x (RadarRelay, ERCdEX), Paradex, DDEX, IDEX, Bibox, Ethfinex, GoPax, |
| poly-py-eip712-structs | 5 | MIT | Python | False | EIP712 data structure management for python |
| audit-checklist | 4 | NONE | - | True | A Solidity smart contract auditing checklist |
| conditional-token-examples | 4 | NONE | TypeScript | False | Interacting with the Conditional Token Framework contracts using Ethers |
| erpc | 4 | Apache-2.0 | - | False | eRPC — fault-tolerant evm rpc proxy |
| go-market-events | 4 | NONE | Go | False |  |
| py-clob-client-l2-auth | 4 | NONE | Python | True |  |
| resolution-subgraph | 4 | MIT | TypeScript | False |  |
| go-builder-signing-sdk | 3 | MIT | Go | False |  |
| go-redeemtions | 3 | NONE | Go | False |  |
| s3x | 3 | Apache-2.0 | - | True | s3x is a fork of minio providing an S3 API powered by TemporalX that uses IPFS as the data storage layer. It lets you turn any S3 applicatio |
| deploy-ctf | 2 | NONE | TypeScript | True |  |
| forge-template | 2 | Unlicense | - | True | Forkable template to get you started with Foundry's Forge |
| fx-portal | 2 | MIT | Solidity | True | FxPortal for Polygon (Previously Matic) chain. No mapping. Seamless. |
| matic-withdrawal-batcher | 2 | NONE | Solidity | True |  |
| perpetuals-examples | 2 | NONE | Python | False |  |
| polymarket-mev-bundle-poc | 2 | NONE | - | False |  |
| pyexchange | 2 | AGPL-3.0 | - | True | Python API for some cryptocurrency exchanges |
| relayer-deposits | 2 | NONE | TypeScript | False | Deposits to polymarket through a custom relayer |
| ts-merge-split-positions | 2 | NONE | TypeScript | True |  |
| uma-ctf-adapter-sdk | 2 | MIT | TypeScript | False | SDK for the UMA CTF Adapter |
| vigil | 2 | NONE | TypeScript | False |  |
| balance-checker | 1 | NONE | TypeScript | True | Verify on Chain Balances |
| eztz | 1 | MIT | JavaScript | True | Tezos JS Library |
| go-ctf-utils | 1 | NONE | Solidity | False | Go utility to calculate CTF position ids |
| go-ethereum-hdwallet | 1 | MIT | - | False | Ethereum HD Wallet derivations in Go (golang) |
| irisnet-crypto | 1 | Apache-2.0 | JavaScript | True | JavaScript library for IRIS Hub and Cosmos Hub |
| livepeerjs | 1 | MIT | JavaScript | True | JavaScript tools and applications that interact with Livepeer's smart contracts and peer-to-peer network |
| multi-endpoint-provider | 1 | NONE | TypeScript | True | ethers.js JsonRpcProvider and Web3Provider that try backup rpc endpoints when requests fail |
| polymarket-bounties | 1 | NONE | Vue | True | https://polymarket-bounties.vercel.app/ |
| rmqprom | 1 | NONE | Go | False | Prometheus Metrics for RMQ |
| routing-api | 1 | GPL-3.0 | - | False |  |
| status-page-front | 1 | NONE | TypeScript | True | At a glance status of Polymarket Infra |
| vue-components | 1 | Apache-2.0 | JavaScript | True |  |
| cachethq-docker | 0 | BSD-3-Clause | Shell | True | A Dockerized version of Cachet. |
| clob-client-l2-auth | 0 | NONE | TypeScript | True |  |
| connect-swift | 0 | Apache-2.0 | Swift | False | The Swift implementation of Connect: Protobuf RPC that works. |
| cosmos-delegation-js | 0 | Apache-2.0 | JavaScript | True |  |
| ctf-utils | 0 | NONE | TypeScript | False | Utility library to calculate CTF tokenIds |
| insta-exit-sdk | 0 | MIT | TypeScript | True | SDK to interact with Biconomy instaExit backend. It will provide a seamless process to integrate Insta-exit in any dapp or project |
| lattice-std | 0 | MIT | Solidity | False | Lattice Smart Contract libraries |
| leaderboard-username | 0 | NONE | TypeScript | False |  |
| ledger-cosmos-js | 0 | Apache-2.0 | JavaScript | True |  |
| matic-proofs | 0 | MIT | - | False | Package to generate the required proofs to exit funds from Matic Network |
| matic-withdrawal-batching-subgraph | 0 | MIT | TypeScript | True |  |
| polymarket-liquidity-requests | 0 | MIT | TypeScript | True |  |
| polymarket-status-tool | 0 | NONE | TypeScript | True | https://dashboard.heroku.com/apps/polymarket-redis-status |
| positions-subgraph | 0 | NONE | TypeScript | False |  |
| redis-leaderboard | 0 | NONE | TypeScript | True |  |
| solcurity | 0 | NONE | - | True | Opinionated security and code quality standard for Solidity smart contracts. |
| tezbridge-crypto | 0 | MIT | JavaScript | True | The library contains useful codec and crypto utilities for Tezos. |
| tvl-subgraph | 0 | NONE | TypeScript | True |  |
| uma-binary-adapter-sdk | 0 | MIT | TypeScript | False | (deprecated) Typescript sdk for the Polymarket UMA CTF adapter |
| withdrawal-checker | 0 | NONE | TypeScript | True | Given your Polymarket Address This tool will check your latest burnhash And tell you if you can withdraw Very useful for withdrawal being st |
