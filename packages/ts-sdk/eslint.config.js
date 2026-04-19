import base from '@vitein/config/eslint';

export default [
  ...base,
  {
    ignores: ['src/generated/**'],
  },
];
