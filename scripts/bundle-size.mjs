// Measures the size of the built packages for the README. Build first (`pnpm turbo run build`),
// then run `pnpm size`. Sizes are minified with esbuild, then compressed (gzip level 9, brotli 11).
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';
import { build, transformSync } from 'esbuild';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packages = join(root, 'packages');

const kb = (bytes) => `${(bytes / 1000).toFixed(1)} kB`;

function measure(bytes) {
  const buffer = Buffer.from(bytes);
  return {
    min: buffer.length,
    gzip: gzipSync(buffer, { level: 9 }).length,
    brotli: brotliCompressSync(buffer, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
    }).length,
  };
}

const row = (name, size) => `| ${name} | ${kb(size.min)} | ${kb(size.gzip)} | ${kb(size.brotli)} |`;
const table = (first) => [`| ${first} | minified | gzip | brotli |`, '| --- | ---: | ---: | ---: |'];

// 1. Each published entry file as a whole, nothing removed by tree shaking.
const whole = [
  ['@calendrix/core', 'core/dist/index.js', 'js'],
  ['@calendrix/react', 'react/dist/index.js', 'js'],
  ['@calendrix/vue', 'vue/dist/index.js', 'js'],
  ['@calendrix/angular', 'angular/dist/calendrix-angular/fesm2022/calendrix-angular.mjs', 'js'],
  ['styles.css', 'react/dist/styles.css', 'css'],
];

const wholeLines = table('Package (entry file)');
for (const [name, file, loader] of whole) {
  const path = join(packages, file);
  if (!existsSync(path)) {
    wholeLines.push(`| ${name} | not built | | |`);
    continue;
  }
  const { code } = transformSync(readFileSync(path, 'utf8'), { minify: true, loader });
  wholeLines.push(row(name, measure(code)));
}

// 2. What an application adds when it imports only some exports. The framework itself is not
// counted (it is the application's own); Floating UI and `@calendrix/core` are.
const REACT = ['react', 'react-dom', 'react/jsx-runtime'];
const VUE = ['vue'];
const named = (names) => `export { ${names.join(', ')} } from './dist/index.js';`;
const all = "export * from './dist/index.js';";

const cases = [
  ['@calendrix/core: createCalendar', 'core', named(['createCalendar']), []],
  ['@calendrix/core: createTimeField', 'core', named(['createTimeField']), []],
  ['@calendrix/core: everything', 'core', all, []],
  ['@calendrix/react: Calendar', 'react', named(['Calendar']), REACT],
  ['@calendrix/react: TimeField', 'react', named(['TimeField']), REACT],
  ['@calendrix/react: DatePicker', 'react', named(['DatePicker']), REACT],
  ['@calendrix/react: DateTimePicker', 'react', named(['DateTimePicker']), REACT],
  ['@calendrix/vue: Calendar', 'vue', named(['Calendar']), VUE],
  ['@calendrix/vue: TimeField', 'vue', named(['TimeField']), VUE],
  ['@calendrix/vue: DatePicker', 'vue', named(['DatePicker']), VUE],
  ['@calendrix/vue: DateTimePicker', 'vue', named(['DateTimePicker']), VUE],
  ['@calendrix/persian (calendar plugin)', 'persian', all, []],
];

const treeLines = table('Import (framework not counted)');
for (const [name, pkg, contents, external] of cases) {
  if (!existsSync(join(packages, pkg, 'dist', 'index.js'))) {
    treeLines.push(`| ${name} | not built | | |`);
    continue;
  }
  try {
    const result = await build({
      stdin: { contents, resolveDir: join(packages, pkg), loader: 'js' },
      bundle: true,
      minify: true,
      format: 'esm',
      platform: 'browser',
      external,
      write: false,
      logLevel: 'silent',
    });
    treeLines.push(row(name, measure(result.outputFiles[0].contents)));
  } catch (error) {
    treeLines.push(`| ${name} | error: ${String(error.message).split('\n')[0]} | | |`);
  }
}

console.log('### Whole packages\n');
console.log(wholeLines.join('\n'));
console.log('\n### What an application adds (tree-shaken)\n');
console.log(treeLines.join('\n'));