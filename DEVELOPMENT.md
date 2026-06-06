# KAIROS — Development Guide

> Everything you need to go from zero to a running agent in your local environment.

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 20+ | [nodejs.org](https://nodejs.org) or `nvm install 20` |
| pnpm | 9+ | `npm install -g pnpm` |
| Sui CLI | latest | `cargo install --locked --git https://github.com/MystenLabs/sui.git --branch main sui` |
| Git | any | system |

Optional but recommended:
- `tsx` — run TypeScript without compile step: `npm install -g tsx`
- `tmux` or iTerm — for running multiple agent processes

---

## First-time setup

```bash
# 1. Clone the repo
git clone https://github.com/your-org/kairos.git
cd kairos

# 2. Install all workspace dependencies
pnpm install

# 3. Build all packages (generates dist/ in each)
pnpm build

# 4. Generate a Sui keypair for your development agent
sui client new-address ed25519
# This outputs: address + publicKey + alias
# Find your private key:
sui keytool export --key-identity <alias>
# Copy the "exportedPrivateKey" value starting with "suiprivkey1..."

# 5. Get testnet SUI
# Visit https://faucet.testnet.sui.io and paste your address

# 6. Set up your agent environment
cp agents/example/.env.example agents/example/.env
# Fill in .env (see below)
```

---

## Environment variables

```bash
# agents/example/.env

# Required
SUI_PRIVATE_KEY=suiprivkey1...          # from sui keytool export
ANTHROPIC_API_KEY=sk-ant-api03-...      # from console.anthropic.com

# Walrus (testnet defaults — change for mainnet)
WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space
WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space

# Optional
TELEGRAM_BOT_TOKEN=...                  # from @BotFather on Telegram
PORT=3000                               # REST server port (default 3000)
LOG_LEVEL=info                          # debug | info | warn | error
```

> **Important:** Never commit `.env` files. They are in `.gitignore`. If you accidentally commit a key, rotate it immediately.

---

## Daily development commands

```bash
# Root — runs all packages
pnpm build          # compile TypeScript across all packages
pnpm dev            # watch mode (rebuilds on save)
pnpm test           # run all tests with vitest
pnpm test:watch     # test watch mode
pnpm lint           # ESLint across all packages
pnpm lint:fix       # auto-fix lint issues
pnpm typecheck      # tsc --noEmit across all packages

# Per-package (cd into the package first)
pnpm build
pnpm test
pnpm dev

# Run the example agent
cd agents/example
npx tsx index.ts

# Run with debug logging
LOG_LEVEL=debug npx tsx index.ts
```

---

## Testing your agent

With the example agent running on `localhost:3000`:

```bash
# Balance check
curl -X POST http://localhost:3000/message \
  -H "Content-Type: application/json" \
  -d '{"text": "What is my wallet balance?", "userId": "dev"}'

# Transfer (testnet only)
curl -X POST http://localhost:3000/message \
  -H "Content-Type: application/json" \
  -d '{"text": "Send 0.01 SUI to 0x0000000000000000000000000000000000000000000000000000000000000000", "userId": "dev"}'

# Walrus storage
curl -X POST http://localhost:3000/message \
  -H "Content-Type: application/json" \
  -d '{"text": "Store this on Walrus: test memory from KAIROS dev session", "userId": "dev"}'

# Read a Sui object
curl -X POST http://localhost:3000/message \
  -H "Content-Type: application/json" \
  -d '{"text": "Read the Sui object 0x5", "userId": "dev"}'

# Multi-turn conversation
curl -X POST http://localhost:3000/message \
  -H "Content-Type: application/json" \
  -d '{"text": "What did I just store?", "userId": "dev", "conversationId": "session-1"}'
```

---

## Adding a new action

1. Create the file:
```bash
touch packages/plugin-sui/src/actions/my-action.ts
```

2. Implement the `Action` interface (see `docs/WRITING_ACTIONS.md`)

3. Register it in the plugin:
```typescript
// packages/plugin-sui/src/index.ts
import { myAction } from './actions/my-action';

export const suiPlugin: Plugin = {
  name: 'plugin-sui',
  actions: [
    transferSuiAction,
    swapAction,
    readObjectAction,
    myAction,          // add here
  ],
  providers: [balanceProvider, priceProvider],
};
```

4. Write a test:
```bash
touch packages/plugin-sui/src/__tests__/my-action.test.ts
```

5. Verify:
```bash
cd packages/plugin-sui && pnpm test
```

---

## Adding a new provider

1. Create the file:
```bash
touch packages/plugin-sui/src/providers/my-provider.ts
```

2. Implement the `Provider` interface (see `docs/WRITING_PROVIDERS.md`)

3. Register it in the plugin index

4. Test: providers are pure functions that return strings — easy to unit test with no mocks needed.

---

## Monorepo workspace layout

```
kairos/
├── package.json          # root — defines workspaces, shared scripts
├── pnpm-workspace.yaml   # ["packages/*", "agents/*"]
├── tsconfig.base.json    # base TS config extended by all packages
├── .eslintrc.js          # shared ESLint config
├── .prettierrc           # shared Prettier config
└── packages/
    ├── core/
    │   ├── package.json  # name: "@kairos/core"
    │   ├── tsconfig.json # extends ../../tsconfig.base.json
    │   └── src/
    ├── plugin-sui/
    │   ├── package.json  # name: "@kairos/plugin-sui"
    │   │                 # dependencies: { "@kairos/core": "workspace:*" }
    │   └── src/
    └── ...
```

Package interdependencies use `"workspace:*"` protocol — pnpm resolves them locally without publishing.

---

## TypeScript config

`tsconfig.base.json` (root):
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist"
  }
}
```

Per-package `tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

