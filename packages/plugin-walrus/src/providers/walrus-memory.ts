import type { Provider } from '@kairos-sui/core';
import { getStore } from '../store-state';

const MAX_INJECTED = 5;

/**
 * Injects the agent's most recent Walrus-stored memories as context, so the
 * agent can refer to things it has persisted in this and prior turns.
 */
export const walrusMemoryProvider: Provider = {
  get: async () => {
    const store = getStore();
    if (!store) return '';

    const recent = store.getRecent().slice(-MAX_INJECTED);
    if (recent.length === 0) return '';

    const lines = recent.map((r) => {
      const when = new Date(r.timestamp).toISOString().slice(0, 10);
      return `[${when}] ${r.summary} (blob ${r.blobId.slice(0, 8)})`;
    });
    return `Recent memory (from Walrus):\n${lines.join('\n')}`;
  },
};
