import { useEffect, useLayoutEffect } from 'react';

/** `useLayoutEffect` in the browser, `useEffect` on the server (where layout effects only warn). */
export const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

type Callback = (...args: unknown[]) => unknown;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** Equal by content for arrays and plain objects (dates, ranges, plugin lists), otherwise `Object.is`. */
export function isSameValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => isSameValue(item, b[index]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = Object.keys(a);
    return (
      keys.length === Object.keys(b).length && keys.every((key) => isSameValue(a[key], b[key]))
    );
  }
  return false;
}

/**
 * React code makes new callbacks, dates and arrays on every render, but the core only wants to
 * hear about real changes. The stabilizer returns options where
 * - every function is replaced by one permanent function that calls the latest one, and
 * - a value equal in content to the previous one keeps its previous identity.
 * An option that disappears is reported as `undefined`, so the core can reset it.
 */
export function createOptionsStabilizer<T extends object>(initial: T) {
  let latest = initial;
  let previous: Record<string, unknown> | undefined;
  const proxies: Record<string, Callback> = {};

  return {
    stabilize(next: T): T {
      latest = next;
      const source = next as Record<string, unknown>;
      const result: Record<string, unknown> = {};

      for (const key of Object.keys(source)) {
        const value = source[key];
        if (typeof value === 'function') {
          proxies[key] ??= (...args) =>
            (latest as unknown as Record<string, Callback | undefined>)[key]?.(...args);
          result[key] = proxies[key];
        } else if (previous && isSameValue(previous[key], value)) {
          result[key] = previous[key];
        } else {
          result[key] = value;
        }
      }

      if (previous) {
        for (const key of Object.keys(previous)) {
          if (!(key in result)) result[key] = undefined;
        }
      }

      previous = result;
      return result as T;
    },
  };
}
