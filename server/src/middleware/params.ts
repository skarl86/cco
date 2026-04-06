/**
 * Helper to safely extract a string param from Express 5 route params.
 * Express 5 types params as `string | string[]`; route params are always strings.
 */

import type { Request } from 'express';

export function param(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? val[0] : val;
}
