import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      // Strict type-checked rules for maximum type safety
      tseslint.configs.strictTypeChecked,
      // Stylistic rules for consistent code style
      tseslint.configs.stylisticTypeChecked,
      // React hooks rules
      reactHooks.configs.flat.recommended,
      // React-specific lint rules
      reactX.configs['recommended-typescript'],
      // React DOM lint rules
      reactDom.configs.recommended,
      // React refresh for HMR
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
])
