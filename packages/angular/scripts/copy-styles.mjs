import { cp } from 'node:fs/promises';
import { URL } from 'node:url';

// ng-packagr cannot read assets from outside the library, and it empties dist on every build:
// copy the shared stylesheet after it, so that "@calendrix/angular/styles.css" resolves.
// The only copy of the file is in packages/styles (ADR 0017).
await cp(
  new URL('../../styles/styles.css', import.meta.url),
  new URL('../dist/calendrix-angular/styles.css', import.meta.url),
);