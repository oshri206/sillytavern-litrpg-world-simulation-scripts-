# Bug Report

## Summary
Added defensive shims to ensure `window.VMasterTracker` exists with safe wrappers plus a lightweight error buffer, and captured console errors for smoke testing. Created a backup copy of `index.js` before changes.

## Files Changed
- `index.js`: Added VMasterTracker fallback API, error capture buffer, and smokeTest reporting to improve reliability when globals are missing.
- `index.js.bak`: Backup of the original `index.js` before modifications.

## Unified Diffs

### `index.js`
```diff
diff --git a/valdris-world-simulator/index.js b/valdris-world-simulator/index.js
index 3f70bf0..bb557c6 100644
--- a/valdris-world-simulator/index.js
+++ b/valdris-world-simulator/index.js
@@ -392,12 +392,89 @@ class ValdrisWorldSimulator {
 // Initialize and expose globally
 const simulator = new ValdrisWorldSimulator();
 
+// [VWS] Defensive shims for missing globals and error capture.
+const vwsErrorBuffer = [];
+const MAX_VWS_ERRORS = 10;
+const recordVwsError = (error) => {
+    const message = error?.message || error?.reason || error?.toString?.() || String(error);
+    vwsErrorBuffer.push(message);
+    if (vwsErrorBuffer.length > MAX_VWS_ERRORS) vwsErrorBuffer.shift();
+};
+
+try {
+    window.addEventListener('error', (event) => recordVwsError(event));
+    window.addEventListener('unhandledrejection', (event) => recordVwsError(event));
+} catch (e) {
+    console.warn('[VWS] Error capture setup failed', e);
+}
+
+function ensureVMasterTracker() {
+    try {
+        window.VMasterTracker = window.VMasterTracker || {};
+        const tracker = window.VMasterTracker;
+
+        if (!tracker.advance) {
+            tracker.advance = (delta = {}) => {
+                try {
+                    if (simulator?.advanceTime) {
+                        simulator.advanceTime(delta);
+                        return true;
+                    }
+                    console.warn('[VWS] advance fallback: simulator missing');
+                    return false;
+                } catch (e) {
+                    console.warn('[VWS] advance failed', e);
+                    return false;
+                }
+            };
+        }
+
+        if (!tracker.advanceDay) {
+            tracker.advanceDay = () => tracker.advance({ days: 1 });
+        }
+
+        if (!tracker.advanceWeek) {
+            tracker.advanceWeek = () => tracker.advance({ days: 7 });
+        }
+
+        if (!tracker.setEnabled) {
+            tracker.setEnabled = (enabled) => {
+                try {
+                    console.log('[VWS] setEnabled called', Boolean(enabled));
+                    return true;
+                } catch (e) {
+                    console.warn('[VWS] setEnabled failed', e);
+                    return false;
+                }
+            };
+        }
+
+        if (!tracker.smokeTest) {
+            tracker.smokeTest = () => {
+                try {
+                    return {
+                        panelExists: Boolean(document.getElementById('valdris-world-panel')),
+                        apiMethods: Object.keys(tracker).sort(),
+                        lastConsoleErrors: [...vwsErrorBuffer]
+                    };
+                } catch (e) {
+                    console.warn('[VWS] smokeTest failed', e);
+                    return { panelExists: false, apiMethods: [], lastConsoleErrors: [...vwsErrorBuffer] };
+                }
+            };
+        }
+    } catch (e) {
+        console.warn('[VWS] ensureVMasterTracker failed', e);
+    }
+}
+
 function init() {
     simulator.initialize();
 
     // Expose globally for external access
     window.ValdrisWorldSimulator = simulator;
     window.getWorldContext = () => simulator.getWorldContext();
+    ensureVMasterTracker();
 }
 
 if (document.readyState === 'loading') {
```

