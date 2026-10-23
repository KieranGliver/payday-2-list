import { build } from 'esbuild';

/**
 * Bundles the handler to a single ESM file for Lambda.
 *
 * The AWS SDK ships CommonJS that calls require() at runtime (e.g.
 * require('node:https')), which has no meaning in an ESM module. The banner
 * reinstates a working `require` via createRequire so those calls resolve.
 */
await build({
  entryPoints: ['src/lambda.ts'],
  outfile: 'dist/index.mjs',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  minify: true,
  sourcemap: false,
  banner: {
    js: [
      "import { createRequire as __createRequire } from 'node:module';",
      'const require = __createRequire(import.meta.url);',
    ].join('\n'),
  },
  logLevel: 'info',
});
