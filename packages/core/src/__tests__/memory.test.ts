import { describe, it, expect, vi } from 'vitest';
import { MemoryManager } from '../memory';
import type { Memory } from '../types';

function makeMemory(text: string, conversationId = 'conv1'): Memory {
  return {
    id: Math.random().toString(36).slice(2),
    agentId: 'TestAgent',
    userId: 'user1',
    conversationId,
    content: { text },
    role: 'user',
    createdAt: Date.now(),
  };
}

describe('MemoryManager', () => {
  it('stores and retrieves messages per conversation, oldest first', async () => {
    const mm = new MemoryManager();
    await mm.add(makeMemory('one'));
    await mm.add(makeMemory('two'));
    await mm.add(makeMemory('other', 'conv2'));

    const recent = await mm.getRecent('conv1');
    expect(recent.map((m) => m.content.text)).toEqual(['one', 'two']);
    expect(await mm.getRecent('conv2')).toHaveLength(1);
  });

  it('respects the limit argument', async () => {
    const mm = new MemoryManager();
    for (let i = 0; i < 5; i++) await mm.add(makeMemory(`m${i}`));
    const recent = await mm.getRecent('conv1', 2);
    expect(recent.map((m) => m.content.text)).toEqual(['m3', 'm4']);
  });

  it('fires onAdd hooks for every added message', async () => {
    const mm = new MemoryManager();
    const hook = vi.fn();
    mm.onAdd(hook);
    await mm.add(makeMemory('hello'));
    expect(hook).toHaveBeenCalledOnce();
    expect(hook.mock.calls[0]?.[0].content.text).toBe('hello');
  });

  it('does not let a throwing hook break add()', async () => {
    const mm = new MemoryManager();
    mm.onAdd(() => {
      throw new Error('boom');
    });
    await expect(mm.add(makeMemory('safe'))).resolves.toBeUndefined();
    expect(await mm.getRecent('conv1')).toHaveLength(1);
  });
});
