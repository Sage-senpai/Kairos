# KAIROS — Hackathon Roadmap

> Build plan for Sui Overflow 2026, Agentic Web track. Submission deadline: end of August 2026.

---

## Goal

Win first place in the Agentic Web track by building the **definitive AI agent framework for Sui** — the one that every future Sui agent project builds on top of. Not another agent that does a task. The framework that agents are built with.

**Success metric:** Demo Day judge can fork the repo, drop in a `character.json`, and have a live agent signing testnet transactions within 10 minutes.

---

## Phase 1 — Foundation (Weeks 1–2)

**Goal:** Core runtime running, one action working end-to-end.

### Week 1
- [ ] Bootstrap monorepo (pnpm workspaces, tsconfig, eslint, prettier)
- [ ] Implement `types.ts` — all interfaces locked down
- [ ] Implement `AgentRuntime` skeleton
- [ ] Implement `MemoryManager` (hot cache only)
- [ ] Implement `LLMProvider` with Anthropic SDK
- [ ] First action: `READ_OBJECT` (no transaction, easy to test)
- [ ] First provider: `balanceProvider`
- [ ] REST client: Express server with `/message` endpoint
- [ ] Example agent boots and responds to "what is my balance?"

### Week 2
- [ ] `TRANSFER_SUI` action (real testnet transaction)
- [ ] `STORE_ON_WALRUS` action (real Walrus testnet upload)
- [ ] `priceProvider` using Pyth Hermes API
- [ ] Error handling across all actions (try/catch, callback with error text)
- [ ] Vitest setup + unit tests for READ_OBJECT and TRANSFER_SUI
- [ ] `pnpm build`, `pnpm test`, `pnpm lint` all pass

**Week 2 checkpoint:** The example agent can: check balance, read objects, transfer SUI, and store data on Walrus — all from natural language.

---

## Phase 2 — Plugin depth (Weeks 3–4)

**Goal:** Full Sui action coverage. Plugin architecture solid.

### Week 3
- [ ] `SWAP_TOKENS` action using DeepBook v3 SDK
- [ ] `STAKE_SUI` action
- [ ] `GET_OWNED_OBJECTS` action (list all objects in wallet)
- [ ] `walrusMemoryProvider` — inject recent Walrus blobs as context
- [ ] Plugin `onRegister` lifecycle hook implemented
- [ ] Integration test: agent executes a real swap on testnet
- [ ] Monorepo: packages publish to local npm registry for testing

### Week 4
- [ ] `plugin-walrus` Move contract: onchain index for agent memories
  - Shared object: `Table<address, vector<BlobRecord>>`
  - Agent registers blobId after every Walrus store
- [ ] Cold memory retrieval: `MemoryManager.getFromWalrus(agentId, limit)`
- [ ] Multi-turn memory test: agent remembers previous conversations across sessions
- [ ] `PTB_BUILDER` action — let the agent compose a multi-step PTB from user description
- [ ] Tests for all new actions

**Week 4 checkpoint:** Agent remembers things across sessions. Memory is onchain-indexed, Walrus-stored, user-owned.

---

## Phase 3 — Framework experience (Weeks 5–6)

**Goal:** Writing a new agent or action should feel excellent. Third-party plugin support.

### Week 5
- [ ] CLI scaffolding tool: `npx create-kairos-agent`
  - Generates `character.json`, `index.ts`, `.env.example` from prompts
- [ ] Plugin interface finalised — external devs can build plugins
- [ ] Publish `@kairos-sui/core`, `@kairos-sui/plugin-sui`, `@kairos-sui/plugin-walrus` to npm
- [ ] Documentation: `WRITING_ACTIONS.md`, `WRITING_PROVIDERS.md`, `BUILDING_AGENTS.md` complete
- [ ] KAIROS website (static HTML, dark, KAIROS design system) deployed to Walrus

