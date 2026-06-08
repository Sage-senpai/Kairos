import type { Provider } from '@kairos-sui/core';

const HERMES_ENDPOINT = 'https://hermes.pyth.network/v2/updates/price/latest';

/** Pyth price feed ids (mainnet) for the assets we surface to the agent. */
const FEEDS: ReadonlyArray<readonly [symbol: string, feedId: string]> = [
  ['SUI', '0x23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744'],
  ['BTC', '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43'],
  ['ETH', '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace'],
];

interface HermesResponse {
  parsed?: Array<{ id: string; price: { price: string; expo: number } }>;
}

function normalizeId(id: string): string {
  return id.replace(/^0x/, '').toLowerCase();
}

/** Injects real-time prices from Pyth's Hermes API. Degrades to empty on failure. */
export const priceProvider: Provider = {
  get: async () => {
    try {
      const query = FEEDS.map(([, id]) => `ids[]=${id}`).join('&');
      const res = await fetch(`${HERMES_ENDPOINT}?${query}&parsed=true`);
      if (!res.ok) return '';

      const data = (await res.json()) as HermesResponse;
      if (!data.parsed || data.parsed.length === 0) return '';

      const symbolById = new Map(FEEDS.map(([sym, id]) => [normalizeId(id), sym]));
      const parts = data.parsed.map((entry) => {
        const symbol = symbolById.get(normalizeId(entry.id)) ?? entry.id.slice(0, 6);
        const value = Number(entry.price.price) * Math.pow(10, entry.price.expo);
        return `${symbol}: $${value.toFixed(2)}`;
      });

      return `Current prices (Pyth): ${parts.join(', ')}`;
    } catch {
      return '';
    }
  },
};
