/** The options the user set: an input that was not set must not reach the core as `undefined`. */
export function definedOnly<T>(options: Record<string, unknown>): T {
  return Object.fromEntries(Object.entries(options).filter(([, value]) => value !== undefined)) as T;
}
