
// this file is generated — do not edit it


/// <reference types="@sveltejs/kit" />

/**
 * Environment variables [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env`. Like [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), this module cannot be imported into client-side code. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured).
 * 
 * _Unlike_ [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), the values exported from this module are statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * ```ts
 * import { API_KEY } from '$env/static/private';
 * ```
 * 
 * Note that all environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * 
 * ```
 * MY_FEATURE_FLAG=""
 * ```
 * 
 * You can override `.env` values from the command line like so:
 * 
 * ```sh
 * MY_FEATURE_FLAG="enabled" npm run dev
 * ```
 */
declare module '$env/static/private' {
	export const DATABASE_URL: string;
	export const SUPABASE_SERVICE_ROLE_KEY: string;
	export const ORIGIN: string;
	export const NODE_ENV: string;
	export const PORT: string;
	export const SHELL: string;
	export const LSCOLORS: string;
	export const npm_command: string;
	export const SESSION_MANAGER: string;
	export const COLORTERM: string;
	export const XDG_CONFIG_DIRS: string;
	export const LESS: string;
	export const XDG_SESSION_PATH: string;
	export const NVM_INC: string;
	export const XDG_MENU_PREFIX: string;
	export const TERM_PROGRAM_VERSION: string;
	export const ICEAUTHORITY: string;
	export const NODE: string;
	export const SSH_AUTH_SOCK: string;
	export const npm_config_verify_deps_before_run: string;
	export const GRADLE_HOME: string;
	export const npm_config__jsr_registry: string;
	export const MEMORY_PRESSURE_WRITE: string;
	export const DESKTOP_SESSION: string;
	export const GTK_RC_FILES: string;
	export const NO_AT_BRIDGE: string;
	export const EDITOR: string;
	export const npm_config__profullstack_registry: string;
	export const XDG_SEAT: string;
	export const PWD: string;
	export const LOGNAME: string;
	export const XDG_SESSION_DESKTOP: string;
	export const XDG_SESSION_TYPE: string;
	export const PNPM_HOME: string;
	export const SYSTEMD_EXEC_PID: string;
	export const XAUTHORITY: string;
	export const MOTD_SHOWN: string;
	export const XKB_DEFAULT_MODEL: string;
	export const GTK2_RC_FILES: string;
	export const HOME: string;
	export const LANG: string;
	export const LS_COLORS: string;
	export const XDG_CURRENT_DESKTOP: string;
	export const MEMORY_PRESSURE_WATCH: string;
	export const WAYLAND_DISPLAY: string;
	export const DENO_INSTALL: string;
	export const XDG_SEAT_PATH: string;
	export const INVOCATION_ID: string;
	export const pnpm_config_verify_deps_before_run: string;
	export const MANAGERPID: string;
	export const PROMPT: string;
	export const INIT_CWD: string;
	export const CHROME_DESKTOP: string;
	export const KDE_SESSION_UID: string;
	export const npm_lifecycle_script: string;
	export const NVM_DIR: string;
	export const XKB_DEFAULT_LAYOUT: string;
	export const GEM_HOME: string;
	export const XDG_SESSION_CLASS: string;
	export const TERM: string;
	export const npm_package_name: string;
	export const ZSH: string;
	export const npm_config_enable_pre_post_scripts: string;
	export const USER: string;
	export const npm_config_frozen_lockfile: string;
	export const CUDA_PATH: string;
	export const QT_WAYLAND_RECONNECT: string;
	export const KDE_SESSION_VERSION: string;
	export const PAM_KWALLET5_LOGIN: string;
	export const AMDAPPSDKROOT: string;
	export const PROMPT_EOL_MARK: string;
	export const DISPLAY: string;
	export const npm_lifecycle_event: string;
	export const SHLVL: string;
	export const NVM_CD_FLAGS: string;
	export const PAGER: string;
	export const XDG_VTNR: string;
	export const XDG_SESSION_ID: string;
	export const MANAGERPIDFDID: string;
	export const npm_config_user_agent: string;
	export const PNPM_SCRIPT_SRC_DIR: string;
	export const npm_execpath: string;
	export const XDG_RUNTIME_DIR: string;
	export const NODE_PATH: string;
	export const MKLROOT: string;
	export const PYENV_ROOT: string;
	export const DEBUGINFOD_URLS: string;
	export const NVCC_CCBIN: string;
	export const npm_package_json: string;
	export const BUN_INSTALL: string;
	export const JOURNAL_STREAM: string;
	export const XDG_DATA_DIRS: string;
	export const KDE_FULL_SESSION: string;
	export const GDK_BACKEND: string;
	export const NOSTR_PRIVATE_KEY: string;
	export const PATH: string;
	export const npm_config_node_gyp: string;
	export const ORIGINAL_XDG_CURRENT_DESKTOP: string;
	export const DBUS_SESSION_BUS_ADDRESS: string;
	export const KDE_APPLICATIONS_AS_SCOPE: string;
	export const MAIL: string;
	export const NVM_BIN: string;
	export const npm_config_registry: string;
	export const XKB_DEFAULT_OPTIONS: string;
	export const npm_node_execpath: string;
	export const OLDPWD: string;
	export const TERM_PROGRAM: string;
	export const VITE_USER_NODE_ENV: string;
}

