module.exports = {
  root: true,

  extends: ['@metamask/eslint-config'],

  overrides: [
    {
      files: ['*.ts'],
      extends: ['@metamask/eslint-config-typescript'],
    },

    {
      files: ['*.js'],
      parserOptions: {
        sourceType: 'script',
      },
      extends: ['@metamask/eslint-config-nodejs'],
    },

    {
      files: ['yarn.config.cjs'],
      parserOptions: {
        sourceType: 'script',
        ecmaVersion: 2020,
      },
      settings: {
        jsdoc: {
          mode: 'typescript',
        },
      },
      extends: ['@metamask/eslint-config-nodejs'],
    },

    {
      files: ['*.test.ts', '*.test.js'],
      extends: [
        '@metamask/eslint-config-jest',
        '@metamask/eslint-config-nodejs',
      ],
    },
    {
      files: ['src/SwapsController.ts'],
      rules: {
        'accessor-pairs': 'off',
        'consistent-return': 'off',
        'no-async-promise-executor': 'off',
        '@typescript-eslint/prefer-optional-chain': 'off',
        'no-restricted-syntax': 'off',
        'import/no-named-as-default': 'off',
      },
    },
    {
      files: ['src/SwapsController.test.ts'],
      rules: {
        'no-new': 'off',
      },
    },
    {
      files: ['src/swapsInterfaces.ts'],
      rules: {
        '@typescript-eslint/naming-convention': 'off',
      },
    },
    {
      files: ['src/swapsUtil.ts'],
      rules: {
        'consistent-return': 'off',
        'no-negated-condition': 'off',
        '@typescript-eslint/naming-convention': 'off',
      },
    },
    {
      files: ['src/swapsUtil.test.ts'],
      rules: {
        'jest/require-to-throw-message': 'off',
        '@typescript-eslint/naming-convention': 'off',
        'no-restricted-globals': 'off',
      },
    },
  ],
  ignorePatterns: [
    '!.eslintrc.js',
    '!.prettierrc.js',
    'dist/',
    'docs/',
    '.yarn/',
  ],
};
