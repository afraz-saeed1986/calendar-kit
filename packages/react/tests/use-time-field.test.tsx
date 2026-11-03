import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useTimeField } from '../src';

afterEach(cleanup);

const texts = (state: { segments: ReadonlyArray<{ text: string }> }) =>
  state.segments.map((segment) => segment.text);

describe('useTimeField', () => {
  it('returns the state of the field', () => {
    const { result } = renderHook(() =>
      useTimeField({ locale: 'de-DE', defaultValue: { hour: 9, minute: 5, second: 0 } }),
    );
    expect(texts(result.current.state)).toEqual(['09', '05']);
  });

  it('re-renders when the field changes', () => {
    const { result } = renderHook(() =>
      useTimeField({ locale: 'de-DE', defaultValue: { hour: 9, minute: 5, second: 0 } }),
    );
    act(() => result.current.field.increment('hour', 1));
    expect(texts(result.current.state)).toEqual(['10', '05']);
  });

  it('keeps the same field and the same state between unchanged renders', () => {
    const { result, rerender } = renderHook(() => useTimeField({ locale: 'de-DE' }));
    const { field, state } = result.current;
    rerender();
    expect(result.current.field).toBe(field);
    expect(result.current.state).toBe(state);
  });

  it('does not loop when options are written inline', () => {
    let renders = 0;
    renderHook(() => {
      renders++;
      return useTimeField({
        locale: 'de-DE',
        onChange: () => {},
        minTime: { hour: 8, minute: 0, second: 0 },
        labels: { hour: 'Stunde' },
      });
    });
    expect(renders).toBeLessThanOrEqual(2);
  });

  it('calls the latest onChange, not an old one', () => {
    const calls: string[] = [];
    const { result, rerender } = renderHook(
      ({ tag }) => useTimeField({ locale: 'de-DE', onChange: () => calls.push(tag) }),
      { initialProps: { tag: 'first' } },
    );
    rerender({ tag: 'second' });
    act(() => result.current.field.increment('hour', 1));
    expect(calls).toEqual(['second']);
  });

  it('follows a controlled value', () => {
    const { result, rerender } = renderHook(
      ({ hour }) => useTimeField({ locale: 'de-DE', value: { hour, minute: 0, second: 0 } }),
      { initialProps: { hour: 10 } },
    );
    expect(texts(result.current.state)).toEqual(['10', '00']);

    rerender({ hour: 14 });
    expect(texts(result.current.state)).toEqual(['14', '00']);

    act(() => result.current.field.increment('hour', 1));
    expect(texts(result.current.state)).toEqual(['14', '00']); // the parent decides
  });

  it('handles typed digits and moves to the next segment', () => {
    const { result } = renderHook(() => useTimeField({ locale: 'de-DE' }));
    for (const key of '14') {
      act(() => {
        result.current.field.handleKeyDown('hour', { key, preventDefault: () => {} });
      });
    }
    expect(result.current.state.value?.hour).toBe(14);
    expect(result.current.state.activeSegment).toBe('minute');
  });
});
