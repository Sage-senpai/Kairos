# Writing actions

> Actions are the things an agent can **do**. When the LLM decides to call an action, KAIROS executes it — signs a Sui transaction, reads a Sui object, writes to Walrus — and feeds the result back into the conversation.

---

## The Action interface

```typescript
interface Action {
  name: string          // SCREAMING_SNAKE_CASE identifier
  similes: string[]     // alternative phrasings the LLM might use
  description: string   // what the LLM reads to decide if this action fits
  schema: object        // JSON Schema for the parameters this action accepts
  validate: (runtime: AgentRuntime, message: Memory) => Promise<boolean>
  handler: (
    runtime: AgentRuntime,
    message: Memory,
    state: State,
    params: Record<string, unknown>,
    callback: (result: { text: string; txDigest?: string }) => void
  ) => Promise<void>
}
```

---

## Anatomy of a well-written action

### `name`

Must be unique across all registered plugins. Use `SCREAMING_SNAKE_CASE`. Prefix with a verb: `TRANSFER_SUI`, `SWAP_TOKENS`, `READ_OBJECT`, `STORE_ON_WALRUS`.

### `similes`

The LLM matches on these when the action name isn't an exact fit. Be generous — think of every way a user might phrase the request:

```typescript
similes: ['SEND', 'PAY', 'TRANSFER', 'SEND_TOKENS', 'SEND_COINS', 'MOVE_FUNDS'],
```

### `description`

This is the most important field. The LLM reads this verbatim when deciding whether to call your action. Write it like a precise instruction to the model:

```typescript
// Bad — too vague
description: 'Transfer SUI tokens'

// Good — tells the LLM exactly when and how to use this
description: 'Transfer SUI tokens to a Sui address. Use when the user asks to send, pay, transfer, or move SUI. Requires a recipient address (0x...) and an amount in SUI (not MIST).'
```

### `schema`

Valid JSON Schema (draft-07). Every parameter must be described. The LLM uses descriptions to populate the fields:

```typescript
schema: {
  type: 'object',
  properties: {
    recipient: {
      type: 'string',
      description: 'The Sui recipient address starting with 0x, 66 characters total',
    },
    amount: {
      type: 'number',
      description: 'The amount of SUI to send as a decimal number (e.g. 0.5 for half a SUI)',
    },
  },
  required: ['recipient', 'amount'],
},
```

### `validate`

Runs before `handler`. If it returns `false`, the action is skipped — the LLM's text response is still returned, but the transaction is not executed.

Use `validate` to check:
- Does the agent have enough balance?
- Is a required object available?
- Is the network state appropriate?

```typescript
validate: async (runtime, _message) => {
  const balance = await runtime.suiClient.getBalance({
    owner: runtime.suiAddress,
  });
  return Number(balance.totalBalance) > 1_000_000; // at least 0.001 SUI for gas
},
```

### `handler`

The actual execution. Always:
1. Parse and validate params (use `zod` for safety)
2. Build the `Transaction` PTB
3. Sign and submit
4. Call `callback` with the result text and tx digest

```typescript
handler: async (runtime, _message, _state, params, callback) => {
  // 1. Parse params safely
  const parsed = z.object({
    recipient: z.string().startsWith('0x').length(66),
    amount: z.number().positive().max(1000),
  }).safeParse(params);

  if (!parsed.success) {
    callback({ text: `Invalid parameters: ${parsed.error.message}` });
    return;
  }

  // 2. Build the transaction
  const tx = new Transaction();
  const mistAmount = BigInt(Math.floor(parsed.data.amount * 1_000_000_000));
  const [coin] = tx.splitCoins(tx.gas, [mistAmount]);
  tx.transferObjects([coin], parsed.data.recipient);

  // 3. Sign and execute
  const result = await runtime.suiClient.signAndExecuteTransaction({
    signer: runtime.keypair,
    transaction: tx,
    options: { showEffects: true },
  });

  // 4. Callback with result
  callback({
    text: `Sent ${parsed.data.amount} SUI to ${parsed.data.recipient.slice(0,8)}...${parsed.data.recipient.slice(-4)}. Transaction confirmed.`,
    txDigest: result.digest,
  });
},
```

---

## Complete example — stake SUI action

