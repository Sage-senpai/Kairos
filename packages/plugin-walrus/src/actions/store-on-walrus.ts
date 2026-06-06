import { z } from 'zod';
import type { Action } from '@kairos/core';
import { getStore } from '../store-state';

const paramsSchema = z.object({
  content: z.string().min(1, 'content must not be empty'),
  label: z.string().optional(),
});

export const storeOnWalrusAction: Action = {
  name: 'STORE_ON_WALRUS',
  similes: ['STORE', 'SAVE', 'REMEMBER', 'PERSIST', 'WRITE_TO_WALRUS', 'SAVE_NOTE'],
  description:
    'Store a piece of content permanently on Walrus, returning a blob id. Use when the user ' +
    'asks to store, save, remember, or persist a note, fact, or arbitrary text. The content is ' +
    'user-owned and retrievable later by its blob id.',
  schema: {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        description: 'The text content to store on Walrus.',
      },
      label: {
        type: 'string',
        description: 'An optional short label describing the content.',
      },
    },
    required: ['content'],
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

    const record = await store.store(parsed.data.content, parsed.data.label);
    callback({
      text: `Stored on Walrus. Blob id: ${record.blobId}. You can retrieve it any time with this id.`,
    });
  },
};
