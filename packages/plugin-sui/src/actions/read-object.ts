import { z } from 'zod';
import type { Action } from '@kairos/core';
import { truncateAddress } from '@kairos/core';

const paramsSchema = z.object({
  objectId: z.string().regex(/^0x[0-9a-fA-F]{1,64}$/, 'objectId must be a 0x-prefixed object id'),
});

export const readObjectAction: Action = {
  name: 'READ_OBJECT',
  similes: ['READ', 'INSPECT', 'GET_OBJECT', 'LOOK_UP', 'FETCH_OBJECT', 'VIEW_OBJECT'],
  description:
    'Read a Sui object by its id and report its type, owner, and content. Use when the user ' +
    'asks to read, inspect, look up, or view a Sui object (0x...). This does not sign a transaction.',
  schema: {
    type: 'object',
    properties: {
      objectId: {
        type: 'string',
        description: 'The id of the Sui object to read, starting with 0x.',
      },
    },
    required: ['objectId'],
  },

  validate: async () => true,

  handler: async (runtime, _message, _state, params, callback) => {
    const parsed = paramsSchema.safeParse(params);
    if (!parsed.success) {
      callback({ text: `Invalid parameters: ${parsed.error.message}` });
      return;
    }

    const object = await runtime.suiClient.getObject({
      id: parsed.data.objectId,
      options: { showType: true, showOwner: true, showContent: true },
    });

    if (object.error || !object.data) {
      callback({ text: `Object ${truncateAddress(parsed.data.objectId)} not found.` });
      return;
    }

    const { data } = object;
    const type = data.type ?? 'unknown type';
    const owner =
      typeof data.owner === 'object' && data.owner !== null
        ? JSON.stringify(data.owner)
        : String(data.owner ?? 'unknown');

    const fields =
      data.content && data.content.dataType === 'moveObject'
        ? JSON.stringify(data.content.fields)
        : '(no readable fields)';

    callback({
      text:
        `Object ${truncateAddress(parsed.data.objectId)}\n` +
        `Type: ${type}\n` +
        `Owner: ${owner}\n` +
        `Fields: ${fields}`,
    });
  },
};
