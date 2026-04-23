# freshmint — TypeScript NFT Minting Toolkit for Flow

[![License](https://img.shields.io/github/license/onflow/freshmint)](./LICENSE)
[![Latest Release](https://img.shields.io/github/v/release/onflow/freshmint?include_prereleases)](https://github.com/onflow/freshmint/releases)
[![Discord](https://img.shields.io/badge/Discord-Flow-5865F2?logo=discord&logoColor=white)](https://discord.gg/flow)
[![Built on Flow](https://img.shields.io/badge/Built%20on-Flow-00EF8B)](https://flow.com)
[![npm](https://img.shields.io/npm/v/freshmint)](https://www.npmjs.com/package/freshmint)

Freshmint is a TypeScript toolkit for minting NFTs on the Flow network. It bundles batch minting workflows, metadata management, IPFS pinning integration, and ready-to-deploy Cadence contracts so builders can ship NFT projects on Flow without reinventing the pipeline.

## TL;DR

- **What:** A TypeScript toolkit and CLI for creating, minting, and managing NFT collections on Flow.
- **Who it's for:** NFT project teams, Cadence developers, and JavaScript/TypeScript builders shipping NFT drops on Flow.
- **Why use it:** Combines Cadence NFT contracts, metadata handling, and IPFS workflows into one TypeScript package so you can go from assets to on-chain mint with less glue code.
- **Status:** See [Releases](https://github.com/onflow/freshmint/releases) for the latest version. This project was published as an alpha — review the releases page before production use.
- **License:** Apache-2.0
- **Related repos:** [onflow/flow-nft](https://github.com/onflow/flow-nft) · [onflow/nft-catalog](https://github.com/onflow/nft-catalog) · [onflow/flow-cli](https://github.com/onflow/flow-cli). Open-sourced since 2021.

## Quick Start

Follow the [getting started guide](./docs/getting-started.md) to scaffold your first Freshmint project. A typical flow:

1. Install the CLI from the [`freshmint` package](./packages/freshmint).
2. Initialize a new project directory with a Cadence contract, metadata schema, and asset folder.
3. Configure your Flow account, network (emulator, testnet, or mainnet), and IPFS/pinning provider.
4. Mint NFTs in batches from a CSV or JSON metadata source.

See the per-package READMEs under [`packages/`](./packages) for installation and API details.

## Features

- **Batch minting**: Mint NFTs in batches driven by CSV or JSON metadata inputs.
- **Metadata management**: Define and validate NFT metadata schemas compatible with Flow NFT metadata views.
- **IPFS pinning**: Pin NFT media and metadata to IPFS through supported pinning providers.
- **Cadence contracts**: Ready-to-deploy Cadence contracts for NFT collections, maintained in the [`cadence`](./cadence) directory.
- **Monorepo packages**: Core library, CLI, React integrations, and a Cadence loader live in [`packages/`](./packages).
- **TypeScript first**: Full TypeScript types for metadata, mint flows, and contract interactions.

## Example

Freshmint is organized as a monorepo. The primary entry points are:

- [`packages/freshmint`](./packages/freshmint) — the `freshmint` CLI for project scaffolding and minting.
- [`packages/core`](./packages/core) — the core TypeScript library used by the CLI and integrations.
- [`packages/react`](./packages/react) — React helpers for Freshmint-powered frontends.
- [`packages/cadence-loader`](./packages/cadence-loader) — utilities for loading Cadence source files.

Refer to [`docs/getting-started.md`](./docs/getting-started.md) for end-to-end examples, and [`docs/metadata.md`](./docs/metadata.md) for the metadata schema format.

## How It Works

Freshmint combines three layers:

1. **Cadence contracts** (in [`cadence/`](./cadence)) implement the on-chain NFT collection, following the [NonFungibleToken](https://github.com/onflow/flow-nft) standard and metadata views.
2. **TypeScript packages** (in [`packages/`](./packages)) wrap contract deployment, transaction building, metadata validation, and IPFS pinning into a single JavaScript/TypeScript API and CLI.
3. **Developer workflow**: you provide metadata (CSV/JSON) and assets; Freshmint pins media to IPFS, writes metadata into Cadence transactions, and submits batched mint transactions to the configured Flow network.

The result is a repeatable pipeline from a local asset folder to an on-chain NFT collection on Flow.

## FAQ

**What is Freshmint?**
A TypeScript toolkit and CLI for creating and minting NFT collections on the Flow network, including Cadence contracts, metadata tooling, and IPFS workflows.

**What networks does it target?**
Freshmint targets Flow — the emulator, testnet, and mainnet. See [`docs/testnet.md`](./docs/testnet.md) for testnet-specific guidance.

**Which smart contract language does Freshmint use?**
Freshmint's on-chain components are written in [Cadence](https://cadence-lang.org), the resource-oriented smart contract language for Flow. The Cadence sources live in [`cadence/`](./cadence).

**Do I need Node.js to use Freshmint?**
Yes. Freshmint is published as TypeScript packages and a Node.js CLI. See [`docs/nodejs.md`](./docs/nodejs.md) for Node.js usage.

**How does Freshmint handle NFT metadata?**
Metadata schemas are defined per project and validated before minting. Freshmint can pin metadata and media to IPFS and record the resulting CIDs in Cadence mint transactions. See [`docs/metadata.md`](./docs/metadata.md).

**Is Freshmint production-ready?**
Check the [Releases](https://github.com/onflow/freshmint/releases) page for current version and release notes before using it in production.

**Where do I report bugs or request features?**
Open an issue in this repo, or join the [Flow Discord](https://discord.gg/flow).

## About Flow

This repo is part of the [Flow network](https://flow.com), a Layer 1 blockchain built for consumer applications, AI Agents, and DeFi at scale.

- Developer docs: https://developers.flow.com
- Cadence language: https://cadence-lang.org
- Community: [Flow Discord](https://discord.gg/flow) · [Flow Forum](https://forum.flow.com)
- Governance: [Flow Improvement Proposals](https://github.com/onflow/flips)
