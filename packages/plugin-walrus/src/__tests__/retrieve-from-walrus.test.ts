import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { retrieveFromWalrusAction } from '../actions/retrieve-from-walrus';
import { WalrusMemoryStore } from '../memory-store';
import { setStore } from '../store-state';
import type { AgentRuntime, Memory, State } from '@kairos-sui/core';

const mockMemory = { content: { text: 'recall blob X' } } as Memory;
const mockState = {} as State;
const runtime = {} as AgentRuntime;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('retrieveFromWalrusAction', () => {
  beforeEach(() => {
    setStore(new WalrusMemoryStore());
  });

  it('validates when a store is configured', async () => {
    expect(await retrieveFromWalrusAction.validate(runtime, mockMemory)).toBe(true);
  });

  it('retrieves blob content by id', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, text: async () => 'the stored note' }),
    );
    const callback = vi.fn();
    await retrieveFromWalrusAction.handler(
      runtime,
      mockMemory,
      mockState,
      { blobId: 'X' },
      callback,
    );
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining('the stored note') }),
    );
  });

  it('reports failure when the blob cannot be read', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const callback = vi.fn();
    await retrieveFromWalrusAction.handler(
      runtime,
      mockMemory,
      mockState,
      { blobId: 'gone' },
      callback,
    );
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining('Could not retrieve') }),
    );
  });

  it('rejects invalid params', async () => {
    const callback = vi.fn();
    await retrieveFromWalrusAction.handler(runtime, mockMemory, mockState, {}, callback);
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining('Invalid parameters') }),
    );
  });
});
