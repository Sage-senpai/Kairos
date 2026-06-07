import type { SuiClient } from '@mysten/sui/client';
import type { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import type {
  Action,
  ActionExecutor,
  ActionResult,
  Character,
  IAgentRuntime,
  Memory,
  Plugin,
  Provider,
  State,
} from './types';
import { MemoryManager } from './memory';
import { LLMProvider } from './llm';
import { logger } from './logger';
import { formatSui, generateId } from './utils';

/**
 * The central object of a KAIROS agent. One runtime per agent process.
 *
 * The runtime knows nothing about Sui directly — `suiClient`, `keypair`, and
 * `suiAddress` are populated by plugin-sui during `registerPlugin`. This keeps
 * core testable without a chain connection.
 */
export class AgentRuntime implements IAgentRuntime {
  readonly character: Character;
  readonly llm: LLMProvider;
  readonly memoryManager: MemoryManager;

  // Set by plugin-sui's onRegister. Undefined until then.
  suiClient!: SuiClient;
  keypair!: Ed25519Keypair;
  suiAddress = '';

  private readonly actions = new Map<string, Action>();
  private readonly similes = new Map<string, string>();
  private readonly providers: Provider[] = [];
  private readonly plugins: Plugin[] = [];

  constructor(character: Character) {
    this.character = character;
    const apiKey = this.getSetting('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required in character.settings or the environment.');
    }
    this.llm = new LLMProvider(apiKey, character.model);
    this.memoryManager = new MemoryManager();
  }

  /**
   * Register a plugin: index its actions and providers, then run its
   * `onRegister` hook (where plugins set up connections). Providers run in
   * registration order, so register plugin-sui before plugin-walrus.
   */
  registerPlugin(plugin: Plugin): void {
    for (const action of plugin.actions) {
      this.actions.set(action.name, action);
      for (const simile of action.similes) {
        this.similes.set(simile.toUpperCase(), action.name);
      }
    }
    for (const provider of plugin.providers) {
      this.providers.push(provider);
    }
    this.plugins.push(plugin);

    if (plugin.onRegister) {
      // plugin onRegister bodies assign suiClient/keypair synchronously before
      // their first await, so the fields are set by the time this returns.
      void plugin
        .onRegister(this)
        .catch((err) => logger.error(`Plugin "${plugin.name}" onRegister failed`, err));
    }
    logger.info(`Registered plugin "${plugin.name}" (${plugin.actions.length} actions)`);
  }

  /** Read a setting from character config first, then the environment. */
  getSetting(key: string): string {
    return this.character.settings[key] ?? process.env[key] ?? '';
  }

  /**
   * Process one inbound message end-to-end: persist it, build state, let the
   * LLM act (executing any tool calls), persist the reply, and return the text.
   */
  async processMessage(text: string, userId: string, conversationId = 'default'): Promise<string> {
    const userMessage: Memory = {
      id: generateId(),
      agentId: this.character.name,
      userId,
      conversationId,
      content: { text },
      role: 'user',
      createdAt: Date.now(),
    };
    await this.memoryManager.add(userMessage);

    for (const plugin of this.plugins) {
      if (plugin.onMessage) {
        await Promise.resolve(plugin.onMessage(userMessage)).catch((err) =>
          logger.error(`Plugin "${plugin.name}" onMessage failed`, err),
        );
      }
    }

    const state = await this.buildState(userMessage);
    const actionList = [...this.actions.values()];

    const execute: ActionExecutor = (name, input) =>
      this.executeAction(name, input, userMessage, state);

    const responseText = await this.llm.generate(
      userMessage,
      state,
      this.character,
      actionList,
      execute,
    );

    const assistantMessage: Memory = {
      id: generateId(),
      agentId: this.character.name,
      userId,
      conversationId,
      content: { text: responseText },
      role: 'assistant',
      createdAt: Date.now(),
    };
    await this.memoryManager.add(assistantMessage);

    return responseText;
  }

  /** Resolve a tool name to an action (by name or simile), validate, and run it. */
  private async executeAction(
    name: string,
    input: Record<string, unknown>,
    message: Memory,
    state: State,
  ): Promise<{ text: string; isError: boolean }> {
    const resolvedName = this.actions.has(name) ? name : this.similes.get(name.toUpperCase());
    const action = resolvedName ? this.actions.get(resolvedName) : undefined;

    if (!action) {
      logger.warn(`LLM requested unknown action "${name}" — skipping`);
      return { text: `Unknown action: ${name}`, isError: true };
    }

    try {
      const valid = await action.validate(this, message);
      if (!valid) {
        logger.warn(`Validation failed for ${action.name}`);
        return {
          text: `Cannot perform ${action.name}: preconditions not met (check balance, address, or network).`,
          isError: true,
        };
      }

      logger.action(`${action.name} executing...`);
      let result: ActionResult = { text: '' };
      await action.handler(this, message, state, input, (r) => {
        result = r;
      });

      if (result.txDigest) {
        logger.success(`${action.name} confirmed — tx ${result.txDigest}`);
        return { text: `${result.text} (tx: ${result.txDigest})`, isError: false };
      }
      return { text: result.text || `${action.name} completed.`, isError: false };
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      logger.error(`${action.name} failed`, err);
      return { text: `Action ${action.name} failed: ${detail}`, isError: true };
    }
  }

  /** Build the per-message State: history, wallet balance, and provider context. */
  private async buildState(message: Memory): Promise<State> {
    const recentMessages = await this.memoryManager.getRecent(message.conversationId, 20);

    let walletBalance = '0';
    if (this.suiClient && this.suiAddress) {
      try {
        const balance = await this.suiClient.getBalance({ owner: this.suiAddress });
        walletBalance = formatSui(balance.totalBalance);
      } catch (err) {
        logger.debug(`Failed to read balance: ${err instanceof Error ? err.message : err}`);
      }
    }

    const providerOutputs = await Promise.all(
      this.providers.map((p) => p.get(this, message).catch(() => '')),
    );

    return {
      recentMessages,
      walletBalance,
      suiAddress: this.suiAddress,
      additionalContext: providerOutputs.filter(Boolean).join('\n'),
    };
  }
}
