import {
  createCalendar,
  normalizeAttributes,
  type CalendarOptions,
  type ElementProps,
  type SelectionMode,
} from '@calendrix/core';
import { onScopeDispose, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue';

/**
 * Turns what a prop getter of the core returns (`{ attrs, handlers }`) into one object for
 * `v-bind`: Vue treats keys like `onClick` as event listeners.
 */
export function vueProps(
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

/**
 * Creates the core once (`setup` runs when the inputs are known), keeps the snapshot of
 * `getState()` in a ref, and passes later changes of the options to `setOptions`. An option that
 * is `undefined` means "not set" in the core, so the options are passed as they are.
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