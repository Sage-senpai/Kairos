import type { Action } from '@kairos-sui/core';
import { truncateAddress } from '@kairos-sui/core';

const MAX_LISTED = 50;

export const getOwnedObjectsAction: Action = {
  name: 'GET_OWNED_OBJECTS',
  similes: ['MY_OBJECTS', 'LIST_OBJECTS', 'OWNED_OBJECTS', 'WHAT_DO_I_OWN', 'MY_ASSETS'],
  description:
    'List the objects owned by this agent wallet, with their ids and types. Use when the user ' +
    'asks what objects, assets, or NFTs they own, or to list the contents of the wallet. ' +
    'Does not sign a transaction.',
  schema: {
    type: 'object',
    properties: {},
  },

  validate: async () => true,

  handler: async (runtime, _message, _state, _params, callback) => {
    const owned = await runtime.suiClient.getOwnedObjects({
      owner: runtime.suiAddress,
      options: { showType: true },
      limit: MAX_LISTED,
    });

    if (owned.data.length === 0) {
      callback({ text: 'This wallet owns no objects.' });
      return;
    }

    const lines = owned.data
      .map((entry) => {
        const id = entry.data?.objectId;
        const type = entry.data?.type ?? 'unknown type';
        return id ? `- ${truncateAddress(id)} (${type})` : null;
      })
      .filter((line): line is string => line !== null);

    const suffix = owned.hasNextPage ? `\n...and more (showing first ${MAX_LISTED}).` : '';
    callback({ text: `Owned objects (${lines.length}):\n${lines.join('\n')}${suffix}` });
  },
};
