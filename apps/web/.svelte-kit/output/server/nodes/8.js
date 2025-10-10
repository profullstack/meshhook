import * as server from '../entries/pages/workflows/index/_page.server.js';

export const index = 8;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/workflows/index/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/workflows/index/+page.server.js";
export const imports = ["_app/immutable/nodes/8.DnNeBgsi.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/DLTaHJlt.js","_app/immutable/chunks/BZOnZgKm.js","_app/immutable/chunks/D6SFIRjf.js","_app/immutable/chunks/B9wM4kaC.js","_app/immutable/chunks/C21iDxsO.js","_app/immutable/chunks/Ihp2QH7c.js","_app/immutable/chunks/au-VDWBU.js","_app/immutable/chunks/B90PUMjC.js","_app/immutable/chunks/D5cQzGxD.js","_app/immutable/chunks/jEEpMCDI.js","_app/immutable/chunks/Cb6g15UT.js","_app/immutable/chunks/D5PUuNb2.js"];
export const stylesheets = ["_app/immutable/assets/8.BS8qvyzs.css"];
export const fonts = [];
