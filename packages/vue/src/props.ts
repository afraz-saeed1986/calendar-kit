import { normalizeAttributes, type ElementProps } from '@calendrix/core';

/**
 * Turns what a prop getter of the core returns (`{ attrs, handlers }`) into one object for
 * `v-bind`: Vue treats keys like `onClick` as event listeners. Pass `withHandlers = false` to
 * apply only the attributes, when the component handles the events itself.
 */
export function toVueProps(
  props: ElementProps<object>,
  withHandlers = true,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...normalizeAttributes(props.attrs) };
  if (!withHandlers) return result;
  for (const [name, handler] of Object.entries(props.handlers as Record<string, unknown>)) {
    if (typeof handler === 'function') {
      result[`on${name.charAt(0).toUpperCase()}${name.slice(1)}`] = handler;
    }
  }
  return result;
}
