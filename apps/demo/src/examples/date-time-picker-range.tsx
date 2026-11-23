import { DateTimePicker, type DateTimeRange } from '@calendrix/react';
import { useState } from 'react';

export default function DateTimePickerRangeExample() {
  const [range, setRange] = useState<DateTimeRange | null>(null);

  return (
    <>
      <DateTimePicker selection="range" value={range} onChange={setRange} />
      <pre>{JSON.stringify(range, null, 2)}</pre>
    </>
  );
}