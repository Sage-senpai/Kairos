import { describe, it, expect, vi, afterEach } from 'vitest';
import { processUpdate, sendMessage } from '../index';
import type { IAgentRuntime } from '@kairos-sui/core';

function makeRuntime(reply = 'pong'): IAgentRuntime {
  return {
    character: { name: 'Atlas' },
    processMessage: vi.fn().mockResolvedValue(reply),
  } as unknown as IAgentRuntime;
}

afterEach(() => vi.restoreAllMocks());

describe('processUpdate', () => {
  it('routes a text message to the runtime and replies', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);
    const runtime = makeRuntime('hello back');

    await processUpdate(runtime, 'TOKEN', {
      update_id: 1,
      message: { text: 'hi', chat: { id: 42 }, from: { id: 7 } },
    });

    expect(runtime.processMessage).toHaveBeenCalledWith('hi', '7', '42');
    const body = JSON.parse(fetchMock.mock.calls[0]?.[1].body);
    expect(body).toMatchObject({ chat_id: 42, text: 'hello back' });
  });

  it('answers /start without invoking the runtime', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);
    const runtime = makeRuntime();

    await processUpdate(runtime, 'TOKEN', {
      update_id: 1,
      message: { text: '/start', chat: { id: 42 }, from: { id: 7 } },
    });

    expect(runtime.processMessage).not.toHaveBeenCalled();
    const body = JSON.parse(fetchMock.mock.calls[0]?.[1].body);
    expect(body.text).toContain('Atlas is online');
  });

  it('ignores updates without text', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const runtime = makeRuntime();
    await processUpdate(runtime, 'TOKEN', { update_id: 1, message: { chat: { id: 1 } } });
    expect(runtime.processMessage).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('sendMessage', () => {
  it('POSTs to the Telegram API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);
    await sendMessage('TOKEN', 99, 'hey');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.telegram.org/botTOKEN/sendMessage',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
