export function createNpcLifeSystem(state) {
  const lifeState = state.npcLife;

  function addRecord(npcName, role) {
    const record = {
      name: npcName,
      role,
      age: 25 + Math.floor(Math.random() * 20),
      income: 5,
      expenses: 3,
      relationships: []
    };
    lifeState.records.push(record);
    return record;
  }

  function yearlyAging() {
    lifeState.records.forEach((record) => {
      record.age += 1;
      if (record.age > 60) {
        record.income = Math.max(1, record.income - 1);
      }
    });
  }

  function progressCareer(name) {
    const record = lifeState.records.find((item) => item.name === name);
    if (record) {
      record.income += 2;
      record.role = `${record.role} (senior)`;
    }
  }

  function socialInteraction(name, other) {
    const record = lifeState.records.find((item) => item.name === name);
    if (record) {
      record.relationships.push({ name: other, bond: 1 });
    }
  }

  function getSummary() {
    if (lifeState.records.length === 0) {
      return 'No civilian life records.';
    }
    return lifeState.records.map((record) => `${record.name} age ${record.age}`).join(' | ');
  }

  return {
    addRecord,
    yearlyAging,
    progressCareer,
    socialInteraction,
    getSummary
  };
}
