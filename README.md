# Freshmint 🍃

Freshmint is a framework for building NFT-based applications on Flow.

> :warning: This project is still in development.
>
> The current alpha version is not yet intended for production (i.e. mainnet) use. Please expect breaking changes as the tool evolves!

# Development

This repository contains both TypeScript and Cadence source code.

## Cadence

The Cadence contracts, transactions and scripts are maintained in the [/cadence](cadence/) directory.

## TypeScript

- The TypeScript packages are organized in monorepo layout managed by the [Turborepo](https://turbo.build/) build system.
- We use [changesets](https://github.com/changesets/changesets) to manage versioning and changelogs.
- We use [tsup](https://github.com/egoist/tsup) (and, by extension, [esbuild](https://esbuild.github.io/)) to bundle each TypeScript package as a JavaScript library.

### Setup

After cloning this repository, install its dependencies from the root:

```sh
npm install
```

### Tests

Run tests for all packages at once (note: currently `core` is the only package that defines tests):

```sh
npm run tests
```

Run the tests for a specific package:

```sh
# Option 1: run the tests from the package directory
cd packages/core
npm run test

# Option 2: use the workspace flag
npm run test --workspace packages/core
```

### Formatting & Linting

```sh
npm run format # format code in all packages
npm run lint   # lint code in all packages
```

### Packages

This repository contains several TypeScript packages:

- [`freshmint`](packages/freshmint) is the main offering; a CLI tool for creating and managing NFT apps.
- [`@freshmint/core`](packages/core/) is a library containing the contract templates and core logic that powers the Freshmint CLI.
- [`@freshmint/react`](packages/react/) is a library that provides React hooks to make it easier to interact with Freshmint contracts from React.
- [`@freshmint/cadence-loader`](packages/cadence-loader/) is a Webpack loader for importing Cadence files into a web app.

### Versioning & Releases

All Freshmint packages are published to NPM.
