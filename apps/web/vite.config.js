import { sveltekit } from '@sveltejs/kit/vite';

/**
 * @libsql/client loads a platform-specific native binding (e.g.
 * @libsql/linux-x64-gnu) with a dynamic require. Rollup cannot follow that, so
 * bundling it fails the build with "Could not dynamically require". Marking it
 * external leaves the import in place for Node to resolve from node_modules at
 * runtime, which is what adapter-node expects anyway.
 *
 * Keep `libsql` alongside it — that is the package holding the bindings.
 */
const NATIVE_DEPS = ['@libsql/client', 'libsql'];

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
			external: [/^\.\.\/\.\.\/workers\//, ...NATIVE_DEPS, /^@libsql\//]
		}
	}
};