/**
 * Similar to [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private), except that it only includes environment variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Values are replaced statically at build time.
 * 
 * ```ts
 * import { PUBLIC_BASE_URL } from '$env/static/public';
 * ```
 */
declare module '$env/static/public' {
	export const PUBLIC_SUPABASE_URL: string;
	export const PUBLIC_SUPABASE_ANON_KEY: string;
}

/**
 * This module provides access to runtime environment variables, as defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured).
 * 
 * This module cannot be imported into client-side code.
 * 
 * ```ts
 * import { env } from '$env/dynamic/private';
 * console.log(env.DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` always includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 */
declare module '$env/dynamic/private' {
	export const env: {
		DATABASE_URL: string;
		SUPABASE_SERVICE_ROLE_KEY: string;
		ORIGIN: string;
		NODE_ENV: string;
		PORT: string;
		SHELL: string;
		LSCOLORS: string;
		npm_command: string;
		SESSION_MANAGER: string;
		COLORTERM: string;
		XDG_CONFIG_DIRS: string;
		LESS: string;
		XDG_SESSION_PATH: string;
		NVM_INC: string;
		XDG_MENU_PREFIX: string;
		TERM_PROGRAM_VERSION: string;
		ICEAUTHORITY: string;
		NODE: string;
		SSH_AUTH_SOCK: string;
		npm_config_verify_deps_before_run: string;
		GRADLE_HOME: string;
		npm_config__jsr_registry: string;
		MEMORY_PRESSURE_WRITE: string;
		DESKTOP_SESSION: string;
		GTK_RC_FILES: string;
		NO_AT_BRIDGE: string;
		EDITOR: string;
		npm_config__profullstack_registry: string;
		XDG_SEAT: string;
		PWD: string;
		LOGNAME: string;
		XDG_SESSION_DESKTOP: string;
		XDG_SESSION_TYPE: string;
		PNPM_HOME: string;
		SYSTEMD_EXEC_PID: string;
		XAUTHORITY: string;
		MOTD_SHOWN: string;
		XKB_DEFAULT_MODEL: string;
		GTK2_RC_FILES: string;
		HOME: string;
		LANG: string;
		LS_COLORS: string;
		XDG_CURRENT_DESKTOP: string;
		MEMORY_PRESSURE_WATCH: string;
		WAYLAND_DISPLAY: string;
		DENO_INSTALL: string;
		XDG_SEAT_PATH: string;
		INVOCATION_ID: string;
		pnpm_config_verify_deps_before_run: string;
		MANAGERPID: string;
		PROMPT: string;
		INIT_CWD: string;
		CHROME_DESKTOP: string;
		KDE_SESSION_UID: string;
		npm_lifecycle_script: string;
		NVM_DIR: string;
		XKB_DEFAULT_LAYOUT: string;
		GEM_HOME: string;
		XDG_SESSION_CLASS: string;
		TERM: string;
		npm_package_name: string;
		ZSH: string;
		npm_config_enable_pre_post_scripts: string;
		USER: string;
		npm_config_frozen_lockfile: string;
		CUDA_PATH: string;
		QT_WAYLAND_RECONNECT: string;
		KDE_SESSION_VERSION: string;
		PAM_KWALLET5_LOGIN: string;
		AMDAPPSDKROOT: string;
		PROMPT_EOL_MARK: string;
		DISPLAY: string;
		npm_lifecycle_event: string;
		SHLVL: string;
		NVM_CD_FLAGS: string;
		PAGER: string;
		XDG_VTNR: string;
		XDG_SESSION_ID: string;
		MANAGERPIDFDID: string;
		npm_config_user_agent: string;
		PNPM_SCRIPT_SRC_DIR: string;
		npm_execpath: string;
		XDG_RUNTIME_DIR: string;
		NODE_PATH: string;
		MKLROOT: string;
		PYENV_ROOT: string;
		DEBUGINFOD_URLS: string;
		NVCC_CCBIN: string;
		npm_package_json: string;
		BUN_INSTALL: string;
		JOURNAL_STREAM: string;
		XDG_DATA_DIRS: string;
		KDE_FULL_SESSION: string;
		GDK_BACKEND: string;
		NOSTR_PRIVATE_KEY: string;
		PATH: string;
		npm_config_node_gyp: string;
		ORIGINAL_XDG_CURRENT_DESKTOP: string;
		DBUS_SESSION_BUS_ADDRESS: string;
		KDE_APPLICATIONS_AS_SCOPE: string;
		MAIL: string;
		NVM_BIN: string;
		npm_config_registry: string;
		XKB_DEFAULT_OPTIONS: string;
		npm_node_execpath: string;
		OLDPWD: string;
		TERM_PROGRAM: string;
		VITE_USER_NODE_ENV: string;
		[key: `PUBLIC_${string}`]: undefined;
		[key: `${string}`]: string | undefined;
	}
}

/**
 * Similar to [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), but only includes variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Note that public dynamic environment variables must all be sent from the server to the client, causing larger network requests — when possible, use `$env/static/public` instead.
 * 
 * ```ts
 * import { env } from '$env/dynamic/public';
 * console.log(env.PUBLIC_DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 */
declare module '$env/dynamic/public' {
	export const env: {
		PUBLIC_SUPABASE_URL: string;
		PUBLIC_SUPABASE_ANON_KEY: string;
		[key: `PUBLIC_${string}`]: string | undefined;
	}
}
