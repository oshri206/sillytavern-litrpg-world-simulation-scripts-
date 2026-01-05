export function createConsequenceSystem(state) {
  const consequenceState = state.consequence;

  function recordAction(type, detail, magnitude = 1) {
    const entry = { type, detail, magnitude, timestamp: Date.now() };
    consequenceState.actions.push(entry);
    if (type === 'save') {
      consequenceState.fame += magnitude;
    } else if (['kill', 'betrayal', 'theft'].includes(type)) {
      consequenceState.infamy += magnitude;
      consequenceState.bounty += magnitude * 5;
    }
    return entry;
  }

  function scheduleRipple(type, days, effect) {
    consequenceState.actions.push({ type: `ripple:${type}`, detail: effect, magnitude: 1, triggerIn: days });
  }

  function getSummary() {
    return `Fame ${consequenceState.fame}, Infamy ${consequenceState.infamy}, Bounty ${consequenceState.bounty}`;
  }

  return {
    recordAction,
    scheduleRipple,
    getSummary
  };
}
