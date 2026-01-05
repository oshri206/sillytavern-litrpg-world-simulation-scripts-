const defaultFactions = [
  'Valdric Empire',
  'Dwarven Holds',
  'Sylvan Dominion',
  'Orcish Dominion',
  'Merchant League',
  'Church of Light',
  'Shadow Syndicate',
  'Mages Guild'
];

function clampRelation(value) {
  return Math.max(-100, Math.min(100, value));
}

export function createFactionSystem(state) {
  const factionState = state.factions;

  function init() {
    defaultFactions.forEach((faction) => {
      if (!factionState.relations[faction]) {
        factionState.relations[faction] = {};
      }
      if (factionState.reputation[faction] === undefined) {
        factionState.reputation[faction] = 0;
      }
      defaultFactions.forEach((other) => {
        if (faction !== other && factionState.relations[faction][other] === undefined) {
          factionState.relations[faction][other] = 0;
        }
      });
    });
  }

  function setRelation(faction, other, value) {
    if (!factionState.relations[faction]) {
      factionState.relations[faction] = {};
    }
    factionState.relations[faction][other] = clampRelation(value);
  }

  function adjustRelation(faction, other, delta) {
    const current = factionState.relations[faction]?.[other] ?? 0;
    setRelation(faction, other, current + delta);
  }

  function adjustReputation(faction, delta) {
    factionState.reputation[faction] = clampRelation((factionState.reputation[faction] ?? 0) + delta);
  }

  function weeklyDrift() {
    defaultFactions.forEach((faction) => {
      defaultFactions.forEach((other) => {
        if (faction === other) {
          return;
        }
        const current = factionState.relations[faction][other];
        const drift = Math.sign(current) * -1;
        factionState.relations[faction][other] = clampRelation(current + drift);
      });
    });
  }

  function getSummary() {
    return defaultFactions
      .map((faction) => `${faction}: rep ${factionState.reputation[faction] ?? 0}`)
      .join(' | ');
  }

  init();

  return {
    factions: defaultFactions,
    init,
    setRelation,
    adjustRelation,
    adjustReputation,
    weeklyDrift,
    getSummary
  };
}
