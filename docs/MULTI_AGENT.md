# Multi-agent coordination

> Agents don't call each other. One writes a blob to Walrus and notes where it put it; another reads that note and picks the blob up. The handoff happens on chain, in the open, with nothing shared between the two processes but a blob format and an object id.

---

## The pattern

One agent produces state. Another consumes it. The producer stores a blob on Walrus and records the blob id somewhere the consumer knows to look: a Sui shared object, or just the local index. The consumer reads the latest id, fetches the blob, and folds it into its own context.

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

Neither process ever talks to the other. The only thing they agree on is the shape of the blob and the id of the object that points at it. Change either side's internals all you want; the contract holds.

---

## Roles

| Agent | Role | What it does |
|---|---|---|
| Oracle | Producer | Writes a market summary to Walrus on an interval and records the blob id on chain. |
| Atlas | Consumer | Reads Oracle's latest blob before it acts and uses it as decision context. |
| Sentinel | Watcher | Reads the same state and raises an alert when something crosses a threshold. |

---

## Producer side: write and record

```typescript
import { getStore } from '@kairos-sui/plugin-walrus';

// Store the payload on Walrus.
const store = getStore();
const record = await store!.store(JSON.stringify(summary), 'price-summary');

// Then record the blob id where consumers will look for it. The local index is
// fine on one host. For coordination across machines, write it to a Sui shared
// object (see "On-chain index" below).
```

---

## Consumer side: read and inject

The cleanest way to consume is a provider. Providers run before every message, so Oracle's freshest output is already in context by the time Atlas reasons. No polling loop, no extra call:

```typescript
import type { Provider } from '@kairos-sui/core';
import { getStore } from '@kairos-sui/plugin-walrus';

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

See [WRITING_PROVIDERS.md](WRITING_PROVIDERS.md) for the provider contract.

---

## On-chain index

The local index in `WalrusMemoryStore` works when one host runs the agent. It doesn't help when a second machine, or a different agent entirely, needs to reconstruct that state from scratch. For that, put the blob ids on chain.

The Move source lives in [`packages/plugin-walrus/move/`](../packages/plugin-walrus/move/). It's a shared `MemoryIndex` holding a `Table<address, vector<BlobRecord>>`: one entry per agent address, each a list of `{ blobId, conversationId, timestamp }`. Anyone can read it; only the sender writes their own slot.

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

A consumer reads the producer's records with a `devInspectTransactionBlock` call to `index::records_for(index, producerAddress)`, grabs the newest `blobId`, and pulls it from the Walrus aggregator. Build and publish steps are in [`packages/plugin-walrus/move/README.md`](../packages/plugin-walrus/move/README.md).

---

## Running the demo

```bash
# Oracle writes a price summary to Walrus every interval.
cd agents/oracle && pnpm start

# Atlas reads Oracle's latest summary as context.
cd agents/example && pnpm start

# Sentinel watches and alerts.
cd agents/sentinel && pnpm start
```

Three agents. Two of them coordinating through Walrus and Sui, zero calls between them.
