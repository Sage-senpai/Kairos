import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { AgentRuntime, logger, type Character } from '@kairos/core';
import { suiPlugin } from '@kairos/plugin-sui';
import { walrusPlugin } from '@kairos/plugin-walrus';
import { createRestServer } from '@kairos/client-rest';

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
  createRestServer(runtime, Number(process.env.PORT ?? 3001));

  // Publish a market summary on a fixed cadence (default: hourly).
  const intervalMs = Number(process.env.ORACLE_INTERVAL_MS ?? 3_600_000);
  const publish = (): void => {
    void runtime
      .processMessage(
        'Fetch the current prices and store a concise market summary on Walrus with the label "price-summary".',
        'oracle',
        'oracle-loop',
      )
      .then(() => logger.success('Published market summary to Walrus'))
      .catch((err) => logger.error('Oracle publish failed', err));
  };

  setInterval(publish, intervalMs);
  logger.info(`Oracle will publish every ${Math.round(intervalMs / 1000)}s`);
}

main().catch((err) => {
  logger.error('Fatal error during boot', err);
  process.exitCode = 1;
});
