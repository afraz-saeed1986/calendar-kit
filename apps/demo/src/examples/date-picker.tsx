import type { CalendarDate } from '@calendrix/core';
import { DatePicker } from '@calendrix/react';
import { useState } from 'react';

export default function DatePickerExample() {
  const [date, setDate] = useState<CalendarDate | null>(null);

  return (
    <>
      <DatePicker value={date} onChange={setDate} />
      <pre>{JSON.stringify(date, null, 2)}</pre>
    </>
  );
}
