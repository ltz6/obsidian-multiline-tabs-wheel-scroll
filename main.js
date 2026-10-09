"use strict";

const { Plugin, PluginSettingTab, Setting } = require("obsidian");
const fs = require("fs");
const path = require("path");

const TAB_CONTAINER_SELECTOR =
  ".workspace-split.mod-root > .workspace-tabs.mod-top > .workspace-tab-header-container > .workspace-tab-header-container-inner";
const TAB_DRAG_MIME = "application/x-obsidian-multiline-tab";
const DEFAULT_SETTINGS = Object.freeze({
  visibleRows: 3,
  minTabWidth: 84,
  maxTabWidth: 176,
  idealTabWidth: 124,
  rowHeight: 30,
  rowGap: 2,
  wheelSpeed: 1,
  wheelSmoothness: 55,
  edgeScrollSpeed: 360,
  edgeScrollThreshold: 22,
  scrollbarWidth: 10,
});
const SETTINGS_LIMITS = Object.freeze({
  visibleRows: { min: 1, max: 12, step: 1 },
  minTabWidth: { min: 60, max: 320, step: 4 },
  maxTabWidth: { min: 60, max: 320, step: 4 },
  idealTabWidth: { min: 60, max: 320, step: 4 },
  rowHeight: { min: 22, max: 48, step: 1 },
  rowGap: { min: 0, max: 12, step: 1 },
  wheelSpeed: { min: 0.25, max: 3, step: 0.25 },
  wheelSmoothness: { min: 20, max: 140, step: 5 },
  edgeScrollSpeed: { min: 60, max: 1000, step: 20 },
  edgeScrollThreshold: { min: 10, max: 40, step: 1 },
  scrollbarWidth: { min: 4, max: 20, step: 1 },
});
const AUTOFIT_STYLE_TEXT = String.raw`
/*
 * Stable multiline editor tabs for Obsidian.
 * This snippet does not rely on Autofit Tabs.
 * It also neutralizes Autofit Tabs classes/styles if that plugin is still enabled.
 */

body {
  --multiline-tabs-ideal-width: 124px;
  --multiline-tabs-min-width: 84px;
  --multiline-tabs-max-width: 176px;
  --multiline-tabs-single-min-width: 160px;
  --multiline-tabs-single-max-width: 280px;
  --multiline-tabs-tab-width: 124px;
  --multiline-tabs-row-height: 30px;
  --multiline-tabs-row-gap: 2px;
  --multiline-tabs-scrollbar-width: 10px;
  --multiline-tabs-visible-rows: 3;
  --multiline-tabs-visible-height: calc(
    var(--multiline-tabs-visible-rows) * var(--multiline-tabs-row-height) +
    (var(--multiline-tabs-visible-rows) - 1) * var(--multiline-tabs-row-gap)
  );
}

/* Main editor tab bar and popout windows */
.workspace-split.mod-root > .workspace-tabs.mod-top > .workspace-tab-header-container,
body.is-popout-window .workspace-tabs.mod-top > .workspace-tab-header-container {
  position: relative;
  display: flex !important;
  align-items: flex-start;
  gap: 4px;
  height: auto !important;
  min-height: calc(var(--multiline-tabs-row-height) + 2px);
  max-height: calc(var(--multiline-tabs-visible-height) + 2px);
  padding-right: 0;
  overflow: visible !important;
}

.workspace-split.mod-root > .workspace-tabs.mod-top > .workspace-tab-header-container > .workspace-tab-header-container-inner,
body.is-popout-window .workspace-tabs.mod-top > .workspace-tab-header-container > .workspace-tab-header-container-inner {
  display: flex !important;
  flex-wrap: wrap !important;
  align-content: flex-start;
  align-items: stretch;
  flex: 1 1 0;
  min-width: 0;
  max-width: none !important;
  gap: var(--multiline-tabs-row-gap) 0;
  width: 0 !important;
  height: auto !important;
  min-height: var(--multiline-tabs-row-height);
  max-height: var(--multiline-tabs-visible-height);
  overflow-x: hidden !important;
  overflow-y: scroll !important;
  overscroll-behavior-y: contain;
  scrollbar-gutter: stable;
  scrollbar-width: auto;
  scrollbar-color: var(--scrollbar-thumb-bg) var(--background-secondary);
  box-sizing: border-box;
  padding-right: 0;
  padding-top: 0;
  padding-bottom: 0;
}

/* Neutralize Autofit Tabs when installed */
.workspace-split.mod-root > .workspace-tabs.mod-top > .workspace-tab-header-container > .workspace-tab-header-container-inner > .workspace-tab-header.autofit-tab,
.workspace-split.mod-root > .workspace-tabs.mod-top > .workspace-tab-header-container > .workspace-tab-header-container-inner > .workspace-tab-header,
body.is-popout-window .workspace-tabs.mod-top > .workspace-tab-header-container > .workspace-tab-header-container-inner > .workspace-tab-header.autofit-tab,
body.is-popout-window .workspace-tabs.mod-top > .workspace-tab-header-container > .workspace-tab-header-container-inner > .workspace-tab-header {
  container-type: normal;
  flex: 1 1 clamp(
    var(--multiline-tabs-min-width),
    var(--multiline-tabs-ideal-width),
    var(--multiline-tabs-max-width)
  ) !important;
  width: clamp(
    var(--multiline-tabs-min-width),
    var(--multiline-tabs-ideal-width),
    var(--multiline-tabs-max-width)
  ) !important;
  min-width: var(--multiline-tabs-min-width) !important;
  max-width: var(--multiline-tabs-max-width) !important;
  height: var(--multiline-tabs-row-height);
  contain: none !important;
  transition: none !important;
}

/* Single-tab case: keep the tab compact instead of stretching awkwardly */
.workspace-split.mod-root > .workspace-tabs.mod-top > .workspace-tab-header-container > .workspace-tab-header-container-inner > .workspace-tab-header:first-child:last-child,
body.is-popout-window .workspace-tabs.mod-top > .workspace-tab-header-container > .workspace-tab-header-container-inner > .workspace-tab-header:first-child:last-child {
  flex: 0 1 auto !important;
  width: auto !important;
  min-width: var(--multiline-tabs-single-min-width) !important;
  max-width: var(--multiline-tabs-single-max-width) !important;
}

.workspace-split.mod-root > .workspace-tabs.mod-top > .workspace-tab-header-container > .workspace-tab-header-container-inner > .workspace-tab-header.out-of-view,
body.is-popout-window .workspace-tabs.mod-top > .workspace-tab-header-container > .workspace-tab-header-container-inner > .workspace-tab-header.out-of-view {
  visibility: visible !important;
  pointer-events: auto !important;
}

.workspace-split.mod-root > .workspace-tabs.mod-top > .workspace-tab-header-container > .workspace-tab-header-container-inner > .workspace-tab-header .workspace-tab-header-inner,
body.is-popout-window .workspace-tabs.mod-top > .workspace-tab-header-container > .workspace-tab-header-container-inner > .workspace-tab-header .workspace-tab-header-inner {
  display: flex;
  align-items: center;
  width: 100% !important;
  min-width: 0;
  max-width: 100%;
  padding-right: 6px;
}

.workspace-split.mod-root > .workspace-tabs.mod-top > .workspace-tab-header-container > .workspace-tab-header-container-inner > .workspace-tab-header .workspace-tab-header-inner-title,
body.is-popout-window .workspace-tabs.mod-top > .workspace-tab-header-container > .workspace-tab-header-container-inner > .workspace-tab-header .workspace-tab-header-inner-title {
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

.workspace-split.mod-root > .workspace-tabs.mod-top > .workspace-tab-header-container > .workspace-tab-header-container-inner > .workspace-tab-header.is-active,
body.is-popout-window .workspace-tabs.mod-top > .workspace-tab-header-container > .workspace-tab-header-container-inner > .workspace-tab-header.is-active {
  z-index: 1;
}

.workspace-split.mod-root > .workspace-tabs.mod-top > .workspace-tab-header-container > .workspace-tab-header-new-tab,
body.is-popout-window .workspace-tabs.mod-top > .workspace-tab-header-container > .workspace-tab-header-new-tab {
  position: static !important;
  flex: 0 0 auto;
  align-self: flex-start;
  margin-top: 2px;
  z-index: 2 !important;
  display: flex !important;
  align-items: center;
  justify-content: center;
  opacity: 1 !important;
  visibility: visible !important;
  background: transparent !important;
}

.workspace-split.mod-root > .workspace-tabs.mod-top > .workspace-tab-header-container > .workspace-tab-header-tab-list,
body.is-popout-window .workspace-tabs.mod-top > .workspace-tab-header-container > .workspace-tab-header-tab-list {
  position: static !important;
  flex: 0 0 auto;
  align-self: flex-start;
  margin-top: 2px;
  z-index: 2 !important;
  display: flex !important;
  align-items: center;
  justify-content: center;
  opacity: 1 !important;
  visibility: visible !important;
  background: transparent !important;
}

.workspace-split.mod-root > .workspace-tabs.mod-top > .workspace-tab-header-container > .workspace-tab-header-spacer,
body.is-popout-window .workspace-tabs.mod-top > .workspace-tab-header-container > .workspace-tab-header-spacer {
  display: block !important;
  flex: 0 0 4px;
  width: 4px;
}

.workspace-split.mod-root > .workspace-tabs.mod-top.mod-top-right-space > .workspace-tab-header-container > .sidebar-toggle-button.mod-right {
  position: static !important;
  flex: 0 0 auto;
  align-self: flex-start;
  margin-top: 2px;
  margin-left: 2px;
  z-index: 2 !important;
}

/* Keep the native right sidebar toggle above tab content and reserve overlays */
.workspace-split.mod-root > .workspace-tabs.mod-top.mod-top-right-space > .workspace-tab-header-container {
  padding-right: 0 !important;
}

.workspace-split.mod-root > .workspace-tabs.mod-top.mod-top-right-space > .workspace-tab-header-container::after {
  display: none !important;
}

.workspace-split.mod-root > .workspace-tabs.mod-top.mod-top-right-space > .workspace-tab-header-container > .workspace-tab-header-container-inner {
  position: relative;
  z-index: 1;
}

.workspace-split.mod-root > .workspace-tabs.mod-top.mod-top-right-space > .workspace-tab-header-container > .workspace-tab-header-new-tab,
.workspace-split.mod-root > .workspace-tabs.mod-top.mod-top-right-space > .workspace-tab-header-container > .workspace-tab-header-tab-list,
.workspace-split.mod-root > .workspace-tabs.mod-top.mod-top-right-space > .workspace-tab-header-container > .sidebar-toggle-button.mod-right {
  position: relative !important;
  z-index: 10 !important;
  -webkit-app-region: no-drag !important;
  pointer-events: auto !important;
}

.workspace-split.mod-root > .workspace-tabs.mod-top.mod-top-right-space > .workspace-tab-header-container > .workspace-tab-header-spacer {
  pointer-events: none;
}

.workspace-split.mod-root > .workspace-tabs.mod-top > .workspace-tab-header-container > .multiline-tabs-row-resize-handle,
body.is-popout-window .workspace-tabs.mod-top > .workspace-tab-header-container > .multiline-tabs-row-resize-handle {
  position: absolute !important;
  left: 6px;
  right: 6px;
  bottom: -4px;
  z-index: 20 !important;
  display: flex !important;
  align-items: center;
  justify-content: center;
  width: auto;
  height: 8px;
  padding: 0;
  color: transparent;
  font-size: 0;
  line-height: 1;
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  cursor: ns-resize;
  user-select: none;
  touch-action: none;
  -webkit-app-region: no-drag !important;
  opacity: 0.72;
  transition: color 120ms ease, opacity 120ms ease, background-color 120ms ease;
}

.workspace-split.mod-root > .workspace-tabs.mod-top > .workspace-tab-header-container > .multiline-tabs-row-resize-handle::before,
body.is-popout-window .workspace-tabs.mod-top > .workspace-tab-header-container > .multiline-tabs-row-resize-handle::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: 3px;
  border-top: 1px solid var(--background-modifier-border);
}

.workspace-split.mod-root > .workspace-tabs.mod-top > .workspace-tab-header-container > .multiline-tabs-row-resize-handle::after,
body.is-popout-window .workspace-tabs.mod-top > .workspace-tab-header-container > .multiline-tabs-row-resize-handle::after {
  content: "↕";
  position: relative;
  z-index: 1;
  display: block;
  min-width: 24px;
  padding: 0 4px;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 8px;
  text-align: center;
  background: var(--background-primary);
}

.workspace-split.mod-root > .workspace-tabs.mod-top > .workspace-tab-header-container > .multiline-tabs-row-resize-handle:hover,
.workspace-split.mod-root > .workspace-tabs.mod-top > .workspace-tab-header-container > .multiline-tabs-row-resize-handle.is-dragging,
body.is-popout-window .workspace-tabs.mod-top > .workspace-tab-header-container > .multiline-tabs-row-resize-handle:hover,
body.is-popout-window .workspace-tabs.mod-top > .workspace-tab-header-container > .multiline-tabs-row-resize-handle.is-dragging {
  color: var(--text-normal);
  opacity: 1;
}

.workspace-split.mod-root > .workspace-tabs.mod-top > .workspace-tab-header-container > .multiline-tabs-row-resize-handle:hover::before,
.workspace-split.mod-root > .workspace-tabs.mod-top > .workspace-tab-header-container > .multiline-tabs-row-resize-handle.is-dragging::before,
body.is-popout-window .workspace-tabs.mod-top > .workspace-tab-header-container > .multiline-tabs-row-resize-handle:hover::before,
body.is-popout-window .workspace-tabs.mod-top > .workspace-tab-header-container > .multiline-tabs-row-resize-handle.is-dragging::before {
  border-top-color: var(--interactive-accent);
}

.workspace-split.mod-root > .workspace-tabs.mod-top > .workspace-tab-header-container > .multiline-tabs-row-resize-handle:hover::after,
.workspace-split.mod-root > .workspace-tabs.mod-top > .workspace-tab-header-container > .multiline-tabs-row-resize-handle.is-dragging::after,
body.is-popout-window .workspace-tabs.mod-top > .workspace-tab-header-container > .multiline-tabs-row-resize-handle:hover::after,
body.is-popout-window .workspace-tabs.mod-top > .workspace-tab-header-container > .multiline-tabs-row-resize-handle.is-dragging::after {
  color: var(--text-normal);
}

.workspace-split.mod-root > .workspace-tabs.mod-top > .workspace-tab-header-container > .workspace-tab-header-container-inner::-webkit-scrollbar,
body.is-popout-window .workspace-tabs.mod-top > .workspace-tab-header-container > .workspace-tab-header-container-inner::-webkit-scrollbar {
  width: var(--multiline-tabs-scrollbar-width);
}

.workspace-split.mod-root > .workspace-tabs.mod-top > .workspace-tab-header-container > .workspace-tab-header-container-inner::-webkit-scrollbar-thumb,
body.is-popout-window .workspace-tabs.mod-top > .workspace-tab-header-container > .workspace-tab-header-container-inner::-webkit-scrollbar-thumb {
  background-color: var(--scrollbar-thumb-bg);
  border-radius: 999px;
  border: 2px solid var(--background-secondary);
}

.workspace-split.mod-root > .workspace-tabs.mod-top > .workspace-tab-header-container > .workspace-tab-header-container-inner::-webkit-scrollbar-track,
body.is-popout-window .workspace-tabs.mod-top > .workspace-tab-header-container > .workspace-tab-header-container-inner::-webkit-scrollbar-track {
  background: var(--background-secondary);
  border-radius: 999px;
}
`;

class MultilineTabsWheelScrollSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Multiline Tabs Wheel Scroll" });

    new Setting(containerEl).setName("Restore all settings").addButton((button) =>
      button
        .setButtonText("Restore All")
        .setTooltip("Restore every setting to its default value")
        .onClick(async () => {
          await this.plugin.updateSettings({ ...DEFAULT_SETTINGS });
          this.display();
        }),
    );

    const addSliderSetting = (
      name,
      description,
      key,
      onChange,
      onSliderReady,
    ) => {
      const limits = SETTINGS_LIMITS[key];
      const setting = new Setting(containerEl).setName(name).setDesc(description);
      setting.addSlider((slider) => {
        onSliderReady?.(slider);
        return slider
          .setLimits(limits.min, limits.max, limits.step)
          .setValue(this.plugin.settings[key])
          .setDynamicTooltip()
          .onChange(
            onChange ??
              (async (value) => {
                await this.plugin.updateSettings({ [key]: value });
              }),
          );
      });
      setting.addButton((button) =>
        button
          .setButtonText("Restore")
          .setTooltip("Restore this setting to its default value")
          .onClick(async () => {
            await this.plugin.updateSettings({ [key]: DEFAULT_SETTINGS[key] });
            this.display();
          }),
      );
      return setting;
    };

    addSliderSetting(
      "Visible tab rows",
      "Choose how many tab rows remain visible before scrolling is needed.",
      "visibleRows",
    );

    let minWidthSlider;
    let maxWidthSlider;
    addSliderSetting(
      "Minimum tab width",
      "Set the narrowest regular tab width in pixels.",
      "minTabWidth",
      async (value) => {
        const maxTabWidth = Math.max(value, this.plugin.settings.maxTabWidth);
        await this.plugin.updateSettings({ minTabWidth: value, maxTabWidth });
        maxWidthSlider?.setValue(maxTabWidth);
      },
      (slider) => {
        minWidthSlider = slider;
      },
    );

    addSliderSetting(
      "Maximum tab width",
      "Set the widest regular tab width in pixels. Tabs expand to fill each row when space allows.",
      "maxTabWidth",
      async (value) => {
        const minTabWidth = Math.min(value, this.plugin.settings.minTabWidth);
        await this.plugin.updateSettings({ minTabWidth, maxTabWidth: value });
        minWidthSlider?.setValue(minTabWidth);
      },
      (slider) => {
        maxWidthSlider = slider;
      },
    );

    addSliderSetting(
      "Tab row height",
      "Set the height of each tab row in pixels.",
      "rowHeight",
    );
    addSliderSetting("Row gap", "Set the vertical gap between tab rows in pixels.", "rowGap");
    addSliderSetting(
      "Wheel scroll speed",
      "Adjust the amount moved by each mouse-wheel step.",
      "wheelSpeed",
    );
    addSliderSetting(
      "Wheel smoothness",
      "Set the response time of smooth scrolling. Higher values feel softer and slower.",
      "wheelSmoothness",
    );
    addSliderSetting(
      "Drag edge scroll speed",
      "Set the maximum automatic scroll speed when dragging near the top or bottom edge.",
      "edgeScrollSpeed",
    );
    addSliderSetting(
      "Drag edge trigger area",
      "Set how much of the top and bottom edge activates automatic scrolling.",
      "edgeScrollThreshold",
    );
    addSliderSetting(
      "Scrollbar width",
      "Set the width of the tab-area scrollbar in pixels.",
      "scrollbarWidth",
    );
  }
}