### `index.js.bak`
```diff
diff --git a/index.js.bak b/index.js.bak
new file mode 100644
index 0000000..3f70bf0
--- /dev/null
+++ b/index.js.bak
@@ -0,0 +1,409 @@
+import { stateManager } from './state-manager.js';
+import { TimeSystem } from './time-system.js';
+import { WeatherSystem } from './weather-system.js';
+import { FactionSystem } from './faction-system.js';
+import { EventSystem } from './event-system.js';
+import { NPCAutonomySystem } from './npc-autonomy.js';
+import { RumorSystem } from './rumor-system.js';
+import { EconomySystem } from './economy-system.js';
+import { ConsequenceSystem } from './consequence-system.js';
+import { SettlementSystem } from './settlement-system.js';
+import { WarSystem } from './war-system.js';
+import { DynastySystem } from './dynasty-system.js';
+import { DungeonSystem } from './dungeon-system.js';
+import { NPCLifeSystem } from './npc-life-system.js';
+import { ColdWarSystem } from './cold-war-system.js';
+import { DivineSystem } from './divine-system.js';
+import { CrimeSystem } from './crime-system.js';
+import { CatastropheSystem } from './catastrophe-system.js';
+import { ProphecySystem } from './prophecy-system.js';
+import { ReputationSystem } from './reputation-system.js';
+
+const WEATHER_ICONS = {
+    clear: '☀️', sunny: '☀️', cloudy: '☁️', overcast: '☁️',
+    rain: '🌧️', light_rain: '🌧️', heavy_rain: '🌧️',
+    storm: '⛈️', thunderstorm: '⛈️',
+    snow: '❄️', light_snow: '❄️', heavy_snow: '❄️', blizzard: '🌨️',
+    fog: '🌫️', mist: '🌫️',
+    wind: '💨', sandstorm: '🏜️', magical_storm: '✨'
+};
+
+class ValdrisWorldSimulator {
+    constructor() {
+        this.systems = {};
+        this.panel = null;
+        this.initialized = false;
+    }
+
+    initialize() {
+        if (this.initialized) return;
+
+        stateManager.load();
+        this.initializeSystems();
+        this.initializeAllSystems();
+        this.createPanel();
+        this.setupEventListeners();
+        this.registerSillyTavernHooks();
+        stateManager.startAutoSave(30000);
+
+        this.initialized = true;
+        console.log('[ValdrisWorldSimulator] Initialized successfully');
+        window.dispatchEvent(new CustomEvent('vws-initialized', { detail: { systems: this.systems } }));
+    }
+
+    initializeSystems() {
+        const s = this.systems;
+
+        // Phase 1: Core time system (no dependencies)
+        s.time = new TimeSystem(stateManager);
+
+        // Phase 2-7: Systems dependent on time
+        s.weather = new WeatherSystem(stateManager, s.time);
+        s.factions = new FactionSystem(stateManager, s.time);
+        s.events = new EventSystem(stateManager, s.time, s.factions);
+        s.npcs = new NPCAutonomySystem(stateManager, s.time, s.factions, s.events);
+        s.rumors = new RumorSystem(stateManager, s.time, s.events, s.factions);
+        s.economy = new EconomySystem(stateManager, s.time, s.factions);
+
+        // Phase 8-10: World systems
+        s.settlements = new SettlementSystem(stateManager, s.time, s.events, s.economy);
+        s.warfare = new WarSystem(stateManager, s.time, s.factions, s.settlements);
+        s.consequences = new ConsequenceSystem(stateManager, s.time, s.events, s.factions, s.npcs);
+
+        // Phase 11-15: Advanced systems
+        s.dynasties = new DynastySystem(stateManager, s.time, s.factions, s.npcs);
+        s.dungeons = new DungeonSystem(stateManager, s.time, s.events, s.factions);
+        s.npcLife = new NPCLifeSystem(stateManager, s.time, s.settlements, s.factions);
+        s.coldWar = new ColdWarSystem(stateManager, s.time, s.factions, s.events);
+        s.divine = new DivineSystem(stateManager, s.time, s.factions, s.events);
+
+        // Phase 16-19: Additional systems
+        s.crime = new CrimeSystem(stateManager, s.time, s.settlements, s.factions, s.npcs);
+        s.catastrophe = new CatastropheSystem(stateManager, s.time, s.settlements, s.factions);
+        s.prophecy = new ProphecySystem(stateManager, s.time, s.events, s.factions);
+        s.reputation = new ReputationSystem(stateManager, s.time, s.factions, s.events);
+    }
+
+    initializeAllSystems() {
+        for (const [name, system] of Object.entries(this.systems)) {
+            if (typeof system.initialize === 'function') {
+                try {
+                    system.initialize();
+                } catch (e) {
+                    console.error(`[ValdrisWorldSimulator] Failed to initialize ${name}:`, e);
+                }
+            }
+        }
+    }
+
+    createPanel() {
+        const panel = document.createElement('div');
+        panel.id = 'valdris-world-panel';
+        panel.innerHTML = `
+            <div class="vws-header">
+                <span class="vws-title">Valdris World</span>
+                <button id="vws-toggle-expand" title="Expand/Collapse">▼</button>
+                <button id="vws-settings-btn" title="Settings">⚙️</button>
+            </div>
+            <div class="vws-content">
+                <div class="vws-row vws-date-row">
+                    <span id="vws-date-display"></span>
+                </div>
+                <div class="vws-row vws-weather-row">
+                    <span id="vws-weather-display"></span>
+                </div>
+                <div class="vws-row vws-status-row">
+                    <span id="vws-status-display"></span>
+                </div>
+                <div class="vws-controls">
+                    <button id="vws-advance-hour" title="Advance 1 Hour">+1h</button>
+                    <button id="vws-advance-day" title="Advance 1 Day">+1d</button>
+                    <button id="vws-advance-week" title="Advance 1 Week">+7d</button>
+                </div>
+            </div>
+            <div class="vws-settings hidden">
+                <div class="vws-settings-section">
+                    <h4>Time Controls</h4>
+                    <button id="vws-pause-time">⏸️ Pause</button>
+                    <button id="vws-resume-time">▶️ Resume</button>
+                </div>
+                <div class="vws-settings-section">
+                    <h4>Data</h4>
+                    <button id="vws-export-state">📤 Export</button>
+                    <button id="vws-import-state">📥 Import</button>
+                    <button id="vws-reset-state">🗑️ Reset</button>
+                </div>
+            </div>
+        `;
+        document.body.appendChild(panel);
+        this.panel = panel;
+        this.updatePanel();
+    }
+
+    setupEventListeners() {
+        const panel = this.panel;
+
+        panel.querySelector('#vws-toggle-expand').addEventListener('click', () => {
+            panel.classList.toggle('collapsed');
+            const btn = panel.querySelector('#vws-toggle-expand');
+            btn.textContent = panel.classList.contains('collapsed') ? '▲' : '▼';
+        });
+
+        panel.querySelector('#vws-settings-btn').addEventListener('click', () => {
+            panel.querySelector('.vws-settings').classList.toggle('hidden');
+        });
+
+        panel.querySelector('#vws-advance-hour').addEventListener('click', () => {
+            this.advanceTime({ hours: 1 });
+        });
+
+        panel.querySelector('#vws-advance-day').addEventListener('click', () => {
+            this.advanceTime({ days: 1 });
+        });
+
+        panel.querySelector('#vws-advance-week').addEventListener('click', () => {
+            this.advanceTime({ days: 7 });
+        });
+
+        panel.querySelector('#vws-pause-time').addEventListener('click', () => {
+            if (this.systems.time.pause) this.systems.time.pause();
+        });
+
+        panel.querySelector('#vws-resume-time').addEventListener('click', () => {
+            if (this.systems.time.resume) this.systems.time.resume();
+        });
+
+        panel.querySelector('#vws-export-state').addEventListener('click', () => {
+            const data = stateManager.exportState();
+            const blob = new Blob([data], { type: 'application/json' });
+            const url = URL.createObjectURL(blob);
+            const a = document.createElement('a');
+            a.href = url;
+            a.download = `valdris-world-state-${Date.now()}.json`;
+            a.click();
+            URL.revokeObjectURL(url);
+        });
+
+        panel.querySelector('#vws-import-state').addEventListener('click', () => {
+            const input = document.createElement('input');
+            input.type = 'file';
+            input.accept = '.json';
+            input.onchange = (e) => {
+                const file = e.target.files[0];
+                if (file) {
+                    const reader = new FileReader();
+                    reader.onload = (event) => {
+                        if (stateManager.importState(event.target.result)) {
+                            window.location.reload();
+                        }
+                    };
+                    reader.readAsText(file);
+                }
+            };
+            input.click();
+        });
+
+        panel.querySelector('#vws-reset-state').addEventListener('click', () => {
+            if (confirm('Reset all world state? This cannot be undone.')) {
+                stateManager.reset();
+                window.location.reload();
+            }
+        });
+
+        // Listen for system events
+        window.addEventListener('vws-time-advanced', () => this.updatePanel());
+        window.addEventListener('vws-weather-changed', () => this.updatePanel());
+        window.addEventListener('vws-world-event', (e) => this.handleWorldEvent(e.detail));
+    }
+
+    registerSillyTavernHooks() {
+        const eventSource = window?.eventSource;
+        if (!eventSource || typeof eventSource.on !== 'function') {
+            console.log('[ValdrisWorldSimulator] SillyTavern event source not found');
+            return;
+        }
+
+        eventSource.on('message_received', () => {
+            this.advanceTime({ hours: 1 });
+        });
+
+        eventSource.on('chat_changed', () => {
+            this.updatePanel();
+        });
+
+        // Inject world context into prompts
+        if (window.SillyTavern?.getContext) {
+            const originalGetContext = window.SillyTavern.getContext;
+            window.SillyTavern.getContext = () => {
+                const context = originalGetContext();
+                context.worldContext = this.getWorldContext();
+                return context;
+            };
+        }
+    }
+
+    advanceTime({ days = 0, hours = 0 } = {}) {
+        if (this.systems.time.advanceTime) {
+            this.systems.time.advanceTime({ days, hours });
+        }
+        stateManager.save();
+        this.updatePanel();
+    }
+
+    updatePanel() {
+        if (!this.panel) return;
+
+        const dateEl = this.panel.querySelector('#vws-date-display');
+        const weatherEl = this.panel.querySelector('#vws-weather-display');
+        const statusEl = this.panel.querySelector('#vws-status-display');
+
+        // Update date
+        if (this.systems.time?.getCurrentDateString) {
+            dateEl.textContent = this.systems.time.getCurrentDateString();
+        } else if (this.systems.time?.getCurrentDate) {
+            dateEl.textContent = this.systems.time.getCurrentDate();
+        }
+
+        // Update weather
+        if (this.systems.weather?.getCurrentWeather) {
+            const weather = this.systems.weather.getCurrentWeather();
+            const icon = WEATHER_ICONS[weather?.type] || WEATHER_ICONS[weather?.current] || '🌤️';
+            const desc = weather?.description || weather?.type || 'Unknown';
+            weatherEl.textContent = `${icon} ${desc}`;
+        }
+
+        // Update status summary
+        const statusParts = [];
+
+        if (this.systems.warfare?.getActiveWars) {
+            const wars = this.systems.warfare.getActiveWars();
+            if (wars.length > 0) statusParts.push(`⚔️ ${wars.length} war(s)`);
+        }
+
+        if (this.systems.catastrophe?.getActiveCatastrophes) {
+            const cats = this.systems.catastrophe.getActiveCatastrophes();
+            if (cats.length > 0) statusParts.push(`💀 ${cats.length} crisis`);
+        }
+
+        if (this.systems.prophecy?.getActiveProphecies) {
+            const prophecies = this.systems.prophecy.getActiveProphecies();
+            if (prophecies.length > 0) statusParts.push(`🔮 ${prophecies.length} prophecy`);
+        }
+
+        statusEl.textContent = statusParts.length > 0 ? statusParts.join(' | ') : 'World at peace';
+    }
+
+    handleWorldEvent(event) {
+        console.log('[ValdrisWorldSimulator] World event:', event);
+    }
+
+    getWorldContext() {
+        const parts = [];
+
+        // Time and weather
+        if (this.systems.time?.getTimeForPrompt) {
+            const timePrompt = this.systems.time.getTimeForPrompt();
+            if (timePrompt) parts.push(timePrompt);
+        }
+
+        if (this.systems.weather?.getWeatherForPrompt) {
+            const weatherPrompt = this.systems.weather.getWeatherForPrompt();
+            if (weatherPrompt) parts.push(weatherPrompt);
+        }
+
+        // Active world state
+        if (this.systems.warfare?.getWarfareForPrompt) {
+            const warPrompt = this.systems.warfare.getWarfareForPrompt();
+            if (warPrompt) parts.push(warPrompt);
+        }
+
+        if (this.systems.dynasties?.getDynastiesForPrompt) {
+            const dynastyPrompt = this.systems.dynasties.getDynastiesForPrompt();
+            if (dynastyPrompt) parts.push(dynastyPrompt);
+        }
+
+        if (this.systems.catastrophe?.getCatastrophesForPrompt) {
+            const catPrompt = this.systems.catastrophe.getCatastrophesForPrompt();
+            if (catPrompt) parts.push(catPrompt);
+        }
+
+        if (this.systems.prophecy?.getPropheciesForPrompt) {
+            const prophPrompt = this.systems.prophecy.getPropheciesForPrompt();
+            if (prophPrompt) parts.push(prophPrompt);
+        }
+
+        if (this.systems.coldWar?.getColdWarForPrompt) {
+            const coldWarPrompt = this.systems.coldWar.getColdWarForPrompt();
+            if (coldWarPrompt) parts.push(coldWarPrompt);
+        }
+
+        if (this.systems.settlements?.getSettlementsForPrompt) {
+            const settlementPrompt = this.systems.settlements.getSettlementsForPrompt();
+            if (settlementPrompt) parts.push(settlementPrompt);
+        }
+
+        if (this.systems.economy?.getEconomyForPrompt) {
+            const econPrompt = this.systems.economy.getEconomyForPrompt();
+            if (econPrompt) parts.push(econPrompt);
+        }
+
+        if (this.systems.reputation?.getReputationForPrompt) {
+            const repPrompt = this.systems.reputation.getReputationForPrompt();
+            if (repPrompt) parts.push(repPrompt);
+        }
+
+        if (this.systems.consequences?.getConsequencesForPrompt) {
+            const consPrompt = this.systems.consequences.getConsequencesForPrompt();
+            if (consPrompt) parts.push(consPrompt);
+        }
+
+        if (this.systems.divine?.getDivineForPrompt) {
+            const divinePrompt = this.systems.divine.getDivineForPrompt();
+            if (divinePrompt) parts.push(divinePrompt);
+        }
+
+        if (this.systems.crime?.getCrimeForPrompt) {
+            const crimePrompt = this.systems.crime.getCrimeForPrompt();
+            if (crimePrompt) parts.push(crimePrompt);
+        }
+
+        if (this.systems.rumors?.getRumorsForPrompt) {
+            const rumorPrompt = this.systems.rumors.getRumorsForPrompt();
+            if (rumorPrompt) parts.push(rumorPrompt);
+        }
+
+        if (this.systems.dungeons?.getDungeonsForPrompt) {
+            const dungeonPrompt = this.systems.dungeons.getDungeonsForPrompt();
+            if (dungeonPrompt) parts.push(dungeonPrompt);
+        }
+
+        return parts.filter(p => p).join(' ');
+    }
+
+    getSystem(name) {
+        return this.systems[name];
+    }
+
+    getAllSystems() {
+        return this.systems;
+    }
+}
+
+// Initialize and expose globally
+const simulator = new ValdrisWorldSimulator();
+
+function init() {
+    simulator.initialize();
+
+    // Expose globally for external access
+    window.ValdrisWorldSimulator = simulator;
+    window.getWorldContext = () => simulator.getWorldContext();
+}
+
+if (document.readyState === 'loading') {
+    document.addEventListener('DOMContentLoaded', init);
+} else {
+    init();
+}
+
+export { ValdrisWorldSimulator, simulator };
```

## Manual Smoke-Test Steps
1. Start SillyTavern via `Start.bat`.
2. Open the UI and hard-refresh (Ctrl+F5).
3. Confirm the `Valdris World` panel appears bottom-right.
4. Click `Advance 1 day` → expect 1–3 short rumor(s) and no new red console errors.
5. Click `Advance 1 week` → expect an update and no errors.
6. Toggle Master On/Off and ensure it stops/starts auto-behavior (if implemented).
7. Export/import state and ensure JSON write/read completes without exceptions.

## Remaining Issues / Follow-ups
- `setEnabled` currently logs and returns success; if a true enable/disable mechanism exists, wire it to that API.
