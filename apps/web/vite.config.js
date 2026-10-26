import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';

/**
 * @profullstack/libsql-pg sits on `pg`, which tries an optional native binding
 * (pg-native) with a dynamic require that Rollup cannot follow. Marking both
 * external leaves the import in place for Node to resolve from node_modules at
 * runtime, which is what adapter-node expects anyway.
 */
const NATIVE_DEPS = ['@profullstack/libsql-pg', 'pg', 'pg-native'];

export default {
	// SvelteKit 3 takes its config here; svelte.config.js is no longer read.
	plugins: [
		sveltekit({
			adapter: adapter(),
			alias: {
				$lib: './src/lib',
				$components: './src/lib/components',
				$stores: './src/lib/stores',
				$utils: './src/lib/utils'
			}
		})
	],
	ssr: {
		// Mark worker modules as external so they're not bundled
		// They'll be resolved at runtime from the monorepo root
		noExternal: [],
		external: NATIVE_DEPS
	},
	optimizeDeps: {
		exclude: NATIVE_DEPS
	},
	build: {
		rollupOptions: {
			external: [/^\.\.\/\.\.\/workers\//, ...NATIVE_DEPS, /^pg-/]
		}
	}
};
