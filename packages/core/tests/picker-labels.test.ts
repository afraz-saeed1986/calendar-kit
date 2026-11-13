import { describe, expect, it } from 'vitest';
import { pickerLabelsFor } from '../src/picker-labels';

describe('pickerLabelsFor', () => {
  it('uses English for a language that is not built in', () => {
    expect(pickerLabelsFor('ja-JP').done).toBe('Done');
  });

  it('writes "date and time" by default and "date" for a picker without time', () => {
    expect(pickerLabelsFor('en-US').openCalendar).toBe('Choose date and time');
    expect(pickerLabelsFor('en-US', undefined, 'date').openCalendar).toBe('Choose date');
    expect(pickerLabelsFor('en-US', undefined, 'date').dialog).toBe('Choose date');
  });

  it('knows Persian and German, and keeps the other texts for a picker without time', () => {
    expect(pickerLabelsFor('fa-IR', undefined, 'date').openCalendar).toBe('انتخاب تاریخ');
    expect(pickerLabelsFor('de-DE', undefined, 'date').openCalendar).toBe('Datum wählen');
    expect(pickerLabelsFor('de-DE', undefined, 'date').done).toBe('Fertig');
  });

  it('lets the caller override single texts', () => {
    const labels = pickerLabelsFor('en-US', { clear: 'Reset' }, 'date');
    expect(labels.clear).toBe('Reset');
    expect(labels.openCalendar).toBe('Choose date');
  });
});