```typescript
// packages/plugin-sui/src/actions/stake.ts
import { Transaction } from '@mysten/sui/transactions';
import { z } from 'zod';
import type { Action } from '@kairos/core';

const SUI_SYSTEM_STATE_ID = '0x0000000000000000000000000000000000000000000000000000000000000005';
const STAKE_FUNCTION = '0x3::sui_system::request_add_stake';

const paramsSchema = z.object({
  amount: z.number().positive().min(1, 'Minimum stake is 1 SUI'),
  validatorAddress: z.string().startsWith('0x'),
});

export const stakeAction: Action = {
  name: 'STAKE_SUI',
  similes: ['STAKE', 'DELEGATE', 'EARN_STAKING_REWARDS', 'LIQUID_STAKE'],
  description:
    'Stake SUI tokens with a validator to earn staking rewards. ' +
    'Use when the user asks to stake, delegate, or earn staking rewards. ' +
    'Requires an amount in SUI and a validator address.',
  schema: {
    type: 'object',
    properties: {
      amount: {
        type: 'number',
        description: 'Amount of SUI to stake, minimum 1 SUI',
      },
      validatorAddress: {
        type: 'string',
        description: 'The Sui address of the validator to stake with (0x...)',
      },
    },
    required: ['amount', 'validatorAddress'],
  },

  validate: async (runtime) => {
    const balance = await runtime.suiClient.getBalance({ owner: runtime.suiAddress });
    return Number(balance.totalBalance) >= 1_000_000_000; // min 1 SUI
  },

  handler: async (runtime, _msg, _state, params, callback) => {
    const parsed = paramsSchema.safeParse(params);
    if (!parsed.success) {
      callback({ text: `Cannot stake: ${parsed.error.message}` });
      return;
    }

    const { amount, validatorAddress } = parsed.data;
    const mistAmount = BigInt(Math.floor(amount * 1_000_000_000));

    const tx = new Transaction();
    const [stakeCoin] = tx.splitCoins(tx.gas, [mistAmount]);
    tx.moveCall({
      target: STAKE_FUNCTION,
      arguments: [
        tx.object(SUI_SYSTEM_STATE_ID),
        stakeCoin,
        tx.pure.address(validatorAddress),
      ],
    });

    const result = await runtime.suiClient.signAndExecuteTransaction({
      signer: runtime.keypair,
      transaction: tx,
      options: { showEffects: true },
    });

    callback({
      text: `Staked ${amount} SUI with validator ${validatorAddress.slice(0,8)}...${validatorAddress.slice(-4)}. You will start earning rewards next epoch. TX: ${result.digest}`,
      txDigest: result.digest,
    });
  },
};
```

---

## Testing an action

```typescript
// packages/plugin-sui/src/__tests__/stake.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { stakeAction } from '../actions/stake';
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

const mockState = {
  recentMessages: [],
  walletBalance: '5.0',
  suiAddress: '0xtest',
  additionalContext: '',
} satisfies State;

describe('stakeAction', () => {
  let runtime: AgentRuntime;

  beforeEach(() => {
    runtime = {
      suiAddress: '0x' + '1'.repeat(64),
      keypair: {} as any,
      suiClient: {
        getBalance: vi.fn().mockResolvedValue({ totalBalance: '5000000000' }),
        signAndExecuteTransaction: vi.fn().mockResolvedValue({
          digest: 'FakeTxDigest123',
        }),
      },
      getSetting: vi.fn().mockReturnValue(''),
      character: { suiNetwork: 'testnet' } as any,
    } as unknown as AgentRuntime;
  });

  it('validates when balance >= 1 SUI', async () => {
    expect(await stakeAction.validate(runtime, mockMemory)).toBe(true);
  });

  it('fails validation when balance < 1 SUI', async () => {
    (runtime.suiClient.getBalance as ReturnType<typeof vi.fn>)
      .mockResolvedValue({ totalBalance: '500000' });
    expect(await stakeAction.validate(runtime, mockMemory)).toBe(false);
  });

  it('executes and calls callback with tx digest', async () => {
    const callback = vi.fn();
    await stakeAction.handler(
      runtime, mockMemory, mockState,
      { amount: 2, validatorAddress: '0x' + 'a'.repeat(64) },
      callback
    );
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ txDigest: 'FakeTxDigest123' })
    );
  });

  it('handles invalid params gracefully', async () => {
    const callback = vi.fn();
    await stakeAction.handler(runtime, mockMemory, mockState, {}, callback);
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining('Cannot stake') })
    );
  });
});
```

---

## Common patterns

### Reading an owned object before acting

```typescript
const objects = await runtime.suiClient.getOwnedObjects({
  owner: runtime.suiAddress,
  filter: { StructType: '0x2::coin::Coin<0x2::sui::SUI>' },
  options: { showContent: true },
});
```

### Finding a specific coin to use in a PTB

```typescript
const coins = await runtime.suiClient.getCoins({
  owner: runtime.suiAddress,
  coinType: '0x2::sui::SUI',
});
// Use coins.data[0].coinObjectId in tx.object()
```

### Waiting for transaction confirmation

```typescript
const result = await runtime.suiClient.signAndExecuteTransaction({
  signer: runtime.keypair,
  transaction: tx,
  options: { showEffects: true },
});

// Wait for finality
await runtime.suiClient.waitForTransaction({ digest: result.digest });
```

### Calling a Move function

```typescript
tx.moveCall({
  target: `${PACKAGE_ID}::${MODULE}::${FUNCTION}`,
  typeArguments: ['0x2::sui::SUI'],
  arguments: [
    tx.object(objectId),
    tx.pure.u64(amount),
    tx.pure.address(recipient),
  ],
});
```
