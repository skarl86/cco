import { describe, it, expect } from 'vitest';
import { parseClaudeStreamJson, detectLoginRequired, isMaxTurnsResult } from './parse.js';

const SAMPLE_STREAM = [
  '{"type":"system","subtype":"init","session_id":"abc-123","model":"claude-sonnet-4-6","tools":[],"mcp_servers":[]}',
  '{"type":"assistant","message":{"content":[{"type":"text","text":"Hello! How can I help you?"}]}}',
  '{"type":"result","subtype":"success","result":"Hello! How can I help you?","session_id":"abc-123","total_cost_usd":0.003,"usage":{"input_tokens":150,"cache_read_input_tokens":50,"output_tokens":20}}',
].join('\n');

const STREAM_WITH_TOOL_USE = [
  '{"type":"system","subtype":"init","session_id":"sess-456","model":"claude-opus-4-6","tools":["Read","Write"],"mcp_servers":[]}',
  '{"type":"assistant","message":{"content":[{"type":"text","text":"Let me read the file."}]}}',
  '{"type":"assistant","message":{"content":[{"type":"tool_use","id":"tool_1","name":"Read","input":{"file_path":"/tmp/test.ts"}}]}}',
  '{"type":"tool_result","tool_use_id":"tool_1","content":"file content here"}',
  '{"type":"assistant","message":{"content":[{"type":"text","text":"The file contains test code."}]}}',
  '{"type":"result","subtype":"success","result":"The file contains test code.","session_id":"sess-456","total_cost_usd":0.015,"usage":{"input_tokens":500,"cache_read_input_tokens":200,"output_tokens":100}}',
].join('\n');

describe('parseClaudeStreamJson', () => {
  it('extracts sessionId from system init event', () => {
    const result = parseClaudeStreamJson(SAMPLE_STREAM);
    expect(result.sessionId).toBe('abc-123');
  });

  it('extracts model from system init event', () => {
    const result = parseClaudeStreamJson(SAMPLE_STREAM);
    expect(result.model).toBe('claude-sonnet-4-6');
  });

  it('extracts usage tokens from result event', () => {
    const result = parseClaudeStreamJson(SAMPLE_STREAM);
    expect(result.usage).toEqual({
      inputTokens: 150,
      cachedInputTokens: 50,
      outputTokens: 20,
    });
  });

  it('extracts costUsd from result event', () => {
    const result = parseClaudeStreamJson(SAMPLE_STREAM);
    expect(result.costUsd).toBe(0.003);
  });

  it('extracts summary text from assistant messages', () => {
    const result = parseClaudeStreamJson(SAMPLE_STREAM);
    expect(result.summary).toContain('Hello');
  });

  it('handles stream with tool use', () => {
    const result = parseClaudeStreamJson(STREAM_WITH_TOOL_USE);
    expect(result.sessionId).toBe('sess-456');
    expect(result.model).toBe('claude-opus-4-6');
    expect(result.usage?.inputTokens).toBe(500);
    expect(result.costUsd).toBe(0.015);
  });

  it('handles empty output', () => {
    const result = parseClaudeStreamJson('');
    expect(result.sessionId).toBeNull();
    expect(result.usage).toBeNull();
    expect(result.costUsd).toBe(0);
  });

  it('handles malformed JSON lines gracefully', () => {
    const badStream = 'not json\n{"type":"system","subtype":"init","session_id":"x","model":"m"}\n{broken';
    const result = parseClaudeStreamJson(badStream);
    expect(result.sessionId).toBe('x');
  });
});

describe('detectLoginRequired', () => {
  it('detects login requirement', () => {
    expect(detectLoginRequired('Error: not logged in')).toBe(true);
    expect(detectLoginRequired('please log in to continue')).toBe(true);
    expect(detectLoginRequired('unauthorized access')).toBe(true);
  });

  it('returns false for normal output', () => {
    expect(detectLoginRequired('Hello, I can help you.')).toBe(false);
  });
});

describe('isMaxTurnsResult', () => {
  it('detects max turns subtype', () => {
    const event = { type: 'result', subtype: 'max_turns' };
    expect(isMaxTurnsResult(event)).toBe(true);
  });

  it('returns false for success', () => {
    const event = { type: 'result', subtype: 'success' };
    expect(isMaxTurnsResult(event)).toBe(false);
  });
});
