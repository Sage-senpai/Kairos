import { z } from 'zod';
import type { Action } from '@kairos-sui/core';
import { getStore } from '../store-state';

const paramsSchema = z.object({
  blobId: z.string().min(1, 'blobId must not be empty'),
});

export const retrieveFromWalrusAction: Action = {
  name: 'RETRIEVE_FROM_WALRUS',
  similes: ['RETRIEVE', 'RECALL', 'READ_BLOB', 'GET_FROM_WALRUS', 'FETCH_MEMORY', 'LOAD_NOTE'],
  description:
    'Retrieve previously stored content from Walrus by its blob id. Use when the user asks to ' +
    'recall, retrieve, read back, or fetch something that was stored on Walrus, and a blob id is ' +
    'known (the recent-memory context lists blob ids).',
  schema: {
    type: 'object',
    properties: {
      blobId: {
        type: 'string',
        description: 'The Walrus blob id to retrieve.',
      },
    },
    required: ['blobId'],
  },

  validate: async () => getStore() !== null,

  handler: async (_runtime, _message, _state, params, callback) => {
    const parsed = paramsSchema.safeParse(params);
    if (!parsed.success) {
      callback({ text: `Invalid parameters: ${parsed.error.message}` });
      return;
    }

    const store = getStore();
    if (!store) {
      callback({ text: 'Walrus storage is not configured.' });
      return;
    }

    const content = await store.retrieve(parsed.data.blobId);
    if (content === null) {
      callback({ text: `Could not retrieve blob ${parsed.data.blobId}.` });
      return;
    }

    callback({
      text: `Retrieved from Walrus (blob ${parsed.data.blobId.slice(0, 8)}):\n${content}`,
    });
  },
};
