import base from '@vitein/config/eslint';
import svelte from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';

export default [
  ...base,
  ...svelte.configs['flat/recommended'],
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: '@typescript-eslint/parser',
        extraFileExtensions: ['.svelte'],
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      },
    },
  },
  {
    // SvelteKit's `error()` and `fail()` helpers return tagged values that are
    // thrown by convention but are not `Error` instances. Zod validators also
    // throw plain errors with structured details.
    rules: {
      '@typescript-eslint/only-throw-error': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
    },
  },
  {
    ignores: ['.svelte-kit/**', 'build/**', 'dist/**'],
  },
];
