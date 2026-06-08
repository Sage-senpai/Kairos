import type { IAgentRuntime } from '@kairos-sui/core';
import { logger } from '@kairos-sui/core';

/** Minimal subset of the Telegram update shape we consume. */
interface TelegramUpdate {
  update_id: number;
  message?: {
    text?: string;
    chat?: { id: number };
    from?: { id: number };
  };
}

interface GetUpdatesResponse {
  ok: boolean;
  result?: TelegramUpdate[];
}

export interface TelegramClient {
  /** Stop the long-polling loop. */
  stop(): void;
}

export interface TelegramClientOptions {
  /** Long-poll timeout in seconds (default 30). */
  pollTimeout?: number;
}

const API_BASE = 'https://api.telegram.org/bot';

/** Send a text message to a Telegram chat. */
export async function sendMessage(token: string, chatId: number, text: string): Promise<void> {
  await fetch(`${API_BASE}${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

/** Handle a single Telegram update by routing it to the agent runtime. */
export async function processUpdate(
  runtime: IAgentRuntime,
  token: string,
  update: TelegramUpdate,
): Promise<void> {
  const message = update.message;
  if (!message?.text || !message.chat) return;

  const chatId = message.chat.id;
  const userId = String(message.from?.id ?? chatId);

  if (message.text.startsWith('/start')) {
    await sendMessage(token, chatId, `${runtime.character.name} is online. Ask me anything.`);
    return;
  }

  try {
    const reply = await runtime.processMessage(message.text, userId, String(chatId));
    await sendMessage(token, chatId, reply);
  } catch (err) {
    logger.error('Telegram message handling failed', err);
    await sendMessage(token, chatId, 'Sorry - something went wrong handling that.');
  }
}

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Start a Telegram bot bound to an agent. Long-polls `getUpdates` and routes
 * every text message through `runtime.processMessage`. Returns a handle whose
 * `stop()` ends the loop.
 */
export function createTelegramClient(
  runtime: IAgentRuntime,
  token: string,
  options: TelegramClientOptions = {},
): TelegramClient {
  if (!token) throw new Error('A Telegram bot token is required.');
  const pollTimeout = options.pollTimeout ?? 30;
  let running = true;
  let offset = 0;

  async function loop(): Promise<void> {
    logger.info('Telegram client polling for updates');
    while (running) {
      try {
        const res = await fetch(
          `${API_BASE}${token}/getUpdates?offset=${offset}&timeout=${pollTimeout}`,
        );
        const data = (await res.json()) as GetUpdatesResponse;
        if (data.ok && data.result) {
          for (const update of data.result) {
            offset = update.update_id + 1;
            await processUpdate(runtime, token, update);
          }
        }
      } catch (err) {
        logger.error('Telegram poll failed', err);
        await delay(2000);
      }
    }
  }

  void loop();
  return {
    stop(): void {
      running = false;
    },
  };
}
