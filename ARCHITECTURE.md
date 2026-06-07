# KAIROS — Architecture

> A complete technical reference for the KAIROS agent framework. Read before adding new packages or changing the runtime loop.

---

## Overview

KAIROS is a **TypeScript monorepo** built on `pnpm workspaces`. Each package is independently publishable to npm. The framework follows an **event-driven plugin architecture**: the core runtime knows nothing about Sui, Walrus, or any blockchain — it only knows about messages, state, actions, and providers. All blockchain specifics live in plugins.

```
User input
    │
    ▼
┌──────────────────────────────────────────────────────────┐
│  AgentRuntime                                             │
│                                                          │
│  1. MemoryManager.add(userMessage)                       │
│  2. Providers.get() → build State                        │
│  3. MemoryManager.getRecent() → conversation history     │
│  4. LLMProvider.generate(State, Actions[]) → LLMResponse │
│  5. If action called → Action.validate() → Action.handler│
│  6. MemoryManager.add(assistantMessage)                  │
│  7. return responseText                                  │
└──────────────────────────────────────────────────────────┘
    │
    ▼
Client (REST, Telegram, CLI, another agent)
```

---

## Package dependency graph

```
@kairos/client-rest
        │
        └── @kairos/core
                │
@kairos/plugin-sui ──── @kairos/core
        │
        └── @mysten/sui
            @mysten/deepbook-v3

@kairos/plugin-walrus ── @kairos/core
```

Rules:
- Plugins depend on `@kairos/core` — never the reverse.
- Plugins do not depend on each other.
- Clients depend only on `@kairos/core` (via `AgentRuntime`).
- `@kairos/core` has zero blockchain dependencies.

---

## Core package — `@kairos/core`

### `AgentRuntime`

The central object. One runtime per agent process. Instantiated once at boot.

```typescript
class AgentRuntime {
  readonly character: Character      // immutable agent config
  readonly suiClient: SuiClient      // provided by plugin-sui via init
  readonly keypair: Ed25519Keypair   // provided by plugin-sui via init
  readonly suiAddress: string
  readonly llm: LLMProvider
  readonly memoryManager: MemoryManager

  private actions: Map<string, Action>
  private providers: Provider[]

  registerPlugin(plugin: Plugin): void
  getSetting(key: string): string
  processMessage(text, userId, conversationId): Promise<string>
  private buildState(message): Promise<State>
}
```

**Key design decision:** The runtime does NOT hold blockchain state. It holds references to the Sui client and keypair, but these are set via `registerPlugin` — not in the constructor. This keeps the core testable without a chain connection.

### `MemoryManager`

Two-tier memory:

| Tier | Storage | Scope | Retrieval |
|---|---|---|---|
| Hot | In-process `Map<conversationId, Memory[]>` | Current session | `getRecent(conversationId, limit)` |
| Cold | Walrus blobs (via plugin-walrus) | Permanent | Blob ID lookup, future: vector search |

The core `MemoryManager` only manages hot memory. `plugin-walrus` extends it by hooking into `add()` to asynchronously persist blobs.

### `LLMProvider`

Wraps the Anthropic SDK. Converts KAIROS `Action[]` into Anthropic tool schemas. Handles tool-use responses and maps them back to action names + params.

```typescript
class LLMProvider {
  generate(state: State, actions: Action[]): Promise<LLMResponse>
  private buildSystemPrompt(state: State): string
  private buildTools(actions: Action[]): AnthropicTool[]
}
```

The system prompt is assembled from:
1. Character `bio` and `lore`
2. Current `State.additionalContext` (injected by providers)
3. Wallet address and balance
4. Behavioural rules (always confirm tx digests, never fabricate)

### Types

All shared TypeScript types live in `packages/core/src/types.ts`. No type is defined in a plugin. If a plugin needs a new type, propose it for core first.

---

## Plugin architecture

A plugin is a plain object:

```typescript
interface Plugin {
  name: string
  actions: Action[]
  providers: Provider[]
  // optional lifecycle hooks:
  onRegister?: (runtime: AgentRuntime) => Promise<void>
  onMessage?: (message: Memory) => Promise<void>
}
```

`AgentRuntime.registerPlugin()`:
1. Pushes all `actions` into the runtime's action map (keyed by `action.name`)
2. Pushes all `providers` into the runtime's provider array
3. Calls `plugin.onRegister(runtime)` if defined — this is where plugins can set up connections (e.g. plugin-sui initialises `SuiClient` here)

**Order of registration matters for providers.** Providers run in registration order. Register `plugin-sui` before `plugin-walrus`.

---

## Action execution flow

