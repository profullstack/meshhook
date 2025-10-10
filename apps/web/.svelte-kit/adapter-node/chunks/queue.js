import { EventEmitter } from "node:events";
const bus = new EventEmitter();
async function enqueueRun(runId) {
  bus.emit("run:orchestrate", { run_id: runId });
}
export {
  enqueueRun
};
