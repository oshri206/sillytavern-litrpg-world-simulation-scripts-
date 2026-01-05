const defaultLeaders = [
  { name: 'Emperor Cassian', faction: 'Valdric Empire', role: 'Emperor', location: 'Valdris Capital' },
  { name: 'High Thane Brynja', faction: 'Dwarven Holds', role: 'High Thane', location: 'Stoneheart Hold' },
  { name: 'Archdruid Elowen', faction: 'Sylvan Dominion', role: 'Archdruid', location: 'Evershade' },
  { name: 'Warchief Grusk', faction: 'Orcish Dominion', role: 'Warchief', location: 'Redfang Camp' },
  { name: 'Trade Prince Rolan', faction: 'Merchant League', role: 'Trade Prince', location: 'Goldport' },
  { name: 'High Luminary Seraphine', faction: 'Church of Light', role: 'High Luminary', location: 'Sunspire' },
  { name: 'Mistress Veyra', faction: 'Shadow Syndicate', role: 'Spymaster', location: 'Veilmarket' },
  { name: 'Magister Orrin', faction: 'Mages Guild', role: 'Archmage', location: 'Arcanum Citadel' }
];

const dailySchedule = {
  morning: 'Attend court and manage affairs.',
  afternoon: 'Oversee operations and meet emissaries.',
  evening: 'Hold councils and private meetings.',
  night: 'Rest or pursue clandestine plans.'
};

const lifeEvents = ['marriage', 'illness', 'death', 'promotion'];

export function createNpcAutonomySystem(state) {
  const npcState = state.npcs;

  function init() {
    if (npcState.roster.length === 0) {
      npcState.roster = defaultLeaders.map((leader) => ({
        ...leader,
        stats: { influence: 70, wealth: 60, power: 65 },
        personality: 'resolute',
        goals: ['maintain power', 'expand influence'],
        relationships: {}
      }));
    }
  }

  function getSchedule() {
    return { ...dailySchedule };
  }

  function triggerLifeEvent(name) {
    return { name, type: lifeEvents[Math.floor(Math.random() * lifeEvents.length)] };
  }

  function getSummary() {
    return npcState.roster.map((npc) => `${npc.name} (${npc.role})`).join(' | ');
  }

  init();

  return {
    roster: npcState.roster,
    init,
    getSchedule,
    triggerLifeEvent,
    getSummary
  };
}
