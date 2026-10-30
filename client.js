window.__ModuleLoader__.load({
	id: "dsh-restart-switch",
	factory: (require) => {
		const React = require("react");
		const h = React.createElement;

		//#region dsh-restart-switch/styles
		const css = [
			".rs-trigger{width:28px;height:28px;flex:none;display:inline-flex;align-items:center;justify-content:center;border:1px solid transparent;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;font-family:inherit;padding:0;transition:background .12s,color .12s,border-color .12s}",
			".rs-trigger:hover,.rs-trigger[data-open=true]{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-border-l1);color:var(--dsw-alias-label-primary)}",
			".rs-trigger:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}",
			".rs-triggerLabel{font-size:12.5px;line-height:18px;margin-left:6px;white-space:nowrap}",
			".rs-backdrop{position:fixed;inset:0;z-index:1200;background:transparent;pointer-events:auto}",
			".rs-panel{position:fixed;z-index:1201;width:272px;box-sizing:border-box;padding:6px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-overlay);box-shadow:0 16px 40px rgba(0,0,0,.18);color:var(--dsw-alias-label-primary);font-family:inherit;pointer-events:auto}",
			".rs-heading{padding:6px 10px 4px;font-size:11.5px;line-height:16px;color:var(--dsw-alias-label-secondary);letter-spacing:.02em}",
			".rs-item{display:flex;flex-direction:column;gap:2px;width:100%;box-sizing:border-box;padding:8px 10px;border:none;border-radius:8px;background:transparent;text-align:left;cursor:pointer;font-family:inherit;color:inherit}",
			".rs-item:hover:not(:disabled){background:color-mix(in srgb, var(--dsw-alias-label-primary) 7%, transparent)}",
			".rs-item:disabled{cursor:default;opacity:.5}",
			".rs-itemTitle{font-size:13px;line-height:20px;font-weight:500}",
			".rs-itemDesc{font-size:11.5px;line-height:17px;color:var(--dsw-alias-label-secondary)}",
			".rs-sep{height:1px;margin:4px 6px;background:var(--dsw-alias-border-l1)}",
			".rs-status{padding:6px 10px 4px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}",
			".rs-status.is-error{color:var(--dsw-alias-state-error-primary)}",
			".rs-status.is-done{color:var(--dsw-alias-state-success-primary)}",
			".rs-confirm{padding:6px 10px 8px}",
			".rs-confirmHint{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);margin-bottom:8px}",
			".rs-confirmRow{display:flex;gap:8px;justify-content:flex-end}",
			".rs-button{height:28px;padding:0 12px;border-radius:14px;font-family:inherit;font-size:12.5px;line-height:18px;cursor:pointer;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-primary)}",
			".rs-button:hover{background:color-mix(in srgb, var(--dsw-alias-label-primary) 7%, transparent)}",
			".rs-button.is-danger{border-color:transparent;background:var(--dsw-alias-state-error-primary);color:#fff}",
			".rs-button.is-danger:hover{filter:brightness(1.05)}"
		].join("");
		const styleId = "dsh-restart-switch/restart-switch.css";
		const styles = {
			trigger: "rs-trigger",
			triggerLabel: "rs-triggerLabel",
			backdrop: "rs-backdrop",
			panel: "rs-panel",
			heading: "rs-heading",
			item: "rs-item",
			itemTitle: "rs-itemTitle",
			itemDesc: "rs-itemDesc",
			sep: "rs-sep",
			status: "rs-status",
			confirm: "rs-confirm",
			confirmHint: "rs-confirmHint",
			confirmRow: "rs-confirmRow",
			button: "rs-button"
		};

		/** Mount the stylesheet once per document and hand back its removal. */
		function installStyles() {
			if (typeof document === "undefined") return () => {};
			const existing = document.querySelector("style[data-plugin-css=" + JSON.stringify(styleId) + "]");
			if (existing !== null) return () => {};
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-restart-switch";
			tag.dataset.pluginCss = styleId;
			tag.textContent = css;
			document.head.appendChild(tag);
			return () => {
				tag.remove();
			};
		}
		//#endregion
		//#region dsh-restart-switch/locales
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"action.title": "重启",
			"menu.heading": "重启选项",
			"kernel.title": "重启内核",
			"kernel.description": "重新加载插件与配置，不退出程序",
			"app.title": "重启 DSH",
			"app.description": "重启整个应用，运行中的任务会中断",
			"app.confirmHint": "正在运行的任务会中断，确定要重启整个 DSH 吗？",
			"confirm.ok": "确认重启",
			"confirm.cancel": "取消",
			"phase.kernel": "正在重启内核…",
			"phase.kernelDone": "内核已重启，正在刷新…",
			"phase.app": "正在重启 DSH…",
			"error.failed": "操作失败"
		};
		/** English dictionary, checked complete against the zh key set. */
		const en = {
			"action.title": "Restart",
			"menu.heading": "Restart options",
			"kernel.title": "Restart kernel",
			"kernel.description": "Reload plugins and config without quitting",
			"app.title": "Restart DSH",
			"app.description": "Restart the whole app; running tasks are interrupted",
			"app.confirmHint": "Running tasks will be interrupted. Restart the whole DSH app?",
			"confirm.ok": "Restart",
			"confirm.cancel": "Cancel",
			"phase.kernel": "Restarting the kernel…",
			"phase.kernelDone": "Kernel restarted, reloading…",
			"phase.app": "Restarting DSH…",
			"error.failed": "Action failed"
		};
		//#endregion
		//#region dsh-restart-switch/store
		/**
		 * One tiny store shared by the sidebar trigger and the overlay menu, so
		 * both surfaces agree on openness, the anchor rectangle and the phase.
		 */
		function createStore() {
			let state = {
				open: false,
				anchor: null,
				phase: "idle",
				message: null,
				confirming: false
			};
			const listeners = new Set();
			return {
				get() {
					return state;
				},
				set(patch) {
					state = { ...state, ...patch };
					for (const listener of listeners) listener();
				},
				subscribe(listener) {
					listeners.add(listener);
					return () => {
						listeners.delete(listener);
					};
				}
			};
		}

		/** Subscribe one component to the shared store. */
		function useRestartState(store) {
			return React.useSyncExternalStore(store.subscribe, store.get);
		}
		//#endregion
		//#region dsh-restart-switch/Trigger
		/** Restart glyph: an open circular arrow. */
		function RestartGlyph() {
			return h(
				"svg",
				{
					viewBox: "0 0 16 16",
					width: 16,
					height: 16,
					fill: "none",
					stroke: "currentColor",
					strokeWidth: 1.6,
					strokeLinecap: "round",
					strokeLinejoin: "round",
					"aria-hidden": true
				},
				h("path", { d: "M13.2 6.4A5.6 5.6 0 1 0 13.4 10" }),
				h("path", { d: "M13.6 2.6v4h-4" })
			);
		}

		/**
		 * Sidebar-foot trigger beside Settings. Opening it publishes the button
		 * rectangle so the overlay menu can sit right above it.
		 * @param props - slot props plus this plugin's injected store and locale.
		 */
		function RestartTrigger(props) {
			const state = useRestartState(props.store);
			const label = props.t("action.title");
			const toggle = (event) => {
				const rect = event.currentTarget.getBoundingClientRect();
				props.store.set({
					open: !state.open,
					anchor: {
						left: rect.left,
						top: rect.top,
						right: rect.right,
						bottom: rect.bottom
					},
					confirming: false
				});
			};
			return h(
				"button",
				{
					type: "button",
					className: styles.trigger,
					title: label,
					"aria-label": label,
					"aria-haspopup": "menu",
					"aria-expanded": state.open,
					"data-open": state.open ? "true" : "false",
					onClick: toggle
				},
				h(RestartGlyph, null)
			);
		}
		//#endregion
		//#region dsh-restart-switch/Menu
		/**
		 * Frame-wide overlay menu: two restart targets, an inline confirmation for
		 * the destructive one, and the outcome line for the running action.
		 * @param props - slot props plus this plugin's injected store, RPC and locale.
		 */
		function RestartMenu(props) {
			const state = useRestartState(props.store);
			const t = props.t;
			const busy = state.phase === "kernel" || state.phase === "app";
			React.useEffect(() => {
				if (!state.open) return undefined;
				const onKey = (event) => {
					if (event.key === "Escape") props.store.set({ open: false, confirming: false });
				};
				window.addEventListener("keydown", onKey);
				return () => {
					window.removeEventListener("keydown", onKey);
				};
			}, [state.open, props.store]);
			if (!state.open || state.anchor === null) return null;
			const runKernel = async () => {
				if (busy) return;
				props.store.set({ phase: "kernel", message: null, confirming: false });
				try {
					const response = await props.request("restartKernel");
					if (response.ok && response.value?.ok === true) {
						props.store.set({ phase: "kernelDone", message: null });
						window.setTimeout(() => {
							window.location.reload();
						}, 1500);
						return;
					}
					const message = response.ok ? response.value?.error?.message : response.error?.message;
					props.store.set({ phase: "error", message: message || t("error.failed") });
				} catch (error) {
					props.store.set({ phase: "error", message: error instanceof Error ? error.message : t("error.failed") });
				}
			};
			const runApp = async () => {
				if (busy) return;
				props.store.set({ phase: "app", message: null, confirming: false });
				try {
					const response = await props.request("restartApp");
					if (response.ok && response.value?.ok === true) return;
					const message = response.ok ? response.value?.error?.message : response.error?.message;
					props.store.set({ phase: "error", message: message || t("error.failed") });
				} catch (error) {
					props.store.set({ phase: "error", message: error instanceof Error ? error.message : t("error.failed") });
				}
			};
			const width = 272;
			const left = Math.max(8, Math.min(state.anchor.left, window.innerWidth - width - 8));
			const bottom = Math.max(8, window.innerHeight - state.anchor.top + 8);
			const status = state.phase === "error" ? h("div", { className: styles.status + " is-error", role: "status" }, state.message || t("error.failed")) : state.phase === "kernel" ? h("div", { className: styles.status, role: "status" }, t("phase.kernel")) : state.phase === "kernelDone" ? h("div", { className: styles.status + " is-done", role: "status" }, t("phase.kernelDone")) : state.phase === "app" ? h("div", { className: styles.status, role: "status" }, t("phase.app")) : null;
			return h(
				React.Fragment,
				null,
				h("div", {
					className: styles.backdrop,
					onMouseDown: () => {
						props.store.set({ open: false, confirming: false });
					}
				}),
				h(
					"div",
					{
						className: styles.panel,
						role: "menu",
						"aria-label": t("menu.heading"),
						style: { left: left + "px", bottom: bottom + "px" },
						onMouseDown: (event) => {
							event.stopPropagation();
						}
					},
					h("div", { className: styles.heading }, t("menu.heading")),
					h(
						"button",
						{
							type: "button",
							className: styles.item,
							role: "menuitem",
							disabled: busy,
							onClick: runKernel
						},
						h("span", { className: styles.itemTitle }, t("kernel.title")),
						h("span", { className: styles.itemDesc }, t("kernel.description"))
					),
					state.confirming
						? h(
								"div",
								{ className: styles.confirm },
								h("div", { className: styles.confirmHint }, t("app.confirmHint")),
								h(
									"div",
									{ className: styles.confirmRow },
									h(
										"button",
										{
											type: "button",
											className: styles.button,
											onClick: () => {
												props.store.set({ confirming: false });
											}
										},
										t("confirm.cancel")
									),
									h(
										"button",
										{
											type: "button",
											className: styles.button + " is-danger",
											onClick: runApp
										},
										t("confirm.ok")
									)
								)
							)
						: h(
								"button",
								{
									type: "button",
									className: styles.item,
									role: "menuitem",
									disabled: busy,
									onClick: () => {
										props.store.set({ confirming: true, phase: "idle", message: null });
									}
								},
								h("span", { className: styles.itemTitle }, t("app.title")),
								h("span", { className: styles.itemDesc }, t("app.description"))
							),
					status === null ? null : h("div", { className: styles.sep }),
					status
				)
			);
		}
		//#endregion
		//#region dsh-restart-switch/apply
		/** Dictionary namespace owned by this plugin. */
		const NS = "restart-switch";
		/** Required services: the slot registry, the locale face, and the connection RPC carrier. */
		const inject = ["slots", "locale", "connection"];

		/**
		 * Register the sidebar-foot trigger and its overlay menu.
		 * @param ctx - client root context.
		 */
		function apply(ctx) {
			ctx.effect(() => installStyles(), "restart-switch: stylesheet");
			ctx.effect(
				() =>
					ctx.locale.register(NS, {
						zh,
						en
					}),
				"restart-switch: dictionaries"
			);
			const store = createStore();
			const t = ctx.locale.bind(NS);
			const request = (method, signal) => ctx.connection.rpc.call("/api", "restartSwitch/" + method, { args: {} }, signal);
			ctx.slots.inject("conversation.input.right", () =>
				ctx.slots.register(
					{
						name: "conversation.input.right",
						id: "restart-switch",
						order: 90,
						inject: () => ({ store, t })
					},
					RestartTrigger
				)
			);
			ctx.slots.inject("shell.overlay", () =>
				ctx.slots.register(
					{
						name: "shell.overlay",
						id: "restart-switch:menu",
						order: 60,
						inject: () => ({ store, request, t })
					},
					RestartMenu
				)
			);
		}
		//#endregion

		const module = { exports: {} };
		module.exports.inject = inject;
		module.exports.apply = apply;
		return module.exports;
	}
});
