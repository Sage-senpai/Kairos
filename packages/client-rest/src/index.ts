import express, { type Request, type Response } from 'express';
import type { Server } from 'node:http';
import type { IAgentRuntime } from '@kairos-sui/core';
import { formatSui, logger } from '@kairos-sui/core';

interface MessageBody {
  text?: unknown;
  userId?: unknown;
  conversationId?: unknown;
}

/**
 * Start an Express REST server that exposes a KAIROS agent over HTTP.
 *
 * Routes:
 *   GET  /health   - liveness probe
 *   GET  /balance  - the agent's SUI balance
 *   POST /message  - send the agent a message: { text, userId, conversationId? }
 *
 * Returns the underlying `http.Server` so callers can close it in tests.
 */
export function createRestServer(runtime: IAgentRuntime, port = 3000): Server {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', agent: runtime.character.name });
  });

  app.get('/balance', async (_req: Request, res: Response) => {
    try {
      const balance = await runtime.suiClient.getBalance({ owner: runtime.suiAddress });
      res.json({
        address: runtime.suiAddress,
        balance: formatSui(balance.totalBalance),
        unit: 'SUI',
      });
    } catch (err) {
      logger.error('GET /balance failed', err);
      res.status(500).json({ error: 'Failed to read balance' });
    }
  });

  app.post('/message', async (req: Request, res: Response) => {
    const { text, userId, conversationId } = req.body as MessageBody;

    if (typeof text !== 'string' || text.trim() === '') {
      res.status(400).json({ error: 'Field "text" is required and must be a non-empty string.' });
      return;
    }
    if (typeof userId !== 'string' || userId.trim() === '') {
      res.status(400).json({ error: 'Field "userId" is required and must be a string.' });
      return;
    }

    try {
      const reply = await runtime.processMessage(
        text,
        userId,
        typeof conversationId === 'string' ? conversationId : undefined,
      );
      res.json({ text: reply });
    } catch (err) {
      logger.error('POST /message failed', err);
      res.status(500).json({ error: 'Agent failed to process the message.' });
    }
  });

  const server = app.listen(port, () => {
    logger.info(`REST server running on port ${port}`);
  });

  return server;
}
