import { defineConfig } from 'vitest/config';

/**
 * One run covers every package.
 *
 * All current tests are pure functions, so they run in node - no jsdom, no
 * testing-library. Add a browser-ish project only when there is a component
 * whose behaviour cannot be expressed as a function.
 */
export default defineConfig({
	test: {
		projects: [
			{
				test: {
					name: 'shared',
					root: './packages/shared',
					environment: 'node',
					include: ['src/**/*.test.ts'],
				},
			},
			{
				test: {
					name: 'api',
					root: './packages/api',
					environment: 'node',
					include: ['src/**/*.test.ts'],
				},
			},
			{
				test: {
					name: 'web',
					root: './packages/web',
					environment: 'node',
					include: ['src/**/*.test.ts'],
				},
			},
			{
				test: {
					name: 'scripts',
					root: './scripts',
					environment: 'node',
					include: ['**/*.test.mjs'],
				},
			},
		],
	},
});
