// Measures how fast the core is. Build first (`pnpm turbo run build`), then run `pnpm bench`.
// Each operation runs in batches; the number is the median batch (operations per second).
import { arch, cpus } from 'node:os';
import { performance } from 'node:perf_hooks';
import * as core from '../packages/core/dist/index.js';
import { persian } from '../packages/persian/dist/index.js';

core.registerCalendar(persian);

const now = () => new Date('2026-10-14T10:00:00Z');
const key = (value) => ({ key: value, preventDefault() {} });

// Only written: it keeps the result of the call alive, so the engine cannot remove the call.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let sink;

function bench(name, fn, { samples = 9, batchMs = 150 } = {}) {
  const warmUntil = performance.now() + 250;
  while (performance.now() < warmUntil) sink = fn();

  const rates = [];
  for (let sample = 0; sample < samples; sample++) {
    let count = 0;
    const start = performance.now();
    let end = start;
    while ((end = performance.now()) - start < batchMs) {
      for (let i = 0; i < 50; i++) sink = fn();
      count += 50;
    }
    rates.push(count / ((end - start) / 1000));
  }
  rates.sort((a, b) => a - b);
  return { name, perSecond: rates[Math.floor(rates.length / 2)] };
}

const results = [];

// A fresh calendar and the state that an adapter renders from.
results.push(
  bench('createCalendar + getState (Gregorian, 1 month)', () => {
    const calendar = core.createCalendar({ now });
    const state = calendar.getState();
    calendar.destroy?.();
    return state;
  }),
  bench('createCalendar + getState (Persian, 1 month)', () => {
    const calendar = core.createCalendar({ now, system: 'persian', locale: 'fa-IR' });
    const state = calendar.getState();
    calendar.destroy?.();
    return state;
  }),
  bench('createCalendar + getState (Persian, 3 months)', () => {
    const calendar = core.createCalendar({
      now,
      system: 'persian',
      locale: 'fa-IR',
      visibleMonths: 3,
    });
    const state = calendar.getState();
    calendar.destroy?.();
    return state;
  }),
);

// Moving around in a calendar that exists.
const moving = core.createCalendar({ now, system: 'persian', locale: 'fa-IR' });
results.push(
  bench('nextMonth + getState (Persian)', () => {
    moving.nextMonth();
    return moving.getState();
  }),
);

const selecting = core.createCalendar({ now });
const day = core.createDate('gregory', 2026, 10, 14);
results.push(
  bench('select a day + getState (Gregorian)', () => {
    selecting.select(day);
    return selecting.getState();
  }),
);

// Text.
const persianDay = core.createDate('persian', 1405, 7, 22);
const persianText = core.formatDate(persianDay, 'fa-IR');
if (core.parseDate(persianText, { locale: 'fa-IR', system: 'persian' }) === null) {
  throw new Error(`The Persian text "${persianText}" does not parse back`);
}
results.push(
  bench('formatDate (en-US)', () => core.formatDate(day, 'en-US')),
  bench('parseDate (en-US)', () =>
    core.parseDate('10/14/2026', { locale: 'en-US', system: 'gregory' }),
  ),
  bench('formatDate (Persian, fa-IR)', () => core.formatDate(persianDay, 'fa-IR')),
  bench('parseDate (Persian, fa-IR)', () =>
    core.parseDate(persianText, { locale: 'fa-IR', system: 'persian' }),
  ),
  bench('convertDate (Gregorian to Persian)', () => core.convertDate(day, 'persian')),
);

// Typing a time: four keys fill the hour and the minute.
results.push(
  bench('createTimeField + type "1430"', () => {
    const field = core.createTimeField({ locale: 'en-US', hourCycle: 24 });
    for (const digit of '1430')
      field.handleKeyDown(field.getState().activeSegment ?? 'hour', key(digit));
    const state = field.getState();
    field.destroy();
    return state;
  }),
);

const format = (rate) => Math.round(rate).toLocaleString('en-US');
const micro = (rate) => {
  const value = 1_000_000 / rate;
  return value < 10 ? value.toFixed(2) : value.toFixed(1);
};

console.log(`Node ${process.version}, ${cpus()[0]?.model.trim()} (${arch()})\n`);
console.log('| Operation | operations per second | time per operation |');
console.log('| --- | ---: | ---: |');
for (const { name, perSecond } of results) {
  console.log(`| ${name} | ${format(perSecond)} | ${micro(perSecond)} µs |`);
}

const sample = core.createCalendar({ now }).getState();
console.log(`\n(state keys: ${Object.keys(sample).join(', ')})`);
