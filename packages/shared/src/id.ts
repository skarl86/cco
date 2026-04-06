import { nanoid } from 'nanoid';

export function generateId(prefix?: string): string {
  const id = nanoid();
  return prefix ? `${prefix}_${id}` : id;
}