### Week 6
- [ ] Telegram client (`@kairos-sui/client-telegram`)
- [ ] Example: **Sentinel agent** — DeFi monitoring agent that sends Telegram alerts when DeepBook price moves >5%
- [ ] Example: **Oracle agent** — writes hourly price summaries to Walrus, indexed onchain
- [ ] Example: **Atlas agent** — reads Oracle's latest summary for context, executes rebalancing
- [ ] Multi-agent demo: Oracle writes → Atlas reads → Atlas executes — all autonomous, all onchain

**Week 6 checkpoint:** Three distinct agents running simultaneously, two communicating via Walrus + Sui objects. Working Telegram bot. npm packages published.

---

## Phase 4 — Demo day preparation (Weeks 7–8)

**Goal:** A 5-minute live demo that judges cannot forget.

### Week 7
- [ ] Demo script written and rehearsed 5+ times
- [ ] Mainnet agent deployed (small amounts, real money, real stakes)
- [ ] `@kairos-sui/core` README polished — must convey full value in 30 seconds of reading
- [ ] GitHub repository: star-worthy README, clean commit history, tagged releases
- [ ] Hackathon submission text written (devfolio)
- [ ] 60-second video walkthrough recorded

### Week 8
- [ ] Final bug fixes
- [ ] Performance: measure and log LLM response time, action execution time, Walrus round-trip
- [ ] Demo Day dry run: simulate a judge asking questions mid-demo
- [ ] Submission submitted before deadline

---

## Demo Day script (5 minutes)

```
0:00 — Problem statement
"Every major blockchain now has AI agents. Ethereum has Eliza OS.
Base has AgentKit. Solana has multiple frameworks. Sui has nothing.
We built KAIROS — the Move-native AI agent framework for Sui."

0:30 — Live demo: boot an agent
"Watch. We type one command."
[npx tsx agents/atlas/index.ts]
"Atlas is now running on Sui mainnet. It has a wallet. It knows its balance.
It can sign transactions. It remembers things."

1:00 — Natural language → onchain action
"I say: send 0.01 SUI to this address."
[curl the REST API]
"The transaction is signed, submitted, and confirmed. Here's the digest."
[show on suiscan.xyz]

2:00 — Memory
"Now I close the agent and restart it. I ask: what did I do last time?"
[agent recalls the transfer from Walrus memory]
"That conversation happened in a previous session. The memory is stored on Walrus.
The index is on Sui. Nobody can take it from the user."

3:00 — Framework: one action, 20 lines of TypeScript
[show WRITING_ACTIONS.md]
"Anyone can add an action. It is 20 lines of TypeScript.
The LLM reads the description and knows when to call it.
You do not need to write a router, a parser, or a state machine."

4:00 — Multi-agent: Oracle → Atlas
"This is Oracle — an agent that writes Sui market data to Walrus every hour.
This is Atlas — an agent that reads Oracle's latest blob and uses it as context.
They coordinate via Walrus and onchain objects. Zero API calls between them.
Zero trust required."

4:45 — The ask
"KAIROS is on npm. It is open source. Today, three demo agents. 
With your support, it becomes the foundation that every Sui agent project builds on.
The Eliza OS of Sui."
```

---

## Risks and mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Walrus testnet is slow / unreliable | Medium | Cache writes locally, async persistence, never block on Walrus |
| DeepBook SDK changes before demo | Low | Pin exact version, have a simple mock swap for demo fallback |
| LLM picks wrong action in demo | Medium | Pre-warm the conversation with a few messages before demo starts |
| Mainnet transaction fails during demo | Medium | Demo on testnet with a "mainnet is live in the background" narration |
| Not enough time to build multi-agent | Medium | Multi-agent is Phase 3 bonus — core framework wins the track alone |

---

## What winning looks like

First place in Agentic Web means the judges believed:
1. The framework is **technically sound** — real Sui transactions, real Walrus storage, real LLM tool-use
2. The framework is **useful to other builders** — plugin interface, documentation, npm packages
3. The demo was **memorable** — a specific moment where something unexpected happened and worked
4. The **narrative was clear** — "this is what Eliza is to Ethereum, for Sui"
