// Implementation adapted from Cadence repository:
// https://github.com/onflow/cadence/tree/master/fixedpoint

export function parseFixedPointValue(value: string, scale: number): bigint {
  const parts = parseFixedPointParts(value);
  return convertToFixedPointBigInt(parts, scale);
}

export type FixedPointParts = {
  isNegative: boolean;
  unsignedInteger: bigint;
  fractional: bigint;
  scale: number;
};

export function parseFixedPointParts(value: string): FixedPointParts {
  const parts = value.split('.');

  if (parts.length !== 2) {
    throw 'missing decimal point in fixed point number';
  }

  const [integerStr, fractionalStr] = parts;

  const scale = fractionalStr.length;

  const isNegative = value.length > 0 && value[0] == '-';

  const integer = BigInt(integerStr);

  if (fractionalStr.length > 0) {
    switch (fractionalStr[0]) {
      case '+':
      case '-':
        throw 'invalid sign in fractional part';
    }
  }

  const fractional = BigInt(fractionalStr);

  const unsignedInteger = integer < 0 ? -integer : integer;

  return {
    isNegative,
    unsignedInteger,
    fractional,
    scale,
  };
}

function convertToFixedPointBigInt(
  { isNegative, unsignedInteger, fractional, scale }: FixedPointParts,
  targetScale: number,
): bigint {
  const scaleBn = BigInt(scale);
  const targetScaleBn = BigInt(targetScale);

  let integer = unsignedInteger * 10n ** targetScaleBn;

  if (scale < targetScale) {
    const scaleDiff = targetScaleBn - scaleBn;
    fractional = fractional * 10n ** scaleDiff;
  } else if (scale > targetScale) {
    const scaleDiff = scaleBn - targetScaleBn;
    fractional = fractional * 10n ** scaleDiff;
  }

  if (isNegative) {
    integer = -integer;
    fractional = -fractional;
  }

  return integer + fractional;
}
