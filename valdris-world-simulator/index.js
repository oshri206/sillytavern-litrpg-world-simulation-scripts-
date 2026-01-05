import { stateManager } from './state-manager.js';
import { createTimeSystem } from './time-system.js';
import { createWeatherSystem } from './weather-system.js';
import { createFactionSystem } from './faction-system.js';
import { createEventSystem } from './event-system.js';
import { createNpcAutonomySystem } from './npc-autonomy.js';
import { createRumorSystem } from './rumor-system.js';
import { createEconomySystem } from './economy-system.js';
import { createConsequenceSystem } from './consequence-system.js';
import { createSettlementSystem } from './settlement-system.js';
import { createWarSystem } from './war-system.js';
import { createDynastySystem } from './dynasty-system.js';
import { createDungeonSystem } from './dungeon-system.js';
import { createNpcLifeSystem } from './npc-life-system.js';
import { createColdWarSystem } from './cold-war-system.js';
import { createDivineSystem } from './divine-system.js';
import { createCrimeSystem } from './crime-system.js';
import { createCatastropheSystem } from './catastrophe-system.js';
import { createProphecySystem } from './prophecy-system.js';
import { createReputationSystem } from './reputation-system.js';

const weatherIcons = {
  clear: '☀️',
  cloudy: '☁️',
  rain: '🌧️',
  storm: '⛈️',
  snow: '❄️',
  blizzard: '🌨️',
  fog: '🌫️'
};

function createPanel() {
  const panel = document.createElement('div');
  panel.id = 'valdris-world-panel';
  panel.innerHTML = `
    <div class="header">
      <span>Valdris World</span>
      <button id="valdris-settings-toggle">⚙️</button>
    </div>
    <div class="row"><span id="valdris-date"></span></div>
    <div class="row"><span id="valdris-weather"></span></div>
    <div class="row">
      <div>
        <button id="valdris-advance-hour">+1h</button>
        <button id="valdris-advance-day">+1d</button>
      </div>
    </div>
    <div class="settings">
      <button id="valdris-reset">Reset State</button>
    </div>
  `;
  document.body.appendChild(panel);
  return panel;
}

function setupPanel(panel, controllers) {
  panel.querySelector('#valdris-settings-toggle').addEventListener('click', () => {
    panel.classList.toggle('open');
  });

  panel.querySelector('#valdris-advance-hour').addEventListener('click', () => {
    controllers.advanceTime({ hours: 1 });
  });

  panel.querySelector('#valdris-advance-day').addEventListener('click', () => {
    controllers.advanceTime({ days: 1 });
  });

  panel.querySelector('#valdris-reset').addEventListener('click', () => {
    controllers.resetState();
  });
}

function updatePanel(panel, systems) {
  const dateEl = panel.querySelector('#valdris-date');
  const weatherEl = panel.querySelector('#valdris-weather');
  dateEl.textContent = systems.time.getCurrentDate();
  const weatherKey = systems.weather.getEffects().current;
  const icon = weatherIcons[weatherKey] || '🌥️';
  weatherEl.textContent = `${icon} ${systems.weather.getSummary()}`;
}

function registerHooks(controllers) {
  const eventSource = window?.eventSource;
  if (!eventSource || typeof eventSource.on !== 'function') {
    return;
  }
  eventSource.on('message_received', () => {
    controllers.advanceTime({ hours: 1 });
  });
  eventSource.on('chat_changed', () => {
    controllers.refreshUI();
  });
}

function buildWorldContext(systems) {
  return `[Date] ${systems.time.getCurrentDate()} [Weather] ${systems.weather.getSummary()} [Tensions] ${systems.coldWar.getSummary()} [Events] ${systems.events.getSummary()} [Economy] ${systems.economy.getSummary()} [Reputation] ${systems.reputation.getSummary()}`;
}

function init() {
  const state = stateManager.load();
  const systems = {};
  systems.time = createTimeSystem(state);
  systems.weather = createWeatherSystem(state, systems.time);
  systems.factions = createFactionSystem(state);
  systems.events = createEventSystem(state);
  systems.npcAutonomy = createNpcAutonomySystem(state);
  systems.rumors = createRumorSystem(state);
  systems.economy = createEconomySystem(state);
  systems.consequence = createConsequenceSystem(state);
  systems.settlements = createSettlementSystem(state);
  systems.wars = createWarSystem(state);
  systems.dynasties = createDynastySystem(state);
  systems.dungeons = createDungeonSystem(state);
  systems.npcLife = createNpcLifeSystem(state);
  systems.coldWar = createColdWarSystem(state);
  systems.divine = createDivineSystem(state);
  systems.crime = createCrimeSystem(state);
  systems.catastrophe = createCatastropheSystem(state);
  systems.prophecy = createProphecySystem(state);
  systems.reputation = createReputationSystem(state);

  systems.weather.generateWeather();

  const panel = createPanel();

  const controllers = {
    advanceTime({ days = 0, hours = 0 } = {}) {
      systems.time.advanceTime({ days, hours });
      if (days > 0) {
        systems.events.tickDay();
        systems.economy.adjustPrices();
        if (systems.time.getSeason() === 'winter' || systems.time.getSeason() === 'summer') {
          systems.economy.applySeasonalModifier(systems.time.getSeason());
        }
        systems.weather.generateWeather();
        if (state.time.day % 7 === 0) {
          systems.events.generateWeeklyEvents();
          systems.factions.weeklyDrift();
        }
        if (state.time.day === 1) {
          systems.dungeons.monthlyCheck();
        }
      }
      stateManager.save();
      updatePanel(panel, systems);
    },
    refreshUI() {
      updatePanel(panel, systems);
    },
    resetState() {
      stateManager.reset();
      window.location.reload();
    }
  };

  setupPanel(panel, controllers);
  updatePanel(panel, systems);
  registerHooks(controllers);

  window.ValdrisWorldSimulator = {
    state,
    systems,
    stateManager,
    getWorldContext: () => buildWorldContext(systems),
    controllers
  };

  window.getWorldContext = window.ValdrisWorldSimulator.getWorldContext;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