```
LLM returns tool_use block
        │
        ▼
runtime.actions.get(toolName)   → Action found?
        │                            │ No → log warning, skip
        ▼                            ▼
action.validate(runtime, msg)    return
        │
        ▼ (returns true)
action.handler(runtime, msg, state, params, callback)
        │
        ├── Builds Transaction (PTB)
        ├── Signs with runtime.keypair
        ├── Submits via runtime.suiClient
        └── Calls callback({ text, txDigest })
                │
                ▼
        callback result appended to assistantMessage.content
```

If `validate` returns `false`, the action is skipped and the LLM's text response is still returned. The agent informs the user it cannot perform the action.

---

## Walrus memory architecture

```
Agent receives message
        │
        ▼
MemoryManager.add(memory)
        │
        ├── Sync:  push to hot cache (Map)
        └── Async: WalrusMemoryStore.store(memory) → blobId
                         │
                         ▼
              Walrus Publisher API (PUT /v1/blobs)
                         │
                         ▼
              Returns blobId → stored in onchain index*
```

*Onchain index: a Sui shared object (a `Table<address, vector<BlobRecord>>`) that maps `agentId → array of { blobId, conversationId, timestamp }`. This allows any agent instance to reconstruct its cold memory from the chain. Implemented in `packages/plugin-walrus/move/`.

**Retrieval flow:**
```
Agent needs long-term memory
        │
        ▼
WalrusMemoryProvider.get(runtime, message)
        │
        ├── Read onchain index → get last N blobIds for this agent
        ├── Fetch each blob from Walrus Aggregator (GET /v1/blobs/{blobId})
        └── Deserialise Memory objects → inject as context string into State
```

---

## State construction

`AgentRuntime.buildState()` runs before every LLM call:

```typescript
private async buildState(message: Memory): Promise<State> {
  const [recentMessages, balance, ...providerOutputs] = await Promise.all([
    this.memoryManager.getRecent(message.conversationId, 20),
    this.suiClient.getBalance({ owner: this.suiAddress }),
    ...this.providers.map(p => p.get(this, message).catch(() => '')),
  ]);

  return {
    recentMessages,
    walletBalance: formatSui(balance.totalBalance),
    suiAddress: this.suiAddress,
    additionalContext: providerOutputs.filter(Boolean).join('\n'),
  };
}
```

All providers run concurrently. Provider failures are silently swallowed (they return empty string) — the agent should remain functional even if a price feed goes down.

---

## PTB composition pattern

All Sui actions build Programmable Transaction Blocks. The pattern:

```typescript
const tx = new Transaction();

// Actions compose by chaining tx.* calls
// Results of earlier commands can be passed into later commands
const [coin] = tx.splitCoins(tx.gas, [amount]);
const swapResult = tx.moveCall({ target: '...', arguments: [coin] });
tx.transferObjects([swapResult], recipient);

// One atomic submit
const result = await runtime.suiClient.signAndExecuteTransaction({
  signer: runtime.keypair,
  transaction: tx,
  options: { showEffects: true, showEvents: true },
});
```

This is the KAIROS advantage over EVM agent frameworks: **multi-step operations are atomic**. The swap and transfer happen in a single transaction or both fail. No partial execution.

---

## Client layer

Clients are thin adapters that call `runtime.processMessage()`. They handle:
- Transport (HTTP, WebSocket, bot API)
- Session management (assigning `conversationId` per user/chat)
- Rate limiting (client's responsibility)

```
┌─────────────┐   ┌──────────────┐   ┌──────────────┐
│  REST API   │   │  Telegram    │   │   CLI        │
│  (Express)  │   │  (bot)       │   │  (readline)  │
└──────┬──────┘   └──────┬───────┘   └──────┬───────┘
       │                 │                   │
       └────────┬────────┘                   │
                │                            │
                ▼                            ▼
        runtime.processMessage(text, userId, conversationId)
```

---

## Security model

- **Private keys** live only in `.env` files and `character.settings`. Never logged, never serialised.
- **Agent wallet** is a dedicated keypair — not the developer's personal wallet.
- **Action validation** runs before every execution. Plugins should check balances, address format, and amount sanity in `validate()`.
- **No user funds** are held by the framework — agents act on behalf of their configured wallet only.
- **Walrus blobs** are public by default. Do not store sensitive data unencrypted. Use Seal encryption for private memory (future roadmap item).

---

## Extension points

| Extension | How |
|---|---|
| New blockchain action | Add `Action` to `plugin-sui/src/actions/`, register in `plugin-sui/src/index.ts` |
| New context provider | Add `Provider` to `plugin-sui/src/providers/`, register in `plugin-sui/src/index.ts` |
| Different LLM | Extend `LLMProvider` or replace with a new class implementing the same interface |
| New client (Discord, etc.) | New package in `packages/client-*/`. Call `runtime.processMessage()`. |
| Agent-to-agent comms | Create a Sui shared object as a message queue. Agent A writes, Agent B reads via `READ_OBJECT` action. |
| Vector memory | Replace `MemoryManager.search()` with embedding-based retrieval. Store embeddings as Walrus blobs. |
