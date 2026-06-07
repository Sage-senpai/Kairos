import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { AgentRuntime, logger, type Character } from '@kairos/core';
import { suiPlugin } from '@kairos/plugin-sui';
import { walrusPlugin } from '@kairos/plugin-walrus';
import { createRestServer } from '@kairos/client-rest';

const REQUIRED_ENV = ['SUI_PRIVATE_KEY', 'ANTHROPIC_API_KEY'] as const;

/** Load character.json and resolve ${VAR} placeholders from the environment. */
function loadCharacter(): Character {
  const raw = readFileSync(new URL('./character.json', import.meta.url), 'utf8');
  const resolved = raw.replace(/\$\{(\w+)\}/g, (_match, key: string) => process.env[key] ?? '');
  return JSON.parse(resolved) as Character;
}

async function main(): Promise<void> {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
        'Copy .env.example to .env and fill it in.',
    );
  }

  const character = loadCharacter();
  const runtime = new AgentRuntime(character);

  // Order matters - register plugin-sui before plugin-walrus.
  runtime.registerPlugin(suiPlugin);
  runtime.registerPlugin(walrusPlugin);

  logger.info(`Agent "${character.name}" starting...`);
  logger.info(`Address: ${runtime.suiAddress || '(initialising)'}`);
  logger.info(`Network: ${character.suiNetwork}`);

  const port = Number(process.env.PORT ?? 3000);
  createRestServer(runtime, port);
}

main().catch((err) => {
  logger.error('Fatal error during boot', err);
  process.exitCode = 1;
});

// Surface the helper for tooling/tests that import this module.
export { loadCharacter };
