# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Codex, Cursor, Copilot, and others)
when working in this repository. It is loaded into agent context automatically — keep it concise.

## Overview

Freshmint is a TypeScript toolkit and CLI for minting NFT collections on the Flow blockchain.
The repo is a Turborepo-managed npm workspace monorepo (`package.json` `"workspaces": ["packages/*"]`,
`turbo.json` pipeline) containing Cadence contract templates under `cadence/` and four TypeScript
packages under `packages/`. The root `package.json` is `"private": true`; only the package subdirs
publish to npm. License: Apache-2.0.

## Build and Test Commands

Run from the repo root unless noted. Package manager is **npm** (lockfile: `package-lock.json`,
root `"packageManager": "npm@8.15.0"`, `engines.node: ">=14.0.0"`, CI uses Node 16).

- `npm install` — install all workspace dependencies.
- `npm run build` — `turbo run build` across all packages (each uses `tsup`; outputs to `dist/`).
- `npm run test` — `turbo run test`. Only `@freshmint/core` defines tests (Jest + ts-jest,
  `jest --runInBand --bail`, config at `packages/core/jest.config.js`).
- `npm run dev` — `turbo run dev --parallel` (tsup watch mode in each package).
- `npm run lint` — `turbo run lint` (ESLint with `@typescript-eslint`, config at `.eslintrc`).
- `npm run format` — `prettier --write "**/*.{ts,tsx}"` (config at `.prettierrc`:
  120 printWidth, single quotes, trailing commas).

Per-package scripts (invoke with `npm run <script> --workspace=<pkg>` or `cd packages/<pkg>`):
- `packages/freshmint` — produces the `fresh` CLI binary (`bin.fresh = dist/index.js`); build
  includes a `postbuild` step that copies `generate/templates/**` to `dist/templates` via `cpx`.
- `packages/core` — `npm test` runs the Jest suite; `tsup` config at `packages/core/tsup.config.ts`
  loads `.cdc` files as text and injects version via `esbuild-plugin-version-injector`.
- `packages/react`, `packages/cadence-loader` — build only, no tests.

CI (`.github/workflows/ci.yml`) runs on `main` and `alpha`: `npm install` → `npm run build` →
installs Flow CLI → `npm run test` on Node 16 / ubuntu-latest.

## Architecture

Monorepo layout:

- `packages/freshmint/` — the `freshmint` npm package (v0.5.0), which ships the `fresh` CLI.
  Entry: `index.ts`. Subdirs: `commands/` (one file per CLI command: `burn`, `deploy`, `dev`,
  `gen`, `mint`, `prince`, `start`, `start-drop`, `stop-drop`), `mint/` (CSV parsing, IPFS
  pinning, `minters/`, `processors/`, `claimKeys.ts`), `flow/` (Flow CLI wrapper), `generate/`
  (project scaffolding + `templates/`), `devServer/` (Flow Emulator + FCL Dev Wallet runner).
- `packages/core/` — `@freshmint/core` (v0.7.0). Exports `.`, `./crypto`, `./metadata`. Subdirs:
  `contracts/` (TypeScript wrappers: `StandardNFTContract`, `BlindNFTContract`, `EditionNFTContract`,
  `BlindEditionNFTContract`, `FreshmintClaimSaleContract`, `FreshmintClaimSaleV2Contract`,
  `FreshmintEncoding`, `NFTContract`), `generators/` (Handlebars-driven Cadence generators for
  each contract type), `metadata/` (schema, encode, hash, views, fields), `cadence/` (value
  encoding / fixed-point utilities), `crypto/` (elliptic, hash, key signing). Root files:
  `client.ts`, `transactions.ts`, `scripts.ts`, `fcl.ts`, `config.ts`, `testHelpers.ts`.
- `packages/react/` — `@freshmint/react` (v0.1.0). `hooks/` contains `useFCL`, `useScript`,
  `useTransaction`; root files: `cadence.ts`, `fcl.ts`, `script.ts`, `transaction.ts`.
- `packages/cadence-loader/` — `@freshmint/cadence-loader` (v0.1.0). Single `index.ts`
  (webpack-style loader; uses `schema-utils`).
- `cadence/` — Cadence sources and Handlebars templates (files ending `.template.cdc`).
  NFT template types: `standard-nft/`, `blind-nft/`, `edition-nft/`, `blind-edition-nft/`
  (plus `common/` partials and `metadata-views/` partials) under `cadence/nfts/`. Supporting
  contracts: `freshmint-claim-sale-v2/`, `freshmint-encoding/`, `freshmint-metadata-views/`,
  `freshmint-queue/`, `freshmint-lock-box/`, plus deprecated `freshmint-claim-sale/`.
  Deployment configs: `cadence/flow.json`, `cadence/flow.testnet.json`, `cadence/flow.mainnet.json`.
- `docs/` — `getting-started.md`, `metadata.md`, `nodejs.md`, `testnet.md`.

Dependency direction: `freshmint` (CLI) → `@freshmint/core` (Cadence templates + logic).
`turbo.json` declares `build.dependsOn: ["^build"]` so upstream packages build first, and
lists `cadence/**` as a `globalDependencies` cache input.

## Conventions and Gotchas

- **Cadence templates are not valid Cadence.** Files ending `.template.cdc` use Handlebars
  (`{{ contractName }}`, `{{#for field in fields}}`), per `cadence/README.md`. They are
  rendered by `packages/core/generators/` before deployment. Do not treat them as directly
  compilable Cadence.
- **tsup loads `.cdc` as text** (`packages/core/tsup.config.ts` `loader: { '.cdc': 'text' }`).
  Jest mirrors this via `jest-raw-loader.js` (`transform: { "\\.cdc$": ... }`). New Cadence
  imports must be referenced as string modules.
- **Contract addresses live in `packages/core/config.ts`** — when updating deployments, edit
  there; `cadence/README.md` documents the per-network `flow deploy ... --update` workflow.
- **Build the CLI with templates.** `packages/freshmint` relies on the `postbuild` cpx copy
  (`generate/templates/**` → `dist/templates`); invoking `fresh start` against a build that
  skipped `postbuild` will fail to scaffold.
- **Local CLI development uses `npm link`.** Per `packages/freshmint/README.md`: run `npm run
  dev` from the repo root (keeps `@freshmint/core` in sync), then `npm link` inside
  `packages/freshmint` to expose the `fresh` binary globally.
- **Versioning via Changesets.** `.changeset/` with `@changesets/cli`; `access: "public"`,
  `baseBranch: "main"`, internal deps bump at `patch`.
- **ESLint ignores generated output** (`.eslintrc` ignores `**/dist/*`, `**/*.js`, and
  `packages/freshmint/templates/**`).

## Files Not to Modify

- `package-lock.json` — regenerated by npm; do not hand-edit.
- `packages/*/dist/**` and `packages/*/CHANGELOG.md` — build/Changesets output.
- `packages/core/contracts/__snapshots__/**` — Jest snapshots; update via `jest -u` when
  intentional, not manually.
- `packages/freshmint/generate/templates/**` — project scaffold templates (also ESLint-ignored).
