import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { AgentRuntime, logger, type Character } from '@kairos/core';
import { suiPlugin } from '@kairos/plugin-sui';
import { walrusPlugin } from '@kairos/plugin-walrus';
import { createRestServer } from '@kairos/client-rest';
import { createTelegramClient } from '@kairos/client-telegram';

const REQUIRED_ENV = ['SUI_PRIVATE_KEY', 'ANTHROPIC_API_KEY'] as const;

function loadCharacter(): Character {
  const raw = readFileSync(new URL('./character.json', import.meta.url), 'utf8');
  const resolved = raw.replace(/\$\{(\w+)\}/g, (_match, key: string) => process.env[key] ?? '');
  return JSON.parse(resolved) as Character;
}

async function main(): Promise<void> {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}.`);
  }

  const character = loadCharacter();
  const runtime = new AgentRuntime(character);
  runtime.registerPlugin(suiPlugin);
  runtime.registerPlugin(walrusPlugin);

  logger.info(`Agent "${character.name}" starting on ${character.suiNetwork}`);
  createRestServer(runtime, Number(process.env.PORT ?? 3002));

  // Optional: respond to messages over Telegram if a bot token is configured.
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  if (telegramToken) {
    createTelegramClient(runtime, telegramToken);
    logger.info('Sentinel is listening on Telegram');
  } else {
    logger.info('Set TELEGRAM_BOT_TOKEN to enable Telegram alerts');
  }
}

main().catch((err) => {
  logger.error('Fatal error during boot', err);
  process.exitCode = 1;
});
