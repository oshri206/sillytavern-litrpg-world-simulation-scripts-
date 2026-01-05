const operations = ['espionage', 'sabotage', 'propaganda', 'assassination'];

export function createColdWarSystem(state) {
  const coldWarState = state.coldWar;

  function addTension(rivals, level = 50) {
    const entry = { rivals, level, operations: [] };
    coldWarState.tensions.push(entry);
    return entry;
  }

  function launchOperation(rivals) {
    const tension = coldWarState.tensions.find((entry) => entry.rivals === rivals);
    const operation = {
      type: operations[Math.floor(Math.random() * operations.length)],
      discovered: Math.random() < 0.3
    };
    if (tension) {
      tension.operations.push(operation);
      if (operation.discovered) {
        tension.level = Math.max(0, tension.level - 10);
      }
    }
    return operation;
  }

  function getSummary() {
    if (coldWarState.tensions.length === 0) {
      return 'No cold war tensions.';
    }
    return coldWarState.tensions.map((entry) => `${entry.rivals}: ${entry.level}`).join(' | ');
  }

  return {
    operations,
    addTension,
    launchOperation,
    getSummary
  };
}
