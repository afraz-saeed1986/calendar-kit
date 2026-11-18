import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Calendar, TimeField } from '../src';

afterEach(cleanup);

const now = () => new Date(2026, 9, 14);
const nine05 = { hour: 9, minute: 5, second: 0 };
const texts = () => screen.getAllByRole('spinbutton').map((element) => element.textContent);

describe('<Calendar disabled />', () => {
  it('is not disabled by default', () => {
    const { container } = render(<Calendar now={now} />);
    expect(container.querySelector('.calendrix-calendar')?.hasAttribute('aria-disabled')).toBe(
      false,
    );
    expect(container.querySelector('[role="grid"] [tabindex="0"]')).not.toBeNull();
  });

  it('marks the root, disables the buttons and leaves nothing in the tab order', () => {
    const { container } = render(<Calendar now={now} disabled />);
    const root = container.querySelector('.calendrix-calendar');
    expect(root?.getAttribute('aria-disabled')).toBe('true');
    expect(root?.hasAttribute('data-disabled')).toBe(true);
    for (const button of screen.getAllByRole('button')) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
    }
    expect(container.querySelector('[role="grid"] [tabindex="0"]')).toBeNull();
  });

  it('does not report a clicked day or react to a key', () => {
    const onChange = vi.fn();
    const { container } = render(<Calendar now={now} disabled onChange={onChange} />);
    fireEvent.click(screen.getByText('20'));
    const grid = container.querySelector('[role="grid"]');
    if (grid) fireEvent.keyDown(grid, { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();
    expect(container.querySelector('.calendrix-month-button')?.textContent).toBe('October');
  });

  it('follows the prop when it changes', () => {
    const { container, rerender } = render(<Calendar now={now} disabled />);
    const root = () => container.querySelector('.calendrix-calendar');
    expect(root()?.getAttribute('aria-disabled')).toBe('true');
    rerender(<Calendar now={now} disabled={false} />);
    expect(root()?.hasAttribute('aria-disabled')).toBe(false);
    expect(container.querySelector('[role="grid"] [tabindex="0"]')).not.toBeNull();
  });
});

describe('<TimeField disabled />', () => {
  it('marks the field and takes the segments out of the tab order', () => {
    render(<TimeField locale="de-DE" defaultValue={nine05} disabled />);
    expect(screen.getByRole('group', { name: 'Uhrzeit' }).getAttribute('aria-disabled')).toBe(
      'true',
    );
    for (const segment of screen.getAllByRole('spinbutton')) {
      expect(segment.getAttribute('tabindex')).toBe('-1');
      expect(segment.getAttribute('aria-disabled')).toBe('true');
    }
  });

  it('does not change or report on the arrow keys', () => {
    const onChange = vi.fn();
    render(<TimeField locale="de-DE" defaultValue={nine05} disabled onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole('spinbutton', { name: 'Stunde' }), { key: 'ArrowUp' });
    expect(texts()).toEqual(['09', '05']);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not move the focus when digits are typed', () => {
    render(<TimeField locale="de-DE" defaultValue={nine05} disabled />);
    const hour = screen.getByRole('spinbutton', { name: 'Stunde' });
    fireEvent.keyDown(hour, { key: '1' });
    fireEvent.keyDown(hour, { key: '4' });
    expect(texts()).toEqual(['09', '05']);
    expect(document.activeElement).not.toBe(screen.getByRole('spinbutton', { name: 'Minute' }));
  });
});