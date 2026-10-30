/**
 * dsh-restart-switch — host face.
 *
 * Registers the `restartSwitch` Cordis service. The Typert gateway dispatches
 * `restartSwitch/restartKernel` and `restartSwitch/restartApp` to it using the
 * strict invocations declared in `./typert.host.js`.
 *
 * - `restartKernel` recomposes the profile through the live HMR service: the
 *   manifest and patch files are read again, changed plugin modules are
 *   replaced, stopped entries are started, and the plugin tree is judged
 *   again. The process, the HTTP server, and the Electron window stay alive.
 * - `restartApp` relaunches the whole DSH application. A detached helper is
 *   spawned first; it terminates the shell, waits for this Host to finish its
 *   graceful shutdown, and starts the application executable again. Outside
 *   the desktop shell it falls back to re-spawning this exact process command.
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import s from "@deepseek-ai/schemastery";
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";

/** Absolute path of the detached relaunch helper shipped with this package. */
const RELAUNCH_HELPER = fileURLToPath(new URL("./relaunch.js", import.meta.url));

/** Business failure when a restart request arrives while one is already in flight. */
const ALREADY_RESTARTING = "already-restarting";

/** Build one explicit failure result understood by the strict Typert codec. */
function failure(code, message) {
  return { ok: false, error: { code, message } };
}

/** Whether this Host runs as the child of the Electron desktop shell. */
function runsInDesktopShell() {
  return (
    typeof process.versions?.electron === "string" &&
    process.env.ELECTRON_RUN_AS_NODE === "1" &&
    typeof process.argv[1] === "string" &&
    process.argv[1].includes("dsh-desktop-host")
  );
}

/**
 * Kernel and application restart for the DSH Web GUI.
 *
 * Extends TypertRemoteService so the gateway's binding check
 * (`typertRemote.service/serviceKey/namespace`) passes; the strict
 * invocations from `typert.host.js` are what actually route the endpoints.
 */
class RestartSwitchService extends TypertRemoteService {
  /** Deployment policy: how long to wait before touching the running tree or process. */
  static Config = s.object({
    /** Milliseconds between the RPC response and the profile recomposition. */
    kernelDelayMs: s.number().step(1).min(0).max(5000).default(120),
    /** Milliseconds between the RPC response and the application relaunch helper acting. */
    appDelayMs: s.number().step(1).min(300).max(15000).default(1500)
  });

  constructor(ctx, config) {
    super(ctx, "restartSwitch");
    this.ctxRef = ctx;
    this.kernelDelayMs = config.kernelDelayMs;
    this.appDelayMs = config.appDelayMs;
    this.kernelPending = false;
    this.appPending = false;
  }

  /**
   * Recompose the plugin tree from the profile manifest and patch files.
   * @returns `{ ok: true, value: { scheduled: true } }` once the recomposition
   * is queued, or an explicit failure when the kernel cannot be reloaded here.
   */
  async restartKernel() {
    if (this.kernelPending) {
      return failure(ALREADY_RESTARTING, "a kernel restart is already scheduled");
    }
    const hmr = this.ctxRef.get?.("hmr");
    if (hmr === undefined || typeof hmr.reconcileProfile !== "function") {
      return failure("kernel-restart-unavailable", "this profile does not run the live HMR kernel");
    }
    this.kernelPending = true;
    const run = async () => {
      try {
        await hmr.runExclusive(() => hmr.reconcileProfile());
        console.log("[dsh-restart-switch] kernel recomposition completed");
      } catch (error) {
        console.error("[dsh-restart-switch] kernel recomposition failed:", error);
      } finally {
        this.kernelPending = false;
      }
    };
    const timer = setTimeout(() => {
      run();
    }, this.kernelDelayMs);
    timer.unref?.();
    return { ok: true, value: { scheduled: true } };
  }

  /**
   * Relaunch the whole application through a detached helper.
   * @returns `{ ok: true, value: { scheduled: true } }` once the helper runs,
   * or an explicit failure when it could not be started.
   */
  async restartApp() {
    if (this.appPending) {
      return failure(ALREADY_RESTARTING, "an application restart is already scheduled");
    }
    this.appPending = true;
    try {
      const desktop = runsInDesktopShell();
      const payload = {
        kind: desktop ? "desktop" : "process",
        pid: process.pid,
        parentPid: process.ppid,
        execPath: process.execPath,
        argv: process.argv.slice(1),
        cwd: process.cwd(),
        delayMs: this.appDelayMs
      };
      const helper = spawn(process.execPath, [RELAUNCH_HELPER, JSON.stringify(payload)], {
        detached: true,
        stdio: "ignore",
        windowsHide: true,
        cwd: process.cwd(),
        env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" }
      });
      helper.unref();
      helper.on("error", (error) => {
        this.appPending = false;
        console.error("[dsh-restart-switch] relaunch helper failed to start:", error);
      });
      console.log(
        `[dsh-restart-switch] scheduling application restart (pid ${String(process.pid)}, kind=${payload.kind}) — helper acts in ${String(this.appDelayMs)}ms`
      );
      return { ok: true, value: { scheduled: true } };
    } catch (error) {
      this.appPending = false;
      return failure("restart-failed", error instanceof Error ? error.message : String(error));
    }
  }
}

export { RestartSwitchService };
export default RestartSwitchService;

/**
 * Mark the public methods as direct Remote endpoints.
 *
 * The Typert `@Remote` decorator is standard-decorator syntax, which plain
 * JavaScript cannot use, so each decorator is applied to the prototype with
 * the same initializer context the compiler would supply: the initializer
 * runs with a receiver whose prototype is the class prototype, which is where
 * the protocol keeps its marker table.
 */
for (const method of ["restartKernel", "restartApp"]) {
  const prototype = RestartSwitchService.prototype;
  const receiver = Object.create(prototype);
  Remote(method)(prototype[method], {
    kind: "method",
    name: method,
    private: false,
    static: false,
    addInitializer(initializer) {
      initializer.call(receiver);
    }
  });
}
