import type { TimeValue } from '@calendrix/core';
import { TimeField } from '@calendrix/react';
import { useState } from 'react';

export default function TimeFieldExample() {
  const [time, setTime] = useState<TimeValue | null>(null);

  return (
    <>
      <TimeField value={time} onChange={setTime} />
      {time && <pre>{JSON.stringify(time, null, 2)}</pre>}
    </>
  );
}
