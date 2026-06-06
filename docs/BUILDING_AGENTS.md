# Building agents

> An agent is a character running on a runtime. This guide covers everything from naming your agent to shipping it to production.

---

## Anatomy of an agent

```
agents/my-agent/
├── character.json    ← who the agent is (personality, network, plugins)
├── index.ts          ← boot file (create runtime, register plugins, start client)
├── .env              ← secrets (never committed)
└── .env.example      ← template (committed, values redacted)
```

---

## Step 1 — Design the character

Before writing any code, answer:

1. **What does this agent do in one sentence?**  
   *"Atlas monitors Sui DeFi yields and executes rebalancing when thresholds are crossed."*

2. **What actions does it need?**  
   Transfer, swap, read objects — or custom ones?

3. **What context does it need?**  
   Wallet balance, Pyth prices, owned objects, long-term Walrus memories?

4. **Who calls it?**  
   A Telegram bot, REST API, another agent, a cron job?

5. **What should it never do?**  
   "Never swap more than 10% of total balance in one action."

---

## Step 2 — Write the character.json

```json
{
  "name": "Atlas",
  "bio": "You are Atlas, a DeFi intelligence agent running on Sui. Your job is to monitor yield opportunities across NAVI, Scallop, and DeepBook, and execute rebalancing strategies when the user authorises them. You are precise, conservative with gas, and always confirm transactions before executing.",
  "lore": [
    "You have been watching Sui DeFi markets since genesis.",
    "You prefer to suggest before acting — always ask for confirmation before swapping more than 1 SUI.",
    "You track your own performance in Walrus — total yield generated, total gas spent.",
    "Your favourite validator is one with >99.5% uptime."
  ],
  "systemRules": [
    "Never execute a swap of more than 10% of total wallet balance without explicit user confirmation in the same message.",
    "Always show the expected output amount before executing a swap.",
    "If Pyth prices are stale (>60 seconds old), warn the user before any price-sensitive action.",
    "Log every transaction to Walrus with a label."
  ],
  "model": "claude-sonnet-4-6",
  "suiNetwork": "mainnet",
  "settings": {
    "SUI_PRIVATE_KEY": "${SUI_PRIVATE_KEY}",
    "ANTHROPIC_API_KEY": "${ANTHROPIC_API_KEY}",
    "WALRUS_PUBLISHER_URL": "${WALRUS_PUBLISHER_URL}",
    "WALRUS_AGGREGATOR_URL": "${WALRUS_AGGREGATOR_URL}"
  },
  "plugins": ["plugin-sui", "plugin-walrus"]
}
```

> **Note:** The `${VAR}` syntax in settings is resolved by the boot script from `process.env`. Never put actual keys in character.json.

---

## Step 3 — Write the boot file

```typescript
// agents/my-agent/index.ts
import 'dotenv/config';
import { AgentRuntime } from '@kairos/core';
import { suiPlugin }    from '@kairos/plugin-sui';
import { walrusPlugin } from '@kairos/plugin-walrus';
import { createRestServer } from '@kairos/client-rest';
import characterFile from './character.json';
import type { Character } from '@kairos/core';

// Resolve ${VAR} placeholders from env
function resolveCharacter(raw: typeof characterFile): Character {
  const json = JSON.stringify(raw).replace(/\$\{(\w+)\}/g, (_, key) => {
    const val = process.env[key];
    if (!val) throw new Error(`Missing env variable: ${key}`);
    return val;
  });
  return JSON.parse(json) as Character;
}

async function main() {
  const character = resolveCharacter(characterFile);
  const runtime = new AgentRuntime(character);

  // Register plugins (order matters — sui before walrus)
  runtime.registerPlugin(suiPlugin);
  runtime.registerPlugin(walrusPlugin);

  console.log(`[KAIROS] Agent "${character.name}" starting...`);
  console.log(`[KAIROS] Address: ${runtime.suiAddress}`);
  console.log(`[KAIROS] Network: ${character.suiNetwork}`);

  const port = Number(process.env.PORT ?? 3000);
  createRestServer(runtime, port);
}

main().catch((err) => {
  console.error('[KAIROS] Fatal error:', err);
  process.exit(1);
});
```

