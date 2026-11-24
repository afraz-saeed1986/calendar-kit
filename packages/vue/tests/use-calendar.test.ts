import type { CalendarDate } from '@calendrix/core';
import { describe, expect, it } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { useCalendar } from '../src/use-calendar';

const now = () => new Date(2026, 9, 14);

function setup(options: Parameters<typeof useCalendar>[0]) {
  const scope = effectScope();
  const result = scope.run(() => useCalendar(options));
  if (!result) throw new Error('The scope did not run');
  return { scope, ...result };
}

describe('useCalendar', () => {
  it('keeps the state in sync with the core', () => {
    const { scope, calendar, state } = setup({ now });
    expect(state.value.monthName).toBe('October');
    calendar.nextMonth();
    expect(state.value.monthName).toBe('November');
    scope.stop();
  });

  it('passes a changed option to the core', async () => {
    const locale = ref('en-US');
    const { scope, state } = setup(() => ({ now, locale: locale.value }));
    expect(state.value.monthName).toBe('October');

    locale.value = 'de-DE';
    await nextTick();
    expect(state.value.monthName).toBe('Oktober');
    scope.stop();
  });

  it('clears an option that goes back to undefined', async () => {
    const minDate = ref<CalendarDate | undefined>({
      system: 'gregory',
      year: 2026,
      month: 10,
      day: 10,
    });
    const { scope, state } = setup(() => ({ now, minDate: minDate.value }));
    const day = (n: number) =>
      state.value.weeks.flat().find((cell) => !cell.isOutsideMonth && cell.date.day === n);
    expect(day(5)?.isDisabled).toBe(true);

    minDate.value = undefined;
    await nextTick();
    expect(day(5)?.isDisabled).toBe(false);
    scope.stop();
  });

  it('stops following the core when the scope stops', () => {
    const { scope, calendar, state } = setup({ now });
    scope.stop();
    const before = state.value;
    calendar.nextMonth();
    expect(state.value).toBe(before);
  });
});
