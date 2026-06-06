import Anthropic from '@anthropic-ai/sdk';
import type { Action, ActionExecutor, Character, ILLMProvider, Memory, State } from './types';
import { logger } from './logger';

/** Hard cap on tool round-trips per message, to bound cost and prevent loops. */
const MAX_TOOL_ITERATIONS = 6;

/**
 * Wraps the Anthropic SDK. Converts KAIROS actions into Claude tool schemas,
 * runs the tool-use loop, and returns the agent's final natural-language reply.
 */
export class LLMProvider implements ILLMProvider {
  private readonly client: Anthropic;
  readonly model: string;
  private readonly maxTokens: number;

  constructor(apiKey: string, model: string, maxTokens = 4096) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
    this.maxTokens = maxTokens;
  }

  /**
   * Generate a reply to `message`. When Claude requests a tool, `execute` runs
   * the corresponding action and the result is fed back until Claude responds
   * with plain text (or the iteration cap is reached).
   */
  async generate(
    message: Memory,
    state: State,
    character: Character,
    actions: Action[],
    execute: ActionExecutor,
  ): Promise<string> {
    const system = this.buildSystemPrompt(state, character);
    const tools = this.buildTools(actions);
    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: message.content.text },
    ];

    logger.debug(`LLM system prompt:\n${system}`);

    let finalText = '';

    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system,
        messages,
        ...(tools.length > 0 ? { tools } : {}),
      });

      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
      if (text) finalText = text;

      const toolUses = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
      );

      if (response.stop_reason !== 'tool_use' || toolUses.length === 0) {
        break;
      }

      // Preserve the assistant turn (incl. tool_use blocks) before replying.
      messages.push({ role: 'assistant', content: response.content });

      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const tool of toolUses) {
        const input = (tool.input ?? {}) as Record<string, unknown>;
        const outcome = await execute(tool.name, input);
        results.push({
          type: 'tool_result',
          tool_use_id: tool.id,
          content: outcome.text,
          ...(outcome.isError ? { is_error: true } : {}),
        });
      }
      messages.push({ role: 'user', content: results });
    }

    return finalText || 'Done.';
  }

  /** Assemble the system prompt from character, state, and behavioural rules. */
  buildSystemPrompt(state: State, character: Character): string {
    const sections: string[] = [];
    sections.push(`You are ${character.name}.`);
    sections.push(`## Who you are\n${character.bio}`);

    if (character.lore.length > 0) {
      sections.push(`## What you know\n${character.lore.join('\n')}`);
    }
    if (character.systemRules && character.systemRules.length > 0) {
      sections.push(`## Rules you follow\n${character.systemRules.join('\n')}`);
    }
    if (state.additionalContext) {
      sections.push(`## Current context\n${state.additionalContext}`);
    }

    sections.push(
      [
        `Wallet address: ${state.suiAddress || '(not configured)'}`,
        `SUI balance: ${state.walletBalance} SUI`,
        `Network: ${character.suiNetwork}`,
      ].join('\n'),
    );

    // History excludes the current message (sent separately as the user turn).
    const history = state.recentMessages.slice(0, -1);
    if (history.length > 0) {
      const formatted = history
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.text}`)
        .join('\n');
      if (formatted) sections.push(`## Conversation so far\n${formatted}`);
    }

    sections.push(
      [
        '## How you behave',
        '- When you call an action, wait for the result before responding. Your response should include what happened, including the transaction digest if a transaction was executed.',
        '- Never fabricate a transaction digest. If a transaction failed or you did not call an action, say so plainly.',
        '- Addresses longer than 12 characters should be abbreviated: show the first 6 and last 4 characters separated by "...".',
        '- Amounts in SUI should be shown as decimal numbers (e.g. "1.5 SUI" not "1500000000 MIST").',
        '- If you cannot fulfil a request (insufficient balance, invalid address, network error), explain why clearly and suggest what the user should do.',
        '- Keep responses concise. Developers using this API do not need verbose explanations unless asked.',
        '- If the user is asking a question (not requesting an action), answer directly. Do not call an action unless explicitly needed.',
      ].join('\n'),
    );

    return sections.join('\n\n');
  }

  /** Convert KAIROS actions into Anthropic tool definitions. */
  buildTools(actions: Action[]): Anthropic.Tool[] {
    return actions.map((action) => ({
      name: action.name,
      description: action.description,
      input_schema: action.schema as Anthropic.Tool.InputSchema,
    }));
  }
}
