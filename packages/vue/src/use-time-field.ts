import {
  createTimeField,
  type TimeField,
  type TimeFieldOptions,
  type TimeFieldState,
} from '@calendrix/core';
import {
  onScopeDispose,
  shallowRef,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type ShallowRef,
} from 'vue';

export interface UseTimeFieldResult {
  /** The store: `increment`, `clear`, `handleKeyDown` and the prop getters. */
  field: TimeField;
  /** The current state. A new object only when something changed. */
  state: Readonly<ShallowRef<TimeFieldState>>;
}

/**
 * A time input for a Vue component. Pass the same options as `createTimeField`, as a getter (or
 * a ref): later changes go to `setOptions`. An option that is `undefined` means "not set", so a
 * prop that goes back to `undefined` is cleared.
 */
export function useTimeField(options: MaybeRefOrGetter<TimeFieldOptions> = {}): UseTimeFieldResult {
  const read = () => toValue(options);
  const field = createTimeField(read());
  const state = shallowRef(field.getState());

  const unsubscribe = field.subscribe(() => {
    state.value = field.getState();
  });
  watch(read, (next) => field.setOptions(next));

  onScopeDispose(unsubscribe);
  onScopeDispose(() => field.destroy());

  return { field, state };
}
