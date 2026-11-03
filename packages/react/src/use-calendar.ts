import {
  createCalendar,
  type Calendar,
  type CalendarOptions,
  type CalendarState,
} from '@calendrix/core';
import { useState, useSyncExternalStore } from 'react';
import { createOptionsStabilizer, useIsomorphicLayoutEffect } from './stable-options';

export interface UseCalendarResult {
  /** The store: navigation methods, `select`, `handleKeyDown` and the prop getters. */
  calendar: Calendar;
  /** The current state. A new object only when something changed. */
  state: CalendarState;
}

/**
 * A calendar for a React component. Pass the same options as `createCalendar`; options may be
 * written inline on every render (callbacks, dates, plugin lists), the hook keeps them stable.
 *
 * On the server "today" comes from the server's clock; pass `now` and `timeZone` if the
 * server and the browser must agree.
 */
export function useCalendar(options: CalendarOptions = {}): UseCalendarResult {
  const [store] = useState(() => {
    const stabilizer = createOptionsStabilizer(options);
    const calendar = createCalendar(stabilizer.stabilize(options));
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
