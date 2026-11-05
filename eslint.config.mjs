import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'
import reactHooks from 'eslint-plugin-react-hooks'

export default [
  {
    ignores: [
      'node_modules/**',
      '_archive/**',
      '.next/**',
      'out/**',
      'public/**',
      'supabase/migrations/**',
      'scripts/**',
      '.claude/**',
      // The four stray root-level duplicates this used to ignore
      // (ChatInterface.tsx, CommandBar.tsx, Sidebar.tsx,
      // dashboard_layout.tsx) are gone - deleted Nov 2026, the real
      // versions live under components/ and app/. Do not re-add an ignore
      // for a root-level copy of a component: delete the copy instead.
      '*.config.js',
      '*.config.mjs',
      '*.config.ts',
      'next-env.d.ts',
      'tsconfig.tsbuildinfo',
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // HQ.ai project-wide softening
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'react/no-unescaped-entities': 'off',
      '@next/next/no-img-element': 'off',
      'prefer-const': 'warn',
      // Pre-existing patterns across codebase — surface as warnings, not errors
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
]
