import js from '@eslint/js'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

export default [
  { ignores: ['**/dist/**', '**/node_modules/**'] },
  js.configs.recommended,
  {
    files: ['server/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      // Express error handlers need the 4-arg (err, req, res, next) signature
      // even when `next` is unused; allow it and the `_`-prefix convention.
      'no-unused-vars': ['error', { argsIgnorePattern: '^_|^next$', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['client/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { react, 'react-hooks': reactHooks },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.recommended.rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // New JSX transform — React need not be in scope, and prop-types is unused here.
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
  },
]
