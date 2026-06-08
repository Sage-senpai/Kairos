import type { Provider } from '@kairos-sui/core';
import { formatSui, truncateAddress } from '@kairos-sui/core';

const SUI_COIN_TYPE = '0x2::sui::SUI';

/** Injects the agent's wallet address, SUI balance, and other token balances. */
export const balanceProvider: Provider = {
  get: async (runtime) => {
    try {
      if (!runtime.suiClient || !runtime.suiAddress) return '';

      const [sui, all] = await Promise.all([
        runtime.suiClient.getBalance({ owner: runtime.suiAddress }),
        runtime.suiClient.getAllBalances({ owner: runtime.suiAddress }).catch(() => []),
      ]);

      const lines = [
        `Wallet: ${truncateAddress(runtime.suiAddress)}`,
        `SUI balance: ${formatSui(sui.totalBalance)} SUI`,
      ];

      const others = all
        .filter((b) => b.coinType !== SUI_COIN_TYPE && BigInt(b.totalBalance) > 0n)
        .map((b) => `${b.coinType.split('::').pop()}: ${b.totalBalance}`);
      if (others.length > 0) {
        lines.push(`Other tokens: ${others.join(', ')}`);
      }

      return lines.join('\n');
    } catch {
      return '';
    }
  },
};
