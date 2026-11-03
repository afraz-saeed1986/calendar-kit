import type { ElementProps } from '@calendrix/core';
import type { HTMLAttributes } from 'react';

/** DOM attribute names that React spells differently. */
const ATTRIBUTE_NAMES: Record<string, string> = {
  class: 'className',
  for: 'htmlFor',
  tabindex: 'tabIndex',
  inputmode: 'inputMode',
  colspan: 'colSpan',
  rowspan: 'rowSpan',
  readonly: 'readOnly',
  maxlength: 'maxLength',
};

/** DOM event names (as the core uses them) and their React props. */
const HANDLER_NAMES: Record<string, string> = {
  click: 'onClick',
  keydown: 'onKeyDown',
  keyup: 'onKeyUp',
  focus: 'onFocus',
  blur: 'onBlur',
  input: 'onInput',
  change: 'onChange',
  mousedown: 'onMouseDown',
  pointerdown: 'onPointerDown',
};

/**
 * Turn the props of a core prop getter (`attrs` and `handlers` with DOM names) into props for a
 * React element. Attributes that are `undefined` are left off.
 */
export function toReactProps(props: ElementProps<object>): HTMLAttributes<HTMLElement> {
  const result: Record<string, unknown> = {};

  for (const [name, value] of Object.entries(props.attrs)) {
    if (value !== undefined) result[ATTRIBUTE_NAMES[name] ?? name] = value;
  }
  for (const [name, handler] of Object.entries(props.handlers)) {
    result[HANDLER_NAMES[name] ?? `on${name.charAt(0).toUpperCase()}${name.slice(1)}`] = handler;
  }
  return result as HTMLAttributes<HTMLElement>;
}
