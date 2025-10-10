
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/api" | "/api/hooks" | "/api/hooks/[slug]" | "/api/runs" | "/api/secrets" | "/api/secrets/[id]" | "/api/workflows" | "/api/workflows/[id]" | "/api/workflows/[id]/versions" | "/auth" | "/auth/login" | "/auth/logout" | "/runs" | "/runs/[id]" | "/secrets" | "/workflows" | "/workflows/index" | "/workflows/new" | "/workflows/[id]" | "/workflows/[id]/edit";
		RouteParams(): {
			"/api/hooks/[slug]": { slug: string };
			"/api/secrets/[id]": { id: string };
			"/api/workflows/[id]": { id: string };
			"/api/workflows/[id]/versions": { id: string };
			"/runs/[id]": { id: string };
			"/workflows/[id]": { id: string };
			"/workflows/[id]/edit": { id: string }
		};
		LayoutParams(): {
			"/": { slug?: string; id?: string };
			"/api": { slug?: string; id?: string };
			"/api/hooks": { slug?: string };
			"/api/hooks/[slug]": { slug: string };
			"/api/runs": Record<string, never>;
			"/api/secrets": { id?: string };
			"/api/secrets/[id]": { id: string };
			"/api/workflows": { id?: string };
			"/api/workflows/[id]": { id: string };
			"/api/workflows/[id]/versions": { id: string };
			"/auth": Record<string, never>;
			"/auth/login": Record<string, never>;
			"/auth/logout": Record<string, never>;
			"/runs": { id?: string };
			"/runs/[id]": { id: string };
			"/secrets": Record<string, never>;
			"/workflows": { id?: string };
			"/workflows/index": Record<string, never>;
			"/workflows/new": Record<string, never>;
			"/workflows/[id]": { id: string };
			"/workflows/[id]/edit": { id: string }
		};
		Pathname(): "/" | "/api" | "/api/" | "/api/hooks" | "/api/hooks/" | `/api/hooks/${string}` & {} | `/api/hooks/${string}/` & {} | "/api/runs" | "/api/runs/" | "/api/secrets" | "/api/secrets/" | `/api/secrets/${string}` & {} | `/api/secrets/${string}/` & {} | "/api/workflows" | "/api/workflows/" | `/api/workflows/${string}` & {} | `/api/workflows/${string}/` & {} | `/api/workflows/${string}/versions` & {} | `/api/workflows/${string}/versions/` & {} | "/auth" | "/auth/" | "/auth/login" | "/auth/login/" | "/auth/logout" | "/auth/logout/" | "/runs" | "/runs/" | `/runs/${string}` & {} | `/runs/${string}/` & {} | "/secrets" | "/secrets/" | "/workflows" | "/workflows/" | "/workflows/index" | "/workflows/index/" | "/workflows/new" | "/workflows/new/" | `/workflows/${string}` & {} | `/workflows/${string}/` & {} | `/workflows/${string}/edit` & {} | `/workflows/${string}/edit/` & {};
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/favicon.png" | string & {};
	}
}