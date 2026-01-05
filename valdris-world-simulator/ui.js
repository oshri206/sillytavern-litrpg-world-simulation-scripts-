// UI presentation extracted from index.js to isolate panel markup and styling.
// Source: valdris-world-simulator/index.js (createPanel/setupEventListeners/updatePanel).

import { stateManager } from './state-manager.js';

const WEATHER_ICONS = {
    clear: '☀️', sunny: '☀️', cloudy: '☁️', overcast: '☁️',
    rain: '🌧️', light_rain: '🌧️', heavy_rain: '🌧️',
    storm: '⛈️', thunderstorm: '⛈️',
    snow: '❄️', light_snow: '❄️', heavy_snow: '❄️', blizzard: '🌨️',
    fog: '🌫️', mist: '🌫️',
    wind: '💨', sandstorm: '🏜️', magical_storm: '✨'
};

const UI_IDS = {
    panel: 'valdris-world-sim-panel',
    toggleExpand: 'valdris-world-toggle-expand',
    settingsBtn: 'valdris-world-settings-btn',
    dateDisplay: 'valdris-world-date-display',
    weatherDisplay: 'valdris-world-weather-display',
    statusDisplay: 'valdris-world-status-display',
    advanceHour: 'valdris-world-advance-hour',
    advanceDay: 'valdris-world-advance-day',
    advanceWeek: 'valdris-world-advance-week',
    pauseTime: 'valdris-world-pause-time',
    resumeTime: 'valdris-world-resume-time',
    exportState: 'valdris-world-export-state',
    importState: 'valdris-world-import-state',
    resetState: 'valdris-world-reset-state'
};

function getAdapterInfo() {
    try {
        return window.ValdrisWorld?.smokeTest?.() || { adapterBound: false };
    } catch (e) {
        console.warn('[ValdrisWorld] smokeTest failed', e);
        return { adapterBound: false };
    }
}

function setReadOnly(panel, isReadOnly) {
    if (!panel) return;
    panel.dataset.readonly = isReadOnly ? 'true' : 'false';
    panel.classList.toggle('is-readonly', Boolean(isReadOnly));
    panel.querySelectorAll('button').forEach((btn) => {
        btn.disabled = Boolean(isReadOnly);
    });
    const statusEl = panel.querySelector(`#${UI_IDS.statusDisplay}`);
    if (statusEl && isReadOnly) {
        statusEl.textContent = 'Read-only: adapter not bound';
    }
}

function buildPanel() {
    const panel = document.createElement('div');
    panel.id = UI_IDS.panel;
    panel.className = 'valdris-world';
    panel.innerHTML = `
        <div class="valdris-world__header">
            <span class="valdris-world__title">Valdris World</span>
            <button id="${UI_IDS.toggleExpand}" title="Expand/Collapse">▼</button>
            <button id="${UI_IDS.settingsBtn}" title="Settings">⚙️</button>
        </div>
        <div class="valdris-world__content">
            <div class="valdris-world__row valdris-world__date-row">
                <span id="${UI_IDS.dateDisplay}"></span>
            </div>
            <div class="valdris-world__row valdris-world__weather-row">
                <span id="${UI_IDS.weatherDisplay}"></span>
            </div>
            <div class="valdris-world__row valdris-world__status-row">
                <span id="${UI_IDS.statusDisplay}"></span>
            </div>
            <div class="valdris-world__controls">
                <button id="${UI_IDS.advanceHour}" title="Advance 1 Hour">+1h</button>
                <button id="${UI_IDS.advanceDay}" title="Advance 1 Day">+1d</button>
                <button id="${UI_IDS.advanceWeek}" title="Advance 1 Week">+7d</button>
            </div>
        </div>
        <div class="valdris-world__settings is-hidden">
            <div class="valdris-world__settings-section">
                <h4>Time Controls</h4>
                <button id="${UI_IDS.pauseTime}">⏸️ Pause</button>
                <button id="${UI_IDS.resumeTime}">▶️ Resume</button>
            </div>
            <div class="valdris-world__settings-section">
                <h4>Data</h4>
                <button id="${UI_IDS.exportState}">📤 Export</button>
                <button id="${UI_IDS.importState}">📥 Import</button>
                <button id="${UI_IDS.resetState}">🗑️ Reset</button>
            </div>
        </div>
    `;
    return panel;
}

