/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    // Load Cadence files as raw strings
    "\\.cdc$": "<rootDir>/jest-raw-loader.js"
  }
};
