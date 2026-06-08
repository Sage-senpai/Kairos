import { describe, it, expect, vi } from 'vitest';
import { balanceProvider } from '../providers/balance';
import type { AgentRuntime, Memory } from '@kairos-sui/core';

const mockRuntime = {
  suiAddress: '0x' + '1'.repeat(64),
  suiClient: {
    getBalance: vi.fn().mockResolvedValue({ totalBalance: '4230000000' }),
    getAllBalances: vi.fn().mockResolvedValue([
      { coinType: '0x2::sui::SUI', totalBalance: '4230000000' },
      { coinType: '0xabc::usdc::USDC', totalBalance: '150000000' },
    ]),
  },
} as unknown as AgentRuntime;

describe('balanceProvider', () => {
  it('returns a formatted balance string with the address', async () => {
    const result = await balanceProvider.get(mockRuntime, {} as Memory);
    expect(result).toContain('4.2300 SUI');
    expect(result).toContain('0x1111');
    expect(result).toContain('USDC: 150000000');
  });

  it('returns empty string on error', async () => {
    (mockRuntime.suiClient.getBalance as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Network error'),
    );
    const result = await balanceProvider.get(mockRuntime, {} as Memory);
    expect(result).toBe('');
  });
});
