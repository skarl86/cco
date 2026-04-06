const ESC = '\x1b[';
const RESET = `${ESC}0m`;
const GREEN = `${ESC}32m`;
const YELLOW = `${ESC}33m`;
const RED = `${ESC}31m`;
const DIM = `${ESC}2m`;
const BOLD = `${ESC}1m`;

function write(msg: string): void {
  process.stdout.write(`${msg}\n`);
}

function writeErr(msg: string): void {
  process.stderr.write(`${msg}\n`);
}

export function json(data: unknown): void {
  write(JSON.stringify(data, null, 2));
}

export function ok(msg: string): void {
  write(`${GREEN}\u2714${RESET} ${msg}`);
}

export function warn(msg: string): void {
  writeErr(`${YELLOW}\u26A0${RESET} ${msg}`);
}

export function fail(msg: string): void {
  writeErr(`${RED}\u2718${RESET} ${msg}`);
}

export function table(rows: Record<string, unknown>[], columns?: string[]): void {
  if (rows.length === 0) {
    write('(no results)');
    return;
  }

  const cols = columns ?? Object.keys(rows[0]);
  const widths = new Map<string, number>();

  for (const col of cols) {
    widths.set(col, col.length);
  }

  const stringRows = rows.map((row) => {
    const out: Record<string, string> = {};
    for (const col of cols) {
      const val = row[col] == null ? '-' : String(row[col]);
      out[col] = val;
      const current = widths.get(col) ?? 0;
      if (val.length > current) {
        widths.set(col, val.length);
      }
    }
    return out;
  });

  const header = cols.map((c) => `${BOLD}${c.toUpperCase().padEnd(widths.get(c) ?? 0)}${RESET}`).join('  ');
  write(header);

  const separator = cols.map((c) => `${DIM}${'-'.repeat(widths.get(c) ?? 0)}${RESET}`).join('  ');
  write(separator);

  for (const row of stringRows) {
    const line = cols.map((c) => row[c].padEnd(widths.get(c) ?? 0)).join('  ');
    write(line);
  }
}

export function handleError(err: unknown): never {
  const message = err instanceof Error ? err.message : 'Unknown error';
  fail(message);
  process.exit(1);
}
