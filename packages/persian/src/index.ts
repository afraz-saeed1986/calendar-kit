import type { CalendarPlugin } from '@calendrix/core';
import { persian } from './persian';

export { persian } from './persian';

/** Plugin form of the Persian calendar, for use with `createCalendar` once it is implemented. */
export const persianPlugin: CalendarPlugin = {
  name: 'persian',
  calendars: [persian],
};
