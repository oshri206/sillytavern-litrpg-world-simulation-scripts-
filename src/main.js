import { eventBus, storage, seedIfNeeded } from './api.js';
import { loadJson } from './utils.js';
import * as vex from './features/vex.js';
import * as rumors from './features/rumors.js';
import * as economy from './features/economy.js';
import * as npcMemory from './features/npcMemory.js';
import * as classHints from './features/classHints.js';
import * as calendar from './features/calendar.js';
import * as encounters from './features/encounters.js';
import * as titles from './features/titles.js';
import * as storylets from './features/storylets.js';
import * as jobs from './features/jobs.js';
import * as journal from './features/journal.js';
import * as weather from './features/weather.js';
import { createInboxPanel } from './ui/inbox.jsx';
import { createCalendarPanel } from './ui/calendar.jsx';
import { createMerchantPanel } from './ui/merchant.jsx';
import { createTitleboardPanel } from './ui/titleboard.jsx';
import { createJournalPanel } from './ui/journal.jsx';
import * as ambientScheduler from './schedulers/ambient.js';
import * as rumorScheduler from './schedulers/rumors.js';
import * as weatherScheduler from './schedulers/weather.js';
import * as calendarScheduler from './schedulers/calendar.js';

let ui = {};
let initialized = false;

async function seedData() {
  const [vexData, rumorData, merchantData, encounterData, weatherData, festivalData, titleData] =
    await Promise.all([
      loadJson(new URL('./prompts/vex.json', import.meta.url)),
      loadJson(new URL('./prompts/rumors.json', import.meta.url)),
      loadJson(new URL('./prompts/merchant.json', import.meta.url)),
      loadJson(new URL('./prompts/encounters.json', import.meta.url)),
      loadJson(new URL('./prompts/weather.json', import.meta.url)),
      loadJson(new URL('./prompts/festivals.json', import.meta.url)),
      loadJson(new URL('./prompts/titles.json', import.meta.url))
    ]);

  await seedIfNeeded({
    vexInbox: vexData.lines.slice(0, 2).map((line) => ({ text: line.text, rarity: line.rarity })),
    rumors: rumorData.templates.slice(0, 3).map((text, index) => ({
      id: `seed-rumor-${index}`,
      text,
      origin: 'seed',
      provenance: ['seed'],
      locations: ['Valdris'],
      strength: 1
    })),
    merchants: [
      {
        id: 'seed-merchant-1',
        name: 'Bibble the Barterer',
        inventory: ['rope', 'lantern', 'spice'],
        prices: { rope: 5, lantern: 12, spice: 3 }
      }
    ],
    encounters: encounterData.templates.slice(0, 2).map((encounter, index) => ({
      id: `seed-encounter-${index}`,
      scene: encounter.scene,
      outcomes: encounter.outcomes
    })),
    weather: weatherData.states.slice(0, 2).map((state, index) => ({ day: index + 1, state })),
    festivals: festivalData.festivals,
    titles: titleData.titles.slice(0, 1).map((name) => ({ id: `seed-title-${name}`, name, earnedOn: 1 }))
  });
}

function mountUi() {
  if (typeof document === 'undefined') return;
  const container = document.createElement('div');
  container.id = 'valdris-living-world';
  container.className = 'valdris-panels';
  const inbox = createInboxPanel();
  const calendarPanel = createCalendarPanel();
  const merchantPanel = createMerchantPanel();
  const titleboard = createTitleboardPanel();
  const journalPanel = createJournalPanel();
  ui = { inbox, calendarPanel, merchantPanel, titleboard, journalPanel };
  [inbox.panel, calendarPanel.panel, merchantPanel.panel, titleboard.panel, journalPanel.panel].forEach(
    (panel) => container.appendChild(panel)
  );
  document.body.appendChild(container);
}

async function refreshUi() {
  const [vexInbox, festivals, merchants, titlesList, journalEntries, reputation] = await Promise.all([
    storage.get('vexInbox'),
    storage.get('festivals'),
    storage.get('merchants'),
    storage.get('titles'),
    storage.get('journal'),
    storage.get('reputation')
  ]);
  if (ui.inbox) ui.inbox.update(vexInbox ?? []);
  if (ui.calendarPanel) ui.calendarPanel.update(festivals ?? []);
  if (ui.merchantPanel) ui.merchantPanel.update(merchants ?? []);
  if (ui.titleboard) ui.titleboard.update(titlesList ?? [], reputation ?? 0);
  if (ui.journalPanel) ui.journalPanel.update(journalEntries ?? []);
}

async function init() {
  if (initialized) return;
  initialized = true;
  await seedData();
  await Promise.all([
    vex.init(),
    rumors.init(),
    economy.init(),
    npcMemory.init(),
    classHints.init(),
    calendar.init(),
    encounters.init(),
    titles.init(),
    storylets.init(),
    jobs.init(),
    journal.init(),
    weather.init()
  ]);
  mountUi();
  refreshUi();
  ambientScheduler.start();
  rumorScheduler.start();
  weatherScheduler.start();
  calendarScheduler.start();
  eventBus.on('vexMessage', refreshUi);
  eventBus.on('economyUpdated', refreshUi);
  eventBus.on('titleAwarded', refreshUi);
  eventBus.on('journalEntry', refreshUi);
}

async function onChat({ npc = 'Unknown', text = '' } = {}) {
  await npcMemory.recordMemory(npc, text);
  eventBus.emit('playerAction', { npc, text });
}

async function runDemo() {
  await init();
  console.info('[Valdris Demo] Seeding and running 7-day simulation...');
  const notable = [];
  for (let day = 1; day <= 7; day += 1) {
    const dayNum = await calendar.tick();
    const weatherState = await weather.tick(dayNum);
    const encounter = await encounters.tick();
    await rumors.tick(dayNum);
    await economy.tick();
    await titles.tick(dayNum);
    await journal.tick(dayNum);
    if (encounter) notable.push(`Day ${dayNum}: Encounter - ${encounter.scene}`);
    if (weatherState) notable.push(`Day ${dayNum}: Weather - ${weatherState.state}`);
  }
  console.info('[Valdris Demo] Notable events:', notable);
  await refreshUi();
  return notable;
}

window.ValdrisLivingWorld = {
  init,
  onChat,
  runDemo
};

export { init, onChat, runDemo };
