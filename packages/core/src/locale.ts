import type { Direction } from './types';

/** Languages written right to left. */
const RTL_LANGUAGES = new Set(['ar', 'fa', 'he', 'ur', 'ps', 'sd', 'ug', 'yi', 'dv', 'ckb']);

/** Text direction of a locale, derived from its language. */
export function directionOf(locale: string): Direction {
  return RTL_LANGUAGES.has(new Intl.Locale(locale).language) ? 'rtl' : 'ltr';
}
