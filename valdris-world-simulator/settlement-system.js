const settlementTypes = ['hamlet', 'village', 'town', 'city', 'metropolis', 'capital'];
const problems = ['crime', 'plague', 'famine', 'siege'];
const projects = ['walls', 'markets', 'temples'];

export function createSettlementSystem(state) {
  const settlementState = state.settlements;

  function init() {
    if (settlementState.list.length === 0) {
      settlementState.list.push({
        name: 'Valdris Capital',
        type: 'capital',
        population: 120000,
        prosperity: 80,
        safety: 70,
        health: 75,
        happiness: 70,
        problems: [],
        projects: ['walls']
      });
    }
  }

  function addProblem(name, problem) {
    const settlement = settlementState.list.find((item) => item.name === name);
    if (settlement && !settlement.problems.includes(problem)) {
      settlement.problems.push(problem);
    }
  }

  function addProject(name, project) {
    const settlement = settlementState.list.find((item) => item.name === name);
    if (settlement && !settlement.projects.includes(project)) {
      settlement.projects.push(project);
    }
  }

  function getSummary() {
    return settlementState.list
      .map((settlement) => `${settlement.name} (${settlement.type}) pop ${settlement.population}`)
      .join(' | ');
  }

  init();

  return {
    settlementTypes,
    problems,
    projects,
    init,
    addProblem,
    addProject,
    getSummary
  };
}
