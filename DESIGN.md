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

KAIROS is an arcane instrument. An agent waits in the dark for its moment, then acts with intent. The identity leans into that. A blood-crimson carries the act itself. An arcane gold carries the marks and sigils around it. Both sit on a near-black so they read like firelight in a vault.

Crimson is the wound of colour: the moment of action, used once per screen. Gold is the rune: the label, the seal, the link. Everything else is bone and shadow.

The palette is drawn from the sorcerer archetype (crimson cloak, gilded sigils) rather than the old oceanic-violet scheme, which read as a generic AI default. Use Sui's blue (`#4CA3FF`) only when you are literally displaying Sui's own branding.

---

## Colour system

### Core palette

```
--kairos-void      #16110E    Background. Near-black with a warm, ashen undertone.
--kairos-surface   #1C1714    Card and panel backgrounds.
--kairos-surface-2 #241D18    Elevated surfaces, hover states.
--kairos-border    #3A2F26    Borders and dividers (used at low opacity).
--kairos-muted     #8A7B6B    Placeholder text, captions, disabled states.
--kairos-bone      #EDE6DA    Primary text. Warm parchment white.
--kairos-bone-2    #BCAE9C    Secondary text.

--kairos-crimson   #B11D22    Primary action. Buttons, the one emphasised word.
--kairos-crimson-2 #D8332C    Lit crimson. Hover on primary, the [ACTION] mark.
--kairos-gold      #E0B23C    Arcane accent. Sigils, labels, links, code keys.
--kairos-gold-2    #F0CB66    Lit gold. Hover on gold elements, focus rings.
--kairos-amber     #D9A441    Strings in code, gas cost indicators.

--kairos-rust      #9A4A2A    Warning states.
--kairos-blood     #8E1A1F    Error states, failed transactions.
```

### Accent discipline

There is no gradient. The old violet to teal blend is retired. Colour works through placement and restraint, not blends.

```css
/* The act: one crimson element per screen */
.act {
  background: #b11d22;
  color: #ede6da;
}

/* The rune: gold for small arcane marks */
.rune {
  color: #e0b23c;
}

/* Atmosphere: a faint vignette, never a body-wide gradient fill */
background: radial-gradient(ellipse 110% 85% at 50% 8%, transparent 42%, #0d0a08 100%);
```

**Rules:**
- Crimson appears at most once per screen: the primary action, or the single word that carries the sentence. Never two crimson elements competing.
- Gold carries the small marks: the eyebrow label, section numbers, links, the wordmark glyph, code keys. It may repeat, quietly.
- No gradient text, ever. Emphasis comes from weight, colour, or a thin gold underline.
- A slow ward sigil and an edge vignette set the mood. Keep both faint enough that the content always wins.

### Dark mode is the only mode

KAIROS is dark-first. There is no light mode. Agents run in terminals, dark IDEs, and dark Telegram themes. The design assumes `#16110E` backgrounds always.

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

Sui addresses in KAIROS UI are always shown in the format `0x1234...abcd`, first 6 and last 4 characters. Monospace, colour `--kairos-gold`.

Transaction digests: show in full, monospace, wrapped, selectable.

---

## Logo

### Wordmark

`KAIROS` in Space Grotesk 700, all caps, letter-spacing `0.08em`.  
The `K` is slightly larger (110% of cap height) and offset to suggest motion — an agent leaning into action.

