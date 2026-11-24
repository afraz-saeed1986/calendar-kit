import { describe, expect, it } from 'vitest';
import { createTimeField } from '../src/index';

const key = (name: string) => ({ key: name, preventDefault: () => undefined });
const field24 = () => createTimeField({ locale: 'en-US', hourCycle: 24 });

describe('time field focusRequest', () => {
  it('starts at 0', () => {
    expect(field24().getState().focusRequest).toBe(0);
  });

  it('grows when typing completes a segment and the next one becomes active', () => {
    const field = field24();
    field.handleKeyDown('hour', key('1'));
    expect(field.getState().focusRequest).toBe(0);
    expect(field.getState().activeSegment).toBe('hour');

    field.handleKeyDown('hour', key('4'));
    expect(field.getState().focusRequest).toBe(1);
    expect(field.getState().activeSegment).toBe('minute');
  });

  it('grows when one digit completes a segment on its own', () => {
    const field = field24();
    // 3 cannot start a valid hour in a 24-hour clock (30 > 23), so the segment is complete.
    field.handleKeyDown('hour', key('3'));
    expect(field.getState().focusRequest).toBe(1);
    expect(field.getState().activeSegment).toBe('minute');
  });

  it('does not grow after the last segment', () => {
    const field = field24();
    field.handleKeyDown('hour', key('1'));
    field.handleKeyDown('hour', key('4'));
    field.handleKeyDown('minute', key('4'));
    field.handleKeyDown('minute', key('5'));
    expect(field.getState().focusRequest).toBe(1);
  });

  it('does not grow for focusSegment, the arrow keys or Backspace', () => {
    const field = field24();
    field.focusSegment('minute');
    field.handleKeyDown('minute', key('ArrowUp'));
    field.handleKeyDown('minute', key('ArrowDown'));
    field.handleKeyDown('minute', key('Backspace'));
    expect(field.getState().focusRequest).toBe(0);
  });

  it('is already new in the last state a listener reads', () => {
    const field = field24();
    const seen: number[] = [];
    field.subscribe(() => seen.push(field.getState().focusRequest));
    field.handleKeyDown('hour', key('3'));
    expect(seen.at(-1)).toBe(1);
  });
});
