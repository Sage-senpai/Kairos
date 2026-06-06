# Writing providers

> Providers inject real-time context into every LLM call. A provider is a function that returns a string — that string becomes part of the system prompt.

---

## The Provider interface

```typescript
interface Provider {
  get: (runtime: AgentRuntime, message: Memory) => Promise<string>
}
```

That is the entire interface. Return a string. The string gets concatenated into `state.additionalContext`. If you throw, the runtime catches it and continues with an empty string from your provider — agents should never crash because a price feed went down.

---

## Rules for providers

1. **Return concise strings.** Every provider's output adds to the system prompt. Keep it under 200 tokens. The LLM reads all of it on every message.
2. **Never throw uncaught errors.** Wrap your fetch calls in try/catch and return an empty string or a degraded message on failure.
3. **Run fast.** Providers run concurrently before every LLM call. If your provider takes 5 seconds, the user waits 5+ seconds for every response.
4. **Be specific, not verbose.** `SUI: $2.14` is better than `The current price of Sui as reported by the Pyth Network oracle is approximately $2.14 USD.`
5. **Use present tense.** The string reads like a briefing note to the LLM.

---

## Complete example — owned NFTs provider

```typescript
// packages/plugin-sui/src/providers/nfts.ts
import type { Provider } from '@kairos/core';

export const ownedNftsProvider: Provider = {
  get: async (runtime) => {
    try {
      const objects = await runtime.suiClient.getOwnedObjects({
        owner: runtime.suiAddress,
        filter: { MoveModule: { package: '0x2', module: 'display' } },
        options: { showContent: true, showDisplay: true },
        limit: 10,
      });

      if (!objects.data.length) return 'Owned NFTs: none';

      const nfts = objects.data
        .map(obj => {
          const display = obj.data?.display?.data;
          const name = display?.name ?? 'Unknown NFT';
          const id = obj.data?.objectId?.slice(0, 8) + '...' + obj.data?.objectId?.slice(-4);
          return `${name} (${id})`;
        })
        .join(', ');

      return `Owned NFTs (${objects.data.length}): ${nfts}`;
    } catch {
      return '';
    }
  },
};
```

Output injected into system prompt:
```
Owned NFTs (3): Sui Name Service (0x1234...abcd), DeepBook Badge (0x5678...ef01), Genesis NFT (0x9abc...def0)
```

---

## Complete example — DeepBook pool depth provider

```typescript
// packages/plugin-sui/src/providers/pool-depth.ts
import type { Provider } from '@kairos/core';

// Pool IDs on mainnet — update as new pools are added
const POOLS = {
  'SUI/USDC': '0x4405b50d791fd3346754e8171aaab6bc2ed26c2c46efdd033c14b30ae507ac33',
  'SUI/DEEP': '0xb663828d251e8aba23c1b3986edd434f1d08d3ea6a3b2c56a3ca23e0ee45a87e',
};

export const poolDepthProvider: Provider = {
  get: async (runtime) => {
    try {
      const summaries = await Promise.all(
        Object.entries(POOLS).map(async ([name, poolId]) => {
          const pool = await runtime.suiClient.getObject({
            id: poolId,
            options: { showContent: true },
          });

          // Extract bid/ask depth from pool content
          // (DeepBook pool structure — adjust field names per SDK version)
          const content = pool.data?.content as any;
          const bidDepth = content?.fields?.bids?.fields?.size ?? '?';
          const askDepth = content?.fields?.asks?.fields?.size ?? '?';
          return `${name}: ${bidDepth} bids / ${askDepth} asks`;
        })
      );

      return `DeepBook pool depth:\n${summaries.join('\n')}`;
    } catch {
      return '';
    }
  },
};
```

---

## Message-aware providers

The `message` parameter lets you build providers that respond to what the user is asking — for example, only fetching expensive data when the message seems to need it:

```typescript
export const expensiveDataProvider: Provider = {
  get: async (runtime, message) => {
    // Only run this expensive provider if the user is asking about yields
    const yieldKeywords = ['yield', 'apy', 'apr', 'earn', 'interest', 'staking'];
    const messageText = message.content.text.toLowerCase();
    const isRelevant = yieldKeywords.some(kw => messageText.includes(kw));

    if (!isRelevant) return '';

    // ... expensive fetch
    return `Current yield data: ...`;
  },
};
```

---

## Provider ordering

Providers run concurrently, but their outputs are concatenated in registration order. Put the most important context first:

```typescript
export const suiPlugin: Plugin = {
  name: 'plugin-sui',
  actions: [...],
  providers: [
    balanceProvider,    // first — wallet state is always relevant
    priceProvider,      // second — price context is almost always useful
    poolDepthProvider,  // third — only relevant for trading messages
    ownedNftsProvider,  // last — only relevant for NFT messages
  ],
};
```

---

## Testing providers

Providers are pure async functions — they are the easiest thing to test:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { balanceProvider } from '../providers/balance';
import type { AgentRuntime } from '@kairos/core';

const mockRuntime = {
  suiAddress: '0x' + '1'.repeat(64),
  suiClient: {
    getBalance: vi.fn().mockResolvedValue({ totalBalance: '4230000000' }),
    getAllBalances: vi.fn().mockResolvedValue([
      { coinType: '0x2::sui::SUI', totalBalance: '4230000000' },
    ]),
  },
} as unknown as AgentRuntime;

describe('balanceProvider', () => {
  it('returns formatted balance string', async () => {
    const result = await balanceProvider.get(mockRuntime, {} as any);
    expect(result).toContain('4.2300 SUI');
    expect(result).toContain(mockRuntime.suiAddress.slice(0, 8));
  });

  it('returns empty string on error', async () => {
    (mockRuntime.suiClient.getBalance as ReturnType<typeof vi.fn>)
      .mockRejectedValue(new Error('Network error'));
    const result = await balanceProvider.get(mockRuntime, {} as any).catch(() => '');
    expect(result).toBe('');
  });
});
```