Colours:
- On dark: `--kairos-bone` (#EDE6DA), with the `O` set in `--kairos-gold` (#E0B23C) as a small seal.
- Never recolour the wordmark with a gradient. A single gold glyph is the only accent it gets.

### Symbol mark

A geometric `K` constructed from two diagonal lines meeting at a vertical spine. The junction carries a faint gold glow, like gilding catching candlelight. One glow, nowhere else. This is the favicon, avatar, and icon.

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
/* Primary: the one act on a screen. Crimson. */
.btn-primary {
  background: #B11D22;
  color: #EDE6DA;
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  font: 500 14px/1 Inter;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-primary:hover { background: #D8332C; }
.btn-primary:active { background: #8E1A1F; transform: scale(0.98); }

/* Secondary: outlined, with a gold edge on hover. */
.btn-secondary {
  background: transparent;
  color: #EDE6DA;
  border: 1px solid #3A2F26;
  border-radius: 8px;
  padding: 10px 20px;
  font: 500 14px/1 Inter;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.btn-secondary:hover { border-color: #E0B23C; color: #E0B23C; }

/* Ghost: text only, for tertiary actions. */
.btn-ghost {
  background: transparent;
  color: #BCAE9C;
  border: none;
  padding: 8px 12px;
  font: 400 14px/1 Inter;
  cursor: pointer;
}
.btn-ghost:hover { color: #EDE6DA; }
```

### Cards

```css
.card {
  background: #1C1714;
  border: 1px solid #3A2F26;
  border-radius: 12px;
  padding: 20px 24px;
}
.card:hover { border-color: #8A7B6B; }

/* Accent card: featured or active. A leading gold number, full hairline. */
.card-accent {
  border: 1px solid #3A2F26;
  border-radius: 12px;
}
.card-accent .num { color: #E0B23C; }  /* the rune marks it, not a side stripe */

/* Transaction card: shown after a tx executes. */
.card-tx {
  border: 1px solid #E0B23C40;  /* gold at 25% opacity */
  background: #1F1708;          /* very dark warm tint */
}
```

### Code / terminal blocks

```css
.code-block {
  background: #13100D;
  border: 1px solid #3A2F26;
  border-radius: 8px;
  padding: 16px 20px;
  font: 400 13px/1.55 'JetBrains Mono', monospace;
  color: #EDE6DA;
  overflow-x: auto;
  tab-size: 2;
}

/* Syntax tokens */
.token-keyword   { color: #E0B23C; }  /* import, const, async */
.token-string    { color: #D9A441; }  /* strings */
.token-type      { color: #BCAE9C; }  /* types, interfaces */
.token-comment   { color: #8A7B6B; }  /* comments */
.token-number    { color: #D8332C; }  /* numbers */
.token-function  { color: #F0CB66; }  /* function names */
```

### Badges / pills

```css
/* Status pills */
.badge-live    { background: #2A1F0A; color: #E0B23C; font-size: 11px; padding: 2px 8px; border-radius: 20px; }
.badge-pending { background: #2A1A08; color: #D9A441; font-size: 11px; padding: 2px 8px; border-radius: 20px; }
.badge-error   { background: #2A0C0A; color: #D8332C; font-size: 11px; padding: 2px 8px; border-radius: 20px; }
.badge-info    { background: #221A14; color: #BCAE9C; font-size: 11px; padding: 2px 8px; border-radius: 20px; }
```

---

## CLI output conventions

The KAIROS framework emits structured CLI output. Use the `logger` utility in `@kairos-sui/core`:

```typescript
import { logger } from '@kairos-sui/core';

logger.info('Agent "Atlas" booted');        // → [KAIROS] Agent "Atlas" booted
logger.action('TRANSFER_SUI executing...');  // → [ACTION] TRANSFER_SUI executing...
logger.success('TX confirmed: abc123...');   // → [✓] TX confirmed: abc123...
logger.warn('Balance below 0.1 SUI');        // → [!] Balance below 0.1 SUI
logger.error('Walrus store failed', err);    // → [✗] Walrus store failed
```

Colours in the terminal. The brand crimson and gold appear on the two KAIROS prefixes; the level marks keep their conventional ANSI meanings so logs stay scannable:
- `[KAIROS]` prefix: gold (`\x1b[93m`)
- `[ACTION]` prefix: crimson (`\x1b[91m`)
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

- **Background:** `#16110E` always
- **Title slides:** wordmark top-left, hero text in bone with one crimson word, single bold claim per slide
- **Code slides:** full-bleed code block, dark background, syntax highlighting as above. Never screenshot VS Code — use the KAIROS code block style.
- **Demo GIF:** record at 2× speed, no cursor effects, terminal only. Clean `zsh` or `fish` prompt.
- **Max 12 slides:** Problem → Solution → How it works → Demo → Architecture → Traction → Ask
- **No bullet points longer than 8 words.** One idea per slide.

---

## Naming conventions

| Thing | Convention | Example |
|---|---|---|
| npm package | `@kairos-sui/name` | `@kairos-sui/plugin-sui` |
| Action names | `SCREAMING_SNAKE_CASE` | `TRANSFER_SUI` |
| Plugin names | `kebab-case` | `plugin-walrus` |
| Classes | `PascalCase` | `AgentRuntime` |
| Files | `kebab-case.ts` | `memory-store.ts` |
| Environment vars | `SCREAMING_SNAKE_CASE` | `SUI_PRIVATE_KEY` |
| Character names | Title case proper noun | `Atlas`, `Sentinel`, `Oracle` |
