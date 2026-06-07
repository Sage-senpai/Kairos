# Multi-agent coordination

> Agents coordinate by writing to Walrus and Sui shared objects, then reading them back. No agent calls another agent's API. No shared secret. Coordination is durable, public, and verifiable on-chain.

---

## The pattern

One agent produces state; another consumes it. The producer stores a blob on Walrus and records its blob id where the consumer can find it (a Sui shared object, or a known Walrus index). The consumer reads the latest blob id, fetches the blob, and injects it as context.

```
Oracle (producer)                         Atlas (consumer)
     │                                          │
     ├─ build price summary                     │
     ├─ STORE_ON_WALRUS → blobId                │
     ├─ record blobId on a Sui shared object    │
     │                                          ├─ read latest blobId from the object
     │                                          ├─ retrieve(blobId) from Walrus
     │                                          └─ inject summary into State.additionalContext
```

The two agents never talk directly. The only contract between them is the shape of the blob and the id of the shared object.

---

## Roles

| Agent | Role | What it does |
|---|---|---|
| **Oracle** | Producer | On an interval, writes a market summary to Walrus and records the blob id on-chain. |
| **Atlas** | Consumer | Before acting, reads Oracle's latest blob and uses it as decision context. |
| **Sentinel** | Watcher | Reads the same state and raises alerts (Telegram, log) when a threshold is crossed. |

---

## Producer side — write and record

```typescript
import { getStore } from '@kairos/plugin-walrus';

// 1. Store the payload on Walrus.
const store = getStore();
const record = await store!.store(JSON.stringify(summary), 'price-summary');

// 2. Record the blob id where consumers can find it.
//    Default: the local persisted index (single host).
//    Trust-minimised: a Sui shared object — see "On-chain index" below.
```

---

## Consumer side — read and inject

A consumer reads the latest blob and surfaces it through a provider, so it lands in every LLM call automatically:

```typescript
import type { Provider } from '@kairos/core';
import { getStore } from '@kairos/plugin-walrus';

export const oracleContextProvider: Provider = {
  get: async () => {
    const store = getStore();
    const recent = store?.getRecent() ?? [];
    const latest = recent[recent.length - 1];
    if (!latest) return '';
    const blob = await store!.retrieve(latest.blobId);
    return blob ? `Latest Oracle summary:\n${blob}` : '';
  },
};
```

Because providers run before every message (see [WRITING_PROVIDERS.md](WRITING_PROVIDERS.md)), Atlas always reasons over Oracle's freshest output without any direct call between them.

---

## On-chain index

The local persisted index in `WalrusMemoryStore` is enough for a single host. For trust-minimised coordination — where any agent instance can reconstruct the shared state from the chain — record blob ids in a Sui shared object instead.

KAIROS ships the Move source for this in [`packages/plugin-walrus/move/`](../packages/plugin-walrus/move/). It defines a shared `MemoryIndex` holding a `Table<address, vector<BlobRecord>>` that maps each agent address to its list of `{ blobId, conversationId, timestamp }` records.

Deploy it, then register a blob id after each store:

```typescript
import { Transaction } from '@mysten/sui/transactions';

const tx = new Transaction();
tx.moveCall({
  target: `${INDEX_PACKAGE_ID}::index::register`,
  arguments: [
    tx.object(INDEX_OBJECT_ID),
    tx.pure.string(record.blobId),
    tx.pure.string(conversationId),
    tx.pure.u64(BigInt(record.timestamp)),
  ],
});
await suiClient.signAndExecuteTransaction({ signer: keypair, transaction: tx });
```

A consumer reads the producer's records back with a `devInspectTransactionBlock` call to `index::records_for(index, producerAddress)`, takes the newest `blobId`, and fetches it from the Walrus aggregator.

See [`packages/plugin-walrus/move/README.md`](../packages/plugin-walrus/move/README.md) for build and publish steps.

---

## Running the demo

```bash
# Terminal 1 — Oracle writes a price summary to Walrus every interval.
cd agents/oracle && pnpm start

# Terminal 2 — Atlas reads Oracle's latest summary as context.
cd agents/atlas && pnpm start    # or the example agent

# Terminal 3 — Sentinel watches and alerts.
cd agents/sentinel && pnpm start
```

Three agents, two coordinating through Walrus and Sui, zero direct calls between them.
