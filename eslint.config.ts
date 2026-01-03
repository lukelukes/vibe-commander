import * as tsParser from '@typescript-eslint/parser';
import solid from 'eslint-plugin-solid/configs/typescript';

export default [
  {
    ignores: ['**/*.config.ts', '**/*.conf.ts', 'e2e']
  },
  {
    files: ['**/*.{ts,tsx}'],
    ...solid,
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: 'tsconfig.json'
      }
    }
  }
];
