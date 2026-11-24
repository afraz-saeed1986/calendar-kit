// Builds the three demo apps with a relative base and copies them to public/demos/<framework>/,
// where the site shows them in iframes.
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..', '..');
const target = path.resolve(here, '..', 'public', 'demos');

const demos = [
  {
    name: 'react',
    filter: '@calendrix/demo',
    build: 'exec vite build --base ./',
    out: 'apps/demo/dist',
  },
  {
    name: 'vue',
    filter: '@calendrix/vue-demo',
    build: 'exec vite build --base ./',
    out: 'apps/vue-demo/dist',
  },
  {
    name: 'angular',
    filter: '@calendrix/angular-demo',
    build: 'exec ng build --base-href ./',
    out: 'apps/angular-demo/dist/angular-demo/browser',
  },
];

const run = (command) => execSync(command, { cwd: root, stdio: 'inherit' });

// The demos need the built packages.
run(
  'pnpm turbo run build --filter=@calendrix/core --filter=@calendrix/persian --filter=@calendrix/react --filter=@calendrix/vue --filter=calendrix-ng',
);

rmSync(target, { recursive: true, force: true });
for (const demo of demos) {
  run(`pnpm --filter ${demo.filter} ${demo.build}`);
  const from = path.join(root, demo.out);
  if (!existsSync(path.join(from, 'index.html'))) throw new Error(`No index.html in ${from}`);
  mkdirSync(path.join(target, demo.name), { recursive: true });
  cpSync(from, path.join(target, demo.name), { recursive: true });
}
console.log('Demos copied to', target);