module.exports = class MultilineTabsWheelScrollPlugin extends Plugin {
  async onload() {
    const savedSettings = await this.loadData();
    this.settings = this.normalizeSettings(savedSettings);
    this.sidebarClickCount = 0;
    const vaultBasePath = this.app.vault.adapter?.basePath || "";
    const windowLabel = document.body.classList.contains("is-popout-window")
      ? "popout"
      : "main";
    this.diagnosticPath = path.join(
      vaultBasePath,
      this.app.vault.configDir,
      "plugins",
      "multiline-tabs-wheel-scroll",
      `tab-diagnostics-${windowLabel}.json`,
    );
    this.boundWheelHandler = this.handleWheel.bind(this);
    this.boundRightSidebarClick = this.handleRightSidebarClick.bind(this);
    this.boundTabPointerDown = this.handleTabPointerDown.bind(this);
    this.boundTabPointerUp = this.handleTabPointerEnd.bind(this);
    this.boundTabPointerCancel = this.handleTabPointerEnd.bind(this);
    this.boundTabDragStart = this.handleNativeTabDragStart.bind(this);
    this.boundTabDragOver = this.handleNativeTabDragOver.bind(this);
    this.boundTabDragEnter = this.handleNativeTabDragOver.bind(this);
    this.boundTabDrop = this.handleNativeTabDrop.bind(this);
    this.boundTabDragEnd = this.handleNativeTabDragEnd.bind(this);
    this.boundDragWheel = this.handleDragWheel.bind(this);
    this.boundRowResizePointerDown = this.handleRowResizePointerDown.bind(this);
    this.boundRowResizePointerMove = this.handleRowResizePointerMove.bind(this);
    this.boundRowResizePointerUp = this.handleRowResizePointerUp.bind(this);
    this.boundRowResizePointerCancel = this.handleRowResizePointerCancel.bind(this);
    this.boundRefresh = this.refreshBindings.bind(this);
    this.refreshFrame = null;
    this.refreshAfterDrag = false;
    this.pendingTabDrag = null;
    this.tabDrag = null;
    this.dropMarker = null;
    this.dragFrame = null;
    this.dragFrameWindow = null;
    this.pendingDragPoint = null;
    this.lastDragPoint = null;
    this.lastDropTarget = null;
    this.suppressNativeDragEnd = false;
    this.dragEdgeScroll = null;
    this.wheelAnimations = new Map();
    this.rowResize = null;
    this.windowBindings = new Map();
    this.dragContextId =
      globalThis.crypto?.randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.dragBusKey = `obsidian-multiline-tabs:${this.app.vault.getName()}:${this.app.vault.configDir}`;
    this.dragSources = new Map();
    this.dragSourceCleanupTimers = new Map();
    this.remoteDrag = null;
    this.dragChannel =
      typeof BroadcastChannel === "function"
        ? new BroadcastChannel(
            `obsidian-multiline-tabs:${this.app.vault.getName()}:${this.app.vault.configDir}`,
          )
        : null;
    this.boundDragChannelMessage = this.handleDragChannelMessage.bind(this);
    this.dragChannel?.addEventListener("message", this.boundDragChannelMessage);
    this.boundStorageMessage = (event) => {
      if (event.key !== this.dragBusKey || !event.newValue) {
        return;
      }
      try {
        this.handleDragChannelMessage({ data: JSON.parse(event.newValue) });
      } catch {
        // Ignore unrelated or malformed storage events.
      }
    };
    window.addEventListener("storage", this.boundStorageMessage);
    if (this.dragChannel) {
      this.register(() => {
        this.dragChannel.removeEventListener("message", this.boundDragChannelMessage);
        this.dragChannel.close();
      });
    }
    this.register(() => {
      window.removeEventListener("storage", this.boundStorageMessage);
    });
    this.addSettingTab(new MultilineTabsWheelScrollSettingTab(this.app, this));
    this.bindTabWindow(window);

    this.registerEvent(this.app.workspace.on("layout-change", () => this.queueRefresh()));
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.queueRefresh()));
    this.registerEvent(
      this.app.workspace.on("window-open", (_workspaceWindow, popoutWindow) => {
        this.bindTabWindow(popoutWindow);
        this.queueRefresh();
      }),
    );
    this.registerEvent(
      this.app.workspace.on("window-close", (_workspaceWindow, popoutWindow) => {
        this.unbindTabWindow(popoutWindow);
      }),
    );

    this.queueRefresh();
  }

  onunload() {
    this.handleNativeTabDragEnd();
    this.cancelRowResize();
    for (const { doc } of this.windowBindings.values()) {
      this.detachBindings(doc);
      this.clearSettingsFromDocument(doc);
    }
    this.detachTabDragHandlers();
    this.stopWheelAnimations();
    for (const timer of this.dragSourceCleanupTimers.values()) {
      clearTimeout(timer);
    }
    this.dragSourceCleanupTimers.clear();
    this.dragSources.clear();
    if (this.refreshFrame !== null) {
      cancelAnimationFrame(this.refreshFrame);
      this.refreshFrame = null;
    }
  }

  normalizeSettings(savedSettings) {
    const source = savedSettings && typeof savedSettings === "object" ? savedSettings : {};
    const hasLegacyTabWidth = Number.isFinite(Number(source.tabWidth));
    const idealTabWidth = this.clampSetting(
      source.idealTabWidth ?? source.tabWidth,
      SETTINGS_LIMITS.idealTabWidth,
      DEFAULT_SETTINGS.idealTabWidth,
    );
    const minTabWidth = this.clampSetting(
      source.minTabWidth,
      SETTINGS_LIMITS.minTabWidth,
      hasLegacyTabWidth
        ? Math.min(DEFAULT_SETTINGS.minTabWidth, idealTabWidth)
        : DEFAULT_SETTINGS.minTabWidth,
    );
    const maxTabWidth = Math.max(
      minTabWidth,
      this.clampSetting(
        source.maxTabWidth,
        SETTINGS_LIMITS.maxTabWidth,
        hasLegacyTabWidth
          ? Math.max(DEFAULT_SETTINGS.maxTabWidth, idealTabWidth)
          : DEFAULT_SETTINGS.maxTabWidth,
      ),
    );
    return {
      visibleRows: this.clampSetting(
        source.visibleRows,
        SETTINGS_LIMITS.visibleRows,
        DEFAULT_SETTINGS.visibleRows,
      ),
      minTabWidth,
      maxTabWidth,
      idealTabWidth,
      rowHeight: this.clampSetting(
        source.rowHeight,
        SETTINGS_LIMITS.rowHeight,
        DEFAULT_SETTINGS.rowHeight,
      ),
      rowGap: this.clampSetting(
        source.rowGap,
        SETTINGS_LIMITS.rowGap,
        DEFAULT_SETTINGS.rowGap,
      ),
      wheelSpeed: this.clampSetting(
        source.wheelSpeed,
        SETTINGS_LIMITS.wheelSpeed,
        DEFAULT_SETTINGS.wheelSpeed,
      ),
      wheelSmoothness: this.clampSetting(
        source.wheelSmoothness,
        SETTINGS_LIMITS.wheelSmoothness,
        DEFAULT_SETTINGS.wheelSmoothness,
      ),
      edgeScrollSpeed: this.clampSetting(
        source.edgeScrollSpeed,
        SETTINGS_LIMITS.edgeScrollSpeed,
        DEFAULT_SETTINGS.edgeScrollSpeed,
      ),
      edgeScrollThreshold: this.clampSetting(
        source.edgeScrollThreshold,
        SETTINGS_LIMITS.edgeScrollThreshold,
        DEFAULT_SETTINGS.edgeScrollThreshold,
      ),
      scrollbarWidth: this.clampSetting(
        source.scrollbarWidth,
        SETTINGS_LIMITS.scrollbarWidth,
        DEFAULT_SETTINGS.scrollbarWidth,
      ),
    };
  }

  clampSetting(value, limits, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return fallback;
    }

    const stepped = Math.round(number / limits.step) * limits.step;
    return Math.min(limits.max, Math.max(limits.min, stepped));
  }

  async updateSettings(changes) {
    const nextSettings = {
      ...this.settings,
      ...changes,
    };
    if ("minTabWidth" in changes && !("maxTabWidth" in changes)) {
      nextSettings.maxTabWidth = Math.max(
        nextSettings.minTabWidth,
        nextSettings.maxTabWidth,
      );
    } else if ("maxTabWidth" in changes && !("minTabWidth" in changes)) {
      nextSettings.minTabWidth = Math.min(
        nextSettings.minTabWidth,
        nextSettings.maxTabWidth,
      );
    }
    this.settings = this.normalizeSettings(nextSettings);
    await this.saveData(this.settings);
    this.applySettingsToAllDocuments();
    this.queueRefresh();
  }

  applySettingsToAllDocuments() {
    for (const { doc } of this.windowBindings.values()) {
      this.applySettingsToDocument(doc);
    }
  }

  applySettingsToDocument(doc) {
    if (!doc?.body) {
      return;
    }

    doc.body.style.setProperty(
      "--multiline-tabs-visible-rows",
      String(this.settings.visibleRows),
    );
    doc.body.style.setProperty(
      "--multiline-tabs-min-width",
      `${this.settings.minTabWidth}px`,
    );
    doc.body.style.setProperty(
      "--multiline-tabs-max-width",
      `${this.settings.maxTabWidth}px`,
    );
    doc.body.style.setProperty(
      "--multiline-tabs-ideal-width",
      `${this.settings.idealTabWidth}px`,
    );
    doc.body.style.setProperty(
      "--multiline-tabs-tab-width",
      `${this.settings.idealTabWidth}px`,
    );
    doc.body.style.setProperty(
      "--multiline-tabs-row-height",
      `${this.settings.rowHeight}px`,
    );
    doc.body.style.setProperty(
      "--multiline-tabs-row-gap",
      `${this.settings.rowGap}px`,
    );
    doc.body.style.setProperty(
      "--multiline-tabs-scrollbar-width",
      `${this.settings.scrollbarWidth}px`,
    );
    for (const handle of doc.querySelectorAll(
      "[data-multiline-tabs-row-resize-handle='true']",
    )) {
      handle.setAttribute("aria-valuenow", String(this.settings.visibleRows));
    }
  }

  applyVisibleRowsPreview(visibleRows) {
    for (const { doc } of this.windowBindings.values()) {
      if (!doc?.body) {
        continue;
      }

      doc.body.style.setProperty(
        "--multiline-tabs-visible-rows",
        String(visibleRows),
      );
      for (const handle of doc.querySelectorAll(
        "[data-multiline-tabs-row-resize-handle='true']",
      )) {
        handle.setAttribute("aria-valuenow", String(visibleRows));
      }
    }
  }

  clearSettingsFromDocument(doc) {
    doc?.body?.style.removeProperty("--multiline-tabs-visible-rows");
    doc?.body?.style.removeProperty("--multiline-tabs-min-width");
    doc?.body?.style.removeProperty("--multiline-tabs-max-width");
    doc?.body?.style.removeProperty("--multiline-tabs-ideal-width");
    doc?.body?.style.removeProperty("--multiline-tabs-tab-width");
    doc?.body?.style.removeProperty("--multiline-tabs-row-height");
    doc?.body?.style.removeProperty("--multiline-tabs-row-gap");
    doc?.body?.style.removeProperty("--multiline-tabs-scrollbar-width");
  }

  queueRefresh() {
    if (this.isDragSessionActive() || this.rowResize) {
      this.refreshAfterDrag = true;
      return;
    }

    if (this.refreshFrame !== null) {
      cancelAnimationFrame(this.refreshFrame);
    }

    this.refreshFrame = requestAnimationFrame(() => {
      this.refreshFrame = null;
      this.refreshBindings();
    });
  }

  createDropIndicatorStyle(doc) {
    const style = doc.createElement("style");
    style.textContent = `${AUTOFIT_STYLE_TEXT}

      .workspace-tab-header[data-multiline-tabs-drop-position="before"] {
        box-shadow: inset 3px 0 0 var(--interactive-accent) !important;
      }
      .workspace-tab-header[data-multiline-tabs-drop-position="after"] {
        box-shadow: inset -3px 0 0 var(--interactive-accent) !important;
      }
      .workspace-tab-header[data-multiline-tabs-drop-position="same"] {
        box-shadow: inset 0 0 0 2px var(--interactive-accent) !important;
      }
      .workspace-tab-header[data-multiline-tabs-drop-position="before-vertical"] {
        box-shadow: inset 0 3px 0 var(--interactive-accent) !important;
      }
      .workspace-tab-header[data-multiline-tabs-drop-position="after-vertical"] {
        box-shadow: inset 0 -3px 0 var(--interactive-accent) !important;
      }
    `;
    doc.head.appendChild(style);
    return style;
  }

  bindTabWindow(win) {
    if (!win?.document || this.windowBindings.has(win)) {
      return;
    }

    const doc = win.document;
    if (!doc.body || !doc.head || !win.MutationObserver) {
      return;
    }

    const observer = new win.MutationObserver(() => this.queueRefresh());
    observer.observe(doc.body, {
      childList: true,
      subtree: true,
    });

    win.addEventListener("pointerdown", this.boundTabPointerDown, true);
    win.addEventListener("pointerup", this.boundTabPointerUp, true);
    win.addEventListener("pointercancel", this.boundTabPointerCancel, true);
    win.addEventListener("dragstart", this.boundTabDragStart, true);
    win.addEventListener("dragover", this.boundTabDragOver, true);
    win.addEventListener("dragenter", this.boundTabDragEnter, true);
    win.addEventListener("drop", this.boundTabDrop, true);
    win.addEventListener("dragend", this.boundTabDragEnd, true);
    win.addEventListener("wheel", this.boundDragWheel, true);
    win.addEventListener("resize", this.boundRefresh);

    this.windowBindings.set(win, {
      doc,
      observer,
      dropIndicatorStyle: this.createDropIndicatorStyle(doc),
    });
    this.applySettingsToDocument(doc);
  }

  unbindTabWindow(win) {
    const binding = this.windowBindings.get(win);
    if (!binding) {
      return;
    }

    if (this.rowResize?.window === win) {
      this.cancelRowResize();
    }
    this.detachBindings(binding.doc);
    win.removeEventListener("pointerdown", this.boundTabPointerDown, true);
    win.removeEventListener("pointerup", this.boundTabPointerUp, true);
    win.removeEventListener("pointercancel", this.boundTabPointerCancel, true);
    win.removeEventListener("dragstart", this.boundTabDragStart, true);
    win.removeEventListener("dragover", this.boundTabDragOver, true);
    win.removeEventListener("dragenter", this.boundTabDragEnter, true);
    win.removeEventListener("drop", this.boundTabDrop, true);
    win.removeEventListener("dragend", this.boundTabDragEnd, true);
    win.removeEventListener("wheel", this.boundDragWheel, true);
    win.removeEventListener("resize", this.boundRefresh);
    binding.observer.disconnect();
    binding.dropIndicatorStyle.remove();
    this.removeRowResizeHandles(binding.doc);
    this.windowBindings.delete(win);
  }

  getWorkspaceWindows() {
    const windows = new Set([window]);
    this.app.workspace.iterateAllLeaves((leaf) => {
      const win =
        leaf.getContainer?.()?.win ??
        leaf.containerEl?.ownerDocument?.defaultView ??
        leaf.view?.containerEl?.ownerDocument?.defaultView ??
        leaf.parent?.containerEl?.ownerDocument?.defaultView;
      if (win?.document) {
        windows.add(win);
      }
    });
    return windows;
  }

  isElement(element) {
    return element?.nodeType === 1 && typeof element.closest === "function";
  }

  isDragSessionActive() {
    return Boolean(this.tabDrag || this.remoteDrag);
  }

  hasDeferredRefresh() {
    return this.refreshAfterDrag && !this.isDragSessionActive() && !this.rowResize;
  }

  flushDeferredRefresh() {
    if (!this.hasDeferredRefresh()) {
      return;
    }

    this.refreshAfterDrag = false;
    this.queueRefresh();
  }

  postDragMessage(message) {
    const payload = {
      ...message,
      plugin: "multiline-tabs-wheel-scroll",
      sentAt: Date.now(),
      sender: this.dragContextId,
    };
    this.dragChannel?.postMessage(payload);
    try {
      window.localStorage.setItem(this.dragBusKey, JSON.stringify(payload));
    } catch {
      // Some Obsidian window types do not expose persistent storage.
    }
  }

  rememberDragSource(source) {
    if (!source?.dragToken) {
      return;
    }

    this.dragSources.set(source.dragToken, source);
    const previousTimer = this.dragSourceCleanupTimers.get(source.dragToken);
    if (previousTimer) {
      clearTimeout(previousTimer);
    }

    const cleanupTimer = setTimeout(() => {
      this.dragSources.delete(source.dragToken);
      this.dragSourceCleanupTimers.delete(source.dragToken);
    }, 5000);
    this.dragSourceCleanupTimers.set(source.dragToken, cleanupTimer);
  }

  handleDragChannelMessage(event) {
    const message = event.data;
    if (
      !message ||
      typeof message !== "object" ||
      message.plugin !== "multiline-tabs-wheel-scroll"
    ) {
      return;
    }

    if (
      message.type === "drag-start" &&
      message.sourceContextId &&
      message.sourceContextId !== this.dragContextId &&
      message.token &&
      message.sourceLeafId !== undefined
    ) {
      this.remoteDrag = {
        token: message.token,
        sourceContextId: message.sourceContextId,
        sourceLeafId: message.sourceLeafId,
      };
      this.clearDropMarker();
      return;
    }

    if (
      message.type === "drop-request" &&
      message.sourceContextId === this.dragContextId &&
      message.token
    ) {
      const source =
        this.dragSources.get(message.token) ??
        (this.tabDrag?.dragToken === message.token ? this.tabDrag : null);
      const targetLeaf = this.findLeafById(message.targetLeafId);
      if (source?.leaf && targetLeaf) {
        this.moveLeafRelative(source.leaf, targetLeaf, Boolean(message.after));
      }
      if (this.tabDrag?.dragToken === message.token) {
        this.handleNativeTabDragEnd();
      } else {
        this.postDragMessage({ type: "drag-end", token: message.token });
      }
      return;
    }

    if (
      message.type === "drag-end" &&
      this.remoteDrag?.token === message.token
    ) {
      this.remoteDrag = null;
      this.clearDropMarker();
      this.flushDeferredRefresh();
    }

    if (
      message.type === "drag-cancel" &&
      message.sourceContextId === this.dragContextId &&
      this.tabDrag?.dragToken === message.token
    ) {
      this.handleNativeTabDragEnd();
    }
  }

  findLeafById(leafId) {
    let match = null;
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (String(leaf.id) === String(leafId)) {
        match = leaf;
      }
    });
    return match;
  }

  rememberDropTarget(drop, point) {
    if (!drop?.target?.leaf || !point?.token) {
      return;
    }

    this.lastDropTarget = {
      token: point.token,
      sourceContextId: point.sourceContextId,
      sourceLeafId: point.sourceLeafId,
      document: point.document,
      targetLeafId: drop.target.leaf.id,
      after: Boolean(drop.target.after),
      vertical: Boolean(drop.target.vertical),
    };
  }

  getRememberedDropTarget(drag, destinationDocument) {
    const target = this.lastDropTarget;
    if (
      !target ||
      target.document !== destinationDocument ||
      target.token !== drag?.token ||
      target.sourceContextId !== drag?.sourceContextId
    ) {
      return null;
    }

    const targetLeaf = this.findLeafById(target.targetLeafId);
    return targetLeaf
      ? {
          target: {
            leaf: targetLeaf,
            after: target.after,
            vertical: target.vertical,
          },
        }
      : null;
  }

  readDragPayload(event) {
    const dataTransfer = event.dataTransfer;
    if (!dataTransfer) {
      return null;
    }

    const types = Array.from(dataTransfer.types ?? []);
    if (!types.includes(TAB_DRAG_MIME)) {
      return null;
    }

    try {
      const value = dataTransfer.getData(TAB_DRAG_MIME);
      if (!value) {
        return null;
      }
      const payload = JSON.parse(value);
      return payload?.token && payload?.sourceContextId ? payload : null;
    } catch {
      return null;
    }
  }

  hasNativeTabDragPayload(event) {
    const types = Array.from(event.dataTransfer?.types ?? []);
    return types.some(
      (type) =>
        type === TAB_DRAG_MIME ||
        (/obsidian/i.test(type) && /drag|leaf|tab|workspace/i.test(type)),
    );
  }

  getDragSourceForEvent(event) {
    const destinationDocument =
      event.target?.ownerDocument ?? event.view?.document ?? document;
    const source = this.tabDrag;
    if (source?.dragToken && source.parent.children.includes(source.leaf)) {
      return {
        kind: source.sourceDocument === destinationDocument ? "local" : "remote",
        token: source.dragToken,
        sourceContextId: this.dragContextId,
        sourceLeafId: source.leaf.id,
        source,
      };
    }

    const payload = this.readDragPayload(event);
    const remote =
      payload ??
      (this.remoteDrag?.token
        ? this.remoteDrag
        : null);
    if (!remote) {
      return this.hasNativeTabDragPayload(event)
        ? {
            kind: "pending",
            token: null,
            sourceContextId: null,
            sourceLeafId: null,
            source: null,
          }
        : null;
    }

    return {
      kind: "remote",
      token: remote.token,
      sourceContextId: remote.sourceContextId,
      sourceLeafId: remote.sourceLeafId,
      source:
        remote.sourceContextId === this.dragContextId
          ? this.dragSources.get(remote.token) ?? null
          : null,
    };
  }

  refreshBindings() {
    const activeWindows = this.getWorkspaceWindows();
    for (const win of activeWindows) {
      this.bindTabWindow(win);
    }
    for (const win of this.windowBindings.keys()) {
      if (!activeWindows.has(win)) {
        this.unbindTabWindow(win);
      }
    }

    const diagnostics = [];
    for (const { doc } of this.windowBindings.values()) {
      this.detachBindings(doc);
      const containers = doc.querySelectorAll(TAB_CONTAINER_SELECTOR);
      for (const container of containers) {
        if (!this.isElement(container)) {
          continue;
        }

        if (doc === document) {
          diagnostics.push(this.collectDiagnostics(container));
        }

        container.dataset.multilineTabsWheelScroll = "true";
        container.addEventListener("wheel", this.boundWheelHandler, { passive: false });
        this.ensureRowResizeHandle(container.parentElement, doc);

        if (doc !== document) {
          continue;
        }

        const rightSidebarButton = container.parentElement?.querySelector(
          ":scope > .sidebar-toggle-button.mod-right",
        );
        if (this.isElement(rightSidebarButton)) {
          rightSidebarButton.dataset.multilineTabsSidebarBinding = "true";
          rightSidebarButton.style.webkitAppRegion = "no-drag";
          rightSidebarButton.style.pointerEvents = "auto";
          rightSidebarButton.style.cursor = "pointer";
          rightSidebarButton.addEventListener("mousedown", this.boundRightSidebarClick);

          const rightSidebarIcon = rightSidebarButton.querySelector(".clickable-icon");
          if (this.isElement(rightSidebarIcon)) {
            rightSidebarIcon.dataset.multilineTabsSidebarBinding = "true";
            rightSidebarIcon.style.webkitAppRegion = "no-drag";
            rightSidebarIcon.style.pointerEvents = "auto";
            rightSidebarIcon.style.cursor = "pointer";
            rightSidebarIcon.addEventListener("mousedown", this.boundRightSidebarClick);
          }
        }
      }
    }

    this.writeDiagnostics(diagnostics);
  }

  detachBindings(doc) {
    const containers = doc.querySelectorAll("[data-multiline-tabs-wheel-scroll='true']");
    for (const container of containers) {
      if (!this.isElement(container)) {
        continue;
      }

      container.removeEventListener("wheel", this.boundWheelHandler);
      delete container.dataset.multilineTabsWheelScroll;
    }

    const rightSidebarButtons = doc.querySelectorAll(
      "[data-multiline-tabs-sidebar-binding='true']",
    );
    for (const button of rightSidebarButtons) {
      if (!this.isElement(button)) {
        continue;
      }

      button.removeEventListener("mousedown", this.boundRightSidebarClick);
      button.style.removeProperty("pointer-events");
      button.style.removeProperty("cursor");
      button.style.removeProperty("webkit-app-region");
      delete button.dataset.multilineTabsSidebarBinding;
    }
  }

  removeRowResizeHandles(doc) {
    for (const handle of doc?.querySelectorAll?.(
      "[data-multiline-tabs-row-resize-handle='true']",
    ) ?? []) {
      if (!this.isElement(handle)) {
        continue;
      }

      handle.removeEventListener("pointerdown", this.boundRowResizePointerDown);
      handle.remove();
    }
  }

  ensureRowResizeHandle(headerContainer, doc) {
    if (!this.isElement(headerContainer)) {
      return null;
    }

    const existing = headerContainer.querySelector(
      ":scope > [data-multiline-tabs-row-resize-handle='true']",
    );
    if (this.isElement(existing)) {
      existing.setAttribute("aria-valuenow", String(this.settings.visibleRows));
      existing.addEventListener("pointerdown", this.boundRowResizePointerDown);
      return existing;
    }

    const handle = doc.createElement("div");
    handle.className = "multiline-tabs-row-resize-handle";
    handle.dataset.multilineTabsRowResizeHandle = "true";
    handle.setAttribute("role", "separator");
    handle.setAttribute("aria-orientation", "horizontal");
    handle.setAttribute("aria-valuemin", String(SETTINGS_LIMITS.visibleRows.min));
    handle.setAttribute("aria-valuemax", String(SETTINGS_LIMITS.visibleRows.max));
    handle.setAttribute("aria-valuenow", String(this.settings.visibleRows));
    handle.setAttribute("aria-label", "Resize visible tab rows");
    handle.title = "Drag to change visible tab rows";
    handle.setAttribute("draggable", "false");
    handle.textContent = "";
    handle.addEventListener("pointerdown", this.boundRowResizePointerDown);
    headerContainer.appendChild(handle);
    return handle;
  }

  handleRowResizePointerDown(event) {
    if (event.button !== 0 || event.isPrimary === false || this.rowResize) {
      return;
    }

    const handle = event.currentTarget;
    if (!this.isElement(handle)) {
      return;
    }

    const resizeWindow = handle.ownerDocument?.defaultView;
    if (!resizeWindow) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    this.rowResize = {
      document: handle.ownerDocument,
      handle,
      window: resizeWindow,
      pointerId: event.pointerId,
      startY: event.clientY,
      startRows: this.settings.visibleRows,
      currentRows: this.settings.visibleRows,
    };
    handle.classList.add("is-dragging");
    handle.setPointerCapture?.(event.pointerId);
    resizeWindow.addEventListener("pointermove", this.boundRowResizePointerMove, true);
    resizeWindow.addEventListener("pointerup", this.boundRowResizePointerUp, true);
    resizeWindow.addEventListener(
      "pointercancel",
      this.boundRowResizePointerCancel,
      true,
    );
  }

  handleRowResizePointerMove(event) {
    const state = this.rowResize;
    if (!state || event.pointerId !== state.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const rowStep = Math.max(1, this.settings.rowHeight + this.settings.rowGap);
    const rowDelta = Math.round((event.clientY - state.startY) / rowStep);
    const nextRows = Math.min(
      SETTINGS_LIMITS.visibleRows.max,
      Math.max(SETTINGS_LIMITS.visibleRows.min, state.startRows + rowDelta),
    );
    if (nextRows === state.currentRows) {
      return;
    }

    state.currentRows = nextRows;
    this.applyVisibleRowsPreview(nextRows);
  }

  async handleRowResizePointerUp(event) {
    const state = this.rowResize;
    if (!state || event.pointerId !== state.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    this.finishRowResize(state.currentRows);
  }

  handleRowResizePointerCancel(event) {
    const state = this.rowResize;
    if (!state || event.pointerId !== state.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    this.cancelRowResize();
  }

  releaseRowResizePointerCapture(state) {
    try {
      state.handle.releasePointerCapture?.(state.pointerId);
    } catch {
      // The handle may already be disconnected when its window closes.
    }
  }

  finishRowResize(rows) {
    const state = this.rowResize;
    if (!state) {
      return;
    }

    state.window.removeEventListener("pointermove", this.boundRowResizePointerMove, true);
    state.window.removeEventListener("pointerup", this.boundRowResizePointerUp, true);
    state.window.removeEventListener(
      "pointercancel",
      this.boundRowResizePointerCancel,
      true,
    );
    this.releaseRowResizePointerCapture(state);
    state.handle.classList.remove("is-dragging");
    this.rowResize = null;

    const nextRows = this.clampSetting(
      rows,
      SETTINGS_LIMITS.visibleRows,
      this.settings.visibleRows,
    );
    if (nextRows === this.settings.visibleRows) {
      this.applySettingsToAllDocuments();
      this.flushDeferredRefresh();
      return;
    }

    void this.updateSettings({ visibleRows: nextRows }).catch((error) => {
      console.error("Failed to save visible tab rows", error);
      this.applySettingsToAllDocuments();
    });
    this.flushDeferredRefresh();
  }

  cancelRowResize() {
    const state = this.rowResize;
    if (!state) {
      return;
    }

    state.window.removeEventListener("pointermove", this.boundRowResizePointerMove, true);
    state.window.removeEventListener("pointerup", this.boundRowResizePointerUp, true);
    state.window.removeEventListener(
      "pointercancel",
      this.boundRowResizePointerCancel,
      true,
    );
    this.releaseRowResizePointerCapture(state);
    state.handle.classList.remove("is-dragging");
    this.rowResize = null;
    this.applySettingsToAllDocuments();
    this.flushDeferredRefresh();
  }

  detachTabDragHandlers() {
    for (const win of [...this.windowBindings.keys()]) {
      this.unbindTabWindow(win);
    }
    this.clearDropMarker();
    this.pendingTabDrag = null;
    this.tabDrag = null;
    this.remoteDrag = null;
  }

  findTabGroupModel(groupEl) {
    let match = null;
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (leaf.parent?.containerEl === groupEl) {
        match = leaf.parent;
      }
    });
    return match;
  }

  getTabContext(header) {
    const inner = header.parentElement;
    const groupEl = header.closest(".workspace-tabs");
    if (
      !this.isElement(inner) ||
      !inner.classList.contains("workspace-tab-header-container-inner") ||
      !this.isElement(groupEl) ||
      !groupEl.classList.contains("mod-top") ||
      !groupEl.closest(".workspace-split.mod-root")
    ) {
      return null;
    }

    const parent = this.findTabGroupModel(groupEl);
    const headers = Array.from(inner.children).filter((child) =>
      child.classList.contains("workspace-tab-header"),
    );
    if (!parent || parent.children.length !== headers.length) {
      return null;
    }

    const index = headers.indexOf(header);
    const leaf = parent.children[index];
    return leaf ? { groupEl, inner, parent, headers, leaf } : null;
  }

  isValidTabContext(context) {
    return Boolean(
      context &&
        typeof context.parent.removeChild === "function" &&
        typeof context.parent.insertChild === "function" &&
        typeof context.parent.selectTabIndex === "function" &&
        typeof context.leaf.setDimension === "function",
    );
  }

  handleTabPointerDown(event) {
    this.pendingTabDrag = null;
    if (event.button !== 0 || event.isPrimary === false) {
      return;
    }

    const target = event.target;
    if (!this.isElement(target)) {
      return;
    }

    if (target.closest("button, a, input, [role='button'], .workspace-tab-header-inner-close-button")) {
      return;
    }

    const header = target.closest(".workspace-tab-header");
    if (!this.isElement(header)) {
      return;
    }

    const context = this.getTabContext(header);
    if (!this.isValidTabContext(context)) {
      return;
    }

    this.pendingTabDrag = {
      ...context,
      sourceHeader: header,
      sourceDocument: header.ownerDocument,
    };
  }

  handleTabPointerEnd() {
    this.pendingTabDrag = null;
  }

  handleNativeTabDragStart(event) {
    const pointerSource = this.pendingTabDrag;
    this.pendingTabDrag = null;
    this.clearDropMarker();
    this.tabDrag = null;
    const target = event.target;
    if (!this.isElement(target)) {
      return;
    }

    if (target.closest("button, a, input, [role='button'], .workspace-tab-header-inner-close-button")) {
      return;
    }

    const header = target.closest(".workspace-tab-header");
    if (!this.isElement(header)) {
      return;
    }

    const context = this.getTabContext(header);
    const pointerContext =
      pointerSource?.sourceHeader === header &&
      pointerSource.sourceDocument === header.ownerDocument
        ? pointerSource
        : null;
    const source = this.isValidTabContext(context) ? context : pointerContext;
    if (!source) {
      return;
    }

    this.tabDrag = {
      ...source,
      sourceHeader: header,
      sourceDocument: header.ownerDocument,
      dragToken: `${this.dragContextId}:${Date.now()}:${Math.random()
        .toString(36)
        .slice(2)}`,
      sourceContextId: this.dragContextId,
    };
    this.rememberDragSource(this.tabDrag);

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      try {
        event.dataTransfer.setData(
          TAB_DRAG_MIME,
          JSON.stringify({
            token: this.tabDrag.dragToken,
            sourceContextId: this.dragContextId,
            sourceLeafId: this.tabDrag.leaf.id,
          }),
        );
      } catch {
        // Obsidian may expose a protected drag data store.
      }
    }
    this.postDragMessage({
      type: "drag-start",
      token: this.tabDrag.dragToken,
      sourceContextId: this.dragContextId,
      sourceLeafId: this.tabDrag.leaf.id,
    });
  }

  handleNativeTabDragOver(event) {
    const drag = this.getDragSourceForEvent(event);
    if (!drag) {
      this.clearDropMarker();
      return;
    }

    const destinationDocument = event.target?.ownerDocument ?? event.view?.document;
    if (!destinationDocument) {
      return;
    }

    // Keep Obsidian from interpreting a recognized tab drag as a split or popout.
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }

    const dragArea = this.findDragContainerAtPoint(
      event.clientX,
      event.clientY,
      destinationDocument,
    );
    if (!dragArea) {
      this.clearDropMarker();
      this.stopDragEdgeScroll();
      return;
    }

    this.updateDragEdgeScroll(dragArea, event.clientY);

    if (!drag.token || !dragArea.inside) {
      this.clearDropMarker();
      return;
    }

    this.queueDropMarker(event, drag);
  }

  queueDropMarker(event, drag) {
    const destinationDocument =
      event.target?.ownerDocument ?? event.view?.document ?? document;
    this.pendingDragPoint = {
      clientX: event.clientX,
      clientY: event.clientY,
      document: destinationDocument,
      token: drag.token,
      sourceContextId: drag.sourceContextId,
      sourceLeafId: drag.sourceLeafId,
    };
    this.lastDragPoint = this.pendingDragPoint;
    if (this.dragFrame !== null) {
      return;
    }

    const dragWindow = destinationDocument.defaultView;
    this.dragFrameWindow = dragWindow;
    const requestFrame =
      dragWindow?.requestAnimationFrame?.bind(dragWindow) ?? requestAnimationFrame;
    this.dragFrame = requestFrame(() => {
      this.dragFrame = null;
      this.dragFrameWindow = null;
      const point = this.lastDragPoint;
      this.pendingDragPoint = null;
      if (
        !point ||
        !this.isCurrentDragToken(point.token, point.sourceContextId)
      ) {
        this.clearDropMarker();
        return;
      }

      const drop = this.findDropAtPointer({
        clientX: point.clientX,
        clientY: point.clientY,
        target: { ownerDocument: point.document },
        view: { document: point.document },
      });
      if (!drop) {
        this.clearDropMarker();
        return;
      }

      const position =
        String(drop.target.leaf.id) === String(point.sourceLeafId)
          ? "same"
          : `${drop.target.after ? "after" : "before"}${drop.target.vertical ? "-vertical" : ""}`;
      this.setDropMarker(drop.target.header, position);
      this.rememberDropTarget(drop, point);
    });
  }

  isCurrentDragToken(token, sourceContextId) {
    return Boolean(
      (this.tabDrag?.dragToken === token &&
        this.tabDrag.sourceContextId === sourceContextId) ||
        this.remoteDrag?.token === token ||
        (sourceContextId === this.dragContextId && this.dragSources.has(token)),
    );
  }

  handleNativeTabDrop(event) {
    const drag = this.getDragSourceForEvent(event);
    const hasPotentialDrag = Boolean(drag || this.hasNativeTabDragPayload(event));
    if (!hasPotentialDrag) {
      return;
    }

    const destinationDocument = event.target?.ownerDocument ?? event.view?.document;
    if (!destinationDocument) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    this.suppressNativeDragEnd = true;
    if (!drag?.token) {
      this.clearDropMarker();
      this.stopDragEdgeScroll();
      return;
    }
    const drop =
      this.getRememberedDropTarget(drag, destinationDocument) ??
      this.findDropAtPointer(event);
    if (!drop) {
      if (drag.kind === "remote") {
        this.postDragMessage({
          type: "drag-cancel",
          token: drag.token,
          sourceContextId: drag.sourceContextId,
        });
      }
      this.handleNativeTabDragEnd();
      return;
    }

    const sourceLeaf =
      drag.source?.leaf ??
      this.findLeafById(drag.sourceLeafId);
    let moved = false;
    if (sourceLeaf && drop.target.leaf !== sourceLeaf) {
      moved = this.moveLeafRelative(sourceLeaf, drop.target.leaf, drop.target.after);
    } else if (sourceLeaf) {
      moved = true;
    }

    if (!moved && drag.sourceContextId !== this.dragContextId) {
      this.postDragMessage({
        type: "drop-request",
        token: drag.token,
        sourceContextId: drag.sourceContextId,
        targetLeafId: drop.target.leaf.id,
        after: drop.target.after,
      });
    }
    this.handleNativeTabDragEnd();
  }

  findDropTarget(source, clientX, clientY) {
    if (source.parent.children.length !== source.headers.length) {
      return null;
    }

    let nearest = null;
    let nearestDistance = Infinity;
    for (let index = 0; index < source.headers.length; index += 1) {
      const header = source.headers[index];
      const rect = header.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        continue;
      }

      const dx = Math.max(rect.left - clientX, 0, clientX - rect.right);
      const dy = Math.max(rect.top - clientY, 0, clientY - rect.bottom);
      const distance = dx * dx + dy * dy;
      if (distance < nearestDistance) {
        nearestDistance = distance;
        const vertical =
          Math.abs(clientY - (rect.top + rect.bottom) / 2) >
          Math.abs(clientX - (rect.left + rect.right) / 2);
        nearest = {
          header,
          leaf: source.parent.children[index],
          vertical,
          after: vertical
            ? clientY >= (rect.top + rect.bottom) / 2
            : clientX >= (rect.left + rect.right) / 2,
        };
      }
    }

    return nearest;
  }

  findTabGroupAtPoint(clientX, clientY, doc = document) {
    let nearest = null;
    let nearestArea = Infinity;

    for (const inner of doc.querySelectorAll(TAB_CONTAINER_SELECTOR)) {
      if (!this.isElement(inner) || !inner.isConnected) {
        continue;
      }

      const rect = inner.getBoundingClientRect();
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        continue;
      }

      const groupEl = inner.closest(".workspace-tabs");
      if (
        !this.isElement(groupEl) ||
        !groupEl.classList.contains("mod-top") ||
        !groupEl.closest(".workspace-split.mod-root")
      ) {
        continue;
      }

      const parent = this.findTabGroupModel(groupEl);
      const headers = Array.from(inner.children).filter((child) =>
        child.classList.contains("workspace-tab-header"),
      );
      if (
        !parent ||
        parent.children.length !== headers.length ||
        typeof parent.insertChild !== "function" ||
        typeof parent.selectTabIndex !== "function"
      ) {
        continue;
      }

      const area = rect.width * rect.height;
      if (area < nearestArea) {
        nearest = { groupEl, inner, parent, headers };
        nearestArea = area;
      }
    }

    return nearest;
  }

  setDropMarker(header, position) {
    if (this.dropMarker?.header === header && this.dropMarker.position === position) {
      return;
    }

    this.clearDropMarker();
    header.dataset.multilineTabsDropPosition = position;
    this.dropMarker = { header, position };
  }

  clearDropMarker() {
    if (this.dropMarker?.header) {
      delete this.dropMarker.header.dataset.multilineTabsDropPosition;
    }
    this.dropMarker = null;
  }

  getTabDrop(event) {
    const source = this.tabDrag;
    if (
      !source ||
      !source.parent.children.includes(source.leaf)
    ) {
      return null;
    }

    const drop = this.findDropAtPointer(event);
    return drop ? { source, ...drop } : null;
  }

  findDropAtPointer(event) {
    const destinationDocument = event.target?.ownerDocument ?? event.view?.document ?? document;
    const destination = this.findTabGroupAtPoint(
      event.clientX,
      event.clientY,
      destinationDocument,
    );
    if (!destination) {
      return null;
    }

    const target = this.findDropTarget(destination, event.clientX, event.clientY);
    return target ? { destination, target } : null;
  }

  moveLeafRelative(sourceLeaf, targetLeaf, after) {
    const sourceParent = sourceLeaf.parent;
    const destinationParent = targetLeaf.parent;
    const fromIndex = sourceParent?.children.indexOf(sourceLeaf) ?? -1;
    const targetIndex = destinationParent?.children.indexOf(targetLeaf) ?? -1;
    if (fromIndex < 0 || targetIndex < 0) {
      this.handleNativeTabDragEnd();
      return false;
    }

    let insertIndex = targetIndex + (after ? 1 : 0);
    if (sourceParent === destinationParent && fromIndex < insertIndex) {
      insertIndex -= 1;
    }

    if (sourceParent !== destinationParent || fromIndex !== insertIndex) {
      try {
        sourceParent.removeChild(sourceLeaf);
        sourceLeaf.setDimension(null);
        destinationParent.insertChild(insertIndex, sourceLeaf);
        destinationParent.selectTabIndex(insertIndex);
        this.app.workspace.requestResize();
      } catch (error) {
        console.error("Failed to move multiline tab", error);
        return false;
      }
    }
    return true;
  }

  handleNativeTabDragEnd(event) {
    const shouldBlockNativeDragEnd = Boolean(
      event &&
        (this.tabDrag ||
          this.remoteDrag ||
          this.suppressNativeDragEnd ||
          this.hasNativeTabDragPayload(event)),
    );
    if (shouldBlockNativeDragEnd) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      this.suppressNativeDragEnd = false;
    }

    this.stopDragEdgeScroll();
    const token = this.tabDrag?.dragToken;
    if (token) {
      this.postDragMessage({
        type: "drag-end",
        token,
        sourceContextId: this.dragContextId,
      });
    }
    if (this.dragFrame !== null) {
      const cancelFrame =
        this.dragFrameWindow?.cancelAnimationFrame?.bind(this.dragFrameWindow) ??
        cancelAnimationFrame;
      cancelFrame(this.dragFrame);
    }
    this.dragFrame = null;
    this.dragFrameWindow = null;
    this.pendingDragPoint = null;
    this.lastDragPoint = null;
    this.lastDropTarget = null;
    this.clearDropMarker();
    this.tabDrag = null;
    this.remoteDrag = null;
    this.flushDeferredRefresh();
  }

  stopWheelAnimations() {
    for (const animation of this.wheelAnimations.values()) {
      animation.window?.cancelAnimationFrame?.(animation.frame);
    }
    this.wheelAnimations.clear();
  }

  findTabContainerAtPoint(clientX, clientY, doc) {
    for (const container of doc.querySelectorAll(TAB_CONTAINER_SELECTOR)) {
      if (!this.isElement(container) || !container.isConnected) {
        continue;
      }

      const rect = container.getBoundingClientRect();
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        return container;
      }
    }
    return null;
  }

  findDragContainerAtPoint(clientX, clientY, doc) {
    let nearest = null;
    let nearestDistance = Infinity;
    for (const container of doc.querySelectorAll(TAB_CONTAINER_SELECTOR)) {
      if (!this.isElement(container) || !container.isConnected) {
        continue;
      }

      const rect = container.getBoundingClientRect();
      const horizontalDistance = Math.max(
        rect.left - clientX,
        0,
        clientX - rect.right,
      );
      const verticalDistance = Math.max(
        rect.top - clientY,
        0,
        clientY - rect.bottom,
      );
      const distance = horizontalDistance ** 2 + verticalDistance ** 2;
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        distance < nearestDistance
      ) {
        nearest = {
          container,
          inside: clientY >= rect.top && clientY <= rect.bottom,
          rect,
        };
        nearestDistance = distance;
      }
    }
    return nearest;
  }

  updateDragEdgeScroll(area, clientY) {
    const { container, rect } = area;
    if (!area.inside || rect.height < 12) {
      this.stopDragEdgeScroll();
      return;
    }

    const edgeSize = Math.min(
      48,
      Math.max(18, rect.height * (this.settings.edgeScrollThreshold / 100)),
    );
    const distanceFromTop = clientY - rect.top;
    const distanceFromBottom = rect.bottom - clientY;
    let direction = 0;
    let intensity = 0;

    if (distanceFromTop < edgeSize && container.scrollTop > 0) {
      direction = -1;
      intensity = 1 - Math.max(0, distanceFromTop) / edgeSize;
    } else if (
      distanceFromBottom < edgeSize &&
      container.scrollTop < container.scrollHeight - container.clientHeight
    ) {
      direction = 1;
      intensity = 1 - Math.max(0, distanceFromBottom) / edgeSize;
    }

    if (!direction) {
      this.stopDragEdgeScroll();
      return;
    }

    const existing = this.dragEdgeScroll;
    if (existing?.container === container && existing.direction === direction) {
      existing.intensity = intensity;
      return;
    }

    this.stopDragEdgeScroll();
    const win = container.ownerDocument.defaultView;
    if (!win?.requestAnimationFrame) {
      return;
    }

    const state = {
      container,
      window: win,
      direction,
      intensity,
      frame: null,
      lastTimestamp: null,
    };
    this.dragEdgeScroll = state;
    const tick = (timestamp) => {
      if (this.dragEdgeScroll !== state || !this.isDragSessionActive()) {
        this.stopDragEdgeScroll();
        return;
      }

      const elapsed =
        state.lastTimestamp === null
          ? 16.67
          : Math.min(50, Math.max(1, timestamp - state.lastTimestamp));
      state.lastTimestamp = timestamp;
      const maxScrollTop = Math.max(
        0,
        container.scrollHeight - container.clientHeight,
      );
      const nextTop = Math.max(
        0,
        Math.min(
          maxScrollTop,
          container.scrollTop +
            state.direction *
              this.settings.edgeScrollSpeed *
              state.intensity *
              (elapsed / 1000),
        ),
      );
      if (nextTop === container.scrollTop) {
        this.stopDragEdgeScroll();
        return;
      }

      container.scrollTop = nextTop;
      const point = this.pendingDragPoint;
      if (point && point.document === container.ownerDocument) {
        this.queueDropMarker(
          {
            clientX: point.clientX,
            clientY: point.clientY,
            target: { ownerDocument: point.document },
            view: { document: point.document },
          },
          {
            token: point.token,
            sourceContextId: point.sourceContextId,
            sourceLeafId: point.sourceLeafId,
          },
        );
      }
      state.frame = win.requestAnimationFrame(tick);
    };
    state.frame = win.requestAnimationFrame(tick);
  }

  stopDragEdgeScroll() {
    const state = this.dragEdgeScroll;
    if (!state) {
      return;
    }
    if (state.frame !== null) {
      state.window.cancelAnimationFrame(state.frame);
    }
    this.dragEdgeScroll = null;
  }

  getWheelDelta(event, container) {
    const rawDelta = event.deltaY !== 0 ? event.deltaY : event.deltaX;
    if (!rawDelta) {
      return 0;
    }

    if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
      return rawDelta * 24 * this.settings.wheelSpeed;
    }
    if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
      return rawDelta * container.clientHeight * this.settings.wheelSpeed;
    }
    return rawDelta * this.settings.wheelSpeed;
  }

  handleDragWheel(event) {
    const destinationDocument =
      event.target?.ownerDocument ?? event.view?.document ?? document;
    const drag = this.getDragSourceForEvent(event);
    if (!drag || !destinationDocument) {
      return;
    }

    const container = this.findTabContainerAtPoint(
      event.clientX,
      event.clientY,
      destinationDocument,
    );
    if (!container) {
      return;
    }

    const delta = this.getWheelDelta(event, container);
    if (!delta || !this.animateWheelScroll(container, delta)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    this.queueDropMarker(event, drag);
  }

  animateWheelScroll(container, delta) {
    const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
    const animation = this.wheelAnimations.get(container);
    const currentTop = container.scrollTop;
    const startTop = animation ? animation.target : currentTop;
    const target = Math.max(0, Math.min(maxScrollTop, startTop + delta));

    if (target === startTop) {
      return false;
    }

    if (animation) {
      animation.target = target;
      return true;
    }

    const animationWindow =
      container.ownerDocument?.defaultView ?? globalThis;
    const requestFrame =
      animationWindow.requestAnimationFrame?.bind(animationWindow) ??
      globalThis.requestAnimationFrame?.bind(globalThis);
    if (!requestFrame) {
      return false;
    }
    const state = {
      target,
      frame: null,
      lastTimestamp: null,
      window: animationWindow,
      requestFrame,
    };
    const tick = (timestamp) => {
      const elapsed =
        state.lastTimestamp === null
          ? 16.67
          : Math.min(50, Math.max(1, timestamp - state.lastTimestamp));
      state.lastTimestamp = timestamp;
      const distance = state.target - container.scrollTop;
      if (Math.abs(distance) < 0.5) {
        container.scrollTop = state.target;
        this.wheelAnimations.delete(container);
        return;
      }

      container.scrollTop +=
        distance * (1 - Math.exp(-elapsed / this.settings.wheelSmoothness));
      state.frame = state.requestFrame(tick);
    };

    this.wheelAnimations.set(container, state);
    state.frame = state.requestFrame(tick);
    return true;
  }

  handleWheel(event) {
    const container = event.currentTarget;
    if (!this.isElement(container)) {
      return;
    }

    const delta = this.getWheelDelta(event, container);
    if (!delta) {
      return;
    }

    if (this.animateWheelScroll(container, delta)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  handleRightSidebarClick(event) {
    this.sidebarClickCount += 1;
    event.preventDefault();
    event.stopPropagation();

    const workspaceElement = document.querySelector(".workspace");
    const isRightSidebarOpen =
      workspaceElement instanceof HTMLElement &&
      workspaceElement.classList.contains("is-right-sidedock-open");
    const rightSplit = this.app.workspace.rightSplit;

    if (isRightSidebarOpen) {
      if (rightSplit && typeof rightSplit.collapse === "function") {
        rightSplit.collapse();
      } else {
        this.executeSidebarCommand();
      }
    } else if (rightSplit && typeof rightSplit.expand === "function") {
      rightSplit.expand();
    } else if (rightSplit && typeof rightSplit.toggle === "function") {
      rightSplit.toggle();
    } else {
      this.executeSidebarCommand();
    }

    this.queueRefresh();
  }

  executeSidebarCommand() {
    const commandIds = [
      "app:toggle-right-sidebar",
      "workspace:toggle-right-sidebar",
      "workspace:toggle-right-split",
    ];

    for (const commandId of commandIds) {
      if (this.app.commands?.commands?.[commandId]) {
        this.app.commands.executeCommandById(commandId);
        return true;
      }
    }

    return false;
  }

  collectDiagnostics(container) {
    const headerContainer = container.parentElement;
    const split = headerContainer?.closest(".workspace-split");
    const workspaceTabs = headerContainer?.closest(".workspace-tabs");
    const describeElement = (element) => {
      if (!(element instanceof HTMLElement)) {
        return null;
      }

      const rect = element.getBoundingClientRect();
      const styles = window.getComputedStyle(element);
      return {
        classes: element.className,
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        screenLeft: Math.round(window.screenX + rect.left),
        screenTop: Math.round(window.screenY + rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        display: styles.display,
        visibility: styles.visibility,
        opacity: styles.opacity,
        pointerEvents: styles.pointerEvents,
        position: styles.position,
        zIndex: styles.zIndex,
      };
    };
    const newTabButton = headerContainer?.querySelector(":scope > .workspace-tab-header-new-tab");
    const tabListButton = headerContainer?.querySelector(":scope > .workspace-tab-header-tab-list");
    const rightSidebarButton = headerContainer?.querySelector(":scope > .sidebar-toggle-button.mod-right");
    const rightSplit = this.app.workspace.rightSplit;

    return {
      bodyClasses: document.body.className,
      workspaceClasses: document.querySelector(".workspace")?.className ?? null,
      rightSidedockOpen:
        document.querySelector(".workspace")?.classList.contains("is-right-sidedock-open") ?? false,
      sidebarClickCount: this.sidebarClickCount,
      rightSplitMethods: rightSplit
        ? Object.getOwnPropertyNames(Object.getPrototypeOf(rightSplit)).filter(
            (name) => typeof rightSplit[name] === "function",
          )
        : [],
      sidebarCommandIds: Object.keys(this.app.commands?.commands ?? {}).filter((commandId) =>
        /sidebar|sidedock|split/i.test(commandId),
      ),
      headerContainerClasses: headerContainer?.className ?? null,
      innerClasses: container.className,
      splitClasses: split?.className ?? null,
      workspaceTabsClasses: workspaceTabs?.className ?? null,
      directChildren: headerContainer
        ? Array.from(headerContainer.children).map((child) => ({
            tag: child.tagName,
            classes: child.className,
            text: (child.textContent || "").trim().slice(0, 80),
          }))
        : [],
      newTabButtons: headerContainer
        ? headerContainer.querySelectorAll(":scope > .workspace-tab-header-new-tab").length
        : 0,
      tabListButtons: headerContainer
        ? headerContainer.querySelectorAll(":scope > .workspace-tab-header-tab-list").length
        : 0,
      newTabButton: describeElement(newTabButton),
      tabListButton: describeElement(tabListButton),
      rightSidebarButton: describeElement(rightSidebarButton),
      tabCount: container.querySelectorAll(":scope > .workspace-tab-header").length,
    };
  }

  writeDiagnostics(diagnostics) {
    try {
      fs.writeFileSync(
        this.diagnosticPath,
        JSON.stringify(
          {
            updatedAt: new Date().toISOString(),
            isPopoutWindow: document.body.classList.contains("is-popout-window"),
            documentTitle: document.title,
            diagnostics,
          },
          null,
          2,
        ),
        "utf8",
      );
    } catch (error) {
      console.error("Failed to write tab diagnostics", error);
    }
  }
};
