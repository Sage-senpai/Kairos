# Changelog

All notable changes to KAIROS are documented here.  
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)  
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

---

## [0.1.0] - 2026-06-07

### Added
- Initial monorepo setup with pnpm workspaces, tsup builds, Vitest, and ESLint flat config
- `@kairos/core` — `AgentRuntime` with tool-use loop, `MemoryManager`, `LLMProvider` (Anthropic SDK), `logger`, and all shared interfaces in `types.ts`
- `@kairos/plugin-sui` — TRANSFER_SUI, SWAP_TOKENS (DeepBook v3), STAKE_SUI, READ_OBJECT, GET_OWNED_OBJECTS actions
- `@kairos/plugin-sui` — balanceProvider, priceProvider (Pyth Hermes)
- `@kairos/plugin-walrus` — WalrusMemoryStore, STORE_ON_WALRUS action, walrusMemoryProvider, async memory persistence hook
- `@kairos/plugin-walrus` — RETRIEVE_FROM_WALRUS action; persistent local blob index so memory survives restarts; `move/` on-chain memory index (Move source)
- `@kairos/client-rest` — Express REST server with /message, /balance, and /health endpoints
- `@kairos/client-telegram` — Telegram bot client
- `create-kairos-agent` — CLI scaffolder for new agents
- Example agents: Atlas, Oracle (publishes summaries to Walrus), Sentinel (Telegram alerts)
- Static website under `site/` using the KAIROS design system
- Unit tests for actions, providers, runtime tool-use loop, LLM provider, memory, utils, REST server, Telegram client, and the scaffolder (Vitest)
- `tx` actions wait for finality via `waitForTransaction`
- LICENSE (MIT), CI workflow, `.nvmrc`, Prettier `format` scripts
- docs/MULTI_AGENT.md
- CLAUDE.md, ARCHITECTURE.md, DESIGN.md, DEVELOPMENT.md, ROADMAP.md
- docs/BUILDING_AGENTS.md, WRITING_ACTIONS.md, WRITING_PROVIDERS.md, PROMPT_TEMPLATE.md
