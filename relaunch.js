/**
 * dsh-restart-switch — detached relaunch helper.
 *
 * Spawned with `detached: true` before anything is torn down, so it survives
 * the process it is restarting.
 *
 * Usage: node relaunch.js <json-payload>
 * Payload:
 *   { kind: 'desktop', pid, parentPid, execPath, cwd, delayMs }
 *   { kind: 'process', pid, execPath, argv, cwd, delayMs }
 *
 * `desktop` terminates the Electron shell first; this Host then finishes its
 * graceful shutdown (its IPC parent is gone), and the helper starts the
 * application executable again once both processes are gone.
 * `process` waits for this Host to exit, then re-spawns the exact same command
 * — the standalone web/CLI case, where nothing else would bring DSH back.
 */
import { spawn } from "node:child_process";
import { dirname } from "node:path";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Whether a process with the given pid still exists (Windows-safe). */
function alive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Wait until the pid disappears or the deadline passes. */
async function waitGone(pid, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!alive(pid)) return true;
    await sleep(150);
  }
  return !alive(pid);
}

let payload;
try {
  payload = JSON.parse(process.argv[2]);
} catch (error) {
  console.error("[dsh-restart-switch] relaunch helper: invalid payload:", error);
  process.exit(1);
}

const delayMs = Number.isFinite(payload.delayMs) ? payload.delayMs : 1500;
await sleep(delayMs);

if (payload.kind === "desktop") {
  // The shell owns this Host. Kill it first: the Host notices the closed IPC
  // channel, shuts down gracefully on its own, and only then do we start the
  // application again — so the single-instance lock and the port are free.
  try {
    process.kill(payload.parentPid);
  } catch (error) {
    console.error("[dsh-restart-switch] relaunch helper: could not stop the shell:", error);
  }
  await waitGone(payload.parentPid, 8000);
  if (!(await waitGone(payload.pid, 8000))) {
    try {
      process.kill(payload.pid);
    } catch (error) {
      console.error("[dsh-restart-switch] relaunch helper: could not stop the Host:", error);
    }
    await waitGone(payload.pid, 4000);
  }
  const environment = { ...process.env };
  delete environment.ELECTRON_RUN_AS_NODE;
  const application = spawn(payload.execPath, [], {
    cwd: dirname(payload.execPath),
    detached: true,
    stdio: "ignore",
    env: environment,
    windowsHide: false
  });
  application.unref();
  process.exit(0);
}

if (payload.kind === "process") {
  await waitGone(payload.pid, 30000);
  const child = spawn(payload.execPath, Array.isArray(payload.argv) ? payload.argv : [], {
    cwd: payload.cwd,
    detached: true,
    stdio: "ignore",
    env: process.env,
    windowsHide: true
  });
  child.unref();
  process.exit(0);
}

console.error("[dsh-restart-switch] relaunch helper: unknown kind", payload.kind);
process.exit(1);
