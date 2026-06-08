import { Transaction } from '@mysten/sui/transactions';
import { z } from 'zod';
import type { Action } from '@kairos-sui/core';
import { suiToMist, truncateAddress } from '@kairos-sui/core';

const SUI_SYSTEM_STATE_ID = '0x0000000000000000000000000000000000000000000000000000000000000005';
const STAKE_FUNCTION = '0x3::sui_system::request_add_stake';

const paramsSchema = z.object({
  amount: z.number().positive().min(1, 'Minimum stake is 1 SUI'),
  validatorAddress: z
    .string()
    .regex(/^0x[0-9a-fA-F]{1,64}$/, 'validatorAddress must be a 0x-prefixed address'),
});

/** Minimum balance (in MIST) required to stake - 1 SUI. */
const MIN_STAKE_MIST = 1_000_000_000n;

export const stakeSuiAction: Action = {
  name: 'STAKE_SUI',
  similes: ['STAKE', 'DELEGATE', 'EARN_STAKING_REWARDS', 'LIQUID_STAKE'],
  description:
    'Stake SUI tokens with a validator to earn staking rewards. Use when the user asks to ' +
    'stake, delegate, or earn staking rewards. Requires an amount in SUI and a validator address.',
  schema: {
    type: 'object',
    properties: {
      amount: {
        type: 'number',
        description: 'Amount of SUI to stake, minimum 1 SUI.',
      },
      validatorAddress: {
        type: 'string',
        description: 'The Sui address of the validator to stake with (0x...).',
      },
    },
    required: ['amount', 'validatorAddress'],
  },

  validate: async (runtime) => {
    try {
      const balance = await runtime.suiClient.getBalance({ owner: runtime.suiAddress });
      return BigInt(balance.totalBalance) >= MIN_STAKE_MIST;
    } catch {
      return false;
    }
  },

  handler: async (runtime, _message, _state, params, callback) => {
    const parsed = paramsSchema.safeParse(params);
    if (!parsed.success) {
      callback({ text: `Cannot stake: ${parsed.error.message}` });
      return;
    }
    const { amount, validatorAddress } = parsed.data;

    const tx = new Transaction();
    const [stakeCoin] = tx.splitCoins(tx.gas, [suiToMist(amount)]);
    tx.moveCall({
      target: STAKE_FUNCTION,
      arguments: [tx.object(SUI_SYSTEM_STATE_ID), stakeCoin, tx.pure.address(validatorAddress)],
    });

    const result = await runtime.suiClient.signAndExecuteTransaction({
      signer: runtime.keypair,
      transaction: tx,
      options: { showEffects: true },
    });
    await runtime.suiClient.waitForTransaction({ digest: result.digest });

    callback({
      text:
        `Staked ${amount} SUI with validator ${truncateAddress(validatorAddress)}. ` +
        `You will start earning rewards next epoch.`,
      txDigest: result.digest,
    });
  },
};
