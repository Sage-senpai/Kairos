import { describe, it, expect, vi, beforeEach } from 'vitest';
import { transferSuiAction } from '../actions/transfer-sui';
import type { AgentRuntime, Memory, State } from '@kairos/core';

const mockMemory: Memory = {
  id: 'test-id',
  agentId: 'TestAgent',
  userId: 'user1',
  conversationId: 'conv1',
  content: { text: 'send 0.1 SUI to 0xabc' },
  role: 'user',
  createdAt: Date.now(),
};

const mockState: State = {
  recentMessages: [],
  walletBalance: '5.0000',
  suiAddress: '0xtest',
  additionalContext: '',
};

describe('transferSuiAction', () => {
  let runtime: AgentRuntime;

  beforeEach(() => {
    runtime = {
      suiAddress: '0x' + '1'.repeat(64),
      keypair: {},
      suiClient: {
        getBalance: vi.fn().mockResolvedValue({ totalBalance: '5000000000' }),
        signAndExecuteTransaction: vi.fn().mockResolvedValue({ digest: 'FakeTxDigest123' }),
        waitForTransaction: vi.fn().mockResolvedValue({}),
      },
      getSetting: vi.fn().mockReturnValue(''),
      character: { suiNetwork: 'testnet' },
    } as unknown as AgentRuntime;
  });

  it('validates when balance exceeds the gas buffer', async () => {
    expect(await transferSuiAction.validate(runtime, mockMemory)).toBe(true);
  });

  it('fails validation when balance is too low', async () => {
    (runtime.suiClient.getBalance as ReturnType<typeof vi.fn>).mockResolvedValue({
      totalBalance: '100',
    });
    expect(await transferSuiAction.validate(runtime, mockMemory)).toBe(false);
  });

  it('executes and reports the tx digest', async () => {
    const callback = vi.fn();
    await transferSuiAction.handler(
      runtime,
      mockMemory,
      mockState,
      { recipient: '0x' + 'a'.repeat(64), amount: 0.1 },
      callback,
    );
    expect(runtime.suiClient.signAndExecuteTransaction).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ txDigest: 'FakeTxDigest123' }));
  });

  it('rejects invalid parameters without signing', async () => {
    const callback = vi.fn();
    await transferSuiAction.handler(runtime, mockMemory, mockState, {}, callback);
    expect(runtime.suiClient.signAndExecuteTransaction).not.toHaveBeenCalled();
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining('Invalid parameters') }),
    );
  });
});
