import type { DateTimeValue } from '@calendrix/core';
import { DateTimePicker } from '@calendrix/react';
import { useState } from 'react';

export default function DateTimePickerExample() {
  const [value, setValue] = useState<DateTimeValue | null>(null);

  return (
    <>
      <DateTimePicker value={value} onChange={setValue} />
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </>
  );
}
