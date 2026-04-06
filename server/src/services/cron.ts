/**
 * Minimal cron expression parser (5-field: minute hour dom month dow).
 * Supports: numbers, ranges (1-5), steps (star/5), lists (1,3,5), wildcards (star).
 */

export interface ParsedCron {
  readonly minutes: readonly number[];
  readonly hours: readonly number[];
  readonly daysOfMonth: readonly number[];
  readonly months: readonly number[];
  readonly daysOfWeek: readonly number[];
}

function parseField(field: string, min: number, max: number): readonly number[] {
  const values = new Set<number>();

  for (const part of field.split(',')) {
    const stepMatch = part.match(/^(.+)\/(\d+)$/);
    const step = stepMatch ? parseInt(stepMatch[2], 10) : 1;
    const range = stepMatch ? stepMatch[1] : part;

    if (range === '*') {
      for (let i = min; i <= max; i += step) {
        values.add(i);
      }
    } else {
      const rangeMatch = range.match(/^(\d+)-(\d+)$/);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);
        for (let i = start; i <= end; i += step) {
          if (i >= min && i <= max) values.add(i);
        }
      } else {
        const val = parseInt(range, 10);
        if (!isNaN(val) && val >= min && val <= max) {
          values.add(val);
        }
      }
    }
  }

  return [...values].sort((a, b) => a - b);
}

/** Parse a 5-field cron expression. Returns null on invalid input. */
export function parseCron(expression: string): ParsedCron | null {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) return null;

  const minutes = parseField(fields[0], 0, 59);
  const hours = parseField(fields[1], 0, 23);
  const daysOfMonth = parseField(fields[2], 1, 31);
  const months = parseField(fields[3], 1, 12);
  const daysOfWeek = parseField(fields[4], 0, 6);

  if (minutes.length === 0 || hours.length === 0 || daysOfMonth.length === 0 ||
      months.length === 0 || daysOfWeek.length === 0) {
    return null;
  }

  return { minutes, hours, daysOfMonth, months, daysOfWeek };
}

/** Validate a cron expression. Returns error message or null if valid. */
export function validateCron(expression: string): string | null {
  if (!expression || typeof expression !== 'string') {
    return 'Cron expression is required';
  }
  const parsed = parseCron(expression);
  if (!parsed) {
    return `Invalid cron expression: "${expression}". Expected 5 fields: minute hour day-of-month month day-of-week`;
  }
  return null;
}

/** Calculate the next tick time after `afterDate` for a parsed cron expression. */
export function nextCronTick(parsed: ParsedCron, afterDate: Date): Date | null {
  // Start from the next minute
  const next = new Date(afterDate);
  next.setSeconds(0, 0);
  next.setMinutes(next.getMinutes() + 1);

  // Search up to 1 year ahead
  const maxIterations = 525600; // ~1 year in minutes
  for (let i = 0; i < maxIterations; i++) {
    const month = next.getMonth() + 1; // 1-based
    const dom = next.getDate();
    const dow = next.getDay();
    const hour = next.getHours();
    const minute = next.getMinutes();

    if (
      parsed.months.includes(month) &&
      parsed.daysOfMonth.includes(dom) &&
      parsed.daysOfWeek.includes(dow) &&
      parsed.hours.includes(hour) &&
      parsed.minutes.includes(minute)
    ) {
      return next;
    }

    next.setMinutes(next.getMinutes() + 1);
  }

  return null;
}

/** Check if a cron expression matches the given date (to the minute). */
export function cronMatches(parsed: ParsedCron, date: Date): boolean {
  return (
    parsed.months.includes(date.getMonth() + 1) &&
    parsed.daysOfMonth.includes(date.getDate()) &&
    parsed.daysOfWeek.includes(date.getDay()) &&
    parsed.hours.includes(date.getHours()) &&
    parsed.minutes.includes(date.getMinutes())
  );
}
