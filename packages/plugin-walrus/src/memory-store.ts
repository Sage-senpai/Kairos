import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
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

export interface WalrusMemoryStoreOptions {
  /**
   * Path to a JSON file used as a persistent index of stored blob ids. When
   * set, the index survives process restarts — the agent can recall what it
   * stored in prior sessions. Defaults to in-memory only when omitted.
   */
  indexPath?: string;
}

const DEFAULT_PUBLISHER = 'https://publisher.walrus-testnet.walrus.space';
const DEFAULT_AGGREGATOR = 'https://aggregator.walrus-testnet.walrus.space';
const STORE_EPOCHS = 10;
const MAX_RECENT = 50;

/**
 * Stores and retrieves blobs on Walrus over its HTTP API, and keeps an index of
 * recently stored blobs for the memory provider to surface. When an `indexPath`
 * is given, the index is persisted to disk so it survives restarts — this is
 * what lets an agent recall memories from previous sessions. (For trust-
 * minimised, multi-host coordination, record blob ids in the on-chain Move
 * index under `move/` instead — see docs/MULTI_AGENT.md.)
 */
export class WalrusMemoryStore {
  private readonly publisherUrl: string;
  private readonly aggregatorUrl: string;
  private readonly indexPath: string | undefined;
  private records: BlobRecord[] = [];

  constructor(
    publisherUrl?: string,
    aggregatorUrl?: string,
    options: WalrusMemoryStoreOptions = {},
  ) {
    this.publisherUrl = (publisherUrl || DEFAULT_PUBLISHER).replace(/\/$/, '');
    this.aggregatorUrl = (aggregatorUrl || DEFAULT_AGGREGATOR).replace(/\/$/, '');
    this.indexPath = options.indexPath;
  }

  /** Load the persisted index from disk, if an `indexPath` was configured. */
  async init(): Promise<void> {
    if (!this.indexPath) return;
    try {
      const raw = await readFile(this.indexPath, 'utf8');
      const parsed = JSON.parse(raw) as BlobRecord[];
      if (Array.isArray(parsed)) {
        this.records = parsed.slice(-MAX_RECENT);
        logger.info(`Loaded ${this.records.length} memory record(s) from Walrus index`);
      }
    } catch {
      // No index yet (first run) — start empty.
    }
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
    this.records.push(record);
    if (this.records.length > MAX_RECENT) this.records.shift();
    await this.persistIndex();
    return record;
  }

  /** Persist a Memory as a Walrus blob. Fire-and-forget safe — never throws. */
  async persistMemory(memory: Memory): Promise<void> {
    try {
      await this.store(
        JSON.stringify(memory),
        `${memory.role}: ${memory.content.text}`.slice(0, 80),
      );
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
    return this.records;
  }

  /** Write the current index to disk, if configured. Best-effort. */
  private async persistIndex(): Promise<void> {
    if (!this.indexPath) return;
    try {
      await mkdir(dirname(this.indexPath), { recursive: true });
      await writeFile(this.indexPath, JSON.stringify(this.records, null, 2), 'utf8');
    } catch (err) {
      logger.error('Failed to persist Walrus index', err);
    }
  }
}
