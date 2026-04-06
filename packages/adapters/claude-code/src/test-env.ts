import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { AdapterEnvironmentTestResult } from '@cco/adapter-utils';

const execFileAsync = promisify(execFile);

export async function testClaudeEnvironment(
  config: Record<string, unknown>,
): Promise<AdapterEnvironmentTestResult> {
  const command = (config.command as string) ?? 'claude';

  try {
    const { stdout } = await execFileAsync(command, ['--version'], { timeout: 10_000 });
    return {
      ok: true,
      details: { version: stdout.trim(), command },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      ok: false,
      error: `Claude CLI not found or not accessible: ${message}`,
      details: { command },
    };
  }
}
