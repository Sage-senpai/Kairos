import type { Plugin } from '@kairos/core';
import { logger } from '@kairos/core';
import { WalrusMemoryStore } from './memory-store';
import { setStore } from './store-state';
import { storeOnWalrusAction } from './actions/store-on-walrus';
import { walrusMemoryProvider } from './providers/walrus-memory';

/**
 * The Walrus plugin. On registration it builds a `WalrusMemoryStore` from the
 * configured publisher/aggregator URLs and hooks the runtime's MemoryManager so
 * that every message is persisted to Walrus asynchronously (never blocking the
 * agent loop). Adds a STORE_ON_WALRUS action and a recent-memory provider.
 */
export const walrusPlugin: Plugin = {
  name: 'plugin-walrus',
  actions: [storeOnWalrusAction],
  providers: [walrusMemoryProvider],

  onRegister: async (runtime) => {
    const store = new WalrusMemoryStore(
      runtime.getSetting('WALRUS_PUBLISHER_URL'),
      runtime.getSetting('WALRUS_AGGREGATOR_URL'),
    );
    setStore(store);

    // Fire-and-forget cold-storage hook: the callback returns void so the hot
    // MemoryManager never awaits the network round-trip.
    runtime.memoryManager.onAdd((memory) => {
      if (memory.role !== 'system') void store.persistMemory(memory);
    });

    logger.info('plugin-walrus ready — memory will persist to Walrus');
  },
};

export { storeOnWalrusAction, walrusMemoryProvider };
export { WalrusMemoryStore } from './memory-store';
export type { BlobRecord } from './memory-store';
