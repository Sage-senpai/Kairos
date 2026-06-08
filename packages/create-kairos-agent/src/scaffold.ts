import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export type AgentNetwork = 'mainnet' | 'testnet' | 'devnet' | 'localnet';

export interface ScaffoldOptions {
  /** Agent name (proper noun, e.g. "Atlas"). */
  name: string;
  /** Sui network. Defaults to "testnet". */
  network?: AgentNetwork;
  /** Plugin names. Defaults to ["plugin-sui", "plugin-walrus"]. */
  plugins?: string[];
  /** Directory to create the agent in. */
  targetDir: string;
}

export interface ScaffoldResult {
  targetDir: string;
  files: string[];
}

function characterJson(name: string, network: AgentNetwork, plugins: string[]): string {
  return `${JSON.stringify(
    {
      name,
      bio: `You are ${name}, an autonomous agent running on Sui. Describe your purpose, what makes you distinct, your capabilities, and your guiding constraint.`,
      lore: [`${name} was created with KAIROS.`],
      systemRules: ['Never fabricate a transaction digest.'],
      model: 'claude-sonnet-4-6',
      suiNetwork: network,
      settings: {
        SUI_PRIVATE_KEY: '${SUI_PRIVATE_KEY}',
        ANTHROPIC_API_KEY: '${ANTHROPIC_API_KEY}',
        WALRUS_PUBLISHER_URL: '${WALRUS_PUBLISHER_URL}',
        WALRUS_AGGREGATOR_URL: '${WALRUS_AGGREGATOR_URL}',
      },
      plugins,
    },
    null,
    2,
  )}\n`;
}

const INDEX_TS = `import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { AgentRuntime, logger, type Character } from '@kairos-sui/core';
import { suiPlugin } from '@kairos-sui/plugin-sui';
import { walrusPlugin } from '@kairos-sui/plugin-walrus';
import { createRestServer } from '@kairos-sui/client-rest';

const REQUIRED_ENV = ['SUI_PRIVATE_KEY', 'ANTHROPIC_API_KEY'] as const;

function loadCharacter(): Character {
  const raw = readFileSync(new URL('./character.json', import.meta.url), 'utf8');
  const resolved = raw.replace(/\\$\\{(\\w+)\\}/g, (_m, key: string) => process.env[key] ?? '');
  return JSON.parse(resolved) as Character;
}

async function main(): Promise<void> {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(\`Missing required environment variables: \${missing.join(', ')}.\`);
  }

  const character = loadCharacter();
  const runtime = new AgentRuntime(character);
  runtime.registerPlugin(suiPlugin);
  runtime.registerPlugin(walrusPlugin);

  logger.info(\`Agent "\${character.name}" starting on \${character.suiNetwork}\`);
  createRestServer(runtime, Number(process.env.PORT ?? 3000));
}

main().catch((err) => {
  logger.error('Fatal error during boot', err);
  process.exitCode = 1;
});
`;

const ENV_EXAMPLE = `# Copy to .env and fill in. NEVER commit .env.
SUI_PRIVATE_KEY=suiprivkey1_REPLACE_WITH_YOUR_KEY
ANTHROPIC_API_KEY=sk-ant-REPLACE_WITH_YOUR_KEY
WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space
WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space
PORT=3000
LOG_LEVEL=info
`;

function packageJson(name: string): string {
  const pkgName =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'agent';
  return `${JSON.stringify(
    {
      name: `@kairos-sui/agent-${pkgName}`,
      version: '0.0.1',
      private: true,
      type: 'module',
      scripts: { start: 'tsx index.ts', dev: 'tsx watch index.ts', typecheck: 'tsc --noEmit' },
      dependencies: {
        '@kairos-sui/client-rest': '^0.1.0',
        '@kairos-sui/core': '^0.1.0',
        '@kairos-sui/plugin-sui': '^0.1.0',
        '@kairos-sui/plugin-walrus': '^0.1.0',
        dotenv: '^17.4.0',
      },
      devDependencies: { tsx: '^4.19.0' },
    },
    null,
    2,
  )}\n`;
}

const TSCONFIG = `${JSON.stringify(
  {
    extends: '../../tsconfig.base.json',
    compilerOptions: { module: 'ESNext', moduleResolution: 'Bundler', noEmit: true },
    include: ['index.ts'],
  },
  null,
  2,
)}\n`;

/** Write a complete KAIROS agent scaffold into `targetDir`. */
export async function scaffoldAgent(options: ScaffoldOptions): Promise<ScaffoldResult> {
  const name = options.name.trim();
  if (!name) throw new Error('Agent name is required.');
  const network = options.network ?? 'testnet';
  const plugins = options.plugins ?? ['plugin-sui', 'plugin-walrus'];
  const { targetDir } = options;

  await mkdir(targetDir, { recursive: true });

  const files: Array<[string, string]> = [
    ['character.json', characterJson(name, network, plugins)],
    ['index.ts', INDEX_TS],
    ['.env.example', ENV_EXAMPLE],
    ['package.json', packageJson(name)],
    ['tsconfig.json', TSCONFIG],
  ];

  for (const [file, content] of files) {
    await writeFile(join(targetDir, file), content, 'utf8');
  }

  return { targetDir, files: files.map(([file]) => file) };
}
