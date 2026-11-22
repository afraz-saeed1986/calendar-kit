/**
 * `Intl` objects cost about 100 µs to construct and almost nothing to use, so the core keeps the
 * ones it has made. They are immutable, so sharing them is safe. A cache that grows past
 * `MAX_ENTRIES` (an application with many locales) is emptied, so it cannot grow without limit.
 */
const MAX_ENTRIES = 500;

type Locales = string | Intl.Locale | readonly string[] | undefined;

const dateTimeFormats = new Map<string, Intl.DateTimeFormat>();
const numberFormats = new Map<string, Intl.NumberFormat>();
const localeObjects = new Map<string, Intl.Locale>();

function cached<T>(cache: Map<string, T>, key: string, create: () => T): T {
  const found = cache.get(key);
  if (found !== undefined) return found;
  if (cache.size >= MAX_ENTRIES) cache.clear();
  const made = create();
  cache.set(key, made);
  return made;
}

const keyOf = (locales: Locales, options?: object): string =>
  `${String(locales)}|${options ? JSON.stringify(options) : ''}`;

/** Like `new Intl.DateTimeFormat(locales, options)`, made once for the same arguments. */
export function dateTimeFormat(
  locales?: Locales,
  options?: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  return cached(
    dateTimeFormats,
    keyOf(locales, options),
    () => new Intl.DateTimeFormat(locales as string | string[] | undefined, options),
  );
}

/** Like `new Intl.NumberFormat(locales, options)`, made once for the same arguments. */
export function numberFormat(
  locales?: Locales,
  options?: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  return cached(
    numberFormats,
    keyOf(locales, options),
    () => new Intl.NumberFormat(locales as string | string[] | undefined, options),
  );
}

/** Like `new Intl.Locale(tag, options)`, made once for the same arguments. */
export function cachedLocale(tag: string | Intl.Locale, options?: Intl.LocaleOptions): Intl.Locale {
  return cached(localeObjects, keyOf(tag, options), () => new Intl.Locale(tag, options));
}