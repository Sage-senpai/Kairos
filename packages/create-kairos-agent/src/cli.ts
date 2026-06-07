#!/usr/bin/env node
import { createInterface } from 'node:readline/promises';
import { join } from 'node:path';
import { scaffoldAgent, type AgentNetwork } from './scaffold';

const NETWORKS: AgentNetwork[] = ['mainnet', 'testnet', 'devnet', 'localnet'];

function parseArgs(argv: string[]): { name: string; network: AgentNetwork } {
  const args = argv.slice(2);
  let name = '';
  let network: AgentNetwork = 'testnet';
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--network') {
      const next = args[++i];
      if (next && (NETWORKS as string[]).includes(next)) network = next as AgentNetwork;
    } else if (arg && !arg.startsWith('--')) {
      name = arg;
    }
  }
  return { name, network };
}

async function ask(question: string, fallback: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question(`${question} (${fallback}): `)).trim();
    return answer || fallback;
  } finally {
    rl.close();
  }
}

async function main(): Promise<void> {
  let { name, network } = parseArgs(process.argv);
  if (!name) name = await ask('Agent name', 'Atlas');

  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'agent';
  const targetDir = join(process.cwd(), 'agents', slug);

  const result = await scaffoldAgent({ name, network, targetDir });

  console.log(`\nCreated agent "${name}" in ${result.targetDir}`);
  console.log(`Files: ${result.files.join(', ')}`);
  console.log(`\nNext steps:`);
  console.log(`  cd ${result.targetDir}`);
  console.log(`  cp .env.example .env   # then fill in your keys`);
  console.log(`  pnpm install && pnpm start`);
}

main().catch((err) => {
  console.error('create-kairos-agent failed:', err);
  process.exitCode = 1;
});
