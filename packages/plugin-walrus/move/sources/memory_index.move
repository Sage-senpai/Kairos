/// On-chain index of an agent's Walrus memory blobs.
///
/// A single shared `MemoryIndex` maps each agent address to the list of blob
/// records it has stored. Any agent instance — or any other agent — can read an
/// agent's records back from the chain and reconstruct its cold memory from
/// Walrus. This is the trust-minimised alternative to the local persisted index
/// in `WalrusMemoryStore` (see docs/MULTI_AGENT.md).
module kairos_memory::index {
    use std::string::String;
    use sui::table::{Self, Table};

    /// A pointer to one Walrus blob, recorded under the agent that stored it.
    public struct BlobRecord has store, copy, drop {
        blob_id: String,
        conversation_id: String,
        timestamp: u64,
    }

    /// Shared object: agent address -> list of blob records.
    public struct MemoryIndex has key {
        id: UID,
        records: Table<address, vector<BlobRecord>>,
    }

    /// Create and share the index once, at publish time.
    fun init(ctx: &mut TxContext) {
        transfer::share_object(MemoryIndex {
            id: object::new(ctx),
            records: table::new(ctx),
        });
    }

    /// Append a blob record for the calling agent (the transaction sender).
    public entry fun register(
        index: &mut MemoryIndex,
        blob_id: String,
        conversation_id: String,
        timestamp: u64,
        ctx: &mut TxContext,
    ) {
        let agent = ctx.sender();
        let record = BlobRecord { blob_id, conversation_id, timestamp };
        if (!index.records.contains(agent)) {
            index.records.add(agent, vector::empty<BlobRecord>());
        };
        index.records.borrow_mut(agent).push_back(record);
    }

    /// Read an agent's blob records. Intended for `devInspectTransactionBlock`.
    public fun records_for(index: &MemoryIndex, agent: address): vector<BlobRecord> {
        if (index.records.contains(agent)) {
            *index.records.borrow(agent)
        } else {
            vector::empty<BlobRecord>()
        }
    }

    /// Number of records an agent has stored.
    public fun record_count(index: &MemoryIndex, agent: address): u64 {
        if (index.records.contains(agent)) {
            index.records.borrow(agent).length()
        } else {
            0
        }
    }
}
