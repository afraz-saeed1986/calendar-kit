import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/.angular/**',
      '**/.next/**',
      '**/.turbo/**',
      'apps/docs/out/**',
      'apps/docs/public/demos/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Scripts that run in Node: the tools of this repository and the configs of the bundlers.
    files: ['**/scripts/**/*.mjs', '**/*.config.mjs'],
    languageOptions: {
      globals: { console: 'readonly', process: 'readonly', URL: 'readonly', Buffer: 'readonly' },
    },
  },
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
);
