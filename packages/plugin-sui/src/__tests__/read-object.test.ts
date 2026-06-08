import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readObjectAction } from '../actions/read-object';
import type { AgentRuntime, Memory, State } from '@kairos-sui/core';

const mockMemory: Memory = {
  id: 'test-id',
  agentId: 'TestAgent',
  userId: 'user1',
  conversationId: 'conv1',
  content: { text: 'read object 0x5' },
  role: 'user',
  createdAt: Date.now(),
};

const mockState: State = {
  recentMessages: [],
  walletBalance: '0',
  suiAddress: '0xtest',
  additionalContext: '',
};

describe('readObjectAction', () => {
  let runtime: AgentRuntime;

  beforeEach(() => {
    runtime = {
      suiAddress: '0x' + '1'.repeat(64),
      suiClient: {
        getObject: vi.fn().mockResolvedValue({
          data: {
            objectId: '0x' + '5'.repeat(64),
            type: '0x2::coin::Coin<0x2::sui::SUI>',
            owner: { AddressOwner: '0xowner' },
            content: { dataType: 'moveObject', fields: { balance: '1000' } },
          },
        }),
      },
      getSetting: vi.fn().mockReturnValue(''),
      character: { suiNetwork: 'testnet' },
    } as unknown as AgentRuntime;
  });

  it('always validates (read-only)', async () => {
    expect(await readObjectAction.validate(runtime, mockMemory)).toBe(true);
  });

  it('reports the object type and fields', async () => {
    const callback = vi.fn();
    await readObjectAction.handler(
      runtime,
      mockMemory,
      mockState,
      { objectId: '0x' + '5'.repeat(64) },
      callback,
    );
    const arg = callback.mock.calls[0]?.[0];
    expect(arg.text).toContain('0x2::coin::Coin');
    expect(arg.text).toContain('balance');
    expect(arg.txDigest).toBeUndefined();
  });

  it('reports not found when the object is missing', async () => {
    (runtime.suiClient.getObject as ReturnType<typeof vi.fn>).mockResolvedValue({
      error: { code: 'notExists' },
      data: null,
    });
    const callback = vi.fn();
    await readObjectAction.handler(
      runtime,
      mockMemory,
      mockState,
      { objectId: '0x' + '9'.repeat(64) },
      callback,
    );
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining('not found') }),
    );
  });
});
