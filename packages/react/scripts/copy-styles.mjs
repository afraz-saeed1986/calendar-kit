import { cp } from 'node:fs/promises';
import { URL } from 'node:url';

// tsup does not touch plain CSS: copy it so that "@calendrix/react/styles.css" resolves.
await cp(
  new URL('../src/styles.css', import.meta.url),
  new URL('../dist/styles.css', import.meta.url),
);
