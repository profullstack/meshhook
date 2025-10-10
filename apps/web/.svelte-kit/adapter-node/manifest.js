export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["favicon.png"]),
	mimeTypes: {".png":"image/png"},
	_: {
		client: {start:"_app/immutable/entry/start.BNeWg0Qc.js",app:"_app/immutable/entry/app.UCj-s7Sm.js",imports:["_app/immutable/entry/start.BNeWg0Qc.js","_app/immutable/chunks/jEEpMCDI.js","_app/immutable/chunks/Cb6g15UT.js","_app/immutable/chunks/DLTaHJlt.js","_app/immutable/chunks/BZOnZgKm.js","_app/immutable/chunks/D5PUuNb2.js","_app/immutable/chunks/D5cQzGxD.js","_app/immutable/entry/app.UCj-s7Sm.js","_app/immutable/chunks/C1FmrZbK.js","_app/immutable/chunks/DLTaHJlt.js","_app/immutable/chunks/BZOnZgKm.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/Cb6g15UT.js","_app/immutable/chunks/D5PUuNb2.js","_app/immutable/chunks/D6SFIRjf.js","_app/immutable/chunks/Ck7ZZh2V.js","_app/immutable/chunks/B90PUMjC.js","_app/immutable/chunks/D5cQzGxD.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js')),
			__memo(() => import('./nodes/5.js')),
			__memo(() => import('./nodes/6.js')),
			__memo(() => import('./nodes/7.js')),
			__memo(() => import('./nodes/8.js')),
			__memo(() => import('./nodes/9.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/api/hooks/[slug]",
				pattern: /^\/api\/hooks\/([^/]+?)\/?$/,
				params: [{"name":"slug","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/hooks/_slug_/_server.js'))
			},
			{
				id: "/api/runs",
				pattern: /^\/api\/runs\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/runs/_server.js'))
			},
			{
				id: "/api/secrets",
				pattern: /^\/api\/secrets\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/secrets/_server.js'))
			},
			{
				id: "/api/secrets/[id]",
				pattern: /^\/api\/secrets\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/secrets/_id_/_server.js'))
			},
			{
				id: "/api/workflows",
				pattern: /^\/api\/workflows\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/workflows/_server.js'))
			},
			{
				id: "/api/workflows/[id]",
				pattern: /^\/api\/workflows\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/workflows/_id_/_server.js'))
			},
			{
				id: "/api/workflows/[id]/versions",
				pattern: /^\/api\/workflows\/([^/]+?)\/versions\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/workflows/_id_/versions/_server.js'))
			},
			{
				id: "/auth/login",
				pattern: /^\/auth\/login\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/auth/logout",
				pattern: /^\/auth\/logout\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/auth/logout/_server.js'))
			},
			{
				id: "/runs",
				pattern: /^\/runs\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/runs/[id]",
				pattern: /^\/runs\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/secrets",
				pattern: /^\/secrets\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/workflows/index",
				pattern: /^\/workflows\/index\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 8 },
				endpoint: null
			},
			{
				id: "/workflows/new",
				pattern: /^\/workflows\/new\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 9 },
				endpoint: null
			},
			{
				id: "/workflows/[id]/edit",
				pattern: /^\/workflows\/([^/]+?)\/edit\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 7 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();

export const prerendered = new Set([]);

export const base = "";