import { Transaction, coinWithBalance } from '@mysten/sui/transactions';
import { z } from 'zod';
import type { Action, SuiNetwork } from '@kairos/core';

/**
 * DeepBook v3 on-chain package ids and the DEEP coin type, per network.
 *
 * These are the published DeepBook v3 ids at time of writing. DeepBook upgrades
 * its package periodically — verify the current id before using on mainnet.
 * (We call the protocol directly via PTB rather than the deepbook-v3 SDK, which
 * requires @mysten/sui v2.x; this framework targets the v1.x SDK per CLAUDE.md.)
 */
const DEEPBOOK: Record<'mainnet' | 'testnet', { packageId: string; deepType: string }> = {
  mainnet: {
    packageId: '0x0e735f8c93a95722efd73521aca7a7652c0bb71ed1daf41b26dfd7d1ff71f748',
    deepType: '0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP',
  },
  testnet: {
    packageId: '0x22be4cade64bf2d02412c7e8d0e8beea2f78828b948118d46735315409371a3c',
    deepType: '0x36dbef866a1d62bf7328989a10fb2f07d769f4ee587c0de4a0a256e57e0a58a8::deep::DEEP',
  },
};

const paramsSchema = z.object({
  poolId: z.string().regex(/^0x[0-9a-fA-F]{1,64}$/, 'poolId must be a 0x-prefixed object id'),
  baseType: z.string().min(3),
  quoteType: z.string().min(3),
  amount: z.number().positive(),
  direction: z.enum(['base_to_quote', 'quote_to_base']),
  minOut: z.number().min(0).optional(),
});

export const swapTokensAction: Action = {
  name: 'SWAP_TOKENS',
  similes: ['SWAP', 'TRADE', 'EXCHANGE', 'CONVERT', 'BUY', 'SELL'],
  description:
    'Swap tokens on DeepBook v3 against a whitelisted pool. Use when the user asks to swap, ' +
    'trade, exchange, or convert one token for another. Requires the pool object id, the base ' +
    'and quote coin types, the input amount in base units, and a direction: "base_to_quote" ' +
    '(sell the base token) or "quote_to_base" (spend the quote token to buy the base token). ' +
    'Only available on mainnet and testnet.',
  schema: {
    type: 'object',
    properties: {
      poolId: { type: 'string', description: 'The DeepBook pool object id (0x...).' },
      baseType: { type: 'string', description: 'The fully-qualified base coin type.' },
      quoteType: { type: 'string', description: 'The fully-qualified quote coin type.' },
      amount: {
        type: 'number',
        description: 'The input amount in the smallest unit of the input coin.',
      },
      direction: {
        type: 'string',
        enum: ['base_to_quote', 'quote_to_base'],
        description:
          '"base_to_quote" to sell the base token, "quote_to_base" to buy the base token.',
      },
      minOut: {
        type: 'number',
        description: 'Optional minimum output (smallest unit) for slippage protection. Default 0.',
      },
    },
    required: ['poolId', 'baseType', 'quoteType', 'amount', 'direction'],
  },

  validate: async (runtime) => {
    const network = runtime.character.suiNetwork;
    return network === 'mainnet' || network === 'testnet';
  },

  handler: async (runtime, _message, _state, params, callback) => {
    const parsed = paramsSchema.safeParse(params);
    if (!parsed.success) {
      callback({ text: `Invalid parameters: ${parsed.error.message}` });
      return;
    }
    const { poolId, baseType, quoteType, amount, direction, minOut } = parsed.data;

    const network = runtime.character.suiNetwork as Extract<SuiNetwork, 'mainnet' | 'testnet'>;
    const config = DEEPBOOK[network];
    if (!config) {
      callback({ text: `DeepBook is not available on ${runtime.character.suiNetwork}.` });
      return;
    }

    const tx = new Transaction();
    // Whitelisted pools charge no DEEP fee, so we pass a zero-balance DEEP coin.
    const deepCoin = coinWithBalance({ type: config.deepType, balance: 0n });
    const inputType = direction === 'base_to_quote' ? baseType : quoteType;
    const inputCoin = coinWithBalance({ type: inputType, balance: BigInt(Math.trunc(amount)) });
    const fn =
      direction === 'base_to_quote' ? 'swap_exact_base_for_quote' : 'swap_exact_quote_for_base';

    // Returns [baseCoin, quoteCoin, deepCoin].
    const swap = tx.moveCall({
      target: `${config.packageId}::pool::${fn}`,
      typeArguments: [baseType, quoteType],
      arguments: [
        tx.object(poolId),
        inputCoin,
        deepCoin,
        tx.pure.u64(BigInt(Math.trunc(minOut ?? 0))),
        tx.object.clock(),
      ],
    });
    // Return both output coins (and any unspent DEEP) to the agent wallet.
    tx.transferObjects([swap[0]!, swap[1]!, swap[2]!], runtime.suiAddress);

    const result = await runtime.suiClient.signAndExecuteTransaction({
      signer: runtime.keypair,
      transaction: tx,
      options: { showEffects: true },
    });

    callback({
      text: `Swapped ${amount} (${direction}) on pool ${poolId.slice(0, 8)}…. Transaction confirmed.`,
      txDigest: result.digest,
    });
  },
};
