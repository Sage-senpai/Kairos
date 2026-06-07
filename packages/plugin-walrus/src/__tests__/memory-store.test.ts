import { describe, it, expect, vi, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rm } from 'node:fs/promises';
import { WalrusMemoryStore } from '../memory-store';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('WalrusMemoryStore', () => {
  it('stores content via PUT /v1/blobs and extracts the blobId from newlyCreated', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ newlyCreated: { blobObject: { blobId: 'BLOB_NEW' } } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const store = new WalrusMemoryStore();
    const record = await store.store('hello world', 'greeting');
    expect(record.blobId).toBe('BLOB_NEW');
    expect(record.summary).toBe('greeting');
    expect(store.getRecent()).toHaveLength(1);
    // Lock the current Walrus endpoint: PUT /v1/blobs?epochs=N
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/v1/blobs?epochs='),
      expect.objectContaining({ method: 'PUT' }),
    );
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

  it('retrieves blob content from the aggregator at /v1/blobs/:id', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => 'stored content' });
    vi.stubGlobal('fetch', fetchMock);

    const store = new WalrusMemoryStore();
    expect(await store.retrieve('BLOB_NEW')).toBe('stored content');
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/v1/blobs/BLOB_NEW'));
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

describe('WalrusMemoryStore persistence (cross-session)', () => {
  it('reloads the blob index from disk on init', async () => {
    const indexPath = join(tmpdir(), `kairos-test-${Math.random().toString(36).slice(2)}.json`);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ newlyCreated: { blobObject: { blobId: 'PERSISTED_BLOB' } } }),
      }),
    );

    try {
      // Session 1: store a record, which writes the index to disk.
      const first = new WalrusMemoryStore(undefined, undefined, { indexPath });
      await first.init();
      await first.store('remember me', 'note');
      expect(first.getRecent()).toHaveLength(1);

      // Session 2: a fresh store loads the prior record from disk.
      const second = new WalrusMemoryStore(undefined, undefined, { indexPath });
      await second.init();
      expect(second.getRecent()).toHaveLength(1);
      expect(second.getRecent()[0]?.blobId).toBe('PERSISTED_BLOB');
    } finally {
      await rm(indexPath, { force: true });
    }
  });

  it('starts empty when no index file exists yet', async () => {
    const store = new WalrusMemoryStore(undefined, undefined, {
      indexPath: join(tmpdir(), `kairos-missing-${Math.random().toString(36).slice(2)}.json`),
    });
    await store.init();
    expect(store.getRecent()).toHaveLength(0);
  });
});
