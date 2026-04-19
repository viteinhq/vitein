import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: '../openapi-spec/vitein.yaml',
  output: {
    path: 'src/generated',
    postProcess: ['prettier'],
  },
  plugins: [
    {
      name: '@hey-api/client-fetch',
    },
    '@hey-api/sdk',
    '@hey-api/typescript',
  ],
});
