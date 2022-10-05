import { FixedPointParts, parseFixedPointParts } from './fixedPoint';

// Test cases from Cadence repository:
// https://github.com/onflow/cadence/blob/ed7fecc47d1638141d7f6913395ed5eb017fbf1b/fixedpoint/parse_test.go#L40-L49
const cases: { input: string; expected: FixedPointParts }[] = [
  {
    input: '0.1',
    expected: { isNegative: false, unsignedInteger: 0n, fractional: 1n, scale: 1 },
  },
  {
    input: '-0.1',
    expected: { isNegative: true, unsignedInteger: 0n, fractional: 1n, scale: 1 },
  },
  {
    input: '1.0',
    expected: { isNegative: false, unsignedInteger: 1n, fractional: 0n, scale: 1 },
  },
  {
    input: '01.0',
    expected: { isNegative: false, unsignedInteger: 1n, fractional: 0n, scale: 1 },
  },
  {
    input: '-01.0',
    expected: { isNegative: true, unsignedInteger: 1n, fractional: 0n, scale: 1 },
  },
  {
    input: '1.23',
    expected: { isNegative: false, unsignedInteger: 1n, fractional: 23n, scale: 2 },
  },
  {
    input: '01.23',
    expected: { isNegative: false, unsignedInteger: 1n, fractional: 23n, scale: 2 },
  },
  {
    input: '-1.23',
    expected: { isNegative: true, unsignedInteger: 1n, fractional: 23n, scale: 2 },
  },
];

describe('parseFixedPointValue', () => {
  test.each(cases)('$input', ({ input, expected }) => {
    expect(parseFixedPointParts(input)).toEqual(expected);
  });
});
