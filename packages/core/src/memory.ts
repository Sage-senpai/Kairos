import type { IMemoryManager, Memory } from './types';
import { logger } from './logger';

/**
 * Hot-tier memory: an in-process map of conversation id → messages, newest last.
 *
 * Cold storage (Walrus) is layered on by plugin-walrus, which registers an
 * `onAdd` hook to persist each message asynchronously. The core manager never
 * blocks on cold storage and never depends on it.
 */
export class MemoryManager implements IMemoryManager {
  private readonly store = new Map<string, Memory[]>();
  private readonly hooks: Array<(memory: Memory) => void | Promise<void>> = [];

  /** Append a message to hot memory and fire cold-storage hooks (fire-and-forget). */
  async add(memory: Memory): Promise<void> {
    const existing = this.store.get(memory.conversationId) ?? [];
    existing.push(memory);
    this.store.set(memory.conversationId, existing);

    for (const hook of this.hooks) {
      try {
        await Promise.resolve(hook(memory)).catch((err) => logger.error('Memory hook failed', err));
      } catch (err) {
        logger.error('Memory hook threw synchronously', err);
      }
    }
  }

  /** Return the most recent `limit` messages for a conversation, oldest first. */
  async getRecent(conversationId: string, limit = 20): Promise<Memory[]> {
    const all = this.store.get(conversationId) ?? [];
    return all.slice(-limit);
  }

  /** Register a hook fired after every successful `add`. */
  onAdd(hook: (memory: Memory) => void | Promise<void>): void {
    this.hooks.push(hook);
  }
}
