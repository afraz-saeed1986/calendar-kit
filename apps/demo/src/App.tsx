import {
  convertDate,
  formatDate,
  formatISODate,
  formatISOTime,
  formatTime,
  parseDate,
  toInstant,
  type CalendarDate,
  type DateRange,
  type DateTimeValue,
  type TimeValue,
} from '@calendrix/core';
import { registerCalendar } from '@calendrix/core';
import { persian, persianPlugin } from '@calendrix/persian';
import { Calendar, DateTimePicker, TimeField } from '@calendrix/react';
import '@calendrix/react/styles.css';
import { useEffect, useState } from 'react';
import './demo.css';

const PROFILES = {
  persian: { system: 'persian', locale: 'fa-IR', label: 'فارسی (جلالی)', hourCycle: 24 },
  gregory: { system: 'gregory', locale: 'en-US', label: 'English (Gregorian)', hourCycle: 12 },
} as const;

type Mode = keyof typeof PROFILES;
type Theme = 'system' | 'light' | 'dark';

const TIME_ZONE = 'Asia/Tehran';

/** The wall clock written with its offset from UTC, for example "2026-10-14T12:00:00+03:30". */
function withOffset(date: CalendarDate, time: TimeValue, instant: Date): string {
  const gregorian = convertDate(date, 'gregory');
  const wallAsUtc = Date.UTC(
    gregorian.year,
    gregorian.month - 1,
    gregorian.day,
    time.hour,
    time.minute,
    time.second,
  );
  const minutes = Math.round((wallAsUtc - instant.getTime()) / 60_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const offset = `${minutes < 0 ? '-' : '+'}${pad(Math.floor(Math.abs(minutes) / 60))}:${pad(Math.abs(minutes) % 60)}`;
  return `${formatISODate(date)}T${formatISOTime(time, { seconds: true })}${offset}`;
}

// Register the Persian calendar before the first render: App converts dates before <Calendar /> mounts.
registerCalendar(persian);

export function App() {
  const [mode, setMode] = useState<Mode>('persian');
  const [theme, setTheme] = useState<Theme>('system');
  const [date, setDate] = useState<CalendarDate | null>(null);
  const [time, setTime] = useState<TimeValue | null>(null);
  const [text, setText] = useState('');
  const [picked, setPicked] = useState<DateTimeValue | null>(null);
  const [range, setRange] = useState<DateRange | null>(null);
  const [many, setMany] = useState<DateRange['start'][]>([]);

  const profile = PROFILES[mode];

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
  }, [theme]);

  // The value is kept in the calendar system that is on screen.
  const shown = date ? convertDate(date, profile.system) : null;

  const pick = (next: CalendarDate | null) => {
    setDate(next);
    setText(next ? formatDate(next, profile.locale) : '');
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    const target = PROFILES[next];
    setText(date ? formatDate(convertDate(date, target.system), target.locale) : '');
  };

  const typed = (value: string) => {
    setText(value);
    const parsed = parseDate(value, { locale: profile.locale, system: profile.system });
    if (parsed) setDate(parsed);
  };

  const invalid =
    text.trim() !== '' &&
    parseDate(text, { locale: profile.locale, system: profile.system }) === null;
  const instant = shown && time ? toInstant({ date: shown, time }, TIME_ZONE) : null;

  return (
    <main className="demo">
      <h1>calendrix</h1>
      <p className="demo-lead">
        Accessible date and time picker with Persian (Jalali) and Gregorian support.
      </p>

      <div className="demo-toolbar">
        <div className="demo-group" role="group" aria-label="Calendar">
          {(Object.keys(PROFILES) as Mode[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={mode === key}
              onClick={() => switchMode(key)}
            >
              {PROFILES[key].label}
            </button>
          ))}
        </div>
        <div className="demo-group" role="group" aria-label="Theme">
          {(['system', 'light', 'dark'] as Theme[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={theme === key}
              onClick={() => setTheme(key)}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      <section className="demo-section">
        <h2>DateTimePicker</h2>
        <DateTimePicker
          system={profile.system}
          locale={profile.locale}
          hourCycle={profile.hourCycle}
          plugins={[persianPlugin]}
          value={picked}
          onChange={setPicked}
        />
        <p>{picked ? `${formatISODate(picked.date)}T${formatISOTime(picked.time)}` : '—'}</p>
      </section>

      <section className="demo-section">
        <h2>Range</h2>
        <Calendar
          system={profile.system}
          locale={profile.locale}
          plugins={[persianPlugin]}
          selection="range"
          visibleMonths={2}
          value={range}
          onChange={setRange}
        />
        <p>{range ? `${formatISODate(range.start)} → ${formatISODate(range.end)}` : '—'}</p>
      </section>

      <section className="demo-section">
        <h2>Multiple</h2>
        <Calendar
          system={profile.system}
          locale={profile.locale}
          plugins={[persianPlugin]}
          selection="multiple"
          value={many}
          onChange={setMany}
        />
        <p>{many.length > 0 ? many.map((date) => formatISODate(date)).join(', ') : '—'}</p>
      </section>

      <div className="demo-row">
        <section className="demo-section">
          <h2>Calendar</h2>
          <Calendar
            system={profile.system}
            locale={profile.locale}
            plugins={[persianPlugin]}
            value={shown}
            onChange={pick}
          />
        </section>

        <div>
          <section className="demo-section">
            <h2>Time</h2>
            <TimeField
              locale={profile.locale}
              hourCycle={profile.hourCycle}
              value={time}
              onChange={setTime}
            />
          </section>

          <section className="demo-section">
            <h2>Type a date</h2>
            <input
              className="demo-input"
              value={text}
              onChange={(event) => typed(event.target.value)}
              placeholder={formatDate(
                convertDate({ system: 'gregory', year: 2026, month: 10, day: 14 }, profile.system),
                profile.locale,
              )}
              aria-label="Date"
              aria-invalid={invalid}
              inputMode="numeric"
              dir="ltr"
            />
          </section>
        </div>
      </div>

      <section className="demo-section">
        <h2>Value</h2>
        <dl className="demo-summary">
          <dt>Date</dt>
          <dd>{shown ? <bdi>{formatDate(shown, profile.locale)}</bdi> : '—'}</dd>
          <dt>ISO date</dt>
          <dd>{date ? formatISODate(date) : '—'}</dd>
          <dt>Time</dt>
          <dd>
            {time ? (
              <bdi>
                {formatTime(time, { locale: profile.locale, hourCycle: profile.hourCycle })}
              </bdi>
            ) : (
              '—'
            )}
          </dd>
          <dt>ISO time</dt>
          <dd>{time ? formatISOTime(time) : '—'}</dd>
          <dt>Date and time ({TIME_ZONE})</dt>
          <dd>{shown && time && instant ? withOffset(shown, time, instant) : '—'}</dd>
          <dt>Same moment in UTC</dt>
          <dd>{instant ? instant.toISOString() : '—'}</dd>
        </dl>
      </section>
    </main>
  );
}
