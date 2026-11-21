import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DatePicker } from '../src/date-picker';

afterEach(cleanup);

const now = () => new Date('2026-10-14T10:00:00Z');

const open = (container: HTMLElement) =>
  fireEvent.click(container.querySelector('.calendrix-toggle:not(.calendrix-clear)')!);
const popover = () => document.body.querySelector<HTMLElement>('.calendrix-popover');

describe('the theme of an ancestor and a portaled popover (ADR 0026)', () => {
  it('copies the data-theme of an ancestor', () => {
    const { container } = render(
      <div data-theme="dark">
        <DatePicker locale="en-US" now={now} />
      </div>,
    );
    open(container);
    expect(popover()?.getAttribute('data-theme')).toBe('dark');
  });

  it('copies the nearest one', () => {
    const { container } = render(
      <div data-theme="dark">
        <section data-theme="light">
          <DatePicker locale="en-US" now={now} />
        </section>
      </div>,
    );
    open(container);
    expect(popover()?.getAttribute('data-theme')).toBe('light');
  });

  it('sets nothing when no ancestor has a data-theme', () => {
    const { container } = render(<DatePicker locale="en-US" now={now} />);
    open(container);
    expect(popover()).not.toBeNull();
    expect(popover()?.hasAttribute('data-theme')).toBe(false);
  });

  it('sets nothing when the popover is not portaled', () => {
    const { container } = render(
      <div data-theme="dark">
        <DatePicker locale="en-US" now={now} portal={false} />
      </div>,
    );
    open(container);
    expect(container.querySelector('.calendrix-popover')?.hasAttribute('data-theme')).toBe(false);
  });
});