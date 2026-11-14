import { cp } from 'node:fs/promises';
import { URL } from 'node:url';

// tsup does not touch plain CSS: copy it so that "@calendrix/react/styles.css" resolves.
// The only copy of the file is in packages/styles (ADR 0017).
await cp(
  new URL('../../styles/styles.css', import.meta.url),
  new URL('../dist/styles.css', import.meta.url),
);