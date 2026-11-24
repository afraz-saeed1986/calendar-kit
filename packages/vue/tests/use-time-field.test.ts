import { describe, expect, it } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { useTimeField } from '../src/use-time-field';
import type { TimeFieldOptions } from '@calendrix/core';

function setup(options?: Parameters<typeof useTimeField>[0]) {
  const scope = effectScope();
  const result = scope.run(() => useTimeField(options));
  if (!result) throw new Error('The scope did not run');
  return { scope, ...result };
}

describe('useTimeField', () => {
  it('keeps the state in sync with the core', () => {
    const { scope, field, state } = setup({ defaultValue: { hour: 9, minute: 30, second: 0 } });
    expect(state.value.segments.find((s) => s.type === 'hour')?.text).toBe('09');
    field.increment('hour', 1);
    expect(state.value.segments.find((s) => s.type === 'hour')?.text).toBe('10');
    scope.stop();
  });

  it('passes a changed option to the core', async () => {
    const showSeconds = ref(false);
    const { scope, state } = setup(() => ({
      hourCycle: 24,
      showSeconds: showSeconds.value,
    }));
    expect(state.value.segments.map((s) => s.type)).toEqual(['hour', 'minute']);

    showSeconds.value = true;
    await nextTick();
    expect(state.value.segments.map((s) => s.type)).toEqual(['hour', 'minute', 'second']);
    scope.stop();
  });

  it('clears an option that goes back to undefined', async () => {
    const maxTime = ref<TimeFieldOptions['maxTime']>({ hour: 10, minute: 0, second: 0 });
    const { scope, field, state } = setup(() => ({
      hourCycle: 24,
      defaultValue: { hour: 10, minute: 0, second: 0 },
      maxTime: maxTime.value,
    }));
    field.increment('hour', 1);
    expect(state.value.segments[0]?.text).toBe('10');

    maxTime.value = undefined;
    await nextTick();
    field.increment('hour', 1);
    expect(state.value.segments[0]?.text).toBe('11');
    scope.stop();
  });

  it('stops following the core when the scope stops', () => {
    const { scope, field, state } = setup({ defaultValue: { hour: 9, minute: 0, second: 0 } });
    scope.stop();
    const before = state.value;
    field.increment('hour', 1);
    expect(state.value).toBe(before);
  });
});
