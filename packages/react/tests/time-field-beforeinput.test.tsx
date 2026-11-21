import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { TimeField } from '../src/time-field';

afterEach(cleanup);

const segment = (container: HTMLElement, type: string) =>
  container.querySelector<HTMLElement>(`[data-segment="${type}"]`)!;

/** Returns false when the handler called `preventDefault()`. */
function type(element: HTMLElement, data: string, inputType = 'insertText'): boolean {
  return fireEvent(
    element,
    new InputEvent('beforeinput', { inputType, data, bubbles: true, cancelable: true }),
  );
}

describe('TimeField: on-screen keyboard (ADR 0024)', () => {
  it('makes the segments editable, with a numeric keyboard', () => {
    const { container } = render(<TimeField locale="en-US" hourCycle={24} />);
    const hour = segment(container, 'hour');
    expect(hour.getAttribute('contenteditable')).toBe('true');
    expect(hour.getAttribute('inputmode')).toBe('numeric');
    expect(hour.getAttribute('enterkeyhint')).toBe('next');
    expect(hour.getAttribute('spellcheck')).toBe('false');
  });

  it('types a digit, stops the browser from writing, and moves the focus on', () => {
    const { container } = render(<TimeField locale="en-US" hourCycle={24} />);
    const hour = segment(container, 'hour');
    expect(type(hour, '1')).toBe(false);
    type(hour, '4');
    expect(hour.textContent).toBe('14');
    expect(document.activeElement).toBe(segment(container, 'minute'));
  });

  it('fills the next segments with a pasted text', () => {
    const { container } = render(<TimeField locale="en-US" hourCycle={24} />);
    type(segment(container, 'hour'), '1430', 'insertFromPaste');
    expect(segment(container, 'hour').textContent).toBe('14');
    expect(segment(container, 'minute').textContent).toBe('30');
  });

  it('clears on a deletion', () => {
    const { container } = render(
      <TimeField
        locale="en-US"
        hourCycle={24}
        defaultValue={{ hour: 9, minute: 30, second: 0 }}
      />,
    );
    type(segment(container, 'hour'), '', 'deleteContentBackward');
    expect(segment(container, 'hour').textContent).toBe('--');
  });

  it('writes the text of the state back after a composition', () => {
    const { container } = render(<TimeField locale="en-US" hourCycle={24} />);
    const hour = segment(container, 'hour');
    (hour.firstChild as Text).data = '77';
    fireEvent(hour, new InputEvent('input', { isComposing: true, bubbles: true }));
    expect(hour.textContent).toBe('--');
  });

  it('is not editable when disabled', () => {
    const { container } = render(<TimeField locale="en-US" hourCycle={24} disabled />);
    expect(segment(container, 'hour').hasAttribute('contenteditable')).toBe(false);
  });
});