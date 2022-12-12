# Freshmint TypeScript Packages

This repository contains several [TypeScript](https://www.typescriptlang.org/) packages:

- [`freshmint`](./freshmint) is the main offering; a CLI tool for creating and managing NFT apps.
- [`@freshmint/core`](./core) is a library containing the contract templates and core logic that powers the Freshmint CLI.
- [`@freshmint/react`](./react/) is a library that provides React hooks to make it easier to interact with Freshmint contracts from React.
- [`@freshmint/cadence-loader`](./cadence-loader/) is a Webpack loader for importing Cadence files into a web app.

## Development Tools

- The TypeScript packages are organized in a monorepo layout managed by the [Turborepo](https://turbo.build/) build system.
- We use [tsup](https://github.com/egoist/tsup) (and, by extension, [esbuild](https://esbuild.github.io/)) to bundle each TypeScript package as a JavaScript library.
- We use [Prettier](https://prettier.io/) for code formatting and [ESLint](https://eslint.org/) for linting.
- We use [changesets](https://github.com/changesets/changesets) to manage versioning and changelogs.
- We use [GitHub Actions](https://docs.github.com/en/actions) to run tests on PR.

## Setup

After cloning this repository, install its dependencies from the **root of this repository**:

```sh
npm install
```

## Building for Development

This will launch `tsup` in watch mode and build _all packages_ any time their files change:

```sh
npm run dev
```

## Building for Production

Run this command to create a production build of all packages:

```sh
npm run build
```

## Tests

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

## Formatting & Linting

```sh
# Format all packages using Prettier
npm run format 

# Lint all packages using ESLint
npm run lint
```

## Versioning & Releases

All Freshmint packages are published to NPM.

TODO: add documentation for versioning and release process
