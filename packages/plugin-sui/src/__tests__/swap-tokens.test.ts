import { describe, it, expect, vi, beforeEach } from 'vitest';
import { swapTokensAction } from '../actions/swap-tokens';
import type { AgentRuntime, Memory, State } from '@kairos/core';

const mockMemory: Memory = {
  id: 'test-id',
  agentId: 'TestAgent',
  userId: 'user1',
  conversationId: 'conv1',
  content: { text: 'swap 1 SUI for USDC' },
  role: 'user',
  createdAt: Date.now(),
};

const mockState: State = {
  recentMessages: [],
  walletBalance: '5.0000',
  suiAddress: '0xtest',
  additionalContext: '',
};

function makeRuntime(network: string): AgentRuntime {
  return {
    suiAddress: '0x' + '1'.repeat(64),
    keypair: {},
    suiClient: {
      signAndExecuteTransaction: vi.fn().mockResolvedValue({ digest: 'SwapDigest123' }),
    },
    getSetting: vi.fn().mockReturnValue(''),
    character: { suiNetwork: network },
  } as unknown as AgentRuntime;
}

describe('swapTokensAction', () => {
  let runtime: AgentRuntime;

  beforeEach(() => {
    runtime = makeRuntime('testnet');
  });

  it('validates on mainnet and testnet only', async () => {
    expect(await swapTokensAction.validate(makeRuntime('testnet'), mockMemory)).toBe(true);
    expect(await swapTokensAction.validate(makeRuntime('mainnet'), mockMemory)).toBe(true);
    expect(await swapTokensAction.validate(makeRuntime('devnet'), mockMemory)).toBe(false);
  });

  it('builds and signs a swap with valid params', async () => {
    const callback = vi.fn();
    await swapTokensAction.handler(
      runtime,
      mockMemory,
      mockState,
      {
        poolId: '0x' + 'a'.repeat(64),
        baseType: '0x2::sui::SUI',
        quoteType: '0xabc::usdc::USDC',
        amount: 1_000_000_000,
        direction: 'base_to_quote',
      },
      callback,
    );
    expect(runtime.suiClient.signAndExecuteTransaction).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ txDigest: 'SwapDigest123' }),
    );
  });

  it('rejects invalid params without signing', async () => {
    const callback = vi.fn();
    await swapTokensAction.handler(runtime, mockMemory, mockState, { poolId: 'nope' }, callback);
    expect(runtime.suiClient.signAndExecuteTransaction).not.toHaveBeenCalled();
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining('Invalid parameters') }),
    );
  });
});
