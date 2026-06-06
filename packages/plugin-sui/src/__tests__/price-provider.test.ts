import { describe, it, expect, vi, afterEach } from 'vitest';
import { priceProvider } from '../providers/price';
import type { AgentRuntime, Memory } from '@kairos/core';

const runtime = {} as unknown as AgentRuntime;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('priceProvider', () => {
  it('formats prices from a Hermes response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          parsed: [
            {
              id: '23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744',
              price: { price: '214000000', expo: -8 },
            },
          ],
        }),
      }),
    );

    const result = await priceProvider.get(runtime, {} as Memory);
    expect(result).toContain('SUI: $2.14');
  });

  it('returns empty string when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    expect(await priceProvider.get(runtime, {} as Memory)).toBe('');
  });

  it('returns empty string when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await priceProvider.get(runtime, {} as Memory)).toBe('');
  });
});
