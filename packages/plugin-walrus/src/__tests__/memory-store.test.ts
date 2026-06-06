import { describe, it, expect, vi, afterEach } from 'vitest';
import { WalrusMemoryStore } from '../memory-store';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('WalrusMemoryStore', () => {
  it('stores content and extracts the blobId from newlyCreated', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ newlyCreated: { blobObject: { blobId: 'BLOB_NEW' } } }),
      }),
    );

    const store = new WalrusMemoryStore();
    const record = await store.store('hello world', 'greeting');
    expect(record.blobId).toBe('BLOB_NEW');
    expect(record.summary).toBe('greeting');
    expect(store.getRecent()).toHaveLength(1);
  });

  it('extracts the blobId from alreadyCertified', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ alreadyCertified: { blobId: 'BLOB_OLD' } }),
      }),
    );

    const store = new WalrusMemoryStore();
    const record = await store.store('again');
    expect(record.blobId).toBe('BLOB_OLD');
  });

  it('throws when the publisher returns an error status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 413, statusText: 'Payload Too Large' }),
    );

    const store = new WalrusMemoryStore();
    await expect(store.store('too big')).rejects.toThrow('Walrus store failed: 413');
  });

  it('retrieves blob content from the aggregator', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, text: async () => 'stored content' }),
    );

    const store = new WalrusMemoryStore();
    expect(await store.retrieve('BLOB_NEW')).toBe('stored content');
  });

  it('returns null when retrieval fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const store = new WalrusMemoryStore();
    expect(await store.retrieve('missing')).toBeNull();
  });

  it('persistMemory never throws even when Walrus is down', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const store = new WalrusMemoryStore();
    await expect(
      store.persistMemory({
        id: '1',
        agentId: 'A',
        userId: 'u',
        conversationId: 'c',
        content: { text: 'hi' },
        role: 'user',
        createdAt: Date.now(),
      }),
    ).resolves.toBeUndefined();
  });
});
