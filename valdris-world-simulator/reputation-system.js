const titles = [
  { name: 'Unknown', min: 0 },
  { name: 'Recognized', min: 20 },
  { name: 'Famous', min: 50 },
  { name: 'Legendary', min: 80 },
  { name: 'Mythical', min: 95 }
];

export function createReputationSystem(state) {
  const reputationState = state.reputation;

  function adjustGlobal(amount) {
    reputationState.global = Math.max(0, Math.min(100, reputationState.global + amount));
  }

  function adjustRegional(region, amount) {
    reputationState.regional[region] = Math.max(0, Math.min(100, (reputationState.regional[region] ?? 0) + amount));
  }

  function addLegend(deed) {
    reputationState.global = Math.min(100, reputationState.global + 5);
    return `Legend spreads: ${deed}`;
  }

  function getTitle() {
    return titles.slice().reverse().find((title) => reputationState.global >= title.min)?.name || 'Unknown';
  }

  function getSummary() {
    return `Reputation ${reputationState.global} (${getTitle()})`;
  }

  return {
    titles,
    adjustGlobal,
    adjustRegional,
    addLegend,
    getTitle,
    getSummary
  };
}
