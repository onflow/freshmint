# Freshmint TypeScript Packages

This repository contains several [TypeScript](https://www.typescriptlang.org/) packages:

- [`freshmint`](./freshmint) is the main offering; a CLI tool for creating and managing NFT apps.
- [`@freshmint/core`](./core) is a library containing the contract templates and core logic that powers the Freshmint CLI.
- [`@freshmint/react`](./react/) is a library that provides React hooks to make it easier to interact with Freshmint contracts from React.
- [`@freshmint/cadence-loader`](./cadence-loader/) is a Webpack loader for importing Cadence files into a web app.

## Development tools

- The TypeScript packages are organized in a monorepo layout managed by the [Turborepo](https://turbo.build/) build system.
- We use [tsup](https://github.com/egoist/tsup) (and, by extension, [esbuild](https://esbuild.github.io/)) to bundle each TypeScript package as a JavaScript library.
- We use [Prettier](https://prettier.io/) for code formatting and [ESLint](https://eslint.org/) for linting.
- We use [changesets](https://github.com/changesets/changesets) to manage versioning and changelogs.
- We use [GitHub Actions](https://docs.github.com/en/actions) to run tests on each PR.

## Setup

After cloning this repository, install its dependencies from the **root of this repository**:

```sh
npm install
```

## Building for development

This will launch `tsup` in watch mode and build _all packages_ any time their files change:

```sh
npm run dev
```

## Building for production

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
cd packages/core

# Run all tests for this package
npm run test

# Run the tests in a specific file
npm run test -- ./contracts/StandardNFTContract.test.ts
```

## Formatting & linting

```sh
# Format all packages using Prettier
npm run format 

# Lint all packages using ESLint
npm run lint
```

## How to create a release

All Freshmint packages are published to NPM. Instead of manually setting version tags,
we use [changesets](https://github.com/changesets/changesets) to manage release versions.

We recommend reading the [Introduction to Using Changesets](https://github.com/changesets/changesets/blob/main/docs/intro-to-using-changesets.md).

### Create one changeset per PR

Every PR should have an accompanying changeset. Before opening a PR, create a changeset:

```sh
npx changeset add
```

Then commit the changeset to your PR branch.

### Prepare a release

After accumulating one or more changesets in the `main` branch, you can create a release.

This command automatically updates the versions on all packages. It also deletes the changeset files -- that is expected!

```sh
npx changeset version
```

### Build a release

After updating the versions, build all packages from the **root of this repository**:

```sh
npm run build
```

### Publish a release to NPM

Run this command to publish all new package versions to NPM.

This also creates a new git tag for each updated package.

```sh
npx changeset publish
```

### Push git tags

Lastly, push the newly-created git tags to GitHub:

```sh
git push --tags
```

### Publish a release on GitHub

Lastly, create a new release on GitHub from the tags you just pushed!
