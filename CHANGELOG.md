# Changelog

All notable changes to KAIROS are documented here.  
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)  
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

---

## [Unreleased]

### Added
- Initial monorepo setup with pnpm workspaces, tsup builds, Vitest, and ESLint flat config
- `@kairos/core` — `AgentRuntime` with tool-use loop, `MemoryManager`, `LLMProvider` (Anthropic SDK), `logger`, and all shared interfaces in `types.ts`
- `@kairos/plugin-sui` — TRANSFER_SUI, SWAP_TOKENS (DeepBook v3), STAKE_SUI, READ_OBJECT, GET_OWNED_OBJECTS actions
- `@kairos/plugin-sui` — balanceProvider, priceProvider (Pyth Hermes)
- `@kairos/plugin-walrus` — WalrusMemoryStore, STORE_ON_WALRUS action, walrusMemoryProvider, async memory persistence hook
- `@kairos/client-rest` — Express REST server with /message, /balance, and /health endpoints
- Example agent: Atlas (character.json + boot file)
- Unit tests for actions, providers, memory, utils, REST server (Vitest)
- CLAUDE.md, ARCHITECTURE.md, DESIGN.md, DEVELOPMENT.md, ROADMAP.md
- docs/BUILDING_AGENTS.md, WRITING_ACTIONS.md, WRITING_PROVIDERS.md, PROMPT_TEMPLATE.md
