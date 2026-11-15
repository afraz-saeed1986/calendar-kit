import type { AttributeValue } from './types';

/** `aria-*` and `data-*` attributes keep a boolean as text ("true", "false"). */
const TEXT_ATTRIBUTE = /^(aria|data)-/;

/**
 * Turns the `attrs` of a prop getter into the strings to write on an element. `undefined` is
 * left off. In `aria-*` and `data-*` attributes a boolean is written as text; in any other
 * attribute `true` is present with an empty value and `false` is left off. Numbers become text.
 * Adapters for frameworks that do not do this themselves use it (React DOM does).
 */
export function normalizeAttributes(attrs: Record<string, AttributeValue>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [name, value] of Object.entries(attrs)) {
    const asText = TEXT_ATTRIBUTE.test(name);
    if (value === undefined || (value === false && !asText)) continue;
    result[name] = value === true && !asText ? '' : String(value);
  }
  return result;
}