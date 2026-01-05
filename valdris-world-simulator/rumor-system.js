const newsTypes = ['official', 'major', 'local', 'rumor', 'gossip', 'secret'];
const mutationTypes = ['exaggerate', 'minimize', 'distort'];

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export function createRumorSystem(state) {
  const rumorState = state.rumors;

  function addRumor(content, type = 'rumor', location = 'Unknown') {
    const rumor = {
      id: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type,
      content,
      location,
      intensity: 1
    };
    rumorState.items.push(rumor);
    return rumor;
  }

  function spreadRumors() {
    rumorState.items.forEach((rumor) => {
      if (Math.random() < 0.3) {
        rumor.location = `${rumor.location} outskirts`;
      }
      if (Math.random() < 0.2) {
        const mutation = randomItem(mutationTypes);
        rumor.content = `${rumor.content} (mutated: ${mutation})`;
        rumor.intensity += 1;
      }
    });
  }

  function generateFromEvent(event) {
    if (!event) {
      return null;
    }
    const type = Math.random() > 0.5 ? 'major' : 'rumor';
    return addRumor(`Whispers speak of ${event.description.toLowerCase()}.`, type, 'Central Plains');
  }

  function getSummary() {
    if (rumorState.items.length === 0) {
      return 'Rumors are quiet.';
    }
    return rumorState.items.slice(-3).map((rumor) => `${rumor.type}: ${rumor.content}`).join(' | ');
  }

  return {
    newsTypes,
    addRumor,
    spreadRumors,
    generateFromEvent,
    getSummary
  };
}
