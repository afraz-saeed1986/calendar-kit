import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { TimeValue } from '@calendrix/core';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TimeField } from '../src';

afterEach(cleanup);

const nine05 = { hour: 9, minute: 5, second: 0 };
const texts = () => screen.getAllByRole('spinbutton').map((element) => element.textContent);

describe('<TimeField />', () => {
  it('renders each segment as a spinbutton', () => {
    render(<TimeField locale="de-DE" defaultValue={nine05} />);
    expect(texts()).toEqual(['09', '05']);
  });

  it('labels the group and the segments', () => {
    render(<TimeField locale="de-DE" defaultValue={nine05} />);
    expect(screen.getByRole('group', { name: 'Uhrzeit' })).toBeTruthy();
    expect(screen.getByRole('spinbutton', { name: 'Stunde' }).getAttribute('aria-valuenow')).toBe(
      '9',
    );
  });

  it('shows placeholders for an empty field', () => {
    render(<TimeField locale="en-US" hourCycle={24} />);
    expect(texts()).toEqual(['--', '--']);
    expect(screen.getAllByRole('spinbutton')[0]?.getAttribute('aria-valuetext')).toBe('Empty');
  });

  it('steps a segment with the arrow keys', () => {
    render(<TimeField locale="de-DE" defaultValue={nine05} />);
    fireEvent.keyDown(screen.getByRole('spinbutton', { name: 'Stunde' }), { key: 'ArrowUp' });
    expect(texts()).toEqual(['10', '05']);
  });

  it('moves the real focus to the next segment when typing completes one', () => {
    render(<TimeField locale="de-DE" />);
    const hour = screen.getByRole('spinbutton', { name: 'Stunde' });
    fireEvent.keyDown(hour, { key: '1' });
    fireEvent.keyDown(hour, { key: '4' });
    expect(texts()).toEqual(['14', '00']);
    expect(document.activeElement).toBe(screen.getByRole('spinbutton', { name: 'Minute' }));
  });

  it('only changes a controlled value when the parent does', () => {
    const onChange = vi.fn();
    render(
      <TimeField locale="de-DE" value={{ hour: 10, minute: 0, second: 0 }} onChange={onChange} />,
    );
    fireEvent.keyDown(screen.getByRole('spinbutton', { name: 'Stunde' }), { key: 'ArrowUp' });
    expect(onChange).toHaveBeenCalledWith({ hour: 11, minute: 0, second: 0 });
    expect(texts()).toEqual(['10', '00']);
  });

  it('accepts two typed digits when the parent controls the value', () => {
    function Controlled() {
      const [value, setValue] = useState<TimeValue | null>(null);
      return <TimeField locale="de-DE" value={value} onChange={setValue} />;
    }
    render(<Controlled />);

    const hour = screen.getByRole('spinbutton', { name: 'Stunde' });
    fireEvent.keyDown(hour, { key: '1' });
    fireEvent.keyDown(hour, { key: '4' });
    const minute = screen.getByRole('spinbutton', { name: 'Minute' });
    fireEvent.keyDown(minute, { key: '2' });
    fireEvent.keyDown(minute, { key: '2' });
    expect(texts()).toEqual(['14', '22']);
  });

  it('shows AM/PM on a 12-hour clock', () => {
    render(<TimeField locale="en-US" defaultValue={{ hour: 13, minute: 0, second: 0 }} />);
    expect(screen.getAllByRole('spinbutton')).toHaveLength(3);
    expect(screen.getByText('PM')).toBeTruthy();
  });

  it('uses Persian numerals, and reads left to right even in Persian', () => {
    const { container } = render(<TimeField locale="fa-IR" hourCycle={24} defaultValue={nine05} />);
    expect(texts()).toEqual(['۰۹', '۰۵']);
    expect(container.firstElementChild?.getAttribute('dir')).toBe('ltr');
  });
});
