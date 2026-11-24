import type { CalendarDate } from '@calendrix/core';
import { persianPlugin } from '@calendrix/persian';
import { DatePicker } from '@calendrix/react';
import { useState } from 'react';

const plugins = [persianPlugin];

export default function PersianRtlExample() {
  const [date, setDate] = useState<CalendarDate | null>(null);

  return (
    <>
      <DatePicker
        value={date}
        onChange={setDate}
        system="persian"
        locale="fa-IR"
        direction="rtl"
        plugins={plugins}
      />
      <pre>{JSON.stringify(date, null, 2)}</pre>
    </>
  );
}
