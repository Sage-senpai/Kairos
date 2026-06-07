import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import type { Plugin } from '@kairos/core';
import { logger, truncateAddress } from '@kairos/core';

import { transferSuiAction } from './actions/transfer-sui';
import { swapTokensAction } from './actions/swap-tokens';
import { stakeSuiAction } from './actions/stake-sui';
import { readObjectAction } from './actions/read-object';
import { getOwnedObjectsAction } from './actions/get-owned-objects';
import { balanceProvider } from './providers/balance';
import { priceProvider } from './providers/price';

/**
 * The Sui plugin. On registration it connects a `SuiClient` for the configured
 * network and derives the agent keypair from `SUI_PRIVATE_KEY`, then exposes
 * transfer / swap / stake / read actions and balance / price providers.
 */
export const suiPlugin: Plugin = {
  name: 'plugin-sui',
  actions: [
    transferSuiAction,
    swapTokensAction,
    stakeSuiAction,
    readObjectAction,
    getOwnedObjectsAction,
  ],
  providers: [balanceProvider, priceProvider],

  onRegister: async (runtime) => {
    // These assignments run synchronously before any await, so the runtime's
    // suiClient/keypair are set the moment registerPlugin invokes this hook.
    const network = runtime.character.suiNetwork;
    runtime.suiClient = new SuiClient({ url: getFullnodeUrl(network) });

    const privateKey = runtime.getSetting('SUI_PRIVATE_KEY');
    if (!privateKey) {
      throw new Error('SUI_PRIVATE_KEY is required for plugin-sui.');
    }
    const { secretKey } = decodeSuiPrivateKey(privateKey);
    runtime.keypair = Ed25519Keypair.fromSecretKey(secretKey);
    runtime.suiAddress = runtime.keypair.getPublicKey().toSuiAddress();

    logger.info(`plugin-sui ready on ${network} - ${truncateAddress(runtime.suiAddress)}`);
  },
};

export {
  transferSuiAction,
  swapTokensAction,
  stakeSuiAction,
  readObjectAction,
  getOwnedObjectsAction,
  balanceProvider,
  priceProvider,
};
