import { describe, it, expect } from 'vitest';
import { formatSui, suiToMist, truncateAddress } from '../utils';

describe('formatSui', () => {
  it('formats MIST as a SUI decimal string', () => {
    expect(formatSui('4230000000')).toBe('4.2300');
    expect(formatSui('1000000000')).toBe('1.0000');
    expect(formatSui(0n)).toBe('0.0000');
  });

  it('respects the decimals argument', () => {
    expect(formatSui('1500000000', 2)).toBe('1.50');
    expect(formatSui('1500000000', 0)).toBe('1');
  });
});

describe('suiToMist', () => {
  it('converts SUI decimals to MIST', () => {
    expect(suiToMist(0.1)).toBe(100_000_000n);
    expect(suiToMist(2)).toBe(2_000_000_000n);
  });
});

describe('truncateAddress', () => {
  it('shows first 6 and last 4 characters for long addresses', () => {
    const addr = '0x' + '1'.repeat(64);
    expect(truncateAddress(addr)).toBe('0x1111...1111');
  });

  it('leaves short strings untouched', () => {
    expect(truncateAddress('0x1234')).toBe('0x1234');
  });
});
