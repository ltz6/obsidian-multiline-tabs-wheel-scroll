# Multiline Tabs Wheel Scroll

An Obsidian desktop plugin for wrapped editor tabs.

## Features

- Smooth mouse-wheel scrolling through multiple tab rows.
- Three-row multiline tab layout with automatic tab width fitting.
- Drag a tab to any position within the same window.
- Drag tabs between separate Obsidian windows and attach them to the target tab group.
- Scroll or use edge auto-scroll while dragging to locate the target position.
- Keeps native tab controls and the right sidebar toggle usable.
- Adjustable minimum and maximum tab widths, with rows expanding to use available space.
- Individual setting restore buttons and a one-click restore-all action.
- Settings for tab rows, row spacing, wheel scrolling, drag edge scrolling, and scrollbar width.
- A native scrollbar that can be scrolled with the wheel or dragged directly with the mouse.

The multiline tab layout is built into the plugin. The separate `multiline-tabs-autofit.css` snippet is not required.

## Installation

Install it from Obsidian Community Plugins after it is approved. For manual installation, place `main.js` and `manifest.json` in:

`.obsidian/plugins/multiline-tabs-wheel-scroll/`

Then enable **Multiline Tabs Wheel Scroll** in Obsidian's community plugins settings.

After enabling the plugin, open its settings to adjust the tab layout, wheel
scrolling, drag edge scrolling, and scrollbar. The defaults preserve the
original behavior: three rows, 84-176 px tab width (124 px preferred width),
30 px row height, 2 px row gap, 100% wheel speed, 55 ms smoothness, 360 px/s
edge scrolling, 22% edge trigger area, and a 10 px scrollbar. Use **Restore**
to reset an individual value or **Restore all** to reset every setting.

## Compatibility

This plugin is desktop-only because cross-window tab dragging depends on Obsidian's desktop workspace windows.
