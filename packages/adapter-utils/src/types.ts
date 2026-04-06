export interface AdapterAgent {
  readonly id: string;
  readonly teamId: string;
  readonly name: string;
  readonly role: string;
  readonly adapterType: string;
  readonly adapterConfig: Record<string, unknown>;
}

export interface AdapterRuntime {
  readonly sessionId: string | null;
  readonly sessionParams: Record<string, unknown> | null;
}

export interface AdapterInvocationMeta {
  readonly provider?: string;
  readonly model?: string;
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly cachedInputTokens?: number;
}

export interface AdapterExecutionContext {
  readonly runId: string;
  readonly agent: AdapterAgent;
  readonly runtime: AdapterRuntime;
  readonly config: Record<string, unknown>;
  readonly context: Record<string, unknown>;
  readonly workingDirectory?: string;
  onLog(stream: 'stdout' | 'stderr', chunk: string): Promise<void>;
  onMeta?(meta: AdapterInvocationMeta): Promise<void>;
  onSpawn?(meta: { pid: number; startedAt: string }): Promise<void>;
}

export interface AdapterExecutionResult {
  readonly exitCode: number | null;
  readonly signal: string | null;
  readonly timedOut: boolean;
  readonly errorMessage?: string | null;
  readonly usage?: {
    readonly inputTokens: number;
    readonly outputTokens: number;
    readonly cachedInputTokens?: number;
  };
  readonly sessionId?: string | null;
  readonly sessionParams?: Record<string, unknown> | null;
  readonly provider?: string | null;
  readonly model?: string | null;
  readonly billingType?: 'api' | 'subscription';
  readonly costUsd?: number | null;
  readonly resultJson?: Record<string, unknown> | null;
  readonly summary?: string | null;
}

export interface AdapterEnvironmentTestResult {
  readonly ok: boolean;
  readonly error?: string;
  readonly details?: Record<string, unknown>;
}

export interface AdapterSessionCodec {
  encode(session: unknown): string;
  decode(data: string): unknown;
}

export interface ServerAdapterModule {
  readonly type: string;
  execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult>;
  testEnvironment(ctx: { config: Record<string, unknown> }): Promise<AdapterEnvironmentTestResult>;
  sessionCodec?: AdapterSessionCodec;
  models?: ReadonlyArray<{ id: string; label: string }>;
}
