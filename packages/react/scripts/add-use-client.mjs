import { readFile, writeFile } from 'node:fs/promises';

// Next.js (App Router) treats a package as server code unless its files start with this
// directive. It goes on the first line, so the source maps keep their line numbers.
const DIRECTIVE = '"use client";';

for (const file of ['dist/index.js', 'dist/index.cjs']) {
  const source = await readFile(file, 'utf8');
  if (!source.startsWith(DIRECTIVE)) await writeFile(file, DIRECTIVE + source);
}