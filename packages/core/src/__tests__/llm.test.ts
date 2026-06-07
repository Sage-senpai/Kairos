import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Action, Character, Memory, State } from '../types';

// Mock the Anthropic SDK so no network call happens.
const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: mockCreate };
  },
}));

import { LLMProvider } from '../llm';

const character: Character = {
  name: 'Atlas',
  bio: 'A DeFi agent.',
  lore: ['Born at genesis.'],
  systemRules: ['Never lie about a digest.'],
  model: 'claude-sonnet-4-6',
  suiNetwork: 'testnet',
  settings: {},
  plugins: [],
};

const state: State = {
  recentMessages: [],
  walletBalance: '4.2300',
  suiAddress: '0xabc',
  additionalContext: 'SUI: $2.14',
};

const message: Memory = {
  id: '1',
  agentId: 'Atlas',
  userId: 'u',
  conversationId: 'c',
  content: { text: 'what is my balance?' },
  role: 'user',
  createdAt: 0,
};

const sampleAction: Action = {
  name: 'DO_THING',
  similes: ['DO'],
  description: 'Does a thing.',
  schema: { type: 'object', properties: { a: { type: 'number' } }, required: ['a'] },
  validate: async () => true,
  handler: async () => {},
};

beforeEach(() => {
  mockCreate.mockReset();
});

describe('LLMProvider.buildSystemPrompt', () => {
  it('includes identity, lore, rules, context, and behaviour', () => {
    const llm = new LLMProvider('key', 'claude-sonnet-4-6');
    const prompt = llm.buildSystemPrompt(state, character);
    expect(prompt).toContain('You are Atlas.');
    expect(prompt).toContain('A DeFi agent.');
    expect(prompt).toContain('Born at genesis.');
    expect(prompt).toContain('Never lie about a digest.');
    expect(prompt).toContain('SUI: $2.14');
    expect(prompt).toContain('SUI balance: 4.2300 SUI');
    expect(prompt).toContain('How you behave');
  });
});

describe('LLMProvider.buildTools', () => {
  it('maps actions to Anthropic tool definitions', () => {
    const llm = new LLMProvider('key', 'claude-sonnet-4-6');
    const tools = llm.buildTools([sampleAction]);
    expect(tools).toEqual([
      { name: 'DO_THING', description: 'Does a thing.', input_schema: sampleAction.schema },
    ]);
  });
});

describe('LLMProvider.generate', () => {
  it('returns plain text when no tool is called', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Your balance is 4.23 SUI.' }],
      stop_reason: 'end_turn',
    });
    const llm = new LLMProvider('key', 'claude-sonnet-4-6');
    const execute = vi.fn();
    const reply = await llm.generate(message, state, character, [], execute);
    expect(reply).toBe('Your balance is 4.23 SUI.');
    expect(execute).not.toHaveBeenCalled();
  });

  it('runs the tool loop and returns the final summary', async () => {
    mockCreate
      .mockResolvedValueOnce({
        content: [
          { type: 'text', text: 'working on it' },
          { type: 'tool_use', id: 'tu1', name: 'DO_THING', input: { a: 1 } },
        ],
        stop_reason: 'tool_use',
      })
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: 'all done' }],
        stop_reason: 'end_turn',
      });

    const llm = new LLMProvider('key', 'claude-sonnet-4-6');
    const execute = vi.fn().mockResolvedValue({ text: 'thing done', isError: false });
    const reply = await llm.generate(message, state, character, [sampleAction], execute);

    expect(execute).toHaveBeenCalledWith('DO_THING', { a: 1 });
    expect(reply).toBe('all done');
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });
});
