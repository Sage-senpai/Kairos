import { describe, it, expect, afterEach, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createRestServer } from '../index';
import type { IAgentRuntime } from '@kairos/core';

function makeRuntime(processMessage = vi.fn().mockResolvedValue('pong')): IAgentRuntime {
  return {
    character: { name: 'Atlas', suiNetwork: 'testnet' },
    suiAddress: '0xtest',
    suiClient: {
      getBalance: vi.fn().mockResolvedValue({ totalBalance: '4230000000' }),
    },
    processMessage,
  } as unknown as IAgentRuntime;
}

let server: Server | undefined;

function baseUrl(): string {
  const { port } = server!.address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

afterEach(() => {
  server?.close();
  server = undefined;
});

describe('createRestServer', () => {
  it('responds to GET /health', async () => {
    server = createRestServer(makeRuntime(), 0);
    const res = await fetch(`${baseUrl()}/health`);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ status: 'ok', agent: 'Atlas' });
  });

  it('returns the balance on GET /balance', async () => {
    server = createRestServer(makeRuntime(), 0);
    const res = await fetch(`${baseUrl()}/balance`);
    const body = await res.json();
    expect(body).toMatchObject({ address: '0xtest', balance: '4.2300', unit: 'SUI' });
  });

  it('routes POST /message to the runtime', async () => {
    const processMessage = vi.fn().mockResolvedValue('hello back');
    server = createRestServer(makeRuntime(processMessage), 0);
    const res = await fetch(`${baseUrl()}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'hi', userId: 'alice' }),
    });
    const body = await res.json();
    expect(body).toEqual({ text: 'hello back' });
    expect(processMessage).toHaveBeenCalledWith('hi', 'alice', undefined);
  });

  it('rejects POST /message without text', async () => {
    server = createRestServer(makeRuntime(), 0);
    const res = await fetch(`${baseUrl()}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'alice' }),
    });
    expect(res.status).toBe(400);
  });
});
