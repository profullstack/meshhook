import * as server from '../entries/pages/_layout.server.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/+layout.server.js";
export const imports = ["_app/immutable/nodes/0.CUUJ60T2.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/DLTaHJlt.js","_app/immutable/chunks/D5PUuNb2.js"];
export const stylesheets = ["_app/immutable/assets/0.C-xL7LaS.css"];
export const fonts = [];
