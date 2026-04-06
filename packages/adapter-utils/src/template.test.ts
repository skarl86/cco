import { describe, it, expect } from 'vitest';
import { renderPromptTemplate } from './template.js';

describe('renderPromptTemplate', () => {
  it('replaces simple variables', () => {
    const result = renderPromptTemplate(
      'Hello {{name}}, your role is {{role}}.',
      { name: 'Alice', role: 'architect' },
    );
    expect(result).toBe('Hello Alice, your role is architect.');
  });

  it('handles missing variables gracefully', () => {
    const result = renderPromptTemplate(
      'Agent: {{name}}, Task: {{taskTitle}}',
      { name: 'Bot' },
    );
    expect(result).toBe('Agent: Bot, Task: ');
  });

  it('handles empty template', () => {
    expect(renderPromptTemplate('', {})).toBe('');
  });

  it('handles template with no variables', () => {
    expect(renderPromptTemplate('No vars here', { foo: 'bar' })).toBe('No vars here');
  });

  it('replaces multiple occurrences', () => {
    const result = renderPromptTemplate(
      '{{x}} and {{x}} again',
      { x: 'hello' },
    );
    expect(result).toBe('hello and hello again');
  });
});
