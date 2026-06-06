# KAIROS — Design System

> The visual identity, colour system, typography, and component guidelines for everything KAIROS: the website, CLI output, documentation, slides, and any UI built on the framework.

---

## Brand

**Name:** KAIROS  
**Pronunciation:** KY-ross  
**Origin:** Ancient Greek — *kairos* (καιρός) — the opportune moment. Not clock-time, but the right time to act. Every agent waits for its kairos.

**Tagline (primary):** *Agents that act at the right moment.*  
**Tagline (short):** *Act on Sui.*  
**Hackathon pitch:** *The AI agent framework built for Sui — the only one that composes PTBs, stores memory on Walrus, and speaks Move natively.*

---

## The core tension

Sui's identity is **oceanic** — fluid, blue, fast, expansive. KAIROS is **electric** — precise, violet, sharp, intentional. The two coexist because agents are the intentional force moving through Sui's fluid environment. The design expresses this through the **violet → teal gradient**: violet (decision, intelligence, AI) flowing into teal (action, execution, on-chain).

Never use Sui's exact blue (`#4CA3FF`) as a KAIROS brand colour. Reference it only when literally displaying Sui branding within a KAIROS interface.

---

## Colour system

### Core palette

```
--kairos-void      #09090F    Background. Near-black with the faintest blue undertone.
--kairos-surface   #111119    Card and panel backgrounds.
--kairos-surface-2 #18181F    Elevated surfaces, hover states.
--kairos-border    #252535    Borders and dividers.
--kairos-muted     #6B6B8A    Placeholder text, disabled states, captions.
--kairos-text      #EBEBF5    Primary text. Warm white with a violet cast.
--kairos-text-2    #A8A8C0    Secondary text.

--kairos-violet    #7C3AED    Primary brand. Buttons, links, active states.
--kairos-violet-2  #9F67FF    Lighter violet. Hover on primary elements.
--kairos-violet-3  #C4A7FF    Even lighter. Focus rings, subtle highlights.
--kairos-teal      #2DD4BF    Secondary accent. Success states, on-chain actions.
--kairos-teal-2    #5EEAD4    Lighter teal. Hover on secondary elements.

--kairos-amber     #F59E0B    Warning states, gas cost indicators.
--kairos-red       #EF4444    Error states, failed transactions.
--kairos-green     #22C55E    Confirmed transactions (use sparingly, prefer teal).
```

### The gradient

The KAIROS signature gradient runs **violet → teal**, left to right or top to bottom.

```css
/* Standard gradient */
background: linear-gradient(135deg, #7C3AED 0%, #2DD4BF 100%);

/* Text gradient (use for hero headlines only) */
background: linear-gradient(90deg, #9F67FF 0%, #5EEAD4 100%);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;

/* Subtle border gradient (cards, highlights) */
border-image: linear-gradient(135deg, #7C3AED, #2DD4BF) 1;
```

**Rules for the gradient:**
- Use on at most one element per screen. It is a signal, not a pattern.
- Never use on body backgrounds — only on text, borders, or small accent elements.
- The CLI spinner uses the gradient cycling through violet → teal shades.

### Dark mode is the only mode

KAIROS is dark-first. There is no light mode. Agents run in terminals, dark IDEs, and dark Telegram themes. The design assumes `#09090F` backgrounds always.

---

## Typography

### Typefaces

| Role | Font | Weight | Notes |
|---|---|---|---|
| Display / hero | Space Grotesk | 700 | Large headings, the KAIROS wordmark |
| Body | Inter | 400 / 500 | All body text, UI labels |
| Monospace | JetBrains Mono | 400 / 500 | Code blocks, addresses, tx digests, CLI output |

Load order in web contexts:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Type scale

```
Hero:         56px / Space Grotesk 700 / line-height 1.1
H1:           36px / Space Grotesk 700 / line-height 1.15
H2:           24px / Inter 500        / line-height 1.3
H3:           18px / Inter 500        / line-height 1.4
Body large:   16px / Inter 400        / line-height 1.7
Body:         14px / Inter 400        / line-height 1.6
Caption:      12px / Inter 400        / line-height 1.5 / color: --kairos-muted
Code:         13px / JetBrains Mono   / line-height 1.55
```

### Address formatting

Sui addresses in KAIROS UI are always shown in the format `0x1234...abcd` — first 6 and last 4 characters. Monospace, colour `--kairos-teal`.

Transaction digests: show in full, monospace, wrapped, selectable.

---

## Logo

### Wordmark

`KAIROS` in Space Grotesk 700, all caps, letter-spacing `0.08em`.  
The `K` is slightly larger (110% of cap height) and offset to suggest motion — an agent leaning into action.

