import { EventEmitter } from "node:events";
const bus = new EventEmitter();

export const queue = {
  async process(topic, handler) {
    bus.on(topic, async (data) => {
      try { await handler({ data }); } catch (e) { console.error(e); }
    });
  }
};

export async function enqueueRun(runId) {
  bus.emit("run:orchestrate", { run_id: runId });
}
export async function enqueueStep(runId, node) {
  bus.emit("step:execute", { run_id: runId, node });
}
