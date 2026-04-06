import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { AdapterEnvironmentTestResult } from '@cco/adapter-utils';

const execFileAsync = promisify(execFile);

export async function testGeminiEnvironment(
  config: Record<string, unknown>,
): Promise<AdapterEnvironmentTestResult> {
  const command = (config.command as string) ?? 'gemini';

  try {
    const { stdout } = await execFileAsync('which', [command], { timeout: 10_000 });
    return {
      ok: true,
      details: { path: stdout.trim(), command },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      ok: false,
      error: `Gemini CLI not found or not accessible: ${message}`,
      details: { command },
    };
  }
}
