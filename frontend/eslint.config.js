import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['coverage/']),
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  reactHooks.configs.flat.recommended,
  {
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // Game rules stay independent of the UI and of storage (§17.1 of the specification).
    files: ['src/domain/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react-dom',
                'react-dom/*',
                '**/app/**',
                '**/storage/**',
                '**/i18n/**',
              ],
              message: 'The domain layer must not depend on the UI, on storage or on texts.',
            },
          ],
        },
      ],
    },
  },
  {
    // Screens reach data only through the storage contract (section 3.7 of the plan).
    files: ['src/app/**/*.{ts,tsx}'],
    ignores: ['src/app/main.tsx', 'src/app/**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/storage/*', '!**/storage/contract', '!**/storage/errors', '!**/storage/ids'],
              message: 'Screens use the storage contract, main.tsx chooses its implementation.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'Screens use the storage contract.' },
        { name: 'localStorage', message: 'Screens use the storage contract.' },
      ],
    },
  },
  {
    // Randomness and time are injected, so every rule is deterministic under test.
    files: ['src/domain/**/*.ts'],
    ignores: ['**/*.test.ts', 'src/domain/testing/**'],
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use the injected rng.' },
        { object: 'Date', property: 'now', message: 'Use the injected now().' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: 'Use the injected now().',
        },
      ],
    },
  },
]);
