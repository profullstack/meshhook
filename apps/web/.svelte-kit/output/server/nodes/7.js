import * as server from '../entries/pages/workflows/_id_/edit/_page.server.js';

export const index = 7;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/workflows/_id_/edit/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/workflows/[id]/edit/+page.server.js";
export const imports = ["_app/immutable/nodes/7.DPToB1_-.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/DLTaHJlt.js","_app/immutable/chunks/BZOnZgKm.js","_app/immutable/chunks/D6SFIRjf.js","_app/immutable/chunks/C21iDxsO.js","_app/immutable/chunks/Ihp2QH7c.js","_app/immutable/chunks/au-VDWBU.js","_app/immutable/chunks/BBCkNNU0.js","_app/immutable/chunks/B90PUMjC.js","_app/immutable/chunks/D5cQzGxD.js","_app/immutable/chunks/Cv3ukLNJ.js","_app/immutable/chunks/Cb6g15UT.js","_app/immutable/chunks/D5PUuNb2.js","_app/immutable/chunks/Ck7ZZh2V.js","_app/immutable/chunks/B9wM4kaC.js","_app/immutable/chunks/CLU3ntyR.js","_app/immutable/chunks/jEEpMCDI.js"];
export const stylesheets = ["_app/immutable/assets/WorkflowEditor.CgtC4Fb4.css","_app/immutable/assets/NodePalette.DoznCdZ6.css","_app/immutable/assets/7.C8yfM_iw.css"];
export const fonts = [];
