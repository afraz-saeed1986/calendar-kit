import type { SelectionValue } from '@calendrix/core';
import { DatePicker } from '@calendrix/react';
import { useState } from 'react';

export default function DatePickerMultipleExample() {
  const [dates, setDates] = useState<SelectionValue<'multiple'>>([]);

  return (
    <>
      <DatePicker selection="multiple" value={dates} onChange={setDates} />
      {dates.length > 0 && <pre>{JSON.stringify(dates, null, 2)}</pre>}
    </>
  );
}
