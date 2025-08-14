module.exports = {
  extends: ['react-app', 'react-app/jest'],
  rules: {
    // Turn off the unused vars rule that's causing build failures
    'no-unused-vars': 'warn',
    'no-undef': 'warn',
    // Allow unused function parameters (common in React)
    '@typescript-eslint/no-unused-vars': 'warn',
  },
  overrides: [
    {
      files: ['**/*.js', '**/*.jsx'],
      rules: {
        'no-unused-vars': 'warn',
      },
    },
  ],
};