function updatePanel(simulator, panel) {
    if (!panel || !simulator) return;

    const dateEl = panel.querySelector(`#${UI_IDS.dateDisplay}`);
    const weatherEl = panel.querySelector(`#${UI_IDS.weatherDisplay}`);
    const statusEl = panel.querySelector(`#${UI_IDS.statusDisplay}`);

    if (!dateEl || !weatherEl || !statusEl) return;

    try {
        if (simulator.systems.time?.getCurrentDateString) {
            dateEl.textContent = simulator.systems.time.getCurrentDateString();
        } else if (simulator.systems.time?.getCurrentDate) {
            dateEl.textContent = simulator.systems.time.getCurrentDate();
        }

        if (simulator.systems.weather?.getCurrentWeather) {
            const weather = simulator.systems.weather.getCurrentWeather();
            const icon = WEATHER_ICONS[weather?.type] || WEATHER_ICONS[weather?.current] || '🌤️';
            const desc = weather?.description || weather?.type || 'Unknown';
            weatherEl.textContent = `${icon} ${desc}`;
        }

        const statusParts = [];

        if (simulator.systems.warfare?.getActiveWars) {
            const wars = simulator.systems.warfare.getActiveWars();
            if (wars.length > 0) statusParts.push(`⚔️ ${wars.length} war(s)`);
        }

        if (simulator.systems.catastrophe?.getActiveCatastrophes) {
            const cats = simulator.systems.catastrophe.getActiveCatastrophes();
            if (cats.length > 0) statusParts.push(`💀 ${cats.length} crisis`);
        }

        if (simulator.systems.prophecy?.getActiveProphecies) {
            const prophecies = simulator.systems.prophecy.getActiveProphecies();
            if (prophecies.length > 0) statusParts.push(`🔮 ${prophecies.length} prophecy`);
        }

        statusEl.textContent = statusParts.length > 0 ? statusParts.join(' | ') : 'World at peace';
    } catch (e) {
        console.warn('[ValdrisWorld] updatePanel failed', e);
    }
}

