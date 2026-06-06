import { Transaction } from '@mysten/sui/transactions';
import { z } from 'zod';
import type { Action } from '@kairos/core';
import { suiToMist, truncateAddress } from '@kairos/core';

const paramsSchema = z.object({
  recipient: z
    .string()
    .regex(/^0x[0-9a-fA-F]{1,64}$/, 'recipient must be a 0x-prefixed Sui address'),
  amount: z.number().positive().max(1_000_000, 'amount is unrealistically large'),
});

/** Minimum balance (in MIST) required before we attempt a transfer — covers gas. */
const MIN_GAS_BUFFER = 2_000_000n;

export const transferSuiAction: Action = {
  name: 'TRANSFER_SUI',
  similes: ['SEND', 'PAY', 'TRANSFER', 'SEND_SUI', 'SEND_TOKENS', 'SEND_COINS', 'MOVE_FUNDS'],
  description:
    'Transfer SUI tokens to a Sui address. Use when the user asks to send, pay, transfer, or ' +
    'move SUI. Requires a recipient address (0x...) and an amount in SUI (not MIST).',
  schema: {
    type: 'object',
    properties: {
      recipient: {
        type: 'string',
        description: 'The Sui recipient address, starting with 0x.',
      },
      amount: {
        type: 'number',
        description: 'The amount of SUI to send as a decimal number (e.g. 0.5 for half a SUI).',
      },
    },
    required: ['recipient', 'amount'],
  },

  validate: async (runtime) => {
    try {
      const balance = await runtime.suiClient.getBalance({ owner: runtime.suiAddress });
      return BigInt(balance.totalBalance) > MIN_GAS_BUFFER;
    } catch {
      return false;
    }
  },

  handler: async (runtime, _message, _state, params, callback) => {
    const parsed = paramsSchema.safeParse(params);
    if (!parsed.success) {
      callback({ text: `Invalid parameters: ${parsed.error.message}` });
      return;
    }
    const { recipient, amount } = parsed.data;

    const tx = new Transaction();
    const [coin] = tx.splitCoins(tx.gas, [suiToMist(amount)]);
    tx.transferObjects([coin], recipient);

    const result = await runtime.suiClient.signAndExecuteTransaction({
      signer: runtime.keypair,
      transaction: tx,
      options: { showEffects: true },
    });

    callback({
      text: `Sent ${amount} SUI to ${truncateAddress(recipient)}. Transaction confirmed.`,
      txDigest: result.digest,
    });
  },
};
