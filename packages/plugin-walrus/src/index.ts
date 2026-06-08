import { join } from 'node:path';
import type { Plugin } from '@kairos-sui/core';
import { logger } from '@kairos-sui/core';
import { WalrusMemoryStore } from './memory-store';
import { setStore } from './store-state';
import { storeOnWalrusAction } from './actions/store-on-walrus';
import { retrieveFromWalrusAction } from './actions/retrieve-from-walrus';
import { walrusMemoryProvider } from './providers/walrus-memory';

function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'agent'
  );
}

/**
 * The Walrus plugin. On registration it builds a `WalrusMemoryStore` from the
 * configured publisher/aggregator URLs, loads any persisted blob index (so the
 * agent recalls prior-session memory), and hooks the runtime's MemoryManager so
 * every message is persisted to Walrus asynchronously (never blocking the agent
 * loop). Adds STORE_ON_WALRUS / RETRIEVE_FROM_WALRUS actions and a recent-memory
 * provider.
 */
export const walrusPlugin: Plugin = {
  name: 'plugin-walrus',
  actions: [storeOnWalrusAction, retrieveFromWalrusAction],
  providers: [walrusMemoryProvider],

  onRegister: async (runtime) => {
    const indexPath = join(process.cwd(), '.kairos', `walrus-${slug(runtime.character.name)}.json`);
    const store = new WalrusMemoryStore(
      runtime.getSetting('WALRUS_PUBLISHER_URL'),
      runtime.getSetting('WALRUS_AGGREGATOR_URL'),
      { indexPath },
    );
    setStore(store);
    await store.init();

    // Fire-and-forget cold-storage hook: the callback returns void so the hot
    // MemoryManager never awaits the network round-trip.
    runtime.memoryManager.onAdd((memory) => {
      if (memory.role !== 'system') void store.persistMemory(memory);
    });

    logger.info('plugin-walrus ready - memory persists to Walrus and survives restarts');
  },
};

export { storeOnWalrusAction, retrieveFromWalrusAction, walrusMemoryProvider };
export { WalrusMemoryStore } from './memory-store';
export { getStore } from './store-state';
export type { BlobRecord, WalrusMemoryStoreOptions } from './memory-store';
