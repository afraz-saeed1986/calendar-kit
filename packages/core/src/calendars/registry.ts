import type { CalendarImplementation, CalendarSystem } from '../types';
import { gregory } from './gregory';

const registry = new Map<CalendarSystem, CalendarImplementation>([[gregory.id, gregory]]);

/** Register an additional calendar system (used by plugins such as the Persian calendar). */
export function registerCalendar(impl: CalendarImplementation): void {
  registry.set(impl.id, impl);
}

/** Look up a calendar system. Throws if the system is unknown, so misconfiguration fails loudly. */
export function getCalendar(system: CalendarSystem): CalendarImplementation {
  const impl = registry.get(system);
  if (!impl) {
    throw new Error(
      `Unknown calendar system "${system}". Register it with registerCalendar() or a plugin.`,
    );
  }
  return impl;
}
