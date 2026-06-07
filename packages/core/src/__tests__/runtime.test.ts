import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Action, Character, Plugin } from '../types';

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: mockCreate };
  },
}));

import { AgentRuntime } from '../runtime';

function makeCharacter(settings: Record<string, string> = { ANTHROPIC_API_KEY: 'k' }): Character {
  return {
    name: 'Tester',
    bio: 'A test agent.',
    lore: [],
    model: 'claude-sonnet-4-6',
    suiNetwork: 'testnet',
    settings,
    plugins: [],
  };
}

beforeEach(() => {
  mockCreate.mockReset();
});

describe('AgentRuntime construction', () => {
  it('throws without an ANTHROPIC_API_KEY', () => {
    expect(() => new AgentRuntime(makeCharacter({}))).toThrow(/ANTHROPIC_API_KEY/);
  });

  it('reads settings first, then the environment', () => {
    const runtime = new AgentRuntime(
      makeCharacter({ ANTHROPIC_API_KEY: 'k', FOO: 'from-settings' }),
    );
    expect(runtime.getSetting('FOO')).toBe('from-settings');
    process.env.BAR = 'from-env';
    expect(runtime.getSetting('BAR')).toBe('from-env');
    delete process.env.BAR;
    expect(runtime.getSetting('MISSING')).toBe('');
  });
});

describe('AgentRuntime.registerPlugin', () => {
  it('runs the onRegister hook', () => {
    const runtime = new AgentRuntime(makeCharacter());
    const onRegister = vi.fn().mockResolvedValue(undefined);
    const plugin: Plugin = { name: 'p', actions: [], providers: [], onRegister };
    runtime.registerPlugin(plugin);
    expect(onRegister).toHaveBeenCalledWith(runtime);
  });
});

describe('AgentRuntime.processMessage', () => {
  it('persists user and assistant messages and returns the reply', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'hi there' }],
      stop_reason: 'end_turn',
    });
    const runtime = new AgentRuntime(makeCharacter());
    const reply = await runtime.processMessage('hello', 'alice', 'conv1');
    expect(reply).toBe('hi there');
    const history = await runtime.memoryManager.getRecent('conv1');
    expect(history.map((m) => m.role)).toEqual(['user', 'assistant']);
    expect(history[1]?.content.text).toBe('hi there');
  });

  it('dispatches a tool call to the matching action handler', async () => {
    mockCreate
      .mockResolvedValueOnce({
        content: [{ type: 'tool_use', id: 'tu1', name: 'DO_THING', input: { a: 1 } }],
        stop_reason: 'tool_use',
      })
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: 'finished' }],
        stop_reason: 'end_turn',
      });

    const handler = vi.fn(async (_r, _m, _s, _p, cb) => cb({ text: 'did the thing' }));
    const action: Action = {
      name: 'DO_THING',
      similes: [],
      description: 'd',
      schema: { type: 'object', properties: {} },
      validate: async () => true,
      handler,
    };

    const runtime = new AgentRuntime(makeCharacter());
    runtime.registerPlugin({ name: 'p', actions: [action], providers: [] });
    const reply = await runtime.processMessage('do it', 'bob');

    expect(handler).toHaveBeenCalledOnce();
    expect(reply).toBe('finished');
  });

  it('skips the handler when validate returns false', async () => {
    mockCreate
      .mockResolvedValueOnce({
        content: [{ type: 'tool_use', id: 'tu1', name: 'DO_THING', input: {} }],
        stop_reason: 'tool_use',
      })
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: 'cannot' }],
        stop_reason: 'end_turn',
      });

    const handler = vi.fn();
    const action: Action = {
      name: 'DO_THING',
      similes: [],
      description: 'd',
      schema: { type: 'object', properties: {} },
      validate: async () => false,
      handler,
    };

    const runtime = new AgentRuntime(makeCharacter());
    runtime.registerPlugin({ name: 'p', actions: [action], providers: [] });
    await runtime.processMessage('do it', 'bob');

    expect(handler).not.toHaveBeenCalled();
  });
});
