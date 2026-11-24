import { describe, expect, it } from 'vitest';
import { normalizeAttributes } from '../src/index';

describe('normalizeAttributes', () => {
  it('writes booleans of aria-* and data-* as text', () => {
    expect(
      normalizeAttributes({
        'aria-selected': true,
        'aria-disabled': false,
        'data-today': true,
        'data-range-start': false,
      }),
    ).toEqual({
      'aria-selected': 'true',
      'aria-disabled': 'false',
      'data-today': 'true',
      'data-range-start': 'false',
    });
  });

  it('writes true as an empty value and leaves false off in other attributes', () => {
    expect(normalizeAttributes({ hidden: true, disabled: false })).toEqual({ hidden: '' });
  });

  it('leaves undefined off, also in aria-* and data-*', () => {
    expect(
      normalizeAttributes({
        'aria-current': undefined,
        'data-focused': undefined,
        role: undefined,
      }),
    ).toEqual({});
  });

  it('writes numbers and strings as text', () => {
    expect(normalizeAttributes({ tabindex: 0, 'aria-valuenow': 12, role: 'gridcell' })).toEqual({
      tabindex: '0',
      'aria-valuenow': '12',
      role: 'gridcell',
    });
  });
});
