import js from '@eslint/js'
import globals from 'globals'

export default [
  js.configs.recommended,
  {
    ignores: ['_site/', 'node_modules/'],
  },
  {
    files: ['assets/js/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        Stripe: 'readonly',
      },
    },
  },
  {
    files: ['worker/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.serviceworker,
      },
    },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        Stripe: 'readonly',
      },
    },
  },
  {
    files: ['e2e/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },
  {
    files: ['vitest.config.js', 'playwright.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
]
