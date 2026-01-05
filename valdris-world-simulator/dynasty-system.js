const successionLaws = ['primogeniture', 'elective', 'strength'];

export function createDynastySystem(state) {
  const dynastyState = state.dynasties;

  function init() {
    if (dynastyState.houses.length === 0) {
      dynastyState.houses.push({
        faction: 'Valdric Empire',
        name: 'House Valdric',
        ruler: 'Emperor Cassian',
        law: 'primogeniture',
        prestige: 50
      });
    }
  }

  function handleRulerDeath(house) {
    const crisis = Math.random() < 0.3;
    if (crisis) {
      house.prestige = Math.max(0, house.prestige - 10);
      return `${house.name} faces a succession crisis.`;
    }
    house.ruler = `${house.ruler}'s Heir`;
    house.prestige += 5;
    return `${house.name} transitions to ${house.ruler}.`;
  }

  function getSummary() {
    return dynastyState.houses
      .map((house) => `${house.name} (${house.law}) prestige ${house.prestige}`)
      .join(' | ');
  }

  init();

  return {
    successionLaws,
    init,
    handleRulerDeath,
    getSummary
  };
}
