import { describe, it, expect, vi, beforeEach } from 'vitest';
import { stakeSuiAction } from '../actions/stake-sui';
import type { AgentRuntime, Memory, State } from '@kairos/core';

const mockMemory: Memory = {
  id: 'test-id',
  agentId: 'TestAgent',
  userId: 'user1',
  conversationId: 'conv1',
  content: { text: 'stake 2 SUI with validator 0xabc' },
  role: 'user',
  createdAt: Date.now(),
};

const mockState: State = {
  recentMessages: [],
  walletBalance: '5.0000',
  suiAddress: '0xtest',
  additionalContext: '',
};

describe('stakeSuiAction', () => {
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

  it('validates when balance >= 1 SUI', async () => {
    expect(await stakeSuiAction.validate(runtime, mockMemory)).toBe(true);
  });

  it('fails validation when balance < 1 SUI', async () => {
    (runtime.suiClient.getBalance as ReturnType<typeof vi.fn>).mockResolvedValue({
      totalBalance: '500000',
    });
    expect(await stakeSuiAction.validate(runtime, mockMemory)).toBe(false);
  });

  it('executes and calls callback with tx digest', async () => {
    const callback = vi.fn();
    await stakeSuiAction.handler(
      runtime,
      mockMemory,
      mockState,
      { amount: 2, validatorAddress: '0x' + 'a'.repeat(64) },
      callback,
    );
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ txDigest: 'FakeTxDigest123' }));
  });

  it('handles invalid params gracefully', async () => {
    const callback = vi.fn();
    await stakeSuiAction.handler(runtime, mockMemory, mockState, {}, callback);
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining('Cannot stake') }),
    );
  });
});
