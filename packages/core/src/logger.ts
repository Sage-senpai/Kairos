/**
 * Structured CLI logger. The single sanctioned console sink in the framework -
 * production code logs through this, never `console.log` directly.
 *
 * Prefix colours follow the KAIROS design system (see DESIGN.md):
 *   [KAIROS] violet · [ACTION] teal · [✓] green · [!] amber · [✗] red
 */
const C = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  violet: '\x1b[35m',
  teal: '\x1b[36m',
  green: '\x1b[32m',
  amber: '\x1b[33m',
  red: '\x1b[31m',
} as const;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

function currentLevel(): LogLevel {
  const env = (process.env.LOG_LEVEL ?? 'info').toLowerCase();
  return env in LEVEL_ORDER ? (env as LogLevel) : 'info';
}

function enabled(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel()];
}

export const logger = {
  /** Framework lifecycle messages. */
  info(message: string): void {
    if (enabled('info')) console.log(`${C.violet}[KAIROS]${C.reset} ${message}`);
  },
  /** An action is executing. */
  action(message: string): void {
    if (enabled('info')) console.log(`${C.teal}[ACTION]${C.reset} ${message}`);
  },
  /** Something succeeded (e.g. a confirmed transaction). */
  success(message: string): void {
    if (enabled('info')) console.log(`${C.green}[✓]${C.reset} ${message}`);
  },
  /** A recoverable concern. */
  warn(message: string): void {
    if (enabled('warn')) console.warn(`${C.amber}[!]${C.reset} ${message}`);
  },
  /** A failure. */
  error(message: string, err?: unknown): void {
    if (enabled('error')) {
      if (err === undefined) console.error(`${C.red}[✗]${C.reset} ${message}`);
      else console.error(`${C.red}[✗]${C.reset} ${message}`, err);
    }
  },
  /** Verbose diagnostics, shown only when LOG_LEVEL=debug. */
  debug(message: string): void {
    if (enabled('debug')) console.log(`${C.dim}[debug] ${message}${C.reset}`);
  },
};
