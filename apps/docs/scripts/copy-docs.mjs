// Prepares what the site reads from the rest of the repository, before dev and build:
// - the API reference and the ADRs, copied from docs/ into content/;
// - the source of every example, highlighted, for the tabs under the live demos.
// The generated files are ignored by git, so the files of the repository stay the only source.
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { codeToHtml } from 'shiki';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..', '..', '..');
const docs = path.join(repo, 'docs');
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

// The API reference and the ADRs.
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

// The code of the examples. The React demo decides the list of names.
const pascal = (name) =>
  name
    .split('-')
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('');

const sources = {
  react: { dir: 'apps/demo/src/examples', file: (name) => `${name}.tsx`, lang: 'tsx' },
  vue: {
    dir: 'apps/vue-demo/src/examples',
    file: (name) => `${pascal(name)}Example.vue`,
    lang: 'vue',
  },
  angular: { dir: 'apps/angular-demo/src/app/examples', file: (name) => `${name}.ts`, lang: 'ts' },
};

const names = readdirSync(path.join(repo, sources.react.dir))
  .filter((file) => file.endsWith('.tsx') && file !== 'index.tsx')
  .map((file) => file.replace(/\.tsx$/, ''))
  .sort();

const snippets = {};
for (const name of names) {
  snippets[name] = {};
  for (const [framework, { dir, file, lang }] of Object.entries(sources)) {
    const code = read(path.join(repo, dir, file(name))).trimEnd();
    snippets[name][framework] = await codeToHtml(code, {
      lang,
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
    });
  }
}
writeFileSync(path.join(here, '..', 'components', 'snippets.json'), JSON.stringify(snippets));

console.log(`Highlighted the code of ${names.length} examples`);
