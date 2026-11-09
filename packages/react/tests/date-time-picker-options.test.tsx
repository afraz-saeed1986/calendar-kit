import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DateTimePicker } from '../src/date-time-picker';

function open(props: Parameters<typeof DateTimePicker>[0] = {}) {
  render(<DateTimePicker now={() => new Date(2026, 10, 9)} {...props} />);
  fireEvent.keyDown(screen.getByRole('textbox'), { key: 'ArrowDown' });
}

describe('DateTimePicker options', () => {
  afterEach(cleanup);

  it('starts the week on weekStart', () => {
    open({ weekStart: 1 });
    expect(screen.getAllByRole('columnheader')[0]?.getAttribute('aria-label')).toBe('Monday');
  });

  it('shows several months with visibleMonths', () => {
    open({ visibleMonths: 2 });
    expect(screen.getAllByRole('grid')).toHaveLength(2);
  });

  it('starts a picked date at minTime', () => {
    const onChange = vi.fn();
    open({ onChange, minTime: { hour: 9, minute: 0, second: 0 } });
    fireEvent.click(screen.getByText('15'));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ time: { hour: 9, minute: 0, second: 0 } }),
    );
  });
});