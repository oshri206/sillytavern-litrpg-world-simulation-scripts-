const catastropheTypes = ['plague', 'famine', 'earthquake', 'flood', 'volcanic', 'magical'];

export function createCatastropheSystem(state) {
  const catastropheState = state.catastrophe;

  function trigger(type) {
    const catastrophe = {
      id: `${type}-${Date.now()}`,
      type,
      spreadRate: Math.random() * 0.5 + 0.2,
      mortalityRate: Math.random() * 0.3 + 0.1,
      duration: 10 + Math.floor(Math.random() * 20)
    };
    catastropheState.active.push(catastrophe);
    return catastrophe;
  }

  function dailyTick() {
    catastropheState.active.forEach((catastrophe) => {
      catastrophe.duration -= 1;
    });
    catastropheState.active = catastropheState.active.filter((catastrophe) => catastrophe.duration > 0);
  }

  function resolve(type) {
    catastropheState.active = catastropheState.active.filter((catastrophe) => catastrophe.type !== type);
  }

  function getSummary() {
    if (catastropheState.active.length === 0) {
      return 'No catastrophes.';
    }
    return catastropheState.active.map((cat) => `${cat.type} (${cat.duration} days)`).join(' | ');
  }

  return {
    catastropheTypes,
    trigger,
    dailyTick,
    resolve,
    getSummary
  };
}
