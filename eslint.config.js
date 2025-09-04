import js from '@eslint/js'
import globals from 'globals'

export default [
  { ignores: ['dist', 'node_modules'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      // Relax some rules for this project
      'no-unused-vars': 'warn',
      'no-undef': 'warn',
    },
  },
  {
    // Node.js configuration for server files
    files: ['server/**/*.js', 'vite.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
]
