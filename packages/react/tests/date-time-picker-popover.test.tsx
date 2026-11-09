import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
  import { DateTimePicker } from '../src/date-time-picker';

function openPopover(props: Parameters<typeof DateTimePicker>[0] = {}) {
  render(<DateTimePicker labels={{ done: 'Done' }} {...props} />);
  const input = screen.getByRole('textbox');
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  return { input, dialog: screen.getByRole('dialog') };
}

describe('DateTimePicker popover', () => {
  afterEach(cleanup);
  it('renders in document.body by default', () => {
    const { dialog } = openPopover();
    expect(dialog.closest('.calendrix-picker')).toBeNull();
    expect(dialog.parentElement).toBe(document.body);
  });

  it('renders next to the input with portal={false}', () => {
    const { dialog } = openPopover({ portal: false });
    expect(dialog.closest('.calendrix-picker')).not.toBeNull();
  });

  it('stays open on a pointer down inside the portaled popover and closes outside', () => {
    const { dialog } = openPopover();
    fireEvent.pointerDown(dialog);
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('moves focus from the last element to the first on Tab', () => {
    const { dialog } = openPopover();
    const done = screen.getByRole('button', { name: 'Done' });
    done.focus();
    fireEvent.keyDown(done, { key: 'Tab' });
    expect(document.activeElement).toBe(dialog.querySelector('button'));
  });

  it('moves focus from the first element to the last on Shift+Tab', () => {
    const { dialog } = openPopover();
    const first = dialog.querySelector('button') as HTMLElement;
    first.focus();
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Done' }));
  });

  it('returns focus to the input on Escape', () => {
    const { input } = openPopover();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(input);
  });

  it('returns focus to the input on Done', () => {
    const { input } = openPopover();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(input);
  });
});