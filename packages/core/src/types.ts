/**
 * Shared KAIROS types. Every cross-package type lives here - no type is defined
 * in a plugin. If a plugin needs a new type, propose it for core first.
 *
 * `@kairos/core` carries no blockchain logic; the only blockchain references here
 * are type-only imports used to give plugin authors typed access to the Sui client
 * and keypair the runtime holds. They are erased at build time.
 */
import type { SuiClient } from '@mysten/sui/client';
import type { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

/** Sui networks an agent can run against. */
export type SuiNetwork = 'mainnet' | 'testnet' | 'devnet' | 'localnet';

/** Who authored a message. */
export type MessageRole = 'user' | 'assistant' | 'system';

/** The configuration that defines an agent's identity and capabilities. */
export interface Character {
  /** Proper-noun name, e.g. `Atlas`. */
  name: string;
  /** First-person identity and purpose. Becomes the core of the system prompt. */
  bio: string;
  /** Background facts the agent knows about itself. */
  lore: string[];
  /** Hard behavioural constraints. Override personality on conflict. */
  systemRules?: string[];
  /** Anthropic model id, e.g. `claude-sonnet-4-6`. */
  model: string;
  /** Which Sui network to operate on. */
  suiNetwork: SuiNetwork;
  /** Secrets and endpoints. Resolved from env by the boot script. */
  settings: Record<string, string>;
  /** Plugin names this agent uses, e.g. `['plugin-sui', 'plugin-walrus']`. */
  plugins: string[];
}

/** The body of a memory. Always has `text`; may carry structured extras. */
export interface MemoryContent {
  text: string;
  [key: string]: unknown;
}

/** A single message in an agent's memory. */
export interface Memory {
  id: string;
  agentId: string;
  userId: string;
  conversationId: string;
  content: MemoryContent;
  role: MessageRole;
  createdAt: number;
}

/** The context assembled before every LLM call. */
export interface State {
  recentMessages: Memory[];
  walletBalance: string;
  suiAddress: string;
  additionalContext: string;
}

/** What an action's handler reports back through its callback. */
export interface ActionResult {
  text: string;
  txDigest?: string;
}

/** Callback an action handler invokes with its result. */
export type HandlerCallback = (result: ActionResult) => void;

/** Something the agent can do. */
export interface Action {
  /** SCREAMING_SNAKE_CASE identifier, unique across all registered plugins. */
  name: string;
  /** Alternative phrasings the LLM might use to refer to this action. */
  similes: string[];
  /** What the LLM reads to decide whether this action fits the request. */
  description: string;
  /** JSON Schema (draft-07) for the parameters this action accepts. */
  schema: Record<string, unknown>;
  /** Runs before `handler`. Return `false` to skip execution. */
  validate: (runtime: IAgentRuntime, message: Memory) => Promise<boolean>;
  /** Performs the action and reports the result via `callback`. */
  handler: (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    params: Record<string, unknown>,
    callback: HandlerCallback,
  ) => Promise<void>;
}

/** Injects real-time context into every LLM call. Returns a concise string. */
export interface Provider {
  get: (runtime: IAgentRuntime, message: Memory) => Promise<string>;
}

/** A bundle of actions and providers, plus optional lifecycle hooks. */
export interface Plugin {
  name: string;
  actions: Action[];
  providers: Provider[];
  /** Called when the plugin is registered. Plugins set up connections here. */
  onRegister?: (runtime: IAgentRuntime) => Promise<void>;
  /** Called for every inbound user message before state is built. */
  onMessage?: (message: Memory) => Promise<void>;
}

/** A tool call requested by the LLM. */
export interface ToolUse {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/** Executes a resolved action by tool name and returns text for the LLM. */
export type ActionExecutor = (
  name: string,
  input: Record<string, unknown>,
) => Promise<{ text: string; isError: boolean }>;

/** Two-tier memory manager. Core implements the hot (in-process) tier. */
export interface IMemoryManager {
  add(memory: Memory): Promise<void>;
  getRecent(conversationId: string, limit?: number): Promise<Memory[]>;
  /** Register a hook fired after every `add` - used by plugin-walrus for cold storage. */
  onAdd(hook: (memory: Memory) => void | Promise<void>): void;
}

/** Wraps the Anthropic SDK and drives the tool-use loop. */
export interface ILLMProvider {
  readonly model: string;
  generate(
    message: Memory,
    state: State,
    character: Character,
    actions: Action[],
    execute: ActionExecutor,
  ): Promise<string>;
}

/**
 * The central per-agent object. Plugins receive this and may set `suiClient`,
 * `keypair`, and `suiAddress` during `onRegister`.
 */
export interface IAgentRuntime {
  readonly character: Character;
  suiClient: SuiClient;
  keypair: Ed25519Keypair;
  suiAddress: string;
  readonly llm: ILLMProvider;
  readonly memoryManager: IMemoryManager;
  registerPlugin(plugin: Plugin): void;
  getSetting(key: string): string;
  processMessage(text: string, userId: string, conversationId?: string): Promise<string>;
}
