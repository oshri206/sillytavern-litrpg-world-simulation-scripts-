# Valdris World UI Relocation Report

## Files examined
- `valdris-world-simulator/index.js` — original World Simulation UI markup and event wiring.
- `valdris-world-simulator/style.css` — original panel styles.
- `valdris-master-tracker/index.js` — confirmed Master Tracker UI to avoid changes.
- `valdris-world-simulator/manifest.json` — extension loading entry.

## Files changed
- `valdris-world-simulator/index.js` — removed embedded UI creation; now initializes UI module and updates via UI handle.
- `valdris-world-simulator/ui.js` — new UI presentation file (panel markup + event wiring + updates).
- `valdris-world-simulator/adapter.js` — new adapter exposing `window.ValdrisWorld` and binding to simulator.
- `valdris-world-simulator/style.css` — renamed/scoped selectors and animations for the UI panel.
- `valdris-world-simulator/manifest.json` — loads `ui.js` and `adapter.js` alongside `index.js`.
- `valdris-world-simulator/index.js.bak` — backup before edits.
- `valdris-world-simulator/style.css.bak` — backup before edits.
- `valdris-world-simulator/manifest.json.bak` — backup before edits.
- `move_world_ui_report.md` — this report.

## ID/class rename mapping
- `#valdris-world-panel` → `#valdris-world-sim-panel`
- `.vws-header` → `.valdris-world__header`
- `.vws-title` → `.valdris-world__title`
- `.vws-content` → `.valdris-world__content`
- `.vws-row` → `.valdris-world__row`
- `.vws-date-row` → `.valdris-world__date-row`
- `.vws-weather-row` → `.valdris-world__weather-row`
- `.vws-status-row` → `.valdris-world__status-row`
- `.vws-controls` → `.valdris-world__controls`
- `.vws-settings` → `.valdris-world__settings`
- `.vws-settings.hidden` → `.valdris-world__settings.is-hidden`
- `.vws-settings-section` → `.valdris-world__settings-section`
- `.vws-notification` → `.valdris-world__notification`
- `.vws-danger` → `.valdris-world__notification--danger`
- `.vws-success` → `.valdris-world__notification--success`
- `.vws-warning` → `.valdris-world__notification--warning`
- `@keyframes vws-slide-in` → `@keyframes valdris-world-slide-in`
- `@keyframes vws-fade-out` → `@keyframes valdris-world-fade-out`
- `.collapsed` → `.is-collapsed`
- `#vws-toggle-expand` → `#valdris-world-toggle-expand`
- `#vws-settings-btn` → `#valdris-world-settings-btn`
- `#vws-date-display` → `#valdris-world-date-display`
- `#vws-weather-display` → `#valdris-world-weather-display`
- `#vws-status-display` → `#valdris-world-status-display`
- `#vws-advance-hour` → `#valdris-world-advance-hour`
- `#vws-advance-day` → `#valdris-world-advance-day`
- `#vws-advance-week` → `#valdris-world-advance-week`
- `#vws-pause-time` → `#valdris-world-pause-time`
- `#vws-resume-time` → `#valdris-world-resume-time`
- `#vws-export-state` → `#valdris-world-export-state`
- `#vws-import-state` → `#valdris-world-import-state`
- `#vws-reset-state` → `#valdris-world-reset-state`

## Manual smoke-test checklist
1. Start SillyTavern via `Start.bat`, open the UI, and hard-refresh.
2. Verify a **Valdris World** panel appears (`#valdris-world-sim-panel`).
3. In the browser console:
   - `console.log(window.ValdrisWorld && Object.keys(window.ValdrisWorld))`
   - `console.log(window.ValdrisWorld && window.ValdrisWorld.smokeTest && window.ValdrisWorld.smokeTest())`
   - Expect `panelExists: true` and `adapterBound: true` if binding succeeded.
4. Click **Advance Day** → expect short rumor messages or internal logs, and no red console errors.
5. If `adapterBound` is false, confirm the UI is read-only and check console logs for adapter binding output.

## Revert instructions (using .bak)
- Restore UI logic: `cp valdris-world-simulator/index.js.bak valdris-world-simulator/index.js`
- Restore styles: `cp valdris-world-simulator/style.css.bak valdris-world-simulator/style.css`
- Restore manifest: `cp valdris-world-simulator/manifest.json.bak valdris-world-simulator/manifest.json`
- Remove new files if desired: `rm valdris-world-simulator/ui.js valdris-world-simulator/adapter.js`
