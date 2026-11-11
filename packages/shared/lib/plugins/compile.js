/**
 * Plugins: one declarative spec per service (./catalog.js), compiled into the
 * same request an httpCall node makes. Nothing service-specific runs here, so
 * a new plugin is data, not code, and a plugin step behaves exactly like an
 * httpCall (templates, retries, x402, executed_on) because it is one.
 *
 * A plugin node is saved as
 *   data: { type: 'plugin', config: { plugin, action, params: { name: value }, credential } }
 * where `credential` is the name of a workflow secret holding the API key.
 */

import { PLUGINS } from './catalog.js';

export const PLUGIN_KIND = 'plugin';

export function getPlugin(id) {
	return PLUGINS.find((p) => p.id === id) ?? null;
}

export function getAction(plugin, actionId) {
	return plugin?.actions?.find((a) => a.id === actionId) ?? null;
}

/** The secret name a plugin's key is stored under unless the node says otherwise. */
export function defaultCredential(plugin) {
	return plugin?.auth?.secret ?? `${plugin.id.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_API_KEY`;
}

const isBlank = (v) => v === undefined || v === null || v === '';

/** "true"/"42"/'{"a":1}' typed in a form become the JSON the API expects. */
function coerce(value, type) {
	if (typeof value !== 'string') return value;
	// A template is resolved at run time; leave it as typed.
	if (value.includes('{{')) return value;
	if (type === 'number' && value.trim() !== '' && !Number.isNaN(Number(value))) return Number(value);
	if (type === 'boolean') return value === 'true' ? true : value === 'false' ? false : value;
	if (type === 'json') {
		try {
			return JSON.parse(value);
		} catch {
			return value;
		}
	}
	return value;
}

export class PluginConfigError extends Error {}

/**
 * Plugin node config -> httpCall config. Throws PluginConfigError with a
 * message fit for the run log when the node is incomplete.
 */
export function compilePluginCall(config = {}) {
	const plugin = getPlugin(config.plugin);
	if (!plugin) throw new PluginConfigError(`unknown plugin "${config.plugin}"`);
	const action = getAction(plugin, config.action);
	if (!action) throw new PluginConfigError(`${plugin.name}: pick an action`);

	const params = config.params ?? {};
	let path = action.path;
	const query = {};
	const body = {};
	const headers = { Accept: 'application/json' };

	for (const p of action.params ?? []) {
		const raw = params[p.name];
		if (isBlank(raw)) {
			if (p.default !== undefined) {
				// fall through with the default
			} else if (p.required) {
				throw new PluginConfigError(`${plugin.name} ${action.label}: "${p.label ?? p.name}" is required`);
			} else continue;
		}
		const value = coerce(isBlank(raw) ? p.default : raw, p.type);
		if (p.in === 'path') path = path.replace(`{${p.name}}`, encodeURIComponent(String(value)));
		else if (p.in === 'query') query[p.name] = value;
		else if (p.in === 'header') headers[p.name] = String(value);
		else body[p.name] = value;
	}

	// A raw JSON body (for fields the spec does not list) merges under the named ones.
	if (!isBlank(params.$body)) {
		// Parsed even when it holds {{templates}}: they sit inside JSON strings.
		let extra = params.$body;
		if (typeof extra === 'string') {
			try {
				extra = JSON.parse(extra);
			} catch {
				throw new PluginConfigError(`${plugin.name} ${action.label}: extra JSON body fields are not valid JSON`);
			}
		}
		if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
			for (const [k, v] of Object.entries(extra)) if (!(k in body)) body[k] = v;
		}
	}

	const auth = plugin.auth ?? { type: 'none' };
	const credential = isBlank(config.credential) ? defaultCredential(plugin) : String(config.credential).trim();
	if (auth.type !== 'none') {
		if (!/^[A-Za-z0-9_.-]+$/.test(credential)) throw new PluginConfigError(`${plugin.name}: "${credential}" is not a valid secret name`);
		const ref = `{{$secrets.${credential}}}`;
		if (auth.type === 'query') query[auth.param] = ref;
		else headers[auth.header ?? 'Authorization'] = `${auth.prefix ?? (auth.type === 'bearer' ? 'Bearer ' : '')}${ref}`;
	}

	const method = (action.method ?? 'GET').toUpperCase();
	const sendsBody = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
	return {
		method,
		url: plugin.baseUrl.replace(/\/$/, '') + path,
		headers,
		queryParams: Object.keys(query).length ? query : undefined,
		// An explicit empty object stops httpCall from forwarding the node input.
		body: sendsBody ? (Object.keys(body).length ? body : method === 'DELETE' ? undefined : {}) : undefined,
		timeout: action.timeout ?? 30_000,
		secretsUsed: auth.type === 'none' ? [] : [credential]
	};
}

/** The output a plugin step hands downstream: the response body, plus its status. */
export function pluginOutput(httpOut) {
	const data = httpOut?.data;
	if (data && typeof data === 'object' && !Array.isArray(data)) return { ...data, $status: httpOut.status };
	return { data, $status: httpOut?.status };
}

/** What the builder's palette and config form need (no functions, JSON-safe). */
export function pluginCatalog() {
	return PLUGINS.map((p) => ({ ...p, credential: defaultCredential(p) }));
}
