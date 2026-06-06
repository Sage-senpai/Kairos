<div align="center">

```
  ██╗  ██╗ █████╗ ██╗██████╗  ██████╗ ███████╗
  ██║ ██╔╝██╔══██╗██║██╔══██╗██╔═══██╗██╔════╝
  █████╔╝ ███████║██║██████╔╝██║   ██║███████╗
  ██╔═██╗ ██╔══██║██║██╔══██╗██║   ██║╚════██║
  ██║  ██╗██║  ██║██║██║  ██║╚██████╔╝███████║
  ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝
```

**The AI agent framework built for Sui.**  
Agents that act. Transactions that compose. Memory that persists.

[![npm version](https://img.shields.io/npm/v/@kairos/core?color=7C3AED&label=@kairos/core)](https://www.npmjs.com/package/@kairos/core)
[![License: MIT](https://img.shields.io/badge/license-MIT-2DD4BF.svg)](LICENSE)
[![Built for Sui Overflow 2026](https://img.shields.io/badge/Sui%20Overflow-2026-4CA3FF)](https://overflow.sui.io)

</div>

---

KAIROS is a Move-native AI agent framework for the Sui blockchain. Give an LLM a Sui wallet, a personality, and a set of actions — it does the rest. Agents sign PTBs, swap on DeepBook, store memory on Walrus, and read any Sui object, all driven by natural language.

The name comes from the Greek word *kairos* — the opportune moment, the right time to act. Not clock time. The moment when action becomes meaningful. That is what every agent in KAIROS waits for.

---

## Why KAIROS

| Problem | KAIROS solution |
|---|---|
| Eliza OS has no Sui support | Native Sui actions, PTB composition, DeepBook swaps out of the box |
| Agent memory lives off-chain in a database you don't own | Memory stored on Walrus — user-owned, permanent, verifiable |
| Agent frameworks are generic TypeScript wrappers | KAIROS is built around Sui's object model — agents own Move objects |
| Building a new agent means wiring everything yourself | Character JSON + `AgentRuntime` + plugins — running in minutes |

---

## Packages

| Package | Description |
|---|---|
| [`@kairos/core`](packages/core) | `AgentRuntime`, `MemoryManager`, `LLMProvider`, all TypeScript interfaces |
| [`@kairos/plugin-sui`](packages/plugin-sui) | Transfer SUI, swap on DeepBook, read objects, balance and price providers |
| [`@kairos/plugin-walrus`](packages/plugin-walrus) | Persistent memory on Walrus, store/retrieve action |
| [`@kairos/client-rest`](packages/client-rest) | Express REST server — any client can talk to an agent over HTTP |

---

## Quick start

```bash
# 1. Clone
git clone https://github.com/your-org/kairos
cd kairos

# 2. Install
pnpm install

# 3. Copy and fill the env
cp agents/example/.env.example agents/example/.env

# 4. Boot the example agent
cd agents/example && npx tsx index.ts
```

The example agent starts a REST server on `localhost:3000`.

```bash
# Ask your agent something
curl -X POST http://localhost:3000/message \
  -H "Content-Type: application/json" \
  -d '{"text": "What is my SUI balance?", "userId": "alice"}'

# Send SUI
curl -X POST http://localhost:3000/message \
  -H "Content-Type: application/json" \
  -d '{"text": "Send 0.1 SUI to 0xabc...123", "userId": "alice"}'

# Store something on Walrus
curl -X POST http://localhost:3000/message \
  -H "Content-Type: application/json" \
  -d '{"text": "Store this note: meeting at 3pm", "userId": "alice"}'
```

---

## Create your own agent

```typescript
import { AgentRuntime } from '@kairos/core';
import { suiPlugin }    from '@kairos/plugin-sui';
import { walrusPlugin } from '@kairos/plugin-walrus';
import { createRestServer } from '@kairos/client-rest';

const runtime = new AgentRuntime({
  name: 'Atlas',
  bio: 'A DeFi agent that monitors and executes yield strategies on Sui.',
  lore: ['You specialise in DeepBook liquidity and NAVI lending.'],
  model: 'claude-sonnet-4-6',
  suiNetwork: 'mainnet',
  settings: {
    SUI_PRIVATE_KEY: process.env.SUI_PRIVATE_KEY!,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY!,
    WALRUS_PUBLISHER_URL: 'https://publisher.walrus.space',
    WALRUS_AGGREGATOR_URL: 'https://aggregator.walrus.space',
  },
  plugins: ['plugin-sui', 'plugin-walrus'],
});

runtime.registerPlugin(suiPlugin);
runtime.registerPlugin(walrusPlugin);

createRestServer(runtime, 3000);
```

See [`docs/BUILDING_AGENTS.md`](docs/BUILDING_AGENTS.md) for the full guide.

---

## Write a custom action

```typescript
import type { Action } from '@kairos/core';

export const myAction: Action = {
  name: 'DO_SOMETHING',
  similes: ['something', 'my thing'],
  description: 'What this action does — the LLM reads this to decide when to call it.',
  schema: {
    type: 'object',
    properties: {
      param: { type: 'string', description: 'explain this param' },
    },
    required: ['param'],
  },
  validate: async (runtime) => true,
  handler: async (runtime, _msg, _state, params, callback) => {
    // do your thing
    callback({ text: 'Done.' });
  },
};
```

See [`docs/WRITING_ACTIONS.md`](docs/WRITING_ACTIONS.md) for the full guide.

---

## Built with

- [Sui TypeScript SDK](https://sdk.mystenlabs.com) — blockchain interactions
- [DeepBook v3](https://deepbook.tech) — onchain order book for swaps
- [Walrus](https://walrus.site) — decentralised blob storage for agent memory
- [Pyth Network](https://pyth.network) — real-time price feeds
- [Anthropic Claude](https://anthropic.com) — LLM backbone

---

## Roadmap

See [`ROADMAP.md`](ROADMAP.md) for the full hackathon build plan.

---

## License

MIT — build whatever you want.

---

<div align="center">

*Made for Sui Overflow 2026 · Agentic Web track*

</div>
