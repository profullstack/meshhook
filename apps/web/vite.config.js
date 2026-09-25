import { sveltekit } from '@sveltejs/kit/vite';

/**
 * @profullstack/libsql-pg sits on `pg`, which tries an optional native binding
 * (pg-native) with a dynamic require that Rollup cannot follow. Marking both
 * external leaves the import in place for Node to resolve from node_modules at
 * runtime, which is what adapter-node expects anyway.
 */
const NATIVE_DEPS = ['@profullstack/libsql-pg', 'pg', 'pg-native'];

export default {
	plugins: [sveltekit()],
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
