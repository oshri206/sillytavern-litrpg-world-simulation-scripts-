const deities = [
  { name: 'Aurelia', domain: 'light' },
  { name: 'Nerath', domain: 'death' },
  { name: 'Kael', domain: 'war' },
  { name: 'Sylas', domain: 'luck' },
  { name: 'Umbra', domain: 'shadow' },
  { name: 'Eirwyn', domain: 'nature' }
];

const divineEvents = ['blessing', 'curse', 'omen', 'miracle'];

export function createDivineSystem(state) {
  const divineState = state.divine;

  function init() {
    deities.forEach((deity) => {
      if (divineState.favor[deity.name] === undefined) {
        divineState.favor[deity.name] = 0;
      }
    });
  }

  function triggerEvent() {
    const deity = deities[Math.floor(Math.random() * deities.length)];
    const type = divineEvents[Math.floor(Math.random() * divineEvents.length)];
    return { deity: deity.name, type, effect: `${deity.name} delivers a ${type}.` };
  }

  function adjustFavor(deityName, amount) {
    divineState.favor[deityName] = (divineState.favor[deityName] ?? 0) + amount;
  }

  function getSummary() {
    return deities.map((deity) => `${deity.name}: ${divineState.favor[deity.name]}`).join(' | ');
  }

  init();

  return {
    deities,
    divineEvents,
    init,
    triggerEvent,
    adjustFavor,
    getSummary
  };
}
