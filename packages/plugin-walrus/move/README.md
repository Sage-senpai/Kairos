# kairos_memory — on-chain Walrus memory index

A Move package that records an agent's Walrus blob ids on Sui, so any instance of
the agent (or another agent) can reconstruct its cold memory from the chain. This
is the trust-minimised alternative to the local persisted index that
`WalrusMemoryStore` uses by default — see [docs/MULTI_AGENT.md](../../../docs/MULTI_AGENT.md).

## Module

`kairos_memory::index` exposes:

- `register(index, blob_id, conversation_id, timestamp, ctx)` — append a record for the sender.
- `records_for(index, agent)` — read an agent's records (via `devInspectTransactionBlock`).
- `record_count(index, agent)` — number of records an agent has stored.

A single shared `MemoryIndex` object is created at publish time.

## Build and publish

```bash
cd packages/plugin-walrus/move

# Build and test locally
sui move build
sui move test

# Publish to the active network
sui client publish --gas-budget 100000000
```

Record two ids from the publish output:

- the **package id** → set as `WALRUS_INDEX_PACKAGE_ID`
- the shared **`MemoryIndex` object id** → set as `WALRUS_INDEX_OBJECT_ID`

## Wire it up

With those ids configured, register a blob id after each Walrus store:

```typescript
import { Transaction } from '@mysten/sui/transactions';

const tx = new Transaction();
tx.moveCall({
  target: `${process.env.WALRUS_INDEX_PACKAGE_ID}::index::register`,
  arguments: [
    tx.object(process.env.WALRUS_INDEX_OBJECT_ID!),
    tx.pure.string(record.blobId),
    tx.pure.string(conversationId),
    tx.pure.u64(BigInt(record.timestamp)),
  ],
});
await suiClient.signAndExecuteTransaction({ signer: keypair, transaction: tx });
```

Read another agent's records back with `devInspectTransactionBlock` against
`index::records_for(index, producerAddress)`, take the newest `blob_id`, and
fetch it from the Walrus aggregator.

> This package is source-only in the repo — it is not built by `pnpm build`
> (which compiles TypeScript). Build it with the Sui CLI as shown above.
