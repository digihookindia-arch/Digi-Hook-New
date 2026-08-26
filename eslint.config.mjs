import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

/**
 * ESLint flat config.
 *
 * Replaces .eslintrc.json, which ESLint 9 no longer reads. Two things had to
 * change together: ESLint 9 dropped the legacy format, and Next 16 removed
 * `next lint`, so `npm run lint` was silently passing while linting nothing —
 * it read "lint" as a directory name and exited 0. The script now calls eslint
 * directly, so a failure is a failure.
 *
 * `eslint-config-next/core-web-vitals` is already a flat-config array in v16,
 * so it spreads in as-is — no FlatCompat wrapper needed.
 */
const config = [
  {
    // Flat config has no .eslintignore; ignores live here. Build output and the
    // database directory are not source and must never be linted — `data`
    // especially, since it holds live client records.
    ignores: [
      '.next/**',
      'node_modules/**',
      'data/**',
      'public/**',
      'assets-source/**',
      'design_handoff_digihook_website/**',
      'next-env.d.ts',
    ],
  },
  ...nextCoreWebVitals,
];

export default config;
