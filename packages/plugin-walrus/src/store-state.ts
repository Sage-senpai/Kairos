import type { WalrusMemoryStore } from './memory-store';

/**
 * Process-level handle to the active Walrus store. Set during the plugin's
 * `onRegister` and read by the store action and the memory provider. One agent
 * process runs one plugin instance, so a module singleton is sufficient.
 */
let store: WalrusMemoryStore | null = null;

export function setStore(next: WalrusMemoryStore): void {
  store = next;
}

export function getStore(): WalrusMemoryStore | null {
  return store;
}
