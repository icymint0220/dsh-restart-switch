# dsh-restart-switch

One restart switch for [DeepSeek Harness](https://github.com/deepseek-ai): a small
button in the composer toolbar that offers **restart the kernel** or **restart the
whole DSH app**.

![The restart menu](docs/restart-menu.png)

## Two restart targets

| Action | What it does | What you lose |
|---|---|---|
| **Restart kernel** | Recomposes the profile through the live HMR service: the manifest and patch files are read again, changed plugin modules are replaced, stopped entries are started, and the plugin tree is judged again. The page reloads so the browser half picks up the new composition. | Nothing but the page reload — the Host process, the HTTP server and the desktop window stay alive. |
| **Restart DSH** | Relaunches the whole application. A detached helper stops the desktop shell, lets the Host finish its graceful shutdown, then starts the application executable again. Outside the desktop shell it re-spawns the same process command instead. | Running tasks are interrupted. The menu asks for confirmation first. |

Both actions report their state in the menu, including the failure message, so a
broken plugin or a refused restart is visible instead of silently doing nothing.

## Install

From npm (inside a DSH profile):

```bash
dsh plugin add dsh-restart-switch
```

From a GitHub checkout:

```bash
dsh plugin add github:<user>/dsh-restart-switch
```

Or install the bundle directory through the plugin manager:
`plugin_manager install_bundle <absolute package directory>`.

## Where the button lives

The trigger registers in `conversation.input.right` — the compact controls just
left of the composer submit button. It was originally written for
`sidebar.footer.action`, but sidebar skins that take the footer over (for example
`dsh-claude-style`) hide every footer entry that is not their own update seat, so
the button would be invisible exactly where it was asked for. The composer row is
always rendered, in every skin.

The menu itself registers in `shell.overlay`, so it is never clipped by a column.

## Configuration

| Field | Default | Meaning |
|---|---|---|
| `kernelDelayMs` | `120` | Delay between the RPC response and the profile recomposition. |
| `appDelayMs` | `1500` | Delay between the RPC response and the relaunch helper acting. |

Override them in your profile's `cordis.patch.yml`:

```yaml
- id: restart-switch
  name: dsh-restart-switch
  config:
    appDelayMs: 2000
```

## How it works

- `index.js` registers the `restartSwitch` service (`restartKernel`, `restartApp`)
  and marks both methods as direct Remote endpoints, which is what lets the page
  call them over `ctx.connection.rpc`.
- `restartKernel` uses `ctx.hmr.runExclusive(() => ctx.hmr.reconcileProfile())` —
  the same path DSH itself uses when a profile file changes on disk.
- `restartApp` spawns `relaunch.js` detached before anything is torn down. In the
  desktop shell the helper stops the Electron process, waits for this Host to exit
  (its IPC parent going away is what triggers the graceful shutdown), and starts
  the application executable again.
- `client.js` registers the toolbar trigger and the overlay menu, sharing one tiny
  store between them.

## Requirements

- DSH `0.2.1-rc.5` or later within the `0.2.x` line (`engines.dsh`).
- A profile with live HMR for the kernel restart; without it the menu reports
  `kernel-restart-unavailable` instead of pretending to work.

## License

MIT
