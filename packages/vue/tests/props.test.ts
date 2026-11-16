import { describe, expect, it } from 'vitest';
import { toVueProps } from '../src/props';

describe('toVueProps', () => {
  it('writes the attributes as text and the handlers as listeners', () => {
    const click = () => undefined;
    const keydown = () => undefined;
    expect(
      toVueProps({
        attrs: {
          role: 'gridcell',
          tabindex: 0,
          'aria-selected': false,
          'data-today': undefined,
        },
        handlers: { click, keydown },
      }),
    ).toEqual({
      role: 'gridcell',
      tabindex: '0',
      'aria-selected': 'false',
      onClick: click,
      onKeydown: keydown,
    });
  });

  it('leaves the handlers off when asked to', () => {
    const result = toVueProps({ attrs: { role: 'grid' }, handlers: { keydown: () => undefined } }, false);
    expect(result).toEqual({ role: 'grid' });
  });

  it('ignores a handler that is not a function', () => {
    expect(toVueProps({ attrs: {}, handlers: { click: undefined } })).toEqual({});
  });
});