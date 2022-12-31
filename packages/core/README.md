# Freshmint Core Library

[![npm](https://img.shields.io/npm/v/@freshmint/core)](https://www.npmjs.com/package/freshmint)

`@freshmint/core` contains the Cadence contract templates and core logic that powers the Freshmint CLI.

## Documentation

For usage documentation and examples, see the [Freshmint Node.js guide](../../docs/nodejs.md).

## Package Structure

- [cadence](./cadence) - utilities for parsing, converting and encoding input to be used in Cadence programs.
- [crypto](./crypto) - utilities for signing transactions, parsing keys, hashing and other cryptographic operations.
- [contracts](./contract) - TypeScript wrappers for the Freshmint contracts and NFT templates.
- [generators](./generators) - functions to generate Freshmint Cadence contracts, transactions and scripts.
- [metadata](./metadata) - utilities for working with NFT metadata.
- [client.ts](./client.ts), [transactions.ts](./transactions.ts), [scripts.ts](./scripts.ts) - TypeScript wrappers for constructing transactions/scripts and executing them with FCL.
- [config.ts](./config.ts) - network-specific configuration constants for Freshmint.
- [testHelpers.ts](./testHelpers.ts) - utilities used to setup test suites for the Freshmint contracts.
