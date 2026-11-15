import {
  createCalendar,
  type AttributeValue,
  type CalendarOptions,
  type ElementProps,
  type SelectionMode,
} from '@calendrix/core';
import { onScopeDispose, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue';

/** `aria-*` and `data-*` attributes keep a boolean as text ("true"); others are present or absent. */
const TEXT_ATTRIBUTE = /^(aria|data)-/;

/**
 * Turns what a prop getter of the core returns (`{ attrs, handlers }`) into one object for
 * `v-bind`: Vue treats keys like `onClick` as event listeners.
 */
export function vueProps(
  props: ElementProps<object>,
  withHandlers = true,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(props.attrs as Record<string, AttributeValue>)) {
    const asText = TEXT_ATTRIBUTE.test(name);
    if (value === undefined || (value === false && !asText)) continue;
    result[name] = value === true && !asText ? '' : String(value);
  }
  if (!withHandlers) return result;
  for (const [name, handler] of Object.entries(props.handlers as Record<string, unknown>)) {
    if (typeof handler === 'function') {
      result[`on${name.charAt(0).toUpperCase()}${name.slice(1)}`] = handler;
    }
  }
  return result;
}


/**
 * Creates the core once (`setup` runs when the inputs are known), keeps the snapshot of
 * `getState()` in a ref, and passes later changes of the options to `setOptions`.
 */
export function useCalendar<M extends SelectionMode = 'single'>(
  options: MaybeRefOrGetter<Partial<CalendarOptions<M>>>,
) {
  const read = () => toValue(options);
  const calendar = createCalendar<M>(read());
  const state = shallowRef(calendar.getState());

  const unsubscribe = calendar.subscribe(() => {
    state.value = calendar.getState();
  });
  watch(read, (next) => calendar.setOptions(next));

  onScopeDispose(() => {
    unsubscribe();
    calendar.destroy();
  });

  return { calendar, state };
}