import {
  createCalendar,
  type Calendar,
  type CalendarOptions,
  type CalendarState,
  type SelectionMode,
} from '@calendrix/core';
import {
  onScopeDispose,
  shallowRef,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type ShallowRef,
} from 'vue';

export interface UseCalendarResult<M extends SelectionMode = 'single'> {
  /** The store: navigation methods, `select`, `handleKeyDown` and the prop getters. */
  calendar: Calendar<M>;
  /** The current state. A new object only when something changed. */
  state: Readonly<ShallowRef<CalendarState<M>>>;
}

/**
 * A calendar for a Vue component. Pass the same options as `createCalendar`, as a getter (or a
 * ref): later changes go to `setOptions`. The core is created once, when `setup` runs and the
 * inputs are known. An option that is `undefined` means "not set", so a prop that goes back to
 * `undefined` is cleared. The selection mode picks one day (default), a range or many days.
 *
 * On the server "today" comes from the server's clock; pass `now` and `timeZone` if the server
 * and the browser must agree.
 */
export function useCalendar<M extends SelectionMode = 'single'>(
  options: MaybeRefOrGetter<Partial<CalendarOptions<M>>>,
): UseCalendarResult<M> {
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