---

## Testing conventions

KAIROS uses [Vitest](https://vitest.dev).

```bash
pnpm test           # run all tests once
pnpm test:watch     # watch mode
pnpm test:ui        # browser test UI (useful for debugging)
```

### Test file conventions

- Test files: `src/__tests__/name.test.ts`
- Unit tests mock the `SuiClient` and `AgentRuntime`
- Integration tests (marked `// @integration`) hit the testnet and are skipped in CI unless `RUN_INTEGRATION=true`

### Mocking the Sui client

```typescript
import { vi, describe, it, expect } from 'vitest';
import { AgentRuntime } from '@kairos/core';
import { transferSuiAction } from '../actions/transfer';

const mockRuntime = {
  suiClient: {
    getBalance: vi.fn().mockResolvedValue({ totalBalance: '1000000000' }),
    signAndExecuteTransaction: vi.fn().mockResolvedValue({ digest: 'mockDigest123' }),
  },
  keypair: { /* mock keypair */ },
  suiAddress: '0xtest',
  getSetting: vi.fn().mockReturnValue(''),
  character: { suiNetwork: 'testnet' },
} as unknown as AgentRuntime;

describe('transferSuiAction', () => {
  it('validates when balance > 0', async () => {
    const result = await transferSuiAction.validate(mockRuntime, mockMemory);
    expect(result).toBe(true);
  });

  it('calls callback with tx digest', async () => {
    const callback = vi.fn();
    await transferSuiAction.handler(mockRuntime, mockMemory, mockState,
      { recipient: '0xabc', amount: 0.1 }, callback);
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ txDigest: 'mockDigest123' })
    );
  });
});
```

---

## Git workflow

```bash
# Start a new feature
git checkout -b feat/my-action

# Commit following conventional commits
git add packages/plugin-sui/src/actions/my-action.ts
git commit -m "feat(plugin-sui): add stake SUI action"

# Push and open a PR
git push origin feat/my-action
```

### Commit message format

```
type(scope): short description

Optional longer body explaining why (not what).
```

Types: `feat` `fix` `docs` `refactor` `test` `chore` `build` `perf`  
Scopes: `core` `plugin-sui` `plugin-walrus` `client-rest` `agents` `docs`

> **Reminder:** Never include AI attribution in commits. See `CLAUDE.md`.

---

## Useful Sui CLI commands during development

```bash
# Check your configured addresses
sui client addresses

# Switch to testnet
sui client switch --env testnet

# Check balance
sui client balance

# View objects owned by address
sui client objects

# Execute a raw transaction (for debugging)
sui client call --package <pkg> --module <mod> --function <fn>

# Inspect an object
sui client object <objectId>

# Inspect a transaction
sui client transaction <digest>
```

---

## Walrus CLI (optional)

```bash
# Install Walrus CLI
cargo install walrus-service --git https://github.com/MystenLabs/walrus-docs

# Store a file
walrus store ./my-file.txt

# Read a blob
walrus read <blobId>

# Check blob status
walrus blob-status <blobId>
```

---

## Common issues

**`Error: Cannot find module '@kairos/core'`**  
Run `pnpm build` from the repo root first. The workspace packages need to be compiled before they can be imported.

**`Error: Invalid private key`**  
Make sure you exported with `sui keytool export` and copied the full `suiprivkey1...` string including the prefix.

**`Walrus store returns 413`**  
Your blob is too large. Walrus has a max blob size. For large agent memories, split into multiple blobs and store an index.

**`LLM doesn't call any actions`**  
Check your action `description` and `similes`. These are what the LLM reads to decide whether to call an action. Make the description explicit about what user phrasing triggers it.

**`Transaction simulation failed`**  
Usually a balance issue or incorrect object ID. Add `LOG_LEVEL=debug` and check the full transaction before submission.
