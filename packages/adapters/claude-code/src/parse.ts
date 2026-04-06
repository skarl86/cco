export interface ParsedStreamResult {
  readonly sessionId: string | null;
  readonly model: string | null;
  readonly costUsd: number;
  readonly usage: {
    readonly inputTokens: number;
    readonly cachedInputTokens: number;
    readonly outputTokens: number;
  } | null;
  readonly summary: string | null;
}

function tryParseJson(line: string): Record<string, unknown> | null {
  try {
    return JSON.parse(line) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' ? value : fallback;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export function parseClaudeStreamJson(stdout: string): ParsedStreamResult {
  let sessionId: string | null = null;
  let model: string | null = null;
  let costUsd = 0;
  let usage: ParsedStreamResult['usage'] = null;
  const assistantTexts: string[] = [];

  for (const rawLine of stdout.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const event = tryParseJson(line);
    if (!event) continue;

    const type = asString(event.type);
    const subtype = asString(event.subtype);

    if (type === 'system' && subtype === 'init') {
      sessionId = asString(event.session_id) ?? sessionId;
      model = asString(event.model) ?? model;
    }

    if (type === 'assistant') {
      const message = event.message as Record<string, unknown> | undefined;
      const content = message?.content as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === 'text' && typeof block.text === 'string') {
            assistantTexts.push(block.text);
          }
        }
      }
    }

    if (type === 'result') {
      sessionId = asString(event.session_id) ?? sessionId;
      costUsd = asNumber(event.total_cost_usd, costUsd);

      const usageObj = event.usage as Record<string, unknown> | undefined;
      if (usageObj) {
        usage = {
          inputTokens: asNumber(usageObj.input_tokens, 0),
          cachedInputTokens: asNumber(usageObj.cache_read_input_tokens, 0),
          outputTokens: asNumber(usageObj.output_tokens, 0),
        };
      }

      if (!assistantTexts.length && typeof event.result === 'string') {
        assistantTexts.push(event.result);
      }
    }
  }

  return {
    sessionId,
    model,
    costUsd,
    usage,
    summary: assistantTexts.length > 0 ? assistantTexts.join('\n') : null,
  };
}

const LOGIN_PATTERNS = /not logged in|please log in|unauthorized/i;

export function detectLoginRequired(output: string): boolean {
  return LOGIN_PATTERNS.test(output);
}

export function isMaxTurnsResult(event: Record<string, unknown>): boolean {
  return event.type === 'result' && event.subtype === 'max_turns';
}
