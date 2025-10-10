import { sveltekit } from '@sveltejs/kit/vite';

export default {
	plugins: [sveltekit()],
	ssr: {
		// Mark worker modules as external so they're not bundled
		// They'll be resolved at runtime from the monorepo root
		noExternal: []
	},
	build: {
		rollupOptions: {
			external: [/^\.\.\/\.\.\/workers\//]
		}
	}
};