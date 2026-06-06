import type { Memory } from '@kairos/core';
import { logger } from '@kairos/core';

/** A pointer to a blob this agent has stored on Walrus. */
export interface BlobRecord {
  blobId: string;
  summary: string;
  timestamp: number;
}

/** Shape of the Walrus publisher store response. */
interface WalrusStoreResponse {
  newlyCreated?: { blobObject?: { blobId?: string } };
  alreadyCertified?: { blobId?: string };
}

const DEFAULT_PUBLISHER = 'https://publisher.walrus-testnet.walrus.space';
const DEFAULT_AGGREGATOR = 'https://aggregator.walrus-testnet.walrus.space';
const STORE_EPOCHS = 10;
const MAX_RECENT = 20;

/**
 * Stores and retrieves blobs on Walrus over its HTTP API, and keeps a small
 * in-process index of recently stored blobs for the memory provider to surface.
 */
export class WalrusMemoryStore {
  private readonly publisherUrl: string;
  private readonly aggregatorUrl: string;
  private readonly recent: BlobRecord[] = [];

  constructor(publisherUrl?: string, aggregatorUrl?: string) {
    this.publisherUrl = (publisherUrl || DEFAULT_PUBLISHER).replace(/\/$/, '');
    this.aggregatorUrl = (aggregatorUrl || DEFAULT_AGGREGATOR).replace(/\/$/, '');
  }

  /** Store raw content on Walrus and return the resulting blob record. */
  async store(content: string, label?: string): Promise<BlobRecord> {
    const res = await fetch(`${this.publisherUrl}/v1/store?epochs=${STORE_EPOCHS}`, {
      method: 'PUT',
      body: content,
    });
    if (!res.ok) {
      throw new Error(`Walrus store failed: ${res.status} ${res.statusText}`);
    }

    const json = (await res.json()) as WalrusStoreResponse;
    const blobId = json.newlyCreated?.blobObject?.blobId ?? json.alreadyCertified?.blobId;
    if (!blobId) {
      throw new Error('Walrus store returned no blobId');
    }

    const record: BlobRecord = {
      blobId,
      summary: label ?? content.slice(0, 80),
      timestamp: Date.now(),
    };
    this.recent.push(record);
    if (this.recent.length > MAX_RECENT) this.recent.shift();
    return record;
  }

  /** Persist a Memory as a Walrus blob. Fire-and-forget safe — never throws. */
  async persistMemory(memory: Memory): Promise<void> {
    try {
      await this.store(JSON.stringify(memory), `${memory.role}: ${memory.content.text}`.slice(0, 80));
    } catch (err) {
      logger.error('Walrus persistMemory failed', err);
    }
  }

  /** Retrieve a blob's content by id, or null if it cannot be read. */
  async retrieve(blobId: string): Promise<string | null> {
    try {
      const res = await fetch(`${this.aggregatorUrl}/v1/${blobId}`);
      if (!res.ok) return null;
      return await res.text();
    } catch {
      return null;
    }
  }

  /** The most recently stored blob records, oldest first. */
  getRecent(): readonly BlobRecord[] {
    return this.recent;
  }
}
