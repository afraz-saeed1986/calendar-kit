import type { DateRange } from '@calendrix/core';
import { DatePicker } from '@calendrix/react';
import { useState } from 'react';

export default function DatePickerRangeExample() {
  const [range, setRange] = useState<DateRange | null>(null);

  return (
    <>
      <DatePicker selection="range" value={range} onChange={setRange} />
      <pre>{JSON.stringify(range, null, 2)}</pre>
    </>
  );
}