Colours:
- On dark: `--kairos-text` (#EBEBF5) with the `K` in `--kairos-violet` (#7C3AED)
- Gradient variant: full wordmark in the violet → teal gradient (hero use only)

### Symbol mark

A geometric `K` constructed from two diagonal lines meeting at a vertical spine. The junction point emits a subtle glow in `--kairos-teal`. This is the favicon, avatar, and icon.

### Clear space

Minimum clear space around the logo: equal to the height of the letter `A` in the wordmark on all sides.

### Don't

- Don't recolour the logo to anything outside the KAIROS palette.
- Don't add drop shadows or glows to the wordmark (the symbol mark has one intentional glow).
- Don't place the logo on anything lighter than `--kairos-surface`.
- Don't stretch or skew.

---

## Components

### Buttons

```css
/* Primary — for the one most important action on a screen */
.btn-primary {
  background: #7C3AED;
  color: #EBEBF5;
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  font: 500 14px/1 Inter;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-primary:hover { background: #9F67FF; }
.btn-primary:active { background: #6D28D9; transform: scale(0.98); }

/* Secondary — outlined */
.btn-secondary {
  background: transparent;
  color: #EBEBF5;
  border: 0.5px solid #252535;
  border-radius: 8px;
  padding: 10px 20px;
  font: 500 14px/1 Inter;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.btn-secondary:hover { border-color: #6B6B8A; background: #111119; }

/* Ghost — text only, for tertiary actions */
.btn-ghost {
  background: transparent;
  color: #A8A8C0;
  border: none;
  padding: 8px 12px;
  font: 400 14px/1 Inter;
  cursor: pointer;
}
.btn-ghost:hover { color: #EBEBF5; }
```

### Cards

```css
.card {
  background: #111119;
  border: 0.5px solid #252535;
  border-radius: 12px;
  padding: 20px 24px;
}
.card:hover { border-color: #6B6B8A; }

/* Accent card — for featured/active states */
.card-accent {
  border-left: 2px solid #7C3AED;
  border-radius: 0 12px 12px 0;
}

/* Transaction card — shown after tx executes */
.card-tx {
  border: 0.5px solid #2DD4BF40;  /* teal at 25% opacity */
  background: #0D1F1C;            /* very dark teal tint */
}
```

### Code / terminal blocks

```css
.code-block {
  background: #0D0D17;
  border: 0.5px solid #252535;
  border-radius: 8px;
  padding: 16px 20px;
  font: 400 13px/1.55 'JetBrains Mono', monospace;
  color: #EBEBF5;
  overflow-x: auto;
  tab-size: 2;
}

/* Syntax tokens */
.token-keyword   { color: #C4A7FF; }  /* import, const, async */
.token-string    { color: #86EFAC; }  /* green strings */
.token-type      { color: #5EEAD4; }  /* types, interfaces */
.token-comment   { color: #6B6B8A; }  /* comments */
.token-number    { color: #FCA5A5; }  /* numbers */
.token-function  { color: #9F67FF; }  /* function names */
```

### Badges / pills

```css
/* Status pills */
.badge-live    { background: #14261E; color: #2DD4BF; font-size: 11px; padding: 2px 8px; border-radius: 20px; }
.badge-pending { background: #2A1F00; color: #F59E0B; font-size: 11px; padding: 2px 8px; border-radius: 20px; }
.badge-error   { background: #2A0A0A; color: #EF4444; font-size: 11px; padding: 2px 8px; border-radius: 20px; }
.badge-info    { background: #1A1230; color: #9F67FF; font-size: 11px; padding: 2px 8px; border-radius: 20px; }
```

---

## CLI output conventions

The KAIROS framework emits structured CLI output. Use the `logger` utility in `@kairos/core`:

```typescript
import { logger } from '@kairos/core';

logger.info('Agent "Atlas" booted');        // → [KAIROS] Agent "Atlas" booted
logger.action('TRANSFER_SUI executing...');  // → [ACTION] TRANSFER_SUI executing...
logger.success('TX confirmed: abc123...');   // → [✓] TX confirmed: abc123...
logger.warn('Balance below 0.1 SUI');        // → [!] Balance below 0.1 SUI
logger.error('Walrus store failed', err);    // → [✗] Walrus store failed
```

Colours in the terminal:
- `[KAIROS]` prefix: violet (`\x1b[35m`)
- `[ACTION]` prefix: teal (`\x1b[36m`)
- `[✓]` success: green (`\x1b[32m`)
- `[!]` warning: amber (`\x1b[33m`)
- `[✗]` error: red (`\x1b[31m`)

Addresses are truncated: `0x1234...abcd`. Transaction digests are shown in full but dim (`\x1b[2m`).

---

## Documentation style

All KAIROS docs follow these rules:

- **Tone:** direct, precise, no filler. Write for engineers who are already good.
- **Tense:** present tense. "The runtime calls providers" not "The runtime will call providers."
- **Code first:** every concept gets a code example. No concept is explained in prose alone.
- **Headers:** sentence case. Never title case. `## Write a custom action` not `## Writing A Custom Action`.
- **Callouts:**
  - `> **Note:**` — supplementary info
  - `> **Important:**` — must-know gotcha
  - `> **Tip:**` — shortcut or best practice
- **Avoid:** "simply", "just", "easily", "obviously". If it were obvious, nobody would need the docs.
- **Links:** always relative within the repo (`[ARCHITECTURE.md](ARCHITECTURE.md)`, not absolute URLs to GitHub).

---

## Slide / pitch deck style

For hackathon presentations:

- **Background:** `#09090F` always
- **Title slides:** wordmark top-left, hero text in gradient, single bold claim per slide
- **Code slides:** full-bleed code block, dark background, syntax highlighting as above. Never screenshot VS Code — use the KAIROS code block style.
- **Demo GIF:** record at 2× speed, no cursor effects, terminal only. Clean `zsh` or `fish` prompt.
- **Max 12 slides:** Problem → Solution → How it works → Demo → Architecture → Traction → Ask
- **No bullet points longer than 8 words.** One idea per slide.

---

## Naming conventions

| Thing | Convention | Example |
|---|---|---|
| npm package | `@kairos/name` | `@kairos/plugin-sui` |
| Action names | `SCREAMING_SNAKE_CASE` | `TRANSFER_SUI` |
| Plugin names | `kebab-case` | `plugin-walrus` |
| Classes | `PascalCase` | `AgentRuntime` |
| Files | `kebab-case.ts` | `memory-store.ts` |
| Environment vars | `SCREAMING_SNAKE_CASE` | `SUI_PRIVATE_KEY` |
| Character names | Title case proper noun | `Atlas`, `Sentinel`, `Oracle` |
