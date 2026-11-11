/**
 * Every Profullstack service meshhook can call, as data. See ./compile.js for
 * the shape. Each action names the route file or doc it was taken from in
 * `source`, so a broken plugin can be traced to the API that moved.
 *
 * auth.type: 'bearer' (Authorization: Bearer <key>), 'header' (auth.header,
 * optional auth.prefix), 'query' (auth.param) or 'none'. auth.secret is the
 * default workflow-secret name the key is read from.
 */

export const PLUGINS = [
	{
		id: 'pitworld-ip',
		name: 'my.ip.pit.world',
		icon: '📍',
		category: 'Network',
		url: 'https://my.ip.pit.world',
		description: 'Public IPv4 + IPv6 of the machine running the step',
		baseUrl: 'https://my.ip.pit.world',
		auth: { type: 'none' },
		actions: [
			{
				id: 'myIp',
				label: 'Get my IP',
				method: 'GET',
				path: '/',
				description: 'IPv4 and IPv6 merged into one answer',
				params: [{ name: 'format', in: 'query', type: 'string', default: 'json', description: 'json or text' }],
				source: 'https://my.ip.pit.world/?format=json'
			}
		]
	}
];
