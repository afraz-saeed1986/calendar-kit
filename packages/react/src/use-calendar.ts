import {
  createCalendar,
  type Calendar,
  type CalendarOptions,
  type CalendarState,
  type SelectionMode,
} from '@calendrix/core';
import { useState, useSyncExternalStore } from 'react';
import { createOptionsStabilizer, useIsomorphicLayoutEffect } from './stable-options';

export interface UseCalendarResult<M extends SelectionMode = 'single'> {
  /** The store: navigation methods, `select`, `handleKeyDown` and the prop getters. */
  calendar: Calendar<M>;
  /** The current state. A new object only when something changed. */
  state: CalendarState<M>;
}

/**
 * A calendar for a React component. Pass the same options as `createCalendar`; options may be
 * written inline on every render (callbacks, dates, plugin lists), the hook keeps them stable.
 * The `selection` option picks one day (default), a range or any number of days, and the type of
 * `value` and `onChange` follows it.
 *
 * On the server "today" comes from the server's clock; pass `now` and `timeZone` if the
 * server and the browser must agree.
 */
export function useCalendar<M extends SelectionMode = 'single'>(
  options: CalendarOptions<M> = {},
): UseCalendarResult<M> {
  const [store] = useState(() => {
    const stabilizer = createOptionsStabilizer(options);
    const calendar = createCalendar<M>(stabilizer.stabilize(options));
    return {
      calendar,
      stabilizer,
      subscribe: (listener: () => void) => calendar.subscribe(listener),
      getSnapshot: () => calendar.getState(),
    };
  });

  // In a layout effect, not during render: updating the store notifies subscribers, and that
  // must not happen while React is rendering. It runs before the browser paints.
  useIsomorphicLayoutEffect(() => {
    store.calendar.setOptions(store.stabilizer.stabilize(options));
  });

  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return { calendar: store.calendar, state };
}
