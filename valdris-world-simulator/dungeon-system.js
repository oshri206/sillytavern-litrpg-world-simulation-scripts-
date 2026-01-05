const dungeonTypes = ['cave', 'ruins', 'lair', 'tomb', 'fortress', 'magical'];
const threatLevels = Array.from({ length: 10 }, (_, index) => `tier ${index + 1}`);

function generateLoot(threatTier) {
  return `Loot cache (${threatTier}) with relics and coin.`;
}

export function createDungeonSystem(state) {
  const dungeonState = state.dungeons;

  function emergeDungeon() {
    const type = dungeonTypes[Math.floor(Math.random() * dungeonTypes.length)];
    const tier = threatLevels[Math.floor(Math.random() * threatLevels.length)];
    const dungeon = {
      id: `${type}-${Date.now()}`,
      type,
      tier,
      loot: generateLoot(tier),
      monsters: ['goblins', 'undead', 'elementals'][Math.floor(Math.random() * 3)]
    };
    dungeonState.active.push(dungeon);
    return dungeon;
  }

  function monthlyCheck() {
    if (Math.random() < 0.25) {
      return emergeDungeon();
    }
    return null;
  }

  function getSummary() {
    if (dungeonState.active.length === 0) {
      return 'No active dungeons.';
    }
    return dungeonState.active.map((dungeon) => `${dungeon.type} ${dungeon.tier}`).join(' | ');
  }

  return {
    dungeonTypes,
    threatLevels,
    emergeDungeon,
    monthlyCheck,
    getSummary
  };
}
