import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

const ban = (patterns) => ({
  'no-restricted-imports': ['error', { patterns }],
});

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', 'playwright-report', 'test-results', 'dev-dist', 'src/adapters/out/api/schema.d.ts'] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  reactHooks.configs.flat.recommended,
  {
    languageOptions: {
      globals: globals.browser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
  // Límites hexagonales (se refuerzan con dependency-cruiser en CI).
  {
    files: ['src/domain/**'],
    rules: ban([
      { group: ['react*', 'openapi-fetch', 'idb', 'maplibre-gl'], message: 'domain es TypeScript puro.' },
      { group: ['**/application/**', '**/adapters/**'], message: 'domain no depende de capas externas.' },
    ]),
  },
  {
    files: ['src/application/**'],
    rules: ban([
      { group: ['react*', 'openapi-fetch', 'idb', 'maplibre-gl'], message: 'application no importa librerías.' },
      { group: ['**/adapters/**'], message: 'application solo importa de domain.' },
    ]),
  },
  {
    files: ['**/*.js', '**/*.cjs'],
    ...tseslint.configs.disableTypeChecked,
  },
  { files: ['**/*.cjs'], languageOptions: { globals: { module: 'readonly' } } },
  { files: ['e2e/**', '*.ts'], languageOptions: { globals: globals.node } },
);
