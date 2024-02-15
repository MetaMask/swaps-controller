module.exports = {
  root: true,

  extends: ['@metamask/eslint-config'],

  overrides: [
    {
      files: ['*.ts'],
      extends: ['@metamask/eslint-config-typescript'],
    },

    {
      files: ['*.d.ts'],
      parserOptions: {
        sourceType: 'script',
      },
    },

    {
      files: ['*.js'],
      parserOptions: {
        sourceType: 'script',
      },
      extends: ['@metamask/eslint-config-nodejs'],
    },

    {
      files: ['*.test.ts', '*.test.js'],
      extends: ['@metamask/eslint-config-jest'],
    },

    // TODO: Enable these
    {
      files: ['src/SwapsController.ts'],
      rules: {
        'accessor-pairs': 'off',
        'consistent-return': 'off',
        'no-async-promise-executor': 'off',
        '@typescript-eslint/prefer-optional-chain': 'off',
        // ignoring this to avoid changing the controller interface
        'no-restricted-syntax': 'off',
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
        // disabling this since enums affected are used in other controllers/clients
        '@typescript-eslint/naming-convention': 'off',
      },
    },
    {
      files: ['src/swapsUtil.ts'],
      rules: {
        'consistent-return': 'off',
        'no-negated-condition': 'off',
        // disabling this since enums affected are used in other controllers/clients
        '@typescript-eslint/naming-convention': 'off',
      },
    },
    {
      files: ['src/swapsUtil.test.ts'],
      rules: {
        'jest/require-to-throw-message': 'off',
        // disabling this since enums affected are used in other controllers/clients
        '@typescript-eslint/naming-convention': 'off',
        'no-restricted-globals': 'off',
      },
    },
  ],

  ignorePatterns: ['!.eslintrc.js', '!.prettierrc.js', 'dist/'],
};
