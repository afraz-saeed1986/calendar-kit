import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// `vue-tsc` writes relative imports without an extension ("./props"), which TypeScript cannot
// resolve under `moduleResolution: node16`, and one `.d.ts` cannot serve both ESM and CommonJS.
// So every declaration file is rewritten with ".js" imports, and gets a ".d.cts" twin with
// ".cjs" imports (the same pair that tsup writes for the React package).
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const RELATIVE = /(\bfrom\s+|\bimport\(\s*)(['"])(\.{1,2}\/[^'"]+)\2/g;

const withExtension = (source, extension) =>
  source.replace(RELATIVE, (_match, lead, quote, path) => {
    const done = /\.c?js$/.test(path) ? path : `${path}${extension}`;
    return `${lead}${quote}${done}${quote}`;
  });

for (const name of await readdir(dist)) {
  if (!name.endsWith('.d.ts')) continue;
  const file = join(dist, name);
  const source = await readFile(file, 'utf8');
  await writeFile(file, withExtension(source, '.js'));
  await writeFile(join(dist, name.replace(/\.d\.ts$/, '.d.cts')), withExtension(source, '.cjs'));
}
