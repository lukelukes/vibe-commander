import * as tsParser from '@typescript-eslint/parser';
import solid from 'eslint-plugin-solid/configs/typescript';

export default [
  {
    ignores: ['**/*.config.ts']
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
