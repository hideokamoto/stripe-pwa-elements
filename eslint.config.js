import js from '@eslint/js';
import globals from 'globals';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import stencilPlugin from '@stencil-community/eslint-plugin';

export default [
  {
    ignores: ['dist/**', 'www/**', 'loader/**', 'node_modules/**', '*.d.ts'],
  },
  js.configs.recommended,
  stencilPlugin.configs.flat.recommended,
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.es2020,
        // Stencil custom element types
        HTMLStripeAddressElementElement: 'readonly',
        HTMLStripeCardElementElement: 'readonly',
        HTMLStripeCardElementModalElement: 'readonly',
        HTMLStripeModalElement: 'readonly',
        HTMLStripePaymentRequestButtonElement: 'readonly',
        HTMLStripePaymentSheetElement: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      '@stencil-community': stencilPlugin,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // Disable base rules that are handled by TypeScript ESLint
      'no-unused-vars': 'off',
      'no-undef': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-prototype-builtins': 'off',
      '@stencil-community/async-methods': 'error',
      '@stencil-community/ban-prefix': ['error', ['stencil', 'stnl']],
      '@stencil-community/decorators-context': 'error',
      '@stencil-community/decorators-style': [
        'warn',
        {
          prop: 'inline',
          state: 'inline',
          element: 'inline',
          event: 'inline',
          method: 'multiline',
          watch: 'multiline',
          listen: 'multiline',
        },
      ],
      '@stencil-community/element-type': 'error',
      '@stencil-community/host-data-deprecated': 'error',
      '@stencil-community/methods-must-be-public': 'error',
      '@stencil-community/no-unused-watch': 'error',
      '@stencil-community/own-methods-must-be-private': 'error',
      '@stencil-community/own-props-must-be-private': 'error',
      '@stencil-community/prefer-vdom-listener': 'error',
      '@stencil-community/props-must-be-public': 'error',
      '@stencil-community/props-must-be-readonly': 'off',
      '@stencil-community/render-returns-host': 'error',
      '@stencil-community/required-jsdoc': 'error',
      '@stencil-community/reserved-member-names': 'error',
      '@stencil-community/single-export': 'error',
      '@stencil-community/strict-mutable': 'warn',
      'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: ['const', 'let', 'var', 'block', 'block-like'], next: '*' },
        { blankLine: 'any', prev: ['const', 'let', 'var'], next: ['const', 'let', 'var'] },
      ],
      curly: 'error',
    },
  },
  // Test files configuration
  {
    files: ['src/**/*.spec.ts', 'src/**/*.spec.tsx', 'src/**/*.e2e.ts', 'src/**/*.e2e.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.es2020,
        ...globals.jest,
        // Stencil custom element types
        HTMLStripeAddressElementElement: 'readonly',
        HTMLStripeCardElementElement: 'readonly',
        HTMLStripeCardElementModalElement: 'readonly',
        HTMLStripeModalElement: 'readonly',
        HTMLStripePaymentRequestButtonElement: 'readonly',
        HTMLStripePaymentSheetElement: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      '@stencil-community': stencilPlugin,
    },
    rules: {
      // Disable base rules that are handled by TypeScript ESLint
      'no-unused-vars': 'off',
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-empty-function': 'off',
      // Relax padding rules for tests
      'padding-line-between-statements': 'off',
      // Relax stencil rules for test files
      '@stencil-community/required-jsdoc': 'off',
    },
  },
];
