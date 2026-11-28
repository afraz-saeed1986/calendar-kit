// Copies docs/api.md and the ADRs into content/, where Nextra reads them.
// The copies are generated and ignored by git, so the Markdown in docs/ stays the only source.
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const docs = path.resolve(here, '..', '..', '..', 'docs');
const content = path.resolve(here, '..', 'content');
const adrDir = path.join(content, 'adr');

const ADR_LINK = /^(?:\.\/)?(?:adr\/)?(\d{4}-[a-z0-9-]+)\.md(#.*)?$/;

/** A link to an ADR points to its page. A link to any other Markdown file becomes plain text. */
function rewriteLinks(markdown) {
  let inFence = false;
  return markdown
    .split('\n')
    .map((line) => {
      if (line.trimStart().startsWith('```')) inFence = !inFence;
      if (inFence) return line;
      return line.replace(/\[([^\]]+)\]\(([^)\s]+\.md(?:#[^)\s]*)?)\)/g, (_, label, target) => {
        const adr = ADR_LINK.exec(target);
        return adr ? `[${label}](/adr/${adr[1]}${adr[2] ?? ''})` : label;
      });
    })
    .join('\n');
}

const read = (file) => readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const copy = (from, to) => writeFileSync(to, rewriteLinks(read(from)));

rmSync(adrDir, { recursive: true, force: true });
mkdirSync(adrDir, { recursive: true });

copy(path.join(docs, 'api.md'), path.join(content, 'api.md'));

const meta = {};
const files = readdirSync(path.join(docs, 'adr'))
  .filter((file) => /^\d{4}-.+\.md$/.test(file))
  .sort();
for (const file of files) {
  const from = path.join(docs, 'adr', file);
  meta[file.replace(/\.md$/, '')] = /^# (.+)$/m.exec(read(from))?.[1] ?? file;
  copy(from, path.join(adrDir, file));
}
writeFileSync(path.join(adrDir, '_meta.js'), `export default ${JSON.stringify(meta, null, 2)};\n`);

console.log(`Copied the API reference and ${files.length} ADRs`);
