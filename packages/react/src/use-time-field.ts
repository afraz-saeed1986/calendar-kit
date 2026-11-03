import {
  createTimeField,
  type TimeField,
  type TimeFieldOptions,
  type TimeFieldState,
} from '@calendrix/core';
import { useState, useSyncExternalStore } from 'react';
import { createOptionsStabilizer, useIsomorphicLayoutEffect } from './stable-options';

export interface UseTimeFieldResult {
  /** The store: `increment`, `clear`, `handleKeyDown` and the prop getters. */
  field: TimeField;
  /** The current state. A new object only when something changed. */
  state: TimeFieldState;
}

/**
 * A time input for a React component. Pass the same options as `createTimeField`; options may
 * be written inline on every render, the hook keeps them stable.
 */
export function useTimeField(options: TimeFieldOptions = {}): UseTimeFieldResult {
  const [store] = useState(() => {
    const stabilizer = createOptionsStabilizer(options);
    const field = createTimeField(stabilizer.stabilize(options));
    return {
      field,
      stabilizer,
      subscribe: (listener: () => void) => field.subscribe(listener),
      getSnapshot: () => field.getState(),
    };
  });

  useIsomorphicLayoutEffect(() => {
    store.field.setOptions(store.stabilizer.stabilize(options));
  });

  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return { field: store.field, state };
}