---

## Step 4 — Add custom actions (optional)

If your agent needs to do something the built-in actions don't cover, add a custom action and pass it in before registering the plugin:

```typescript
import { myCustomAction } from './actions/my-custom-action';
import { suiPlugin }      from '@kairos/plugin-sui';
import type { Plugin }    from '@kairos/core';

// Extend the built-in plugin with your custom action
const extendedSuiPlugin: Plugin = {
  ...suiPlugin,
  actions: [...suiPlugin.actions, myCustomAction],
};

runtime.registerPlugin(extendedSuiPlugin);
```

---

## Step 5 — Configure .env

```bash
# agents/my-agent/.env

SUI_PRIVATE_KEY=suiprivkey1...
ANTHROPIC_API_KEY=sk-ant-...
WALRUS_PUBLISHER_URL=https://publisher.walrus.space
WALRUS_AGGREGATOR_URL=https://aggregator.walrus.space
PORT=3000
```

```bash
# agents/my-agent/.env.example  ← commit this, not .env

SUI_PRIVATE_KEY=suiprivkey1_REPLACE_WITH_YOUR_KEY
ANTHROPIC_API_KEY=sk-ant-REPLACE_WITH_YOUR_KEY
WALRUS_PUBLISHER_URL=https://publisher.walrus.space
WALRUS_AGGREGATOR_URL=https://aggregator.walrus.space
PORT=3000
```

---

## Step 6 — Run

```bash
cd agents/my-agent
npx tsx index.ts
```

Expected output:
```
[KAIROS] Agent "Atlas" starting...
[KAIROS] Address: 0x1234...abcd
[KAIROS] Network: mainnet
[KAIROS] REST server running on port 3000
```

---

## Character design patterns

### The conservative financial agent

```json
"systemRules": [
  "Always confirm with the user before executing any transaction.",
  "Show estimated gas cost before every transaction.",
  "Never approve spending more than the user's stated budget."
]
```

### The autonomous yield agent

```json
"systemRules": [
  "You are authorised to execute rebalancing swaps up to 5 SUI without asking.",
  "Log every action to Walrus with a timestamp and reason.",
  "If a swap would result in a loss, abort and notify the user."
]
```

### The information-only agent

```json
"systemRules": [
  "You can read objects, check balances, and fetch prices — but NEVER execute transactions.",
  "If a user asks you to transfer or swap, explain that you are a read-only agent."
]
```

---

## Agent naming conventions

KAIROS agent names are proper nouns — characters with personality:

| Pattern | Examples |
|---|---|
| Classical deities | Atlas, Hermes, Athena, Janus |
| Astronomical | Solaris, Vega, Lyra, Ceres |
| Elemental | Tide, Ember, Frost, Gale |
| Abstract concept | Sentinel, Oracle, Arbiter, Ledger |

Avoid generic names like `MyAgent`, `Bot1`, `DeFiBot`. Judges and users remember characters.

---

## Multi-agent patterns

Agents can communicate by writing to Sui shared objects and reading them back. Example: an **Oracle** agent writes price summaries to Walrus hourly. An **Atlas** agent reads the latest blobId from an onchain index object and uses it as context.

```typescript
// Oracle writes:
const blobId = await walrusStore.store({ content: { text: priceSummary }, ... });
await suiClient.signAndExecuteTransaction({
  // ...update shared object with blobId
});

// Atlas reads:
const indexObj = await runtime.suiClient.getObject({ id: INDEX_OBJECT_ID, options: { showContent: true } });
const latestBlobId = extractBlobId(indexObj);
const oracleMemory = await walrusStore.retrieve(latestBlobId);
// inject into Atlas's state.additionalContext
```

See `docs/MULTI_AGENT.md` for the full pattern.
