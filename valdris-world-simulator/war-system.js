const troopTypes = ['infantry', 'cavalry', 'archers', 'siege', 'mages'];

function createArmy(name) {
  return {
    name,
    troops: {
      infantry: 500,
      cavalry: 120,
      archers: 200,
      siege: 20,
      mages: 15
    },
    morale: 70,
    supplies: 80
  };
}

export function createWarSystem(state) {
  const warState = state.wars;

  function declareWar(attacker, defender) {
    const war = {
      id: `${attacker}-${defender}-${Date.now()}`,
      attacker,
      defender,
      armies: [createArmy(attacker), createArmy(defender)],
      exhaustion: 0,
      active: true
    };
    warState.active.push(war);
    return war;
  }

  function simulateBattle(war) {
    war.armies.forEach((army) => {
      const loss = Math.floor(Math.random() * 50) + 20;
      army.troops.infantry = Math.max(0, army.troops.infantry - loss);
      army.morale = Math.max(0, army.morale - Math.floor(loss / 5));
    });
    war.exhaustion += 5;
    if (war.exhaustion >= 100) {
      war.active = false;
    }
  }

  function simulateSiege(war) {
    war.exhaustion += 8;
    war.armies.forEach((army) => {
      army.supplies = Math.max(0, army.supplies - 10);
    });
    if (war.exhaustion >= 100) {
      war.active = false;
    }
  }

  function getSummary() {
    if (warState.active.length === 0) {
      return 'No active wars.';
    }
    return warState.active
      .map((war) => `${war.attacker} vs ${war.defender} (exhaustion ${war.exhaustion})`)
      .join(' | ');
  }

  return {
    troopTypes,
    declareWar,
    simulateBattle,
    simulateSiege,
    getSummary
  };
}