function bindUIEvents(simulator, panel) {
    const settingsPanel = panel.querySelector('.valdris-world__settings');
    const toggleExpand = panel.querySelector(`#${UI_IDS.toggleExpand}`);
    const settingsBtn = panel.querySelector(`#${UI_IDS.settingsBtn}`);

    toggleExpand?.addEventListener('click', () => {
        try {
            panel.classList.toggle('is-collapsed');
            toggleExpand.textContent = panel.classList.contains('is-collapsed') ? '▲' : '▼';
        } catch (e) {
            console.warn('[ValdrisWorld] Toggle expand failed', e);
        }
    });

    settingsBtn?.addEventListener('click', () => {
        try {
            settingsPanel?.classList.toggle('is-hidden');
        } catch (e) {
            console.warn('[ValdrisWorld] Toggle settings failed', e);
        }
    });

    panel.querySelector(`#${UI_IDS.advanceHour}`)?.addEventListener('click', () => {
        try {
            const adapter = window.ValdrisWorld;
            if (adapter?.advance) {
                adapter.advance({ hours: 1 });
            }
        } catch (e) {
            console.warn('[ValdrisWorld] Advance hour failed', e);
        }
    });

    panel.querySelector(`#${UI_IDS.advanceDay}`)?.addEventListener('click', () => {
        try {
            const adapter = window.ValdrisWorld;
            if (adapter?.advanceDay) {
                adapter.advanceDay();
            }
        } catch (e) {
            console.warn('[ValdrisWorld] Advance day failed', e);
        }
    });

    panel.querySelector(`#${UI_IDS.advanceWeek}`)?.addEventListener('click', () => {
        try {
            const adapter = window.ValdrisWorld;
            if (adapter?.advanceWeek) {
                adapter.advanceWeek();
            }
        } catch (e) {
            console.warn('[ValdrisWorld] Advance week failed', e);
        }
    });

    panel.querySelector(`#${UI_IDS.pauseTime}`)?.addEventListener('click', () => {
        try {
            if (simulator.systems.time?.pause) {
                simulator.systems.time.pause();
            }
        } catch (e) {
            console.warn('[ValdrisWorld] Pause time failed', e);
        }
    });

    panel.querySelector(`#${UI_IDS.resumeTime}`)?.addEventListener('click', () => {
        try {
            if (simulator.systems.time?.resume) {
                simulator.systems.time.resume();
            }
        } catch (e) {
            console.warn('[ValdrisWorld] Resume time failed', e);
        }
    });

    panel.querySelector(`#${UI_IDS.exportState}`)?.addEventListener('click', () => {
        try {
            const exportData = stateManager?.exportState?.();
            if (!exportData) {
                console.warn('[ValdrisWorld] Export state unavailable');
                return;
            }
            const blob = new Blob([exportData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `valdris-world-state-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.warn('[ValdrisWorld] Export state failed', e);
        }
    });

    panel.querySelector(`#${UI_IDS.importState}`)?.addEventListener('click', () => {
        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (event) => {
                try {
                    const file = event.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (loadEvent) => {
                        try {
                            if (stateManager?.importState?.(loadEvent.target.result)) {
                                window.location.reload();
                            }
                        } catch (e) {
                            console.warn('[ValdrisWorld] Import state failed', e);
                        }
                    };
                    reader.readAsText(file);
                } catch (e) {
                    console.warn('[ValdrisWorld] Import state failed', e);
                }
            };
            input.click();
        } catch (e) {
            console.warn('[ValdrisWorld] Import state failed', e);
        }
    });

    panel.querySelector(`#${UI_IDS.resetState}`)?.addEventListener('click', () => {
        try {
            if (confirm('Reset all world state? This cannot be undone.')) {
                stateManager?.reset?.();
                window.location.reload();
            }
        } catch (e) {
            console.warn('[ValdrisWorld] Reset state failed', e);
        }
    });
}

export function initValdrisWorldUI(simulator) {
    const state = {
        panel: null
    };

    const attach = () => {
        try {
            if (document.getElementById(UI_IDS.panel)) return;
            const panel = buildPanel();
            document.body.appendChild(panel);
            state.panel = panel;
            bindUIEvents(simulator, panel);
            updatePanel(simulator, panel);

            const adapterInfo = getAdapterInfo();
            setReadOnly(panel, !adapterInfo.adapterBound);
            console.log('[ValdrisWorld] UI loaded; adapterBound=', adapterInfo.adapterBound);
        } catch (e) {
            console.warn('[ValdrisWorld] UI mount failed', e);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attach, { once: true });
    } else {
        attach();
    }

    const refreshAdapterState = () => {
        const adapterInfo = getAdapterInfo();
        setReadOnly(state.panel, !adapterInfo.adapterBound);
    };

    window.addEventListener('valdris-world-adapter-bound', refreshAdapterState);
    window.addEventListener('vws-time-advanced', () => updatePanel(simulator, state.panel));
    window.addEventListener('vws-weather-changed', () => updatePanel(simulator, state.panel));
    window.addEventListener('vws-world-event', (event) => {
        try {
            if (event?.detail) {
                console.log('[ValdrisWorld] World event:', event.detail);
            }
        } catch (e) {
            console.warn('[ValdrisWorld] World event handler failed', e);
        }
        updatePanel(simulator, state.panel);
    });

    return {
        updatePanel: () => updatePanel(simulator, state.panel)
    };
}
