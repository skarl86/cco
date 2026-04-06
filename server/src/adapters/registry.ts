import type { ServerAdapterModule } from '@cco/adapter-utils';

export class AdapterRegistry {
  private readonly adapters = new Map<string, ServerAdapterModule>();

  register(adapter: ServerAdapterModule): void {
    this.adapters.set(adapter.type, adapter);
  }

  get(type: string): ServerAdapterModule | undefined {
    return this.adapters.get(type);
  }

  has(type: string): boolean {
    return this.adapters.has(type);
  }

  listTypes(): string[] {
    return Array.from(this.adapters.keys());
  }
}
