# ADR 0008: Reading and writing dates and times as text

- **Status:** Accepted (to be validated by the React adapter in M2)
- **Date:** 2026-11-02

## Context

A picker is not only a grid: people also type. A user may type `1405/07/22`, `۱۴۰۵/۷/۲۲`, `14.10.2026` or `2026-10-14 9:30 PM`, and the same text must mean the same day. Formatting also has to follow the locale, with its own numerals, and has to work in every calendar system.

## Decision

**Formatting and parsing use `Intl`, not format strings.** `formatDate`, `formatTime` and `formatDateTime` ask `Intl.DateTimeFormat` for the numeric pattern of a locale in a calendar system (`datePatternOf`), so the order of year, month and day and the separator come from the platform. There is no pattern language to learn or maintain.

**Parsing is lenient about input and strict about meaning.**

- Latin, Persian (۰-۹) and Arabic-Indic (٠-٩) digits are accepted, and `/`, `-`, `.`, `,` or spaces between the numbers.
- The order of the fields follows the locale, except that text starting with four digits is always year, month, day. This makes ISO-style text work everywhere.
- The year must have four digits. Two-digit years are rejected instead of guessed.
- Times accept `H:mm`, `HH:mm` and `HH:mm:ss`, and AM or PM in Latin letters (`PM`, `p.m.`) with an hour from 1 to 12.
- A date and a time are separated by a space or `T`.

**Invalid text returns `null`.** Nothing is thrown and nothing is corrected silently: `30 Esfand 1404` is not turned into `29 Esfand`, because changing what the user typed without telling them is worse than showing an error. The field decides how to show the error.

**Output has no era text.** `Intl` writes `07/22/1405 AP` for the Persian calendar in English. We build the text from the year, month and day parts only, so the result can be parsed back.

## Consequences

- (+) New locales and calendar systems work without code, as long as `Intl` knows them.
- (+) `parse(format(x)) === x` holds for the tested locales, which keeps text fields stable.
- (−) The exact separator and the order come from the platform's ICU data and can differ slightly between runtimes.
- (−) AM and PM are parsed only in Latin letters. Localized text such as `ق.ظ.` is not read yet.
- (−) Partial text (`1405/07`) and two-digit years are not supported. Input masks and partial entry belong to the adapters later.
