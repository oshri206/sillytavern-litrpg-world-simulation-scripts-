const eventTypes = ['political', 'military', 'economic', 'natural', 'supernatural', 'social'];

const templates = [
  { key: 'war_declared', type: 'military', description: 'A faction has declared war.' },
  { key: 'plague', type: 'natural', description: 'A disease spreads among settlements.' },
  { key: 'earthquake', type: 'natural', description: 'An earthquake shakes the region.' },
  { key: 'dungeon_emergence', type: 'supernatural', description: 'A new dungeon surfaces.' },
  { key: 'rebellion', type: 'political', description: 'Rebels rise against authority.' }
];

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export function createEventSystem(state) {
  const eventState = state.events;

  function addEvent(template, durationDays = 7) {
    const event = {
      id: `${template.key}-${Date.now()}`,
      key: template.key,
      type: template.type,
      description: template.description,
      duration: durationDays,
      remaining: durationDays,
      effects: [],
      followUps: []
    };
    eventState.active.push(event);
    eventState.history.push(event);
    return event;
  }

  function tickDay() {
    eventState.active.forEach((event) => {
      event.remaining -= 1;
    });
    eventState.active = eventState.active.filter((event) => event.remaining > 0);
  }

  function generateWeeklyEvents() {
    const roll = Math.random();
    if (roll < 0.6) {
      return null;
    }
    const template = randomItem(templates);
    return addEvent(template, 7 + Math.floor(Math.random() * 7));
  }

  function getSummary() {
    if (eventState.active.length === 0) {
      return 'No major events.';
    }
    return eventState.active.map((event) => `${event.type}: ${event.description}`).join(' | ');
  }

  return {
    eventTypes,
    templates,
    addEvent,
    tickDay,
    generateWeeklyEvents,
    getSummary
  };
}
