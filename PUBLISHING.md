# Publishing KAIROS

How to get the framework onto npm so anyone can `npx create-kairos-agent` or `pnpm add @kairos-sui/core`, and how reviewers run it without npm at all.

---

## For judges and reviewers: no npm needed

The fastest way for someone to read and run the project is the repo itself. Nothing has to be published.

```bash
git clone https://github.com/Sage-senpai/Kairos.git
cd Kairos
pnpm install
pnpm build
pnpm test                              # 62 tests, all green

pnpm wallet                            # generate a Sui key
#  fund the address at https://faucet.sui.io (Testnet)

cp agents/example/.env.example agents/example/.env
#  set SUI_PRIVATE_KEY and ANTHROPIC_API_KEY

cd agents/example && pnpm start        # agent on localhost:3000
```

Point reviewers here first. It is the source of truth and it works offline of npm.

---

## Publishing to npm (the `npx` path)

This makes `npx create-kairos-agent MyAgent` work for anyone, and lets people install the packages directly.

### One-time: claim the scope

The packages are named `@kairos-sui/*`. To publish under that scope you need an npm org named `kairos`.

```bash
npm login
#  create a free org named "kairos" at https://www.npmjs.com/org/create
```

If `kairos` is already taken on npm, you cannot publish under `@kairos`. Two options: pick a different org you own, or rename the scope across the monorepo to your own username scope (`@sage-senpai/*`). Ask and this can be renamed in one pass.

### Each release

```bash
# 1. Make sure everything is green and built
pnpm install
pnpm build && pnpm test && pnpm lint

# 2. Bump versions (all packages move together here)
pnpm -r exec npm version patch --no-git-tag-version
#    or edit the "version" field by hand

# 3. Publish every public package. pnpm rewrites workspace:* to the real
#    version automatically, and publishConfig.access is already "public".
pnpm -r publish --access public --no-git-checks
```

That publishes `@kairos-sui/core`, `@kairos-sui/plugin-sui`, `@kairos-sui/plugin-walrus`, `@kairos-sui/client-rest`, `@kairos-sui/client-telegram`, and `create-kairos-agent`. The private agents under `agents/` are skipped (they are marked `private`).

### After publishing

```bash
# anyone can now scaffold and run an agent from scratch:
npx create-kairos-agent Atlas
cd agents/atlas
cp .env.example .env        # add the two keys
pnpm install && pnpm start
```

The scaffolded agent pulls `@kairos-sui/*` from npm (it references `^0.1.0`, not the workspace), so it works as a standalone project outside this repo.

---

## What is already set up

- Every publishable package has `repository`, `homepage`, `bugs`, and `publishConfig.access: "public"`.
- Inter-package deps use `workspace:*`; pnpm converts them to the published version on publish.
- `create-kairos-agent` has a `bin`, so `npx create-kairos-agent` resolves to it once published.
- Versions are at `0.1.0`.

## What you still decide

- Whether the org is `@kairos` (create it) or a rename to a scope you own.
- Whether to tag releases in git (`git tag v0.1.0 && git push --tags`).
