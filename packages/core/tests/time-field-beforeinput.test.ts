import { describe, expect, it, vi } from 'vitest';
import { createTimeField } from '../src/time-field';

const input = (inputType: string, data: string | null = null) => ({
  inputType,
  data,
  preventDefault: vi.fn(),
});

const text = (field: ReturnType<typeof createTimeField>, type: string) =>
  field.getState().segments.find((segment) => segment.type === type)?.text;

describe('time field: beforeinput (ADR 0024)', () => {
  it('types a digit like a key, and moves on when a segment is complete', () => {
    const field = createTimeField({ locale: 'en-US', hourCycle: 24 });
    expect(field.handleBeforeInput('hour', input('insertText', '1'))).toBe(true);
    expect(field.handleBeforeInput('hour', input('insertText', '4'))).toBe(true);
    expect(text(field, 'hour')).toBe('14');
    expect(field.getState().activeSegment).toBe('minute');
  });

  it('fills the next segments with a pasted text', () => {
    const field = createTimeField({ locale: 'en-US', hourCycle: 24 });
    field.handleBeforeInput('hour', input('insertFromPaste', '1430'));
    expect(field.getState().value).toMatchObject({ hour: 14, minute: 30 });
  });

  it('reads Persian digits', () => {
    const field = createTimeField({ locale: 'fa-IR', hourCycle: 24 });
    field.handleBeforeInput('hour', input('insertText', '\u06F1'));
    field.handleBeforeInput('hour', input('insertText', '\u06F4'));
    expect(field.getState().segments.find((s) => s.type === 'hour')?.numericValue).toBe(14);
  });

  it('clears on a deletion', () => {
    const field = createTimeField({
      locale: 'en-US',
      hourCycle: 24,
      defaultValue: { hour: 9, minute: 30, second: 0 },
    });
    expect(field.handleBeforeInput('hour', input('deleteContentBackward'))).toBe(true);
    expect(field.getState().value).toBeNull();
  });

  it('sets the period with a or p', () => {
    const field = createTimeField({
      locale: 'en-US',
      hourCycle: 12,
      defaultValue: { hour: 9, minute: 0, second: 0 },
    });
    field.handleBeforeInput('period', input('insertText', 'p'));
    expect(field.getState().value).toMatchObject({ hour: 21, minute: 0 });
  });

  it('stops the browser from writing, also for a character it cannot use', () => {
    const field = createTimeField({ locale: 'en-US', hourCycle: 24 });
    const event = input('insertText', 'x');
    expect(field.handleBeforeInput('hour', event)).toBe(false);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(text(field, 'hour')).toBe('--');
  });

  it('leaves a composition alone', () => {
    const field = createTimeField({ locale: 'en-US', hourCycle: 24 });
    const event = input('insertCompositionText', '1');
    expect(field.handleBeforeInput('hour', event)).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('does nothing when disabled', () => {
    const field = createTimeField({ locale: 'en-US', hourCycle: 24, disabled: true });
    const event = input('insertText', '5');
    expect(field.handleBeforeInput('hour', event)).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(text(field, 'hour')).toBe('--');
  });
});

describe('time field: attributes for an on-screen keyboard (ADR 0024)', () => {
  it('makes the segments editable, with a numeric keyboard except for the period', () => {
    const field = createTimeField({ locale: 'en-US', hourCycle: 12 });
    const hour = field.getSegmentProps('hour').attrs;
    expect(hour.contenteditable).toBe('true');
    expect(hour.inputmode).toBe('numeric');
    expect(hour.enterkeyhint).toBe('next');
    expect(hour.spellcheck).toBe('false');
    expect(field.getSegmentProps('period').attrs.inputmode).toBeUndefined();
  });

  it('is not editable when disabled', () => {
    const field = createTimeField({ locale: 'en-US', hourCycle: 24, disabled: true });
    expect(field.getSegmentProps('hour').attrs.contenteditable).toBeUndefined();
  });

  it('has a beforeinput handler that types', () => {
    const field = createTimeField({ locale: 'en-US', hourCycle: 24 });
    field.getSegmentProps('hour').handlers.beforeinput(input('insertText', '5'));
    expect(text(field, 'hour')).toBe('05');
  });
});